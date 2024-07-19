import {
  BasePromptElementProps,
  PromptElement,
  PromptSizing,
  UserMessage,
} from "@vscode/prompt-tsx";
import type { Comment } from "vscode";

export interface IssuesPromptProps extends BasePromptElementProps {
  ghResult: {
    comments: Comment[];
    issue: { title: string; body: string; html_url: string } | null;
  } | null;
  userPrompt: string;
}

export function IssuesPrompt(props: IssuesPromptProps) {
  const { ghResult, userPrompt } = props;
  return (
    <>
      <UserMessage>
        You are a software product owner and you help your developers providing
        additional information for working on current software development task.
      </UserMessage>
      <UserMessage>
        {`The issue to work on has the title: "${ghResult?.issue?.title}" and the description: ${ghResult?.issue?.body}. Use that information to give better answer for the following user query.` +
          (ghResult?.comments && ghResult?.comments?.length > 0
            ? `Do also regard the comments: ${
                ghResult?.comments
                  ?.map((comment) => comment.body)
                  .join("\n\n") + ""
              }`
            : "")}
      </UserMessage>
      <UserMessage>{userPrompt}</UserMessage>
    </>
  );
}
