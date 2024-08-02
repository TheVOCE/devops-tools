import * as vscode from "vscode";
import type { Comment } from "./comment";
import type { RequestHandlerContext } from "../requestHandlerContext";
import { getGitHubOwnerAndRepo } from "../gitHub";
import type { GitHubResult } from "./IssuePrompt";

export function StateFullIssueInStream(
  stream: vscode.ChatResponseStream,
  issue: any,
  comments: Comment[]
) {
  stream.markdown(`Issue: **${issue.title}**\n\n`);
  stream.markdown(issue.body?.replaceAll("\n", "\n> ") + "");
  if (comments?.length > 0) {
    stream.markdown("\n\n_Comments_\n");
    comments?.map((comment) =>
      stream.markdown(`\n> ${comment.body?.replaceAll("\n", "\n> ") + ""}\n`)
    );
  }
  stream.markdown("\n\n----\n\n");
}

//get issue object from github by its issue id using octokit
export async function getIssueAndCommentsById(
  requestHandlerContext: RequestHandlerContext,
  issue_number: number,
  ghOwner: string = "",
  ghRepo: string = "",
  withComments = false
): Promise<GitHubResult> {
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

  console.log(`Owner: ${owner}, Repo: ${repo}`);
  let issue: any = {};
  try {
    issue = (
      await octokit.rest.issues.get({
        owner,
        repo,
        issue_number,
      })
    ).data;
  } catch (err) {
    throw new Error(`Can't find issue #${issue_number} in repo '${repo}'.`);
  }
  try {
    let comments: Comment[] = [];
    if (withComments) {
      comments = (
        await octokit.rest.issues.listComments({
          owner,
          repo,
          issue_number,
        })
      ).data as Comment[];
    }

    return { issue: issue, comments: comments };
  } catch (err) {
    throw new Error(
      `Can't get comments for issue #${issue_number} of repo '${repo}'.`
    );
  }
}
