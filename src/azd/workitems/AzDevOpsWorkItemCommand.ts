import { renderPrompt } from "@vscode/prompt-tsx";
import { AzDevOpsWorkItemsPrompt } from "./AzDevOpsWorkItemsPrompt.js";
import type { RequestHandlerContext } from "../../requestHandlerContext.js";

export async function handleAzDoWorkItemCommand(
  requestHandlerContext: RequestHandlerContext
) {
  const { request, stream, token, model } = requestHandlerContext;

  if (model) {
    const { messages: rawMessages } = await renderPrompt(
      AzDevOpsWorkItemsPrompt,
      {
        userPrompt: request.prompt,
        requestHandlerContext,
      },
      { modelMaxPromptTokens: model.maxInputTokens },
      model
    );

    // Pass rawMessages directly as they should already be in the correct format
    const chatResponse = await model.sendRequest(rawMessages, {}, token);
    stream.progress(`My suggestion....`);
    for await (const fragment of chatResponse.text) {
      stream.markdown(fragment);
    }
  }
}
