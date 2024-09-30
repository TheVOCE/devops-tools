# moved to [THEvoce](https://github.com/TheVOCE/devops-tools)

# VOCE-DevOps, a Vs-cOde Copilot Extension for DevOps

This an Visual Studio Code Extension enriching copilot with data GitHub issues etc..

## Usage

For referencing a GitHub Issue use the the `/issue` command and prepend an exclamationmark followed by the issue nummeber in your prompt: `!<issueNumber>`

E.g.
> [!NOTE]
> `/issue provide a implementation suggestion for solving **!1234** in C#`

When appending a `+` to the issue reference beside the issue description also all issue comments will be passed to copilot: `!<issueNumber>+`
E.g.
> [!TIP]
> `/issue provide a implementation suggestion for solving **!1234+** in C#`

Using `gh:<owner>/<repo>` you can specify the organization and repo you like to refer to, in case it's not the owner and repo of you current code context.

So a full example call may look like this:

> [!IMPORTANT]
> `@voce /issue gh:harrybin/vscode-copilot-extension provide a solution for !3+ in c#`

## Running the extension

- Run `npm install` in terminal to install dependencies
- Run the `Run Extension` target in the Debug View. This will:
  - Start a task `npm: watch` to compile the code
  - Run the extension in a new VS Code window

## Inspiration

This Extension is based on the chat sample of [vscode extension guides](https://github.com/microsoft/vscode-extension-samples/tree/main/chat-sample)
documented [here](https://code.visualstudio.com/api/extension-guides/chat)

### Authors

This vs-code copilot extension is created and maintained by [Nico Orschel](https://github.com/norschel) and [Harald Binkle](https://github.com/harrybin)
