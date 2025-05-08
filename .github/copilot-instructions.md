This project is as Visual Studio Code extension. It is a TypeScript project.
The extension is a copilot chat extension for Visual Studio Code adding additional participants to the chat.
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
