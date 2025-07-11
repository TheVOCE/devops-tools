import * as vscode from "vscode";
import {
  AssistantMessage,
  PromptElement,
  PromptSizing,
  UserMessage,
} from "@vscode/prompt-tsx";
import {
  getIssueAndCommentsById,
  StateFullGHIssueInStream,
  searchGhIssuesByTitle,
  StateMultipleGHIssuesInStream,
} from "./gitHubIssueFunctions";
import { ASSISTANT_MESSAGE, OPEN_URL_COMMAND } from "../../consts";
import type { GitHubResult } from "../GitHubResult";
import { parseGitHubValuesFromPrompt } from "../gitHubUtils";
import { GitHubIssuesPromptProps } from "./GitHubIssuesPromptProps";
import { GitHubIssuesPromptState } from "./GitHubIssuesPromptState";

export class GitHubIssuesPrompt extends PromptElement<
  GitHubIssuesPromptProps,
  GitHubIssuesPromptState
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
      const { ghOwner, ghRepo, commentsUsage } = parseGitHubValuesFromPrompt(request, stream);
      
      stream.progress(`Searching for issues with title containing "${searchQuery}"...`);
      
      const ghResults = (await searchGhIssuesByTitle(
        requestHandlerContext,
        searchQuery,
        ghOwner,
        ghRepo,
        commentsUsage
      )) as GitHubResult[];

      stream.progress(`Found ${ghResults.length} issue${ghResults.length !== 1 ? 's' : ''}.`);

      const config = vscode.workspace.getConfiguration("voce");
      const echoFullIssue = config.get("echoFullGHIssue", false) as boolean;
      
      if (echoFullIssue) {
        StateMultipleGHIssuesInStream(
          stream, 
          ghResults.filter(result => result.data).map(result => result.data!), 
          searchQuery
        );
      } else {
        stream.markdown(`🔍 Found ${ghResults.length} issue${ghResults.length !== 1 ? 's' : ''} with title containing "${searchQuery}":\n\n`);
        ghResults.forEach((result, index) => {
          if (result.data) {
            stream.markdown(`${index + 1}. 🟣**Issue #${result.data.number}** [_${result.data.state}_]: **${result.data.title}**\n`);
            stream.button({
              command: OPEN_URL_COMMAND,
              title: vscode.l10n.t("Open Issue #" + result.data.number),
              arguments: [result.data.html_url],
            });
            stream.markdown(`\n`);
          }
        });
      }
      
      stream.markdown(`---\n\n`);
      return { ghResult: ghResults[0] || null }; // Return first result for LLM context
    } else {
      // Original ID-based search logic
      const { ghOwner, ghRepo, itemId, commentsUsage } = parseGitHubValuesFromPrompt(
        request,
        stream
      );

      const ghResult = (await getIssueAndCommentsById(
        requestHandlerContext,
        Number(itemId),
        ghOwner,
        ghRepo,
        commentsUsage
      )) as GitHubResult;

      stream.progress(`🟣Issue "${ghResult?.data?.title}" loaded.`);

      // Access vscode settings
      const config = vscode.workspace.getConfiguration("voce");
      const echoFullIssue = config.get("echoFullGHIssue", false) as boolean;
      const echoIssueComments = config.get("echoGHIssueComments", false) as boolean;
      if (echoFullIssue) {
        StateFullGHIssueInStream(
          stream,
          ghResult?.data!,
          echoIssueComments ? ghResult?.comments ?? [] : []
        );
      } else {
        stream.markdown(
          `🟣Issue [_${ghResult.data?.state}_]: **${ghResult.data?.title}**\n\n`
        );
      }

      stream.button({
        command: OPEN_URL_COMMAND,
        title: vscode.l10n.t("Open Issue in Browser"),
        arguments: [ghResult?.data?.html_url],
      });
      stream.markdown(`---\n\n`);
      return { ghResult };
    }
  }

  render(state: GitHubIssuesPromptState, sizing: PromptSizing) {
    const { userPrompt } = this.props;
    const { ghResult } = state;
    return (
      <>
        <AssistantMessage priority={300}>{ASSISTANT_MESSAGE}</AssistantMessage>
        <UserMessage priority={200}>
          {`The issue to work on has the title: "${ghResult?.data?.title}" and the description: ${ghResult?.data?.body}. Use that information to give better answer for the following user query.` +
            (ghResult?.comments && ghResult?.comments?.length > 0
              ? `Do also regard the comments: ${
                  ghResult?.comments
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
