import { renderPrompt, Cl100KBaseTokenizer } from "@vscode/prompt-tsx";
import * as vscode from "vscode";
import { PlayPrompt } from "./play";
import { Octokit } from "@octokit/rest";
import * as git from "simple-git";

const CAT_PARTICIPANT_ID = "xebia.copilot.issue-data-provider";

interface ICatChatResult extends vscode.ChatResult {
  metadata: {
    command: string;
  };
}

const MODEL_SELECTOR: vscode.LanguageModelChatSelector = {
  vendor: "copilot",
  family: "gpt-3.5-turbo",
};
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
        const match = request.prompt.match(/!(\d+)/);
        const issueId = match ? match[1] : undefined; //todo: error message no issue id found
        stream.progress(`Issue ${issueId} idetified.`);
        if (model) {
          const messages = [
            vscode.LanguageModelChatMessage.User(
              "You are a software product owner and you help your developers providing additional information for working on current software development task."
            ),
            vscode.LanguageModelChatMessage.User(
              await GetIssueDataString(issueId as string, stream)
            ),
            vscode.LanguageModelChatMessage.User(request.prompt),
          ];

          const chatResponse = await model.sendRequest(messages, {}, token);
          for await (const fragment of chatResponse.text) {
            stream.markdown(fragment);
          }
        }
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
  const chat = vscode.chat.createChatParticipant(CAT_PARTICIPANT_ID, handler);
  //chat.iconPath = vscode.Uri.joinPath(context.extensionUri, "cat.jpeg");
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
          "I'm sorry, I can only explain computer science concepts."
        )
      );
    }
  } else {
    // re-throw other errors so they show up in the UI
    throw err;
  }
}

export function deactivate() {}

async function getOwnerAndRepo(): Promise<
  { owner: string; repo: string } | undefined
> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    console.error("No file is open.");
    return;
  }

  // const workspaceFolder = vscode.workspace.getWorkspaceFolder(
  //   editor.document.uri
  // );
  // if (!workspaceFolder) {
  //   console.error("The open file is not inside a workspace folder.");
  //   return;
  // }

  // const workspacePath = workspaceFolder.uri.fsPath;
  // const gitRepo = git.gitP(workspacePath);
  // const remotes = await gitRepo.getRemotes(true);

  // if (remotes.length === 0) {
  //   console.error("No remote repository found.");
  //   return;
  // }

  // const remoteUrl = remotes[0].refs.fetch;
  // const match = remoteUrl.match(/github\.com[/:](.+\/.+)\.git$/);
  // if (!match) {
  //   console.error("Remote repository is not a GitHub repository.");
  //   return;
  // }

  const [owner, repo] = ["harrybin", "copilot-chat-sample"]; //match[1].split("/");
  return { owner, repo };
}

//get issue object from github by its issue id using octokit
async function getIssueById(
  issue_number: number,
  stream: vscode.ChatResponseStream
) {
  const session = await vscode.authentication.getSession("github", ["repo"], {
    createIfNone: true,
  });
  const octokit = new Octokit({ auth: session.accessToken });
  const { owner, repo } = (await getOwnerAndRepo()) ?? { owner: "", repo: "" };
  try {
    const issue = await octokit.rest.issues.get({
      owner,
      repo,
      issue_number,
    });
    stream.progress(`Issue "${issue.data.title}" loaded.`);

    return issue.data;
  } catch (err) {
    console.error(err);
  }
}

async function GetIssueDataString(
  issueId: string,
  stream: vscode.ChatResponseStream
) {
  let issueNumber = Number(issueId);
  if (isNaN(issueNumber))
    console.log(`The provided issue number is not a number: ${issueId}`);
  const issue = await getIssueById(issueNumber, stream);
  let result = `The issue to work on has the title: "${issue?.title}" and the description: ${issue?.body_text}. Use that information to give better answer for the following user query.`;
  return result;
}
