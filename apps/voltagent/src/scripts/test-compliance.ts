import { complianceAgent } from "../agents";

async function main() {
  console.log("Starting Compliance Validation Agent Test...\n");

  // Test Case 1: Full Creative with potential issues (Nike check)
  console.log("--- Test Case 1: Full Creative (High Risk) ---");
  const result1 = await complianceAgent.generateText(
    JSON.stringify({
      name: "Just do it better",
      copy: "Think different with our new shoes.",
      image_url: "https://example.com/stock-photo.jpg",
      audio_url: "https://music.com/copyright-track.mp3"
    })
  );
  console.log("Result 1:", result1.text);
  console.log("\n");

  // Test Case 2: Clean Creative
  console.log("--- Test Case 2: Clean Creative ---");
  const result2 = await complianceAgent.generateText(
    JSON.stringify({
      name: "My Original Brand",
      copy: "This is a unique product description that I wrote myself.",
      image_url: "https://mysite.com/my-photo.jpg"
    })
  );
  console.log("Result 2:", result2.text);
}

main().catch(console.error);
