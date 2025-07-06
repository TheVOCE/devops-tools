import * as vscode from "vscode";
import {
  AssistantMessage,
  PromptElement,
  PromptSizing,
  UserMessage,
} from "@vscode/prompt-tsx";
import { ASSISTANT_MESSAGE, OPEN_URL_COMMAND } from "../../consts";
import {
  getGhPullrequestById as getGhPullrequestById,
  StateFullPrInStream,
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
    const echoGHPullRequestComments = config.get("echoGhPullRequestComments", false) as boolean;
    if (echoFullGHPullRequest) {
      if (echoGHPullRequestComments)
      {
        const commentsString = ghResult?.comments
          ? ghResult.comments.map((comment: any) => comment.body).join("\n\n")
          : "";

        StateFullPrInStream(stream, ghResult?.data!, commentsString);
      }
      else
      {
        StateFullPrInStream(stream, ghResult?.data!, null);
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
    return { ghResult };
  }

  render(state: GitHubPullrequestPromptState, sizing: PromptSizing) {
    const { userPrompt } = this.props;
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
  }
}
