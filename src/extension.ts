import * as vscode from "vscode";
import { handleGhIssueCommand } from "./issues/issueCommand.js";
import { addCommand } from "./addCommand.js";
import type { RequestHandlerContext } from "./requestHandlerContext.js";
import { OPEN_URL_COMMAND } from "./consts.js";
import { handleGhPullrequestCommand } from "./pullrequests/pullrequestCommand.js";
// import {
//   ChatVariableLevel,
//   type ChatVariableValue,
//   type ProviderResult,
// } from "vscode";

const PARTICIPANT_ID = "voce.devops";

const MODEL_SELECTOR: vscode.LanguageModelChatSelector = {
  vendor: "copilot",
  family: "gpt-4o",
};
//family: "gpt-3.5-turbo",
//family: "gpt-4",
//family: "gpt-4o",

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
      },
      requestHandlerContext
    );
     await addCommand(
      "pullrequest",
      async (requestHandlerContext) => {
        const ghResult = await handleGhPullrequestCommand(requestHandlerContext);
      },
      requestHandlerContext
    );

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

  // this does not yet work as expected, see: https://github.com/microsoft/vscode/issues/206299  , so we remove it for now
  // type from "https://github.com/microsoft/vscode/blob/main/src/vscode-dts/vscode.proposed.chatVariableResolver.d.ts" in vscode.proposed.chatVariableResolver.d.ts
  // vscode.chat.registerChatVariableResolver(
  //   "issues",
  //   "ghissue",
  //   "GihHub issue",
  //   "GitHub issue selection",
  //   false,
  //   {
  //     resolve: async (
  //       name: string,
  //       context: vscode.ChatVariableContext,
  //       token: vscode.CancellationToken
  //     ): Promise<vscode.ChatVariableValue[]> => {
  //       // here we may show a  UI where the user can pick an issue
  //       return [{ level: ChatVariableLevel.Medium, value: "ghissue#1" }];
  //     },
  //   }
  // );
}

export function deactivate() {}
