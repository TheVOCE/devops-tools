import * as vscode from "vscode";
import * as path from "path";
import simpleGit from "simple-git";

export async function getGitHubOwnerAndRepo() {
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
    const match = remoteUrl.match(/github\.com[/:](.+\/.+)\.git$/);
    if (!match) {
      console.error("Remote repository is not a GitHub repository.");
      return;
    }

    console.log(`Remote URL: ${remoteUrl}`);

    const [owner, repo] = match[1].split("/");
    return { owner, repo };
  } catch (err) {
    console.error(err + " It looks like there is no git context");
  }
}
