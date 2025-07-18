import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ToolManager } from "./ToolManager";
import { ResourceManager } from "./ResourceManager";
import { logger } from "../utils/logger";
import { z } from "zod";
import { ServerConfig } from "../types/config";

export class MCPServer {
  private server: Server;
  private toolManager: ToolManager;
  private resourceManager: ResourceManager;

  constructor(private config: ServerConfig) {
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.toolManager = new ToolManager();
    this.resourceManager = new ResourceManager();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools

    const toolsListSchema = z.object({ method: z.literal("tools/list") });
    const toolsCallSchema = z.object({
      method: z.literal("tools/call"),
      params: z.object({
        name: z.string(),
        arguments: z.any(),
      }),
    });
    const resourcesListSchema = z.object({
      method: z.literal("resources/list"),
    });
    const resourcesReadSchema = z.object({
      method: z.literal("resources/read"),
      params: z.object({
        uri: z.string(),
      }),
    });

    this.server.setRequestHandler(toolsListSchema, async () => {
      return { tools: this.toolManager.listTools() };
    });

    // Handle tool calls
    this.server.setRequestHandler(toolsCallSchema, async (request) => {
      const { name, arguments: args } = request.params;
      return await this.toolManager.callTool(name, args);
    });

    // List available resources
    this.server.setRequestHandler(resourcesListSchema, async () => {
      return { resources: this.resourceManager.listResources() };
    });

    // Handle resource reads
    this.server.setRequestHandler(resourcesReadSchema, async (request) => {
      const { uri } = request.params;
      return await this.resourceManager.readResource(uri);
    });

    logger.info("MCP Server handlers configured");
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info(
      `MCP Server "${this.config.name}" v${this.config.version} running`
    );
  }
}
