import { renderPrompt } from "@vscode/prompt-tsx";
import { AzDevOpsPullrequestPrompt } from "./AzDevOpsPullrequestPrompt";
import type { AzDevOpsPullrequestPromptProps } from "./AzDevOpsPullrequestPromptProps.js";
import type { RequestHandlerContext } from "../../requestHandlerContext.js";

export async function handleAzDoPullrequestCommand(
  requestHandlerContext: RequestHandlerContext
) {
  const { request, stream, token, model } = requestHandlerContext;

  if (model) {
    const { messages } = await renderPrompt(
      AzDevOpsPullrequestPrompt,
      {
        userPrompt: request.prompt,
        requestHandlerContext,
      } as AzDevOpsPullrequestPromptProps,
      { modelMaxPromptTokens: model.maxInputTokens },
      model
    );

    // Pass messages directly as they should already be in the correct format
    const chatResponse = await model.sendRequest(messages, {}, token);
    stream.progress(`My suggestion....`);
    for await (const fragment of chatResponse.text) {
      stream.markdown(fragment);
    }
  }
}
