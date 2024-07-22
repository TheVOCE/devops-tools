import * as vscode from "vscode";
import * as cp from "child_process";
import * as path from "path";
import * as git from "simple-git";

export async function getGitHubOwnerAndRepo(): Promise<
  { owner: string; repo: string } | undefined
> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    console.error("No file is open.");
    return;
  }

  let filePath = editor.document.uri.fsPath;
  let fileDirectory = path.dirname(filePath);
  let workspacePath = fileDirectory;

  await cp.exec(
    "git rev-parse --show-toplevel",
    { cwd: fileDirectory },
    (error, stdout) => {
      if (error) {
        console.log(`No Git repository found in ${fileDirectory}`);
      } else {
        workspacePath = stdout.trim();
        console.log(`Git repository found in ${workspacePath}`);
      }
    }
  );

  const gitRepo = git.gitP(workspacePath);
  const remotes: git.RemoteWithRefs[] = [];
  try {
    const remotes = await gitRepo.getRemotes(true);
  } catch (err) {
    console.error(err + "It looks like the there is no git context");
    return;
  }

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

  const [owner, repo] = match[1].split("/");
  return { owner, repo };
}
