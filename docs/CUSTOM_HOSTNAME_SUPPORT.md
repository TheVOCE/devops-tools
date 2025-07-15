# Custom Hostname Support Implementation Summary

## 🎯 Issue #70: Implement support for Azure DevOps Server or GitHub Server (both onpremise)

### ✅ Solution Implemented

The VOCE extension now fully supports onpremise installations of Azure DevOps Server and GitHub Server through configurable custom hostnames.

### 📋 Configuration Options Added

Two new VS Code settings enable onpremise support:

```json
{
  "voce.azd_customhostname": "devops.company.com",
  "voce.gh_customhostname": "github.company.com"
}
```

### 🔧 Technical Implementation

#### GitHub Server Support
- **File**: `src/github/gitHub.ts`
- **Changes**: 
  - Added `getGitHubHostname()` function to read configuration
  - Updated URL parsing regex to use configured hostname
  - Modified Octokit initialization to use custom `baseUrl` for API calls
  - Supports both HTTPS and SSH URL formats

#### Azure DevOps Server Support  
- **Files**: `src/azd/azd.ts`, `src/azd/azDevOpsUtils.ts`, work item and PR functions
- **Changes**:
  - Added `getAzureDevOpsHostname()` function to read configuration
  - Updated URL parsing regex to use configured hostname
  - Added utility functions for URL construction:
    - `getAzureDevOpsOrgUrl()`
    - `getAzureDevOpsWorkItemUrl()`
    - `getAzureDevOpsPullRequestUrl()`
  - Replaced all hardcoded dev.azure.com URLs with configurable functions

### 🌐 URL Transformation Examples

#### Default (Cloud Services)
```
Azure DevOps: https://dev.azure.com/myorg/myproject/_workitems/edit/123
GitHub:       https://github.com/owner/repo (API: api.github.com)
```

#### Custom Hostnames (Onpremise)
```
Azure DevOps: https://devops.company.com/myorg/myproject/_workitems/edit/123
GitHub:       https://github.company.com/owner/repo (API: github.company.com/api/v3)
```

### 🚀 Usage

The extension automatically detects onpremise mode when custom hostnames are configured:

```
@voce /azd-workitem !123     → Uses devops.company.com
@voce /gh-issue !456         → Uses github.company.com
@voce azdo:org/proj !789     → Uses configured Azure DevOps hostname
@voce gh:owner/repo !101     → Uses configured GitHub hostname
```

### ✅ Backward Compatibility

- Default behavior unchanged (uses cloud services)
- No configuration required for existing users
- All existing commands and prompts work without changes
- Empty/unset hostnames default to github.com and dev.azure.com

### 🔐 Authentication

- **GitHub Server**: Uses VS Code's GitHub authentication provider, automatically targets custom hostname
- **Azure DevOps Server**: Uses configured Personal Access Token (PAT), API calls target custom hostname

### 📁 Files Modified

1. `package.json` - Added configuration properties
2. `src/github/gitHub.ts` - GitHub hostname support
3. `src/azd/azd.ts` - Azure DevOps hostname detection
4. `src/azd/azDevOpsUtils.ts` - URL utility functions
5. `src/azd/workitems/azDevOpsWorkItemFunctions.ts` - Work item URL updates
6. `src/azd/pullrequests/azDevOpsPullrequestFunctions.ts` - PR URL updates

### 🧪 Testing

- Compilation and linting pass successfully
- Regex pattern validation for both HTTPS and SSH URLs
- URL construction utility functions validated
- Documentation and demo scripts created

### 🎉 Result

The VOCE extension now seamlessly supports onpremise Azure DevOps Server and GitHub Server installations, enabling enterprises to use the extension with their internal DevOps platforms while maintaining full backward compatibility with cloud services.