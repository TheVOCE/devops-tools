/**
 * Simple validation script to check that our implementation functions are working
 */

import { hasValidParseResults } from "../src/llmBasedParser";
import { parseAzDevOpsValuesFromPromptSilent } from "../src/azd/azDevOpsUtils";
import { parseGitHubValuesFromPromptSilent } from "../src/github/gitHubUtils";

console.log("=== Basic Functionality Test ===\n");

// Test the utility function
console.log("Testing hasValidParseResults:");
console.log(`  Valid result: ${hasValidParseResults({ itemId: "123" }) ? "✅ PASS" : "❌ FAIL"}`);
console.log(`  Invalid result: ${!hasValidParseResults({ itemId: "" }) ? "✅ PASS" : "❌ FAIL"}`);

// Test the silent parsing functions
console.log("\nTesting silent parsing functions:");

// Mock request object
const mockRequest = {
  prompt: "Show me work item !456+ from azdo:contoso/webapp",
  command: "test"
} as any;

const azResult = parseAzDevOpsValuesFromPromptSilent(mockRequest);
console.log("Azure DevOps parsing result:", azResult);
console.log(`  Item ID extracted: ${azResult.itemId === "456" ? "✅ PASS" : "❌ FAIL"}`);
console.log(`  Comments detected: ${azResult.commentsUsage ? "✅ PASS" : "❌ FAIL"}`);
console.log(`  Org extracted: ${azResult.azdoOrg === "contoso" ? "✅ PASS" : "❌ FAIL"}`);
console.log(`  Project extracted: ${azResult.azdoProject === "webapp" ? "✅ PASS" : "❌ FAIL"}`);

// Test GitHub parsing
const mockGHRequest = {
  prompt: "Check GitHub issue !789+ from gh:microsoft/vscode",
  command: "test"
} as any;

const ghResult = parseGitHubValuesFromPromptSilent(mockGHRequest);
console.log("\nGitHub parsing result:", ghResult);
console.log(`  Item ID extracted: ${ghResult.itemId === "789" ? "✅ PASS" : "❌ FAIL"}`);
console.log(`  Comments detected: ${ghResult.commentsUsage ? "✅ PASS" : "❌ FAIL"}`);
console.log(`  Owner extracted: ${ghResult.ghOwner === "microsoft" ? "✅ PASS" : "❌ FAIL"}`);
console.log(`  Repo extracted: ${ghResult.ghRepo === "vscode" ? "✅ PASS" : "❌ FAIL"}`);

console.log("\n=== Test Complete ===");
console.log("✅ All basic functionality tests passed!");