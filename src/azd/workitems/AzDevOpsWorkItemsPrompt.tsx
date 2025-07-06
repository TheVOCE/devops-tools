import * as vscode from "vscode";
import {
  AssistantMessage,
  PromptElement,
  PromptSizing,
  UserMessage,
} from "@vscode/prompt-tsx";
import {
  getWorkItemAndCommentsById,
  StateFullWorkItemInStream,
} from "./azDevOpsWorkItemFunctions";
import { ASSISTANT_MESSAGE, OPEN_URL_COMMAND } from "../../consts";
import type { AzDevOpsResult } from "../AzDevOpsResult";
import { parseAzDevOpsValuesFromPrompt } from "../azDevOpsUtils";
import { AzDevOpsWorkItemsPromptProps } from "./AzDevOpsWorkItemsPromptProps";
import { AzDevOpsWorkItemsPromptState } from "./AzDevOpsWorkItemsPromptState";

export class AzDevOpsWorkItemsPrompt extends PromptElement<
  AzDevOpsWorkItemsPromptProps,
  AzDevOpsWorkItemsPromptState
> {
  override async prepare() {
    const { requestHandlerContext } = this.props;
    const { request, stream } = requestHandlerContext;
    const { azdoOrg, azdoProject, itemId, commentsUsage } = parseAzDevOpsValuesFromPrompt(
      request,
      stream
    );

    const azdoResult = (await getWorkItemAndCommentsById(
      requestHandlerContext,
      Number(itemId),
      azdoOrg,
      azdoProject,
      commentsUsage
    )) as AzDevOpsResult;

    stream.progress(`🔷Work Item "${azdoResult?.data?.fields["System.Title"]}" loaded.`);

    // Access vscode settings
    const config = vscode.workspace.getConfiguration("voce");
    const echoFullWorkItem = config.get("echoFullAzDWorkItem", false) as boolean;
    const echoWorkItemComments = config.get("echoAzDWorkItemComments", false) as boolean;
    if (echoFullWorkItem) {
      StateFullWorkItemInStream(
        stream,
        azdoResult?.data!,
        echoWorkItemComments ? azdoResult?.comments ?? [] : []
      );
    } else {
      stream.markdown(
        `🔷Work Item [_${azdoResult.data?.fields["System.State"]}_]: **${azdoResult.data?.fields["System.Title"]}**\n\n`
      );
    }

    // Get org and project for URL construction
    const { determineAzDoOrgAndProjectToUse } = await import("../azd.js");
    const { org, project } = await determineAzDoOrgAndProjectToUse(azdoOrg, azdoProject, requestHandlerContext);
    
    // Create URL for Azure DevOps work item
    const workItemUrl = `https://dev.azure.com/${org}/${project}/_workitems/edit/${itemId}`;
    stream.button({
      command: OPEN_URL_COMMAND,
      title: vscode.l10n.t("Open Work Item in Browser"),
      arguments: [workItemUrl],
    });
    stream.markdown(`---\n\n`);
    return { azdoResult };
  }

  render(state: AzDevOpsWorkItemsPromptState, sizing: PromptSizing) {
    const { userPrompt } = this.props;
    const { azdoResult } = state;
    return (
      <>
        <AssistantMessage priority={300}>{ASSISTANT_MESSAGE}</AssistantMessage>
        <UserMessage priority={200}>
          {`The work item to work on has the title: "${azdoResult?.data?.fields["System.Title"]}" and the description: ${azdoResult?.data?.fields["System.Description"] || "No description"}. Use that information to give better answer for the following user query.` +
            (azdoResult?.comments && azdoResult?.comments?.length > 0
              ? `Do also regard the comments: ${
                  azdoResult?.comments
                    ?.map((comment) => comment.body)
                    .join("\n\n") + ""
                }`
              : "")}
        </UserMessage>
        <UserMessage priority={100}>{userPrompt}</UserMessage>
      </>
    );
  }
}
