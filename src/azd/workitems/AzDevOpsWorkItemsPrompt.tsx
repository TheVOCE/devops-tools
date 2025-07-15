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
  searchAzdWorkItemsByTitle,
  StateMultipleWorkItemsInStream,
} from "./azDevOpsWorkItemFunctions";
import { ASSISTANT_MESSAGE, OPEN_URL_COMMAND } from "../../consts";
import type { AzDevOpsResult } from "../AzDevOpsResult";
import { parseAzDevOpsValuesFromPrompt } from "../azDevOpsUtils";
import { AzDevOpsWorkItemsPromptProps } from "./AzDevOpsWorkItemsPromptProps";
import { AzDevOpsWorkItemsPromptState } from "./AzDevOpsWorkItemsPromptState";
import * as sanitizeHtml from "sanitize-html";

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
    allowedTags: [], // No HTML tags allowed
    allowedAttributes: {}, // No attributes allowed
    stripIgnoreTag: true, // Strip tags that are not in allowedTags
    stripIgnoreTagBody: false // Keep content inside stripped tags
  }).trim();
}

export class AzDevOpsWorkItemsPrompt extends PromptElement<
  AzDevOpsWorkItemsPromptProps,
  AzDevOpsWorkItemsPromptState
> {
  override async prepare() {
    const { requestHandlerContext } = this.props;
    const { request, stream } = requestHandlerContext;
    
    // Check if this is a title-based search by looking for searchQuery in the user prompt
    // This will be set by the LLM parser when it detects a title search intent
    const searchQueryMatch = this.props.userPrompt.match(/searchQuery:(.+)/);
    const isSearchByTitle = searchQueryMatch !== null;
    
    if (isSearchByTitle) {
      const searchQuery = searchQueryMatch[1].trim();
      const { azdoOrg, azdoProject, commentsUsage } = parseAzDevOpsValuesFromPrompt(request, stream);
      
      stream.progress(`Searching for work items with title containing "${searchQuery}"...`);
      
      const azdoResults = (await searchAzdWorkItemsByTitle(
        requestHandlerContext,
        searchQuery,
        azdoOrg,
        azdoProject,
        commentsUsage
      )) as AzDevOpsResult[];

      stream.progress(`Found ${azdoResults.length} work item${azdoResults.length !== 1 ? 's' : ''}.`);

      const config = vscode.workspace.getConfiguration("voce");
      const echoFullWorkItem = config.get("echoFullAzDWorkItem", false) as boolean;
      
      if (echoFullWorkItem) {
        StateMultipleWorkItemsInStream(
          stream, 
          azdoResults.filter(result => result.data && result.data.url).map(result => ({
            ...result.data!,
            url: result.data!.url!
          })), 
          searchQuery
        );
      } else {
        stream.markdown(`🔍 Found ${azdoResults.length} work item${azdoResults.length !== 1 ? 's' : ''} with title containing "${searchQuery}":\n\n`);
        azdoResults.forEach((result, index) => {
          if (result.data) {
            const title = sanitizeWorkItemField(result.data.fields["System.Title"]);
            const workItemType = sanitizeWorkItemField(result.data.fields["System.WorkItemType"]);
            const state = sanitizeWorkItemField(result.data.fields["System.State"]);
            stream.markdown(`${index + 1}. 🔷**Work Item #${result.data.id}** [_${workItemType}_] [_${state}_]: **${title}**\n`);
            stream.button({
              command: OPEN_URL_COMMAND,
              title: vscode.l10n.t("Open Work Item #" + result.data.id),
              arguments: [result.data.url],
            });
            stream.markdown(`\n`);
          }
        });
      }
      
      stream.markdown(`---\n\n`);
      return { azdoResult: azdoResults[0] || null }; // Return first result for LLM context
    } else {
      // Original ID-based search logic
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
          `🔷Work Item [_${azdoResult.data?.fields["System.WorkItemType"]}_] [_${azdoResult.data?.fields["System.State"]}_]: **${azdoResult.data?.fields["System.Title"]}**\n\n`
        );
        
        // Add button for the abbreviated display
        stream.button({
          command: OPEN_URL_COMMAND,
          title: vscode.l10n.t("Open Work Item in Browser"),
          arguments: [azdoResult.data?.url],
        });
      }

      stream.markdown(`---\n\n`);
      return { azdoResult };
    }
  }

  render(state: AzDevOpsWorkItemsPromptState, sizing: PromptSizing) {
    const { userPrompt } = this.props;
    const { azdoResult } = state;
    
    // Get work item fields and sanitize them for LLM context
    const title = sanitizeWorkItemField(azdoResult?.data?.fields["System.Title"]);
    const workItemType = sanitizeWorkItemField(azdoResult?.data?.fields["System.WorkItemType"]);
    const description = sanitizeWorkItemField(azdoResult?.data?.fields["System.Description"] || "");
    const acceptanceCriteria = sanitizeWorkItemField(azdoResult?.data?.fields["Microsoft.VSTS.Common.AcceptanceCriteria"] || "");
    const reproSteps = sanitizeWorkItemField(azdoResult?.data?.fields["Microsoft.VSTS.TCM.ReproSteps"] || "");
    const systemInfo = sanitizeWorkItemField(azdoResult?.data?.fields["Microsoft.VSTS.TCM.SystemInfo"] || "");
    
    // Build the context message based on work item type
    let contextMessage = `The work item to work on has the title: "${title}", work item type "${workItemType}"`;
    
    // For bugs, use repro steps instead of description
    if (workItemType?.toLowerCase() === "bug") {
      if (reproSteps) {
        contextMessage += ` and the repro steps: ${reproSteps}`;
      } else {
        contextMessage += " and no repro steps provided";
      }
      
      // Add system info for bugs
      if (systemInfo) {
        contextMessage += `. The system info is: ${systemInfo}`;
      }
    } else {
      // For non-bugs, use description
      if (description) {
        contextMessage += ` and the description: ${description}`;
      } else {
        contextMessage += " and no description provided";
      }
    }
    
    // Always include acceptance criteria if available
    if (acceptanceCriteria) {
      contextMessage += `. The acceptance criteria are: ${acceptanceCriteria}`;
    }
    
    contextMessage += ". Use that information to give better answer for the following user query.";
    
    // Add comments if available
    if (azdoResult?.comments && azdoResult?.comments?.length > 0) {
      contextMessage += ` Do also regard the comments: ${
        azdoResult?.comments
          ?.map((comment) => sanitizeWorkItemField(comment.body || ""))
          .join("\n\n") + ""
      }`;
    }
    
    return (
      <>
        <AssistantMessage priority={300}>{ASSISTANT_MESSAGE}</AssistantMessage>
        <UserMessage priority={200}>
          {contextMessage}
        </UserMessage>
        <UserMessage priority={100}>{userPrompt}</UserMessage>
      </>
    );
  }
}
