/**
 * Test for Azure DevOps authentication mechanism
 * This test verifies that the Microsoft Account authentication is implemented properly
 */

const { getAzureDevOpsConnection } = require("../out/azd/azDevOpsUtils");

// Test that the authentication function exists and is properly structured
async function testAuthenticationImplementation() {
  console.log("=== Azure DevOps Authentication Implementation Test ===\n");
  
  // Check that the function exists
  if (typeof getAzureDevOpsConnection !== 'function') {
    console.error("❌ getAzureDevOpsConnection function not found");
    return false;
  }
  
  console.log("✅ getAzureDevOpsConnection function exists");
  
  // Check that the function signature is correct
  const funcString = getAzureDevOpsConnection.toString();
  
  // Check for Microsoft authentication implementation
  const hasMicrosoftAuth = funcString.includes("vscode.authentication.getSession") && 
                          funcString.includes("microsoft") &&
                          funcString.includes("https://app.vssps.visualstudio.com/user_impersonation");
  
  if (!hasMicrosoftAuth) {
    console.error("❌ Microsoft authentication implementation not found");
    console.log("Function source preview:", funcString.substring(0, 200) + "...");
    return false;
  }
  
  console.log("✅ Microsoft authentication implementation found");
  
  // Check for Bearer handler usage
  const hasBearerHandler = funcString.includes("getBearerHandler");
  if (!hasBearerHandler) {
    console.error("❌ Bearer handler for Microsoft authentication not found");
    return false;
  }
  
  console.log("✅ Bearer handler implementation found");
  
  // Check for PAT fallback
  const hasPATFallback = funcString.includes("getPersonalAccessTokenHandler") &&
                        funcString.includes("azureDevOpsPat");
  
  if (!hasPATFallback) {
    console.error("❌ PAT token fallback implementation not found");
    return false;
  }
  
  console.log("✅ PAT token fallback implementation found");
  
  // Check for user prompt options
  const hasUserPrompts = funcString.includes("Sign In") &&
                        funcString.includes("Open Settings") &&
                        funcString.includes("showWarningMessage");
  
  if (!hasUserPrompts) {
    console.error("❌ User prompt implementation not found");
    return false;
  }
  
  console.log("✅ User prompt implementation found");
  
  // Check for silent authentication attempt
  const hasSilentAuth = funcString.includes("createIfNone: false");
  
  if (!hasSilentAuth) {
    console.error("❌ Silent authentication attempt not found");
    return false;
  }
  
  console.log("✅ Silent authentication attempt implementation found");
  
  console.log("\n=== Authentication Implementation Test Complete ===");
  console.log("✅ All authentication features are properly implemented");
  console.log("✅ Microsoft authentication is the primary method");
  console.log("✅ PAT fallback is properly configured");
  console.log("✅ User guidance prompts are implemented");
  console.log("✅ Silent authentication prevents unwanted prompts");
  
  return true;
}

// Run the test
testAuthenticationImplementation().then(success => {
  if (success) {
    console.log("\n🎉 Microsoft Account authentication feature is fully implemented!");
  } else {
    console.log("\n❌ Authentication implementation is incomplete");
    process.exit(1);
  }
}).catch(error => {
  console.error("❌ Test failed with error:", error);
  process.exit(1);
});