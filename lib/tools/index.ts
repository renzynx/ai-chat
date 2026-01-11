export { calculatorTool } from "./calculator";
export { dateTimeTool } from "./date-time";
export { randomGeneratorTool } from "./random";
export { textUtilsTool } from "./text-utils";
export { webFetchTool } from "./web-fetch";
export { webSearchTool } from "./web-search";

import { calculatorTool } from "./calculator";
import { dateTimeTool } from "./date-time";
import { randomGeneratorTool } from "./random";
import { textUtilsTool } from "./text-utils";
import { webFetchTool } from "./web-fetch";
import { webSearchTool } from "./web-search";

export const tools = {
  webSearch: webSearchTool,
  webFetch: webFetchTool,
  calculator: calculatorTool,
  dateTime: dateTimeTool,
  randomGenerator: randomGeneratorTool,
  textUtils: textUtilsTool,
};
