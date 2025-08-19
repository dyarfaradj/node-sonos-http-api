const axios = require("axios");
const readline = require("readline");

const SONOS_API_BASE_URL = "http://127.0.0.1:5005";

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

async function listZones() {
  const response = await axios.get(`${SONOS_API_BASE_URL}/zones`);
  return response.data;
}

async function groupSpeakers(coordinator, members) {
  for (const member of members) {
    await axios.get(`${SONOS_API_BASE_URL}/${member}/join/${coordinator}`);
    console.log(`${member} grouped with ${coordinator}`);
  }
}

async function ungroupAll() {
  const zones = await listZones();
  for (const zone of zones) {
    const coordinator = zone.coordinator.roomName;
    await axios.get(`${SONOS_API_BASE_URL}/${coordinator}/ungroup`);
  }
}

// Add resume playback function
async function resumePlayback(speaker) {
  try {
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait for group to stabilize
    await axios.get(`${SONOS_API_BASE_URL}/${speaker}/play`);
    console.log(`🎵 Resumed playback on ${speaker}`);
  } catch (error) {
    console.log(
      "Could not resume playback automatically. Please resume from Spotify."
    );
  }
}

function generateCombinations(speakers) {
  const combinations = [];

  // Single speakers
  speakers.forEach((speaker) => combinations.push([speaker]));

  // Pairs
  for (let i = 0; i < speakers.length; i++) {
    for (let j = i + 1; j < speakers.length; j++) {
      combinations.push([speakers[i], speakers[j]]);
    }
  }

  // Triplets
  for (let i = 0; i < speakers.length; i++) {
    for (let j = i + 1; j < speakers.length; j++) {
      for (let k = j + 1; k < speakers.length; k++) {
        combinations.push([speakers[i], speakers[j], speakers[k]]);
      }
    }
  }

  if (speakers.length >= 4) {
    combinations.push(speakers);
  }

  return combinations;
}

async function selectAndCreateGroup() {
  try {
    // Get available speakers
    const zones = await listZones();
    const allSpeakers = zones.map((zone) => zone.coordinator.roomName);

    // Generate all possible combinations
    const combinations = generateCombinations(allSpeakers);

    console.log("\n🎵 Available speaker combinations:");
    combinations.forEach((combo, index) => {
      console.log(`${index + 1}: ${combo.join(" + ")}`);
    });

    const input = await question("\nSelect a group to create (number): ");
    const selectedIndex = parseInt(input.trim()) - 1;

    if (selectedIndex < 0 || selectedIndex >= combinations.length) {
      throw new Error("Invalid selection");
    }

    const selectedCombo = combinations[selectedIndex];

    // Ungroup all first
    console.log("\n🔄 Ungrouping all speakers...");
    await ungroupAll();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Create the selected group
    let coordinator = selectedCombo[0];
    if (selectedCombo.length > 1) {
      console.log(`\n🎵 Creating group: ${selectedCombo.join(" + ")}`);
      const members = selectedCombo.slice(1);
      await groupSpeakers(coordinator, members);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log(
      `\n✅ Group "${selectedCombo.join(
        " + "
      )}" is now available in Spotify Connect!`
    );

    // Ask if user wants to resume playback
    const resumeChoice = await question(
      "Resume playback automatically? (y/n): "
    );
    if (resumeChoice.toLowerCase() === "y") {
      await resumePlayback(coordinator);
    } else {
      console.log("🎵 Open Spotify and select this group to play music.");
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Add this function to switch between common groups
async function quickGroupSwitch() {
  const presets = [
    { name: "All Speakers", speakers: ["Vardagsrum", "Sovrum", "Hall"] },
    { name: "Living + Bedroom", speakers: ["Vardagsrum", "Sovrum"] },
    { name: "Living + Hall", speakers: ["Vardagsrum", "Hall"] },
    { name: "Bedroom + Hall", speakers: ["Sovrum", "Hall"] },
    { name: "Individual Speakers", speakers: [] }, // Ungroup all
  ];

  console.log("\n🎵 Quick Group Presets:");
  presets.forEach((preset, index) => {
    const display =
      preset.speakers.length > 0
        ? preset.speakers.join(" + ")
        : "All individual";
    console.log(`${index + 1}: ${preset.name} (${display})`);
  });

  const input = await question("\nSelect preset (number): ");
  const selectedIndex = parseInt(input.trim()) - 1;

  if (selectedIndex < 0 || selectedIndex >= presets.length) {
    throw new Error("Invalid selection");
  }

  const preset = presets[selectedIndex];

  // Ungroup all first
  console.log("\n🔄 Ungrouping all speakers...");
  await ungroupAll();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Create the group if needed
  let coordinator = preset.speakers[0] || "Vardagsrum"; // Default coordinator
  if (preset.speakers.length > 1) {
    console.log(`\n🎵 Creating group: ${preset.speakers.join(" + ")}`);
    const members = preset.speakers.slice(1);
    await groupSpeakers(coordinator, members);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log(`\n✅ "${preset.name}" is now active in Spotify Connect!`);

  // Ask if user wants to resume playback
  const resumeChoice = await question("Resume playback automatically? (y/n): ");
  if (resumeChoice.toLowerCase() === "y") {
    await resumePlayback(coordinator);
  } else {
    console.log("🎵 Open Spotify and select this group to play music.");
  }
}

async function main() {
  try {
    console.log("🎵 Sonos Group Creator");
    console.log("======================");

    const choice = await question(
      "\nChoose an option:\n1. Create a speaker group for Spotify Connect\n2. Quick group presets\n3. Ungroup all speakers\n4. Exit\n\nEnter your choice (1-4): "
    );

    switch (choice.trim()) {
      case "1":
        await selectAndCreateGroup();
        break;
      case "2":
        await quickGroupSwitch();
        break;
      case "3":
        console.log("\n🔄 Ungrouping all speakers...");
        await ungroupAll();
        console.log("✅ All speakers ungrouped!");
        break;
      case "4":
        console.log("👋 Goodbye!");
        break;
      default:
        console.log("❌ Invalid choice. Please run the script again.");
    }

    rl.close();
  } catch (error) {
    console.error("Error:", error.message);
    rl.close();
  }
}

main();
