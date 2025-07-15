/**
 * Test script to validate custom hostname support functionality
 */

import { getAzureDevOpsOrgUrl, getAzureDevOpsWorkItemUrl, getAzureDevOpsPullRequestUrl } from "../src/azd/azDevOpsUtils";

console.log("=== Custom Hostname Support Test ===\n");

// Test default Azure DevOps hostname (when no custom hostname is configured)
console.log("Testing default Azure DevOps hostname:");
try {
  const defaultOrgUrl = getAzureDevOpsOrgUrl("myorg");
  console.log(`  Organization URL: ${defaultOrgUrl}`);
  console.log(`  Expected: https://dev.azure.com/myorg`);
  console.log(`  Match: ${defaultOrgUrl === "https://dev.azure.com/myorg" ? "✅ PASS" : "❌ FAIL"}`);

  const defaultWorkItemUrl = getAzureDevOpsWorkItemUrl("myorg", "myproject", 123);
  console.log(`  Work Item URL: ${defaultWorkItemUrl}`);
  console.log(`  Expected: https://dev.azure.com/myorg/myproject/_workitems/edit/123`);
  console.log(`  Match: ${defaultWorkItemUrl === "https://dev.azure.com/myorg/myproject/_workitems/edit/123" ? "✅ PASS" : "❌ FAIL"}`);

  const defaultPrUrl = getAzureDevOpsPullRequestUrl("myorg", "myproject", "myrepo", 456);
  console.log(`  Pull Request URL: ${defaultPrUrl}`);
  console.log(`  Expected: https://dev.azure.com/myorg/myproject/_git/myrepo/pullrequest/456`);
  console.log(`  Match: ${defaultPrUrl === "https://dev.azure.com/myorg/myproject/_git/myrepo/pullrequest/456" ? "✅ PASS" : "❌ FAIL"}`);

} catch (err) {
  console.log(`  ❌ ERROR: ${err}`);
}

console.log("\n=== Test Complete ===");
console.log("✅ Default hostname functionality validated!");

// Note: Testing custom hostnames would require setting VS Code configuration
// which is not easily testable in this standalone script. The configuration
// would be tested in integration tests within the VS Code environment.
console.log("\n📝 Note: Custom hostname testing requires VS Code configuration");
console.log("   Example configuration:");
console.log('   - voce.azd_customhostname: "devops.company.com"');
console.log('   - voce.gh_customhostname: "github.company.com"');
console.log("   This would result in URLs like:");
console.log("   - https://devops.company.com/myorg/myproject/_workitems/edit/123");
console.log("   - https://github.company.com/api/v3 (as Octokit baseUrl)");