# VOCE-DevOps, a Vs-cOde Copilot Extension for DevOps

This Visual Studio Code Extension enriches Copilot with data from GitHub issues/PRs and Azure DevOps work items/PRs.

## Features

### GitHub Integration

- **Issues**: Reference with `/gh-issue !<issueNumber>`
- **Pull Requests**: Reference with `/gh-pullrequest`
- **Comments**: Add `+` for comments (e.g., `!1234+`)
- **Cross-repo**: Use `gh:<owner>/<repo>` syntax

### Azure DevOps Integration

- **Work Items**: Reference with `/azd-workitem !<workItemNumber>`
- **Comments**: Add `+` for comments (e.g., `!1234+`)
- **Cross-org**: Use `azdo:<org>/<project>` syntax
- **Real API**: Uses Azure DevOps Node.js API with PAT authentication

## Usage

### GitHub Issues

```text
@voce /gh-issue !1234 Provide implementation suggestion in C#
@voce /gh-issue !1234+ Include comments in analysis
@voce /gh-issue gh:owner/repo !1234 Cross-repository reference
```

### Azure DevOps Work Items

```text
@voce /azd-workitem #5678 What's the status of this task?
@voce /azd-workitem #5678+ Summarize the discussion
@voce /azd-workitem azdo:myorg/myproject #5678 Cross-org reference
```

## Setup

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
