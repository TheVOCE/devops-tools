import * as vscode from "vscode";
import {
  AssistantMessage,
  BasePromptElementProps,
  PromptElement,
  PromptSizing,
  UserMessage,
} from "@vscode/prompt-tsx";
import type { RequestHandlerContext } from "../requestHandlerContext";
import { ASSISTANT_MESSAGE, OPEN_URL_COMMAND } from "../consts";
import {
  getPullrequestById,
  StateFullPrInStream,
} from "./pullrequestFunctions";
import { parseValuesFromPrompt } from "../utils";
import type { GitHubResult } from "../gitHub";

export interface PullrequestPromptProps extends BasePromptElementProps {
  requestHandlerContext: RequestHandlerContext;
  userPrompt: string;
}

export interface PullrequestPromptState {
  ghResult: GitHubResult;
}

export class PullrequestPrompt extends PromptElement<
  PullrequestPromptProps,
  PullrequestPromptState
> {
  override async prepare() {
    const { requestHandlerContext } = this.props;
    const { request, stream } = requestHandlerContext;
    const { ghOwner, ghRepo, itemId } = parseValuesFromPrompt(request, stream);

    const ghResult = (await getPullrequestById(
      requestHandlerContext,
      Number(itemId),
      ghOwner,
      ghRepo
    )) as GitHubResult;

    stream.progress(`PR "${ghResult?.data?.title}" loaded.`);

    // Access vscode settings
    const config = vscode.workspace.getConfiguration("voce");
    const echoFullIssue = config.get("echoFullIssue", false) as boolean;
    const echoIssueComments = config.get("echoIssueComments", false) as boolean;
    if (echoFullIssue) {
      StateFullPrInStream(stream, ghResult?.data!);
    } else {
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

  render(state: PullrequestPromptState, sizing: PromptSizing) {
    const { userPrompt } = this.props;
    const { ghResult } = state;
    return (
      <>
        <AssistantMessage priority={300}>{ASSISTANT_MESSAGE}</AssistantMessage>
        <UserMessage priority={200}>
          {`The pullrequest to work on has the title: "${ghResult?.data?.title}" and the description: ${ghResult?.data?.body}. Use that information to give better answer for the following user query.` +
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
