import * as vscode from "vscode";
import {
  AssistantMessage,
  BasePromptElementProps,
  PromptElement,
  PromptSizing,
  UserMessage,
} from "@vscode/prompt-tsx";
import type { RequestHandlerContext } from "../../requestHandlerContext";
import {
  getIssueAndCommentsById,
  StateFullIssueInStream,
} from "./issueFunctions";
import { ASSISTANT_MESSAGE, OPEN_URL_COMMAND } from "../../consts";
import type { GitHubResult } from "../gitHub";
import { parseValuesFromPrompt } from "../../utils";

export interface IssuesPromptProps extends BasePromptElementProps {
  requestHandlerContext: RequestHandlerContext;
  userPrompt: string;
}

export interface IssuesPromptState {
  ghResult: GitHubResult;
}

export class IssuesPrompt extends PromptElement<
  IssuesPromptProps,
  IssuesPromptState
> {
  override async prepare() {
    const { requestHandlerContext } = this.props;
    const { request, stream } = requestHandlerContext;
    const { ghOwner, ghRepo, itemId, commentsUsage } = parseValuesFromPrompt(
      request,
      stream
    );

    const ghResult = (await getIssueAndCommentsById(
      requestHandlerContext,
      Number(itemId),
      ghOwner,
      ghRepo,
      commentsUsage === "+"
    )) as GitHubResult;

    stream.progress(`🟣Issue "${ghResult?.data?.title}" loaded.`);

    // Access vscode settings
    const config = vscode.workspace.getConfiguration("voce");
    const echoFullIssue = config.get("echoFullIssue", false) as boolean;
    const echoIssueComments = config.get("echoIssueComments", false) as boolean;
    if (echoFullIssue) {
      StateFullIssueInStream(
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

  render(state: IssuesPromptState, sizing: PromptSizing) {
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
