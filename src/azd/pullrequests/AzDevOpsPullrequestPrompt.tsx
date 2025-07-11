import * as vscode from "vscode";
import {
  AssistantMessage,
  PromptElement,
  PromptSizing,
  UserMessage,
} from "@vscode/prompt-tsx";
import { ASSISTANT_MESSAGE, OPEN_URL_COMMAND } from "../../consts";
import {
  getAzdPullrequestById,
  searchAzdPullrequestsByTitle,
  StateFullAzDPrInStream,
  StateMultipleAzDPrsInStream,
} from "./azDevOpsPullrequestFunctions";
import { parseAzDevOpsValuesFromPrompt } from "../azDevOpsUtils";
import type { AzDevOpsResult } from "../AzDevOpsResult";
import { AzDevOpsPullrequestPromptState } from "./AzDevOpsPullrequestPromptState";
import { AzDevOpsPullrequestPromptProps } from "./AzDevOpsPullrequestPromptProps";

export class AzDevOpsPullrequestPrompt extends PromptElement<
  AzDevOpsPullrequestPromptProps,
  AzDevOpsPullrequestPromptState
> {
  override async prepare() {
    const { requestHandlerContext } = this.props;
    const { request, stream } = requestHandlerContext;
    
    // Check if this is a title-based search by looking for searchQuery in the user prompt
    // This will be set by the LLM parser when it detects a title search intent
    const searchQueryMatch = this.props.userPrompt.match(/searchQuery:(.+?)(?:\s|$)/);
    const isSearchByTitle = searchQueryMatch !== null;
    
    if (isSearchByTitle) {
      const searchQuery = searchQueryMatch[1].trim();
      const { azdoOrg, azdoProject, commentsUsage } = parseAzDevOpsValuesFromPrompt(request, stream);
      
      stream.progress(`Searching for pull requests with title containing "${searchQuery}"...`);
      
      const azdoResults = (await searchAzdPullrequestsByTitle(
        requestHandlerContext,
        searchQuery,
        azdoOrg,
        azdoProject,
        commentsUsage
      )) as AzDevOpsResult[];

      stream.progress(`Found ${azdoResults.length} pull request${azdoResults.length !== 1 ? 's' : ''}.`);

      const config = vscode.workspace.getConfiguration("voce");
      const echoFullAzDPullRequest = config.get("echoFullAzDPullRequest", false) as boolean;
      
      if (echoFullAzDPullRequest) {
        StateMultipleAzDPrsInStream(
          stream, 
          azdoResults.filter(result => result.data).map(result => ({
            pullRequestId: result.data!.id,
            title: result.data!.fields["System.Title"],
            description: result.data!.fields["System.Description"] || "",
            status: result.data!.fields["System.State"],
            url: result.data!.url || ""
          })), 
          searchQuery
        );
      } else {
        stream.markdown(`🔍 Found ${azdoResults.length} pull request${azdoResults.length !== 1 ? 's' : ''} with title containing "${searchQuery}":\n\n`);
        azdoResults.forEach((result, index) => {
          if (result.data) {
            stream.markdown(`${index + 1}. 🔵**PR #${result.data.id}** [_${result.data.fields["System.State"]}_]: **${result.data.fields["System.Title"]}**\n`);
          }
        });
        stream.markdown("\n");
      }

      azdoResults.forEach((result) => {
        if (result.data) {
          stream.button({
            command: OPEN_URL_COMMAND,
            title: vscode.l10n.t(`Open PR #${result.data.id} in Browser`),
            arguments: [result.data.url],
          });
        }
      });
      
      stream.markdown(`---\n\n`);
      return { azdoResults, searchType: 'title' as const, searchQuery };
    } else {
      // Original ID-based search logic
      const { azdoOrg, azdoProject, itemId, commentsUsage } = parseAzDevOpsValuesFromPrompt(request, stream);

      const azdoResult = (await getAzdPullrequestById(
        requestHandlerContext,
        Number(itemId),
        azdoOrg,
        azdoProject,
        commentsUsage
      )) as AzDevOpsResult;

      stream.progress(`PR "${azdoResult?.data?.fields["System.Title"]}" loaded.`);

      // Access vscode settings
      const config = vscode.workspace.getConfiguration("voce");
      const echoFullPullRequest = config.get("echoFullAzDPullRequest", false) as boolean;
      const echoPullRequestComments = config.get("echoAzDPullRequestComments", false) as boolean;

      if (echoFullPullRequest) {
        if (echoPullRequestComments) {
          const commentsString = azdoResult?.comments
            ? azdoResult.comments.map((comment: any) => `○ ${comment.body}`).join("\n\n")
            : "";
          
          StateFullAzDPrInStream(stream, {
            title: azdoResult?.data?.fields["System.Title"] || "",
            status: azdoResult?.data?.fields["System.State"] || "",
            description: azdoResult?.data?.fields["System.Description"] || "",
          }, commentsString);
        } else {
          StateFullAzDPrInStream(stream, {
            title: azdoResult?.data?.fields["System.Title"] || "",
            status: azdoResult?.data?.fields["System.State"] || "",
            description: azdoResult?.data?.fields["System.Description"] || ""
          });
        }
      } else {
        stream.markdown(
          `🔵PR [_${azdoResult.data?.fields["System.State"]}_]: **${azdoResult.data?.fields["System.Title"]}**\n\n`
        );
      }

      stream.button({
        command: OPEN_URL_COMMAND,
        title: vscode.l10n.t("Open PR in Browser"),
        arguments: [azdoResult?.data?.url],
      });
      stream.markdown(`---\n\n`);
      return { azdoResult, searchType: 'id' as const };
    }
  }

  render(state: AzDevOpsPullrequestPromptState, sizing: PromptSizing) {
    const { userPrompt } = this.props;
    
    if (state.searchType === 'title' && state.azdoResults) {
      // Handle multiple PR results from title search
      const prTitles = state.azdoResults.filter(result => result.data).map(result => result.data!.fields["System.Title"]).join(", ");
      const prDescriptions = state.azdoResults.filter(result => result.data).map(result => result.data!.fields["System.Description"] || "No description").join("\n\n");
      
      return (
        <>
          <AssistantMessage priority={300}>{ASSISTANT_MESSAGE}</AssistantMessage>
          <UserMessage priority={200}>
            {`The Azure DevOps pull requests found with title containing "${state.searchQuery}" are: ${prTitles}. The descriptions are: ${prDescriptions}. Use that information to give better answer for the following user query.`}
          </UserMessage>
          <UserMessage priority={100}>{userPrompt}</UserMessage>
        </>
      );
    } else if (state.azdoResult) {
      // Handle single PR result from ID search
      const { azdoResult } = state;
      return (
        <>
          <AssistantMessage priority={300}>{ASSISTANT_MESSAGE}</AssistantMessage>
          <UserMessage priority={200}>
            {`The Azure DevOps pull request to work on has the title: "${azdoResult?.data?.fields["System.Title"]}" and the description: ${azdoResult?.data?.fields["System.Description"]}. Use that information to give better answer for the following user query.` +
              (azdoResult?.comments && azdoResult?.comments?.length > 0
                ? `Do also consider the comments: ${
                    azdoResult?.comments
                      ?.map((comment) => comment.body)
                      .join("\n\n")
                  }`
                : "")}
          </UserMessage>
          <UserMessage priority={100}>{userPrompt}</UserMessage>
        </>
      );
    } else {
      // Fallback case
      return (
        <>
          <AssistantMessage priority={300}>{ASSISTANT_MESSAGE}</AssistantMessage>
          <UserMessage priority={100}>{userPrompt}</UserMessage>
        </>
      );
    }
  }
}
