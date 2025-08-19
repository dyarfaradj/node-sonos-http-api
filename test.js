const axios = require("axios");
const readline = require("readline");

// Base URL for the Sonos HTTP API
const SONOS_API_BASE_URL = "http://127.0.0.1:5005";

// List all speakers/zones
async function listZones() {
  const response = await axios.get(`${SONOS_API_BASE_URL}/zones`);
  console.log("Available Zones:", response.data);

  return response.data;
}

// Group speakers
async function groupSpeakers(coordinator, members) {
  // Coordinator: the main speaker (e.g., 'Living Room')
  // Members: an array of speakers to group with the coordinator (e.g., ['Kitchen', 'Bedroom'])
  for (const member of members) {
    await axios.get(`${SONOS_API_BASE_URL}/${member}/join/${coordinator}`);
    console.log(`${member} grouped with ${coordinator}`);
  }
}

// Ungroup all speakers
async function ungroupAll() {
  const zones = await listZones();
  for (const zone of zones) {
    const coordinator = zone.coordinator.roomName;
    await axios.get(`${SONOS_API_BASE_URL}/${coordinator}/ungroup`);
    console.log(`${coordinator} ungrouped`);
  }
}

// Play on a specific speaker or group
async function playOnSpeaker(speaker, trackUri) {
  try {
    console.log(`Attempting to play on ${speaker}...`);

    // 1. Clear queue
    await axios.get(`${SONOS_API_BASE_URL}/${speaker}/clearqueue`);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 2. Add track to queue (using correct endpoint)
    const encodedUri = encodeURIComponent(trackUri);
    await axios.get(`${SONOS_API_BASE_URL}/${speaker}/queue/${encodedUri}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 3. Start playback using play endpoint
    await axios.get(`${SONOS_API_BASE_URL}/${speaker}/play`);

    console.log(`Successfully queued ${trackUri} on ${speaker}`);
  } catch (error) {
    console.error("Playback error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw error;
  }
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper function to get user input
const question = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

async function selectZones() {
  try {
    const zones = await listZones();
    console.log("\nAvailable zones:");
    zones.forEach((zone, index) => {
      console.log(`${index + 1}: ${zone.coordinator.roomName}`);
    });

    const input = await question(
      "\nEnter zone numbers to group (comma-separated, e.g. 1,2,3): "
    );
    const selectedIndices = input
      .split(",")
      .map((num) => parseInt(num.trim()) - 1);

    const selectedZones = selectedIndices.map(
      (index) => zones[index].coordinator.roomName
    );
    return selectedZones;
  } catch (error) {
    console.error("Error selecting zones:", error.message);
    throw error;
  }
}

async function test() {
  try {
    await ungroupAll();
    const selectedZones = await selectZones();

    if (selectedZones.length > 0) {
      const coordinator = selectedZones[0];
      const members = selectedZones.slice(1);

      if (members.length > 0) {
        console.log("Grouping speakers...");
        await groupSpeakers(coordinator, members);
        // Wait for grouping to complete
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      await playOnSpeaker(coordinator, "spotify:track:1wFFFzJ5EsKbBWZriAcubN");
    }

    rl.close();
  } catch (error) {
    console.error("Error in test:", error.message);
    rl.close();
  }
}

test();
