import * as vscode from "vscode";
import { WebApi, getPersonalAccessTokenHandler } from "azure-devops-node-api";
import { IGitApi } from "azure-devops-node-api/GitApi";
import type { RequestHandlerContext } from "../../requestHandlerContext";
import {
  determineAzDoOrgAndProjectToUse,
  getAzDevOpsOrgAndProject,
} from "../azd";
import { getAzureDevOpsConnection } from "../azDevOpsUtils";
import { type AzDevOpsComment } from "../AzDevOpsComment";
import { type AzDevOpsResult } from "../AzDevOpsResult";
import { PullRequestStatus } from "azure-devops-node-api/interfaces/GitInterfaces";

export function StateFullAzDPrInStream(
  stream: vscode.ChatResponseStream,
  pullrequest: { title: string; status:string; description: string },
  comments: string = ""
) {
  stream.markdown(`🔵PR [_${pullrequest.status}_]: **${pullrequest.title}**\n\n`);
  stream.markdown(pullrequest.description?.replaceAll("\n", "\n> ") + "");
  stream.markdown("\n\n");
  if (comments && comments.length > 0) {
    stream.markdown(`> **Comments:**\n\n`);
    stream.markdown(comments.replaceAll("\n", "\n> ") + "");
  }
  stream.markdown("\n\n----\n\n");
}

export function StateMultipleAzDPrsInStream(
  stream: vscode.ChatResponseStream,
  pullrequests: Array<{ pullRequestId: number; title: string; description: string; status: string; url: string }>,
  searchQuery: string
) {
  stream.markdown(`🔍 Found ${pullrequests.length} pull request${pullrequests.length !== 1 ? 's' : ''} with title containing "${searchQuery}":\n\n`);
  
  pullrequests.forEach((pr, index) => {
    const statusText = PullRequestStatus[pr.status] || pr.status;
    stream.markdown(`${index + 1}. 🔵**PR #${pr.pullRequestId}** [_${statusText}_]: **${pr.title}**\n`);
    // Show first 200 characters of description
    if (pr.description && pr.description.length > 0) {
      const truncatedDescription = pr.description.length > 200 ? pr.description.substring(0, 200) + "..." : pr.description;
      stream.markdown(`   > ${truncatedDescription.replaceAll("\n", " ")}\n`);
    }
    stream.markdown(`   🔗 [View PR #${pr.pullRequestId}](${pr.url})\n\n`);
  });
  
  stream.markdown("---\n\n");
}

async function findRepositoryByRemoteUrl(
  gitApi: IGitApi,
  project: string
): Promise<string> {
  // Get the current repository information from git context
  const gitContext = await getAzDevOpsOrgAndProject();
  
  if (!gitContext?.remoteUrl) {
    // Fallback to first repository if we can't determine from git context
    const repos = await gitApi.getRepositories(project);
    if (repos.length === 0) {
      throw new Error(`No repositories found in project '${project}'.`);
    }
    return repos[0].id!;
  }

  // Extract repository name from the remote URL
  const repoNameMatch = gitContext.remoteUrl.match(/[/_]git[/_]([^/?]+)/);
  const repoName = repoNameMatch ? repoNameMatch[1] : null;

  if (!repoName) {
    // Fallback to first repository if we can't extract repo name
    const repos = await gitApi.getRepositories(project);
    if (repos.length === 0) {
      throw new Error(`No repositories found in project '${project}'.`);
    }
    return repos[0].id!;
  }

  // Get all repositories and find the one matching our remote URL
  const repos = await gitApi.getRepositories(project);
  const matchingRepo = repos.find(repo => repo.name === repoName);
  
  if (!matchingRepo) {
    throw new Error(`Repository '${repoName}' not found in project '${project}'.`);
  }
  
  return matchingRepo.id!;
}

//search pull requests by title (contains search)
export async function searchAzdPullrequestsByTitle(
  requestHandlerContext: RequestHandlerContext,
  searchQuery: string,
  azdoOrg: string = "",
  azdoProject: string = "",
  withComments = false
): Promise<AzDevOpsResult[]> {
  const { org, project } = await determineAzDoOrgAndProjectToUse(
    azdoOrg,
    azdoProject,
    requestHandlerContext
  );

  try {
    const orgUrl = `https://dev.azure.com/${org}`;
    const connection = await getAzureDevOpsConnection(orgUrl);
    const gitApi: IGitApi = await connection.getGitApi();
    
    // Find the repository by matching the remote URL
    const repoId = await findRepositoryByRemoteUrl(gitApi, project);
    
    // Get all pull requests (both open and closed)
    const allPullRequests = await gitApi.getPullRequests(repoId, {
      status: undefined, // Get all statuses
      top: 100 // Limit to prevent overwhelming results
    }, project);

    // Filter PRs that contain the search query in the title (case-insensitive)
    const matchingPRs = allPullRequests.filter(pr => 
      pr.title && pr.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (matchingPRs.length === 0) {
      throw new Error(`No pull requests found with title containing "${searchQuery}" in project '${project}'.`);
    }

    // Limit to 10 results to avoid overwhelming the user
    const limitedPRs = matchingPRs.slice(0, 10);

    // Convert to AzDevOpsResult array
    const results: AzDevOpsResult[] = [];
    for (const pr of limitedPRs) {
      let comments: AzDevOpsComment[] = [];
      if (withComments) {
        try {
          // Get pull request threads (comments)
          const threads = await gitApi.getThreads(repoId, pr.pullRequestId!, project);
          
          // Flatten comments from all threads
          comments = threads.flatMap(thread => 
            thread.comments?.map(comment => ({
              id: comment.id || 0,
              url: `https://dev.azure.com/${org}/${project}/_git/${pr.repository?.name}/pullrequest/${pr.pullRequestId}`,
              body: comment.content || ""
            } as AzDevOpsComment)) || []
          );
        } catch (err) {
          // If comments fail for one PR, continue with others
          console.warn(`Could not get comments for PR #${pr.pullRequestId}: ${err}`);
        }
      }

      // Transform the Azure DevOps pull request to match our expected format
      const transformedData = {
        id: pr.pullRequestId,
        fields: {
          "System.Title": pr.title || "",
          "System.Description": pr.description || "",
          "System.State": PullRequestStatus[pr.status!] || "",
          "System.WorkItemType": "Pull Request"
        },
        url: `https://dev.azure.com/${org}/${project}/_git/${pr.repository?.name}/pullrequest/${pr.pullRequestId}`
      };

      results.push({ data: transformedData, comments: comments });
    }

    return results;
  } catch (err) {
    if (err instanceof Error && err.message.includes('No pull requests found')) {
      throw err;
    }
    throw new Error(`Error searching pull requests with title "${searchQuery}" in project '${project}': ${err}`);
  }
}

//get pull request object from Azure DevOps by its PR id
export async function getAzdPullrequestById(
  requestHandlerContext: RequestHandlerContext,
  pullRequestId: number,
  azdoOrg: string = "",
  azdoProject: string = "",
  withComments = false,
): Promise<AzDevOpsResult> {
  const { org, project } = await determineAzDoOrgAndProjectToUse(
    azdoOrg,
    azdoProject,
    requestHandlerContext
  );

  let pullrequest: any = {};
  let sharedConnection: WebApi;
  let sharedRepoId: string;
  try {
    const orgUrl = `https://dev.azure.com/${org}`;
    const connection = await getAzureDevOpsConnection(orgUrl);
    const gitApi: IGitApi = await connection.getGitApi();
    
    // Find the repository by matching the remote URL
    const repoId = await findRepositoryByRemoteUrl(gitApi, project);
    
    pullrequest = await gitApi.getPullRequest(repoId, pullRequestId, project);
    // Reuse connection and repoId for comments
    sharedConnection = connection;
    sharedRepoId = repoId;
  } catch (err) {
    throw new Error(`Can't find PR #${pullRequestId} in project '${project}'. Error: ${err}`);
  }
  
  try {    let comments: AzDevOpsComment[] = [];
    if (withComments) {
      const gitApi: IGitApi = await sharedConnection.getGitApi();
      
      // Get pull request threads (comments)
      const threads = await gitApi.getThreads(sharedRepoId, pullRequestId, project);
      
      // Flatten comments from all threads
      comments = threads.flatMap(thread => 
        thread.comments?.map(comment => ({
          id: comment.id || 0,
          url: `https://dev.azure.com/${org}/${project}/_git/${pullrequest.repository?.name}/pullrequest/${pullRequestId}`,
          body: comment.content || ""
        } as AzDevOpsComment)) || []
      );
    }

    // Transform the Azure DevOps pull request to match our expected format
    const transformedData = {
      id: pullrequest.pullRequestId,
      fields: {
      "System.Title": pullrequest.title || "",
      "System.Description": pullrequest.description || "",
      "System.State": PullRequestStatus[pullrequest.status] || "",
      "System.WorkItemType": "Pull Request"
      },
      url: `https://dev.azure.com/${org}/${project}/_git/${pullrequest.repository?.name}/pullrequest/${pullRequestId}`
    };

    return { data: transformedData, comments: comments };
  } catch (err) {
    throw new Error(
      `Can't get comments for PR !${pullRequestId} of project '${project}'. Error: ${err}`
    );
  }
}
