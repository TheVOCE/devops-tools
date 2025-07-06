import * as vscode from "vscode";
import { handleGhIssueCommand } from "./github/issues/GitHubIssueCommand.js";
import { handleAzDoWorkItemCommand } from "./azd/workitems/AzDevOpsWorkItemCommand.js";
import { handleAzDoPullrequestCommand } from "./azd/pullrequests/AzDevOpsPullrequestCommand.js";
import type { RequestHandlerContext } from "./requestHandlerContext.js";
import { OPEN_URL_COMMAND } from "./consts.js";
import { handleGhPullrequestCommand } from "./github/pullrequests/gitHubPullrequestCommand.js";
import { parseLLMBasedCommand, hasValidParseResults } from "./llmBasedParser.js";
import { parseAzDevOpsValuesFromPromptSilent } from "./azd/azDevOpsUtils.js";
import { parseGitHubValuesFromPromptSilent } from "./github/gitHubUtils.js";

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

/**
 * Create a formatted prompt that includes the parsed information in the expected format
 * so that existing regex parsers can extract the information
 */
function createFormattedPrompt(originalPrompt: string, parseResult: any): string {
  let formattedPrompt = originalPrompt;
  
  // Add the item ID in the expected format if not already present
  if (parseResult.itemId && !originalPrompt.includes(`!${parseResult.itemId}`)) {
    formattedPrompt += ` !${parseResult.itemId}`;
  }
  
  // Add comments marker if requested
  if (parseResult.commentsUsage && !originalPrompt.includes('+')) {
    formattedPrompt = formattedPrompt.replace(`!${parseResult.itemId}`, `!${parseResult.itemId}+`);
  }
  
  // Add Azure DevOps context if provided
  if (parseResult.azdoOrg && parseResult.azdoProject) {
    if (!originalPrompt.includes(`azdo:${parseResult.azdoOrg}/${parseResult.azdoProject}`)) {
      formattedPrompt += ` azdo:${parseResult.azdoOrg}/${parseResult.azdoProject}`;
    }
  }
  
  // Add GitHub context if provided
  if (parseResult.ghOwner && parseResult.ghRepo) {
    if (!originalPrompt.includes(`gh:${parseResult.ghOwner}/${parseResult.ghRepo}`)) {
      formattedPrompt += ` gh:${parseResult.ghOwner}/${parseResult.ghRepo}`;
    }
  }
  
  return formattedPrompt;
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
      try {
        await handleAzDoPullrequestCommand(requestHandlerContext);
      } catch (err) {
        console.error("Error handling azd-pullrequest command:", err);
        stream.markdown(
          "Sorry, an error occurred while processing the Azure DevOps pull request command."
        );
      }
    }
    else {
      // Try to use LLM to parse the user's intent when no command is provided
      // or when a command is provided but parsing fails
      let shouldUseLLMFallback = false;
      let commandToUse = request.command;

      if (!request.command) {
        // No command provided - use LLM to determine intent
        shouldUseLLMFallback = true;
      } else {
        // Command provided but check if regex parsing finds valid results
        const azDevOpsParseResult = parseAzDevOpsValuesFromPromptSilent(request);
        const gitHubParseResult = parseGitHubValuesFromPromptSilent(request);
        
        if (!hasValidParseResults(azDevOpsParseResult) && !hasValidParseResults(gitHubParseResult)) {
          // Regex parsing failed to find required information - use LLM fallback
          shouldUseLLMFallback = true;
        }
      }

      if (shouldUseLLMFallback) {
        const llmParseResult = await parseLLMBasedCommand(request.prompt, model, token, stream);
        
        if (llmParseResult) {
          // Create a modified request with the parsed command and update the prompt if needed
          const modifiedRequest: vscode.ChatRequest = {
            ...request,
            command: llmParseResult.command,
            // Inject the parsed information into the prompt in the expected format
            prompt: createFormattedPrompt(request.prompt, llmParseResult)
          };

          const modifiedContext: RequestHandlerContext = {
            ...requestHandlerContext,
            request: modifiedRequest
          };

          // Route to the appropriate handler based on LLM parsing
          switch (llmParseResult.command) {
            case "gh-issue":
              await handleGhIssueCommand(modifiedContext);
              break;
            case "gh-pullrequest":
              await handleGhPullrequestCommand(modifiedContext);
              break;
            case "azd-workitem":
              await handleAzDoWorkItemCommand(modifiedContext);
              break;
            case "azd-pullrequest":
              try {
                await handleAzDoPullrequestCommand(modifiedContext);
              } catch (err) {
                console.error("Error handling azd-pullrequest command:", err);
                stream.markdown(
                  "Sorry, an error occurred while processing the Azure DevOps pull request command."
                );
              }
              break;
            default:
              stream.markdown("Sorry, I couldn't determine what type of DevOps operation you're looking for.");
          }
          
          commandToUse = llmParseResult.command;
        } else {
          // LLM parsing failed - fall back to default behavior
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
      } else {
        // Regular fallback to default LLM response when parsing succeeds but no specific command
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
