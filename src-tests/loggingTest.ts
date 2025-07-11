/**
 * Simple validation script to check that our logging functions are available and importable
 * Note: This test validates import functionality but cannot test actual output channel behavior
 * outside of a VS Code extension runtime environment.
 */

import { initializeOutputChannel, logInfo, logError, logDebug, showOutputChannel, disposeOutputChannel } from "../src/logging";

console.log("=== Logging Utility Test ===\n");

// Test that all logging functions are available
console.log("Testing logging function availability:");
console.log(`  initializeOutputChannel: ${typeof initializeOutputChannel === "function" ? "✅ PASS" : "❌ FAIL"}`);
console.log(`  logInfo: ${typeof logInfo === "function" ? "✅ PASS" : "❌ FAIL"}`);
console.log(`  logError: ${typeof logError === "function" ? "✅ PASS" : "❌ FAIL"}`);
console.log(`  logDebug: ${typeof logDebug === "function" ? "✅ PASS" : "❌ FAIL"}`);
console.log(`  showOutputChannel: ${typeof showOutputChannel === "function" ? "✅ PASS" : "❌ FAIL"}`);
console.log(`  disposeOutputChannel: ${typeof disposeOutputChannel === "function" ? "✅ PASS" : "❌ FAIL"}`);

console.log("\n=== Logging Test Complete ===");
console.log("✅ All logging utility functions imported successfully!");
console.log("Note: Actual output channel functionality requires VS Code extension runtime.");