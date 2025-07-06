import * as vscode from "vscode";
import type { RequestHandlerContext } from "../../requestHandlerContext";
import {
  determineGhOwnerAndRepoToUse,
} from "../gitHub";
import { type GitHubComment } from "../GitHubComment";
import { type GitHubResult } from "../GitHubResult";

export function StateFullPrInStream(
  stream: vscode.ChatResponseStream,
  pullrequest: { title: string; body: string; state: string },
  comments: string | null = null
) {
  stream.markdown(`🔵PR [_${pullrequest.state}_]: **${pullrequest.title}**\n\n`);
  stream.markdown(pullrequest.body?.replaceAll("\n", "\n> ") + "");
  stream.markdown("\n\n");
  if (comments && comments.length > 0) {
    stream.markdown(`> **Comments:**\n\n`);
    stream.markdown(comments.replaceAll("\n", "\n> ") + "");
  }
  stream.markdown("\n\n----\n\n");
}

//get issue object from github by its issue id using octokit
export async function getGhPullrequestById(
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
    let comments: GitHubComment[] = [];
    if (withComments) {
      comments = (
        await octokit.rest.pulls.listReviewComments({
          owner,
          repo,
          pull_number,
        })
      ).data as GitHubComment[];
    }

    return { data: pullrequest, comments: comments };
  } catch (err) {
    throw new Error(
      `Can't get comments for issue #${pull_number} of repo '${repo}'.`
    );
  }
}