import * as vscode from "vscode";
import type { RequestHandlerContext } from "./requestHandlerContext";

export type CommandHandlerFunc<T> = (
  requestHandlerContext: RequestHandlerContext
) => Promise<T>;

export async function addCommand<T>(
  commandstr: string,
  commandHandlerFunc: CommandHandlerFunc<T>,
  requestHandlerContext: RequestHandlerContext
) {
  const { request, stream } = requestHandlerContext;
  if (request.command === commandstr) {
    try {
      await commandHandlerFunc(requestHandlerContext);
    } catch (err) {
      handleError(err, stream);
    }

    return { metadata: { command: commandstr } };
  }
}

function handleError(err: any, stream: vscode.ChatResponseStream): void {
  // making the chat request might fail because
  // - model does not exist
  // - user consent not given
  // - quote limits exceeded
  if (err instanceof vscode.LanguageModelError) {
    console.log(err.message, err.code, err.cause);
    if (err.cause instanceof Error && err.cause.message.includes("off_topic")) {
      stream.markdown(
        vscode.l10n.t(
          "I'm sorry, I can't help with that. Please ask me something else."
        )
      );
    }
  } else {
    // re-throw other errors so they show up in the UI
    throw err;
  }
}
