import * as vscode from "vscode";

const issueNumberRegex = /!(\d+)(\+?)/; // prefix: !, issue number, optional: + for comments
const ghRepoRegex = /gh:(.+)\/(.+?)[\s;,\/:]/; // for specifying repo owner and repo name

export function parseValuesFromPrompt(
  request: vscode.ChatRequest,
  stream: vscode.ChatResponseStream
) {
  const match = request.prompt.match(issueNumberRegex);
  const [itemId, commentsUsage] = match ? [match[1], match[2]] : ["", ""];

  stream.progress(`Item #${itemId} found in prompt.`);
  const ghMatch = request.prompt.match(ghRepoRegex);
  const [ghOwner, ghRepo] = ghMatch ? [ghMatch[1], ghMatch[2]] : ["", ""];

  if (ghOwner) {
    stream.progress(`using github owner '${ghOwner}' passed in prompt`);
  }
  if (ghRepo) {
    stream.progress(`using github repo '${ghRepo}' passed in prompt`);
  }
  return { ghOwner, ghRepo, itemId, commentsUsage };
}
