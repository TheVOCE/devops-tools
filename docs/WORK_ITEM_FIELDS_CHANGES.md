# Azure DevOps Work Item Fields Enhancement

## Summary

This enhancement implements the requirement to use Acceptance Criteria and special handling for bugs in Azure DevOps work items.

## Changes Made

### For All Work Items
- **Acceptance Criteria**: Added support for `Microsoft.VSTS.Common.AcceptanceCriteria` field
- The acceptance criteria is now displayed in both the UI and included in the LLM prompt context
- When acceptance criteria is available, it's shown in a dedicated section

### For Bug Work Items Specifically
- **Repro Steps**: Bug work items now use `Microsoft.VSTS.TCM.ReproSteps` instead of the `System.Description` field
- The UI displays "Repro Steps" section instead of "Description" for bugs
- The LLM prompt uses repro steps context instead of description for bugs

## Technical Implementation

### Files Modified

1. **`src/azd/workitems/azDevOpsWorkItemFunctions.ts`**
   - Updated `StateFullWorkItemInStream()` function to handle bug-specific display logic
   - Updated `StateMultipleWorkItemsInStream()` for consistent field handling  
   - Enhanced WIQL query to retrieve acceptance criteria and repro steps fields
   - Updated work item transformation to include new fields
   - Enhanced mock data to include new fields for testing

2. **`src/azd/workitems/AzDevOpsWorkItemsPrompt.tsx`**
   - Updated prompt construction to include appropriate context based on work item type
   - For bugs: uses repro steps in the prompt instead of description
   - For all work items: includes acceptance criteria when available

### Field Mapping

| Work Item Type | Primary Content Field | Additional Fields |
|----------------|----------------------|-------------------|
| Bug | `Microsoft.VSTS.TCM.ReproSteps` | `Microsoft.VSTS.Common.AcceptanceCriteria` |
| All Others | `System.Description` | `Microsoft.VSTS.Common.AcceptanceCriteria` |

### Display Logic

```typescript
// For bugs, use repro steps instead of description
if (workItemType.toLowerCase() === "bug") {
  if (reproSteps) {
    stream.markdown("**Repro Steps:**\n");
    stream.markdown(reproSteps.replaceAll("\n", "\n> ") + "\n\n");
  }
} else {
  // For non-bugs, use description
  if (description) {
    stream.markdown("**Description:**\n");
    stream.markdown(description.replaceAll("\n", "\n> ") + "\n\n");
  }
}

// Always include acceptance criteria if available
if (acceptanceCriteria) {
  stream.markdown("**Acceptance Criteria:**\n");
  stream.markdown(acceptanceCriteria.replaceAll("\n", "\n> ") + "\n\n");
}
```

## Testing

Created comprehensive tests to validate the implementation:

1. **`src-tests/workItemFieldsTest.ts`** - Basic field handling validation
2. **`src-tests/workItemHandlingIntegrationTest.ts`** - Integration test with mock data

Both tests pass and confirm:
- Bug work items use repro steps instead of description
- Non-bug work items use description
- All work items include acceptance criteria when available
- Prompt construction works correctly for both scenarios

## Benefits

1. **Better Context for Bugs**: Using repro steps provides more actionable information for bug analysis and resolution
2. **Enhanced Requirements Understanding**: Acceptance criteria provides clear success criteria for all work items
3. **Consistent Experience**: All work item types now include acceptance criteria information
4. **Improved LLM Responses**: More relevant context leads to better AI assistance

## Backward Compatibility

The changes are fully backward compatible:
- Work items without acceptance criteria still work normally
- Bug work items without repro steps fall back gracefully
- Existing work item IDs and URLs continue to work
- No breaking changes to the API or user interface