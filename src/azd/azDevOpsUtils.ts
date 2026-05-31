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
 * Get Azure DevOps API connection with Microsoft Account authentication as primary method and PAT as fallback
 * @param orgUrl The organization URL (e.g., https://dev.azure.com/myorg)
 * @returns Promise<azdev.WebApi> The Azure DevOps WebApi connection
 */
export async function getAzureDevOpsConnection(orgUrl: string): Promise<azdev.WebApi> {
  logInfo("Attempting Azure DevOps connection with Microsoft Account authentication");

  // Silently check for an existing Microsoft session — no UI prompt at this stage
  const scopes = [
    "499b84ac-1321-427f-aa17-267ca6975798/.default",
    "https://app.vssps.visualstudio.com/user_impersonation"
  ];
  for (const scope of scopes) {
    try {
      const session = await vscode.authentication.getSession(
        "microsoft",
        [scope],
        { createIfNone: false }
      );
      if (session) {
        logInfo(`Microsoft authentication successful with scope '${scope}', using Bearer token`);
        const authHandler = azdev.getBearerHandler(session.accessToken);
        const connection = new azdev.WebApi(orgUrl, authHandler);
        connection.connect();
        logInfo(`Successfully created Azure DevOps connection using Microsoft Account for organization: ${orgUrl}`);
        return connection;
      }
    } catch (error) {
      logInfo(`Microsoft authentication not available with scope '${scope}': ${error}`);
    }
  }

  // Fallback to Personal Access Token (PAT)
  logInfo("Falling back to PAT authentication");
  const token = await vscode.workspace.getConfiguration("voce").get("azureDevOpsPat") as string;

  if (token) {
    logInfo(`Using Azure DevOps PAT token for organization: ${orgUrl}`);
    const authHandler = azdev.getPersonalAccessTokenHandler(token);
    const connection = new azdev.WebApi(orgUrl, authHandler);
    logInfo(`Successfully created Azure DevOps connection using PAT token for organization: ${orgUrl}`);
    return connection;
  }

  // No authentication available — show a proper modal dialog
  logInfo("Neither Microsoft authentication nor PAT token available");

  const selection = await vscode.window.showWarningMessage(
    "Azure DevOps Authentication Required",
    {
      modal: true,
      detail: "Sign in with your Microsoft Account for seamless access, or configure a Personal Access Token (PAT) in VS Code settings (voce.azureDevOpsPat)."
    },
    "Sign In with Microsoft Account",
    "Configure PAT Token"
  );

  if (selection === "Sign In with Microsoft Account") {
    logInfo("User chose to sign in with Microsoft account");
    try {
      const session = await vscode.authentication.getSession(
        "microsoft",
        ["https://app.vssps.visualstudio.com/user_impersonation"],
        { createIfNone: true }
      );

      if (session) {
        logInfo("Microsoft authentication successful after user prompt");
        const authHandler = azdev.getBearerHandler(session.accessToken);
        const connection = new azdev.WebApi(orgUrl, authHandler);
        logInfo(`Successfully created Azure DevOps connection using Microsoft Account after prompt for organization: ${orgUrl}`);
        return connection;
      }
    } catch (authError) {
      logInfo(`Microsoft authentication failed after user prompt: ${authError}`);
      throw new Error("Microsoft Account authentication failed. Please try again or configure a PAT token in settings (voce.azureDevOpsPat).");
    }
  } else if (selection === "Configure PAT Token") {
    logInfo("User chose to open settings for PAT configuration");
    vscode.commands.executeCommand("workbench.action.openSettings", "voce.azureDevOpsPat");
  }

  throw new Error("Azure DevOps authentication is required. Sign in with your Microsoft Account or configure a PAT token in settings (voce.azureDevOpsPat).");
}
