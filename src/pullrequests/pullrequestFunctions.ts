import * as vscode from "vscode";
import type { RequestHandlerContext } from "../requestHandlerContext";
import {
  determineGhOwnerAndRepoToUse,
  type Comment,
  type GitHubResult,
} from "../gitHub";

export function StateFullPrInStream(
  stream: vscode.ChatResponseStream,
  pullrequest: { title: string; body: string }
) {
  stream.markdown(`🔵PR: **${pullrequest.title}**\n\n`);
  stream.markdown(pullrequest.body?.replaceAll("\n", "\n> ") + "");
  stream.markdown("\n\n----\n\n");
}

//get issue object from github by its issue id using octokit
export async function getPullrequestById(
  requestHandlerContext: RequestHandlerContext,
  pull_number: number,
  ghOwner: string = "",
  ghRepo: string = "",
  withComments = false
): Promise<GitHubResult> {
  var { octokit, owner, repo } = await determineGhOwnerAndRepoToUse(
    ghOwner,
    ghRepo,
    requestHandlerContext
  );

  let pullrequest: any = {};
  try {
    pullrequest = (
      await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number,
      })
    ).data;
  } catch (err) {
    throw new Error(`Can't find PR #${pull_number} in repo '${repo}'.`);
  }
  try {
    let comments: Comment[] = [];
    if (withComments) {
      comments = (
        await octokit.rest.pulls.listReviewComments({
          owner,
          repo,
          pull_number,
        })
      ).data as Comment[];
    }

    return { data: pullrequest, comments: comments };
  } catch (err) {
    throw new Error(
      `Can't get comments for issue #${pull_number} of repo '${repo}'.`
    );
  }
}
