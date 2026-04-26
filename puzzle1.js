// puzzle1.js — Broken Tablet Puzzle
// Usage in index.html: import { initPuzzle1 } from './puzzle1.js';
// Then call: initPuzzle1(scene, camera, renderer) inside init()

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const pieces = [];
let piecesPlaced = 0;
let _scene, _camera, _renderer;

const SNAP_DISTANCE = 9999;

const PIECE_FILES = [
    'Assets/Models/Tablet/piece1.glb',
    'Assets/Models/Tablet/piece2.glb',
    'Assets/Models/Tablet/piece3.glb',
    'Assets/Models/Tablet/piece4.glb',
    'Assets/Models/Tablet/piece5.glb',
    'Assets/Models/Tablet/piece6.glb',
];

const SNAP_POSITIONS = [
    new THREE.Vector3(-7.35, 1.54, -13.7),
    new THREE.Vector3(-7.82, 1.5,  -13.4),
    new THREE.Vector3(-7.15, 1.2,  -13.75),
    new THREE.Vector3(-7.75, 1.2,  -13.35),
    new THREE.Vector3(-7.77, 1.35, -13.4),
    new THREE.Vector3(-7.64, 1.64, -13.51),
];
const START_POSITIONS = [
    new THREE.Vector3(-6.3, 1.05, -11.7),
    new THREE.Vector3(-5.8, 1.05, -11.7),
    new THREE.Vector3(-6.3, 1.05, -12.0),
    new THREE.Vector3(-5.8, 1.05, -12.0),
    new THREE.Vector3(-6.3, 1.05, -12.3),
    new THREE.Vector3(-5.8, 1.05, -12.3),
];

// -------------------------------------------------------------------
// MAIN EXPORT — call this from index.html init()
// -------------------------------------------------------------------
export function initPuzzle1(scene, camera, renderer) {
    _scene    = scene;
    _camera   = camera;
    _renderer = renderer;

    buildTable();
    buildTabletFrame();
    loadAllPieces();
    createProgressUI();
}

// -------------------------------------------------------------------
// Called from index.html onSelectStart — pass the hit object
// Returns true if a piece was grabbed (so index knows to skip other logic)
// -------------------------------------------------------------------
export function puzzle1TryGrab(controller, raycaster) {
    if (pieces.length === 0) return false;

    const meshes = [];
    pieces.forEach(p => {
        if (!p.userData.snapped) {
            p.traverse(c => { if (c.isMesh) meshes.push(c); });
        }
    });

    const hits = raycaster.intersectObjects(meshes, true);
    if (hits.length > 0) {
        const piece = getParentPiece(hits[0].object);
        if (piece && !piece.userData.snapped) {
            piece.traverse(c => {
                if (c.isMesh) {
                    c.material = c.material.clone();
                    c.material.emissive = new THREE.Color(0x6600CC);
                    c.material.emissiveIntensity = 0.6;
                }
            });
            controller.attach(piece);
            controller.userData.heldPiece = piece;
            return true;
        }
    }
    return false;
}

// -------------------------------------------------------------------
// Called from index.html onSelectEnd
// Returns true if a piece was released
// -------------------------------------------------------------------
export function puzzle1TryRelease(controller) {
    const piece = controller.userData.heldPiece;
    if (!piece) return false;

    // Get world position BEFORE detaching
    const worldPos = new THREE.Vector3();
    piece.getWorldPosition(worldPos);

    _scene.attach(piece);
    controller.userData.heldPiece = undefined;

    piece.traverse(c => {
        if (c.isMesh) c.material.emissiveIntensity = 0;
    });

    trySnap(piece, worldPos);
    return true;
}

// -------------------------------------------------------------------
// Called from index.html animate() loop for hover highlight
// -------------------------------------------------------------------
export function puzzle1UpdateHover(controllers, raycaster) {
    // Clear highlights on unsnapped unheld pieces
    pieces.forEach(p => {
        if (!p.userData.snapped) {
            const isHeld = controllers.some(c => c.userData.heldPiece === p);
            if (!isHeld) {
                p.traverse(c => {
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
// INTERNAL FUNCTIONS
// -------------------------------------------------------------------
function buildTable() {
    const top = new THREE.MeshStandardMaterial({ color: 0x7A5C3A, roughness: 0.8 });
    const leg = new THREE.MeshStandardMaterial({ color: 0x5C3D1E, roughness: 1.0 });

   addBox(-6,   0.92, -12,   1.0, 0.08, 1.0, top);  // table top
addBox(-6.45, 0.46, -11.55, 0.08, 0.9, 0.08, leg); // leg 1
addBox(-5.55, 0.46, -11.55, 0.08, 0.9, 0.08, leg); // leg 2
addBox(-6.45, 0.46, -12.45, 0.08, 0.9, 0.08, leg); // leg 3
addBox(-5.55, 0.46, -12.45, 0.08, 0.9, 0.08, leg); // leg 4
}

function buildTabletFrame() {
    const frameMat = new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        emissive: new THREE.Color(0xFFAA00),
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.35,
    });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.85, 0.02), frameMat);
    frame.position.set(-8.78, 2.45, -11.5);
frame.rotation.y = Math.PI / 2;
    _scene.add(frame);

    const glow = new THREE.PointLight(0xFFAA00, 1.0, 3);
    glow.position.set(0, 1.4, -4.7);
    _scene.add(glow);

    SNAP_POSITIONS.forEach((pos) => {
        const slotMat = new THREE.MeshStandardMaterial({
            color: 0xFFD700,
            emissive: new THREE.Color(0xFFCC00),
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.2,
            wireframe: true
        });
        const slot = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.28, 0.01), slotMat);
        slot.position.copy(pos);
slot.rotation.y = Math.PI / 2;
        _scene.add(slot);
    });
}

function loadAllPieces() {
    PIECE_FILES.forEach((file, index) => {
        loader.load(file, (gltf) => {
            const piece = gltf.scene;
            piece.scale.set(0.09, 0.09, 0.09);
            piece.position.copy(START_POSITIONS[index]);
            piece.rotation.x = -Math.PI / 2;
            piece.rotation.y = -Math.PI / 2;
            piece.rotation.z = -Math.PI / 1.85;
            piece.userData.isPiece = true;
            piece.userData.index   = index;
            piece.userData.snapped = false;
            _scene.add(piece);
            pieces.push(piece);
            console.log(`✅ Tablet piece ${index + 1} loaded`);
        }, undefined, (err) => {
            console.error(`❌ Failed to load piece ${index + 1}:`, err);
        });
    });
}

function getParentPiece(obj) {
    while (obj) {
        if (obj.userData.isPiece) return obj;
        obj = obj.parent;
    }
    return null;
}

function trySnap(piece, worldPos) {
    if (!worldPos) {
        worldPos = new THREE.Vector3();
        piece.getWorldPosition(worldPos);
    }
    const target = SNAP_POSITIONS[piece.userData.index];
    const dist   = worldPos.distanceTo(target);

    if (dist < SNAP_DISTANCE) {
        piece.position.copy(target);
        piece.userData.snapped = true;

        piece.traverse(c => {
            if (c.isMesh) {
                c.material = c.material.clone();
                c.material.emissive = new THREE.Color(0xFFAA00);
                c.material.emissiveIntensity = 1.0;
            }
        });
        setTimeout(() => {
            piece.traverse(c => {
                if (c.isMesh) c.material.emissiveIntensity = 0.15;
            });
        }, 800);

        piecesPlaced++;
        const el = document.getElementById('p1-progress');
        if (el) el.textContent = `${piecesPlaced} / 6 pieces placed`;

        if (piecesPlaced >= 6) onPuzzleSolved();
    }
}

function onPuzzleSolved() {
    const el = document.getElementById('p1-ui');
    if (el) el.innerHTML = `
        <span style="font-size:22px;">✨ Tablet Restored! ✨</span><br>
        <span style="font-size:14px; color:#FFA500;">The next chamber awakens...</span>
    `;
    const burst = new THREE.PointLight(0xFFD700, 8, 10);
    burst.position.set(-1.6, 1.4, -2.9);
    _scene.add(burst);
    setTimeout(() => _scene.remove(burst), 2000);
    console.log('Puzzle 1 solved!');
}

function createProgressUI() {
    const div = document.createElement('div');
    div.id = 'p1-ui';
    div.style.cssText = `
        position: fixed; top: 20px; left: 50%;
        transform: translateX(-50%);
        color: #FFD700; font-family: serif; font-size: 16px;
        text-align: center; pointer-events: none;
        text-shadow: 0 0 10px #FF6600;
    `;
    div.innerHTML = `Restore the sacred tablet...<br><span id="p1-progress">0 / 6 pieces placed</span>`;
    document.body.appendChild(div);
}

function addBox(x, y, z, w, h, d, mat) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    _scene.add(mesh);
    return mesh;
}
