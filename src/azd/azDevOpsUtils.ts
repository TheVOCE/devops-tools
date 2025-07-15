import * as vscode from "vscode";
import * as azdev from "azure-devops-node-api";
import { logInfo } from "../logging.js";

/**
 * Get the configured Azure DevOps hostname (custom or default)
 */
function getAzureDevOpsHostname(): string {
  const config = vscode.workspace.getConfiguration("voce");
  const customHostname = config.get<string>("azd_customhostname");
  return customHostname && customHostname.trim() !== "" ? customHostname.trim() : "dev.azure.com";
}

/**
 * Construct Azure DevOps organization URL using configured hostname
 * @param orgName The organization name
 * @returns The full organization URL
 */
export function getAzureDevOpsOrgUrl(orgName: string): string {
  const hostname = getAzureDevOpsHostname();
  return `https://${hostname}/${orgName}`;
}

/**
 * Construct Azure DevOps work item URL using configured hostname
 * @param orgName The organization name
 * @param projectName The project name
 * @param workItemId The work item ID
 * @returns The full work item URL
 */
export function getAzureDevOpsWorkItemUrl(orgName: string, projectName: string, workItemId: number | string): string {
  const hostname = getAzureDevOpsHostname();
  return `https://${hostname}/${orgName}/${projectName}/_workitems/edit/${workItemId}`;
}

/**
 * Construct Azure DevOps pull request URL using configured hostname
 * @param orgName The organization name
 * @param projectName The project name
 * @param repoName The repository name
 * @param pullRequestId The pull request ID
 * @returns The full pull request URL
 */
export function getAzureDevOpsPullRequestUrl(orgName: string, projectName: string, repoName: string, pullRequestId: number | string): string {
  const hostname = getAzureDevOpsHostname();
  return `https://${hostname}/${orgName}/${projectName}/_git/${repoName}/pullrequest/${pullRequestId}`;
}

const workItemNumberRegex = /!(\d+)(\+?)/; // prefix: !, work item number, optional: + for comments
const azdoOrgProjectRegex = /azdo:(.+)\/(.+?)[\s;,\/:]/; // for specifying org and project name

export function parseAzDevOpsValuesFromPrompt(
  request: vscode.ChatRequest,
  stream: vscode.ChatResponseStream
) {
  logInfo("Parsing Azure DevOps values from prompt");
  const workItemMatch = request.prompt.match(workItemNumberRegex);
  
  let itemId = "";
  let commentsUsage = false;
  
  if (workItemMatch) {
    itemId = workItemMatch[1];
    commentsUsage = workItemMatch[2] === "+";
    stream.progress(`Work Item !${itemId} found in prompt.`);
  } 

  const azdoMatch = request.prompt.match(azdoOrgProjectRegex);
  const [azdoOrg, azdoProject] = azdoMatch ? [azdoMatch[1], azdoMatch[2]] : ["", ""];

  if (azdoOrg) {
    stream.progress(`using Azure DevOps org '${azdoOrg}' passed in prompt`);
  }
  if (azdoProject) {
    stream.progress(`using Azure DevOps project '${azdoProject}' passed in prompt`);
  }
  return { azdoOrg, azdoProject, itemId, commentsUsage };
}

/**
 * Silent version of parseAzDevOpsValuesFromPrompt that doesn't output progress messages
 * Used for checking if parsing finds valid results without affecting the stream
 */
export function parseAzDevOpsValuesFromPromptSilent(
  request: vscode.ChatRequest
) {
  logInfo("Parsing Azure DevOps values from prompt silently");
  const workItemMatch = request.prompt.match(workItemNumberRegex);
  
  let itemId = "";
  let commentsUsage = false;
  
  if (workItemMatch) {
    itemId = workItemMatch[1];
    commentsUsage = workItemMatch[2] === "+";
  } 

  const azdoMatch = request.prompt.match(azdoOrgProjectRegex);
  const [azdoOrg, azdoProject] = azdoMatch ? [azdoMatch[1], azdoMatch[2]] : ["", ""];

  return { azdoOrg, azdoProject, itemId, commentsUsage };
}

/**
 * Get Azure DevOps API connection using PAT token from configuration
 * @param orgUrl The organization URL (e.g., https://dev.azure.com/myorg)
 * @returns Promise<azdev.WebApi> The Azure DevOps WebApi connection
 */
export async function getAzureDevOpsConnection(orgUrl: string): Promise<azdev.WebApi> {
  // Try to get stored PAT token
  logInfo("Retrieving Azure DevOps PAT token from configuration");
  const token = await vscode.workspace.getConfiguration("voce").get("azureDevOpsPat") as string;
  logInfo("Retrieving Azure DevOps connection using PAT token");

  if (!token) {
    // If no token is configured, provide helpful error message
    const message = "Azure DevOps Personal Access Token not configured. Please set 'voce.azureDevOpsPat' in VS Code settings to enable real Azure DevOps integration.";
    
    // Log to output channel for diagnostic purposes
    logInfo("Microsoft authentication not available, falling back to PAT token configuration required");
    
    vscode.window.showWarningMessage(message, "Open Settings").then(selection => {
      if (selection === "Open Settings") {
        vscode.commands.executeCommand("workbench.action.openSettings", "voce.azureDevOpsPat");
      }
    });
    throw new Error(message);
  }

  logInfo(`Using Azure DevOps PAT token for organization: ${orgUrl}`);
  const authHandler = azdev.getPersonalAccessTokenHandler(token);
  const connection = new azdev.WebApi(orgUrl, authHandler);
  logInfo(`Successfully created Azure DevOps connection for organization: ${orgUrl}`);
  return connection;
}
