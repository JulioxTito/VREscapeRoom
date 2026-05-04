# VR Egyptian Escape Room

An immersive WebXR escape room experience set inside an ancient Egyptian pharaoh's tomb. Built with Three.js, this project supports both VR headsets (Meta Quest 3, etc.) and desktop fallback (mouse + WASD keyboard controls).

The player has **10 minutes** to solve three connected puzzles and escape into the desert beyond.

---

## 🎯 Game Overview

You wake up trapped inside a sealed Egyptian tomb. The corridor door is locked, and a 10-minute hourglass is counting down. To escape, you must:

1. **Grab the golden scrab and enter the room 
2. **Solve three different puzzles one by one 
3. **Grab the gold key** from the last station
4. **Insert the key** into the keyhole stand near the lever
5. Pull the lever** to open the main exit door
6. **Walk out into the desert** before time runs out

---

## 📁 Project Structure

```
VREscapeRoom/
├── index.html              # Main file — open this with Live Server
├── puzzle1.js              # ES module — scrolls/weights puzzle
├── puzzle3.js              # ES module — treasure chest puzzle
├── puzzle3.html            # Standalone test page for chest puzzle
├── README.md               # This file
└── Assets/
    ├── Models/             # 3D models (.glb / .gltf)
    │   ├── anubis/
    │   ├── cat_egypt/
    │   ├── cat_pharaoh_king/
    │   ├── egypt_stone_block___3daily_2017/
    │   ├── egyptian_pillar_v1/
    │   ├── egyptian_style_sphinx_statue/
    │   ├── torch/
    │   └── sarcophagus3.glb        # Custom Blender-modeled sarcophagus
    ├── textures/
    │   ├── dessert_360.jpg         # Outdoor desert skybox
    │   ├── tomb_360.jpg            # Tomb interior skybox
    │   ├── outsideEgypt.jpg        # Desert sky after escape
    │   ├── door_entrence.png       # Wood-grained door texture
    │   └── facts-about-ancient-egypt-1.jpg  # Hieroglyph mural
    └── audio/
        └── tomb_music.mp3          # Background ambient music
```

---

## 🚀 How to Run

### Prerequisites

- **Visual Studio Code** with the **Live Server** extension (search "Live Server" by Ritwick Dey in the VS Code Extensions tab)
- A modern web browser (Chrome or Edge recommended for WebXR support)

### Steps

1. **Clone or download** this project to your computer
2. **Open the project folder** in VS Code
3. **Right-click `index.html`** → select **"Open with Live Server"**
4. Live Server opens the page in your browser at `http://127.0.0.1:5500/index.html`
5. **Click anywhere on the canvas** (or press a movement key) to start the timer
6. The hourglass in the top-right corner begins counting down from `3:00` when the golden scrab is grabbed 

> ⚠️ **Important:** The project must be served over HTTP, not opened directly from the filesystem. ES modules and WebXR both require a real server context.

---

## 🎮 How to Play

### Desktop controls (no VR headset needed)

| Action | Control |
|--------|---------|
| Move forward | **W** |
| Move backward | **S** |
| Strafe left | **A** |
| Strafe right | **D** |
| Look around | Click + drag mouse |
| Interact (click dial, grab key, pull lever) | **Left click** |

### VR controls

If you have a VR headset (Meta Quest, Valve Index, etc.):

1. Open the page in the headset's browser
2. Click the **"Enter VR"** button at the bottom of the page
3. Use thumbstick to move, point your controller and **pull the trigger** to interact

### Testing on a Mac without a headset

Install the **WebXR API Emulator** Chrome extension:

1. Search "Meta WebXR API Emulator" on the Chrome Web Store
2. Install it
3. Open your page — you'll see two virtual controller panels at the bottom
4. Click **"Click to activate play mode"** at the top
5. Click **"Press"** next to the **L Trigger** or **R Trigger** rows to fire each controller's trigger

---

## ⌨️ Test/Cheat Shortcuts

For quick testing without playing through the full puzzle, the following keys skip ahead:

| Key | Action |
|-----|--------|
| **1** | Auto-solve the chest (sets dials to 4-2-3, opens it, key floats out) |
| **2** | Force-grab the key (attaches to camera/controller) |
| **3** | Force-insert the key into the keyhole stand |
| **4** | Force-pull the lever (opens the door) |
| **5** | Teleport outside the door to test the YOU ESCAPED screen |

These shortcuts are intended for development and grading. To do a full normal playthrough, simply ignore them.

---

## ✨ Features

### Base features

- ✅ Immersive 3D environment (tomb, corridor, desert)
- ✅ VR / WebXR compatibility with both controllers wired
- ✅ Player movement (WASD + VR thumbstick)
- ✅ Object interaction via raycasting (VR + mouse)

### Advanced features

- ✅ **Multi-stage puzzle system** — three connected puzzles that gate each other
- ✅ **Custom 3D modeling** — sarcophagus modeled from scratch in Blender 4.5
- ✅ **Procedural textures** — dial number labels, Egyptian symbol panels, wood grain, all generated at runtime with Canvas2D
- ✅ **Animated mechanics** — eased animations on lever, door, chest lid, key float, and lever rising
- ✅ **Live countdown timer** — 10-minute hourglass HUD with animated SVG sand draining and color shifts (gold → orange → red)
- ✅ **Dynamic sky swap** — background switches from tomb darkness to bright desert when the lever is pulled
- ✅ **Game win state** — full-screen YOU ESCAPED banner with glow animation
- ✅ **Modular code** — treasure chest puzzle isolated as a separate ES module (`puzzle3.js`)

---

## 🛠️ Technologies Used

- **Three.js (r0.160.0)** — core 3D rendering library
- **WebXR / VRButton** — VR session management
- **XRControllerModelFactory** — controller model loading
- **GLTFLoader** — for loading `.glb` and `.gltf` models
- **Canvas2D** — procedural texture generation
- **HTML/CSS/SVG** — for the timer HUD and end-state banner

---

## 📚 Asset Credits

| Asset | Source | License |
|-------|--------|---------|
| Three.js | [threejs.org](https://threejs.org/) | MIT |
| Egyptian Sphinx Statue | Sketchfab (3D Daily, 2017) | CC Attribution |
| Cat Pharaoh King Statue | Sketchfab | CC Attribution |
| Anubis Statue | Sketchfab | CC Attribution |
| Egyptian Pillar | Sketchfab | CC Attribution |
| Torch | Sketchfab | CC Attribution |
| Egyptian Stone Block | Sketchfab (3D Daily, 2017) | CC Attribution |
| Hieroglyph mural texture | Royalty-free | — |
| Desert sky equirectangular | Royalty-free | — |
| Custom Sarcophagus | Original work in Blender 4.5 | — |

---

## 🔮 Future Improvements

- Add positional 3D audio (footsteps, dial clicks, lever creak, door rumble, ambient torches)
- Randomize the chest combination on each playthrough so the counting puzzle stays meaningful
- Add a second branching corridor with another puzzle (e.g., weight-based pressure plates)
- Improve the sarcophagus with carved hieroglyphic panels and crook-and-flail symbols
- Add a brief tutorial overlay at the start
- Lazy-load outdoor assets only after the lever is pulled

---

## 🐛 Troubleshooting

**The page is blank when I open `index.html` directly:**
ES modules require a real HTTP server. Use Live Server, not `file://` URLs.

**The timer doesn't start:**
Click anywhere on the 3D canvas, or press a movement key (W/A/S/D), to start the timer. It auto-starts on first interaction.

**Dials don't respond when I click:**
Make sure you're clicking directly on a dial (the brown cylinder under each symbol panel). On VR, aim the white pointer ray AT the dial before pulling the trigger.

**The chest unlocks but no key appears:**
Check the browser console (`Cmd+Option+J` on Mac, `F12` on Windows). The console logs `★ Treasure chest UNLOCKED!` when solved. The key takes ~2 seconds to rise out of the chest.

**"YOU ESCAPED!" never shows:**
Make sure you've pulled the lever AND walked all the way through the doorway. The trigger is when your camera position crosses `z > 6.7`.

**My VR controller doesn't show up:**
Verify your headset supports WebXR. In Chrome, navigate to `chrome://flags/#webxr` and ensure WebXR is enabled.

---

## 📄 License

This project was built as a class assignment for a Virtual Reality course. Code is original (except for Three.js and listed asset credits). Free to use for educational purposes.

---

## 👥 Authors


**[Julio Tito and Cinchan Harikrishna]** — VR Course, April 2026

---

*"Can The Pharaoh's Tomb be conquered?"* ⌛
