import { MCPServer } from "./server/MCPServer";
import { config } from "./config/config";
import { logger } from "./utils/logger";

async function main() {
  try {
    const server = new MCPServer(config);
    await server.start();
    logger.info("MCP Server started successfully");
  } catch (error) {
    logger.error("Failed to start MCP Server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

main().catch((error) => {
  logger.error("Unhandled error:", error);
  process.exit(1);
});
