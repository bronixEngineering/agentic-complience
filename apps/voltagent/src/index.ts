import { VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { createPinoLogger } from "@voltagent/logger";
import { briefEnhancerAgent, creativeGeneratorAgent, exampleAgent } from "./agents";

// Create logger (optional but recommended)
const logger = createPinoLogger({
  name: "voltagent-backend",
  level: "info",
});

// Initialize VoltAgent with your agent(s)
new VoltAgent({
  agents: { exampleAgent, creativeGeneratorAgent, briefEnhancerAgent },
  server: honoServer(), // Default port: 3141
  logger,
});
