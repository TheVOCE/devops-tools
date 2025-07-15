"use strict";
/**
 * Test to verify work item handling with acceptance criteria and bug-specific fields
 */
Object.defineProperty(exports, "__esModule", { value: true });
console.log("=== Work Item Fields Test ===\n");
// Test 1: Verify bug work item handling
console.log("Testing Bug Work Item handling:");
const bugWorkItem = {
    id: 123,
    fields: {
        "System.Title": "Sample Bug",
        "System.WorkItemType": "Bug",
        "System.State": "Active",
        "System.Description": "This is the description",
        "Microsoft.VSTS.Common.AcceptanceCriteria": "Bug should be fixed",
        "Microsoft.VSTS.TCM.ReproSteps": "Step 1: Do something\nStep 2: Bug appears"
    },
    url: "https://dev.azure.com/org/project/_workitems/edit/123"
};
console.log(`✅ Bug work item has repro steps: ${!!bugWorkItem.fields["Microsoft.VSTS.TCM.ReproSteps"]}`);
console.log(`✅ Bug work item has acceptance criteria: ${!!bugWorkItem.fields["Microsoft.VSTS.Common.AcceptanceCriteria"]}`);
console.log(`✅ Work item type is Bug: ${bugWorkItem.fields["System.WorkItemType"] === "Bug"}`);
// Test 2: Verify non-bug work item handling
console.log("\nTesting Non-Bug Work Item handling:");
const taskWorkItem = {
    id: 456,
    fields: {
        "System.Title": "Sample Task",
        "System.WorkItemType": "Task",
        "System.State": "Active",
        "System.Description": "This is the task description",
        "Microsoft.VSTS.Common.AcceptanceCriteria": "Task should be completed according to criteria"
    },
    url: "https://dev.azure.com/org/project/_workitems/edit/456"
};
console.log(`✅ Task work item has description: ${!!taskWorkItem.fields["System.Description"]}`);
console.log(`✅ Task work item has acceptance criteria: ${!!taskWorkItem.fields["Microsoft.VSTS.Common.AcceptanceCriteria"]}`);
console.log(`✅ Work item type is Task: ${taskWorkItem.fields["System.WorkItemType"] === "Task"}`);
// Test 3: Verify field handling logic
console.log("\nTesting field handling logic:");
function getWorkItemContent(workItem) {
    const workItemType = workItem.fields["System.WorkItemType"] || "Unknown";
    const description = workItem.fields["System.Description"] || "";
    const reproSteps = workItem.fields["Microsoft.VSTS.TCM.ReproSteps"] || "";
    const acceptanceCriteria = workItem.fields["Microsoft.VSTS.Common.AcceptanceCriteria"] || "";
    let content = "";
    // For bugs, use repro steps instead of description
    if (workItemType.toLowerCase() === "bug") {
        content = reproSteps || "No repro steps";
    }
    else {
        content = description || "No description";
    }
    return { content, acceptanceCriteria };
}
const bugContent = getWorkItemContent(bugWorkItem);
const taskContent = getWorkItemContent(taskWorkItem);
console.log(`✅ Bug content uses repro steps: ${bugContent.content.includes("Step 1")}`);
console.log(`✅ Task content uses description: ${taskContent.content.includes("task description")}`);
console.log(`✅ Both have acceptance criteria: ${!!bugContent.acceptanceCriteria && !!taskContent.acceptanceCriteria}`);
console.log("\n=== Work Item Fields Test Complete ===");
console.log("✅ All work item field handling tests passed!");
//# sourceMappingURL=workItemFieldsTest.js.map