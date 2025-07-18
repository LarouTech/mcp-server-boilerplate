import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Tool,
  Resource,
  TextContent,
  ImageContent,
  EmbeddedResource,
} from "@modelcontextprotocol/sdk/types.js";

// Types for better type safety
interface ToolHandler {
  name: string;
  description: string;
  inputSchema: object;
  handler: (args: any) => Promise<any>;
}

interface ResourceHandler {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  handler: () => Promise<string | Buffer>;
}

interface ServerConfig {
  name: string;
  version: string;
  description?: string;
  tools: ToolHandler[];
  resources: ResourceHandler[];
}

class MCPServer {
  private server: Server;
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: config.tools.length > 0 ? {} : undefined,
          resources: config.resources.length > 0 ? {} : undefined,
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.config.tools.map(
          (tool): Tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          })
        ),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const tool = this.config.tools.find((t) => t.name === name);
      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      try {
        const result = await tool.handler(args || {});
        return {
          content: [
            {
              type: "text",
              text:
                typeof result === "string"
                  ? result
                  : JSON.stringify(result, null, 2),
            } as TextContent,
          ],
        };
      } catch (error) {
        throw new Error(
          `Tool execution failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: this.config.resources.map(
          (resource): Resource => ({
            uri: resource.uri,
            name: resource.name,
            description: resource.description,
            mimeType: resource.mimeType,
          })
        ),
      };
    });

    // Handle resource reads
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        const { uri } = request.params;

        const resource = this.config.resources.find((r) => r.uri === uri);
        if (!resource) {
          throw new Error(`Unknown resource: ${uri}`);
        }

        try {
          const content = await resource.handler();
          return {
            contents: [
              {
                uri: resource.uri,
                mimeType: resource.mimeType,
                text:
                  typeof content === "string" ? content : content.toString(),
              } as EmbeddedResource,
            ],
          };
        } catch (error) {
          throw new Error(
            `Resource read failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    );
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`${this.config.name} MCP server running on stdio`);
  }

  async stop(): Promise<void> {
    await this.server.close();
  }
}

// Example tool implementations
const exampleTools: ToolHandler[] = [
  {
    name: "echo",
    description: "Echo back the input message",
    inputSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "The message to echo back",
        },
      },
      required: ["message"],
    },
    handler: async (args: { message: string }) => {
      return `Echo: ${args.message}`;
    },
  },
  {
    name: "add_numbers",
    description: "Add two numbers together",
    inputSchema: {
      type: "object",
      properties: {
        a: {
          type: "number",
          description: "First number",
        },
        b: {
          type: "number",
          description: "Second number",
        },
      },
      required: ["a", "b"],
    },
    handler: async (args: { a: number; b: number }) => {
      return {
        result: args.a + args.b,
        operation: `${args.a} + ${args.b} = ${args.a + args.b}`,
      };
    },
  },
  {
    name: "current_time",
    description: "Get the current time",
    inputSchema: {
      type: "object",
      properties: {
        format: {
          type: "string",
          description: "Time format (iso, locale, or timestamp)",
          enum: ["iso", "locale", "timestamp"],
        },
      },
    },
    handler: async (args: { format?: string }) => {
      const now = new Date();
      switch (args.format) {
        case "iso":
          return now.toISOString();
        case "locale":
          return now.toLocaleString();
        case "timestamp":
          return now.getTime();
        default:
          return now.toISOString();
      }
    },
  },
];

// Example resource implementations
const exampleResources: ResourceHandler[] = [
  {
    uri: "info://server/status",
    name: "Server Status",
    description: "Current server status and information",
    mimeType: "application/json",
    handler: async () => {
      return JSON.stringify(
        {
          status: "running",
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: process.version,
          platform: process.platform,
        },
        null,
        2
      );
    },
  },
  {
    uri: "info://server/config",
    name: "Server Configuration",
    description: "Server configuration information",
    mimeType: "application/json",
    handler: async () => {
      return JSON.stringify(
        {
          name: "Example MCP Server",
          version: "1.0.0",
          capabilities: ["tools", "resources"],
          toolCount: exampleTools.length,
          resourceCount: exampleResources.length,
        },
        null,
        2
      );
    },
  },
];

// Create and configure the server
const serverConfig: ServerConfig = {
  name: "example-mcp-server",
  version: "1.0.0",
  description: "A reusable TypeScript MCP server boilerplate",
  tools: exampleTools,
  resources: exampleResources,
};

// Main execution
async function main(): Promise<void> {
  const server = new MCPServer(serverConfig);

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    console.error("Received SIGINT, shutting down gracefully...");
    await server.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.error("Received SIGTERM, shutting down gracefully...");
    await server.stop();
    process.exit(0);
  });

  await server.start();
}

// Run the server
if (require.main === module) {
  main().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}

export { MCPServer, ToolHandler, ResourceHandler, ServerConfig };
