import * as vscode from "vscode";
import { handleGhIssueCommand } from "./github/issues/GitHubIssueCommand.js";
import { handleAzDoWorkItemCommand } from "./azd/workitems/AzDevOpsWorkItemCommand.js";
import { handleAzDoPullrequestCommand } from "./azd/pullrequests/AzDevOpsPullrequestCommand.js";
import type { RequestHandlerContext } from "./requestHandlerContext.js";
import { OPEN_URL_COMMAND } from "./consts.js";
import { handleGhPullrequestCommand } from "./github/pullrequests/gitHubPullrequestCommand.js";

const PARTICIPANT_ID = "voce.devops";

// const MODEL_SELECTOR: vscode.LanguageModelChatSelector = {
//   vendor: "copilot",
//   family: "gpt-4o",
// };

interface IVoceChatResult extends vscode.ChatResult {
  metadata: {
    command: string;
  };
}

export function activate(vscontext: vscode.ExtensionContext) {
  const handler: vscode.ChatRequestHandler = async (
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<IVoceChatResult> => {
    // Ensure a model is selected (prefer gpt-4o, fallback if needed)
    let model;
    try {
      [model] = await vscode.lm.selectChatModels({
        vendor: "copilot",
        family: "gpt-4.1",
      });
    } catch (err) {
      // Fallback or handle error if gpt-4o is not available
      [model] = await vscode.lm.selectChatModels({ vendor: "copilot" });
      if (!model) {
        stream.markdown("Error: Could not select a language model.");
        return { metadata: { command: "error" } };
      }
    }

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

    if (request.command === "gh-issue") {
      await handleGhIssueCommand(requestHandlerContext);
    } else if (request.command === "gh-pullrequest") {
      await handleGhPullrequestCommand(requestHandlerContext);
    }
    else if (request.command === "azd-workitem") {
      await handleAzDoWorkItemCommand(requestHandlerContext);
    }
    else if (request.command === "azd-pullrequest") {
      await handleAzDoPullrequestCommand(requestHandlerContext);
    }
    else {
      // Default handler or response for when no specific command is matched
      // For example, use the LLM to generate a response based on the prompt
      try {
        const messages = [vscode.LanguageModelChatMessage.User(request.prompt)];
        const chatResponse = await model.sendRequest(messages, {}, token);
        for await (const fragment of chatResponse.text) {
          stream.markdown(fragment);
        }
      } catch (err) {
        // Handle errors from the language model
        if (err instanceof vscode.LanguageModelError) {
          console.log(err.message, err.code, err.cause);
          stream.markdown(
            "Sorry, I encountered an issue processing your request."
          );
        } else {
          throw err;
        }
      }
    }

    return { metadata: { command: request.command || "" } };
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

export function deactivate() { }
