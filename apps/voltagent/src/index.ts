import { VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { createPinoLogger } from "@voltagent/logger";
import {
  createResumableStreamAdapter,
  createResumableStreamMemoryStore,
  createResumableStreamRedisStore,
} from "@voltagent/resumable-streams";
import {
  creativeFanoutWorkflow,
  creativeFanoutV2Workflow,
  imageEditingWorkflow,
} from "./workflows";
import {
  briefEnhancerAgent,
  creativeGeneratorAgent,
  creativeGeneratorArtDirectorAgent,
  creativeGeneratorBoldTrendAgent,
  creativeGeneratorMinimalLuxuryAgent,
  creativeGeneratorPackshotAgent,
  creativeGeneratorPerformanceAgent,
  creativeGeneratorUgcAgent,
  complianceSupervisorAgent,
  allInOneSupervisorAgent,
  allInOneImageGeneratorAgent,
  allInOneImageEditorAgent,
  allInOneHiveModerationAgent,
  allInOneOcrAgent,
  imageToTextAgent,
  hiveRiskAgent,
  historicalComplianceAgent,
  tavilySearchAgent,
  claimsCheckAgent,
  platformPolicyAgent,
  accessibilityAgent,
  visionTextAgent,
  visionLogoAgent,
  visionImagePropertiesAgent,
} from "./agents";
import { sharedMemory } from "./memory";

// Create logger (optional but recommended)
const logger = createPinoLogger({
  name: "voltagent-backend",
  level: "debug",
  pretty: true,
});

// Resumable streaming (Redis-backed). Requires a reachable REDIS_URL in production.
// If Redis is unreachable (common in local dev when using a private Railway host),
// we fall back to an in-memory store so the server can still start.
const streamStore = await (async () => {
  try {
    return await createResumableStreamRedisStore();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logger.warn(
      "Resumable streams: Redis store unreachable, falling back to in-memory store (resume won't survive restarts).",
      { err: message },
    );
    return await createResumableStreamMemoryStore();
  }
})();
const resumableStream = await createResumableStreamAdapter({ streamStore });

// Initialize VoltAgent with your agent(s)
new VoltAgent({
  agentMemory: sharedMemory, // Shared memory for all agents
  agents: {
    allInOneSupervisorAgent,
    allInOneImageGeneratorAgent,
    allInOneImageEditorAgent,
    allInOneHiveModerationAgent,
    allInOneOcrAgent,
  },
  workflows: {
    creativeFanoutWorkflow,
    creativeFanoutV2Workflow,
    imageEditingWorkflow,
  },
  server: honoServer({
    resumableStream: {
      adapter: resumableStream,

      defaultEnabled: true,
    },
  }),
  logger,
});
