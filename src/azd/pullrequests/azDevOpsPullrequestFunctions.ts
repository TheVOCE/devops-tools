import * as vscode from "vscode";
import { WebApi, getPersonalAccessTokenHandler } from "azure-devops-node-api";
import { IGitApi } from "azure-devops-node-api/GitApi";
import type { RequestHandlerContext } from "../../requestHandlerContext";
import {
  determineAzDoOrgAndProjectToUse,
  getAzDevOpsOrgAndProject,
} from "../azd";
import { type AzDevOpsComment } from "../AzDevOpsComment";
import { type AzDevOpsResult } from "../AzDevOpsResult";
import { PullRequestStatus } from "azure-devops-node-api/interfaces/GitInterfaces";

export function StateFullPrInStream(
  stream: vscode.ChatResponseStream,
  pullrequest: { title: string; description: string }
) {
  stream.markdown(`🔵PR: **${pullrequest.title}**\n\n`);
  stream.markdown(pullrequest.description?.replaceAll("\n", "\n> ") + "");
  stream.markdown("\n\n----\n\n");
}

async function getAzureDevOpsApi(
  requestHandlerContext: RequestHandlerContext,
  org: string
): Promise<WebApi> {
  // Get the PAT from settings
  const config = vscode.workspace.getConfiguration("voce");
  const pat = config.get("azureDevOpsPat", "") as string;
  
  if (!pat) {
    throw new Error("Azure DevOps Personal Access Token not configured. Please set 'voce.azureDevOpsPat' in your settings.");
  }

  const orgUrl = `https://dev.azure.com/${org}`;
  
  // Create the API connection
  const authHandler = getPersonalAccessTokenHandler(pat);
  const connection = new WebApi(orgUrl, authHandler);
  
  return connection;
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

//get pull request object from Azure DevOps by its PR id
export async function getPullrequestById(
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
  try {
    const connection = await getAzureDevOpsApi(requestHandlerContext, org);
    const gitApi: IGitApi = await connection.getGitApi();
    
    // Find the repository by matching the remote URL
    const repoId = await findRepositoryByRemoteUrl(gitApi, project);
    
    pullrequest = await gitApi.getPullRequest(repoId, pullRequestId, project);
  } catch (err) {
    throw new Error(`Can't find PR #${pullRequestId} in project '${project}'. Error: ${err}`);
  }
  
  try {    let comments: AzDevOpsComment[] = [];
    if (withComments) {
      const connection = await getAzureDevOpsApi(requestHandlerContext, org);
      const gitApi: IGitApi = await connection.getGitApi();
      
      // Find the repository by matching the remote URL
      const repoId = await findRepositoryByRemoteUrl(gitApi, project);
      
      // Get pull request threads (comments)
      const threads = await gitApi.getThreads(repoId, pullRequestId, project);
      
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
      `Can't get comments for PR #${pullRequestId} of project '${project}'. Error: ${err}`
    );
  }
}
