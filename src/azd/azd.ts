import * as vscode from "vscode";
import * as path from "path";
import simpleGit from "simple-git";
import escapeStringRegexp from "escape-string-regexp";
import type { RequestHandlerContext } from "../requestHandlerContext";
import { logInfo, logError } from "../logging.js";

/**
 * Get the configured Azure DevOps hostname (custom or default)
 */
function getAzureDevOpsHostname(): string {
  const config = vscode.workspace.getConfiguration("voce");
  const customHostname = config.get<string>("azd_customhostname");
  return customHostname && customHostname.trim() !== "" ? customHostname.trim() : "dev.azure.com";
}

export async function getAzDevOpsOrgAndProject() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    logError("No active editor found.");
    return;
  }

  const filePath = editor.document.uri.fsPath;
  const fileDirectory = path.dirname(filePath);

  const git = simpleGit(fileDirectory);

  try {
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      logInfo(`No Git repository found in ${fileDirectory}`);
      return;
    }

    const remotes = await git.getRemotes(true);
    if (remotes.length === 0) {
      logError("No remote repository found.");
      return;
    }

    const remoteUrl = remotes[0].refs.fetch;
    if (remoteUrl) {
      logInfo(`Remote URL: ${remoteUrl}`);
    }

    const azDevOpsHostname = getAzureDevOpsHostname();
    logInfo(`Using Azure DevOps hostname: ${azDevOpsHostname}`);
    
    // Escape hostname for use in regex pattern
    const escapedHostname = escapeStringRegexp(azDevOpsHostname);
    
    // Azure DevOps remote URL patterns:
    // https://{hostname}/{organization}/{project}/_git/{repo}
    // or
    // git@ssh.{hostname}:v3/{organization}/{project}/{repo}
    //
    // Try the SSH pattern first: the SSH hostname (ssh.{hostname}) contains the
    // HTTPS hostname as a substring, so matching HTTPS first would incorrectly
    // capture the "v3" segment as the organization.
    const sshHostname = azDevOpsHostname === "dev.azure.com" ? "ssh.dev.azure.com" : `ssh.${azDevOpsHostname}`;
    const escapedSshHostname = escapeStringRegexp(sshHostname);
    let match = remoteUrl.match(new RegExp(`${escapedSshHostname}:v3\\/([^/]+)\\/([^/]+)`));
    if (!match) {
      // Fall back to the HTTPS pattern.
      match = remoteUrl.match(new RegExp(`${escapedHostname}[/:]([^/]+)\\/([^/]+)`));
    }
    if (!match) {
      logError(`Remote repository is not an Azure DevOps repository on ${azDevOpsHostname}.`);
      return;
    }

    const org = match[1];
    const project = match[2];
    return { org, project, remoteUrl };
  } catch (err) {
    logError(`${err} It looks like there is no git context`);
  }
}

export async function determineAzDoOrgAndProjectToUse(
  azdoOrg: string,
  azdoProject: string,
  requestHandlerContext: RequestHandlerContext
) {
  // Authentication is now handled in the individual API functions
  // Microsoft Account authentication is tried first, with PAT fallback
  let org = azdoOrg;
  let project = azdoProject;

  if (org !== "" && project !== "") {
    requestHandlerContext.vscodeContext.globalState.update("azdoOrg", org);
    requestHandlerContext.vscodeContext.globalState.update("azdoProject", project);
  } else {
    const gatheredAzDoOrgProject = (await getAzDevOpsOrgAndProject()) ?? {
      org: "",
      project: "",
      remoteUrl: ""
    };
    if (gatheredAzDoOrgProject.org !== "" && gatheredAzDoOrgProject.project !== "") {
      org = gatheredAzDoOrgProject.org;
      project = gatheredAzDoOrgProject.project;
      logInfo(`Using git context from remote URL: ${gatheredAzDoOrgProject.remoteUrl}`);
      logInfo(`Extracted Org: ${org}, Project: ${project}`);
      requestHandlerContext.stream.progress(
        `using git context from current file: azdo://${org}/${project}`
      );
    }
  }

  if (org === "" || project === "") {
    org = requestHandlerContext.vscodeContext.globalState.get("azdoOrg", "");
    project = requestHandlerContext.vscodeContext.globalState.get("azdoProject", "");
    if (org === "" || project === "") {
      logError(
        "No Azure DevOps organization or project specified. Please specify them in the prompt or open a file in an Azure DevOps git repository."
      );
      throw new Error(
        "There is no git context. Please either open a file or folder of any Azure DevOps git repository or specify the organization and project in the prompt like `azdo:<org>/<project>`."
      );
    } else {
      logInfo(`Using remembered Azure DevOps context: ${org}/${project}`);
      requestHandlerContext.stream.progress(
        `using remembered git context: azdo://${org}/${project}`
      );
    }
  }

  logInfo(`Org: ${org}, Project: ${project}`);
  return { org, project };
}
