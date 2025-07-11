import * as vscode from "vscode";
import {
  AssistantMessage,
  PromptElement,
  PromptSizing,
  UserMessage,
} from "@vscode/prompt-tsx";
import { ASSISTANT_MESSAGE, OPEN_URL_COMMAND } from "../../consts";
import {
  getGhPullrequestById,
  searchGhPullrequestsByTitle,
  StateFullGhPrInStream,
  StateMultipleGhPrsInStream,
} from "./gitHubPullrequestFunctions";
import { parseGitHubValuesFromPrompt } from "../gitHubUtils";
import type { GitHubResult } from "../GitHubResult";
import { GitHubPullrequestPromptState } from "./GitHubPullrequestPromptState";
import { GitHubPullrequestPromptProps } from "./GitHubPullrequestPromptProps";

export class GitHubPullrequestPrompt extends PromptElement<
  GitHubPullrequestPromptProps,
  GitHubPullrequestPromptState
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
      const { ghOwner, ghRepo, commentsUsage } = parseGitHubValuesFromPrompt(request, stream);
      
      stream.progress(`Searching for pull requests with title containing "${searchQuery}"...`);
      
      const ghResults = (await searchGhPullrequestsByTitle(
        requestHandlerContext,
        searchQuery,
        ghOwner,
        ghRepo,
        commentsUsage
      )) as GitHubResult[];

      stream.progress(`Found ${ghResults.length} pull request${ghResults.length !== 1 ? 's' : ''}.`);

      const config = vscode.workspace.getConfiguration("voce");
      const echoFullGHPullRequest = config.get("echoFullGHPullRequest", false) as boolean;
      
      if (echoFullGHPullRequest) {
        StateMultipleGhPrsInStream(
          stream, 
          ghResults.map(result => result.data), 
          searchQuery
        );
      } else {
        stream.markdown(`🔍 Found ${ghResults.length} pull request${ghResults.length !== 1 ? 's' : ''} with title containing "${searchQuery}":\n\n`);
        ghResults.forEach((result, index) => {
          stream.markdown(`${index + 1}. 🔵**PR #${result.data.number}** [_${result.data.state}_]: **${result.data.title}**\n`);
        });
        stream.markdown("\n");
      }

      ghResults.forEach((result) => {
        stream.button({
          command: OPEN_URL_COMMAND,
          title: vscode.l10n.t(`Open PR #${result.data.number} in Browser`),
          arguments: [result.data.html_url],
        });
      });
      
      stream.markdown(`---\n\n`);
      return { ghResults, searchType: 'title' as const, searchQuery };
    } else {
      // Original ID-based search logic
      const { ghOwner, ghRepo, itemId, commentsUsage } = parseGitHubValuesFromPrompt(request, stream);

      const ghResult = (await getGhPullrequestById(
        requestHandlerContext,
        Number(itemId),
        ghOwner,
        ghRepo,
        commentsUsage
      )) as GitHubResult;

      stream.progress(`PR "${ghResult?.data?.title}" loaded.`);

      const config = vscode.workspace.getConfiguration("voce");
      const echoFullGHPullRequest = config.get("echoFullGHPullRequest", false) as boolean;
      const echoGHPullRequestComments = config.get("echoGHPullRequestComments", false) as boolean;
      if (echoFullGHPullRequest) {
        if (echoGHPullRequestComments)
        {
          const commentsString = ghResult?.comments
            ? ghResult.comments.map((comment: any) => `○ ${comment.body}`).join("\n\n")
            : "";

          StateFullGhPrInStream(stream, ghResult?.data!, commentsString);
        }
        else
        {
          StateFullGhPrInStream(stream, ghResult?.data!);
        }
      } 
      else {
        stream.markdown(
          `🔵PR [_${ghResult.data?.state}_]: **${ghResult.data?.title}**\n\n`
        );
      }

      stream.button({
        command: OPEN_URL_COMMAND,
        title: vscode.l10n.t("Open PR in Browser"),
        arguments: [ghResult?.data?.html_url],
      });
      stream.markdown(`---\n\n`);
      return { ghResult, searchType: 'id' as const };
    }
  }

  render(state: GitHubPullrequestPromptState, sizing: PromptSizing) {
    const { userPrompt } = this.props;
    
    if (state.searchType === 'title' && state.ghResults) {
      // Handle multiple PR results from title search
      const prTitles = state.ghResults.map(result => result.data.title).join(", ");
      const prDescriptions = state.ghResults.map(result => result.data.body || "No description").join("\n\n");
      
      return (
        <>
          <AssistantMessage priority={300}>{ASSISTANT_MESSAGE}</AssistantMessage>
          <UserMessage priority={200}>
            {`The GitHub pull requests found with title containing "${state.searchQuery}" are: ${prTitles}. The descriptions are: ${prDescriptions}. Use that information to give better answer for the following user query.`}
          </UserMessage>
          <UserMessage priority={100}>{userPrompt}</UserMessage>
        </>
      );
    } else if (state.ghResult) {
      // Handle single PR result from ID search
      const { ghResult } = state;
      return (
        <>
          <AssistantMessage priority={300}>{ASSISTANT_MESSAGE}</AssistantMessage>
          <UserMessage priority={200}>
            {`The GitHub pullrequest to work on has the title: "${ghResult?.data?.title}" and the description: ${ghResult?.data?.body}. Use that information to give better answer for the following user query.` +
              (ghResult?.comments && ghResult?.comments?.length > 0
                ? `Do also consider the comments: ${ghResult?.comments
                    ?.map((comment) => comment.body)
                    .join("\n\n") + ""
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
