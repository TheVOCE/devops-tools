import * as vscode from "vscode";
import { parseLLMBasedCommand, hasValidParseResults, ParsedCommand } from "../llmBasedParser";

/**
 * Manual test for LLM-based parsing functionality
 * This is not an automated test but a validation script to verify the implementation
 */

// Mock stream for testing
class MockChatResponseStream implements vscode.ChatResponseStream {
  progress(value: string): void {
    console.log(`[PROGRESS]: ${value}`);
  }
  
  markdown(value: string): void {
    console.log(`[MARKDOWN]: ${value}`);
  }
  
  anchor(value: vscode.Uri, title?: string): vscode.ChatResponseAnchorPart {
    return { value, title };
  }
  
  button(command: vscode.Command): vscode.ChatResponseCommandButtonPart {
    return { value: command };
  }
  
  filetree(value: vscode.ChatResponseFileTree[], baseUri: vscode.Uri): vscode.ChatResponseFileTreePart {
    return { value, baseUri };
  }
  
  reference(value: vscode.Uri | vscode.Location, iconPath?: vscode.ThemeIcon | vscode.Uri): vscode.ChatResponseReferencePart {
    return { value, iconPath };
  }
  
  push(part: vscode.ChatResponsePart): vscode.ChatResponseStream {
    return this;
  }
}

// Mock language model for testing
class MockLanguageModelChat implements vscode.LanguageModelChat {
  id = "test-model";
  name = "test-model";
  vendor = "test";
  family = "test";
  version = "1.0";
  maxInputTokens = 4000;
  countTokens(): Thenable<number> {
    return Promise.resolve(0);
  }
  
  sendRequest(
    messages: vscode.LanguageModelChatMessage[],
    options?: vscode.LanguageModelChatRequestOptions,
    token?: vscode.CancellationToken
  ): Thenable<vscode.LanguageModelChatResponse> {
    // Simulate different responses based on the prompt
    const userMessage = messages.find(m => m.role === vscode.LanguageModelChatMessageRole.User);
    const content = userMessage?.content;
    let promptText = "";
    
    if (typeof content === 'string') {
      promptText = content;
    } else if (Array.isArray(content)) {
      promptText = content.map(part => {
        if (typeof part === 'string') {
          return part;
        }
        if ('value' in part) {
          return part.value;
        }
        return '';
      }).join(' ');
    }
    
    let responseText = "";
    
    if (promptText.includes("work item 123")) {
      responseText = '{"command": "azd-workitem", "itemId": "123", "commentsUsage": false, "confidence": 0.9}';
    } else if (promptText.includes("GitHub issue 456 with comments")) {
      responseText = '{"command": "gh-issue", "itemId": "456", "commentsUsage": true, "confidence": 0.9}';
    } else if (promptText.includes("pull request 789")) {
      responseText = '{"command": "gh-pullrequest", "itemId": "789", "commentsUsage": false, "confidence": 0.8}';
    } else {
      responseText = 'null';
    }
    
    const response: vscode.LanguageModelChatResponse = {
      text: (async function* () {
        yield responseText;
      })(),
      stream: (async function* () {
        yield { value: responseText };
      })()
    };
    
    return Promise.resolve(response);
  }
}

/**
 * Test cases for LLM parsing
 */
async function runTests() {
  console.log("=== LLM Parser Tests ===\n");
  
  const mockStream = new MockChatResponseStream();
  const mockModel = new MockLanguageModelChat();
  const mockToken: vscode.CancellationToken = {
    isCancellationRequested: false,
    onCancellationRequested: () => ({ dispose: () => {} })
  };
  
  const testCases = [
    {
      name: "Work Item Request",
      prompt: "Show me work item 123",
      expected: {
        command: "azd-workitem",
        itemId: "123",
        commentsUsage: false,
        confidence: 0.9
      }
    },
    {
      name: "GitHub Issue with Comments",
      prompt: "What's the status of GitHub issue 456 with comments?",
      expected: {
        command: "gh-issue",
        itemId: "456",
        commentsUsage: true,
        confidence: 0.9
      }
    },
    {
      name: "Pull Request",
      prompt: "Show me pull request 789",
      expected: {
        command: "gh-pullrequest",
        itemId: "789",
        commentsUsage: false,
        confidence: 0.8
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n--- Test: ${testCase.name} ---`);
    console.log(`Prompt: "${testCase.prompt}"`);
    
    try {
      const result = await parseLLMBasedCommand(
        testCase.prompt,
        mockModel,
        mockToken,
        mockStream
      );
      
      if (result) {
        console.log("✅ Parse successful:");
        console.log(`  Command: ${result.command}`);
        console.log(`  Item ID: ${result.itemId}`);
        console.log(`  Comments: ${result.commentsUsage}`);
        console.log(`  Confidence: ${result.confidence}`);
        
        // Validate against expected results
        const isValid = result.command === testCase.expected.command &&
                       result.itemId === testCase.expected.itemId &&
                       result.commentsUsage === testCase.expected.commentsUsage;
        
        if (isValid) {
          console.log("✅ Test PASSED");
        } else {
          console.log("❌ Test FAILED - Result doesn't match expected");
        }
      } else {
        console.log("❌ Parse failed - returned null");
      }
    } catch (error) {
      console.log(`❌ Test ERROR: ${error}`);
    }
  }
  
  // Test hasValidParseResults utility
  console.log("\n--- hasValidParseResults Tests ---");
  
  const validResult = { itemId: "123" };
  const invalidResult = { itemId: "" };
  
  console.log(`Valid result test: ${hasValidParseResults(validResult) ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Invalid result test: ${!hasValidParseResults(invalidResult) ? "✅ PASS" : "❌ FAIL"}`);
  
  console.log("\n=== Tests Complete ===");
}

// Export for potential use
export { runTests };

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}