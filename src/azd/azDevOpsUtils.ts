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

  // Try modern .default scope first, then legacy user_impersonation scope if needed
  const scopes = [
    "499b84ac-1321-427f-aa17-267ca6975798/.default",
    "https://app.vssps.visualstudio.com/user_impersonation"
  ];
  for (const scope of scopes) {
    try {
      const session = await vscode.authentication.getSession(
        "microsoft",
        [scope],
        {
          createIfNone: true,
          clearSessionPreference: true
        }
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
      if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof (error as any).message === 'string' &&
        (error as any).message.includes('user is not allowed')
      ) {
        const consentMsg = `Azure DevOps OAuth authentication failed with scope '${scope}': User is not allowed.\n\nThis usually means your Azure AD admin must grant consent for the Azure DevOps resource (499b84ac-1321-427f-aa17-267ca6975798) to this app. See Azure Portal > Azure Active Directory > Enterprise Applications > (your app) > Permissions.`;
        logInfo(consentMsg);
        vscode.window.showErrorMessage(consentMsg);
      } else {
        logInfo(`Microsoft authentication not available or failed with scope '${scope}': ${error}`);
      }
    }
  }

  // Fallback to Personal Access Token (PAT)
  logInfo("Falling back to PAT authentication");
  const token = await vscode.workspace.getConfiguration("voce").get("azureDevOpsPat") as string;

  if (!token) {
    const message = `Azure DevOps authentication failed.\n\nTo access real Azure DevOps data, you must configure a Personal Access Token (PAT).\n\n1. In Azure DevOps, go to User Settings → Personal Access Tokens.\n2. Create a new PAT with 'Work Items (Read & Write)' scope.\n3. In VS Code, open settings and set 'voce.azureDevOpsPat' to your new PAT.\n\nAlternatively, try signing in with your Microsoft Account if your organization allows it.`;

    logInfo("Neither Microsoft authentication nor PAT token available");

    const selection = await vscode.window.showWarningMessage(message, "Sign In", "Open Settings");

    if (selection === "Sign In") {
      logInfo("User chose to sign in with Microsoft account");
      try {
        const session = await vscode.authentication.getSession("microsoft", ["https://app.vssps.visualstudio.com/user_impersonation"], {
          createIfNone: true
        });

        if (session) {
          logInfo("Microsoft authentication successful after user prompt");
          const authHandler = azdev.getBearerHandler(session.accessToken);
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
