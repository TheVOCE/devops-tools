import { AzDevOpsComment } from "./AzDevOpsComment";

export interface AzDevOpsResult {
  comments: AzDevOpsComment[];
  data?: {
    id: number;
    fields: {
      [key: string]: any;
      "System.Title": string;
      "System.Description"?: string;
      "System.State": string;
      "System.WorkItemType": string;
    };
    url?: string;
  };
}
