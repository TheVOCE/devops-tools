import { renderPrompt } from "@vscode/prompt-tsx";
import { GitHubIssuesPrompt } from "./GitHubIssuesPrompt.js";
import type { RequestHandlerContext } from "../../requestHandlerContext.js";

export async function handleGhIssueCommand(
  requestHandlerContext: RequestHandlerContext
) {
  const { request, stream, token, model } = requestHandlerContext;

  if (model) {
    const { messages: rawMessages } = await renderPrompt(
      GitHubIssuesPrompt,
      {
        userPrompt: request.prompt,
        requestHandlerContext,
      },
      { modelMaxPromptTokens: model.maxInputTokens },
      model
    );

    // const messages = rawMessages.map(msg => ({
    //   ...msg,
    //   content: [{ value: msg.content } as LanguageModelTextPart]
    // }));
    // Pass rawMessages directly as they should already be in the correct format
    const chatResponse = await model.sendRequest(rawMessages, {}, token);
    stream.progress(`My suggestion....`);
    for await (const fragment of chatResponse.text) {
      stream.markdown(fragment);
    }
  }
}
