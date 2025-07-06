# VOCE-DevOps - Vs-cOde Copilot Extension

This project is as Visual Studio Code extension for GitHub Copilot whichs helps users interacting with DevOps platforms like Azure DevOps and GitHub. 
It is a TypeScript project. The extension is a copilot chat extension for Visual Studio Code adding additional participants to the chat.

## Example code from GitHub
You can find more information about how to create such an extension [here](https://code.visualstudio.com/api/extension-guides/chat-tutorial).
This Extension is based on the chat sample of [vscode extension guides](https://github.com/microsoft/vscode-extension-samples/tree/main/chat-sample)
Refer to that sample for more information about how to create a chat extension:

- [package.json](https://raw.githubusercontent.com/microsoft/vscode-extension-samples/refs/heads/main/chat-sample/package.json)
  - keep using the js module format for the extension, as the chat sample does.
  - when updating packages in the package.json, make sure to update the version according to the sample.
- [tsconfig.json](https://raw.githubusercontent.com/microsoft/vscode-extension-samples/refs/heads/main/chat-sample/tsconfig.json)
  - keep the same configuration as the chat sample.
- [src/extension.ts](https://raw.githubusercontent.com/microsoft/vscode-extension-samples/refs/heads/main/chat-sample/src/extension.ts)
  - use this as example implementation for the extension entry point.
- [src/simple.ts](https://raw.githubusercontent.com/microsoft/vscode-extension-samples/refs/heads/main/chat-sample/src/simple.ts)
  - use this as example implementation for a simple participant.
- [src/toolParticipant.ts](https://raw.githubusercontent.com/microsoft/vscode-extension-samples/refs/heads/main/chat-sample/src/toolParticipant.ts)
  - use this as example implementation for a tool participant.

## Interacting with Azure DevOps
- Use Azure DevOps Client for Node.js for interacting with AzDo

## Functional requirements
- Don't use # or @ for parsing pull request id's, work item id' or issue id's from users prompt. Stick with ! as prefix and + for retrieving comments.
- Keep the name "VOCE-DevOps - Vs-cOde Copilot Extension" and don't try to change it

## Repo structure
- `src/` - contains the source code of the extension
- 'docs/' - contains the documentation of the extension
- `README.md` - contains the readme of the extension
- 'src-tests/' - contains the tests of the extension
- 'build/' - contains the build scripts of the extension