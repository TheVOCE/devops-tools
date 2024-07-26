import { renderPrompt } from "@vscode/prompt-tsx";
import { IssuesPrompt } from "./IssuePrompt.js";
import type { RequestHandlerContext } from "../requestHandlerContext.js";

export async function handleGhIssueCommand(
  requestHandlerContext: RequestHandlerContext
) {
  const { request, stream, token, model } = requestHandlerContext;

  if (model) {
    const { messages } = await renderPrompt(
      IssuesPrompt,
      {
        userPrompt: request.prompt,
        requestHandlerContext,
      },
      { modelMaxPromptTokens: model.maxInputTokens },
      model
    );

    const chatResponse = await model.sendRequest(messages, {}, token);
    stream.progress(`My suggestion....`);
    for await (const fragment of chatResponse.text) {
      stream.markdown(fragment);
    }
  }
}
