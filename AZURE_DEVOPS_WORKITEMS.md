# Azure DevOps Work Items Support

This extension supports Azure DevOps work items similar to GitHub issues functionality, with real API integration.

## Setup

### Azure DevOps Personal Access Token

To use real Azure DevOps data, configure a Personal Access Token:

1. Go to `https://dev.azure.com/{your-org}` → Profile → Personal access tokens
2. Create a token with **Work Items: Read** scope
3. Add to VS Code settings: `voce.azureDevOpsPat`

See [AZURE_DEVOPS_API_SETUP.md](./AZURE_DEVOPS_API_SETUP.md) for detailed setup instructions.

## Usage

To use Azure DevOps work items, you can use the following command patterns:

### Work Item Command

Use the `/azd-workitem` command followed by a work item ID:

```text
@voce /azd-workitem !123
```

This will load work item !123 and provide context for your questions.

### Adding Comments

To include comments in the context, add a `+` after the work item number:

```text
@voce /azd-workitem !123+
```

### Specifying Organization and Project

If you're not in a git repository or want to use a different org/project, you can specify them:

```text
@voce /azd-workitem azdo:myorg/myproject !123
```

## Configuration

You can configure the behavior through VS Code settings:

- `voce.echoFullWorkItem`: Whether to display the full work item details in chat
- `voce.echoWorkItemComments`: Whether to include comments when displaying work items

## Pattern Recognition

The extension recognizes these patterns:

- `!123` - Work item ID (similar to GitHub's `!123` for issues)
- `azdo:org/project` - Explicit organization and project specification
- `+` suffix - Include comments (e.g., `!123+`)

## Examples

1. Simple work item query:

   ```text
   @voce /azd-workitem !456 What's the status of this task?
   ```

2. Work item with comments:

   ```text
   @voce /azd-workitem !456+ Summarize the discussion in the comments
   ```

3. Cross-organization work item:

   ```text
   @voce /azd-workitem azdo:contoso/webapp !123 Help me understand this bug
   ```

## Implementation Notes

The Azure DevOps work items functionality follows the same architectural patterns as the GitHub issues implementation:

- `AzDevOpsWorkItemCommand.ts` - Main command handler
- `AzDevOpsWorkItemsPrompt.tsx` - Prompt template for AI context
- `azDevOpsWorkItemFunctions.ts` - Core functions for fetching work items
- `azDevOpsUtils.ts` - Utility functions for parsing prompts
- `AzDevOpsResult.ts` - Type definitions for work item data