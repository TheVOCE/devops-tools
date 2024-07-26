import * as vscode from "vscode";
export interface RequestHandlerContext {
  vscodeContext: vscode.ExtensionContext;
  request: vscode.ChatRequest;
  context: vscode.ChatContext;
  stream: vscode.ChatResponseStream;
  token: vscode.CancellationToken;
  model: vscode.LanguageModelChat;
}
