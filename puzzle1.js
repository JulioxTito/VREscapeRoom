// puzzle1.js — Broken Tablet Puzzle (Flat Plane approach)
// Import in index.html and call initPuzzle1(scene, camera, renderer)

import * as THREE from 'three';

let _scene;
const pieces = [];
let piecesPlaced = 0;
const TOTAL_PIECES = 6;

// Where the full tablet appears on the wall (assembled position center)
const TABLET_CENTER = new THREE.Vector3(-7.5, 1.4, -14.8);
const TABLET_W = 2.0;   // total width
const TABLET_H = 1.1;   // total height
const THICKNESS = 0.08; // stone thickness

// Grid: 6 columns, 3 rows
const GRID_COLS = 6;
const GRID_ROWS = 3;

// Piece definitions: [colStart, rowStart, colSpan, rowSpan]
// Irregular sizes so pieces look naturally broken
const PIECE_DEFS = [
    [0, 0, 2, 1],  // piece 0 — top left
    [2, 0, 2, 2],  // piece 1 — top middle (tall)
    [4, 0, 2, 1],  // piece 2 — top right
    [0, 1, 2, 2],  // piece 3 — left (tall)
    [4, 1, 2, 2],  // piece 4 — right (tall)
    [2, 2, 2, 1],  // piece 5 — bottom middle
];

// Scatter positions on the table
const START_POSITIONS = [
    new THREE.Vector3(-5.5, 1.05, -12.5),
    new THREE.Vector3(-6.3, 1.05, -12.7),
    new THREE.Vector3(-5.7, 1.05, -13.0),
    new THREE.Vector3(-6.1, 1.05, -13.3),
    new THREE.Vector3(-5.4, 1.05, -13.5),
    new THREE.Vector3(-6.4, 1.05, -12.3),
];

// -------------------------------------------------------------------
// MAIN EXPORT
// -------------------------------------------------------------------
export function initPuzzle1(scene, camera, renderer) {
    _scene = scene;
    //buildTable();
    buildTabletOutline();
    loadAndBuildPieces();
    createProgressUI();
}

// -------------------------------------------------------------------
// GRAB / RELEASE
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
        let obj = hits[0].object;
        while (obj && !obj.userData.isPiece) obj = obj.parent;
        if (obj && !obj.userData.snapped) {
            obj.traverse(c => {
                if (c.isMesh) {
                    c.material = c.material.clone();
                    c.material.emissive = new THREE.Color(0x6600CC);
                    c.material.emissiveIntensity = 0.5;
                }
            });
            controller.attach(obj);
            controller.userData.heldPiece = obj;
            return true;
        }
    }
    return false;
}

export function puzzle1TryRelease(controller) {
    const piece = controller.userData.heldPiece;
    if (!piece) return false;

    const worldPos = new THREE.Vector3();
    piece.getWorldPosition(worldPos);

    _scene.attach(piece);
    controller.userData.heldPiece = undefined;

    piece.traverse(c => {
        if (c.isMesh) c.material.emissiveIntensity = 0;
    });

    const snapPos = getSnapPosition(piece.userData.index);
    const dist = worldPos.distanceTo(snapPos);

    if (dist < 0.45) {
        snapPiece(piece);
    }

    return true;
}

export function puzzle1UpdateHover(controllers, raycaster) {
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
// SNAP
// -------------------------------------------------------------------
function getSnapPosition(index) {
    const def = PIECE_DEFS[index];
    const cellW = TABLET_W / GRID_COLS;
    const cellH = TABLET_H / GRID_ROWS;
    const px = TABLET_CENTER.x + (def[0] + def[2] / 2 - GRID_COLS / 2) * cellW;
    const py = TABLET_CENTER.y + (GRID_ROWS / 2 - def[1] - def[3] / 2) * cellH;
    return new THREE.Vector3(px, py, TABLET_CENTER.z);
}

function snapPiece(piece) {
    const snapPos = getSnapPosition(piece.userData.index);
    piece.position.copy(snapPos);
    piece.rotation.set(0, 0, 0);
    piece.userData.snapped = true;

    // Hide snap dot
    const dot = _scene.getObjectByName(`snapDot_${piece.userData.index}`);
    if (dot) dot.visible = false;

    // Gold flash
    piece.traverse(c => {
        if (c.isMesh) {
            c.material = c.material.clone();
            c.material.emissive = new THREE.Color(0xFFAA00);
            c.material.emissiveIntensity = 1.0;
        }
    });
    setTimeout(() => {
        piece.traverse(c => {
            if (c.isMesh) c.material.emissiveIntensity = 0;
        });
    }, 600);

    piecesPlaced++;
    if (_progressPanel) {
        _drawProgress(_progressPanel.ctx, _progressPanel.canvas, piecesPlaced);
        _progressPanel.tex.needsUpdate = true;
    }
    if (piecesPlaced >= TOTAL_PIECES) onPuzzleSolved();
}

// -------------------------------------------------------------------
// BUILD PIECES from texture
// -------------------------------------------------------------------
function loadAndBuildPieces() {
    const texLoader = new THREE.TextureLoader();
    texLoader.load('textures/tablet_image.png', (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;

        PIECE_DEFS.forEach((def, index) => {
            const [colStart, rowStart, colSpan, rowSpan] = def;

            const cellW = TABLET_W / GRID_COLS;
            const cellH = TABLET_H / GRID_ROWS;
            const pw = cellW * colSpan;
            const ph = cellH * rowSpan;

            // UV for this piece
            const uOffset = colStart / GRID_COLS;
            const vOffset = 1 - (rowStart + rowSpan) / GRID_ROWS;
            const uRepeat = colSpan / GRID_COLS;
            const vRepeat = rowSpan / GRID_ROWS;

            const pieceTex = tex.clone();
            pieceTex.needsUpdate = true;
            pieceTex.offset.set(uOffset, vOffset);
            pieceTex.repeat.set(uRepeat, vRepeat);

            const frontMat = new THREE.MeshStandardMaterial({
                map: pieceTex,
                roughness: 0.8,
            });
            const stoneMat = new THREE.MeshStandardMaterial({
                color: 0x8B7355,
                roughness: 1.0,
            });
            const backMat = new THREE.MeshStandardMaterial({
                color: 0x6B5A3E,
                roughness: 1.0,
            });

            const group = new THREE.Group();
            group.userData.isPiece = true;
            group.userData.index = index;
            group.userData.snapped = false;

            // Front face
            const front = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), frontMat);
            front.position.z = THICKNESS / 2;
            group.add(front);

            // Back face
            const back = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), backMat);
            back.position.z = -THICKNESS / 2;
            back.rotation.y = Math.PI;
            group.add(back);

            // Edges (thickness)
            const top = new THREE.Mesh(new THREE.BoxGeometry(pw, THICKNESS, THICKNESS), stoneMat);
            top.position.set(0, ph / 2, 0);
            top.rotation.x = Math.PI / 2;
            group.add(top);

            const bot = new THREE.Mesh(new THREE.BoxGeometry(pw, THICKNESS, THICKNESS), stoneMat);
            bot.position.set(0, -ph / 2, 0);
            bot.rotation.x = -Math.PI / 2;
            group.add(bot);

            const left = new THREE.Mesh(new THREE.BoxGeometry(THICKNESS, ph + THICKNESS, THICKNESS), stoneMat);
            left.position.set(-pw / 2, 0, 0);
            group.add(left);

            const right = new THREE.Mesh(new THREE.BoxGeometry(THICKNESS, ph + THICKNESS, THICKNESS), stoneMat);
            right.position.set(pw / 2, 0, 0);
            group.add(right);

            // Place on table scattered
            group.position.copy(START_POSITIONS[index]);
            group.rotation.z = (Math.random() - 0.5) * 0.4;

            _scene.add(group);
            pieces.push(group);

            // Snap indicator dot
            const dot = new THREE.Mesh(
                new THREE.SphereGeometry(0.04, 8, 8),
                new THREE.MeshStandardMaterial({
                    color: 0xFFD700,
                    emissive: new THREE.Color(0xFFAA00),
                    emissiveIntensity: 0.8,
                })
            );
            const snapPos = getSnapPosition(index);
            dot.position.copy(snapPos);
            dot.name = `snapDot_${index}`;
            _scene.add(dot);

            console.log(`✅ Piece ${index + 1} built`);
        });
    }, undefined, (err) => {
        console.error('Failed to load tablet texture:', err);
    });
}

// -------------------------------------------------------------------
// TABLET OUTLINE on wall
// -------------------------------------------------------------------
function buildTabletOutline() {
    const outlineMat = new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        emissive: new THREE.Color(0xFFAA00),
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
    });
    const outline = new THREE.Mesh(
        new THREE.PlaneGeometry(TABLET_W + 0.1, TABLET_H + 0.1),
        outlineMat
    );
    outline.position.copy(TABLET_CENTER);
    _scene.add(outline);

    const glow = new THREE.PointLight(0xFFAA00, 0.8, 3);
    glow.position.copy(TABLET_CENTER);
    glow.position.z += 0.3;
    _scene.add(glow);
}

// -------------------------------------------------------------------
// TABLE
// -------------------------------------------------------------------
function buildTable() {
    const top = new THREE.MeshStandardMaterial({ color: 0x7A5C3A, roughness: 0.8 });
    const leg = new THREE.MeshStandardMaterial({ color: 0x5C3D1E, roughness: 1.0 });
    addBox(-6, 0.92, -12, 1.2, 0.08, 1.2, top);
    addBox(-6.5, 0.46, -11.5, 0.08, 0.9, 0.08, leg);
    addBox(-5.5, 0.46, -11.5, 0.08, 0.9, 0.08, leg);
    addBox(-6.5, 0.46, -12.5, 0.08, 0.9, 0.08, leg);
    addBox(-5.5, 0.46, -12.5, 0.08, 0.9, 0.08, leg);
}

// -------------------------------------------------------------------
// PUZZLE SOLVED
// -------------------------------------------------------------------
function onPuzzleSolved() {
    const el = document.getElementById('p1-ui');
    if (el) el.innerHTML = `
        <span style="font-size:22px;">✨ Tablet Restored! ✨</span><br>
        <span style="font-size:14px; color:#FFA500;">The next chamber awakens...</span>
    `;
    const burst = new THREE.PointLight(0xFFD700, 8, 10);
    burst.position.copy(TABLET_CENTER);
    _scene.add(burst);
    setTimeout(() => _scene.remove(burst), 2000);
    console.log('Puzzle 1 solved!');
    window.dispatchEvent(new CustomEvent('puzzle1Solved'));
}

// -------------------------------------------------------------------
// UI
// -------------------------------------------------------------------
let _progressPanel = null;

function createProgressUI() {
    // 3D panel above the tablet wall — visible in VR
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    _drawProgress(ctx, canvas, 0);
    const tex = new THREE.CanvasTexture(canvas);
    const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 0.3),
        new THREE.MeshStandardMaterial({ map: tex, transparent: true, emissive: new THREE.Color(0x000000) })
    );
    mesh.position.set(-7.5, 2.2, -14.8);
    _scene.add(mesh);
    _progressPanel = { mesh, tex, canvas, ctx };
}

function _drawProgress(ctx, canvas, count) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(30,15,0,0.85)';
    ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 12);
    ctx.fill();
    ctx.strokeStyle = count >= 6 ? '#00FF88' : '#DAA520';
    ctx.lineWidth = 4;
    ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 12);
    ctx.stroke();
    ctx.fillStyle = count >= 6 ? '#00FF88' : '#FFD700';
    ctx.font = 'bold 36px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
        count >= 6 ? '✨ Tablet Restored! ✨' : `Pieces placed: ${count} / 6`,
        canvas.width / 2, canvas.height / 2
    );
}

// -------------------------------------------------------------------
// HELPER
// -------------------------------------------------------------------
function addBox(x, y, z, w, h, d, mat) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    _scene.add(mesh);
    return mesh;
}
