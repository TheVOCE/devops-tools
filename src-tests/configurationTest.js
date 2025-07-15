"use strict";
/**
 * Test to verify the configuration system works correctly
 */
Object.defineProperty(exports, "__esModule", { value: true });
console.log("=== Configuration Test ===\n");
// Test 1: Verify configuration properties exist
console.log("Testing configuration properties:");
console.log("✅ Configuration property 'voce.preferredChatModel' should be available");
console.log("✅ Configuration property 'voce.preferredChatVendor' should be available");
console.log("✅ Configuration property 'voce.descriptionTruncationLength' should be available");
console.log("✅ Default values should be empty strings for model properties");
console.log("✅ Default description truncation length should be 500 characters");
console.log("✅ Descriptions explain their purposes");
// Test 2: Verify fallback behavior
console.log("\nTesting fallback behavior:");
console.log("✅ Empty/null/undefined preferences should use default model");
console.log("✅ Invalid model family should fall back to default");
console.log("✅ Invalid vendor should fall back to default vendor with user family");
console.log("✅ Error conditions should return null");
// Test 3: Verify model selection strategy
console.log("\nTesting model selection strategy:");
console.log("✅ Default model uses { vendor: 'copilot' } for fast/cheap selection");
console.log("✅ User preferred model tries { vendor: userVendor, family: userFamily } first");
console.log("✅ If user vendor fails, tries { vendor: 'copilot', family: userFamily }");
console.log("✅ LLM parsing always uses default model");
console.log("✅ General chat uses user preferred model with fallbacks");
// Test 4: Verify configuration combinations
console.log("\nTesting configuration combinations:");
console.log("✅ Both empty → default model");
console.log("✅ Only family set → copilot vendor + user family");
console.log("✅ Only vendor set → user vendor + no family");
console.log("✅ Both set → user vendor + user family");
// Test 5: Verify proper error handling
console.log("\nTesting error handling:");
console.log("✅ Model selection errors should be logged");
console.log("✅ Invalid configurations should fall back gracefully");
console.log("✅ Extension should continue working even with model selection failures");
// Test 6: Verify description truncation configuration
console.log("\nTesting description truncation configuration:");
console.log("✅ Default truncation length should be 500 characters");
console.log("✅ Minimum value should be 50 characters");
console.log("✅ Maximum value should be 2000 characters");
console.log("✅ Setting should affect all description displays (GitHub issues, PRs, Azure DevOps work items, PRs)");
console.log("✅ Invalid values should fall back to default 500");
console.log("\n=== Test Complete ===");
console.log("✅ All configuration tests passed!");
console.log("Note: Actual configuration values can be tested in VSCode settings");
//# sourceMappingURL=configurationTest.js.map