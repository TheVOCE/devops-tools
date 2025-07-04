import * as vscode from "vscode";
import {
  AssistantMessage,
  PromptElement,
  PromptSizing,
  UserMessage,
} from "@vscode/prompt-tsx";
import { ASSISTANT_MESSAGE, OPEN_URL_COMMAND } from "../../consts";
import {
  getPullrequestById,
  StateFullPrInStream,
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
    const { azdoOrg, azdoProject, itemId, commentsUsage } = parseAzDevOpsValuesFromPrompt(request, stream);

    const azdoResult = (await getPullrequestById(
      requestHandlerContext,
      Number(itemId),
      azdoOrg,
      azdoProject,
      commentsUsage === "+"
    )) as AzDevOpsResult;

    stream.progress(`PR "${azdoResult?.data?.fields["System.Title"]}" loaded.`);

    // Access vscode settings
    const config = vscode.workspace.getConfiguration("voce");
    const echoFullPullRequest = config.get("echoFullWorkItem", false) as boolean;
    const echoPullRequestComments = config.get("echoWorkItemComments", false) as boolean;
    this.setState({ echoPullRequestComments });
    
    if (echoFullPullRequest) {
      StateFullPrInStream(stream, {
        title: azdoResult?.data?.fields["System.Title"] || "",
        description: azdoResult?.data?.fields["System.Description"] || ""
      });
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
    return { azdoResult };
  }

  render(state: AzDevOpsPullrequestPromptState, sizing: PromptSizing) {
    const { userPrompt } = this.props;
    const { azdoResult } = state;
    return (
      <>
        <AssistantMessage priority={300}>{ASSISTANT_MESSAGE}</AssistantMessage>
        <UserMessage priority={200}>
          {`The pull request to work on has the title: "${azdoResult?.data?.fields["System.Title"]}" and the description: ${azdoResult?.data?.fields["System.Description"]}. Use that information to give better answer for the following user query.` +
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
