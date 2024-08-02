import { renderPrompt } from "@vscode/prompt-tsx";
import { PullrequestPrompt } from "./PullrequestPrompt.js";
import type { RequestHandlerContext } from "../requestHandlerContext.js";

export async function handleGhPullrequestCommand(
  requestHandlerContext: RequestHandlerContext
) {
  const { request, stream, token, model } = requestHandlerContext;

  if (model) {
    const { messages } = await renderPrompt(
      PullrequestPrompt,
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
