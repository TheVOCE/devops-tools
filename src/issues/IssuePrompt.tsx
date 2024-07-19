import {
  AssistantMessage,
  BasePromptElementProps,
  PromptElement,
  PromptSizing,
  UserMessage,
} from "@vscode/prompt-tsx";
import * as vscode from "vscode";
import type { Comment } from "./comment";

export interface GitHubResult {
  comments: Comment[];
  issue?: { title: string; body: string; html_url: string };
}

export interface IssuesPromptProps extends BasePromptElementProps {
  ghResult: GitHubResult;
  userPrompt: string;
}

export interface IssuesPromptState {
  creationScript: string;
}

export class IssuesPrompt extends PromptElement<
  IssuesPromptProps,
  IssuesPromptState
> {
  // override async prepare() {
  //   const sqlExtensionApi = await vscode.extensions
  //     .getExtension("ms-mssql.mssql")
  //     ?.activate();
  //   return {
  //     creationScript: await sqlExtensionApi.getDatabaseCreateScript?.(),
  //   };
  // }

  render(state: IssuesPromptState, sizing: PromptSizing) {
    const { ghResult, userPrompt } = this.props;
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
