import { complianceSupervisorAgent } from "../agents";

async function main() {
  console.log("Starting Compliance Supervisor Test...\n");

  console.log("--- Test: Check ad image for compliance ---");
  const result = await complianceSupervisorAgent.generateText(
    "Check this ad image for compliance: https://example.com/ad-image.jpg"
  );
  console.log("Result:", result.text);
}

main().catch(console.error);
