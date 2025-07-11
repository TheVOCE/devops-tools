import type { GitHubResult } from "../GitHubResult";


export interface GitHubPullrequestPromptState {
  ghResult?: GitHubResult;
  ghResults?: GitHubResult[];
  searchType: 'id' | 'title';
  searchQuery?: string;
}
