import * as vscode from "vscode";
import * as azdev from "azure-devops-node-api";
import { logInfo } from "../logging.js";

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
  
  try {
    // First try to use VS Code Microsoft Account authentication
    const session = await vscode.authentication.getSession("microsoft", ["https://app.vssps.visualstudio.com/user_impersonation"], {
      createIfNone: false, // Don't prompt user if no session exists
      clearSessionPreference: false
    });
    
    if (session) {
      logInfo("Microsoft authentication successful, using Bearer token");
      // Use Microsoft authentication token
      const authHandler = azdev.getBearerHandler(session.accessToken);
      const connection = new azdev.WebApi(orgUrl, authHandler);
      logInfo(`Successfully created Azure DevOps connection using Microsoft Account for organization: ${orgUrl}`);
      return connection;
    }
  } catch (error) {
    // If Microsoft authentication fails, silently continue to PAT fallback
    logInfo("Microsoft authentication not available, falling back to PAT token");
  }

  logInfo("Falling back to PAT authentication");
  // Fallback to Personal Access Token
  const token = await vscode.workspace.getConfiguration("voce").get("azureDevOpsPat") as string;

  if (!token) {
    // If no token is configured, provide helpful error message with both options
    const message = "Azure DevOps authentication failed. Please either sign in with your Microsoft Account or set 'voce.azureDevOpsPat' in VS Code settings to enable Azure DevOps integration.";
    
    logInfo("Neither Microsoft authentication nor PAT token available");
    
    const selection = await vscode.window.showWarningMessage(message, "Sign In", "Open Settings");
    
    if (selection === "Sign In") {
      logInfo("User chose to sign in with Microsoft account");
      // Prompt user to sign in with Microsoft account
      try {
        const newSession = await vscode.authentication.getSession("microsoft", ["https://app.vssps.visualstudio.com/user_impersonation"], {
          createIfNone: true
        });
        
        if (newSession) {
          logInfo("Microsoft authentication successful after user prompt");
          const authHandler = azdev.getBearerHandler(newSession.accessToken);
          const connection = new azdev.WebApi(orgUrl, authHandler);
          logInfo(`Successfully created Azure DevOps connection using Microsoft Account after prompt for organization: ${orgUrl}`);
          return connection;
        }
      } catch (authError) {
        logInfo(`Microsoft authentication failed after user prompt: ${authError}`);
        throw new Error("Microsoft Account authentication failed. Please try again or configure a PAT token instead.");
      }
    } else if (selection === "Open Settings") {
      logInfo("User chose to open settings for PAT configuration");
      vscode.commands.executeCommand("workbench.action.openSettings", "voce.azureDevOpsPat");
    }
    
    throw new Error(message);
  }

  logInfo(`Using Azure DevOps PAT token for organization: ${orgUrl}`);
  const authHandler = azdev.getPersonalAccessTokenHandler(token);
  const connection = new azdev.WebApi(orgUrl, authHandler);
  logInfo(`Successfully created Azure DevOps connection using PAT token for organization: ${orgUrl}`);
  return connection;
}
