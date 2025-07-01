# Azure DevOps API Integration

This extension now supports real Azure DevOps work items integration using the Azure DevOps Node.js API.

## Setup

### 1. Azure DevOps Personal Access Token (PAT)

To use the real Azure DevOps API, you need to configure a Personal Access Token:

1. Go to your Azure DevOps organization: `https://dev.azure.com/{your-org}`
2. Click on your profile picture → Personal access tokens
3. Create a new token with the following scopes:
   - **Work Items**: Read
   - **Project and Team**: Read (if you want to access multiple projects)
4. Copy the generated token

### 2. VS Code Configuration

Add the PAT token to your VS Code settings:

1. Open VS Code Settings (`Cmd/Ctrl + ,`)
2. Search for "voce.azureDevOpsPat"
3. Paste your PAT token in the "Azure DevOps PAT" field

Or add it directly to your `settings.json`:

```json
{
  "voce.azureDevOpsPat": "your-pat-token-here"
}
```

## Features

### Real Work Item Data

With the PAT configured, the extension will fetch real work item data including:

- Work item title, description, state, and type
- All custom fields
- Work item comments (when using `!123+` syntax)
- Direct links to work items in Azure DevOps

### Fallback Behavior

If no PAT token is configured:

- The extension shows a warning and offers to open settings
- Mock data is provided so the extension still functions
- Clear indicators show when mock data is being used

### Error Handling

The extension gracefully handles:

- Invalid or expired PAT tokens
- Network connectivity issues
- Work items that don't exist
- Permission errors

## Usage Examples

### Basic Work Item Query

```text
@voce /azd-workitem !12345 What's the current status?
```

### With Comments

```text
@voce /azd-workitem !12345+ Summarize the discussion
```

### Cross-Organization

```text
@voce /azd-workitem azdo:myorg/myproject !12345 Help with this bug
```

## Security Notes

- PAT tokens are stored in VS Code's secure settings
- Tokens are only used for Azure DevOps API calls
- No tokens are transmitted to external services
- Consider using tokens with minimal required scopes

## Troubleshooting

### "Mock data" warning

If you see "Using mock data" warnings:

1. Verify your PAT token is correctly configured
2. Check the token has the required scopes
3. Ensure the token hasn't expired

### Work item not found errors

- Verify the work item ID exists
- Check you have read permissions for the work item
- Ensure you're in the correct organization/project context
