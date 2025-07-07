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
exports.runTests = runTests;
const vscode = __importStar(require("vscode"));
const llmBasedParser_1 = require("../src/llmBasedParser");
/**
 * Manual test for LLM-based parsing functionality
 * This is not an automated test but a validation script to verify the implementation
 */
// Mock stream for testing
class MockChatResponseStream {
    progress(value) {
        console.log(`[PROGRESS]: ${value}`);
    }
    markdown(value) {
        console.log(`[MARKDOWN]: ${value}`);
    }
    anchor(value, title) {
        return { value, title };
    }
    button(command) {
        return { value: command };
    }
    filetree(value, baseUri) {
        return { value, baseUri };
    }
    reference(value, iconPath) {
        return { value, iconPath };
    }
    push(part) {
        return this;
    }
}
// Mock language model for testing
class MockLanguageModelChat {
    id = "test-model";
    name = "test-model";
    vendor = "test";
    family = "test";
    version = "1.0";
    maxInputTokens = 4000;
    countTokens() {
        return Promise.resolve(0);
    }
    sendRequest(messages, options, token) {
        // Simulate different responses based on the prompt
        const userMessage = messages.find(m => m.role === vscode.LanguageModelChatMessageRole.User);
        const content = userMessage?.content;
        let promptText = "";
        if (typeof content === 'string') {
            promptText = content;
        }
        else if (Array.isArray(content)) {
            promptText = content.map(part => {
                if (typeof part === 'string') {
                    return part;
                }
                if ('value' in part) {
                    return part.value;
                }
                return '';
            }).join(' ');
        }
        let responseText = "";
        if (promptText.includes("work item 123")) {
            responseText = '{"command": "azd-workitem", "itemId": "123", "commentsUsage": false, "confidence": 0.9}';
        }
        else if (promptText.includes("GitHub issue 456 with comments")) {
            responseText = '{"command": "gh-issue", "itemId": "456", "commentsUsage": true, "confidence": 0.9}';
        }
        else if (promptText.includes("pull request 789")) {
            responseText = '{"command": "gh-pullrequest", "itemId": "789", "commentsUsage": false, "confidence": 0.8}';
        }
        else {
            responseText = 'null';
        }
        const response = {
            text: (async function* () {
                yield responseText;
            })(),
            stream: (async function* () {
                yield { value: responseText };
            })()
        };
        return Promise.resolve(response);
    }
}
/**
 * Test cases for LLM parsing
 */
async function runTests() {
    console.log("=== LLM Parser Tests ===\n");
    const mockStream = new MockChatResponseStream();
    const mockModel = new MockLanguageModelChat();
    const mockToken = {
        isCancellationRequested: false,
        onCancellationRequested: () => ({ dispose: () => { } })
    };
    const testCases = [
        {
            name: "Work Item Request",
            prompt: "Show me work item 123",
            expected: {
                command: "azd-workitem",
                itemId: "123",
                commentsUsage: false,
                confidence: 0.9
            }
        },
        {
            name: "GitHub Issue with Comments",
            prompt: "What's the status of GitHub issue 456 with comments?",
            expected: {
                command: "gh-issue",
                itemId: "456",
                commentsUsage: true,
                confidence: 0.9
            }
        },
        {
            name: "Pull Request",
            prompt: "Show me pull request 789",
            expected: {
                command: "gh-pullrequest",
                itemId: "789",
                commentsUsage: false,
                confidence: 0.8
            }
        }
    ];
    for (const testCase of testCases) {
        console.log(`\n--- Test: ${testCase.name} ---`);
        console.log(`Prompt: "${testCase.prompt}"`);
        try {
            const result = await (0, llmBasedParser_1.parseLLMBasedCommand)(testCase.prompt, mockModel, mockToken, mockStream);
            if (result) {
                console.log("✅ Parse successful:");
                console.log(`  Command: ${result.command}`);
                console.log(`  Item ID: ${result.itemId}`);
                console.log(`  Comments: ${result.commentsUsage}`);
                console.log(`  Confidence: ${result.confidence}`);
                // Validate against expected results
                const isValid = result.command === testCase.expected.command &&
                    result.itemId === testCase.expected.itemId &&
                    result.commentsUsage === testCase.expected.commentsUsage;
                if (isValid) {
                    console.log("✅ Test PASSED");
                }
                else {
                    console.log("❌ Test FAILED - Result doesn't match expected");
                }
            }
            else {
                console.log("❌ Parse failed - returned null");
            }
        }
        catch (error) {
            console.log(`❌ Test ERROR: ${error}`);
        }
    }
    // Test hasValidParseResults utility
    console.log("\n--- hasValidParseResults Tests ---");
    const validResult = { itemId: "123" };
    const invalidResult = { itemId: "" };
    console.log(`Valid result test: ${(0, llmBasedParser_1.hasValidParseResults)(validResult) ? "✅ PASS" : "❌ FAIL"}`);
    console.log(`Invalid result test: ${!(0, llmBasedParser_1.hasValidParseResults)(invalidResult) ? "✅ PASS" : "❌ FAIL"}`);
    console.log("\n=== Tests Complete ===");
}
// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}
//# sourceMappingURL=llmParserTest.js.map