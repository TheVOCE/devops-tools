import * as vscode from "vscode";

export interface ParsedCommand {
  command: string;
  azdoOrg?: string;
  azdoProject?: string;
  ghOwner?: string;
  ghRepo?: string;
  itemId: string;
  commentsUsage: boolean;
  confidence: number; // 0-1 scale indicating how confident the parser is
}

/**
 * Use LLM to parse user intent and extract structured data for DevOps commands
 * This is used as a fallback when regex parsing fails or when no explicit command is provided
 */
export async function parseLLMBasedCommand(
  prompt: string,
  model: vscode.LanguageModelChat,
  token: vscode.CancellationToken,
  stream: vscode.ChatResponseStream
): Promise<ParsedCommand | null> {
  try {
    stream.progress("🤖 Using AI to understand your request...");
    
    const systemPrompt = `You are a DevOps assistant that helps parse user requests for GitHub issues/PRs and Azure DevOps work items/PRs.

Your task is to analyze the user's prompt and extract structured information for DevOps operations.

Available commands:
- gh-issue: For GitHub issues
- gh-pullrequest: For GitHub pull requests  
- azd-workitem: For Azure DevOps work items
- azd-pullrequest: For Azure DevOps pull requests

Extract the following information:
- command: Which DevOps command the user likely wants (gh-issue, gh-pullrequest, azd-workitem, azd-pullrequest)
- itemId: The ID/number of the issue, PR, or work item (look for patterns like !123, #456, or just numbers)
- commentsUsage: Whether user wants to include comments (look for keywords like "comments", "discussion", "conversation", or + symbol)
- azdoOrg: Azure DevOps organization name (if mentioned)
- azdoProject: Azure DevOps project name (if mentioned)
- ghOwner: GitHub repository owner (if mentioned)
- ghRepo: GitHub repository name (if mentioned)
- confidence: How confident you are in this parsing (0.0 to 1.0)

Return ONLY a valid JSON object with this structure:
{
  "command": "string",
  "itemId": "string", 
  "commentsUsage": boolean,
  "azdoOrg": "string",
  "azdoProject": "string", 
  "ghOwner": "string",
  "ghRepo": "string",
  "confidence": number
}

If you cannot determine the command or itemId with reasonable confidence (>0.5), return null.

Examples:
User: "Show me work item 123" -> {"command": "azd-workitem", "itemId": "123", "commentsUsage": false, "confidence": 0.9}
User: "What's the status of GitHub issue 456 with comments?" -> {"command": "gh-issue", "itemId": "456", "commentsUsage": true, "confidence": 0.9}
User: "Pull request 789 from myorg/myrepo" -> {"command": "gh-pullrequest", "itemId": "789", "ghOwner": "myorg", "ghRepo": "myrepo", "commentsUsage": false, "confidence": 0.8}
User: "Azure DevOps task 321 in contoso/webapp project with discussion" -> {"command": "azd-workitem", "itemId": "321", "azdoOrg": "contoso", "azdoProject": "webapp", "commentsUsage": true, "confidence": 0.9}`;

    const messages = [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      vscode.LanguageModelChatMessage.User(`Parse this request: "${prompt}"`)
    ];

    const chatResponse = await model.sendRequest(messages, {}, token);
    let responseText = "";
    
    for await (const fragment of chatResponse.text) {
      responseText += fragment;
    }

    // Try to parse the JSON response
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        stream.progress("⚠️ Could not extract JSON from AI response");
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]) as ParsedCommand;
      
      // Validate required fields
      if (!parsed.command || !parsed.itemId || parsed.confidence === undefined) {
        stream.progress("⚠️ AI response missing required fields");
        return null;
      }

      // Check confidence threshold
      if (parsed.confidence < 0.5) {
        stream.progress("⚠️ AI confidence too low for parsing");
        return null;
      }

      // Validate command type
      const validCommands = ["gh-issue", "gh-pullrequest", "azd-workitem", "azd-pullrequest"];
      if (!validCommands.includes(parsed.command)) {
        stream.progress("⚠️ AI returned invalid command type");
        return null;
      }

      stream.progress(`✅ AI parsed: ${parsed.command} !${parsed.itemId} (confidence: ${Math.round(parsed.confidence * 100)}%)`);
      return parsed;

    } catch (parseError) {
      stream.progress("⚠️ Could not parse AI response as JSON");
      console.error("JSON parse error:", parseError);
      return null;
    }

  } catch (error) {
    stream.progress("⚠️ Error during AI parsing");
    console.error("LLM parsing error:", error);
    return null;
  }
}

/**
 * Check if regex-based parsing found valid results
 */
export function hasValidParseResults(parseResult: { itemId: string }): boolean {
  return parseResult.itemId !== "";
}