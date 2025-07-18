// src/tools/EchoTool.ts - Example tool
import { BaseTool } from "./BaseTool";

export class EchoTool extends BaseTool {
  readonly name = "echo";
  readonly description = "Echo back the input message";
  readonly inputSchema = {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "Message to echo back",
      },
    },
    required: ["message"],
  };

  async execute(args: { message: string }): Promise<any> {
    return {
      content: [
        {
          type: "text",
          text: `Echo: ${args.message}`,
        },
      ],
    };
  }
}
