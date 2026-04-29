# Free Keys — Technical Specification

**Version:** 1.0  
**Author:** Josh (with Grok assistance)  
**Date:** April 2026  
**Status:** Ready for implementation by Jules

## 1. Project Overview

Free Keys is a Photoshop UXP plugin that acts as a permanent override layer for keyboard shortcuts. It removes all native Photoshop restrictions and gives the user complete freedom to assign any command to any key combination.

The plugin has **one toggleable mode**:

- **Plain Mode (Universal Modifier Mode = OFF)** — Default  
  Single-key system + traditional modifiers (Ctrl, Shift, Alt, Cmd). Bare letter keys are allowed.

- **Universal Modifier Mode (ON)** — 2-key sequential system  
  Every first key becomes a group modifier. All commands require exactly two sequential keypresses. Held modifiers (Shift/Ctrl/Alt/Cmd) are only required during the first key press. 3-second timeout for the second key.

## 2. Core Modes — Detailed Behavior

### 2.1 Plain Mode (OFF)
- Single key or modifier+key combinations are supported.
- Examples: `S`, `Ctrl+S`, `Shift+S`, `Alt+S`, `Cmd+S`.
- Behaves like native Photoshop but without restrictions (bare letters work).

### 2.2 Universal Modifier Mode (ON)
- Mandatory **two sequential keypresses** for every command.
- First keypress (optionally with held modifiers) = group modifier.
- Held modifiers **only required during the first key press**.
- After first key is released, a **3-second countdown** starts.
- Second keypress (any key) executes the mapped command.
- Examples:
  - `S` then `M` → Marquee
  - Hold `Shift` + `S` (release) then `M` (within 3s) → Send to Layers
  - Hold `Ctrl` + `S` (release) then `P` → Paint Selection variant

## 3. State Machine (Universal Modifier Mode ON)

stateDiagram-v2
    [*] --> Idle
    Idle --> FirstKeyDetected : Keydown (any key)
    FirstKeyDetected --> HUDShown : Capture modifier + key, start 3s timer
    HUDShown --> CommandExecuted : Second key pressed (within 3s)
    HUDShown --> Idle : Timeout (3s) or Escape
    HUDShown --> Idle : Keyup of first key (if no second key yet)

**States:**
1. **Idle** — Normal Photoshop operation.
2. **FirstKeyDetected** — First key (+ any held modifiers) captured. Timer starts.
3. **HUDShown** — Toast visible with countdown (“Shift+S mode active — 3s remaining…”).
4. **CommandExecuted** — Mapping looked up and Photoshop command fired, then back to Idle.

## 4. Key Capture Strategy

- Use UXP `document.addEventListener('keydown')` and `keyup` on the panel + Photoshop’s scripting API where possible.
- When Universal Modifier Mode is ON, the plugin intercepts **all** key events globally (via a floating invisible panel or companion native module if UXP sandbox prevents true global capture).
- On first `keydown`:
  - Read `event.shiftKey`, `ctrlKey`, `altKey`, `metaKey`
  - Capture the key (normalized to uppercase)
  - Store pending combo (e.g. `"Shift+S"`)
  - Start 3000ms timeout
- On second `keydown` (within timeout):
  - Combine pending + second key (e.g. `"Shift+S+M"`)
  - Lookup in keymap → execute
- Timeout or Escape key cancels and returns to Idle.

**Note on UXP limitations:** True global key capture may require a small companion app (Electron/AHK on Windows, Swift on macOS) or a persistent floating panel. This is documented in Section 8.

## 5. HUD / Toast System

- Non-intrusive top-center toast (Photoshop-style)
- Shows current modifier (plain or with Shift/Ctrl/Alt/Cmd)
- Live countdown timer (3 seconds)
- Can be dismissed with Escape

## 6. Conflict Resolution (Side-by-Side Modal)

When assigning a shortcut that already exists:
- Modal appears **immediately** with two columns:
  - **Left:** New assignment you are creating
  - **Right:** Existing conflicting assignment
- Buttons:
  - “Keep New (remove old mapping)”
  - “Edit the Existing One Instead”
  - “Quick-remap old to [new suggestion e.g. S+M+2]”
  - “Cancel”
- No hunting through lists — everything visible at once.

## 7. Data Model & Storage

- Keymap stored as JSON in UXP local storage + optional cloud sync (future).
- Format:
  {
    "mode": "plain" | "universal",
    "mappings": {
      "S": { "command": "select.marquee" },
      "Shift+S": { "command": "layer.sendToLayersPanel" },
      "Shift+S+M": { "command": "..." }
    }
  }
- Supports import/export of profiles.

## 8. Technical Challenges & Solutions

1. **Global key capture in UXP** → Solution: Primary = floating invisible panel + Photoshop event listeners. Fallback = lightweight companion helper app.
2. **Photoshop tool/menu command IDs** → Maintain a community-updatable `commands.json` with all known IDs.
3. **Performance** → All lookup O(1) via Map object.
4. **Cross-platform modifiers** → Normalize Mac/Windows (Cmd vs Ctrl).

## 9. Implementation Phases

**Phase 1 (2–3 weeks)** — Core UI + Plain Mode + toggle  
**Phase 2 (2 weeks)** — Universal Modifier Mode state machine + HUD  
**Phase 3 (1–2 weeks)** — Conflict resolver modal + keymap editor  
**Phase 4** — Polish, export/import, profiles, companion app (optional)

## 10. Success Metrics

- Works with 100+ Photoshop tools/commands
- No input lag
- Conflict resolver used successfully in user testing
- Open-source community contributions enabled

## Appendix A: Photoshop Command Reference
(Will be a separate `src/commands.json` file — placeholders already in starter code)

===== FILE: src/manifest.json =====
{
  "manifestVersion": 5,
  "id": "com.josh.freekeys",
  "name": "Free Keys",
  "version": "0.1.0",
  "main": "index.html",
  "host": {
    "app": "PS",
    "minVersion": "24.0"
  },
  "icons": [
    { "path": "icons/icon.png", "width": 48, "height": 48 }
  ]
}

===== FILE: src/index.html =====
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Free Keys</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="panel">
    <h1>Free Keys</h1>
    
    <label>
      <input type="checkbox" id="universal-modifier-toggle" checked>
      <span>Universal Modifier Mode (2-key sequential + held Shift/Ctrl/Alt/Cmd ONLY on first key — 3s timeout)</span>
    </label>

    <input type="text" id="search" placeholder="Search shortcuts...">
    
    <div id="keymap-list"></div>
    
    <button id="add-new">+ Add New Shortcut</button>
  </div>

  <script src="main.js"></script>
</body>
</html>

===== FILE: src/style.css =====
body {
  background: #1e1e1e;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  padding: 16px;
  margin: 0;
}
.panel { max-width: 100%; }
h1 { margin-top: 0; color: #00ff88; }
label { display: flex; align-items: center; gap: 8px; font-size: 15px; cursor: pointer; }
input[type="checkbox"] { width: 18px; height: 18px; }
button { background: #00ff88; color: #000; border: none; padding: 10px 16px; margin-top: 12px; border-radius: 4px; cursor: pointer; font-weight: bold; }
input[type="text"] { width: 100%; padding: 10px; margin: 12px 0; background: #2d2d2d; border: 1px solid #444; color: #fff; border-radius: 4px; }

===== FILE: src/main.js =====
// Free Keys - main.js
const universalModifierToggle = document.getElementById('universal-modifier-toggle');
let universalModifierMode = true; // default ON

universalModifierToggle.addEventListener('change', () => {
  universalModifierMode = universalModifierToggle.checked;
  console.log('Universal Modifier Mode:', universalModifierMode 
    ? 'ON → 2-key sequential (first key optional held modifier, 3s for second key)' 
    : 'OFF → Plain: single key system + traditional modifiers');
});

// TODO: Global key interception (UXP limitations noted in specs)
// OFF: single key + modifier combos
// ON: capture first key (+ held modifiers), start 3s timer, then second key

console.log('%c🚀 Free Keys loaded — Plain single-key mode + Universal 2-key mode ready!', 'color:#00ff88; font-size:16px;');