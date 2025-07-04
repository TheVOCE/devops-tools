import * as vscode from "vscode";

const workItemNumberRegex = /!(\d+)(\+?)/; // prefix: !, work item number, optional: + for comments
const pullRequestNumberRegex = /!(\d+)(\+?)/; // prefix: #, pull request number, optional: + for comments
const azdoOrgProjectRegex = /azdo:(.+)\/(.+?)[\s;,\/:]/; // for specifying org and project name

export function parseAzDevOpsValuesFromPrompt(
  request: vscode.ChatRequest,
  stream: vscode.ChatResponseStream
) {
  const workItemMatch = request.prompt.match(workItemNumberRegex);
  const pullRequestMatch = request.prompt.match(pullRequestNumberRegex);
  
  let itemId = "";
  let commentsUsage = "";
  let itemType = "";
  
  if (workItemMatch) {
    itemId = workItemMatch[1];
    commentsUsage = workItemMatch[2];
    itemType = "workitem";
    stream.progress(`Work Item !${itemId} found in prompt.`);
  } else if (pullRequestMatch) {
    itemId = pullRequestMatch[1];
    commentsUsage = pullRequestMatch[2];
    itemType = "pullrequest";
    stream.progress(`Pull Request !${itemId} found in prompt.`);
  }

  const azdoMatch = request.prompt.match(azdoOrgProjectRegex);
  const [azdoOrg, azdoProject] = azdoMatch ? [azdoMatch[1], azdoMatch[2]] : ["", ""];

  if (azdoOrg) {
    stream.progress(`using Azure DevOps org '${azdoOrg}' passed in prompt`);
  }
  if (azdoProject) {
    stream.progress(`using Azure DevOps project '${azdoProject}' passed in prompt`);
  }
  return { azdoOrg, azdoProject, itemId, commentsUsage, itemType };
}
