// src/server/ToolManager.ts - Manages all tools
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { BaseTool } from "../tools/BaseTool";
import { logger } from "../utils/logger";
import { EchoTool } from "../tools/EchoTool";
import { FileReadTool } from "../tools/FileReadTool";

export class ToolManager {
  private tools: Map<string, BaseTool> = new Map();

  constructor() {
    this.registerTools();
  }

  private registerTools(): void {
    const tools = [
      new EchoTool(),
      new FileReadTool(),
      // Add more tools here
    ];

    tools.forEach((tool) => {
      this.tools.set(tool.name, tool);
      logger.info(`Registered tool: ${tool.name}`);
    });
  }

  listTools(): Tool[] {
    return Array.from(this.tools.values()).map((tool) => tool.getDefinition());
  }

  async callTool(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    logger.info(`Calling tool: ${name}`);
    return await tool.execute(args);
  }
}
