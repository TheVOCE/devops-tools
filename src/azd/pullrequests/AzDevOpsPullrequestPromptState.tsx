import type { AzDevOpsResult } from "../AzDevOpsResult";


export interface AzDevOpsPullrequestPromptState {
  azdoResult?: AzDevOpsResult;
  azdoResults?: AzDevOpsResult[];
  searchType?: 'id' | 'title';
  searchQuery?: string;
}
