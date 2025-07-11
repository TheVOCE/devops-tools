import * as vscode from "vscode";

/**
 * Shared output channel for the VOCE DevOps extension
 */
let outputChannel: vscode.OutputChannel | null = null;

/**
 * Initialize the output channel for the extension
 */
export function initializeOutputChannel(): void {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel("VOCE DevOps");
  }
}

/**
 * Log an informational message to the output channel
 */
export function logInfo(message: string): void {
  if (outputChannel) {
    outputChannel.appendLine(`[INFO] ${message}`);
  }
}

/**
 * Log an error message to the output channel
 */
export function logError(message: string): void {
  if (outputChannel) {
    outputChannel.appendLine(`[ERROR] ${message}`);
  }
}

/**
 * Log a debug message to the output channel
 */
export function logDebug(message: string): void {
  if (outputChannel) {
    outputChannel.appendLine(`[DEBUG] ${message}`);
  }
}

/**
 * Show the output channel to the user
 */
export function showOutputChannel(): void {
  if (outputChannel) {
    outputChannel.show();
  }
}

/**
 * Dispose of the output channel
 */
export function disposeOutputChannel(): void {
  if (outputChannel) {
    outputChannel.dispose();
    outputChannel = null;
  }
}