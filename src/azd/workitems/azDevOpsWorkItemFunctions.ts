import * as vscode from "vscode";
import * as azdev from "azure-devops-node-api";
import { IWorkItemTrackingApi } from "azure-devops-node-api/WorkItemTrackingApi";
import { WorkItem, Comment, WorkItemExpand } from "azure-devops-node-api/interfaces/WorkItemTrackingInterfaces";
import type { RequestHandlerContext } from "../../requestHandlerContext";
import { determineAzDoOrgAndProjectToUse } from "../azd";
import { type AzDevOpsComment } from "../AzDevOpsComment";
import { type AzDevOpsResult } from "../AzDevOpsResult";

export function StateFullWorkItemInStream(
  stream: vscode.ChatResponseStream,
  workItem: { fields: { [key: string]: any } },
  comments: AzDevOpsComment[]
) {
  const title = workItem.fields["System.Title"];
  const description = workItem.fields["System.Description"] || "";
  
  stream.markdown(`🔷Work Item: **${title}**\n\n`);
  stream.markdown(description.replaceAll("\n", "\n> ") + "");
  if (comments?.length > 0) {
    stream.markdown("\n\n_Comments_\n");
    comments?.map((comment) =>
      stream.markdown(`\n> ${comment.body?.replaceAll("\n", "\n> ") + ""}\n`)
    );
  }
  stream.markdown("\n\n----\n\n");
}

// Get Azure DevOps API connection with Microsoft auth first, PAT fallback
async function getAzureDevOpsConnection(orgUrl: string): Promise<azdev.WebApi> {
  try {
    // First try to use VS Code Microsoft Account authentication
    const session = await vscode.authentication.getSession("microsoft", ["https://app.vssps.visualstudio.com/user_impersonation"], {
      createIfNone: false, // Don't prompt user if no session exists
      clearSessionPreference: false
    });
    
    if (session) {
      // Use Microsoft authentication token
      const authHandler = azdev.getBearerHandler(session.accessToken);
      const connection = new azdev.WebApi(orgUrl, authHandler);
      return connection;
    }
  } catch (error) {
    // If Microsoft authentication fails, silently continue to PAT fallback
    console.log("Microsoft authentication not available, falling back to PAT token");
  }

  // Fallback to Personal Access Token
  const token = await vscode.workspace.getConfiguration("voce").get("azureDevOpsPat") as string;
  
  if (!token) {
    // If no token is configured, provide helpful error message
    const message = "Azure DevOps authentication failed. Please either sign in with your Microsoft Account or set 'voce.azureDevOpsPat' in VS Code settings to enable Azure DevOps integration.";
    vscode.window.showWarningMessage(message, "Sign In", "Open Settings").then(selection => {
      if (selection === "Sign In") {
        // Prompt user to sign in with Microsoft account
        vscode.authentication.getSession("microsoft", ["https://app.vssps.visualstudio.com/user_impersonation"], {
          createIfNone: true
        });
      } else if (selection === "Open Settings") {
        vscode.commands.executeCommand("workbench.action.openSettings", "voce.azureDevOpsPat");
      }
    });
    throw new Error(message);
  }

  const authHandler = azdev.getPersonalAccessTokenHandler(token);
  const connection = new azdev.WebApi(orgUrl, authHandler);
  return connection;
}

// Fallback function to provide mock data when API is not available
function getMockWorkItem(workItemId: number, org: string, project: string) {
  return {
    id: workItemId,
    fields: {
      "System.Title": `Mock Work Item ${workItemId}`,
      "System.Description": "This is mock data. Configure Azure DevOps PAT token for real data.",
      "System.State": "Active",
      "System.WorkItemType": "Task"
    },
    url: `https://dev.azure.com/${org}/${project}/_workitems/edit/${workItemId}`
  };
}

//get work item object from Azure DevOps by its work item id
export async function getWorkItemAndCommentsById(
  requestHandlerContext: RequestHandlerContext,
  workItemId: number,
  azdoOrg: string = "",
  azdoProject: string = "",
  withComments = false
): Promise<AzDevOpsResult> {
  const { org, project } = await determineAzDoOrgAndProjectToUse(
    azdoOrg,
    azdoProject,
    requestHandlerContext
  );

  const orgUrl = `https://dev.azure.com/${org}`;
  
  let workItem: WorkItem;
  let useMockData = false;
  
  try {
    const connection = await getAzureDevOpsConnection(orgUrl);
    const witApi: IWorkItemTrackingApi = await connection.getWorkItemTrackingApi();
    
    // Get work item with all fields
    workItem = await witApi.getWorkItem(workItemId, undefined, undefined, WorkItemExpand.All);
    
    if (!workItem) {
      throw new Error(`Work item !${workItemId} not found`);
    }
  } catch (err) {
    // If API call fails (e.g., no PAT token), use mock data
    requestHandlerContext.stream.progress("⚠️ Using mock data - configure Azure DevOps PAT for real data");
    useMockData = true;
    workItem = getMockWorkItem(workItemId, org, project) as WorkItem;
  }

  try {
    let comments: AzDevOpsComment[] = [];
    if (withComments && !useMockData) {
      try {
        const connection = await getAzureDevOpsConnection(orgUrl);
        const witApi: IWorkItemTrackingApi = await connection.getWorkItemTrackingApi();
        
        // Get work item comments
        const commentsResult = await witApi.getComments(project, workItemId);
        if (commentsResult && commentsResult.comments) {
          comments = commentsResult.comments.map((comment: Comment) => ({
            id: comment.id || 0,
            url: comment.url || "",
            body: comment.text || ""
          }));
        }
      } catch (commentsErr) {
        // If comments fail, continue without them
        requestHandlerContext.stream.progress("⚠️ Could not load comments");
      }
    }

    // Transform the work item to match our expected format
    const transformedWorkItem = {
      id: workItem.id || workItemId,
      fields: {
        ...workItem.fields,
        "System.Title": workItem.fields?.["System.Title"] || `Work Item ${workItemId}`,
        "System.Description": workItem.fields?.["System.Description"] || "",
        "System.State": workItem.fields?.["System.State"] || "Unknown",
        "System.WorkItemType": workItem.fields?.["System.WorkItemType"] || "Unknown"
      },
      url: workItem.url || `${orgUrl}/${project}/_workitems/edit/${workItemId}`
    };

    return { data: transformedWorkItem, comments: comments };
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Can't get comments for work item !${workItemId} of project '${project}': ${err.message}`);
    }
    throw new Error(`Can't get comments for work item !${workItemId} of project '${project}'.`);
  }
}
