# LLM-Based Command Parsing Demo

This document demonstrates how the new LLM-based command parsing works in the VOCE DevOps extension.

## Before the Enhancement

The extension only recognized specific syntax patterns:
- `!123` for work item/issue IDs
- `!123+` for including comments
- `azdo:org/project` for Azure DevOps context
- `gh:owner/repo` for GitHub context
- Required explicit commands like `/azd-workitem` or `/gh-issue`

## After the Enhancement

The extension now uses AI to understand natural language requests and can parse:

### Scenario 1: No Command Provided
**User input:** "Show me work item 123"
**AI parsing:** 
```json
{
  "command": "azd-workitem",
  "itemId": "123", 
  "commentsUsage": false,
  "confidence": 0.9
}
```
**Result:** Extension automatically routes to Azure DevOps work item handler

### Scenario 2: Command with Incorrect Syntax
**User input:** `/azd-workitem tell me about task 456 with all the discussions`
**Regex parsing:** Fails to find `!456` pattern
**AI parsing:**
```json
{
  "command": "azd-workitem",
  "itemId": "456",
  "commentsUsage": true,
  "confidence": 0.85
}
```
**Result:** Extension understands user wants work item 456 with comments

### Scenario 3: Complex Context
**User input:** "What's the latest on GitHub issue 789 from microsoft/vscode repository?"
**AI parsing:**
```json
{
  "command": "gh-issue",
  "itemId": "789",
  "ghOwner": "microsoft",
  "ghRepo": "vscode",
  "commentsUsage": false,
  "confidence": 0.9
}
```
**Result:** Extension formats as `!789 gh:microsoft/vscode` for existing parsers

## How It Works

1. **Fallback Detection**: When no command is provided OR when regex parsing fails to find required info
2. **LLM Analysis**: Send user prompt to language model with structured prompt for parsing
3. **JSON Response**: LLM returns structured data with command type, IDs, and metadata
4. **Validation**: Check confidence threshold (>0.5) and validate command types
5. **Prompt Formatting**: Convert parsed data back to expected format for existing handlers
6. **Command Routing**: Route to appropriate handler based on parsed command

## Benefits

- **Natural Language Support**: Users can ask questions naturally
- **Backward Compatibility**: Existing syntax still works
- **Intelligent Fallback**: AI helps when syntax is unclear
- **Confidence Scoring**: Only act on high-confidence parsing
- **Error Handling**: Graceful fallback to regular chat if parsing fails

## Code Organization

- `llmBasedParser.ts`: Core LLM parsing logic
- `extension.ts`: Integration with main command handler  
- `azDevOpsUtils.ts` & `gitHubUtils.ts`: Silent parsing functions
- `test/llmParserTest.ts`: Test cases and mock implementations