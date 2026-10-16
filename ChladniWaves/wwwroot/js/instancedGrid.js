import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────
// ПАЛИТРА. Меняется через setPalette.
// ─────────────────────────────────────────────────────────────
let PALETTE = [
    { t: 0.00, c: new THREE.Color(0x020819) },
    { t: 0.20, c: new THREE.Color(0x0066cc) },
    { t: 0.40, c: new THREE.Color(0x00e5ff) },
    { t: 0.60, c: new THREE.Color(0x7000ff) },
    { t: 0.80, c: new THREE.Color(0xff00aa) },
    { t: 1.00, c: new THREE.Color(0xffffff) }
];

export function setPalette(entries) {
    PALETTE = entries.map(e => ({
        t: e.t,
        c: new THREE.Color(e.c[0] / 255, e.c[1] / 255, e.c[2] / 255)
    }));
}

function paletteColor(t, out) {
    t = Math.max(0, Math.min(1, t));

    if (t <= PALETTE[0].t) {
        out.copy(PALETTE[0].c);
        return;
    }
    if (t >= PALETTE[PALETTE.length - 1].t) {
        out.copy(PALETTE[PALETTE.length - 1].c);
        return;
    }
    for (let i = 0; i < PALETTE.length - 1; i++) {
        const a = PALETTE[i];
        const b = PALETTE[i + 1];
        if (t >= a.t && t <= b.t) {
            const local = (t - a.t) / (b.t - a.t);
            out.copy(a.c).lerp(b.c, local);
            return;
        }
    }
}


export function createGrid(gridSize = 32, spacing = 1.0) {
    const geometry = new THREE.CapsuleGeometry(0.3, 1.0, 4, 8);

    const material = new THREE.MeshBasicMaterial({
        color: 0xffffff
    });

    const count = gridSize * gridSize;
    const mesh = new THREE.InstancedMesh(geometry, material, count);

    const dummy = new THREE.Object3D();
    let index = 0;
    const offset = (gridSize - 1) * spacing / 2;

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const x = i * spacing - offset;
            const z = j * spacing - offset;
            dummy.position.set(x, 0, z);
            dummy.updateMatrix();
            mesh.setMatrixAt(index, dummy.matrix);
            index++;
        }
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.userData.gridSize = gridSize;
    mesh.userData.spacing = spacing;
    return mesh;
}


const _tmpColor = new THREE.Color();

const BREATH_MIN = 0.1;

export function updateHeights(mesh, heights, envelope, modulation, hoverIndex) {
    const gridSize = mesh.userData.gridSize;
    const spacing = mesh.userData.spacing;
    const dummy = new THREE.Object3D();
    const offset = (gridSize - 1) * spacing / 2;
    const baseY = 0.8;

    const m = Math.abs(modulation ?? 1);
    const brightness = BREATH_MIN + (1 - BREATH_MIN) * m;

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const index = i * gridSize + j;
            const x = i * spacing - offset;
            const z = j * spacing - offset;
            const y = heights[index];

            dummy.position.set(x, baseY + y, z);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            mesh.setMatrixAt(index, dummy.matrix);

            const t = envelope ? envelope[index] : 0;
            paletteColor(t, _tmpColor);
            _tmpColor.multiplyScalar(brightness);

            mesh.setColorAt(index, _tmpColor);
        }
    }

    if (hoverIndex !== undefined && hoverIndex >= 0 && hoverIndex < gridSize * gridSize) {
        _tmpColor.set(0xffffff);
        mesh.setColorAt(hoverIndex, _tmpColor);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}