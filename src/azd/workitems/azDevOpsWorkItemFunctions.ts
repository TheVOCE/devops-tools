import * as vscode from "vscode";
import * as azdev from "azure-devops-node-api";
import { IWorkItemTrackingApi } from "azure-devops-node-api/WorkItemTrackingApi";
import { WorkItem, Comment, WorkItemExpand } from "azure-devops-node-api/interfaces/WorkItemTrackingInterfaces";
import type { RequestHandlerContext } from "../../requestHandlerContext";
import { determineAzDoOrgAndProjectToUse } from "../azd";
import { getAzureDevOpsConnection } from "../azDevOpsUtils";
import { type AzDevOpsComment } from "../AzDevOpsComment";
import { type AzDevOpsResult } from "../AzDevOpsResult";
import { logInfo } from "../../logging.js";
import { OPEN_URL_COMMAND, getDescriptionTruncationLength } from "../../consts";
import sanitizeHtml from "sanitize-html";

/**
 * Sanitizes HTML content from work item fields, removing HTML tags and keeping only plain text
 * @param content The content to sanitize
 * @returns Sanitized plain text content
 */
function sanitizeWorkItemField(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Configure sanitize-html to strip all HTML tags and return plain text
  return sanitizeHtml(content, {
    allowedTags: ['b', 'i', 'em', 'strong', 'a','br'],
    allowedAttributes: {
      'a': ['href']
    }
  }).trim();
}

export function StateFullWorkItemInStream(
  stream: vscode.ChatResponseStream,
  workItem: { id?: number; fields: { [key: string]: any }; url?: string },
  comments: AzDevOpsComment[]
) {
  const title = sanitizeWorkItemField(workItem.fields["System.Title"]);
  const description = sanitizeWorkItemField(workItem.fields["System.Description"] || "");
  const workItemType = sanitizeWorkItemField(workItem.fields["System.WorkItemType"] || "Unknown");
  const state = sanitizeWorkItemField(workItem.fields["System.State"] || "Unknown");
  const acceptanceCriteria = sanitizeWorkItemField(workItem.fields["Microsoft.VSTS.Common.AcceptanceCriteria"] || "");
  const reproSteps = sanitizeWorkItemField(workItem.fields["Microsoft.VSTS.TCM.ReproSteps"] || "");
  const systemInfo = sanitizeWorkItemField(workItem.fields["Microsoft.VSTS.TCM.SystemInfo"] || "");

  stream.markdown(`🔷Work Item: **${title}**\n`);
  stream.markdown(`Type: ${workItemType}\n`);
  stream.markdown(`State: ${state}\n\n`);

  // For bugs, use repro steps instead of description
  if (workItemType.toLowerCase() === "bug") {
    if (reproSteps) {
      stream.markdown("**Repro Steps:**\n");
      stream.markdown(reproSteps.replaceAll("\n", "\n> ") + "\n\n");
    }

    // Add system info for bugs
    if (systemInfo) {
      stream.markdown("**System Info:**\n");
      stream.markdown(systemInfo.replaceAll("\n", "\n> ") + "\n\n");
    }
  } else {
    // For non-bugs, use description
    if (description) {
      stream.markdown("**Description:**\n");
      stream.markdown(description.replaceAll("\n", "\n> ") + "\n\n");
    }
  }

  // Always include acceptance criteria if available
  if (acceptanceCriteria) {
    stream.markdown("**Acceptance Criteria:**\n");
    stream.markdown(acceptanceCriteria.replaceAll("\n", "\n> ") + "\n\n");
  }

  if (comments?.length > 0) {
    stream.markdown("_Comments_\n");
    comments?.map((comment) =>
      stream.markdown(`\n> ${sanitizeWorkItemField(comment.body || "").replaceAll("\n", "\n> ") + ""}\n`)
    );
  }

  // Add button to open work item in browser if URL is available
  if (workItem.url && workItem.id) {
    stream.markdown("\n\n");
    stream.button({
      command: OPEN_URL_COMMAND,
      title: vscode.l10n.t("Open Work Item #" + workItem.id + " in Browser"),
      arguments: [workItem.url],
    });
  }

  stream.markdown("\n\n----\n\n");
}

export function StateMultipleWorkItemsInStream(
  stream: vscode.ChatResponseStream,
  workItems: Array<{ id: number; fields: { [key: string]: any }; url: string }>,
  searchQuery: string
) {
  stream.markdown(`🔍 Found ${workItems.length} work item${workItems.length !== 1 ? 's' : ''} with title containing "${searchQuery}":\n\n`);

  workItems.forEach((workItem, index) => {
    const title = sanitizeWorkItemField(workItem.fields["System.Title"] || "Untitled");
    const workItemType = sanitizeWorkItemField(workItem.fields["System.WorkItemType"] || "Unknown");
    const state = sanitizeWorkItemField(workItem.fields["System.State"] || "Unknown");
    const description = sanitizeWorkItemField(workItem.fields["System.Description"] || "");
    const reproSteps = sanitizeWorkItemField(workItem.fields["Microsoft.VSTS.TCM.ReproSteps"] || "");
    const acceptanceCriteria = sanitizeWorkItemField(workItem.fields["Microsoft.VSTS.Common.AcceptanceCriteria"] || "");
    const systemInfo = sanitizeWorkItemField(workItem.fields["Microsoft.VSTS.TCM.SystemInfo"] || "");

    stream.markdown(`${index + 1}. 🔷**Work Item #${workItem.id}** [_${workItemType}_] [_${state}_]: **${title}**\n`);

    // Show first configured characters of description (for bugs, use repro steps instead)
    let contentToShow = "";
    if (workItemType.toLowerCase() === "bug" && reproSteps) {
      contentToShow = reproSteps;
    } else if (description) {
      contentToShow = description;
    }

    if (contentToShow && contentToShow.length > 0) {
      const truncationLength = getDescriptionTruncationLength();
      const truncatedContent = contentToShow.length > truncationLength ? contentToShow.substring(0, truncationLength) + "..." : contentToShow;
      stream.markdown(`   > ${truncatedContent.replaceAll("\n", " ")}\n`);
    } else {
      // If no description/repro steps, indicate that because otherwise VS Code will show a link to microsoft.com and that's not helpful
      stream.markdown(`   > No ${workItemType.toLowerCase() === "bug" ? "repro steps" : "description"} available.\n`);
    }

    // Show acceptance criteria if available (truncated)
    if (acceptanceCriteria && acceptanceCriteria.length > 0) {
      const truncationLength = getDescriptionTruncationLength();
      const truncatedCriteria = acceptanceCriteria.length > truncationLength ? acceptanceCriteria.substring(0, truncationLength) + "..." : acceptanceCriteria;
      stream.markdown(`   > **Acceptance Criteria:** ${truncatedCriteria.replaceAll("\n", " ")}\n`);
    }

    // Add button to open work item in browser using the same pattern as single work item
    stream.button({
      command: OPEN_URL_COMMAND,
      title: vscode.l10n.t("Open Work Item #" + workItem.id + " in Browser"),
      arguments: [workItem.url],
    });

    stream.markdown("\n");
  });

  stream.markdown("---\n\n");
}

// Fallback function to provide mock data when API is not available
function getMockWorkItem(workItemId: number, org: string, project: string) {
  return {
    id: workItemId,
    fields: {
      "System.Title": `Mock Work Item ${workItemId}`,
      "System.Description": "This is mock data. Configure Azure DevOps PAT token for real data.",
      "System.State": "Active",
      "System.WorkItemType": "Task",
      "Microsoft.VSTS.Common.AcceptanceCriteria": "Mock acceptance criteria for testing purposes.",
      "Microsoft.VSTS.TCM.ReproSteps": "Mock repro steps for bug testing.",
      "Microsoft.VSTS.TCM.SystemInfo": "OS: Windows 10\nBrowser: Chrome 120.0.6099.199\nResolution: 1920x1080"
    },
    url: `https://dev.azure.com/${org}/${project}/_workitems/edit/${workItemId}`
  };
}

//search work items by title (contains search)
export async function searchAzdWorkItemsByTitle(
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

  const orgUrl = `https://dev.azure.com/${org}`;
  let useMockData = false;

  try {
    const connection = await getAzureDevOpsConnection(orgUrl);
    const witApi: IWorkItemTrackingApi = await connection.getWorkItemTrackingApi();

    // Use WIQL (Work Item Query Language) to search for work items by title
    const wiql = {
      query: `SELECT [System.Id], [System.Title], [System.Description], [System.WorkItemType], [System.State], 
              [Microsoft.VSTS.Common.AcceptanceCriteria], [Microsoft.VSTS.TCM.ReproSteps], [Microsoft.VSTS.TCM.SystemInfo]
              FROM WorkItems 
              WHERE [System.TeamProject] = '${project}' 
              AND [System.Title] CONTAINS '${searchQuery.replace(/'/g, "''")}' 
              ORDER BY [System.ChangedDate] DESC`
    };

    const queryResult = await witApi.queryByWiql(wiql, { projectId: project, project });

    if (!queryResult.workItems || queryResult.workItems.length === 0) {
      throw new Error(`No work items found with title containing "${searchQuery}" in project '${project}'.`);
    }

    // Limit to 10 results to avoid overwhelming the user
    const limitedWorkItems = queryResult.workItems.slice(0, 10);

    // Get full work item details for each result
    const workItemIds = limitedWorkItems.map(wi => wi.id!);
    const fullWorkItems = await witApi.getWorkItems(workItemIds, undefined, undefined, WorkItemExpand.All);

    // Convert to AzDevOpsResult array
    const results: AzDevOpsResult[] = [];
    for (const workItem of fullWorkItems) {
      if (!workItem.id) {
        continue;
      }

      let comments: AzDevOpsComment[] = [];
      if (withComments) {
        try {
          // Get work item comments
          const commentsResult = await witApi.getComments(project, workItem.id);
          if (commentsResult && commentsResult.comments) {
            comments = commentsResult.comments.map((comment: Comment) => ({
              id: comment.id || 0,
              url: comment.url || "",
              body: comment.text || ""
            }));
          }
        } catch (err) {
          // If comments fail for one work item, continue with others
          console.warn(`Could not get comments for work item #${workItem.id}: ${err}`);
        }
      }

      // Transform the work item to match our expected format
      const transformedWorkItem = {
        id: workItem.id,
        fields: {
          ...workItem.fields,
          "System.Title": sanitizeWorkItemField(workItem.fields?.["System.Title"] || `Work Item ${workItem.id}`),
          "System.Description": sanitizeWorkItemField(workItem.fields?.["System.Description"] || ""),
          "System.State": sanitizeWorkItemField(workItem.fields?.["System.State"] || "Unknown"),
          "System.WorkItemType": sanitizeWorkItemField(workItem.fields?.["System.WorkItemType"] || "Unknown"),
          "Microsoft.VSTS.Common.AcceptanceCriteria": sanitizeWorkItemField(workItem.fields?.["Microsoft.VSTS.Common.AcceptanceCriteria"] || ""),
          "Microsoft.VSTS.TCM.ReproSteps": sanitizeWorkItemField(workItem.fields?.["Microsoft.VSTS.TCM.ReproSteps"] || ""),
          "Microsoft.VSTS.TCM.SystemInfo": sanitizeWorkItemField(workItem.fields?.["Microsoft.VSTS.TCM.SystemInfo"] || "")
        },
        url: `${orgUrl}/${project}/_workitems/edit/${workItem.id}`
      };

      results.push({ data: transformedWorkItem, comments: comments });
    }

    return results;
  } catch (err) {
    if (err instanceof Error && err.message.includes('No work items found')) {
      throw err;
    }

    // If API call fails (e.g., no PAT token), provide helpful message
    requestHandlerContext.stream.progress("⚠️ Work item search requires Azure DevOps PAT token configuration");
    throw new Error(`Error searching work items with title "${searchQuery}" in project '${project}': ${err}. Configure Azure DevOps PAT for real data.`);
  }
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
            body: sanitizeWorkItemField(comment.text || "")
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
        "System.Title": sanitizeWorkItemField(workItem.fields?.["System.Title"] || `Work Item ${workItemId}`),
        "System.Description": sanitizeWorkItemField(workItem.fields?.["System.Description"] || ""),
        "System.State": sanitizeWorkItemField(workItem.fields?.["System.State"] || "Unknown"),
        "System.WorkItemType": sanitizeWorkItemField(workItem.fields?.["System.WorkItemType"] || "Unknown"),
        "Microsoft.VSTS.Common.AcceptanceCriteria": sanitizeWorkItemField(workItem.fields?.["Microsoft.VSTS.Common.AcceptanceCriteria"] || ""),
        "Microsoft.VSTS.TCM.ReproSteps": sanitizeWorkItemField(workItem.fields?.["Microsoft.VSTS.TCM.ReproSteps"] || ""),
        "Microsoft.VSTS.TCM.SystemInfo": sanitizeWorkItemField(workItem.fields?.["Microsoft.VSTS.TCM.SystemInfo"] || "")
      },
      url: `${orgUrl}/${project}/_workitems/edit/${workItemId}`
    };

    return { data: transformedWorkItem, comments: comments };
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Can't get comments for work item !${workItemId} of project '${project}': ${err.message}`);
    }
    throw new Error(`Can't get comments for work item !${workItemId} of project '${project}'.`);
  }
}
