import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";
import { nanoBananaEditTool } from "../tools";

// @ts-nocheck - Bypassing validation for simple workflow
export const imageEditingWorkflow = createWorkflowChain({
  id: "image-editing",
  name: "Image Editing Workflow",
  purpose: "Edit an image using Nano Banana Edit (Nano Banana Pro Edit).",
  input: z.object({
    prompt: z.string(),
    image_url: z.string(),
  }) as any,
  result: z.object({
    success: z.boolean(),
    images: z.array(z.any()),
  }) as any,
})
  .andThen({
    id: "edit-step",
    execute: async ({ data }) => {
        // Safe casting
       const input = data as { prompt: string; image_url: string };
       
       if (!nanoBananaEditTool.execute) {
           throw new Error("Nano Banana Edit tool execute function is missing");
       }

       const result = await nanoBananaEditTool.execute({
           prompt: input.prompt,
           image_url: input.image_url,
       });

       return {
           success: true,
           images: [result]
       };
    }
  });

