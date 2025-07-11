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
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAzDevOpsValuesFromPrompt = parseAzDevOpsValuesFromPrompt;
exports.parseAzDevOpsValuesFromPromptSilent = parseAzDevOpsValuesFromPromptSilent;
exports.getAzureDevOpsConnection = getAzureDevOpsConnection;
const vscode = __importStar(require("vscode"));
const azdev = __importStar(require("azure-devops-node-api"));
const logging_js_1 = require("../logging.js");
const workItemNumberRegex = /!(\d+)(\+?)/; // prefix: !, work item number, optional: + for comments
const azdoOrgProjectRegex = /azdo:(.+)\/(.+?)[\s;,\/:]/; // for specifying org and project name
function parseAzDevOpsValuesFromPrompt(request, stream) {
    (0, logging_js_1.logInfo)("Parsing Azure DevOps values from prompt");
    const workItemMatch = request.prompt.match(workItemNumberRegex);
    let itemId = "";
    let commentsUsage = false;
    if (workItemMatch) {
        itemId = workItemMatch[1];
        commentsUsage = workItemMatch[2] === "+";
        stream.progress(`Work Item !${itemId} found in prompt.`);
    }
    const azdoMatch = request.prompt.match(azdoOrgProjectRegex);
    const [azdoOrg, azdoProject] = azdoMatch ? [azdoMatch[1], azdoMatch[2]] : ["", ""];
    if (azdoOrg) {
        stream.progress(`using Azure DevOps org '${azdoOrg}' passed in prompt`);
    }
    if (azdoProject) {
        stream.progress(`using Azure DevOps project '${azdoProject}' passed in prompt`);
    }
    return { azdoOrg, azdoProject, itemId, commentsUsage };
}
/**
 * Silent version of parseAzDevOpsValuesFromPrompt that doesn't output progress messages
 * Used for checking if parsing finds valid results without affecting the stream
 */
function parseAzDevOpsValuesFromPromptSilent(request) {
    (0, logging_js_1.logInfo)("Parsing Azure DevOps values from prompt silently");
    const workItemMatch = request.prompt.match(workItemNumberRegex);
    let itemId = "";
    let commentsUsage = false;
    if (workItemMatch) {
        itemId = workItemMatch[1];
        commentsUsage = workItemMatch[2] === "+";
    }
    const azdoMatch = request.prompt.match(azdoOrgProjectRegex);
    const [azdoOrg, azdoProject] = azdoMatch ? [azdoMatch[1], azdoMatch[2]] : ["", ""];
    return { azdoOrg, azdoProject, itemId, commentsUsage };
}
/**
 * Get Azure DevOps API connection using PAT token from configuration
 * @param orgUrl The organization URL (e.g., https://dev.azure.com/myorg)
 * @returns Promise<azdev.WebApi> The Azure DevOps WebApi connection
 */
async function getAzureDevOpsConnection(orgUrl) {
    // Try to get stored PAT token
    (0, logging_js_1.logInfo)("Retrieving Azure DevOps PAT token from configuration");
    const token = await vscode.workspace.getConfiguration("voce").get("azureDevOpsPat");
    (0, logging_js_1.logInfo)("Retrieving Azure DevOps connection using PAT token");
    if (!token) {
        // If no token is configured, provide helpful error message
        const message = "Azure DevOps Personal Access Token not configured. Please set 'voce.azureDevOpsPat' in VS Code settings to enable real Azure DevOps integration.";
        // Log to output channel for diagnostic purposes
        (0, logging_js_1.logInfo)("Microsoft authentication not available, falling back to PAT token configuration required");
        vscode.window.showWarningMessage(message, "Open Settings").then(selection => {
            if (selection === "Open Settings") {
                vscode.commands.executeCommand("workbench.action.openSettings", "voce.azureDevOpsPat");
            }
        });
        throw new Error(message);
    }
    (0, logging_js_1.logInfo)(`Using Azure DevOps PAT token for organization: ${orgUrl}`);
    const authHandler = azdev.getPersonalAccessTokenHandler(token);
    const connection = new azdev.WebApi(orgUrl, authHandler);
    (0, logging_js_1.logInfo)(`Successfully created Azure DevOps connection for organization: ${orgUrl}`);
    return connection;
}
