import * as vscode from "vscode";
import {
  AssistantMessage,
  BasePromptElementProps,
  PromptElement,
  PromptSizing,
  UserMessage,
} from "@vscode/prompt-tsx";
import type { Comment } from "./comment";
import type { RequestHandlerContext } from "../requestHandlerContext";
import {
  getIssueAndCommentsById,
  StateFullIssueInStream,
} from "./issueFunctions";
import { OPEN_URL_COMMAND } from "../consts";

const issueNumberRegex = /!(\d+)(\+?)/; // prefix: !, issue number, optional: + for comments
const ghRepoRegex = /gh:(.+)\/(.+?)[\s;,\/:]/; // for specifying repo owner and repo name

export interface GitHubResult {
  comments: Comment[];
  issue?: {
    title: string;
    body: string;
    html_url: string;
    state: string;
    reason: string;
  };
}

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
    const match = request.prompt.match(issueNumberRegex);
    const [issueId, commentsUsage] = match ? [match[1], match[2]] : ["", ""];

    stream.progress(`Issue #${issueId} found in prompt.`);
    const ghMatch = request.prompt.match(ghRepoRegex);
    const [ghOwner, ghRepo] = ghMatch ? [ghMatch[1], ghMatch[2]] : ["", ""];

    if (ghOwner) {
      stream.progress(`using github owner '${ghOwner}' passed in prompt`);
    }
    if (ghRepo) {
      stream.progress(`using github repo '${ghRepo}' passed in prompt`);
    }

    const ghResult = (await getIssueAndCommentsById(
      requestHandlerContext,
      Number(issueId),
      ghOwner,
      ghRepo,
      commentsUsage === "+"
    )) as GitHubResult;

    stream.progress(`Issue "${ghResult?.issue?.title}" loaded.`);

    // Access vscode settings
    const config = vscode.workspace.getConfiguration("voce");
    const echoFullIssue = config.get("echoFullIssue", false) as boolean;
    const echoIssueComments = config.get("echoIssueComments", false) as boolean;
    if (echoFullIssue) {
      StateFullIssueInStream(
        stream,
        ghResult?.issue,
        echoIssueComments ? ghResult?.comments ?? [] : []
      );
    } else {
      stream.markdown(
        `🟣Issue [_${ghResult.issue?.state}_]: **${ghResult.issue?.title}**\n\n`
      );
    }

    stream.button({
      command: OPEN_URL_COMMAND,
      title: vscode.l10n.t("Open Issue in Browser"),
      arguments: [ghResult?.issue?.html_url],
    });
    stream.markdown(`---\n\n`);
    return { ghResult };
  }

  render(state: IssuesPromptState, sizing: PromptSizing) {
    const { userPrompt } = this.props;
    const { ghResult } = state;
    return (
      <>
        <AssistantMessage priority={300}>
          You are a software product owner and you help your developers
          providing additional information for working on current software
          development task.
        </AssistantMessage>
        <UserMessage priority={200}>
          {`The issue to work on has the title: "${ghResult?.issue?.title}" and the description: ${ghResult?.issue?.body}. Use that information to give better answer for the following user query.` +
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
