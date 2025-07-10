import * as vscode from "vscode";
import * as path from "path";
import simpleGit from "simple-git";
import type { RequestHandlerContext } from "../requestHandlerContext";
import { logInfo, logError } from "../logging.js";

export async function getGitHubOwnerAndRepo() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    logError("No active editor found.");
    return;
  }

  const filePath = editor.document.uri.fsPath;
  const fileDirectory = path.dirname(filePath);

  logInfo("Get GitHub owner and repo name");
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
    logInfo(`Remote URL: ${remoteUrl}`);

    const match = remoteUrl.match(/github\.com[/:](.+\/.+)\.git$/);
    if (!match) {
      logError("Remote repository is not a GitHub repository.");
      return;
    }

    const [owner, repo] = match[1].split("/");
    return { owner, repo };
  } catch (err) {
    logError(`${err} It looks like there is no git context`);
  }
}

export async function determineGhOwnerAndRepoToUse(
  ghOwner: string,
  ghRepo: string,
  requestHandlerContext: RequestHandlerContext
) {
  const session = await vscode.authentication.getSession("github", ["repo"], {
    createIfNone: true,
  });
  const { Octokit } = await import("@octokit/rest");
  const octokit = new Octokit({ auth: session.accessToken });
  let owner = ghOwner;
  let repo = ghRepo;

  if (owner !== "" && repo !== "") {
    //save context variables from prompt to the vscode ExtensionContext
    requestHandlerContext.vscodeContext.globalState.update("ghOwner", owner);
    requestHandlerContext.vscodeContext.globalState.update("ghRepo", repo);
  } else {
    // gather owner and repo from the git context of the current open file in editor
    const gatheredGhOwnerRepo = (await getGitHubOwnerAndRepo()) ?? {
      owner: "",
      repo: "",
    };

    if (gatheredGhOwnerRepo.owner !== "" && gatheredGhOwnerRepo.repo !== "") {
      owner = gatheredGhOwnerRepo.owner;
      repo = gatheredGhOwnerRepo.repo;
      requestHandlerContext.stream.progress(
        `using git context from current file: github://${owner}/${repo}`
      );
    }
  }

  if (owner === "" || repo === "") {
    //load variables from the vscode ExtensionContext
    //this occurs when the user has not specified the owner and repo in the prompt and no git context is found
    owner = requestHandlerContext.vscodeContext.globalState.get("ghOwner", "");
    repo = requestHandlerContext.vscodeContext.globalState.get("ghRepo", "");

    if (owner === "" || repo === "") {
      throw new Error(
        "There is no git context. Please either open a file or folder of any GitHub git repository or specify the owner and repo in the prompt like `gh:<owner>/<repo>`."
      );
    } else {
      requestHandlerContext.stream.progress(
        `using remembered git context: github://${owner}/${repo}`
      );
    }
  }

  logInfo(`Owner: ${owner}, Repo: ${repo}`);
  return { octokit, owner, repo };
}
