import * as vscode from "vscode";
import { getGitHubOwnerAndRepo } from "./gitHub.js";

const issueNumberRegex = /!(\d+)(\+?)/; // prefix: !, issue number, optional: + for comments
const ghRepoRegex = /gh:(.+)\/(.+?)[\s;,\/:]/; // for specifying repo owner and repo name

interface Comment {
  id: number;
  url: string;
  body?: string | undefined;
}

export async function handleIssueCommand(
  request: vscode.ChatRequest,
  stream: vscode.ChatResponseStream,
  model: vscode.LanguageModelChat,
  token: vscode.CancellationToken
) {
  const match = request.prompt.match(issueNumberRegex);
  const [issueId, commentsUsage] = match ? [match[1], match[2]] : ["", ""];

  stream.progress(`Issue ${issueId} idetified.`);
  const ghMatch = request.prompt.match(ghRepoRegex);
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
  return ghResult;
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
  const { Octokit } = await import("@octokit/rest");
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
