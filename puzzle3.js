// puzzle3.js — Egyptian Treasure Chest Puzzle
// Detailed version matching puzzle3.html's visual style:
// - Curved arched lid with multiple gold bands
// - Big numeric dials (0-9) with the current digit glowing gold
// - Detailed hand-drawn Egyptian symbols (sun-with-rays, scarab, ankh) on plates above each dial
// - Gold lock plate + keyhole in centre
// - Animated lid open + key float when unlocked
//works

import * as THREE from 'three';

export function initTreasureChest(scene, camera, renderer) {
    const chestGroup = new THREE.Group();

    // ── CONFIG ──
    const baseW = 1.6, baseH = 0.8, baseD = 0.9;
    const SECRET_CODE = [4, 2, 3]; // sun count, scarab count, ankh count
    const SYMBOL_NAMES = ['Sun', 'Scarab', 'Ankh'];
    const currentCode = [0, 0, 0];
    let unlocked = false;
    const dials = [];

    // ── WOOD TEXTURE (procedural with grain streaks) ──
    function woodTexture() {
        const c = document.createElement('canvas');
        c.width = 256; c.height = 256;
        const x = c.getContext('2d');
        const grad = x.createLinearGradient(0, 0, 256, 0);
        grad.addColorStop(0, '#5a2c0a');
        grad.addColorStop(0.5, '#6e3812');
        grad.addColorStop(1, '#5a2c0a');
        x.fillStyle = grad; x.fillRect(0, 0, 256, 256);
        x.strokeStyle = 'rgba(20, 8, 0, 0.35)';
        x.lineWidth = 1.5;
        for (let i = 0; i < 30; i++) {
            x.beginPath();
            const y = i * 8 + Math.random() * 6;
            x.moveTo(0, y);
            x.bezierCurveTo(80, y + Math.sin(i) * 4, 180, y - Math.sin(i) * 5, 256, y);
            x.stroke();
        }
        return new THREE.CanvasTexture(c);
    }
    const woodTex = woodTexture();

    // ── EGYPTIAN SYMBOL DRAWING FUNCTIONS ──
    function drawSun(ctx, cx, cy, size, color) {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(cx, cy, size * 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = size * 0.05;
        for (let i = 0; i < 14; i++) {
            const a = -Math.PI / 2 + (i - 7) * 0.18;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * size * 0.4, cy + Math.sin(a) * size * 0.4);
            ctx.lineTo(cx + Math.cos(a) * size * 0.95, cy + Math.sin(a) * size * 0.95);
            ctx.stroke();
        }
    }
    function drawScarab(ctx, cx, cy, size, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(cx, cy, size * 0.45, size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#3a1a02'; ctx.lineWidth = size * 0.04;
        ctx.beginPath(); ctx.moveTo(cx, cy - size * 0.5); ctx.lineTo(cx, cy + size * 0.5); ctx.stroke();
        for (let i = 1; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(cx - size * 0.4, cy - size * 0.4 + i * size * 0.25);
            ctx.lineTo(cx + size * 0.4, cy - size * 0.4 + i * size * 0.25);
            ctx.stroke();
        }
        ctx.lineWidth = size * 0.05;
        for (let i = -1; i <= 1; i += 2) {
            ctx.beginPath(); ctx.moveTo(cx + i * size * 0.45, cy - size * 0.3);
            ctx.lineTo(cx + i * size * 0.7, cy - size * 0.45); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + i * size * 0.45, cy);
            ctx.lineTo(cx + i * size * 0.75, cy); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + i * size * 0.45, cy + size * 0.3);
            ctx.lineTo(cx + i * size * 0.7, cy + size * 0.45); ctx.stroke();
        }
    }
    function drawAnkh(ctx, cx, cy, size, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(cx, cy - size * 0.45, size * 0.28, size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a0a02';
        ctx.beginPath();
        ctx.ellipse(cx, cy - size * 0.45, size * 0.16, size * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.fillRect(cx - size * 0.45, cy - size * 0.10, size * 0.9, size * 0.14);
        ctx.fillRect(cx - size * 0.10, cy - size * 0.10, size * 0.20, size * 0.85);
    }

    // ── DIAL TEXTURE GENERATOR (digits 0-9 with current value glowing) ──
    function makeDialTexture(highlightDigit) {
        const c = document.createElement('canvas');
        c.width = 1024; c.height = 256;
        const x = c.getContext('2d');
        x.fillStyle = '#1a0a02'; x.fillRect(0, 0, 1024, 256);
        x.font = 'bold 180px serif';
        x.textAlign = 'center'; x.textBaseline = 'middle';
        for (let i = 0; i < 10; i++) {
            const segX = (i + 0.5) * (1024 / 10);
            if (i === highlightDigit) {
                x.shadowColor = '#FFE680'; x.shadowBlur = 30;
                x.fillStyle = '#FFFFCC';
            } else {
                x.shadowBlur = 0; x.fillStyle = '#DAA520';
            }
            x.fillText(i, segX, 128);
        }
        x.shadowBlur = 0;
        x.fillStyle = '#8B6914';
        x.fillRect(0, 0, 1024, 12); x.fillRect(0, 244, 1024, 12);
        return new THREE.CanvasTexture(c);
    }

    // ── MATERIALS ──
    const baseMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.7, metalness: 0.05 });
    const bandMat = new THREE.MeshStandardMaterial({
        color: 0xDAA520, metalness: 0.8, roughness: 0.25,
        emissive: 0x2a1500, emissiveIntensity: 0.4
    });
    const lockMat = new THREE.MeshStandardMaterial({
        color: 0xDAA520, metalness: 0.85, roughness: 0.2,
        emissive: 0x3a2000, emissiveIntensity: 0.5
    });

    // ── CHEST BASE (rectangular box body) ──
    const base = new THREE.Mesh(new THREE.BoxGeometry(baseW, baseH, baseD), baseMat);
    base.position.y = baseH / 2;
    base.castShadow = true; base.receiveShadow = true;
    chestGroup.add(base);

    // ── LID PIVOT GROUP (so lid hinges from back top edge) ──
    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, baseH, -baseD / 2);
    chestGroup.add(lidPivot);

    // Half-cylinder lid (the curved top)
    const lidGeom = new THREE.CylinderGeometry(baseD / 2, baseD / 2, baseW, 24, 1, false, 0, Math.PI);
    const lid = new THREE.Mesh(lidGeom, baseMat.clone());
    lid.rotation.z = Math.PI / 2;
    lid.position.set(0, 0, baseD / 2);
    lid.castShadow = true; lid.receiveShadow = true;
    lidPivot.add(lid);

    // ── GOLD BANDS on chest body (horizontal) ──
    [0.15, 0.65].forEach(y => {
        const band = new THREE.Mesh(
            new THREE.BoxGeometry(baseW + 0.005, 0.04, baseD + 0.005),
            bandMat
        );
        band.position.y = y;
        chestGroup.add(band);
    });

    // ── VERTICAL FRONT BANDS ──
    [-0.55, 0, 0.55].forEach(xOff => {
        const vband = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, baseH + 0.005, 0.02),
            bandMat
        );
        vband.position.set(xOff, baseH / 2, baseD / 2 + 0.005);
        chestGroup.add(vband);
    });

    // ── GOLD CORNER ORNAMENTS ──
    [[-baseW/2, 0, baseD/2], [baseW/2, 0, baseD/2],
     [-baseW/2, baseH, baseD/2], [baseW/2, baseH, baseD/2]].forEach(([x, y, z]) => {
        const corner = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.025), bandMat);
        corner.position.set(x, y, z + 0.005);
        chestGroup.add(corner);
    });

    // ── LID ARCH BANDS (curved gold bands across the top) ──
    [0, baseW / 4, -baseW / 4].forEach(xOff => {
        const lband = new THREE.Mesh(
            new THREE.TorusGeometry(baseD / 2 + 0.005, 0.018, 6, 16, Math.PI),
            bandMat
        );
        lband.rotation.y = Math.PI / 2;
        lband.position.set(xOff, 0, baseD / 2);
        lidPivot.add(lband);
    });

    // ── DIALS ──
    const DIAL_RADIUS = 0.10;
    const DIAL_W = 0.14;
    const dialPositions = [-0.4, 0, 0.4];

    dialPositions.forEach((xPos, idx) => {
        const dialGeom = new THREE.CylinderGeometry(DIAL_RADIUS, DIAL_RADIUS, DIAL_W, 32);
        const dialMat = new THREE.MeshStandardMaterial({
            map: makeDialTexture(0),
            roughness: 0.5, metalness: 0.6,
            emissive: 0x2a1500, emissiveIntensity: 0.3
        });
        const dial = new THREE.Mesh(dialGeom, dialMat);
        // Lay the cylinder on its side so the digits face outward
        dial.rotation.z = Math.PI / 2;
        dial.position.set(xPos, baseH * 0.5, baseD / 2 + 0.04);
        dial.userData = { type: 'dial', index: idx, value: 0, puzzleId: 'treasureChest' };
        dial.castShadow = true;
        chestGroup.add(dial);
        dials.push(dial);

        // Pointer/notch above each dial
        const notch = new THREE.Mesh(
            new THREE.ConeGeometry(0.025, 0.05, 4),
            bandMat
        );
        notch.position.set(xPos, baseH * 0.5 + DIAL_RADIUS + 0.05, baseD / 2 + 0.04);
        notch.rotation.x = Math.PI;
        chestGroup.add(notch);

        // ── Symbol panel above each dial — shows what to count ──
        const symC = document.createElement('canvas');
        symC.width = 256; symC.height = 256;
        const symCtx = symC.getContext('2d');
        // Ornate gold-bordered plate background
        symCtx.fillStyle = '#1a0a02';
        symCtx.fillRect(0, 0, 256, 256);
        symCtx.fillStyle = '#8B6914';
        symCtx.fillRect(8, 8, 240, 240);
        symCtx.fillStyle = '#1a0a02';
        symCtx.fillRect(16, 16, 224, 224);
        symCtx.strokeStyle = '#DAA520';
        symCtx.lineWidth = 4;
        symCtx.strokeRect(20, 20, 216, 216);
        // Draw the symbol THIS dial represents
        if (idx === 0) drawSun(symCtx, 128, 128, 80, '#FFE680');
        else if (idx === 1) drawScarab(symCtx, 128, 128, 75, '#FFE680');
        else drawAnkh(symCtx, 128, 128, 80, '#FFE680');

        const symTex = new THREE.CanvasTexture(symC);
        const symPlate = new THREE.Mesh(
            new THREE.PlaneGeometry(0.22, 0.22),
            new THREE.MeshBasicMaterial({ map: symTex, transparent: true })
        );
        symPlate.position.set(xPos, baseH * 0.5 + DIAL_RADIUS + 0.20, baseD / 2 + 0.04);
        chestGroup.add(symPlate);
    });

    // ── KEYHOLE / LOCK PLATE in centre ──
    const lockPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.22, 0.025),
        lockMat
    );
    lockPlate.position.set(0, baseH + 0.05, baseD / 2 + 0.005);
    chestGroup.add(lockPlate);

    const keyhole = new THREE.Mesh(
        new THREE.RingGeometry(0.015, 0.035, 16),
        new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide })
    );
    keyhole.position.set(0, baseH + 0.07, baseD / 2 + 0.025);
    chestGroup.add(keyhole);

    // ── KEY (hidden inside chest, revealed when opened) ──
    const keyGroup = new THREE.Group();
    keyGroup.visible = false;
    keyGroup.userData = { type: 'chestKey', grabbable: false, puzzleId: 'treasureChest' };
    const keyMat = new THREE.MeshStandardMaterial({
        color: 0xFFD700, metalness: 0.95, roughness: 0.15,
        emissive: 0x6a4500, emissiveIntensity: 0.6
    });
    const keyBow = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.022, 12, 24), keyMat);
    keyBow.rotation.x = Math.PI / 2;
    keyBow.position.set(0, 0.3, 0);
    keyGroup.add(keyBow);
    const keyShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.35, 8), keyMat);
    keyShaft.position.set(0, 0.06, 0);
    keyGroup.add(keyShaft);
    const tooth1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.03), keyMat);
    tooth1.position.set(0.025, -0.08, 0);
    keyGroup.add(tooth1);
    const tooth2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.03), keyMat);
    tooth2.position.set(0.022, -0.13, 0);
    keyGroup.add(tooth2);
    keyGroup.position.set(0, baseH * 0.4, 0);
    chestGroup.add(keyGroup);

    scene.add(chestGroup);

    // ── INTERACTION (mouse click — VR/raycast also works through chestGroup.userData.type=='dial') ──
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let doorT = 0;
    let keyFloatT = 0;

    function updateDial(dial) {
        const idx = dial.userData.index;
        const value = dial.userData.value;
        dial.material.map = makeDialTexture(value);
        dial.material.needsUpdate = true;
        // 10 digits per full rotation — bring current value to top
        dial.rotation.x = (value / 10) * Math.PI * 2;
        currentCode[idx] = value;

        if (!unlocked &&
            currentCode[0] === SECRET_CODE[0] &&
            currentCode[1] === SECRET_CODE[1] &&
            currentCode[2] === SECRET_CODE[2]) {
            unlocked = true;
            console.log('★ Treasure chest UNLOCKED!');
        }
    }

    const onClick = (event) => {
        if (unlocked) return;
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(dials);
        if (intersects.length > 0) {
            const dial = intersects[0].object;
            dial.userData.value = (dial.userData.value + 1) % 10;
            updateDial(dial);
        }
    };
    window.addEventListener('click', onClick);

    // ── ANIMATION (lid open + key rise + key float) ──
    function animate() {
        requestAnimationFrame(animate);
        if (unlocked) {
            if (doorT < 1) {
                doorT = Math.min(1, doorT + 0.018);
                const t = doorT;
                const ease = 1 - Math.pow(1 - t, 3);
                lidPivot.rotation.x = -ease * Math.PI * 0.55;
                if (t > 0.5) {
                    keyGroup.visible = true;
                    const kt = Math.min(1, (t - 0.5) / 0.5);
                    const ke = 1 - Math.pow(1 - kt, 2);
                    keyGroup.position.y = baseH * 0.4 + ke * 0.4;
                    keyGroup.rotation.y = ke * Math.PI * 2;
                    if (kt >= 1 && !keyGroup.userData.grabbable) {
                        keyGroup.userData.grabbable = true;
                    }
                }
            } else if (keyGroup.userData.grabbable && !keyGroup.userData.grabbed) {
                keyFloatT += 0.02;
                keyGroup.position.y = baseH * 0.4 + 0.4 + Math.sin(keyFloatT) * 0.03;
                keyGroup.rotation.y += 0.015;
            }
        }
    }
    animate();

    // Expose dials and key on the group so index.html can register them with grabbableObjects
    chestGroup.userData.dials = dials;
    chestGroup.userData.keyGroup = keyGroup;
    chestGroup.userData.updateDial = updateDial;
    chestGroup.userData.isUnlocked = () => unlocked;

    return chestGroup;
}