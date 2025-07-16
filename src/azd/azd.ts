import * as vscode from "vscode";
import * as path from "path";
import simpleGit from "simple-git";
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
    
    // Escape dots in hostname for regex
    const escapedHostname = azDevOpsHostname.replace(/\./g, '\\.');
    
    // Azure DevOps remote URL patterns:
    // https://{hostname}/{organization}/{project}/_git/{repo}
    // or
    // git@ssh.{hostname}:v3/{organization}/{project}/{repo}
    let match = remoteUrl.match(new RegExp(`${escapedHostname}[/:]([^/]+)\\/([^/]+)`));
    if (!match) {
      // Try SSH pattern - for Azure DevOps Server, SSH might be ssh.{hostname}
      const sshHostname = azDevOpsHostname === "dev.azure.com" ? "ssh.dev.azure.com".replace(/\./g, '\\.') : `ssh.${azDevOpsHostname}`.replace(/\./g, '\\.');
      const escapedSshHostname = sshHostname.replace(/\\/g, '\\\\');
      match = remoteUrl.match(new RegExp(`${escapedSshHostname}:v3\\/([^/]+)\\/([^/]+)`));
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
  // For now, we'll use personal access token authentication
  // In a real implementation, you might want to use VS Code authentication API
  // const session = await vscode.authentication.getSession("azure-devops", ["vso.code"], {
  //   createIfNone: true,
  // });
  
  // For Azure DevOps, we'll need to get a PAT token or use OAuth
  // This is a placeholder for authentication
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
