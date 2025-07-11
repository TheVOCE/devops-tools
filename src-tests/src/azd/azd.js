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
exports.getAzDevOpsOrgAndProject = getAzDevOpsOrgAndProject;
exports.determineAzDoOrgAndProjectToUse = determineAzDoOrgAndProjectToUse;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const simple_git_1 = __importDefault(require("simple-git"));
const logging_js_1 = require("../logging.js");
async function getAzDevOpsOrgAndProject() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        (0, logging_js_1.logError)("No active editor found.");
        return;
    }
    const filePath = editor.document.uri.fsPath;
    const fileDirectory = path.dirname(filePath);
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
        if (remoteUrl) {
            (0, logging_js_1.logInfo)(`Remote URL: ${remoteUrl}`);
        }
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
            (0, logging_js_1.logError)("Remote repository is not an Azure DevOps repository.");
            return;
        }
        const org = match[1];
        const project = match[2];
        return { org, project, remoteUrl };
    }
    catch (err) {
        (0, logging_js_1.logError)(`${err} It looks like there is no git context`);
    }
}
async function determineAzDoOrgAndProjectToUse(azdoOrg, azdoProject, requestHandlerContext) {
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
    }
    else {
        const gatheredAzDoOrgProject = (await getAzDevOpsOrgAndProject()) ?? {
            org: "",
            project: "",
            remoteUrl: ""
        };
        if (gatheredAzDoOrgProject.org !== "" && gatheredAzDoOrgProject.project !== "") {
            org = gatheredAzDoOrgProject.org;
            project = gatheredAzDoOrgProject.project;
            (0, logging_js_1.logInfo)(`Using git context from remote URL: ${gatheredAzDoOrgProject.remoteUrl}`);
            (0, logging_js_1.logInfo)(`Extracted Org: ${org}, Project: ${project}`);
            requestHandlerContext.stream.progress(`using git context from current file: azdo://${org}/${project}`);
        }
    }
    if (org === "" || project === "") {
        org = requestHandlerContext.vscodeContext.globalState.get("azdoOrg", "");
        project = requestHandlerContext.vscodeContext.globalState.get("azdoProject", "");
        if (org === "" || project === "") {
            (0, logging_js_1.logError)("No Azure DevOps organization or project specified. Please specify them in the prompt or open a file in an Azure DevOps git repository.");
            throw new Error("There is no git context. Please either open a file or folder of any Azure DevOps git repository or specify the organization and project in the prompt like `azdo:<org>/<project>`.");
        }
        else {
            (0, logging_js_1.logInfo)(`Using remembered Azure DevOps context: ${org}/${project}`);
            requestHandlerContext.stream.progress(`using remembered git context: azdo://${org}/${project}`);
        }
    }
    (0, logging_js_1.logInfo)(`Org: ${org}, Project: ${project}`);
    return { org, project };
}
