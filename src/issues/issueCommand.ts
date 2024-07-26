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

  stream.progress(`Issue #${issueId} found in prompt.`);
  const ghMatch = request.prompt.match(ghRepoRegex);
  const [ghOwner, ghRepo] = ghMatch ? [ghMatch[1], ghMatch[2]] : ["", ""];

  if (ghOwner) {
    stream.progress(`using github owner '${ghOwner}' passed in prompt`);
  }
  if (ghRepo) {
    stream.progress(`using github repo '${ghRepo}' passed in prompt`);
  }

  const ghResult = (await getIssueAndCommentsById(
    requestHandlerContext,
    Number(issueId),
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
  requestHandlerContext: RequestHandlerContext,
  issue_number: number,
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

  if (owner !== "" && repo !== "") {
    //save context variables from prompt to the vscode ExtensionContext
    requestHandlerContext.vscodeContext.globalState.update("ghOwner", owner);
    requestHandlerContext.vscodeContext.globalState.update("ghRepo", repo);
  } else {
    // gather owner and repo from the git context of the current open file in editor
    const gatheredGhOwnerRepo = (await getGitHubOwnerAndRepo()) ?? {
      owner: "",
      repo: "",
    };

    if (gatheredGhOwnerRepo.owner !== "" && gatheredGhOwnerRepo.repo !== "") {
      owner = gatheredGhOwnerRepo.owner;
      repo = gatheredGhOwnerRepo.repo;
      requestHandlerContext.stream.progress(
        `using git context from current file: github://${owner}/${repo}`
      );
    }
  }

  if (owner === "" || repo === "") {
    //load variables from the vscode ExtensionContext
    //this occurs when the user has not specified the owner and repo in the prompt and no git context is found
    owner = requestHandlerContext.vscodeContext.globalState.get("ghOwner", "");
    repo = requestHandlerContext.vscodeContext.globalState.get("ghRepo", "");

    if (owner === "" || repo === "") {
      throw new Error(
        "There is no git context. Please either open a file or folder of any GitHub git repository or specify the owner and repo in the prompt like `gh:<owner>/<repo>`."
      );
    } else {
      requestHandlerContext.stream.progress(
        `using remembered git context: github://${owner}/${repo}`
      );
    }
  }

  console.log(`Owner: ${owner}, Repo: ${repo}`);
  let issue: any = {};
  try {
    issue = (
      await octokit.rest.issues.get({
        owner,
        repo,
        issue_number,
      })
    ).data;
  } catch (err) {
    throw new Error(`Can't find issue #${issue_number} in repo '${repo}'.`);
  }
  try {
    let comments: Comment[] = [];
    if (withComments) {
      comments = (
        await octokit.rest.issues.listComments({
          owner,
          repo,
          issue_number,
        })
      ).data as Comment[];
    }

    return { issue: issue, comments: comments };
  } catch (err) {
    throw new Error(
      `Can't get comments for issue #${issue_number} of repo '${repo}'.`
    );
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
