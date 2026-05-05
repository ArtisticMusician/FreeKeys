// Free Keys - main.js

// --- State and Data Model ---
const STORAGE_KEY = "freeKeys_mappings";

let state = {
  mode: "universal", // "plain" | "universal"
  mappings: {
    S: { command: "select.marquee" },
    "Shift+S": { command: "layer.sendToLayersPanel" },
    "Shift+S+M": { command: "tool.move" },
  },
};

let commandsList = [];

// Load from local storage
function loadSettings() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      state = { ...state, ...parsed };
    } catch (e) {
      console.error("Failed to parse settings", e);
    }
  }
  // Update UI based on loaded settings
  universalModifierToggle.checked = state.mode === "universal";
  universalModifierMode = state.mode === "universal";
  renderKeymap();
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function loadCommands() {
  try {
    const response = await fetch("./commands.json");
    const data = await response.json();
    commandsList = data.commands;
  } catch (e) {
    console.error("Failed to load commands", e);
  }
}

// --- UI Elements ---
const universalModifierToggle = document.getElementById(
  "universal-modifier-toggle",
);
const keymapListContainer = document.getElementById("keymap-list");
const searchInput = document.getElementById("search");
const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const importFileInput = document.getElementById("import-file");

// Form Elements
const addNewBtn = document.getElementById("add-new");
const addNewForm = document.getElementById("add-new-form");
const newShortcutKeyInput = document.getElementById("new-shortcut-key");
const newCommandSelect = document.getElementById("new-command-select");
const saveNewBtn = document.getElementById("save-new-btn");
const cancelNewBtn = document.getElementById("cancel-new-btn");

// Modal Elements
const conflictModal = document.getElementById("conflict-modal");
const conflictNewKeyEl = document.getElementById("conflict-new-key");
const conflictNewCmdEl = document.getElementById("conflict-new-cmd");
const conflictOldKeyEl = document.getElementById("conflict-old-key");
const conflictOldCmdEl = document.getElementById("conflict-old-cmd");
const modalBtnCancel = document.getElementById("modal-btn-cancel");
const modalBtnKeepNew = document.getElementById("modal-btn-keep-new");
const modalBtnSuggest = document.getElementById("modal-btn-suggest");

let universalModifierMode = true;
let isRecordingShortcut = false;
let recordedShortcut = null;
let pendingConflictResolution = null; // { key, commandId }

universalModifierToggle.addEventListener("change", () => {
  universalModifierMode = universalModifierToggle.checked;
  state.mode = universalModifierMode ? "universal" : "plain";
  saveSettings();
  console.log(
    "Universal Modifier Mode:",
    universalModifierMode
      ? "ON (every key = modifier, sequential)"
      : "OFF (normal shortcuts)",
  );
});

searchInput.addEventListener("input", () => {
  renderKeymap(searchInput.value);
});

// --- Rendering ---
function renderKeymap(filterText = "") {
  keymapListContainer.innerHTML = "";

  const lowerFilter = filterText.toLowerCase();

  for (const [shortcut, mapping] of Object.entries(state.mappings)) {
    if (
      lowerFilter &&
      !shortcut.toLowerCase().includes(lowerFilter) &&
      !mapping.command.toLowerCase().includes(lowerFilter)
    ) {
      continue;
    }

    const commandInfo = commandsList.find((c) => c.id === mapping.command);
    const commandName = commandInfo ? commandInfo.name : mapping.command;

    const row = document.createElement("div");
    row.className = "mapping-row";

    const shortcutEl = document.createElement("span");
    shortcutEl.className = "mapping-shortcut";
    shortcutEl.textContent = shortcut;

    const commandEl = document.createElement("span");
    commandEl.className = "mapping-command";
    commandEl.textContent = commandName;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "✖";
    deleteBtn.addEventListener("click", () => {
      delete state.mappings[shortcut];
      saveSettings();
      renderKeymap(searchInput.value);
    });

    row.appendChild(shortcutEl);
    row.appendChild(commandEl);
    row.appendChild(deleteBtn);
    keymapListContainer.appendChild(row);
  }
}

// --- Photoshop Command Execution ---
async function executePhotoshopCommand(commandId) {
  console.log(`Executing Photoshop command: ${commandId}`);
  try {
    const photoshop = require("photoshop");
    const core = photoshop.core;
    const action = photoshop.action;

    // Photoshop native commands are often executed using batchPlay with the select command
    // and the command's string ID if it's a known menu command, or triggering tools via select.
    if (core && core.executeAsModal) {
      await core.executeAsModal(
        async () => {
          // Fallback to basic tools
          if (
            commandId.startsWith("tool.") ||
            commandId.startsWith("select.")
          ) {
            let toolName = commandId.split(".")[1]; // e.g. "marquee" from "select.marquee"
            if (toolName === "marquee") toolName = "marqueeRectTool";
            if (toolName === "magicWand") toolName = "magicWandTool";
            if (toolName === "brush") toolName = "paintbrushTool";

            await action.batchPlay(
              [
                {
                  _obj: "select",
                  _target: [{ _ref: toolName }],
                },
              ],
              {},
            );
          } else {
            // Let's try native menu command invocation
            await action.batchPlay(
              [
                {
                  _obj: "select",
                  _target: [
                    {
                      _ref: "menuItemClass",
                      _enum: "menuItemType",
                      _value: commandId,
                    },
                  ],
                },
              ],
              {},
            );
          }
        },
        { commandName: "FreeKeys: " + commandId },
      );
    }
  } catch (e) {
    // Fallback for standard browser environment testing
    console.warn("Not in Photoshop UXP environment or execute failed.", e);
  }
}

// --- State Machine & HUD (Phase 2) ---
let currentState = "Idle"; // "Idle" | "FirstKeyDetected" | "HUDShown"
let firstKeyCombo = null;
let timerId = null;
let countdownIntervalId = null;
let remainingTime = 3000;

const hudToast = document.getElementById("hud-toast");
const hudMessage = document.getElementById("hud-message");

function showHUD(combo) {
  currentState = "HUDShown";
  hudToast.classList.add("visible");
  remainingTime = 3000;

  updateHUDMessage();

  countdownIntervalId = setInterval(() => {
    remainingTime -= 100;
    if (remainingTime <= 0) {
      cancelUniversalMode();
    } else {
      updateHUDMessage();
    }
  }, 100);

  timerId = setTimeout(() => {
    cancelUniversalMode();
  }, 3000);
}

function updateHUDMessage() {
  hudMessage.textContent = `${firstKeyCombo} mode active — ${(remainingTime / 1000).toFixed(1)}s remaining...`;
}

function hideHUD() {
  hudToast.classList.remove("visible");
  if (countdownIntervalId) {
    clearInterval(countdownIntervalId);
    countdownIntervalId = null;
  }
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
}

function cancelUniversalMode() {
  currentState = "Idle";
  firstKeyCombo = null;
  hideHUD();
}

// --- Key Capture Logic ---

function normalizeKeyCombo(e) {
  let modifiers = [];
  if (e.ctrlKey) modifiers.push("Ctrl");
  if (e.metaKey && !e.ctrlKey) modifiers.push("Cmd"); // Mac fallback
  if (e.altKey) modifiers.push("Alt");
  if (e.shiftKey) modifiers.push("Shift");

  // Ignore if the key is just a modifier key itself
  if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
    return null;
  }

  let key = e.key.toUpperCase();
  if (key === " ") key = "SPACE";

  if (modifiers.length > 0) {
    return modifiers.join("+") + "+" + key;
  }
  return key;
}

document.addEventListener("keydown", (e) => {
  if (isRecordingShortcut && e.target === newShortcutKeyInput) {
    e.preventDefault();
    e.stopPropagation();

    const combo = normalizeKeyCombo(e);
    if (combo) {
      if (universalModifierMode) {
        // Simplified 2-key sequence recording
        if (
          !recordedShortcut ||
          !recordedShortcut.includes("+") ||
          ["Control", "Shift", "Alt", "Meta"].includes(e.key)
        ) {
          recordedShortcut = combo;
        } else if (recordedShortcut) {
          let secondKey = e.key.toUpperCase();
          if (secondKey === " ") secondKey = "SPACE";
          recordedShortcut = recordedShortcut + "+" + secondKey;
          isRecordingShortcut = false;
          newShortcutKeyInput.blur();
        }
      } else {
        recordedShortcut = combo;
        isRecordingShortcut = false;
        newShortcutKeyInput.blur();
      }
      newShortcutKeyInput.value = recordedShortcut;
    }
    return;
  }

  // If user is typing in an input, don't trigger shortcuts
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
    return;
  }

  if (e.key === "Escape") {
    if (currentState !== "Idle") {
      cancelUniversalMode();
    }
    return;
  }

  const combo = normalizeKeyCombo(e);
  if (!combo) return;

  if (!universalModifierMode) {
    // Plain mode - direct execution
    if (state.mappings[combo]) {
      e.preventDefault();
      e.stopPropagation();
      executePhotoshopCommand(state.mappings[combo].command);
    }
  } else {
    // Universal Modifier Mode
    if (currentState === "Idle") {
      // First keypress
      firstKeyCombo = combo;
      currentState = "FirstKeyDetected";
      // HUD shown immediately or on keyup? Specs say "After first key is released, a 3-second countdown starts."
      // But state diagram says: Idle -> FirstKeyDetected (Keydown). FirstKeyDetected -> HUDShown (Capture modifier + key, start 3s timer)
      // Let's start HUD immediately, but the timer logic could be refined on keyup. For simplicity and robustness, we show HUD and start timer now.
      e.preventDefault();
      e.stopPropagation();
      showHUD(firstKeyCombo);
    } else if (
      currentState === "HUDShown" ||
      currentState === "FirstKeyDetected"
    ) {
      // Second keypress
      // In Universal Mode, held modifiers are ONLY required during the first key press.
      // The second key should just be the raw key, ignoring modifiers held.
      // But if they press S then M, M is just e.key.toUpperCase()

      let secondKey = e.key.toUpperCase();
      if (secondKey === " ") secondKey = "SPACE";

      const fullCombo = firstKeyCombo + "+" + secondKey;

      e.preventDefault();
      e.stopPropagation();

      if (state.mappings[fullCombo]) {
        executePhotoshopCommand(state.mappings[fullCombo].command);
      } else {
        console.log(`No mapping found for ${fullCombo}`);
      }

      cancelUniversalMode();
    }
  }
});

// We need a keyup listener to handle the diagram's "Keyup of first key (if no second key yet)"
document.addEventListener("keyup", (e) => {
  if (universalModifierMode && currentState === "FirstKeyDetected") {
    // Transition to HUDShown? We already show HUD on keydown to start the timer visually.
    // If they release the first key without pressing a second, we just stay in HUDShown until timeout.
  }
});

// --- Init ---
// --- Form & Key Editor Logic ---

function populateCommandSelect() {
  newCommandSelect.innerHTML = "";
  commandsList.forEach((cmd) => {
    const opt = document.createElement("option");
    opt.value = cmd.id;
    opt.textContent = cmd.name;
    newCommandSelect.appendChild(opt);
  });
}

addNewBtn.addEventListener("click", () => {
  addNewForm.classList.add("active");
  addNewBtn.style.display = "none";
  newShortcutKeyInput.value = "";
  recordedShortcut = null;
});

cancelNewBtn.addEventListener("click", () => {
  addNewForm.classList.remove("active");
  addNewBtn.style.display = "block";
  isRecordingShortcut = false;
});

newShortcutKeyInput.addEventListener("focus", () => {
  isRecordingShortcut = true;
  newShortcutKeyInput.placeholder = "Press key combo now...";
});

newShortcutKeyInput.addEventListener("blur", () => {
  setTimeout(() => {
    isRecordingShortcut = false;
  }, 100);
});

saveNewBtn.addEventListener("click", () => {
  if (!recordedShortcut) {
    alert("Please record a shortcut key first.");
    return;
  }
  const commandId = newCommandSelect.value;

  // Check for conflict
  if (state.mappings[recordedShortcut]) {
    // Conflict!
    pendingConflictResolution = { key: recordedShortcut, commandId: commandId };
    showConflictModal(
      recordedShortcut,
      commandId,
      state.mappings[recordedShortcut].command,
    );
  } else {
    // No conflict, just save
    state.mappings[recordedShortcut] = { command: commandId };
    saveSettings();
    renderKeymap();
    cancelNewBtn.click();
  }
});

// --- Conflict Modal Logic ---

function getCommandName(id) {
  const cmd = commandsList.find((c) => c.id === id);
  return cmd ? cmd.name : id;
}

function showConflictModal(key, newCmdId, oldCmdId) {
  conflictNewKeyEl.textContent = key;
  conflictNewCmdEl.textContent = getCommandName(newCmdId);

  conflictOldKeyEl.textContent = key;
  conflictOldCmdEl.textContent = getCommandName(oldCmdId);

  conflictModal.classList.add("active");
}

function closeConflictModal() {
  conflictModal.classList.remove("active");
  pendingConflictResolution = null;
}

modalBtnCancel.addEventListener("click", closeConflictModal);

modalBtnKeepNew.addEventListener("click", () => {
  if (pendingConflictResolution) {
    state.mappings[pendingConflictResolution.key] = {
      command: pendingConflictResolution.commandId,
    };
    saveSettings();
    renderKeymap();
    closeConflictModal();
    cancelNewBtn.click(); // Close the add form
  }
});

modalBtnSuggest.addEventListener("click", () => {
  // Quick-remap old to a new suggestion (e.g. append +ALT)
  if (pendingConflictResolution) {
    const oldCmd = state.mappings[pendingConflictResolution.key].command;
    let suggestion = pendingConflictResolution.key + "+ALT";
    if (suggestion.includes("ALT+ALT"))
      suggestion = suggestion.replace("+ALT", "+SHIFT"); // Just a dummy heuristic

    state.mappings[suggestion] = { command: oldCmd };
    state.mappings[pendingConflictResolution.key] = {
      command: pendingConflictResolution.commandId,
    };

    alert(`Old command mapped to: ${suggestion}`);
    saveSettings();
    renderKeymap();
    closeConflictModal();
    cancelNewBtn.click();
  }
});

// --- Export / Import Profiles ---
exportBtn.addEventListener("click", () => {
  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchorNode = document.createElement("a");
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "free_keys_profile.json");
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
});

importBtn.addEventListener("click", () => {
  importFileInput.click();
});

importFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      if (parsed && parsed.mappings) {
        state = { ...state, ...parsed };
        saveSettings();
        renderKeymap();
        universalModifierToggle.checked = state.mode === "universal";
        universalModifierMode = state.mode === "universal";
        alert("Profile imported successfully!");
      } else {
        alert("Invalid profile file.");
      }
    } catch (err) {
      alert("Error parsing the file.");
    }
  };
  reader.readAsText(file);
  // Reset file input so same file can be imported again if needed
  importFileInput.value = "";
});

async function init() {
  await loadCommands();
  populateCommandSelect();
  loadSettings();
  console.log(
    "%c🚀 Free Keys loaded — Plain single-key mode ready!",
    "color:#00a2ff; font-size:16px;",
  );
}

init();
