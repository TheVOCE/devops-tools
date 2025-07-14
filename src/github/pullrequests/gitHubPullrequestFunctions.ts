import * as vscode from "vscode";
import type { RequestHandlerContext } from "../../requestHandlerContext";
import {
  determineGhOwnerAndRepoToUse,
} from "../gitHub";
import { type GitHubComment } from "../GitHubComment";
import { type GitHubResult } from "../GitHubResult";
import { DEFAULT_DESCRIPTION_TRUNCATION_LENGTH } from "../../consts";

export function StateFullGhPrInStream(
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

export function StateMultipleGhPrsInStream(
  stream: vscode.ChatResponseStream,
  pullrequests: Array<{ number: number; title: string; body: string; state: string; html_url: string }>,
  searchQuery: string
) {
  stream.markdown(`🔍 Found ${pullrequests.length} pull request${pullrequests.length !== 1 ? 's' : ''} with title containing "${searchQuery}":\n\n`);
  
  pullrequests.forEach((pr, index) => {
    stream.markdown(`${index + 1}. 🔵**PR #${pr.number}** [_${pr.state}_]: **${pr.title}**\n`);
    // Show first configured characters of description
    if (pr.body && pr.body.length > 0) {
      const truncatedBody = pr.body.length > DEFAULT_DESCRIPTION_TRUNCATION_LENGTH ? pr.body.substring(0, DEFAULT_DESCRIPTION_TRUNCATION_LENGTH) + "..." : pr.body;
      stream.markdown(`   > ${truncatedBody.replaceAll("\n", " ")}\n`);
    }
    stream.markdown(`   🔗 [View PR #${pr.number}](${pr.html_url})\n\n`);
  });
  
  stream.markdown("---\n\n");
}

//search pull requests by title (contains search)
export async function searchGhPullrequestsByTitle(
  requestHandlerContext: RequestHandlerContext,
  searchQuery: string,
  ghOwner: string = "",
  ghRepo: string = "",
  withComments = false
): Promise<GitHubResult[]> {
  var { octokit, owner, repo } = await determineGhOwnerAndRepoToUse(
    ghOwner,
    ghRepo,
    requestHandlerContext
  );

  try {
    // Search for open and closed pull requests that contain the search query in the title
    const searchResults = await octokit.rest.pulls.list({
      owner,
      repo,
      state: 'all', // Include both open and closed PRs
      sort: 'updated',
      direction: 'desc',
      per_page: 10 // Limit to 10 results to avoid overwhelming the user
    });

    // Filter PRs that contain the search query in the title (case-insensitive)
    const matchingPRs = searchResults.data.filter(pr => 
      pr.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (matchingPRs.length === 0) {
      throw new Error(`No pull requests found with title containing "${searchQuery}" in repo '${repo}'.`);
    }

    // Convert to GitHubResult array
    const results: GitHubResult[] = [];
    for (const pr of matchingPRs) {
      let comments: GitHubComment[] = [];
      if (withComments) {
        try {
          comments = (
            await octokit.rest.pulls.listReviewComments({
              owner,
              repo,
              pull_number: pr.number,
            })
          ).data as GitHubComment[];
        } catch (err) {
          // If comments fail for one PR, continue with others
          console.warn(`Could not get comments for PR #${pr.number}: ${err}`);
        }
      }
      results.push({ 
        data: {
          number: pr.number,
          title: pr.title,
          body: pr.body || "",
          html_url: pr.html_url,
          state: pr.state,
          reason: (pr as any).state_reason || undefined
        }, 
        comments: comments 
      });
    }

    return results;
  } catch (err) {
    if (err instanceof Error && err.message.includes('No pull requests found')) {
      throw err;
    }
    throw new Error(`Error searching pull requests with title "${searchQuery}" in repo '${repo}': ${err}`);
  }
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