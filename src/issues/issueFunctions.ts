import * as vscode from "vscode";
import type { RequestHandlerContext } from "../requestHandlerContext";
import { determineGhOwnerAndRepoToUse, type Comment, type GitHubResult } from "../gitHub";

export function StateFullIssueInStream(
  stream: vscode.ChatResponseStream,
  issue: { title: string; body: string },
  comments: Comment[]
) {
  stream.markdown(`🟣Issue: **${issue.title}**\n\n`);
  stream.markdown(issue.body?.replaceAll("\n", "\n> ") + "");
  if (comments?.length > 0) {
    stream.markdown("\n\n_Comments_\n");
    comments?.map((comment) =>
      stream.markdown(`\n> ${comment.body?.replaceAll("\n", "\n> ") + ""}\n`)
    );
  }
  stream.markdown("\n\n----\n\n");
}

//get issue object from github by its issue id using octokit
export async function getIssueAndCommentsById(
  requestHandlerContext: RequestHandlerContext,
  issue_number: number,
  ghOwner: string = "",
  ghRepo: string = "",
  withComments = false
): Promise<GitHubResult> {
  var { octokit, owner, repo } = await determineGhOwnerAndRepoToUse(
    ghOwner,
    ghRepo,
    requestHandlerContext
  );

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

    return { data: issue, comments: comments };
  } catch (err) {
    throw new Error(
      `Can't get comments for issue #${issue_number} of repo '${repo}'.`
    );
  }
}

