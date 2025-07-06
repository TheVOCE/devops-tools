import { BasePromptElementProps } from "@vscode/prompt-tsx";
import type { RequestHandlerContext } from "../../requestHandlerContext";


export interface AzDevOpsPullrequestPromptProps extends BasePromptElementProps {
  requestHandlerContext: RequestHandlerContext;
  userPrompt: string;
}
