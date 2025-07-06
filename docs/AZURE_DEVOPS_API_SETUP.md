# Azure DevOps API Integration

This extension now supports real Azure DevOps work items integration using both Microsoft Account authentication and Personal Access Token (PAT) authentication as fallback.

## Authentication Methods

### 1. Microsoft Account Authentication (Recommended)

The extension will first attempt to use your VS Code Microsoft Account authentication:

1. When you use Azure DevOps features for the first time, VS Code may prompt you to sign in
2. Sign in with your Microsoft Account that has access to your Azure DevOps organization
3. The extension will automatically use your Microsoft authentication for Azure DevOps API calls

**Benefits:**
- Seamless integration with VS Code authentication
- No need to manage separate tokens
- Automatic token refresh
- Uses your existing Microsoft Account permissions

### 2. Personal Access Token (PAT) Fallback

If Microsoft Account authentication is not available or fails, the extension falls back to Personal Access Token authentication:

1. Go to your Azure DevOps organization: `https://dev.azure.com/{your-org}`
2. Click on your profile picture → Personal access tokens
3. Create a new token with the following scopes:
   - **Work Items**: Read
   - **Project and Team**: Read (if you want to access multiple projects)
4. Copy the generated token

#### VS Code Configuration

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

With authentication configured (either Microsoft Account or PAT), the extension will fetch real work item data including:

- Work item title, description, state, and type
- All custom fields
- Work item comments (when using `!123+` syntax)
- Direct links to work items in Azure DevOps

### Fallback Behavior

The extension uses a tiered authentication approach:

1. **Microsoft Account**: Tried first, uses your VS Code Microsoft authentication
2. **PAT Token**: Used if Microsoft auth is unavailable or fails  
3. **Mock Data**: If no authentication is configured, mock data is provided with clear indicators

### Error Handling

The extension gracefully handles:

- Microsoft authentication unavailable or expired
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

- Microsoft Account authentication is managed by VS Code's secure authentication system
- PAT tokens are stored in VS Code's secure settings
- Tokens are only used for Azure DevOps API calls
- No tokens are transmitted to external services
- Consider using Microsoft Account authentication when possible for better security
- For PAT tokens, use tokens with minimal required scopes

## Troubleshooting

### Authentication Issues

**"Microsoft authentication not available" message:**
1. Ensure you're signed into VS Code with a Microsoft Account
2. Try signing out and back in to VS Code 
3. Check that your Microsoft Account has access to the Azure DevOps organization

**"Using mock data" warning:**
1. Try signing in with your Microsoft Account first
2. If Microsoft auth fails, verify your PAT token is correctly configured
3. Check the token has the required scopes
4. Ensure the token hasn't expired

### Work item not found errors

- Verify the work item ID exists
- Check you have read permissions for the work item  
- Ensure you're in the correct organization/project context
- Confirm your authentication method has access to the organization
