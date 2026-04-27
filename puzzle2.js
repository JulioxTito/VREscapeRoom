// puzzle2.js — Weight Scale Puzzle
// Import in index.html and call initPuzzle2(scene, camera, renderer)

import * as THREE from 'three';

let _scene;
let puzzle2Solved = false;
let currentWeight = 0;
const rocksOnScale = new Set();
const rocks = [];

// -------------------------------------------------------------------
// EDITABLE SETTINGS
// -------------------------------------------------------------------
const TARGET_WEIGHT = 67;
const SCALE_CENTER = new THREE.Vector3(6, 0, -22); // Station 2 position

// Rock weights — only some add up to TARGET_WEIGHT
// Player must figure out which combination is correct
const ROCK_WEIGHTS = [15, 20, 32, 12, 20]; // 15+20+32 = 67 ✅

// Scatter positions for rocks near scale
const ROCK_START_POSITIONS = [
    new THREE.Vector3(5.0, 0.5, -20.5),
    new THREE.Vector3(5.5, 0.5, -21.0),
    new THREE.Vector3(6.5, 0.5, -20.5),
    new THREE.Vector3(7.0, 0.5, -21.0),
    new THREE.Vector3(6.0, 0.5, -20.2),
];

// Snap positions on the right pan (stacked slightly)
const PAN_SNAP_POSITIONS = [
    new THREE.Vector3(6.42, 1.45, -22),
    new THREE.Vector3(6.42, 1.55, -22),
    new THREE.Vector3(6.42, 1.65, -22),
    new THREE.Vector3(6.42, 1.75, -22),
    new THREE.Vector3(6.42, 1.85, -22),
];

// Scale parts
let scaleBeam = null;
let rightPan = null;
let leftPan = null;
let weightDisplay = null;

// -------------------------------------------------------------------
// MAIN EXPORT
// -------------------------------------------------------------------
export function initPuzzle2(scene, camera, renderer) {
    _scene = scene;
    buildScale();
    buildRocks();
    createWeightDisplay();
}

// -------------------------------------------------------------------
// GRAB / RELEASE
// -------------------------------------------------------------------
export function puzzle2TryGrab(controller, raycaster) {
    if (puzzle2Solved) return false;
    if (rocks.length === 0) return false;

    const meshes = [];
    rocks.forEach(r => {
        if (!r.userData.onScale) {
            r.traverse(c => { if (c.isMesh) meshes.push(c); });
        }
    });

    const hits = raycaster.intersectObjects(meshes, true);
    if (hits.length > 0) {
        let obj = hits[0].object;
        while (obj && !obj.userData.isRock) obj = obj.parent;
        if (obj && !obj.userData.onScale) {
            obj.traverse(c => {
                if (c.isMesh) {
                    c.material = c.material.clone();
                    c.material.emissive = new THREE.Color(0x6600CC);
                    c.material.emissiveIntensity = 0.5;
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

    // Check if dropped near right pan
    const panPos = new THREE.Vector3(6.42, 1.4, -22);
    const dist = worldPos.distanceTo(panPos);

    if (dist < 0.8) {
        placeRockOnScale(rock);
    }

    return true;
}

export function puzzle2UpdateHover(controllers, raycaster) {
    rocks.forEach(r => {
        if (!r.userData.onScale) {
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

// -------------------------------------------------------------------
// PLACE ROCK ON SCALE
// -------------------------------------------------------------------
function placeRockOnScale(rock) {
    const slotIndex = rocksOnScale.size;
    if (slotIndex >= PAN_SNAP_POSITIONS.length) return;

    const snapPos = PAN_SNAP_POSITIONS[slotIndex];
    rock.position.copy(snapPos);
    rock.rotation.set(0, 0, 0);
    rock.userData.onScale = true;
    rocksOnScale.add(rock);

    // Add weight
    currentWeight += rock.userData.weight;

    // Update display
    updateWeightDisplay();

    // Tilt scale beam
    updateScaleTilt();

    // Flash green if correct, red if over
    const color = currentWeight === TARGET_WEIGHT ? 0x00FF00 :
                  currentWeight > TARGET_WEIGHT  ? 0xFF0000 : 0xFFAA00;

    rock.traverse(c => {
        if (c.isMesh) {
            c.material = c.material.clone();
            c.material.emissive = new THREE.Color(color);
            c.material.emissiveIntensity = 0.8;
        }
    });
    setTimeout(() => {
        rock.traverse(c => {
            if (c.isMesh) c.material.emissiveIntensity = 0.1;
        });
    }, 600);

    if (currentWeight === TARGET_WEIGHT) {
        setTimeout(() => onPuzzle2Solved(), 800);
    } else if (currentWeight > TARGET_WEIGHT) {
        // Too heavy — reset after 2 seconds
        setTimeout(() => resetScale(), 2000);
    }
}

// -------------------------------------------------------------------
// RESET SCALE
// -------------------------------------------------------------------
function resetScale() {
    rocksOnScale.forEach(rock => {
        const i = rocks.indexOf(rock);
        rock.position.copy(ROCK_START_POSITIONS[i]);
        rock.userData.onScale = false;
        rock.traverse(c => {
            if (c.isMesh) {
                c.material = c.material.clone();
                c.material.emissive = new THREE.Color(0xFF0000);
                c.material.emissiveIntensity = 0.5;
            }
        });
        setTimeout(() => {
            rock.traverse(c => {
                if (c.isMesh) c.material.emissiveIntensity = 0;
            });
        }, 500);
    });
    rocksOnScale.clear();
    currentWeight = 0;
    updateWeightDisplay();
    updateScaleTilt();
}

// -------------------------------------------------------------------
// SCALE TILT ANIMATION
// -------------------------------------------------------------------
function updateScaleTilt() {
    if (!scaleBeam) return;
    const ratio = currentWeight / TARGET_WEIGHT;
    // Tilt right side down as weight increases
    const maxTilt = Math.PI / 8; // 22.5 degrees max
    const tilt = Math.min(ratio, 1.5) * maxTilt;
    scaleBeam.rotation.z = -tilt;

    // Move pans with beam
    if (rightPan) rightPan.position.y = 1.38 - Math.sin(tilt) * 0.3;
    if (leftPan)  leftPan.position.y  = 1.38 + Math.sin(tilt) * 0.3;
}

// -------------------------------------------------------------------
// BUILD SCALE
// -------------------------------------------------------------------
function buildScale() {
    const goldMat = new THREE.MeshStandardMaterial({
        color: 0xDAA520,
        roughness: 0.2,
        metalness: 0.8,
        emissive: new THREE.Color(0x6A3A00),
        emissiveIntensity: 0.3
    });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7A6A50, roughness: 0.7 });

    // Pedestal
    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, 0.4), stoneMat);
    ped.position.copy(SCALE_CENTER);
    ped.position.y = 0.45;
    _scene.add(ped);

    // Vertical pillar
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.8, 12), goldMat);
    pillar.position.set(SCALE_CENTER.x, 1.35, SCALE_CENTER.z);
    _scene.add(pillar);

    // Beam (rotates to show balance)
    scaleBeam = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.04), goldMat);
    scaleBeam.position.set(SCALE_CENTER.x, 1.75, SCALE_CENTER.z);
    _scene.add(scaleBeam);

    // Left pan (target weight side)
    leftPan = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 16), goldMat);
    leftPan.position.set(SCALE_CENTER.x - 0.48, 1.38, SCALE_CENTER.z);
    _scene.add(leftPan);

    // Right pan (player places rocks here)
    rightPan = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 16), goldMat);
    rightPan.position.set(SCALE_CENTER.x + 0.48, 1.38, SCALE_CENTER.z);
    _scene.add(rightPan);

    // Left pan chains
    const chainMat = new THREE.MeshStandardMaterial({ color: 0xDAA520 });
    [[-0.06, 0], [0.06, 0], [0, -0.06], [0, 0.06]].forEach(([ox, oz]) => {
        const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.35, 4), chainMat);
        chain.position.set(SCALE_CENTER.x - 0.48 + ox, 1.57, SCALE_CENTER.z + oz);
        _scene.add(chain);
    });

    // Right pan chains
    [[-0.06, 0], [0.06, 0], [0, -0.06], [0, 0.06]].forEach(([ox, oz]) => {
        const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.35, 4), chainMat);
        chain.position.set(SCALE_CENTER.x + 0.48 + ox, 1.57, SCALE_CENTER.z + oz);
        _scene.add(chain);
    });

    // Target weight object on left pan — big stone block with number
    buildTargetWeight();

    // Glow light over scale
    const glow = new THREE.PointLight(0xFFAA00, 1.5, 5);
    glow.position.set(SCALE_CENTER.x, 3.0, SCALE_CENTER.z);
    _scene.add(glow);
}

// -------------------------------------------------------------------
// TARGET WEIGHT on left pan
// -------------------------------------------------------------------
function buildTargetWeight() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Stone background
    ctx.fillStyle = '#6B5A3E';
    ctx.fillRect(0, 0, 256, 256);

    // Border
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 236, 236);

    // Weight number
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 100px serif';
    ctx.textAlign = 'center';
    ctx.fillText(TARGET_WEIGHT, 128, 155);

    // Label
    ctx.font = '30px serif';
    ctx.fillText('weight', 128, 210);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6B5A3E, roughness: 0.9 });

    const materials = [stoneMat, stoneMat, stoneMat, stoneMat, mat, stoneMat];
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.1), materials);
    block.position.set(SCALE_CENTER.x - 0.48, 1.56, SCALE_CENTER.z);
    _scene.add(block);
}

// -------------------------------------------------------------------
// BUILD ROCKS
// -------------------------------------------------------------------
function buildRocks() {
    ROCK_WEIGHTS.forEach((weight, index) => {
        const canvas = document.createElement('canvas');
        canvas.width = 128; canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Rock color — earthy brown
        ctx.fillStyle = '#8B7355';
        ctx.fillRect(0, 0, 128, 128);

        // Weight text
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 52px serif';
        ctx.textAlign = 'center';
        ctx.fillText(weight, 64, 80);

        const tex = new THREE.CanvasTexture(canvas);
        const frontMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
        const rockMat  = new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.9 });

        const materials = [rockMat, rockMat, rockMat, rockMat, frontMat, rockMat];
        const rock = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), materials);

        rock.position.copy(ROCK_START_POSITIONS[index]);
        rock.userData.isRock = true;
        rock.userData.weight = weight;
        rock.userData.onScale = false;
        rock.userData.startPos = ROCK_START_POSITIONS[index].clone();

        _scene.add(rock);
        rocks.push(rock);
    });
}

// -------------------------------------------------------------------
// WEIGHT DISPLAY
// -------------------------------------------------------------------
function createWeightDisplay() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 128;
    canvas.id = 'p2-canvas';
    document.body.appendChild(canvas);

    const div = document.createElement('div');
    div.id = 'p2-ui';
    div.style.cssText = `
        position: fixed; bottom: 40px; left: 50%;
        transform: translateX(-50%);
        color: #FFD700; font-family: serif; font-size: 18px;
        text-align: center; pointer-events: none;
        text-shadow: 0 0 10px #FF6600;
        background: rgba(0,0,0,0.5);
        padding: 8px 20px;
        border-radius: 8px;
    `;
    div.innerHTML = `Scale: <span id="p2-current">0</span> / ${TARGET_WEIGHT}`;
    document.body.appendChild(div);
}

function updateWeightDisplay() {
    const el = document.getElementById('p2-current');
    if (el) {
        el.textContent = currentWeight;
        el.style.color = currentWeight === TARGET_WEIGHT ? '#00FF00' :
                         currentWeight > TARGET_WEIGHT  ? '#FF0000' : '#FFD700';
    }
}

// -------------------------------------------------------------------
// PUZZLE SOLVED
// -------------------------------------------------------------------
function onPuzzle2Solved() {
    puzzle2Solved = true;

    const el = document.getElementById('p2-ui');
    if (el) el.innerHTML = `✨ Scale Balanced! ✨`;

    // Big gold burst
    const burst = new THREE.PointLight(0xFFD700, 10, 8);
    burst.position.copy(SCALE_CENTER);
    burst.position.y = 2;
    _scene.add(burst);
    setTimeout(() => _scene.remove(burst), 2000);

    console.log('Puzzle 2 solved!');
}
