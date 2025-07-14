import * as vscode from "vscode";
import type { RequestHandlerContext } from "../../requestHandlerContext";
import { determineGhOwnerAndRepoToUse } from "../gitHub";
import { type GitHubComment } from "../GitHubComment";
import { type GitHubResult } from "../GitHubResult";
import { DEFAULT_DESCRIPTION_TRUNCATION_LENGTH } from "../../consts";

export function StateFullGHIssueInStream(
  stream: vscode.ChatResponseStream,
  issue: { title: string; body: string },
  comments: GitHubComment[]
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

export function StateMultipleGHIssuesInStream(
  stream: vscode.ChatResponseStream,
  issues: Array<{ number: number; title: string; body: string; state: string; html_url: string }>,
  searchQuery: string
) {
  stream.markdown(`🔍 Found ${issues.length} issue${issues.length !== 1 ? 's' : ''} with title containing "${searchQuery}":\n\n`);
  
  issues.forEach((issue, index) => {
    stream.markdown(`${index + 1}. 🟣**Issue #${issue.number}** [_${issue.state}_]: **${issue.title}**\n`);
    // Show first configured characters of description
    if (issue.body && issue.body.length > 0) {
      const truncatedBody = issue.body.length > DEFAULT_DESCRIPTION_TRUNCATION_LENGTH ? issue.body.substring(0, DEFAULT_DESCRIPTION_TRUNCATION_LENGTH) + "..." : issue.body;
      stream.markdown(`   > ${truncatedBody.replaceAll("\n", " ")}\n`);
    }
    stream.markdown(`   🔗 [View Issue #${issue.number}](${issue.html_url})\n\n`);
  });
  
  stream.markdown("---\n\n");
}

//search issues by title (contains search)
export async function searchGhIssuesByTitle(
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
    // Search for open and closed issues that contain the search query in the title
    const searchResults = await octokit.rest.search.issuesAndPullRequests({
      q: `repo:${owner}/${repo} ${searchQuery} in:title`,
      sort: 'updated',
      order: 'desc',
      per_page: 10 // Limit to 10 results to avoid overwhelming the user
    });

    // Filter out pull requests (search API returns both issues and PRs)
    const matchingIssues = searchResults.data.items.filter(issue => !issue.pull_request);

    if (matchingIssues.length === 0) {
      throw new Error(`No issues found with title containing "${searchQuery}" in repo '${repo}'.`);
    }

    // Convert to GitHubResult array
    const results: GitHubResult[] = [];
    for (const issue of matchingIssues) {
      let comments: GitHubComment[] = [];
      if (withComments) {
        try {
          comments = (
            await octokit.rest.issues.listComments({
              owner,
              repo,
              issue_number: issue.number,
            })
          ).data as GitHubComment[];
        } catch (err) {
          // If comments fail for one issue, continue with others
          console.warn(`Could not get comments for issue #${issue.number}: ${err}`);
        }
      }
      results.push({ 
        data: {
          number: issue.number,
          title: issue.title,
          body: issue.body || "",
          html_url: issue.html_url,
          state: issue.state
        }, 
        comments: comments 
      });
    }

    return results;
  } catch (err) {
    if (err instanceof Error && err.message.includes('No issues found')) {
      throw err;
    }
    throw new Error(`Error searching issues with title "${searchQuery}" in repo '${repo}': ${err}`);
  }
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
    let comments: GitHubComment[] = [];
    if (withComments) {
      comments = (
        await octokit.rest.issues.listComments({
          owner,
          repo,
          issue_number,
        })
      ).data as GitHubComment[];
    }

    return { data: issue, comments: comments };
  } catch (err) {
    throw new Error(
      `Can't get comments for issue #${issue_number} of repo '${repo}'.`
    );
  }
}

