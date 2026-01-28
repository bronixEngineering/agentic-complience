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
import { nanoBananaProTool } from "../tools";

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
    subject: z.object({}).passthrough().nullable(),
    rules: z.array(z.string()),
  })
  .passthrough();

function buildPersonaPrompt(enhancedBrief: unknown, clarifications?: string) {
  const briefObj = enhancedBrief as Record<string, unknown>;
  const briefJson = JSON.stringify(enhancedBrief, null, 2);
  const clarificationsBlock =
    typeof clarifications === "string" && clarifications.trim().length > 0
      ? `\n\nUser clarifications (free text):\n${clarifications.trim()}`
      : "";

  // Extract dynamic information from brief to guide the prompt
  const productInfo = briefObj.product as Record<string, unknown> | undefined;
  const visualDirection = briefObj.visual_direction as Record<string, unknown> | undefined;
  const targetAudience = briefObj.target_audience as Record<string, unknown> | undefined;
  const usp = typeof briefObj.usp === 'string' ? briefObj.usp : '';
  const placements = Array.isArray(briefObj.placements) ? briefObj.placements : [];
  const mustHaves = Array.isArray(briefObj.must_haves) ? briefObj.must_haves : [];
  const mustAvoid = Array.isArray(briefObj.must_avoid) ? briefObj.must_avoid : [];

  // Build dynamic guidance based on brief content
  let dynamicGuidance = '';
  
  if (productInfo && Object.keys(productInfo).length > 0) {
    const productKeys = Object.keys(productInfo);
    dynamicGuidance += `\n\nProduct information from brief:\n${JSON.stringify(productInfo, null, 2)}\nUse this to populate the "product" field with detailed properties like: category, variant, hero_feature, material, color, origin, etc.`;
  } else {
    dynamicGuidance += `\n\nProduct: Infer product details from the brief context (${usp || 'brief content'}).`;
  }

  if (visualDirection && Object.keys(visualDirection).length > 0) {
    dynamicGuidance += `\n\nVisual direction from brief:\n${JSON.stringify(visualDirection, null, 2)}\nUse this to inform composition, scene, lighting, camera, and style fields.`;
  } else {
    dynamicGuidance += `\n\nVisual direction: Create appropriate visual direction based on the product type and target audience.`;
  }

  if (targetAudience && Object.keys(targetAudience).length > 0) {
    dynamicGuidance += `\n\nTarget audience from brief:\n${JSON.stringify(targetAudience, null, 2)}\nUse this to inform style, mood, and scene choices.`;
  }

  if (placements.length > 0) {
    const aspectRatios = placements
      .map((p: unknown) => {
        const placement = p as Record<string, unknown>;
        const format = placement['format/aspect_ratio'] || placement.format || placement.aspect_ratio;
        return typeof format === 'string' ? format : null;
      })
      .filter(Boolean);
    
    if (aspectRatios.length > 0) {
      dynamicGuidance += `\n\nPlacements: ${aspectRatios.join(', ')} - optimize composition for these aspect ratios.`;
    }
  }

  if (mustHaves.length > 0) {
    dynamicGuidance += `\n\nMust haves: ${mustHaves.join(', ')} - ensure these are reflected in your prompt.`;
  }

  if (mustAvoid.length > 0) {
    dynamicGuidance += `\n\nMust avoid: ${mustAvoid.join(', ')} - ensure these are NOT in your prompt.`;
  }

  const isBriefEmpty = 
    (!briefObj.usp || (typeof briefObj.usp === 'string' && briefObj.usp.trim() === "")) &&
    (!briefObj.product || (typeof briefObj.product === 'object' && Object.keys(briefObj.product).length === 0));

  const emptyBriefWarning = isBriefEmpty 
    ? `\n\n⚠️ WARNING: The enhanced brief appears to be empty or incomplete. Use your best judgment to infer the product details from the original brief context and generate a complete, detailed prompt JSON.`
    : "";

  return `You are generating a Nano Banana Pro v2 prompt JSON for an Instagram/Facebook product ad.

Enhanced brief JSON:
${briefJson}${clarificationsBlock}${emptyBriefWarning}${dynamicGuidance}

🚨 CRITICAL REQUIREMENTS:
1. Your response will be REJECTED if ANY field is an empty object {} or empty string ""
2. EVERY object field MUST contain at least 2-3 properties with non-empty string values
3. EVERY string property MUST be descriptive and specific (minimum 3-5 words)
4. Use the brief information above to populate fields - extract details from product, visual_direction, target_audience, etc.
5. If brief information is missing, infer reasonable, detailed values based on the product type and context

REQUIRED JSON STRUCTURE (fill EVERY field with specific details based on the brief):
{
  "product": {
    // Extract from brief.product or infer from brief context
    // Minimum 3-4 properties: category, variant, hero_feature, material, color, origin, etc.
  },
  "composition": {
    // Extract from brief.visual_direction.composition or infer
    // Minimum 4 properties: framing, product_placement, negative_space, aspect_ratio, angle
  },
  "scene": {
    // Extract from brief.visual_direction.scene/props/location or infer
    // Minimum 3-4 properties: background, props, location, atmosphere
  },
  "lighting": {
    // Extract from brief.visual_direction.lighting or infer
    // Minimum 3-4 properties: style, temperature, direction, intensity, shadows
  },
  "camera": {
    // Infer based on product type and composition needs
    // Minimum 3 properties: lens, dof, focal_length, perspective
  },
  "style": {
    // Extract from brief.visual_direction.mood/palette or infer from target_audience
    // Minimum 3-4 properties: vibe, palette, aesthetic, mood
  },
  "subject": null or {
    // Include only if brief mentions people/models
    // Properties: type, pose, clothing
  },
  "rules": [
    // Include brief.must_haves as rules
    // Add brand-safety rules
    // Minimum 2-3 rules
  ]
}

Return ONLY the JSON object. No markdown, no code fences, no explanations.`;
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


/**
 * Converts a structured prompt object to a natural language prompt string.
 */
function convertStructuredPromptToText(prompt: Record<string, unknown>): string {
  const parts: string[] = [];
  const { product, composition, scene, lighting, camera, style, subject } = prompt;

  // Helper to safely join object values
  const joinValues = (obj: unknown, keys: string[]) => {
    if (!obj || typeof obj !== "object") return "";
    const record = obj as Record<string, unknown>;
    return keys
      .map((k) => record[k])
      .filter((v): v is string | number => typeof v === "string" || typeof v === "number")
      .map(String)
      .join(", ");
  };

  // Product
  if (typeof product === "string") {
    parts.push(`Product: ${product}`);
  } else if (product && typeof product === "object") {
    const details = joinValues(product, ["category", "material", "color", "feature"]);
    if (details) parts.push(`Product: ${details}`);
  }

  // Composition
  if (typeof composition === "object") {
    const details = joinValues(composition, ["framing", "placement"]);
    if (details) parts.push(`Composition: ${details}`);
  }

  // Simple string fields
  if (typeof scene === "string") parts.push(`Scene: ${scene}`);
  if (typeof lighting === "string") parts.push(`Lighting: ${lighting}`);
  if (typeof camera === "string") parts.push(`Camera: ${camera}`);
  if (typeof style === "string") parts.push(`Style: ${style}`);
  if (typeof subject === "string") parts.push(`Subject: ${subject}`);

  return parts.length > 0 ? parts.join(". ") : JSON.stringify(prompt);
}

function normalizePrompt(prompt: string | Record<string, unknown>): string {
  if (typeof prompt === "string") return prompt.trim();
  return convertStructuredPromptToText(prompt);
}

// @ts-nocheck - Bypassing strict Zod version mismatch checks for Voltagent framework
export const creativeFanoutWorkflow = createWorkflowChain({
  id: "creative-fanout",
  name: "Creative Fan-out (Enhance → Suspend/Resume → Personas)",
  purpose:
    "Enhance a messy ad brief, suspend for clarifications if needed, then fan-out to persona creative agents to generate Nano Banana prompt JSONs.",
  input: z.object({
    brief: z.string().min(1),
    personas: z.array(z.enum(personaIds)).optional(),
  }) as any,
  suspendSchema: z.object({
    questions: z.array(z.string()),
    enhancedBrief: enhancedBriefSchema,
  }) as any,
  resumeSchema: z.object({
    answersText: z.string(),
  }) as any,
  result: z.object({
    enhancedBrief: enhancedBriefSchema,
    clarifications: z.string().optional(),
    prompts: z.array(
      z.object({
        personaId: z.enum(personaIds),
        prompt: promptSchema,
      })
    ),
    images: z.array(z.object({ personaId: z.enum(personaIds), imageUrl: z.unknown() })).optional(),
  }) as any,
})
  .andThen({
    id: "enhance-brief",
    execute: async ({ data }) => {
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Use text generation instead of structured output to avoid schema stripping nested objects
          const res = await briefEnhancerAgent.generateText(
            `You are an Ad Brief Enhancer. Your task is to transform a messy, incomplete brief into a structured, production-ready JSON.

RAW BRIEF (may be in Turkish or English):
${data.brief}

🚨 CRITICAL REQUIREMENTS:
1. Translate all content to English if needed
2. Fill EVERY field with meaningful, specific values based on the brief content
3. Empty objects {} or empty strings "" are REJECTED
4. Extract and structure information from the brief - don't use generic examples
5. Infer reasonable values ONLY when information is truly missing
6. Return ONLY valid JSON - no markdown, no code fences, no explanations, no "Thought" section

REQUIRED OUTPUT STRUCTURE (analyze the brief and fill each field dynamically):
{
  "brief_type": "product" or "app" (determine from brief content),
  "product": {
    // Extract product details from brief (category, variant, hero_feature, material, color, etc.)
    // Minimum 3-4 properties based on what's mentioned in the brief
  },
  "goal": {
    // Extract or infer goals from brief (primary, secondary)
    // Minimum 2 properties
  },
  "target_audience": {
    // Extract audience info from brief (demographics, psychographics, behaviors)
    // Minimum 2-3 properties
  },
  "usp": "Extract the unique selling point from brief or infer from product description",
  "offer": {} or { "type": "...", "value": "..." } if mentioned in brief,
  "placements": [
    // Extract from brief or default to Instagram Feed (4:5) and Story (9:16)
    // Each object: { "platform": "...", "format/aspect_ratio": "..." }
  ],
  "visual_direction": {
    // Extract visual details from brief (mood, palette, lighting, composition, props, etc.)
    // Minimum 4-5 properties based on brief content
  },
  "must_haves": [
    // Extract from brief or infer based on product type
    // Minimum 2-3 items
  ],
  "must_avoid": [
    // Extract from brief or infer based on product type and brand safety
    // Minimum 2-3 items
  ],
  "cta_intent": "discover" or "purchase" or "learn" (infer from brief goal),
  "references": [
    // Extract from brief or infer based on product category
    // Minimum 2-3 references
  ],
  "assumptions": [
    // List what you assumed because brief didn't specify
    // Minimum 2-3 assumptions
  ],
  "questions": [
    // Only ask if truly blocking for creative generation
    // Keep short and specific
  ]
}

Return ONLY the JSON object, starting with { and ending with }:`,
            {
              maxOutputTokens: 4000,
              // Note: No structured output - we'll parse the JSON manually
            }
          );

          // Parse JSON from text response
          const textOutput = res.text;
          if (!textOutput || textOutput.trim() === "") {
            throw new Error("No text output received from brief enhancer");
          }
          
          // Extract JSON from the response (handle possible markdown code blocks)
          let jsonString = textOutput.trim();
          
          // Remove markdown code fences if present
          if (jsonString.startsWith("```json")) {
            jsonString = jsonString.slice(7);
          } else if (jsonString.startsWith("```")) {
            jsonString = jsonString.slice(3);
          }
          if (jsonString.endsWith("```")) {
            jsonString = jsonString.slice(0, -3);
          }
          jsonString = jsonString.trim();
          
          // Find the JSON object (starts with { ends with })
          const jsonStart = jsonString.indexOf("{");
          const jsonEnd = jsonString.lastIndexOf("}");
          if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
            throw new Error(`Invalid JSON structure in response: ${jsonString.substring(0, 200)}...`);
          }
          jsonString = jsonString.substring(jsonStart, jsonEnd + 1);
          
          // Parse the JSON
          let output: z.infer<typeof enhancedBriefSchema>;
          try {
            output = JSON.parse(jsonString);
          } catch (parseError) {
            throw new Error(`Failed to parse JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}. Raw: ${jsonString.substring(0, 500)}...`);
          }

          // Validate required fields exist
          if (!output.brief_type) {
            output.brief_type = "product";
          }

          // Check if critical fields are empty - use OR logic (if ANY critical field is empty, retry)
          const criticalFieldsEmpty = 
            (!output.usp || output.usp.trim() === "") ||
            (!output.product || Object.keys(output.product).length === 0) ||
            (!output.goal || Object.keys(output.goal).length === 0) ||
            (!output.target_audience || Object.keys(output.target_audience).length === 0) ||
            (!output.cta_intent || output.cta_intent.trim() === "") ||
            (!output.visual_direction || Object.keys(output.visual_direction).length === 0);

          if (criticalFieldsEmpty && attempt < maxRetries) {
            console.warn(`[enhance-brief] Attempt ${attempt}: Critical fields are empty:`);
            console.warn(`  - usp: ${!output.usp || output.usp.trim() === "" ? "EMPTY" : "OK"}`);
            console.warn(`  - product: ${!output.product || Object.keys(output.product).length === 0 ? "EMPTY" : "OK (${Object.keys(output.product || {}).length} keys)"}`);
            console.warn(`  - goal: ${!output.goal || Object.keys(output.goal).length === 0 ? "EMPTY" : "OK (${Object.keys(output.goal || {}).length} keys)"}`);
            console.warn(`  - target_audience: ${!output.target_audience || Object.keys(output.target_audience).length === 0 ? "EMPTY" : "OK (${Object.keys(output.target_audience || {}).length} keys)"}`);
            console.warn(`  - cta_intent: ${!output.cta_intent || output.cta_intent.trim() === "" ? "EMPTY" : "OK"}`);
            console.warn(`  - visual_direction: ${!output.visual_direction || Object.keys(output.visual_direction).length === 0 ? "EMPTY" : "OK (${Object.keys(output.visual_direction || {}).length} keys)"}`);
            console.warn(`[enhance-brief] Retrying...`);
            const delayMs = Math.pow(2, attempt - 1) * 1000;
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            continue;
          }

          // Final validation - if still empty after all retries, throw error
          if (criticalFieldsEmpty) {
            throw new Error("Failed to generate non-empty brief after all retries. Critical fields are still empty.");
          }

          // Ensure arrays exist
          output.placements = output.placements || [];
          output.must_haves = output.must_haves || [];
          output.must_avoid = output.must_avoid || [];
          output.references = output.references || [];
          output.assumptions = output.assumptions || [];
          output.questions = output.questions || [];
          output.offer = output.offer || {};

          return { 
            enhancedBrief: output,
            personas: data.personas 
          };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          const errorMessage = lastError.message;

          console.error(`[enhance-brief] Attempt ${attempt} error:`, errorMessage);

          // If we have retries left, wait and retry
          if (attempt < maxRetries) {
            const delayMs = Math.pow(2, attempt - 1) * 1000;
            console.warn(`[enhance-brief] Retrying in ${delayMs}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            continue;
          }

          // If it's the last attempt, throw
          throw new Error(
            `Failed to enhance brief after ${attempt} attempt(s): ${errorMessage}. The model may have failed to generate valid JSON, content filters may have blocked the output, or the input language may need better handling.`
          );
        }
      }

      // This should never be reached, but TypeScript needs it
      throw lastError || new Error("Failed to enhance brief: Unknown error");
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
        return { 
          ...data, 
          clarifications: answersText,
          personas: data.personas 
        };
      }

      return { 
        ...data,
        personas: data.personas 
      };
    },
  })
  .andAll({
    id: "persona-fanout",
    steps: personaIds.map((personaId) =>
      andThen({
        id: `generate-${personaId}`,
        execute: async ({ data }) => {
          const workflowData = data as {
            personas?: readonly PersonaId[];
            enhancedBrief: z.infer<typeof enhancedBriefSchema>;
            clarifications?: string;
          };
          const personas = selectedPersonas(workflowData.personas);
          if (!personas.includes(personaId)) return {};

          const maxRetries = 2; // Retry once for persona generation
          
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              const agent = personaAgentById[personaId];
              
              const prompt = buildPersonaPrompt(workflowData.enhancedBrief, workflowData.clarifications);
              
              // Use text generation instead of structured output to avoid schema stripping nested objects
              const res = await agent.generateText(
                prompt,
                {
                  maxOutputTokens: 3000,
                  // Note: No structured output - we'll parse the JSON manually
                }
              );

              // Parse JSON from text response
              const textOutput = res.text;
              if (!textOutput || textOutput.trim() === "") {
                if (attempt < maxRetries) {
                  console.warn(`[${personaId}] No text output received, retrying...`);
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                  continue;
                }
                console.error(`[${personaId}] No text output received after ${attempt} attempts`);
                return {};
              }
              
              // Extract JSON from the response (handle possible markdown code blocks)
              let jsonString = textOutput.trim();
              
              // Remove markdown code fences if present
              if (jsonString.startsWith("```json")) {
                jsonString = jsonString.slice(7);
              } else if (jsonString.startsWith("```")) {
                jsonString = jsonString.slice(3);
              }
              if (jsonString.endsWith("```")) {
                jsonString = jsonString.slice(0, -3);
              }
              jsonString = jsonString.trim();
              
              // Find the JSON object (starts with { ends with })
              const jsonStart = jsonString.indexOf("{");
              const jsonEnd = jsonString.lastIndexOf("}");
              if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
                if (attempt < maxRetries) {
                  console.warn(`[${personaId}] Invalid JSON structure, retrying...`);
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                  continue;
                }
                console.error(`[${personaId}] Invalid JSON structure: ${jsonString.substring(0, 200)}...`);
                return {};
              }
              jsonString = jsonString.substring(jsonStart, jsonEnd + 1);
              
              // Parse the JSON
              let output: z.infer<typeof promptSchema>;
              try {
                output = JSON.parse(jsonString);
              } catch (parseError) {
                if (attempt < maxRetries) {
                  console.warn(`[${personaId}] JSON parse error, retrying...`);
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                  continue;
                }
                console.error(`[${personaId}] Failed to parse JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
                return {};
              }
              
              // Aggressive validation: check for empty objects
              const outputKeys = Object.keys(output);
              const emptyKeys: string[] = [];
              
              for (const key of outputKeys) {
                const value = output[key];
                
                // Check for null (subject can be null, that's OK)
                if (key === 'subject' && value === null) {
                  continue; // subject can be null
                }
                
                // Check for empty objects
                if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
                  const objKeys = Object.keys(value);
                  if (objKeys.length === 0) {
                    emptyKeys.push(key);
                  } else {
                    // Check if all values in object are empty strings
                    const allEmpty = objKeys.every(k => {
                      const v = (value as Record<string, unknown>)[k];
                      return typeof v === 'string' && v.trim() === '';
                    });
                    if (allEmpty) {
                      emptyKeys.push(key);
                    }
                  }
                }
                
                // Check for empty arrays (rules can be empty, that's OK)
                if (Array.isArray(value) && key !== 'rules' && value.length === 0) {
                  emptyKeys.push(key);
                }
              }
              
              // If too many fields are empty, retry with more specific prompt
              if (emptyKeys.length > 2 && attempt < maxRetries) {
                console.warn(`[${personaId}] Too many empty fields (${emptyKeys.length}):`, emptyKeys);
                console.warn(`[${personaId}] Retrying with more specific instructions...`);
                
                try {
                  // Add specific instruction for empty fields
                  const emptyFieldsNote = `\n\n⚠️ CRITICAL: The following fields were empty in your previous attempt: ${emptyKeys.join(', ')}. You MUST fill these fields with detailed, specific values. Empty objects {} will cause rejection.`;
                  
                  const retryPrompt = buildPersonaPrompt(workflowData.enhancedBrief, workflowData.clarifications) + emptyFieldsNote;
                  
                  const retryRes = await agent.generateText(
                    retryPrompt,
                    {
                      maxOutputTokens: 3000,
                    }
                  );
                  
                  // Parse retry output
                  const retryTextOutput = retryRes.text;
                  if (retryTextOutput) {
                    let retryJsonString = retryTextOutput.trim();
                    if (retryJsonString.startsWith("```json")) {
                      retryJsonString = retryJsonString.slice(7);
                    } else if (retryJsonString.startsWith("```")) {
                      retryJsonString = retryJsonString.slice(3);
                    }
                    if (retryJsonString.endsWith("```")) {
                      retryJsonString = retryJsonString.slice(0, -3);
                    }
                    retryJsonString = retryJsonString.trim();
                    
                    const retryJsonStart = retryJsonString.indexOf("{");
                    const retryJsonEnd = retryJsonString.lastIndexOf("}");
                    if (retryJsonStart !== -1 && retryJsonEnd !== -1 && retryJsonStart < retryJsonEnd) {
                      retryJsonString = retryJsonString.substring(retryJsonStart, retryJsonEnd + 1);
                      
                      try {
                        const retryOutput = JSON.parse(retryJsonString);
                        
                        // Validate retry output
                        const retryEmptyKeys: string[] = [];
                        for (const key of Object.keys(retryOutput)) {
                          const value = retryOutput[key];
                          if (key === 'subject' && value === null) continue;
                          if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
                            if (Object.keys(value).length === 0) {
                              retryEmptyKeys.push(key);
                            }
                          }
                        }
                        
                        if (retryEmptyKeys.length <= 2) {
                          return { 
                            [keyForPersona(personaId)]: retryOutput,
                            enhancedBrief: workflowData.enhancedBrief,
                            clarifications: workflowData.clarifications,
                            personas: workflowData.personas,
                          };
                        } else {
                          console.warn(`[${personaId}] Retry still has ${retryEmptyKeys.length} empty fields, continuing to next attempt...`);
                        }
                      } catch (retryParseError) {
                        console.error(`[${personaId}] Retry JSON parse error:`, retryParseError instanceof Error ? retryParseError.message : String(retryParseError));
                      }
                    }
                  }
                } catch (retryError) {
                  console.error(`[${personaId}] Retry failed:`, retryError instanceof Error ? retryError.message : String(retryError));
                }
                
                await new Promise((resolve) => setTimeout(resolve, 1000));
                continue;
              }
              
              if (emptyKeys.length > 0) {
                console.warn(`[${personaId}] Empty fields detected:`, emptyKeys);
              }

              // Return prompt along with workflow context to preserve enhancedBrief and clarifications
              return { 
                [keyForPersona(personaId)]: output,
                enhancedBrief: workflowData.enhancedBrief,
                clarifications: workflowData.clarifications,
                personas: workflowData.personas,
              };
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              
              // If it's a "No output" error and we have retries left, retry
              if (attempt < maxRetries && errorMessage.includes("No output")) {
                console.warn(`[${personaId}] No output error, retrying...`);
                await new Promise((resolve) => setTimeout(resolve, 1000));
                continue;
              }
              
              // More detailed error logging
              console.error(`[${personaId}] Failed to generate prompt after ${attempt} attempt(s):`, {
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
              });
              
              // Return empty object so aggregation can continue with other personas
              return {};
            }
          }
          
          // Should never reach here, but TypeScript needs it
          return {};
        },
      })
    ),
  })
  .andThen({
    id: "aggregate",
    execute: async ({ data }) => {
      // andAll returns an array of objects, we need to merge them
      const resultsArray = Array.isArray(data) ? data : [data];
      
      // Merge all persona outputs into a single object
      const mergedData = resultsArray.reduce((acc, item) => {
        if (item && typeof item === 'object') {
          return { ...acc, ...item };
        }
        return acc;
      }, {} as Record<string, unknown>);

      // Extract enhancedBrief and clarifications from the merged data
      const workflowData = mergedData as {
        personas?: readonly PersonaId[];
        enhancedBrief?: z.infer<typeof enhancedBriefSchema>;
        clarifications?: string;
      } & Record<string, unknown>;

      // Find enhancedBrief and clarifications from the data structure
      let enhancedBrief: z.infer<typeof enhancedBriefSchema> | undefined;
      let clarifications: string | undefined;
      let personas: readonly PersonaId[] | undefined;

      // Try to find enhancedBrief in merged data or first array item
      if (workflowData.enhancedBrief) {
        enhancedBrief = workflowData.enhancedBrief;
        clarifications = workflowData.clarifications;
        personas = workflowData.personas;
      } else {
        // Look in the array items
        for (const item of resultsArray) {
          if (item && typeof item === 'object') {
            const itemData = item as Record<string, unknown>;
            if (itemData.enhancedBrief && !enhancedBrief) {
              enhancedBrief = itemData.enhancedBrief as z.infer<typeof enhancedBriefSchema>;
              clarifications = itemData.clarifications as string | undefined;
              personas = itemData.personas as readonly PersonaId[] | undefined;
              break;
            }
          }
        }
      }

      if (!enhancedBrief) {
        console.error(`[aggregate] enhancedBrief not found. Available keys:`, Object.keys(mergedData));
        throw new Error("enhancedBrief not found in workflow data");
      }

      const selectedPersonasList = selectedPersonas(personas);
      
      const prompts = selectedPersonasList
        .map((personaId) => {
          const key = keyForPersona(personaId);
          const prompt = mergedData[key];
          
          if (!prompt || typeof prompt !== "object") {
            console.warn(`[aggregate] Missing or invalid prompt for ${personaId} (key: ${key})`);
            return null;
          }
          
          // Validate prompt structure
          const promptKeys = Object.keys(prompt);
          const emptyFields = promptKeys.filter(k => {
            const v = (prompt as Record<string, unknown>)[k];
            return v === null || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);
          });
          
          if (emptyFields.length > 0) {
            console.warn(`[aggregate] Prompt for ${personaId} has empty fields:`, emptyFields);
          }
          
          return { personaId, prompt };
        })
        .filter(Boolean) as Array<{ personaId: PersonaId; prompt: z.infer<typeof promptSchema> }>;


      return {
        enhancedBrief,
        clarifications,
        prompts,
      };
    },
  })
  .andAll({
    id: "generate-images",
    steps: personaIds.map((personaId) =>
      andThen({
        id: `generate-image-${personaId}`,
        execute: async ({ data }) => {
           const workflowData = data as {
            prompts: Array<{ personaId: PersonaId; prompt: z.infer<typeof promptSchema> }>;
           };
           
           const promptEntry = workflowData.prompts.find((p) => p.personaId === personaId);
           if (!promptEntry) return {};

           try {
             // We need to return the original data context so it's available for the next step
             const context = (typeof data === 'object' && data !== null) ? data : {};

             const rawPrompt = promptEntry.prompt as Record<string, unknown>;
             const textPrompt = normalizePrompt(rawPrompt);
             
             // Allowed aspect ratios for Nano Banana Pro
             const allowedRatios = new Set(["21:9", "16:9", "3:2", "4:3", "5:4", "1:1", "4:5", "3:4", "2:3", "9:16"]);
             
             // Extract aspect ratio from composition or default to 1:1
             let aspectRatio = "1:1";
             if (rawPrompt.composition && typeof rawPrompt.composition === 'object') {
               const comp = rawPrompt.composition as Record<string, unknown>;
               if (typeof comp.aspect_ratio === 'string') {
                 // Clean up and validate
                 const rawRatio = comp.aspect_ratio.trim();
                 if (allowedRatios.has(rawRatio)) {
                   aspectRatio = rawRatio;
                 } else {
                   // Attempt to extract a valid ratio from verbose text (e.g. "4:5 vertical")
                   const match = rawRatio.match(/\b(\d+:\d+)\b/);
                   if (match && allowedRatios.has(match[1])) {
                     aspectRatio = match[1];
                   } else {
                     console.warn(`[${personaId}] Invalid aspect ratio "${rawRatio}", defaulting to 1:1`);
                   }
                 }
               }
             }

             if (!nanoBananaProTool) {
               throw new Error("Nano Banana Pro tool is not initialized");
             }

             // Fixing potentially undefined execution
             const result = await nanoBananaProTool.execute!({
               prompt: textPrompt,
               aspect_ratio: aspectRatio,
             });

             return {
               ...context, // Pass through context
               [`image_${personaId}`]: result,
               personaId, 
             };
           } catch (error) {
             console.error(`[${personaId}] Image generation failed:`, error);
             // Return context even on failure to avoid losing state
             return (typeof data === 'object' && data !== null) ? { ...data } : {};
           }
        }
      })
    )
  })
  .andThen({
    id: "final-aggregate",
    execute: async ({ data }) => {
      // Data is array of results from andAll steps
      const resultsArray = Array.isArray(data) ? data : [data] as Array<Record<string, unknown>>;
      
      // Merge all results to reconstruct the full context
      let baseData: Record<string, unknown> = {};
      const images: Array<{ personaId: PersonaId; imageUrl: unknown }> = [];

      for (const item of resultsArray) {
        if (!item || typeof item !== 'object') continue;
        
        const itemObj = item as Record<string, unknown>;
        
        // Capture base data if we haven't yet
        if (!baseData.enhancedBrief && itemObj.enhancedBrief) {
          baseData = itemObj;
        }

        // Look for image keys
        const personaId = itemObj.personaId as PersonaId | undefined;
        if (personaId) {
           const imageKey = `image_${personaId}`;
           if (itemObj[imageKey]) {
             images.push({
               personaId,
               imageUrl: itemObj[imageKey]
             });
           }
        }
      }
      
      // Fallback: merge everything just in case
      const mergedData = resultsArray.reduce((acc, item) => ({ ...acc, ...(typeof item === 'object' ? item : {}) }), baseData) as any;
      
      const enhancedBrief = mergedData.enhancedBrief as z.infer<typeof enhancedBriefSchema>;
      const clarifications = mergedData.clarifications as string | undefined;
      const prompts = mergedData.prompts as Array<{ personaId: PersonaId; prompt: z.infer<typeof promptSchema> }>;

      return {
        enhancedBrief,
        clarifications,
        prompts,
        images,
      };
    }
  });

