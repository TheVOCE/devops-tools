/**
 * Demonstration of Custom Hostname Support
 * 
 * This script shows how the VOCE extension now supports onpremise installations
 * of Azure DevOps Server and GitHub Server through custom hostname configuration.
 */

console.log("=== VOCE Extension Custom Hostname Support ===\n");

console.log("🎯 FEATURE: Support for Azure DevOps Server and GitHub Server (onpremise)\n");

console.log("📋 CONFIGURATION:");
console.log("The extension now supports two new configuration options in VS Code settings:");
console.log("  • voce.azd_customhostname  - For Azure DevOps Server");
console.log("  • voce.gh_customhostname   - For GitHub Server");
console.log();

console.log("🔧 CONFIGURATION EXAMPLES:");
console.log("To use your company's onpremise installations, set these in VS Code settings:");
console.log();
console.log("For Azure DevOps Server:");
console.log('  "voce.azd_customhostname": "devops.company.com"');
console.log();
console.log("For GitHub Server:");
console.log('  "voce.gh_customhostname": "github.company.com"');
console.log();

console.log("🌐 URL TRANSFORMATION:");
console.log();
console.log("BEFORE (Cloud only):");
console.log("  Azure DevOps: https://dev.azure.com/myorg/myproject/_workitems/edit/123");
console.log("  GitHub:       https://github.com/owner/repo (API: api.github.com)");
console.log();
console.log("AFTER (Custom hostnames):");
console.log("  Azure DevOps: https://devops.company.com/myorg/myproject/_workitems/edit/123");
console.log("  GitHub:       https://github.company.com/owner/repo (API: github.company.com/api/v3)");
console.log();

console.log("🔄 AUTOMATIC DETECTION:");
console.log("The extension automatically detects onpremise mode when:");
console.log("  • User configures a custom hostname in settings");
console.log("  • Git remote URLs point to custom hostnames");
console.log("  • Both URL parsing and API calls use the custom hostnames");
console.log();

console.log("🚀 USAGE EXAMPLES:");
console.log();
console.log("With custom Azure DevOps Server (devops.company.com):");
console.log("  @voce /azd-workitem !123   → Points to devops.company.com");
console.log("  @voce azdo:myorg/myproj !456 → Uses devops.company.com API");
console.log();
console.log("With custom GitHub Server (github.company.com):");
console.log("  @voce /gh-issue !789       → Points to github.company.com");
console.log("  @voce gh:owner/repo !101   → Uses github.company.com/api/v3");
console.log();

console.log("✅ BACKWARD COMPATIBILITY:");
console.log("  • Default behavior unchanged (uses cloud services)");
console.log("  • No configuration = uses github.com and dev.azure.com");
console.log("  • Existing prompts and commands work without changes");
console.log();

console.log("🔐 AUTHENTICATION:");
console.log("  • GitHub Server: Uses VS Code's GitHub authentication provider");
console.log("  • Azure DevOps Server: Uses configured Personal Access Token (PAT)");
console.log("  • Authentication automatically targets the custom hostname");
console.log();

console.log("📝 IMPLEMENTATION DETAILS:");
console.log("  • Dynamic hostname configuration in package.json");
console.log("  • Regex patterns for URL parsing use configured hostnames");
console.log("  • API initialization (Octokit, Azure DevOps API) uses custom endpoints");
console.log("  • All hardcoded URLs replaced with configurable URL builders");
console.log();

console.log("=== Implementation Complete ===");
console.log("✅ Azure DevOps Server and GitHub Server (onpremise) are now fully supported!");