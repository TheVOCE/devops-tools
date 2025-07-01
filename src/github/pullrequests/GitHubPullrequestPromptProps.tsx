import { BasePromptElementProps } from "@vscode/prompt-tsx";
import type { RequestHandlerContext } from "../../requestHandlerContext";


export interface GitHubPullrequestPromptProps extends BasePromptElementProps {
  requestHandlerContext: RequestHandlerContext;
  userPrompt: string;
}
