import * as vscode from "vscode";
import * as path from "path";
import simpleGit from "simple-git";
import type { RequestHandlerContext } from "../requestHandlerContext";

export interface AzDevOpsResult {
  comments: AzDevOpsComment[];
  data?: {
    title: string;
    body: string;
    url: string;
    state: string;
    reason: string;
  };
}

export interface AzDevOpsComment {
  id: number;
  url: string;
  body?: string | undefined;
}

export async function getAzDevOpsOrgAndProject() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    console.error("No active editor found.");
    return;
  }

  const filePath = editor.document.uri.fsPath;
  const fileDirectory = path.dirname(filePath);

  const git = simpleGit(fileDirectory);

  try {
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      console.log(`No Git repository found in ${fileDirectory}`);
      return;
    }

    const remotes = await git.getRemotes(true);
    if (remotes.length === 0) {
      console.error("No remote repository found.");
      return;
    }

    const remoteUrl = remotes[0].refs.fetch;
    // Azure DevOps remote URL patterns:
    // https://dev.azure.com/{organization}/{project}/_git/{repo}
    // or
    // git@ssh.dev.azure.com:v3/{organization}/{project}/{repo}
    let match = remoteUrl.match(/dev\.azure\.com[/:]([^/]+)\/([^/]+)/);
    if (!match) {
      // Try SSH pattern
      match = remoteUrl.match(/ssh\.dev\.azure\.com:v3\/([^/]+)\/([^/]+)/);
    }
    if (!match) {
      console.error("Remote repository is not an Azure DevOps repository.");
      return;
    }

    const org = match[1];
    const project = match[2];
    return { org, project };
  } catch (err) {
    console.error(err + " It looks like there is no git context");
  }
}

export async function determineAzDoOrgAndProjectToUse(
  azdoOrg: string,
  azdoProject: string,
  requestHandlerContext: RequestHandlerContext
) {
  // Azure DevOps authentication via vscode extension API
  // See https://code.visualstudio.com/api/extension-guides/authentication#using-the-authentication-api
  // The Azure DevOps extension uses 'azure-devops' as the authentication provider id
  const session = await vscode.authentication.getSession("azure-devops", ["vso.code"], {
    createIfNone: true,
  });
  // Use @azure/devops-extension-api or REST API directly
  // For simplicity, just return the session and org/project
  let org = azdoOrg;
  let project = azdoProject;

  if (org !== "" && project !== "") {
    requestHandlerContext.vscodeContext.globalState.update("azdoOrg", org);
    requestHandlerContext.vscodeContext.globalState.update("azdoProject", project);
  } else {
    const gatheredAzDoOrgProject = (await getAzDevOpsOrgAndProject()) ?? {
      org: "",
      project: "",
    };
    if (gatheredAzDoOrgProject.org !== "" && gatheredAzDoOrgProject.project !== "") {
      org = gatheredAzDoOrgProject.org;
      project = gatheredAzDoOrgProject.project;
      requestHandlerContext.stream.progress(
        `using git context from current file: azdo://${org}/${project}`
      );
    }
  }

  if (org === "" || project === "") {
    org = requestHandlerContext.vscodeContext.globalState.get("azdoOrg", "");
    project = requestHandlerContext.vscodeContext.globalState.get("azdoProject", "");
    if (org === "" || project === "") {
      throw new Error(
        "There is no git context. Please either open a file or folder of any Azure DevOps git repository or specify the organization and project in the prompt like `azdo:<org>/<project>`."
      );
    } else {
      requestHandlerContext.stream.progress(
        `using remembered git context: azdo://${org}/${project}`
      );
    }
  }

  console.log(`Org: ${org}, Project: ${project}`);
  return { session, org, project };
}
