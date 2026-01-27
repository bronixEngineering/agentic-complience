import { andAll, andThen, createWorkflowChain } from "@voltagent/core";
import { Output } from "ai";
import { z } from "zod";

import {
  briefEnhancerAgent,
  creativeGeneratorArtDirectorAgent,
  creativeGeneratorBoldTrendAgent,
  creativeGeneratorMinimalLuxuryAgent,
  creativeGeneratorPackshotAgent,
  creativeGeneratorPerformanceAgent,
  creativeGeneratorUgcAgent,
} from "../agents";

const personaIds = [
  "creative-generator-performance",
  "creative-generator-artdirector",
  "creative-generator-packshot",
  "creative-generator-ugc",
  "creative-generator-minimal-luxury",
  "creative-generator-bold-trend",
] as const;

type PersonaId = (typeof personaIds)[number];

const enhancedBriefSchema = z.object({
  brief_type: z.enum(["product", "app"]),
  product: z.object({}).passthrough(),
  goal: z.object({}).passthrough(),
  target_audience: z.object({}).passthrough(),
  usp: z.string(),
  offer: z.object({}).passthrough(),
  placements: z.array(z.object({}).passthrough()),
  visual_direction: z.object({}).passthrough(),
  must_haves: z.array(z.string()),
  must_avoid: z.array(z.string()),
  cta_intent: z.string(),
  references: z.array(z.string()),
  assumptions: z.array(z.string()),
  questions: z.array(z.string()),
});

const promptSchema = z
  .object({
    product: z.object({}).passthrough(),
    composition: z.object({}).passthrough(),
    scene: z.object({}).passthrough(),
    lighting: z.object({}).passthrough(),
    camera: z.object({}).passthrough(),
    style: z.object({}).passthrough(),
    subject: z.object({}).passthrough().optional(),
    rules: z.array(z.string()),
  })
  .passthrough();

function buildPersonaPrompt(enhancedBrief: unknown, clarifications?: string) {
  const briefJson = JSON.stringify(enhancedBrief);
  const clarificationsBlock =
    typeof clarifications === "string" && clarifications.trim().length > 0
      ? `\n\nUser clarifications (free text):\n${clarifications.trim()}`
      : "";

  return `Generate a Nano Banana Pro v2 prompt JSON for an Instagram/Facebook product ad.\n\nUse this enhanced brief JSON as the source of truth:\n${briefJson}${clarificationsBlock}\n\nReturn only the prompt JSON object. No wrappers, no explanations, no markdown.`;
}

function selectedPersonas(input?: readonly PersonaId[]) {
  if (!input || input.length === 0) return [...personaIds];
  // Keep order stable and ignore unknowns (schema should prevent unknowns, but be safe)
  return personaIds.filter((id) => input.includes(id));
}

const personaAgentById: Record<PersonaId, typeof creativeGeneratorPerformanceAgent> = {
  "creative-generator-performance": creativeGeneratorPerformanceAgent,
  "creative-generator-artdirector": creativeGeneratorArtDirectorAgent,
  "creative-generator-packshot": creativeGeneratorPackshotAgent,
  "creative-generator-ugc": creativeGeneratorUgcAgent,
  "creative-generator-minimal-luxury": creativeGeneratorMinimalLuxuryAgent,
  "creative-generator-bold-trend": creativeGeneratorBoldTrendAgent,
};

function keyForPersona(personaId: PersonaId) {
  // Avoid hyphens in keys; keep deterministic for aggregation.
  return `prompt_${personaId.replaceAll("-", "_")}`;
}

export const creativeFanoutWorkflow = createWorkflowChain({
  id: "creative-fanout",
  name: "Creative Fan-out (Enhance → Suspend/Resume → Personas)",
  purpose:
    "Enhance a messy ad brief, suspend for clarifications if needed, then fan-out to persona creative agents to generate Nano Banana prompt JSONs.",
  input: z.object({
    brief: z.string().min(1),
    personas: z.array(z.enum(personaIds)).optional(),
  }),
  suspendSchema: z.object({
    questions: z.array(z.string()),
    enhancedBrief: enhancedBriefSchema,
  }),
  resumeSchema: z.object({
    answersText: z.string(),
  }),
  result: z.object({
    enhancedBrief: enhancedBriefSchema,
    clarifications: z.string().optional(),
    prompts: z.array(
      z.object({
        personaId: z.enum(personaIds),
        prompt: promptSchema,
      })
    ),
  }),
})
  .andThen({
    id: "enhance-brief",
    execute: async ({ data }) => {
      const res = await briefEnhancerAgent.generateText(
        `Enhance and normalize this ad brief into a structured JSON with fixed top-level keys.\nReturn only JSON.\n\nRAW BRIEF:\n${data.brief}`,
        {
          output: Output.object({ schema: enhancedBriefSchema }),
          maxOutputTokens: 1200,
        }
      );

      return { enhancedBrief: res.output };
    },
  })
  .andThen({
    id: "clarification-gate",
    execute: async ({ data, suspend, resumeData }) => {
      const questions = data.enhancedBrief.questions ?? [];
      const answersText =
        typeof (resumeData as { answersText?: unknown } | undefined)?.answersText === "string"
          ? (resumeData as { answersText: string }).answersText.trim()
          : "";

      if (questions.length > 0 && answersText.length === 0) {
        await suspend("needs_clarification", {
          questions,
          enhancedBrief: data.enhancedBrief,
        });
      }

      if (answersText.length > 0) {
        return { ...data, clarifications: answersText };
      }

      return data;
    },
  })
  .andAll({
    id: "persona-fanout",
    steps: personaIds.map((personaId) =>
      andThen({
        id: `generate-${personaId}`,
        execute: async ({ data }) => {
          const personas = selectedPersonas(data.personas);
          if (!personas.includes(personaId)) return {};

          const agent = personaAgentById[personaId];
          const res = await agent.generateText(
            buildPersonaPrompt(data.enhancedBrief, data.clarifications),
            {
              output: Output.object({ schema: promptSchema }),
              maxOutputTokens: 1600,
            }
          );

          return { [keyForPersona(personaId)]: res.output };
        },
      })
    ),
  })
  .andThen({
    id: "aggregate",
    execute: async ({ data }) => {
      const personas = selectedPersonas(data.personas);
      const prompts = personas
        .map((personaId) => {
          const key = keyForPersona(personaId);
          const prompt = (data as Record<string, unknown>)[key];
          if (!prompt || typeof prompt !== "object") return null;
          return { personaId, prompt };
        })
        .filter(Boolean) as Array<{ personaId: PersonaId; prompt: z.infer<typeof promptSchema> }>;

      return {
        enhancedBrief: data.enhancedBrief,
        clarifications: data.clarifications,
        prompts,
      };
    },
  });

