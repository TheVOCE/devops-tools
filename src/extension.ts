import * as vscode from "vscode";
import { handleIssueCommand } from "./issues/issueCommand.js";

const PARTICIPANT_ID = "xebia.copilot.issue-data-provider";
const OPEN_URL_COMMAND = "Open_URL";

interface ICatChatResult extends vscode.ChatResult {
  metadata: {
    command: string;
  };
}

const MODEL_SELECTOR: vscode.LanguageModelChatSelector = {
  vendor: "copilot",
  family: "gpt-4",
};
//family: "gpt-3.5-turbo",
//family: "gpt-4",

export function activate(context: vscode.ExtensionContext) {
  // Define a Cat chat handler.
  const handler: vscode.ChatRequestHandler = async (
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<ICatChatResult> => {
    // To talk to an LLM in your subcommand handler implementation, your
    // extension can use VS Code's `requestChatAccess` API to access the Copilot API.
    // The GitHub Copilot Chat extension implements this provider.
    if (request.command == "issue") {
      try {
        const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);
        //parse user prompt for specials
        const ghResult = await handleIssueCommand(
          request,
          stream,
          model,
          token
        );
        stream.button({
          command: OPEN_URL_COMMAND,
          title: vscode.l10n.t("Open Issue in Browser"),
          arguments: [ghResult?.issue?.html_url],
        });
      } catch (err) {
        handleError(err, stream);
      }

      return { metadata: { command: "issue" } };
    }
    //else if (request.command == "pullrequest") {

    return { metadata: { command: "" } };
  };

  // Chat participants appear as top-level options in the chat input
  // when you type `@`, and can contribute sub-commands in the chat input
  // that appear when you type `/`.
  const chat = vscode.chat.createChatParticipant(PARTICIPANT_ID, handler);
  chat.iconPath = vscode.Uri.joinPath(context.extensionUri, "XebiaLogo.jpeg");
  vscode.commands.registerCommand(OPEN_URL_COMMAND, async (url: string) => {
    vscode.env.openExternal(vscode.Uri.parse(url));
  });
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

export function deactivate() {}
