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
exports.initializeOutputChannel = initializeOutputChannel;
exports.logInfo = logInfo;
exports.logError = logError;
exports.logDebug = logDebug;
exports.showOutputChannel = showOutputChannel;
exports.disposeOutputChannel = disposeOutputChannel;
const vscode = __importStar(require("vscode"));
/**
 * Shared output channel for the VOCE DevOps extension
 */
let outputChannel = null;
/**
 * Initialize the output channel for the extension
 */
function initializeOutputChannel() {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel("VOCE DevOps");
    }
}
/**
 * Log an informational message to the output channel
 */
function logInfo(message) {
    if (outputChannel) {
        outputChannel.appendLine(`[INFO] ${message}`);
    }
}
/**
 * Log an error message to the output channel
 */
function logError(message) {
    if (outputChannel) {
        outputChannel.appendLine(`[ERROR] ${message}`);
    }
}
/**
 * Log a debug message to the output channel
 */
function logDebug(message) {
    if (outputChannel) {
        outputChannel.appendLine(`[DEBUG] ${message}`);
    }
}
/**
 * Show the output channel to the user
 */
function showOutputChannel() {
    if (outputChannel) {
        outputChannel.show();
    }
}
/**
 * Dispose of the output channel
 */
function disposeOutputChannel() {
    if (outputChannel) {
        outputChannel.dispose();
        outputChannel = null;
    }
}
