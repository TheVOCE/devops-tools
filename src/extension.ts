import * as vscode from "vscode";
import { handleGhIssueCommand } from "./issues/issueCommand.js";
import { addCommand } from "./addCommand.js";
import type { RequestHandlerContext } from "./requestHandlerContext.js";

const PARTICIPANT_ID = "voce.devops";
const OPEN_URL_COMMAND = "Open_URL";

const MODEL_SELECTOR: vscode.LanguageModelChatSelector = {
  vendor: "copilot",
  family: "gpt-4",
};
//family: "gpt-3.5-turbo",
//family: "gpt-4",

interface ICatChatResult extends vscode.ChatResult {
  metadata: {
    command: string;
  };
}

export function activate(vscontext: vscode.ExtensionContext) {
  // Define a Cat chat handler.
  const handler: vscode.ChatRequestHandler = async (
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<ICatChatResult> => {
    const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);
    const requestHandlerContext: RequestHandlerContext = {
      vscodeContext: vscontext,
      request,
      context,
      stream,
      token,
      model,
    };
    // To talk to an LLM in your subcommand handler implementation, your
    // extension can use VS Code's `requestChatAccess` API to access the Copilot API.
    // The GitHub Copilot Chat extension implements this provider.
    await addCommand(
      "issue",
      async (requestHandlerContext) => {
        const ghResult = await handleGhIssueCommand(requestHandlerContext);
        stream.button({
          command: OPEN_URL_COMMAND,
          title: vscode.l10n.t("Open Issue in Browser"),
          arguments: [ghResult?.issue?.html_url],
        });
      },
      requestHandlerContext
    );
    //else if (request.command == "pullrequest") {

    return { metadata: { command: "" } };
  };

  // Chat participants appear as top-level options in the chat input
  // when you type `@`, and can contribute sub-commands in the chat input
  // that appear when you type `/`.
  const chat = vscode.chat.createChatParticipant(PARTICIPANT_ID, handler);
  chat.iconPath = vscode.Uri.joinPath(vscontext.extensionUri, "logo.jpeg");
  vscode.commands.registerCommand(OPEN_URL_COMMAND, async (url: string) => {
    vscode.env.openExternal(vscode.Uri.parse(url));
  });
}

export function deactivate() {}
