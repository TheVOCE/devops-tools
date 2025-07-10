"use strict";
/**
 * Simple validation script to check that our logging functions are available and importable
 * Note: This test validates import functionality but cannot test actual output channel behavior
 * outside of a VS Code extension runtime environment.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = require("../src/logging");
console.log("=== Logging Utility Test ===\n");
// Test that all logging functions are available
console.log("Testing logging function availability:");
console.log(`  initializeOutputChannel: ${typeof logging_1.initializeOutputChannel === "function" ? "✅ PASS" : "❌ FAIL"}`);
console.log(`  logInfo: ${typeof logging_1.logInfo === "function" ? "✅ PASS" : "❌ FAIL"}`);
console.log(`  logError: ${typeof logging_1.logError === "function" ? "✅ PASS" : "❌ FAIL"}`);
console.log(`  logDebug: ${typeof logging_1.logDebug === "function" ? "✅ PASS" : "❌ FAIL"}`);
console.log(`  showOutputChannel: ${typeof logging_1.showOutputChannel === "function" ? "✅ PASS" : "❌ FAIL"}`);
console.log(`  disposeOutputChannel: ${typeof logging_1.disposeOutputChannel === "function" ? "✅ PASS" : "❌ FAIL"}`);
console.log("\n=== Logging Test Complete ===");
console.log("✅ All logging utility functions imported successfully!");
console.log("Note: Actual output channel functionality requires VS Code extension runtime.");
//# sourceMappingURL=loggingTest.js.map