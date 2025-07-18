// src/config/config.ts - Configuration management

import { ServerConfig } from "../types/config";

export const config: ServerConfig = {
  name: process.env.MCP_SERVER_NAME || "mcp-server-boilerplate",
  version: process.env.MCP_SERVER_VERSION || "1.0.0",
  port: parseInt(process.env.PORT || "3000", 10),
  logLevel: process.env.LOG_LEVEL || "info",
};
