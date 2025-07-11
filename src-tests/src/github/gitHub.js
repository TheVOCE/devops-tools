"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGitHubOwnerAndRepo = getGitHubOwnerAndRepo;
exports.determineGhOwnerAndRepoToUse = determineGhOwnerAndRepoToUse;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const simple_git_1 = __importDefault(require("simple-git"));
const logging_js_1 = require("../logging.js");
async function getGitHubOwnerAndRepo() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        (0, logging_js_1.logError)("No active editor found.");
        return;
    }
    const filePath = editor.document.uri.fsPath;
    const fileDirectory = path.dirname(filePath);
    (0, logging_js_1.logInfo)("Get GitHub owner and repo name");
    const git = (0, simple_git_1.default)(fileDirectory);
    try {
        const isRepo = await git.checkIsRepo();
        if (!isRepo) {
            (0, logging_js_1.logInfo)(`No Git repository found in ${fileDirectory}`);
            return;
        }
        const remotes = await git.getRemotes(true);
        if (remotes.length === 0) {
            (0, logging_js_1.logError)("No remote repository found.");
            return;
        }
        const remoteUrl = remotes[0].refs.fetch;
        (0, logging_js_1.logInfo)(`Remote URL: ${remoteUrl}`);
        const match = remoteUrl.match(/github\.com[/:](.+\/.+)\.git$/);
        if (!match) {
            (0, logging_js_1.logError)("Remote repository is not a GitHub repository.");
            return;
        }
        const [owner, repo] = match[1].split("/");
        return { owner, repo };
    }
    catch (err) {
        (0, logging_js_1.logError)(`${err} It looks like there is no git context`);
    }
}
async function determineGhOwnerAndRepoToUse(ghOwner, ghRepo, requestHandlerContext) {
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
    }
    else {
        // gather owner and repo from the git context of the current open file in editor
        const gatheredGhOwnerRepo = (await getGitHubOwnerAndRepo()) ?? {
            owner: "",
            repo: "",
        };
        if (gatheredGhOwnerRepo.owner !== "" && gatheredGhOwnerRepo.repo !== "") {
            owner = gatheredGhOwnerRepo.owner;
            repo = gatheredGhOwnerRepo.repo;
            requestHandlerContext.stream.progress(`using git context from current file: github://${owner}/${repo}`);
        }
    }
    if (owner === "" || repo === "") {
        //load variables from the vscode ExtensionContext
        //this occurs when the user has not specified the owner and repo in the prompt and no git context is found
        owner = requestHandlerContext.vscodeContext.globalState.get("ghOwner", "");
        repo = requestHandlerContext.vscodeContext.globalState.get("ghRepo", "");
        if (owner === "" || repo === "") {
            throw new Error("There is no git context. Please either open a file or folder of any GitHub git repository or specify the owner and repo in the prompt like `gh:<owner>/<repo>`.");
        }
        else {
            requestHandlerContext.stream.progress(`using remembered git context: github://${owner}/${repo}`);
        }
    }
    (0, logging_js_1.logInfo)(`Owner: ${owner}, Repo: ${repo}`);
    return { octokit, owner, repo };
}
