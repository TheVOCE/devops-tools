import * as vscode from "vscode";
import * as cp from "child_process";
import * as path from "path";
import { Octokit } from "@octokit/rest";
import * as git from "simple-git";

const PARTICIPANT_ID = "xebia.copilot.issue-data-provider";
const OPEN_URL_COMMAND = "Open_URL";

interface Comment {
  id: number;
  url: string;
  body?: string | undefined;
}

interface ICatChatResult extends vscode.ChatResult {
  metadata: {
    command: string;
  };
}

const MODEL_SELECTOR: vscode.LanguageModelChatSelector = {
  vendor: "copilot",
  family: "gpt-4",
};
//family: "gpt-3.5-turbo",
//family: "gpt-4",

export function activate(context: vscode.ExtensionContext) {
  // Define a Cat chat handler.
  const handler: vscode.ChatRequestHandler = async (
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<ICatChatResult> => {
    // To talk to an LLM in your subcommand handler implementation, your
    // extension can use VS Code's `requestChatAccess` API to access the Copilot API.
    // The GitHub Copilot Chat extension implements this provider.
    if (request.command == "issue") {
      try {
        const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);
        //parse user prompt for specials
        const match = request.prompt.match(/!(\d+)(\+?)/);
        const [issueId, commentsUsage] = match
          ? [match[1], match[2]]
          : ["", ""];

        stream.progress(`Issue ${issueId} idetified.`);
        const ghMatch = request.prompt.match(/gh:(.+)\/(.+?)[\s;,\/:]/);
        const [ghOwner, ghRepo] = ghMatch ? [ghMatch[1], ghMatch[2]] : ["", ""];
        if (ghRepo) stream.progress(`GH Repo ${ghRepo} idetified.`);
        if (ghOwner) stream.progress(`GH owner ${ghOwner} idetified.`);

        const ghResult = await getIssueAndCommentsById(
          Number(issueId),
          stream,
          ghOwner,
          ghRepo,
          commentsUsage === "+"
        );
        StateIssueInStream(stream, ghResult?.issue, ghResult?.comments ?? []);

        if (model) {
          const messages = [
            vscode.LanguageModelChatMessage.User(
              "You are a software product owner and you help your developers providing additional information for working on current software development task."
            ),
            vscode.LanguageModelChatMessage.User(
              `The issue to work on has the title: "${ghResult?.issue?.title}" and the description: ${ghResult?.issue?.body}. Use that information to give better answer for the following user query.` +
                (ghResult?.comments && ghResult?.comments?.length > 0
                  ? `Do also regard the comments: ${
                      ghResult?.comments
                        ?.map((comment) => comment.body)
                        .join("\n\n") + ""
                    }`
                  : "")
            ),
            vscode.LanguageModelChatMessage.User(request.prompt),
          ];

          const chatResponse = await model.sendRequest(messages, {}, token);
          for await (const fragment of chatResponse.text) {
            stream.markdown(fragment);
          }
        }
        stream.button({
          command: OPEN_URL_COMMAND,
          title: vscode.l10n.t("Open Issue in Browser"),
          arguments: [ghResult?.issue?.html_url],
        });
      } catch (err) {
        handleError(err, stream);
      }

      return { metadata: { command: "issue" } };
    }
    //else if (request.command == "pullrequest") {

    return { metadata: { command: "" } };
  };

  // Chat participants appear as top-level options in the chat input
  // when you type `@`, and can contribute sub-commands in the chat input
  // that appear when you type `/`.
  const chat = vscode.chat.createChatParticipant(PARTICIPANT_ID, handler);
  chat.iconPath = vscode.Uri.joinPath(context.extensionUri, "XebiaLogo.jpeg");
  vscode.commands.registerCommand(OPEN_URL_COMMAND, async (url: string) => {
    vscode.env.openExternal(vscode.Uri.parse(url));
  });
}

function handleError(err: any, stream: vscode.ChatResponseStream): void {
  // making the chat request might fail because
  // - model does not exist
  // - user consent not given
  // - quote limits exceeded
  if (err instanceof vscode.LanguageModelError) {
    console.log(err.message, err.code, err.cause);
    if (err.cause instanceof Error && err.cause.message.includes("off_topic")) {
      stream.markdown(
        vscode.l10n.t(
          "I'm sorry, I can't help with that. Please ask me something else."
        )
      );
    }
  } else {
    // re-throw other errors so they show up in the UI
    throw err;
  }
}

export function deactivate() {}

async function getGitHubOwnerAndRepo(): Promise<
  { owner: string; repo: string } | undefined
> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    console.error("No file is open.");
    return;
  }

  let filePath = editor.document.uri.fsPath;
  let fileDirectory = path.dirname(filePath);
  let workspacePath = fileDirectory;

  await cp.exec(
    "git rev-parse --show-toplevel",
    { cwd: fileDirectory },
    (error, stdout) => {
      if (error) {
        console.log(`No Git repository found in ${fileDirectory}`);
      } else {
        workspacePath = stdout.trim();
        console.log(`Git repository found in ${workspacePath}`);
      }
    }
  );

  const gitRepo = git.gitP(workspacePath);
  const remotes = await gitRepo.getRemotes(true);

  if (remotes.length === 0) {
    console.error("No remote repository found.");
    return;
  }

  const remoteUrl = remotes[0].refs.fetch;
  const match = remoteUrl.match(/github\.com[/:](.+\/.+)\.git$/);
  if (!match) {
    console.error("Remote repository is not a GitHub repository.");
    return;
  }

  const [owner, repo] = match[1].split("/");
  return { owner, repo };
}

//get issue object from github by its issue id using octokit
async function getIssueAndCommentsById(
  issue_number: number,
  stream: vscode.ChatResponseStream,
  ghOwner: string = "",
  ghRepo: string = "",
  withComments = false
) {
  const session = await vscode.authentication.getSession("github", ["repo"], {
    createIfNone: true,
  });
  const octokit = new Octokit({ auth: session.accessToken });
  let owner = ghOwner;
  let repo = ghRepo;
  const gatheredGhOwnerRepo = (await getGitHubOwnerAndRepo()) ?? {
    owner: "",
    repo: "",
  };
  if (owner === "" && repo === "") {
    owner = gatheredGhOwnerRepo.owner;
    repo = gatheredGhOwnerRepo.repo;
  }
  console.log(`Owner: ${owner}, Repo: ${repo}`);
  try {
    const issue = (
      await octokit.rest.issues.get({
        owner,
        repo,
        issue_number,
      })
    ).data;
    let comments: Comment[] = [];
    if (withComments)
      comments = (
        await octokit.rest.issues.listComments({
          owner,
          repo,
          issue_number,
        })
      ).data as Comment[];

    return { issue: issue, comments: comments };
  } catch (err) {
    console.error(err);
  }
}
function StateIssueInStream(
  stream: vscode.ChatResponseStream,
  issue: any,
  comments: Comment[]
) {
  stream.progress(`Issue "${issue.title}" loaded.`);
  stream.markdown(`Issue: **${issue.title}**\n\n`);
  stream.markdown(issue.body?.replaceAll("\n", "\n> ") + "");
  if (comments?.length > 0) {
    stream.markdown("\n\n_Comments_\n");
    comments?.map((comment) =>
      stream.markdown(`\n> ${comment.body?.replaceAll("\n", "\n> ") + ""}\n`)
    );
  }
  stream.markdown("\n\n----\n\n");
  stream.progress(`My suggestion....`);
}
