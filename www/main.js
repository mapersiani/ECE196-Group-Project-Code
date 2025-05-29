// ────────────────────────────────────────
// Register Service Worker (for PWA/push)
// ────────────────────────────────────────
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/sw.js")
    .then(() => console.log("Service Worker registered"))
    .catch((err) => console.error("SW registration failed:", err));
}

// ────────────────────────────────────────
// MQTT Client Setup
// ────────────────────────────────────────
const client = mqtt.connect("ws://100.83.78.164:9001");

client.on("error", (err) => {
  console.error("MQTT Connection error:", err);
  document.getElementById("status-indicator").style.backgroundColor = "red";
});

let doorState      = null;     // current known state from sensor
let expectedState = null;     // what we’re waiting to see next
let timeoutId = null; // for door‐movement timeout

// Log storage
const logEntries = [];
const maxLogEntries = 10;

client.on("connect", () => {
  console.log("Connected to MQTT broker");
  document.getElementById("status-indicator").style.backgroundColor = "green";

  client.subscribe(["Garage/Door/State", "Garage/Temperature", "Garage/Gas"]);
});

// Handle incoming MQTT messages
client.on("message", (topic, payload) => {
  const msg = payload.toString();

  switch (topic) {
    case "Garage/Door/State":
      handleDoorState(msg);
      break;

    case "Garage/Temperature":
      handleTemperature(msg);
      break;

    case "Garage/Gas":
      updateGasIndicator(parseFloat(msg));
      break;

    default:
      console.warn(`Unhandled topic: ${topic}`);
  }
});

// ────────────────────────────────────────
// UI Event Handlers
// ────────────────────────────────────────
// Toggle button logic
document.getElementById("toggle").addEventListener("click", () => {
  if (!doorState) return;
  expectedState = doorState === "OPEN" ? "CLOSED" : "OPEN";

  client.publish("Garage/Door/Command", expectedState);

  // Disable the button until confirmation arrives
  const btn = document.getElementById("toggle");
  btn.disabled = true;
  btn.textContent = "Moving…";

  // Clear any old timeout, then set a new one
  clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    console.warn("Timeout waiting for door state change");
    expectedState = null;
    btn.disabled = false;
    btn.textContent = doorState === "OPEN" ? "Close Door" : "Open Door";
    addLogEntry(`Door command timeout`);
  }, 20000);
});

// ────────────────────────────────────────
// Log Dropdown Toggle
// ────────────────────────────────────────
const logBar   = document.getElementById('log-bar');
const logPanel = document.getElementById('log-panel');
const caret    = document.getElementById('caret');

logBar.addEventListener('click', () => {
  logPanel.classList.toggle('hidden');
  logBar.classList.toggle('expanded');
});

// ────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────
function handleDoorState(state) {
  clearTimeout(timeoutId);

  // If an unexpected state arrives while pending, log override
  if (expectedState && state !== expectedState) {
    addLogEntry(`External door event: ${state}`);
  }

  doorState = state;
  expectedState = null;

  // Update button + status text
  const btn = document.getElementById("toggle");
  btn.disabled = false;

  const normalizedState = state.replace(/^\uFEFF/, "").replace(/[\s\0]+/g, "").toUpperCase();
  if (normalizedState === "OPEN") {
    btn.textContent = "Close Door";
  } else if (normalizedState === "CLOSED") {
    btn.textContent = "Open Door";
  } else {
    btn.textContent = "Unknown State";
  }
  document.getElementById("status").textContent = state;

  addLogEntry(`Door ${state}`);
}

function handleTemperature(temp) {
  document.getElementById("temperature").textContent = `${temp} °F`;
  if (temp > 100) addLogEntry(`High temperature: ${temp}°F`);
  if (temp < 32) addLogEntry(`Low temperature: ${temp}°F`);
}

function updateGasIndicator(ppm) {
  const dot = document.getElementById("gas-indicator");
  let status, color;

  if (ppm < 30) {
    color = "green";
  } else if (ppm < 90) {
    color = "yellow";
    addLogEntry(`CO warning: ${ppm} ppm`);
  } else {
    color = "red";
    addLogEntry(`CO danger: ${ppm} ppm`);
  }
  dot.style.backgroundColor = color;
}

/**
 * Add an entry (with timestamp) to the top of the log,
 * trimming to the last `maxLogEntries`.
 */
function addLogEntry(text) {
  const now = new Date().toLocaleString();
  logEntries.unshift(`${now} — ${text}`);
  if (logEntries.length > maxLogEntries) logEntries.pop();
  renderLog();
}

/** Render the `logEntries` array into the <ul> */
function renderLog() {
  const ul = document.getElementById("log-list");
  ul.innerHTML = "";
  logEntries.forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = entry;
    ul.appendChild(li);
  });
}