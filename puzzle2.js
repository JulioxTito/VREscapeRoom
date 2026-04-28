// puzzle2.js — Egyptian Weight Scale Puzzle
// Import in index.html and call initPuzzle2(scene, camera, renderer)

import * as THREE from 'three';

let _scene;
const rocks = [];
const rocksOnPan = [];
let puzzle2Solved = false;

const TARGET_WEIGHT = 50;
// Rock weights — correct combo: 10 + 20 + 20 = 50
const ROCK_WEIGHTS = [10, 20, 8, 15, 25, 5, 20];

const SNAP_DISTANCE = 0.5;
const PAN_RIGHT_POS = new THREE.Vector3(-5.58, 1.45, -22);

let beamRef   = null;
let panLeftRef  = null;
let panRightRef = null;

// Side label refs so we can update the right one each frame
let rightLabelGroup = null;

const ROCK_POSITIONS = [
    new THREE.Vector3(-5.0, 0.95, -21.2),
    new THREE.Vector3(-4.8, 0.95, -21.6),
    new THREE.Vector3(-5.3, 0.95, -21.8),
    new THREE.Vector3(-4.9, 0.95, -22.2),
    new THREE.Vector3(-5.2, 0.95, -22.6),
    new THREE.Vector3(-4.7, 0.95, -22.9),
    new THREE.Vector3(-5.5, 0.95, -22.4),
];

// -------------------------------------------------------------------
// MAIN EXPORT
// -------------------------------------------------------------------
export function initPuzzle2(scene, camera, renderer) {
    _scene = scene;
    buildBigRock();
    buildRocks();
    buildLeftLabel();   // permanent "50" next to left pan
    buildRightLabel(0); // live total next to right pan, starts at 0
    createProgressUI();
    console.log('✅ Puzzle 2 (Scale) initialised. Target:', TARGET_WEIGHT);
}

export function puzzle2RegisterRefs(beam, panLeft, panRight) {
    beamRef     = beam;
    panLeftRef  = panLeft;
    panRightRef = panRight;
}

// -------------------------------------------------------------------
// GRAB / RELEASE — mirrors puzzle1 exactly
// -------------------------------------------------------------------
export function puzzle2TryGrab(controller, raycaster) {
    if (rocks.length === 0 || puzzle2Solved) return false;

    const meshes = [];
    rocks.forEach(r => {
        if (!r.userData.snapped) {
            r.traverse(c => { if (c.isMesh) meshes.push(c); });
        }
    });

    const hits = raycaster.intersectObjects(meshes, true);
    if (hits.length > 0) {
        let obj = hits[0].object;
        while (obj && !obj.userData.isRock) obj = obj.parent;
        if (obj && !obj.userData.snapped) {
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

    rock.traverse(c => {
        if (c.isMesh) c.material.emissiveIntensity = 0;
    });

    const dist = worldPos.distanceTo(PAN_RIGHT_POS);
    if (dist < SNAP_DISTANCE && !rocksOnPan.includes(rock)) {
        snapRock(rock);
    }

    return true;
}

export function puzzle2UpdateHover(controllers, raycaster) {
    rocks.forEach(r => {
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

export function puzzle2UpdateBeam() {
    if (!beamRef || !panLeftRef || !panRightRef) return;

    const rightTotal = rocksOnPan.reduce((sum, r) => sum + r.userData.weight, 0);
    const diff = rightTotal - TARGET_WEIGHT;

    const maxTilt = 0.4;
    const tilt = Math.max(-maxTilt, Math.min(maxTilt, diff * 0.012));
    beamRef.rotation.z = tilt;

    const halfLen = 0.42;
    panLeftRef.position.y  = 1.38 + Math.sin(tilt) * halfLen;
    panRightRef.position.y = 1.38 - Math.sin(tilt) * halfLen;

    rocksOnPan.forEach((r, i) => {
        r.position.y = panRightRef.position.y + 0.06 + i * 0.07;
    });
}

// -------------------------------------------------------------------
// SNAP
// -------------------------------------------------------------------
function snapRock(rock) {
    const i = rocksOnPan.length;
    rock.position.set(PAN_RIGHT_POS.x, PAN_RIGHT_POS.y + 0.06 + i * 0.07, PAN_RIGHT_POS.z);
    rock.rotation.set(0, 0, 0);
    rock.userData.snapped = true;
    rocksOnPan.push(rock);

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
    }, 600);

    const rightTotal = rocksOnPan.reduce((sum, r) => sum + r.userData.weight, 0);
    updateUI(rightTotal);
    buildRightLabel(rightTotal); // refresh the 3D label
    if (rightTotal === TARGET_WEIGHT) onPuzzleSolved();
}

// -------------------------------------------------------------------
// BUILD ROCKS
// -------------------------------------------------------------------
function buildRocks() {
    const stoneColors = [0x8B7355, 0x7A6A50, 0x9B8365, 0x6B5A3E, 0xA08870, 0x7C6C52, 0x857060];

    ROCK_WEIGHTS.forEach((w, i) => {
        const group = new THREE.Group();
        group.userData.isRock = true;
        group.userData.weight = w;
        group.userData.snapped = false;

        const body = new THREE.Mesh(
            new THREE.SphereGeometry(0.075, 7, 5),
            new THREE.MeshStandardMaterial({
                color: stoneColors[i % stoneColors.length],
                roughness: 0.95,
            })
        );
        body.scale.set(1.0, 0.7, 0.9);
        body.castShadow = true;
        group.add(body);

        // Gold plate on top
        const plate = new THREE.Mesh(
            new THREE.BoxGeometry(0.07, 0.015, 0.07),
            new THREE.MeshStandardMaterial({
                color: 0xDAA520,
                emissive: new THREE.Color(0xFFAA00),
                emissiveIntensity: 0.9,
                roughness: 0.3,
            })
        );
        plate.position.set(0, 0.065, 0);
        group.add(plate);

        // Weight number on top of plate (flat)
        const numGroup = makeNumberMesh(w);
        numGroup.position.set(0, 0.08, 0);
        group.add(numGroup);

        group.position.copy(ROCK_POSITIONS[i]);
        _scene.add(group);
        rocks.push(group);
        console.log(`✅ Rock ${i + 1} built (weight: ${w})`);
    });
}

function buildBigRock() {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0x5A4A30, roughness: 0.95 })
    );
    body.scale.set(1.0, 0.75, 0.9);
    body.castShadow = true;
    group.add(body);

    const plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.018, 0.14),
        new THREE.MeshStandardMaterial({
            color: 0xDAA520,
            emissive: new THREE.Color(0xFFAA00),
            emissiveIntensity: 0.9,
            roughness: 0.3,
        })
    );
    plate.position.set(0, 0.13, 0);
    group.add(plate);

    // Number flat on top of big rock
    const numGroup = makeNumberMesh(TARGET_WEIGHT);
    numGroup.position.set(0, 0.15, 0);
    group.add(numGroup);

    group.position.set(-6.42, 1.45, -22);
    _scene.add(group);
}

// -------------------------------------------------------------------
// SIDE LABELS — vertical panels next to each pan
// -------------------------------------------------------------------

// Left pan: permanent "50" label
function buildLeftLabel() {
    const group = new THREE.Group();

    // Dark stone background plate
    const bg = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.14, 0.015),
        new THREE.MeshStandardMaterial({ color: 0x2A1500, roughness: 0.9 })
    );
    group.add(bg);

    // Gold border
    const border = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.17, 0.01),
        new THREE.MeshStandardMaterial({
            color: 0xDAA520,
            emissive: new THREE.Color(0xFFAA00),
            emissiveIntensity: 0.5,
            roughness: 0.3,
        })
    );
    border.position.z = -0.004;
    group.add(border);

    // "TARGET:" tiny label at top
    const topBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.008, 0.012),
        new THREE.MeshStandardMaterial({
            color: 0xFFE680,
            emissive: new THREE.Color(0xFFCC00),
            emissiveIntensity: 0.8,
        })
    );
    topBar.position.set(0, 0.05, 0.008);
    group.add(topBar);

    // Big number — vertical (not rotated like on-rock ones)
    const num = makeNumberMeshVertical(TARGET_WEIGHT);
    num.position.set(0, -0.01, 0.012);
    group.add(num);

    // Position: beside the left pan, facing player (rotated slightly)
    group.position.set(-6.42, 1.75, -21.65);
    group.rotation.y = 0.3; // angle toward player
    _scene.add(group);
}

// Right pan: live total — rebuilt each time a rock snaps
function buildRightLabel(total) {
    if (rightLabelGroup) _scene.remove(rightLabelGroup);

    const group = new THREE.Group();

    const bg = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.14, 0.015),
        new THREE.MeshStandardMaterial({ color: 0x2A1500, roughness: 0.9 })
    );
    group.add(bg);

    const border = new THREE.Mesh(
        new THREE.BoxGeometry(0.31, 0.17, 0.01),
        new THREE.MeshStandardMaterial({
            color: total === TARGET_WEIGHT ? 0x00FF88 : 0xDAA520,
            emissive: new THREE.Color(total === TARGET_WEIGHT ? 0x00FF88 : 0xFFAA00),
            emissiveIntensity: total === TARGET_WEIGHT ? 1.5 : 0.5,
            roughness: 0.3,
        })
    );
    border.position.z = -0.004;
    group.add(border);

    // Divider line between current/target
    const divider = new THREE.Mesh(
        new THREE.BoxGeometry(0.003, 0.10, 0.012),
        new THREE.MeshStandardMaterial({
            color: 0xFFE680,
            emissive: new THREE.Color(0xFFCC00),
            emissiveIntensity: 0.8,
        })
    );
    divider.position.set(0.01, 0, 0.012);
    group.add(divider);

    // Current total on the left side of divider
    const numLeft = makeNumberMeshVertical(total);
    numLeft.position.set(-0.065, 0, 0.012);
    group.add(numLeft);

    // Target on right side of divider
    const numRight = makeNumberMeshVertical(TARGET_WEIGHT);
    numRight.position.set(0.075, 0, 0.012);
    // Dim it slightly so current stands out
    numRight.traverse(c => {
        if (c.isMesh) c.material = c.material.clone();
        if (c.isMesh) c.material.emissiveIntensity = 0.4;
    });
    group.add(numRight);

    group.position.set(-5.58, 1.75, -21.65);
    group.rotation.y = -0.3;
    _scene.add(group);
    rightLabelGroup = group;
}

// -------------------------------------------------------------------
// NUMBER MESHES
// -------------------------------------------------------------------

// Flat version — lies on top of rocks (rotation.x = -PI/2)
function makeNumberMesh(num) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
        color: 0xFFE680,
        emissive: new THREE.Color(0xFFCC00),
        emissiveIntensity: 1.5,
        roughness: 0.4,
    });

    const str = String(num);
    const spacing = 0.028;
    const totalW = (str.length - 1) * spacing;
    let x = -totalW / 2;

    for (const ch of str) {
        getSegments(ch).forEach(seg => {
            const bar = new THREE.Mesh(new THREE.BoxGeometry(seg.w, seg.h, 0.004), mat);
            bar.position.set(x + seg.ox, seg.oy, 0);
            group.add(bar);
        });
        x += spacing;
    }

    group.rotation.x = -Math.PI / 2; // flat on top of rock
    return group;
}

// Vertical version — stands upright on side panels
function makeNumberMeshVertical(num) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
        color: 0xFFE680,
        emissive: new THREE.Color(0xFFCC00),
        emissiveIntensity: 1.5,
        roughness: 0.4,
    });

    const str = String(num);
    const spacing = 0.038;
    const totalW = (str.length - 1) * spacing;
    let x = -totalW / 2;

    for (const ch of str) {
        getSegments(ch).forEach(seg => {
            // Scale up for panel readability
            const bar = new THREE.Mesh(
                new THREE.BoxGeometry(seg.w * 1.6, seg.h * 1.6, 0.005),
                mat
            );
            bar.position.set(x + seg.ox * 1.6, seg.oy * 1.6, 0);
            group.add(bar);
        });
        x += spacing;
    }
    // No rotation — stays vertical
    return group;
}

function getSegments(ch) {
    const s = 0.004;
    const H = 0.011;
    const W = 0.007;
    const map = {
        '0': [
            { ox: 0,   oy:  H,   w: W*2, h: s },
            { ox: 0,   oy: -H,   w: W*2, h: s },
            { ox: -W,  oy:  0,   w: s,   h: H*2 },
            { ox:  W,  oy:  0,   w: s,   h: H*2 },
        ],
        '1': [{ ox: W, oy: 0, w: s, h: H*2 }],
        '2': [
            { ox: 0,  oy:  H,   w: W*2, h: s },
            { ox: 0,  oy:  0,   w: W*2, h: s },
            { ox: 0,  oy: -H,   w: W*2, h: s },
            { ox:  W, oy:  H/2, w: s,   h: H },
            { ox: -W, oy: -H/2, w: s,   h: H },
        ],
        '3': [
            { ox: 0,  oy:  H,  w: W*2, h: s },
            { ox: 0,  oy:  0,  w: W*2, h: s },
            { ox: 0,  oy: -H,  w: W*2, h: s },
            { ox:  W, oy:  0,  w: s,   h: H*2 },
        ],
        '4': [
            { ox: 0,  oy:  0,   w: W*2, h: s },
            { ox: -W, oy:  H/2, w: s,   h: H },
            { ox:  W, oy:  0,   w: s,   h: H*2 },
        ],
        '5': [
            { ox: 0,  oy:  H,   w: W*2, h: s },
            { ox: 0,  oy:  0,   w: W*2, h: s },
            { ox: 0,  oy: -H,   w: W*2, h: s },
            { ox: -W, oy:  H/2, w: s,   h: H },
            { ox:  W, oy: -H/2, w: s,   h: H },
        ],
        '6': [
            { ox: 0,  oy:  H,   w: W*2, h: s },
            { ox: 0,  oy:  0,   w: W*2, h: s },
            { ox: 0,  oy: -H,   w: W*2, h: s },
            { ox: -W, oy:  0,   w: s,   h: H*2 },
            { ox:  W, oy: -H/2, w: s,   h: H },
        ],
        '7': [
            { ox: 0,  oy:  H, w: W*2, h: s },
            { ox:  W, oy:  0, w: s,   h: H*2 },
        ],
        '8': [
            { ox: 0,  oy:  H, w: W*2, h: s },
            { ox: 0,  oy:  0, w: W*2, h: s },
            { ox: 0,  oy: -H, w: W*2, h: s },
            { ox: -W, oy:  0, w: s,   h: H*2 },
            { ox:  W, oy:  0, w: s,   h: H*2 },
        ],
        '9': [
            { ox: 0,  oy:  H,   w: W*2, h: s },
            { ox: 0,  oy:  0,   w: W*2, h: s },
            { ox: 0,  oy: -H,   w: W*2, h: s },
            { ox: -W, oy:  H/2, w: s,   h: H },
            { ox:  W, oy:  0,   w: s,   h: H*2 },
        ],
    };
    return map[ch] || [];
}

// -------------------------------------------------------------------
// PUZZLE SOLVED
// -------------------------------------------------------------------
function onPuzzleSolved() {
    if (puzzle2Solved) return;
    puzzle2Solved = true;

    const el = document.getElementById('p2-ui');
    if (el) el.innerHTML = `
        <span style="font-size:22px;">⚖️ The scales are balanced! ⚖️</span><br>
        <span style="font-size:14px; color:#FFA500;">Ma'at is satisfied...</span>
    `;

    const burst = new THREE.PointLight(0xFFD700, 8, 10);
    burst.position.set(-6, 2.0, -22);
    _scene.add(burst);
    setTimeout(() => _scene.remove(burst), 2000);

    window.dispatchEvent(new CustomEvent('puzzle2Solved'));
    console.log('✅ Puzzle 2 solved!');
}

// -------------------------------------------------------------------
// UI
// -------------------------------------------------------------------
function createProgressUI() {
    let div = document.getElementById('p2-ui');
    if (!div) {
        div = document.createElement('div');
        div.id = 'p2-ui';
        div.style.cssText = `
            position: fixed; top: 50px; left: 50%;
            transform: translateX(-50%);
            color: #FFD700; font-family: serif; font-size: 16px;
            text-align: center; pointer-events: none;
            text-shadow: 0 0 10px #FF6600;
        `;
        document.body.appendChild(div);
    }
    div.innerHTML = `Balance the sacred scales — target: <b>${TARGET_WEIGHT}</b><br>
        <span id="p2-progress">Right pan: 0 / ${TARGET_WEIGHT}</span>`;
}

function updateUI(rightTotal) {
    const el = document.getElementById('p2-progress');
    if (!el) return;
    const diff = TARGET_WEIGHT - rightTotal;
    if (diff === 0) {
        el.textContent = `⚖️ Perfect! (${rightTotal} / ${TARGET_WEIGHT})`;
        el.style.color = '#00FF88';
    } else if (diff > 0) {
        el.textContent = `Right pan: ${rightTotal} — need ${diff} more`;
        el.style.color = '#FFD700';
    } else {
        el.textContent = `Right pan: ${rightTotal} — too heavy by ${Math.abs(diff)}`;
        el.style.color = '#FF6060';
    }
}