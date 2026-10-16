// wwwroot/js/sand.js
import * as THREE from 'three';

const COUNT = 4000;
const SAND_COLOR = 0xffcc66;
const SAND_Y = 0.06;

let mesh = null;
let positionsXZ = null;
let velocitiesXZ = null;
let _dummy = null;
let _gridSize = 32;
let _spacing = 1.0;

export function createSand(gridSize, spacing) {
    _gridSize = gridSize;
    _spacing = spacing;

    const geometry = new THREE.SphereGeometry(0.07, 4, 3);
    const material = new THREE.MeshBasicMaterial({ color: SAND_COLOR });

    mesh = new THREE.InstancedMesh(geometry, material, COUNT);
    mesh.frustumCulled = false;

    positionsXZ = new Float32Array(COUNT * 2);
    velocitiesXZ = new Float32Array(COUNT * 2);
    _dummy = new THREE.Object3D();

    scatterSand();
    return mesh;
}

export function scatterSand() {
    if (!mesh) return;
    const halfExtent = _gridSize * _spacing * 0.5 - _spacing;

    for (let i = 0; i < COUNT; i++) {
        positionsXZ[i * 2 + 0] = (Math.random() - 0.5) * 2 * halfExtent;
        positionsXZ[i * 2 + 1] = (Math.random() - 0.5) * 2 * halfExtent;
        velocitiesXZ[i * 2 + 0] = 0;
        velocitiesXZ[i * 2 + 1] = 0;
    }
    _updateMatrices();
}

/// Импульс: сноп песчинок разлетается от (x, z)
export function applySandImpulse(x, z, strength = 0.9) {
    if (!mesh) return;
    for (let i = 0; i < COUNT; i++) {
        const sx = positionsXZ[i * 2 + 0];
        const sz = positionsXZ[i * 2 + 1];
        const dx = sx - x;
        const dz = sz - z;
        const r2 = dx * dx + dz * dz;
        const r = Math.sqrt(r2) + 0.01;
        const falloff = Math.exp(-r2 / 6);   // узкий радиус действия
        velocitiesXZ[i * 2 + 0] += (dx / r) * falloff * strength;
        velocitiesXZ[i * 2 + 1] += (dz / r) * falloff * strength;
    }
}

export function updateSand(envelope) {
    if (!mesh || !envelope) return;

    const gridSize = _gridSize;
    const spacing = _spacing;
    const offset = (gridSize - 1) * spacing / 2;
    const halfExtent = gridSize * spacing * 0.5 - spacing;

    const E_THRESHOLD = 0.08;
    const VMAX = 0.8;   // было 0.25 — теперь импульсы могут "выстреливать" песчинки

    for (let i = 0; i < COUNT; i++) {
        let x = positionsXZ[i * 2 + 0];
        let z = positionsXZ[i * 2 + 1];
        let vx = velocitiesXZ[i * 2 + 0];
        let vz = velocitiesXZ[i * 2 + 1];

        const gi = Math.round((x + offset) / spacing);
        const gj = Math.round((z + offset) / spacing);

        if (gi < 1 || gi >= gridSize - 1 || gj < 1 || gj >= gridSize - 1) {
            velocitiesXZ[i * 2 + 0] = vx * 0.5;
            velocitiesXZ[i * 2 + 1] = vz * 0.5;
            continue;
        }

        const E = envelope[gi * gridSize + gj];

        // В узле — песчинка осела, только тормозим
        if (E < E_THRESHOLD) {
            vx *= 0.85;
            vz *= 0.85;
        } else {
            const gx = (envelope[(gi + 1) * gridSize + gj] - envelope[(gi - 1) * gridSize + gj]) / (2 * spacing);
            const gz = (envelope[gi * gridSize + (gj + 1)] - envelope[gi * gridSize + (gj - 1)]) / (2 * spacing);

            const force = E * 0.35;
            vx -= gx * force;
            vz -= gz * force;

            const jitter = E * 0.04;
            vx += (Math.random() - 0.5) * jitter;
            vz += (Math.random() - 0.5) * jitter;

            vx *= 0.85;
            vz *= 0.85;
        }

        if (vx > VMAX) vx = VMAX; else if (vx < -VMAX) vx = -VMAX;
        if (vz > VMAX) vz = VMAX; else if (vz < -VMAX) vz = -VMAX;

        x += vx;
        z += vz;

        if (x < -halfExtent) { x = -halfExtent; vx = 0; }
        if (x > halfExtent) { x = halfExtent; vx = 0; }
        if (z < -halfExtent) { z = -halfExtent; vz = 0; }
        if (z > halfExtent) { z = halfExtent; vz = 0; }

        positionsXZ[i * 2 + 0] = x;
        positionsXZ[i * 2 + 1] = z;
        velocitiesXZ[i * 2 + 0] = vx;
        velocitiesXZ[i * 2 + 1] = vz;
    }

    _updateMatrices();
}

function _updateMatrices() {
    for (let i = 0; i < COUNT; i++) {
        _dummy.position.set(
            positionsXZ[i * 2 + 0],
            SAND_Y,
            positionsXZ[i * 2 + 1]
        );
        _dummy.updateMatrix();
        mesh.setMatrixAt(i, _dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
}

export function setSandVisible(v) {
    if (mesh) mesh.visible = v;
}

export function setSandColor(hexColor) {
    if (mesh && mesh.material) {
        mesh.material.color.setHex(hexColor);
    }
}