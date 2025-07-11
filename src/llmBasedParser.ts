import path from "path";
import simpleGit from "simple-git";
import * as vscode from "vscode";
import { logInfo } from "./logging.js";

export interface ParsedCommand {
  command: string;
  azdoOrg?: string;
  azdoProject?: string;
  ghOwner?: string;
  ghRepo?: string;
  itemId: string;
  searchQuery?: string; // For title-based searches
  searchType?: 'id' | 'title'; // Indicates whether to search by ID or title
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
- itemId: The ID/number of the issue, PR, or work item. For ID-based searches, look for patterns like !123, #456, or just numbers, and set itemId to that number. For title-based searches, set itemId to an empty string and extract the search text into searchQuery.
- searchQuery: The title text to search for (only for title-based searches)
- searchType: "id" for ID-based searches, "title" for title-based searches
- commentsUsage: Whether user wants to include comments (look for keywords like "comments", "discussion", "conversation", or + symbol)
- azdoOrg: Azure DevOps organization name (if mentioned)
- azdoProject: Azure DevOps project name (if mentioned)
- ghOwner: GitHub repository owner (if mentioned)
- ghRepo: GitHub repository name (if mentioned)
- confidence: How confident you are in this parsing (0.0 to 1.0)

IMPORTANT SEARCH TYPE RULES:
- If user mentions !<number> or #<number> or just a specific number, use searchType: "id" and set itemId to that number
- If user asks to search, find, or look for PRs by title/name without specifying a number, use searchType: "title" and extract the search text into searchQuery
- For title searches, set itemId to empty string and put the search text in searchQuery

Return ONLY a valid JSON object with this structure:
{
  "command": "string",
  "itemId": "string", 
  "searchQuery": "string",
  "searchType": "id" | "title",
  "commentsUsage": boolean,
  "azdoOrg": "string",
  "azdoProject": "string", 
  "ghOwner": "string",
  "ghRepo": "string",
  "confidence": number
}

If you cannot determine the command with reasonable confidence (>0.5), return null.

Examples:
User: "Show me work item 123" -> {"command": "azd-workitem", "itemId": "123", "searchType": "id", "commentsUsage": false, "confidence": 0.9}
User: "What's the status of GitHub issue 456 with comments?" -> {"command": "gh-issue", "itemId": "456", "searchType": "id", "commentsUsage": true, "confidence": 0.9}
User: "Pull request 789 from myorg/myrepo" -> {"command": "gh-pullrequest", "itemId": "789", "searchType": "id", "ghOwner": "myorg", "ghRepo": "myrepo", "commentsUsage": false, "confidence": 0.8}
User: "Find pull requests with title containing bugfix" -> {"command": "gh-pullrequest", "itemId": "", "searchQuery": "bugfix", "searchType": "title", "commentsUsage": false, "confidence": 0.8}
User: "Search for PRs about authentication" -> {"command": "gh-pullrequest", "itemId": "", "searchQuery": "authentication", "searchType": "title", "commentsUsage": false, "confidence": 0.8}
User: "Show me !42" -> {"command": "gh-pullrequest", "itemId": "42", "searchType": "id", "commentsUsage": false, "confidence": 0.9}`;

    let gitRepoUrl = await getGitRepoUrl();

    const messages = [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      vscode.LanguageModelChatMessage.User(`Parse this request: "${prompt}. Opened file git repo url: ${gitRepoUrl}"`)
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
      if (!parsed.command || parsed.confidence === undefined) {
        stream.progress("⚠️ AI response missing required fields");
        return null;
      }

      // Validate that we have either itemId (for ID search) or searchQuery (for title search)
      if (!parsed.itemId && !parsed.searchQuery) {
        stream.progress("⚠️ AI response missing both itemId and searchQuery");
        return null;
      }

      // Set default searchType if not provided
      if (!parsed.searchType) {
        parsed.searchType = parsed.itemId ? 'id' : 'title';
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

      const searchInfo = parsed.searchType === 'title' 
        ? `"${parsed.searchQuery}"` 
        : `!${parsed.itemId}`;
      stream.progress(`✅ AI parsed: ${parsed.command} ${searchInfo} (confidence: ${Math.round(parsed.confidence * 100)}%)`);
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

async function getGitRepoUrl() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      console.error("No active editor found.");
      return;
    }
    
  const filePath = editor.document.uri.fsPath;
  const fileDirectory = path.dirname(filePath);

  logInfo("Get GitHub owner and repo name");
  const git = simpleGit(fileDirectory);
  const isRepo = await git.checkIsRepo();
  let repoUrl = "";
  if (isRepo) {
    const remotes = await git.getRemotes(true);
    if (remotes.length > 0) {
      repoUrl = remotes[0].refs.fetch;
    }
  }
  return repoUrl;
}

/**
 * Check if regex-based parsing found valid results
 * Also supports title-based searches from LLM parsing
 */
export function hasValidParseResults(parseResult: { itemId: string; searchQuery?: string }): boolean {
  return parseResult.itemId !== "" || (parseResult.searchQuery !== undefined && parseResult.searchQuery !== "");
}