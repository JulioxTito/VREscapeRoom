// puzzle2.js — Egyptian Weight Scale Puzzle
// Call initPuzzle2(scene, camera, renderer) from index.html
// Rocks are grabbed and dropped onto the right pan.
// Win condition: right pan total == TARGET_WEIGHT exactly.

import * as THREE from 'three';

// ── CONFIG (edit these freely) ──────────────────────────────────────
const TARGET_WEIGHT  = 67;          // weight shown on the big left rock
const ROCK_WEIGHTS   = [10, 20, 15, 25, 30, 7, 12]; // 5 correct rocks: 10+20+15+22 = nope, player figures it out
// Correct answer: 10 + 20 + 15 + 22 = nope. Correct combo: 10+20+15+22 nope.
// From [10,20,15,25,30,7,12]: 10+20+15+22=nope
// 10+20+15+22 → not in list. Let's just confirm: 10+20+25+12=67 ✓ 
// So out of 7 rocks the player must pick exactly 10, 20, 25, 12 (4 rocks)
const SNAP_DISTANCE  = 0.35;        // how close to pan to auto-snap
const PAN_CENTER_R   = new THREE.Vector3(-5.58, 1.48, -22); // right pan snap zone
// ────────────────────────────────────────────────────────────────────

let _scene;
let scaleBeamRef   = null;
let panLeftRef     = null;
let panRightRef    = null;
const rocksOnPan   = []; // rocks that have been snapped to the right pan
const allRocks     = [];
let puzzle2Solved  = false;

// Called from index.html
export function initPuzzle2(scene, camera, renderer) {
    _scene = scene;
    buildRocks();
    buildBigRock();
    createProgressUI();
    console.log('✅ Puzzle 2 (Scale) initialised. Target weight:', TARGET_WEIGHT);
}

// ── Grab / Release (mirrors puzzle1.js API) ─────────────────────────

export function puzzle2TryGrab(controller, raycaster) {
    if (allRocks.length === 0 || puzzle2Solved) return false;

    const meshes = [];
    allRocks.forEach(r => {
        if (!r.userData.snapped) {
            r.traverse(c => { if (c.isMesh) meshes.push(c); });
        }
    });

    const hits = raycaster.intersectObjects(meshes, true);
    if (hits.length > 0) {
        let obj = hits[0].object;
        while (obj && !obj.userData.isRock) obj = obj.parent;
        if (obj && !obj.userData.snapped) {
            // Highlight orange while held
            obj.traverse(c => {
                if (c.isMesh) {
                    c.material = c.material.clone();
                    c.material.emissive = new THREE.Color(0xFF6600);
                    c.material.emissiveIntensity = 0.6;
                }
            });
            controller.attach(obj);
            controller.userData.heldRock = obj;
            return true;
        }
    }
    return false;
}

export function puzzle2TryRelease(controller) {
    const rock = controller.userData.heldRock;
    if (!rock) return false;

    const worldPos = new THREE.Vector3();
    rock.getWorldPosition(worldPos);

    _scene.attach(rock);
    controller.userData.heldRock = undefined;

    // Clear highlight
    rock.traverse(c => {
        if (c.isMesh) {
            c.material.emissive = new THREE.Color(0x000000);
            c.material.emissiveIntensity = 0;
        }
    });

    // Close enough to right pan?
    const dist = worldPos.distanceTo(PAN_CENTER_R);
    if (dist < SNAP_DISTANCE && !rocksOnPan.includes(rock)) {
        snapRockToPan(rock);
    }

    return true;
}

export function puzzle2UpdateHover(controllers, raycaster) {
    allRocks.forEach(r => {
        if (!r.userData.snapped) {
            const isHeld = controllers.some(c => c.userData.heldRock === r);
            if (!isHeld) {
                r.traverse(c => {
                    if (c.isMesh) {
                        c.material.emissive = new THREE.Color(0x000000);
                        c.material.emissiveIntensity = 0;
                    }
                });
            }
        }
    });
}

// Update beam tilt each frame — call from animate()
export function puzzle2UpdateBeam() {
    if (!scaleBeamRef || !panLeftRef || !panRightRef) return;

    const rightTotal = rocksOnPan.reduce((sum, r) => sum + r.userData.weight, 0);
    const diff = rightTotal - TARGET_WEIGHT; // negative = right side lighter, positive = right heavier

    // Tilt: max ±25° for a big imbalance, clamp
    const maxTilt = THREE.MathUtils.degToRad(25);
    const tilt = THREE.MathUtils.clamp(diff * 0.015, -maxTilt, maxTilt);
    scaleBeamRef.rotation.z = tilt;

    // Move pans with beam rotation (approximate)
    const beamHalfLen = 0.42;
    const leftDrop  =  Math.sin(tilt) * beamHalfLen;
    const rightDrop = -Math.sin(tilt) * beamHalfLen;
    panLeftRef.position.y  = 1.38 + leftDrop;
    panRightRef.position.y = 1.38 + rightDrop;

    // Move rocks on right pan with the pan
    rocksOnPan.forEach((r, i) => {
        r.position.y = panRightRef.position.y + 0.06 + i * 0.065;
    });
}

// ── Internal helpers ─────────────────────────────────────────────────

function snapRockToPan(rock) {
    const i = rocksOnPan.length;
    // Stack rocks on the pan, each slightly higher
    rock.position.set(
        PAN_CENTER_R.x,
        PAN_CENTER_R.y + 0.06 + i * 0.065,
        PAN_CENTER_R.z
    );
    rock.rotation.set(0, Math.random() * Math.PI * 2, 0);
    rock.userData.snapped = true;
    rocksOnPan.push(rock);

    // Gold flash
    rock.traverse(c => {
        if (c.isMesh) {
            c.material = c.material.clone();
            c.material.emissive = new THREE.Color(0xFFAA00);
            c.material.emissiveIntensity = 1.0;
        }
    });
    setTimeout(() => {
        rock.traverse(c => {
            if (c.isMesh) c.material.emissiveIntensity = 0;
        });
    }, 500);

    const rightTotal = rocksOnPan.reduce((sum, r) => sum + r.userData.weight, 0);
    updateUI(rightTotal);

    if (rightTotal === TARGET_WEIGHT) {
        onPuzzleSolved();
    }
}

// Build the 7 small rock objects
function buildRocks() {
    const rockMat = (color) => new THREE.MeshStandardMaterial({
        color,
        roughness: 0.9,
        metalness: 0.05,
    });

    const stoneColors = [0x8B7355, 0x7A6A50, 0x9B8365, 0x6B5A3E, 0xA08870, 0x7C6C52, 0x857060];

    const SPREAD_POSITIONS = [
        new THREE.Vector3(-5.2, 0.95, -21.4),
        new THREE.Vector3(-4.9, 0.95, -21.8),
        new THREE.Vector3(-5.5, 0.95, -22.0),
        new THREE.Vector3(-4.8, 0.95, -22.4),
        new THREE.Vector3(-5.3, 0.95, -22.8),
        new THREE.Vector3(-4.7, 0.95, -21.2),
        new THREE.Vector3(-5.6, 0.95, -22.6),
    ];

    ROCK_WEIGHTS.forEach((w, i) => {
        const group = new THREE.Group();
        group.userData.isRock = true;
        group.userData.weight = w;
        group.userData.snapped = false;

        // Slightly irregular rock shape: sphere squashed differently per rock
        const rx = 0.06 + Math.random() * 0.03;
        const ry = 0.05 + Math.random() * 0.02;
        const rz = 0.06 + Math.random() * 0.03;
        const body = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 8, 6),
            rockMat(stoneColors[i % stoneColors.length])
        );
        body.scale.set(rx / 0.08, ry / 0.08, rz / 0.08);
        body.castShadow = true;
        group.add(body);

        // Weight label on top (canvas texture)
        const label = makeWeightLabel(w);
        group.add(label);

        group.position.copy(SPREAD_POSITIONS[i]);
        group.rotation.y = Math.random() * Math.PI * 2;
        _scene.add(group);
        allRocks.push(group);
    });
}

// Build the big reference rock on the LEFT pan showing the target weight
function buildBigRock() {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0x5A4A30, roughness: 0.95 })
    );
    body.scale.set(1.0, 0.75, 0.9);
    body.castShadow = true;
    group.add(body);

    // Big weight label
    const label = makeWeightLabel(TARGET_WEIGHT, 0.18, true);
    label.position.set(0, 0.12, 0);
    group.add(label);

    // Place on left pan
    group.position.set(-6.42, 1.50, -22);
    _scene.add(group);

    // ── Store beam & pan refs from the scene (built in buildStation2) ──
    // We look them up by name from the scene. Station2 doesn't name them, so
    // we accept refs passed via puzzle2RegisterRefs() called from index.html.
}

// index.html calls this after buildStation2() to hand over beam/pan refs
export function puzzle2RegisterRefs(beam, panLeft, panRight) {
    scaleBeamRef = beam;
    panLeftRef   = panLeft;
    panRightRef  = panRight;
}

// Canvas weight number label
function makeWeightLabel(weight, size = 0.10, large = false) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const ctx = c.getContext('2d');

    // Dark stone background
    ctx.fillStyle = '#3a2a15';
    ctx.beginPath(); ctx.arc(64, 64, 60, 0, Math.PI * 2); ctx.fill();

    // Gold ring
    ctx.strokeStyle = '#DAA520';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(64, 64, 55, 0, Math.PI * 2); ctx.stroke();

    // Weight number
    ctx.fillStyle = '#FFE680';
    ctx.font = `bold ${large ? 48 : 56}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(weight), 64, 64);

    const tex = new THREE.CanvasTexture(c);
    const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
    );
    plane.position.set(0, large ? 0 : 0.095, 0);
    plane.rotation.x = -Math.PI / 2;
    return plane;
}

function updateUI(rightTotal) {
    const el = document.getElementById('p2-progress');
    if (el) {
        const diff = TARGET_WEIGHT - rightTotal;
        if (diff === 0) {
            el.textContent = `⚖️ Perfectly balanced! (${rightTotal} / ${TARGET_WEIGHT})`;
            el.style.color = '#00FF88';
        } else if (diff > 0) {
            el.textContent = `Right pan: ${rightTotal} — need ${diff} more`;
            el.style.color = '#FFD700';
        } else {
            el.textContent = `Right pan: ${rightTotal} — too heavy by ${Math.abs(diff)}`;
            el.style.color = '#FF6060';
        }
    }
}

function onPuzzleSolved() {
    if (puzzle2Solved) return;
    puzzle2Solved = true;

    const el = document.getElementById('p2-ui');
    if (el) {
        el.innerHTML = `
            <span style="font-size:22px;">⚖️ The scales are balanced! ⚖️</span><br>
            <span style="font-size:14px; color:#FFA500;">Ma'at is satisfied...</span>
        `;
    }

    // Gold burst light
    const burst = new THREE.PointLight(0xFFD700, 10, 8);
    burst.position.set(-6, 2.0, -22);
    _scene.add(burst);
    setTimeout(() => _scene.remove(burst), 2000);

    // Dispatch a custom event so index.html can update the 1/3 → 2/3 counter
    window.dispatchEvent(new CustomEvent('puzzle2Solved'));

    console.log('✅ Puzzle 2 solved!');
}

function createProgressUI() {
    let div = document.getElementById('p2-ui');
    if (!div) {
        div = document.createElement('div');
        div.id = 'p2-ui';
        div.style.cssText = `
            position: fixed; top: 60px; left: 50%;
            transform: translateX(-50%);
            color: #FFD700; font-family: serif; font-size: 16px;
            text-align: center; pointer-events: none;
            text-shadow: 0 0 10px #FF6600;
            display: none;
        `;
        document.body.appendChild(div);
    }
    div.innerHTML = `
        Balance the sacred scales...<br>
        <span style="font-size:13px; color:#CCC;">Target weight: <b style="color:#FFD700">${TARGET_WEIGHT}</b></span><br>
        <span id="p2-progress">Right pan: 0 — need ${TARGET_WEIGHT} more</span>
    `;
}

// Show the UI when station 2 is active (call from index.html)
export function puzzle2Show() {
    const el = document.getElementById('p2-ui');
    if (el) el.style.display = 'block';
}

export function puzzle2Hide() {
    const el = document.getElementById('p2-ui');
    if (el) el.style.display = 'none';
}

export { puzzle2Solved };
