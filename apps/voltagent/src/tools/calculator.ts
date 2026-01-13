import { createTool } from "@voltagent/core";
import { z } from "zod";

/**
 * Calculator tool - performs basic arithmetic operations
 */
export const calculatorTool = createTool({
  name: "calculator",
  description: "Perform basic arithmetic operations (addition, subtraction, multiplication, division)",
  parameters: z.object({
    operation: z
      .enum(["add", "subtract", "multiply", "divide"])
      .describe("The arithmetic operation to perform"),
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
  execute: async (args) => {
    const { operation, a, b } = args;

    switch (operation) {
      case "add":
        return { result: a + b, operation: `${a} + ${b}` };
      case "subtract":
        return { result: a - b, operation: `${a} - ${b}` };
      case "multiply":
        return { result: a * b, operation: `${a} × ${b}` };
      case "divide":
        if (b === 0) {
          throw new Error("Division by zero is not allowed");
        }
        return { result: a / b, operation: `${a} ÷ ${b}` };
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  },
});
