import { GitHubComment } from "./GitHubComment";


export interface GitHubResult {
  comments: GitHubComment[];
  data?: {
    title: string;
    body: string;
    html_url: string;
    state: string;
    reason: string;
  };
}
