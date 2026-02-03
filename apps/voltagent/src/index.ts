import { VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { createPinoLogger } from "@voltagent/logger";
import { creativeFanoutWorkflow, creativeFanoutV2Workflow, imageEditingWorkflow } from "./workflows";
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
  imageToTextAgent,
  hiveRiskAgent,
  historicalComplianceAgent,
  tavilySearchAgent,
  claimsCheckAgent,
  platformPolicyAgent,
  accessibilityAgent,
} from "./agents";

// Create logger (optional but recommended)
const logger = createPinoLogger({
  name: "voltagent-backend",
  level: "info",
});

// Initialize VoltAgent with your agent(s)
new VoltAgent({
  agents: {
    briefEnhancerAgent,
    creativeGeneratorAgent,
    creativeGeneratorPerformanceAgent,
    creativeGeneratorArtDirectorAgent,
    creativeGeneratorPackshotAgent,
    creativeGeneratorUgcAgent,
    creativeGeneratorMinimalLuxuryAgent,
    creativeGeneratorBoldTrendAgent,
    complianceSupervisorAgent,
    imageToTextAgent,
    hiveRiskAgent,
    historicalComplianceAgent,
    tavilySearchAgent,
    claimsCheckAgent,
    platformPolicyAgent,
    accessibilityAgent,
  },
  workflows: {
    creativeFanoutWorkflow,
    creativeFanoutV2Workflow,
    imageEditingWorkflow,
  },
  server: honoServer(), // Default port: 3141
  logger,
});
