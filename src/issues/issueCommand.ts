import * as vscode from "vscode";
import { getGitHubOwnerAndRepo } from "../gitHub.js";
import { renderPrompt } from "@vscode/prompt-tsx";
import { IssuesPrompt, type GitHubResult } from "./IssuePrompt.js";
import type { Comment } from "./comment.js";
import type { RequestHandlerContext } from "../requestHandlerContext.js";

const issueNumberRegex = /!(\d+)(\+?)/; // prefix: !, issue number, optional: + for comments
const ghRepoRegex = /gh:(.+)\/(.+?)[\s;,\/:]/; // for specifying repo owner and repo name

export async function handleGhIssueCommand(
  requestHandlerContext: RequestHandlerContext
) {
  const { request, stream, token, model } = requestHandlerContext;
  const match = request.prompt.match(issueNumberRegex);
  const [issueId, commentsUsage] = match ? [match[1], match[2]] : ["", ""];

  stream.progress(`Issue ${issueId} idetified.`);
  const ghMatch = request.prompt.match(ghRepoRegex);
  const [ghOwner, ghRepo] = ghMatch ? [ghMatch[1], ghMatch[2]] : ["", ""];
  if (ghRepo) {stream.progress(`GH Repo ${ghRepo} identified.`);}
  if (ghOwner) {stream.progress(`GH owner ${ghOwner} identified.`);}

  const ghResult = (await getIssueAndCommentsById(
    Number(issueId),
    stream,
    ghOwner,
    ghRepo,
    commentsUsage === "+"
  )) as GitHubResult;
  
  StateIssueInStream(stream, ghResult?.issue, ghResult?.comments ?? []);

  if (model) {
    const { messages } = await renderPrompt(
      IssuesPrompt,
      {
        ghResult: ghResult,
        userPrompt: request.prompt,
      },
      { modelMaxPromptTokens: model.maxInputTokens },
      model
    );

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
    if (gatheredGhOwnerRepo.owner === "" || gatheredGhOwnerRepo.repo === "") {
      throw new Error(
        "There is no git context. Please either open a file or folder of any GitHub git repository or specify the owner and repo in the prompt like `gh:<owner>/<repo>`."
      );
    } else {
      owner = gatheredGhOwnerRepo.owner;
      repo = gatheredGhOwnerRepo.repo;
    }
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
      {comments = (
        await octokit.rest.issues.listComments({
          owner,
          repo,
          issue_number,
        })
      ).data as Comment[];}

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
