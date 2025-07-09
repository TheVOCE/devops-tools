import * as vscode from "vscode";

const workItemNumberRegex = /!(\d+)(\+?)/; // prefix: !, work item number, optional: + for comments
const azdoOrgProjectRegex = /azdo:(.+)\/(.+?)[\s;,\/:]/; // for specifying org and project name

export function parseAzDevOpsValuesFromPrompt(
  request: vscode.ChatRequest,
  stream: vscode.ChatResponseStream
) {
  const workItemMatch = request.prompt.match(workItemNumberRegex);
  
  let itemId = "";
  let commentsUsage = false;
  
  if (workItemMatch) {
    itemId = workItemMatch[1];
    commentsUsage = workItemMatch[2] === "+";
    stream.progress(`Work Item !${itemId} found in prompt.`);
  } 

  const azdoMatch = request.prompt.match(azdoOrgProjectRegex);
  const [azdoOrg, azdoProject] = azdoMatch ? [azdoMatch[1], azdoMatch[2]] : ["", ""];

  if (azdoOrg) {
    stream.progress(`using Azure DevOps org '${azdoOrg}' passed in prompt`);
  }
  if (azdoProject) {
    stream.progress(`using Azure DevOps project '${azdoProject}' passed in prompt`);
  }
  return { azdoOrg, azdoProject, itemId, commentsUsage };
}

/**
 * Silent version of parseAzDevOpsValuesFromPrompt that doesn't output progress messages
 * Used for checking if parsing finds valid results without affecting the stream
 */
export function parseAzDevOpsValuesFromPromptSilent(
  request: vscode.ChatRequest
) {
  console.log("Parsing Azure DevOps values from prompt silently...");
  const workItemMatch = request.prompt.match(workItemNumberRegex);
  
  let itemId = "";
  let commentsUsage = false;
  
  if (workItemMatch) {
    itemId = workItemMatch[1];
    commentsUsage = workItemMatch[2] === "+";
  } 

  const azdoMatch = request.prompt.match(azdoOrgProjectRegex);
  const [azdoOrg, azdoProject] = azdoMatch ? [azdoMatch[1], azdoMatch[2]] : ["", ""];

  return { azdoOrg, azdoProject, itemId, commentsUsage };
}
