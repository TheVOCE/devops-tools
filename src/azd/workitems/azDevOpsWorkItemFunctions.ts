import * as vscode from "vscode";
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

  let workItem: any = {};
  try {
    // For now, we'll return mock data until MCP Azure DevOps tools are properly integrated
    workItem = {
      id: workItemId,
      fields: {
        "System.Title": `Work Item ${workItemId}`,
        "System.Description": "Sample work item description",
        "System.State": "Active",
        "System.WorkItemType": "Task"
      },
      url: `https://dev.azure.com/${org}/${project}/_workitems/edit/${workItemId}`
    };
  } catch (err) {
    throw new Error(`Can't find work item #${workItemId} in project '${project}'.`);
  }

  try {
    let comments: AzDevOpsComment[] = [];
    if (withComments) {
      // For now, return empty comments until MCP tools are integrated
      comments = [];
    }

    return { data: workItem, comments: comments };
  } catch (err) {
    throw new Error(
      `Can't get comments for work item #${workItemId} of project '${project}'.`
    );
  }
}
