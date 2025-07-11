# VOCE-DevOps, a Vs-cOde Copilot Extension for DevOps

This Visual Studio Code Extension enriches Copilot with data from GitHub issues/PRs and Azure DevOps work items/PRs.

## Features

### GitHub Integration

- **Issues**: Reference with `/gh-issue !<issueNumber>`
- **Pull Requests**: Reference with `/gh-pullrequest !<prNumber>` or search by title
- **Comments**: Add `+` for comments (e.g., `!1234+`)
- **Cross-repo**: Use `gh:<owner>/<repo>` syntax

### Azure DevOps Integration

- **Work Items**: Reference with `/azd-workitem !<workItemNumber>`
- **Pull Requests**: Reference with `/azd-pullrequest !<prNumber>` or search by title
- **Comments**: Add `+` for comments (e.g., `!1234+`)
- **Cross-org**: Use `azdo:<org>/<project>` syntax
- **Real API**: Uses Azure DevOps Node.js API with PAT authentication

### 🆕 Intelligent Parsing

The extension now uses AI to understand natural language requests! You can:

- **Ask naturally**: "Show me work item 123" → automatically detects Azure DevOps work item
- **Skip exact syntax**: "What's GitHub issue 456 with comments?" → understands you want comments
- **Mix contexts**: "Pull request 789 from microsoft/vscode" → extracts repo context

The AI parser works as a fallback when:

- No explicit command is provided
- Command is provided but syntax is unclear or incomplete

## Usage

### Traditional Syntax (Still Supported)

#### GitHub Issues

```text
@voce /gh-issue !1234 Provide implementation suggestion in C#
@voce /gh-issue !1234+ Include comments in analysis
@voce /gh-issue gh:owner/repo !1234 Cross-repository reference
```

#### Azure DevOps Work Items

```text
@voce /azd-workitem !5678 What's the status of this task?
@voce /azd-workitem !5678+ Summarize the discussion
@voce /azd-workitem azdo:myorg/myproject !5678 Cross-org reference
```

### 🆕 Natural Language (AI-Powered)

```text
@voce Show me work item 123
@voce What's the status of GitHub issue 456 with all comments?
@voce Tell me about pull request 789 from microsoft/vscode
@voce Summarize Azure DevOps task 321 with discussion from contoso/webapp
@voce Find pull requests about authentication
@voce Search for PRs containing bugfix
@voce Show me PRs with security in the title
@voce Find Azure DevOps PRs about performance optimization
@voce Search for pull requests with bug fix in Azure DevOps
```

The AI will automatically:

- Detect the correct command type
- Extract item IDs for specific references
- **🆕 Search pull requests by title content** (contains search)
- Understand when you want comments/discussion
- Parse repository or project context

### 🔍 Pull Request Title Search

**New Feature**: You can now search for pull requests by title content instead of just by ID across both GitHub and Azure DevOps!

#### Examples:

```text
@voce Find pull requests about authentication
@voce Search for PRs containing bug fix  
@voce Show me PRs with security in the title
@voce Look for pull requests about feature implementation
```

#### How it works:
- **Title Search**: Searches PR titles for containing the specified keywords (case-insensitive)
- **Multiple Results**: Shows up to 10 matching PRs with summaries and direct links
- **Backward Compatible**: Traditional `!<number>` ID searches continue to work unchanged
- **Comments Support**: Add "with comments" to include PR review comments
- **Cross-Platform**: Works with both GitHub and Azure DevOps repositories

#### Search Results Display:
- PR number, title, and status (open/closed)
- Brief description preview
- Direct links to open each PR in browser
- Sorted by most recently updated

## Setup

### GitHub Copilot Model Configuration (Optional)

You can configure your preferred model vendor and family for general chat responses:

1. Open VS Code settings (File > Preferences > Settings)
2. Search for "voce"
3. Set `voce.preferredChatModel` to your preferred model family (e.g., "gpt-4o", "gpt-4")
4. Set `voce.preferredChatVendor` to your preferred vendor (e.g., "copilot", "openai")
5. Leave both empty to use the default model

**Examples:**
- Default: Both settings empty → Uses default Copilot model
- Family only: `voce.preferredChatModel: "gpt-4o"` → Uses Copilot vendor with gpt-4o family
- Both specified: `voce.preferredChatVendor: "openai"` + `voce.preferredChatModel: "gpt-4"` → Uses OpenAI vendor with gpt-4 family

**Note**: The extension automatically uses the default (fast and cheap) model for parsing operations to understand your intent, regardless of these settings.

### Azure DevOps (Optional)

For real Azure DevOps data, configure a Personal Access Token:

1. Create PAT at `https://dev.azure.com/{org}` with Work Items: Read scope
2. Add to VS Code settings: `voce.azureDevOpsPat`

See [AZURE_DEVOPS_API_SETUP.md](./AZURE_DEVOPS_API_SETUP.md) for details.

## Running the extension

- Run `npm install` in terminal to install dependencies
- Run the `Run Extension` target in the Debug View. This will:
  - Start a task `npm: watch` to compile the code
  - Run the extension in a new VS Code window

## Inspiration

This Extension is based on the chat sample of [vscode extension guides](https://github.com/microsoft/vscode-extension-samples/tree/main/chat-sample)
documented [Chat Example](https://code.visualstudio.com/api/extension-guides/chat)

### Authors

This vs-code copilot extension is created and maintained by [Nico Orschel](https://github.com/norschel) and [Harald Binkle](https://github.com/harrybin)
