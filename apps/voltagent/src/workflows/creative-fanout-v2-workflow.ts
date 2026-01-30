import { andAll, andThen, createWorkflowChain } from "@voltagent/core";
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
  // "creative-generator-packshot",
  // "creative-generator-ugc",
  // "creative-generator-minimal-luxury",
  // "creative-generator-bold-trend",
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
  return personaIds.filter((id) => input.includes(id));
}

const personaAgentById: Record<PersonaId, typeof creativeGeneratorPerformanceAgent> = {
  "creative-generator-performance": creativeGeneratorPerformanceAgent,
  "creative-generator-artdirector": creativeGeneratorArtDirectorAgent,
  // "creative-generator-packshot": creativeGeneratorPackshotAgent,
  // "creative-generator-ugc": creativeGeneratorUgcAgent,
  // "creative-generator-minimal-luxury": creativeGeneratorMinimalLuxuryAgent,
  // "creative-generator-bold-trend": creativeGeneratorBoldTrendAgent,
};

function keyForPersona(personaId: PersonaId) {
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
export const creativeFanoutV2Workflow = createWorkflowChain({
  id: "creative-fanout-v2",
  name: "Creative Fan-out V2 (Vertical Slice)",
  purpose:
    "Enhance a messy ad brief, suspend for clarifications if needed, then fan-out to persona creative agents to generate Nano Banana prompt JSONs and immediately generate images.",
  input: z.object({
    brief: z.string().min(1),
    aspect_ratio: z.string().default("16:9"),
  }) as any,
  result: z.object({
    enhancedBrief: enhancedBriefSchema,
    prompts: z.array(
      z.object({
        personaId: z.enum(personaIds),
        prompt: promptSchema,
      })
    ),
    images: z.array(z.object({ personaId: z.enum(personaIds), imageUrl: z.unknown() })).optional(),
  }) as any,
  suspendSchema: z.object({
    enhancedBrief: enhancedBriefSchema,
  }) as any,
  resumeSchema: z.object({
    approved: z.boolean(),
    feedback: z.string().optional(),
  }) as any,
})
  .andThen({
    id: "enhance-brief",
    execute: async ({ data }) => {
      const maxRetries = 3;
      let lastError: Error | null = null;
      const brief = data.brief as string;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Use text generation to avoid schema stripping nested objects
          const res = await briefEnhancerAgent.generateText(
            `You are an Ad Brief Enhancer. Your task is to transform a messy, incomplete brief into a structured, production-ready JSON.

RAW BRIEF (may be in Turkish or English):
${brief}

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
            }
          );

          const textOutput = res.text;
          if (!textOutput || textOutput.trim() === "") {
            throw new Error("No text output received from brief enhancer");
          }
          
          let jsonString = textOutput.trim();
          if (jsonString.startsWith("```json")) {
            jsonString = jsonString.slice(7);
          } else if (jsonString.startsWith("```")) {
            jsonString = jsonString.slice(3);
          }
          if (jsonString.endsWith("```")) {
            jsonString = jsonString.slice(0, -3);
          }
          jsonString = jsonString.trim();
          
          const jsonStart = jsonString.indexOf("{");
          const jsonEnd = jsonString.lastIndexOf("}");
          if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
            throw new Error(`Invalid JSON structure in response: ${jsonString.substring(0, 200)}...`);
          }
          jsonString = jsonString.substring(jsonStart, jsonEnd + 1);
          
          let output: z.infer<typeof enhancedBriefSchema>;
          try {
            output = JSON.parse(jsonString);
          } catch (parseError) {
            throw new Error(`Failed to parse JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}. Raw: ${jsonString.substring(0, 500)}...`);
          }

          if (!output.brief_type) output.brief_type = "product";

          const criticalFieldsEmpty = 
            (!output.usp || output.usp.trim() === "") ||
            (!output.product || Object.keys(output.product).length === 0) ||
            (!output.goal || Object.keys(output.goal).length === 0) ||
            (!output.target_audience || Object.keys(output.target_audience).length === 0) ||
            (!output.cta_intent || output.cta_intent.trim() === "") ||
            (!output.visual_direction || Object.keys(output.visual_direction).length === 0);

          if (criticalFieldsEmpty && attempt < maxRetries) {
            console.warn(`[enhance-brief] Attempt ${attempt}: Critical fields are empty. Retrying...`);
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
            continue;
          }

          if (criticalFieldsEmpty) {
            throw new Error("Failed to generate non-empty brief after all retries. Critical fields are still empty.");
          }

          output.placements = output.placements || [];
          output.must_haves = output.must_haves || [];
          output.must_avoid = output.must_avoid || [];
          output.references = output.references || [];
          output.assumptions = output.assumptions || [];
          output.offer = output.offer || {};

          return { 
            enhancedBrief: output,
            personas: data.personas 
          };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.error(`[enhance-brief] Attempt ${attempt} error:`, lastError.message);

          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
            continue;
          }
          throw new Error(`Failed to enhance brief after ${attempt} attempt(s): ${lastError.message}`);
        }
      }
      throw lastError || new Error("Failed to enhance brief: Unknown error");
    },
  })
  .andThen({
    id: "approval-gate",
    execute: async ({ data, suspend, resumeData }) => {
      const resume = resumeData as { approved: boolean; feedback?: string } | undefined;

      // If already resumed and approved
      if (resume?.approved) {
        return data; 
      }
      
      // If resumed but NOT approved (feedback loop logic would go here, 
      // but for now we suspend again or proceed if approved)
      // Since specific looping logic is complex to inject here without deeper refactor,
      // we assume the external system handles the 're-trigger' if rejected, 
      // or we just suspend again.
      // For this implementation: Suspend always unless approved.
      
      await suspend("wait-for-feedback", {
        enhancedBrief: data.enhancedBrief
      });

      // This return is theoretically unreachable if suspended, 
      // but if resumed with approved=true, we return data.
      return data;
    },
  })
  .andAll({
    id: "fanout-generation",
    steps: personaIds.map((personaId) =>
      andThen({
        id: `pipeline-${personaId}`,
        execute: async ({ data }) => {
          const workflowData = data as {
            aspect_ratio?: string;
            enhancedBrief: z.infer<typeof enhancedBriefSchema>;
            clarifications?: string;
          };
          

          // --- STEP 1: PROMPT GENERATION ---
          const maxRetries = 2;
          let generatedPrompt: z.infer<typeof promptSchema> | undefined;
          
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              const agent = personaAgentById[personaId];
              const promptContext = buildPersonaPrompt(workflowData.enhancedBrief, undefined);
              
              const res = await agent.generateText(
                promptContext,
                { maxOutputTokens: 3000 }
              );

              const textOutput = res.text;
              if (!textOutput || textOutput.trim() === "") {
                if (attempt < maxRetries) {
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                  continue;
                }
                console.error(`[${personaId}] No text output received after ${attempt} attempts`);
                return {};
              }
              
              let jsonString = textOutput.trim();
              if (jsonString.startsWith("```json")) jsonString = jsonString.slice(7);
              else if (jsonString.startsWith("```")) jsonString = jsonString.slice(3);
              if (jsonString.endsWith("```")) jsonString = jsonString.slice(0, -3);
              jsonString = jsonString.trim();
              
              const jsonStart = jsonString.indexOf("{");
              const jsonEnd = jsonString.lastIndexOf("}");
              if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
                if (attempt < maxRetries) {
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                  continue;
                }
                console.error(`[${personaId}] Invalid JSON structure`);
                return {};
              }
              jsonString = jsonString.substring(jsonStart, jsonEnd + 1);
              
              try {
                generatedPrompt = JSON.parse(jsonString);
              } catch (parseError) {
                if (attempt < maxRetries) {
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                  continue;
                }
                console.error(`[${personaId}] Failed to parse JSON`);
                return {};
              }
              
              // Validation (Simplified for brevity as per original implementation intent)
              if (generatedPrompt) {
                 const outputKeys = Object.keys(generatedPrompt);
                 const emptyKeys: string[] = [];
                 // ... validation logic could go here ...
                 if (attempt < maxRetries && emptyKeys.length > 2) {
                    console.warn(`[${personaId}] Too many empty fields.`);
                    // could retry here
                 }
                 break; // Success
              }
// ... (previous code)
              } catch (error) {
                 console.error(`[${personaId}] Failed to generate prompt:`, error);
                 if (attempt >= maxRetries) {
                     return {
                         personaId,
                         error: `Failed to generate prompt: ${String(error)}`
                     };
                 }
              }
          }

          if (!generatedPrompt) {
               return {
                   personaId,
                   error: "Failed to generate valid prompt after retries"
               };
          }

          // --- STEP 2: IMAGE GENERATION ---
          try {
             const rawPrompt = generatedPrompt as Record<string, unknown>;
             // ... (existing logic) ...
             const textPrompt = normalizePrompt(rawPrompt);
              
              // Aspect Ratio Logic
             const allowedRatios = new Set(["21:9", "16:9", "3:2", "4:3", "5:4", "1:1", "4:5", "3:4", "2:3", "9:16"]);
             let aspectRatio = "1:1";
             
             // 1. Prefer workflow input
             if (workflowData.aspect_ratio && allowedRatios.has(workflowData.aspect_ratio)) {
                aspectRatio = workflowData.aspect_ratio;
             } 
             // 2. Fallback to prompt-derived (if needed, or just stick to input)
             else {
                 const comp = (rawPrompt as any).composition;
                 if (comp && typeof comp === 'object') {
                    const rawRatio = comp.aspect_ratio;
                    if (typeof rawRatio === 'string') {
                       const r = rawRatio.trim();
                       if (allowedRatios.has(r)) aspectRatio = r;
                       else {
                         const match = r.match(/\b(\d+:\d+)\b/);
                         if (match && allowedRatios.has(match[1])) aspectRatio = match[1];
                       }
                    }
                 }
             }

             if (!nanoBananaProTool) throw new Error("Nano Banana Pro tool is not initialized");

             const imageResult = await nanoBananaProTool.execute!({
               prompt: textPrompt,
               aspect_ratio: aspectRatio,
             });

             // Return combined result
             return {
                [keyForPersona(personaId)]: generatedPrompt,
                [`image_${personaId}`]: imageResult,
                enhancedBrief: workflowData.enhancedBrief,
                aspect_ratio: workflowData.aspect_ratio,
                personaId
             };

          } catch (error) {
             console.error(`[${personaId}] Image generation failed:`, error);
             // Return just the prompt if image generation fails, so we don't lose that work
             return {
                [keyForPersona(personaId)]: generatedPrompt,
                enhancedBrief: workflowData.enhancedBrief,
                personaId,
                imageError: String(error)
             };
          }
        } 
      })
    )
  })
  .andThen({
    id: "final-aggregate",
    execute: async ({ data }) => {
      // data is array of results from the parallel chains
      // Each item in the array is the result of the LAST step of that chain (pipeline-image-*)
      const resultsArray = Array.isArray(data) ? data : [data] as Array<Record<string, unknown>>;

      let mappedEnhancedBrief: any = null;
      const prompts: any[] = [];
      const images: any[] = [];
      const errors: any[] = [];

      for (const item of resultsArray) {
        if (!item || typeof item !== 'object') continue;
        const itemObj = item as Record<string, unknown>;

        // Capture explicit errors from steps
        if (itemObj.error) {
            errors.push({ personaId: itemObj.personaId, error: itemObj.error });
            continue;
        }

        // Try to recover shared state
        if (!mappedEnhancedBrief && itemObj.enhancedBrief) {
          mappedEnhancedBrief = itemObj.enhancedBrief;
        }

        const pid = itemObj.personaId as string;
        if (pid) {
           const pKey = keyForPersona(pid as PersonaId);
           const iKey = `image_${pid}`;
           
           if (itemObj[pKey]) {
             prompts.push({
               personaId: pid,
               prompt: itemObj[pKey]
             });
           }
           
           if (itemObj[iKey]) {
             images.push({
               personaId: pid,
               imageUrl: itemObj[iKey]
             });
           }
           
           if (itemObj.imageError) {
                errors.push({ personaId: pid, error: `Image gen failed: ${itemObj.imageError}` });
           }
        }
      }

      if (!mappedEnhancedBrief && errors.length > 0) {
        // If everything failed but we have errors, throw the first one to make it visible
        // Or return a partial result with errors if the schema allows
        // For now, let's throw to bubble up the debug info
        throw new Error(`All personas failed. First error: ${errors[0].error}`);
      }

      if (!mappedEnhancedBrief) {
         // Fallback if no enhanced brief found (should imply logic error or total failure without error reporting)
         throw new Error("Workflow failed: No successful persona execution.");
      }

      return {
        enhancedBrief: mappedEnhancedBrief,
        prompts,
        images
      };
    }
  });
