// wwwroot/js/gravityScene.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { createGrid, updateHeights as updateGridHeights, setPalette as setGridPalette } from './instancedGrid.js';
import { createSand, updateSand, scatterSand, applySandImpulse, setSandColor } from './sand.js';

let scene, camera, renderer, controls, composer, bloomPass, renderPass, smaaPass, vignettePass, animationId;
let grid, sand, plate, mirror;
let envelope = null;
let currentMode = 'pillars';
let hoverIndex = -1;
let mouseDownPos = null;
let _dotNetRef = null;

// ─── КАМЕРА ─────────────────────────────────────────────────
let cameraMode = 'orbit';
let cinematicAngle = 0;
let perspectiveCamera = null;
let orthoCamera = null;
let activeCamera = null;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const GROUND_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _hitPoint = new THREE.Vector3();

const GRID_SIZE = 32;
const GRID_SPACING = 1.0;

// ─── ЗЕРКАЛО ────────────────────────────────────────────────
const BASE_MIRROR_Y = -10.0;     // было -7.0 — базовая высота глубже
const MIRROR_SENSITIVITY = 8.0;  // было 4.0 — сильнее реакция на амплитуду
const MIRROR_LERP = 0.08;

const MIRROR_SIZE = 400;
const FOG_DENSITY = 0.0;

const SAND_COLORS = {
    neon: 0xdfefff,
    sunset: 0xffcc66,
    ocean: 0xb3e6ff,
    mono: 0xcccccc
};

// ─── ПАЛИТРЫ ─────────────────────────────────────────────────
const PALETTES = {
    neon: [
        { t: 0.00, c: [0x02, 0x08, 0x19] },
        { t: 0.20, c: [0x00, 0x66, 0xcc] },
        { t: 0.40, c: [0x00, 0xe5, 0xff] },
        { t: 0.60, c: [0x70, 0x00, 0xff] },
        { t: 0.80, c: [0xff, 0x00, 0xaa] },
        { t: 1.00, c: [0xff, 0xff, 0xff] }
    ],
    sunset: [
        { t: 0.00, c: [0x10, 0x02, 0x05] },
        { t: 0.20, c: [0x55, 0x08, 0x10] },
        { t: 0.40, c: [0xaa, 0x18, 0x00] },
        { t: 0.60, c: [0x88, 0x00, 0x33] },
        { t: 0.80, c: [0xcc, 0x00, 0x55] },
        { t: 1.00, c: [0xff, 0xff, 0xff] }
    ],
    ocean: [
        { t: 0.00, c: [0x02, 0x04, 0x10] },
        { t: 0.20, c: [0x08, 0x28, 0x55] },
        { t: 0.40, c: [0x00, 0x55, 0x88] },
        { t: 0.60, c: [0x00, 0x77, 0x77] },
        { t: 0.80, c: [0x00, 0xaa, 0xcc] },
        { t: 1.00, c: [0xff, 0xff, 0xff] }
    ],
    mono: [
        { t: 0.00, c: [0x05, 0x05, 0x05] },
        { t: 0.20, c: [0x22, 0x22, 0x22] },
        { t: 0.40, c: [0x40, 0x40, 0x40] },
        { t: 0.60, c: [0x60, 0x60, 0x60] },
        { t: 0.80, c: [0x88, 0x88, 0x88] },
        { t: 1.00, c: [0xff, 0xff, 0xff] }
    ]
};

function createStars(count = 3000, radius = 300) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = radius * (0.7 + 0.3 * Math.random());

        positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.cos(phi);
        positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

        const tint = Math.random();
        let cr, cg, cb;
        if (tint < 0.75) { cr = 1.0; cg = 1.0; cb = 1.0; }
        else if (tint < 0.90) { cr = 0.5; cg = 0.9; cb = 1.0; }
        else { cr = 1.0; cg = 0.6; cb = 1.0; }

        colors[i * 3 + 0] = cr;
        colors[i * 3 + 1] = cg;
        colors[i * 3 + 2] = cb;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 1.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: false,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending
    });

    return new THREE.Points(geometry, material);
}

function getWorldFromPointer(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, activeCamera);
    if (!raycaster.ray.intersectPlane(GROUND_PLANE, _hitPoint)) return null;

    const x = _hitPoint.x;
    const z = _hitPoint.z;

    const offset = (GRID_SIZE - 1) * GRID_SPACING / 2;
    const i = Math.round((x + offset) / GRID_SPACING);
    const j = Math.round((z + offset) / GRID_SPACING);

    if (i < 0 || i >= GRID_SIZE || j < 0 || j >= GRID_SIZE) {
        return { x, z, gridIndex: -1 };
    }
    return { x, z, gridIndex: i * GRID_SIZE + j };
}

export function init(canvasId, dotNetRef) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    _dotNetRef = dotNetRef;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.FogExp2(0x0a1a3a, FOG_DENSITY);

    const aspect = window.innerWidth / window.innerHeight;

    // ─── Перспективная камера ────────────────────────────────
    camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 2000);
    camera.position.set(40, 40, 40);
    camera.lookAt(0, 0, 0);
    perspectiveCamera = camera;

    // ─── Ортографическая камера (вид сверху) ─────────────────
    const orthoSize = 25;
    orthoCamera = new THREE.OrthographicCamera(
        -orthoSize * aspect, orthoSize * aspect,
        orthoSize, -orthoSize,
        0.1, 1000
    );
    orthoCamera.position.set(0, 80, 0);
    orthoCamera.lookAt(0, 0, 0);
    orthoCamera.up.set(0, 0, -1);

    activeCamera = perspectiveCamera;

    // ─── Рендерер ────────────────────────────────────────────
    renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        preserveDrawingBuffer: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.NoToneMapping;

    // ─── OrbitControls ───────────────────────────────────────
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2;

    // ─── Свет ────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(30, 60, 20);
    scene.add(dirLight);

    // ─── Звёзды ──────────────────────────────────────────────
    scene.add(createStars(3000, 300));

    // ─── Зеркало ─────────────────────────────────────────────
    mirror = new Reflector(
        new THREE.PlaneGeometry(MIRROR_SIZE, MIRROR_SIZE),
        { clipBias: 0.003, textureWidth: 1024, textureHeight: 1024, color: 0x151530 }
    );
    mirror.rotation.x = -Math.PI / 2;
    mirror.position.y = BASE_MIRROR_Y;
    mirror.userData.targetY = BASE_MIRROR_Y;
    scene.add(mirror);

    // ─── Пластина для песка ──────────────────────────────────
    plate = new THREE.Mesh(
        new THREE.PlaneGeometry(60, 60),
        new THREE.MeshBasicMaterial({ color: 0x0a0a1e })
    );
    plate.rotation.x = -Math.PI / 2;
    plate.position.y = 0;
    plate.visible = false;
    scene.add(plate);

    // ─── Столбики ────────────────────────────────────────────
    grid = createGrid(GRID_SIZE, GRID_SPACING);
    grid.frustumCulled = false;
    scene.add(grid);

    // ─── Песок ───────────────────────────────────────────────
    sand = createSand(GRID_SIZE, GRID_SPACING);
    sand.visible = false;
    scene.add(sand);

    // ─── События ─────────────────────────────────────────────
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mouseup', onMouseUp);

    // ─── Пост-обработка ──────────────────────────────────────
    composer = new EffectComposer(renderer);
    composer.setSize(window.innerWidth, window.innerHeight);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 1. Рендер сцены
    renderPass = new RenderPass(scene, activeCamera);
    composer.addPass(renderPass);

    // 2. Bloom — свечение ярких пиков
    bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.55, 0.00, 0.00
    );
    composer.addPass(bloomPass);

    // 3. SMAA — сглаживание краёв в линейном пространстве.
    //    Важно: должен идти ДО OutputPass (который конвертирует в sRGB).
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    smaaPass = new SMAAPass(
        window.innerWidth * pixelRatio,
        window.innerHeight * pixelRatio
    );
    composer.addPass(smaaPass);

    // 4. Vignette — лёгкое затемнение по краям кадра
    vignettePass = new ShaderPass(VignetteShader);
    vignettePass.uniforms['offset'].value = 0.4;    // размер зоны виньетки
    vignettePass.uniforms['darkness'].value = 3;  // сила затемнения
    composer.addPass(vignettePass);

    // 5. OutputPass — конвертация в sRGB, всегда последний
    composer.addPass(new OutputPass());

    window.addEventListener('resize', onWindowResize);
    animate();

    console.log('Three.js scene initialized with SMAA + Vignette');
}

export function updateHeights(heights, modulation) {
    if (currentMode === 'pillars') {
        if (grid) updateGridHeights(grid, heights, envelope, modulation, hoverIndex);
    } else {
        if (envelope) updateSand(envelope);
    }
}

export function setMode(mode) {
    currentMode = mode;
    if (mode === 'sand') {
        grid.visible = false;
        plate.visible = true;
        sand.visible = true;
        hoverIndex = -1;
    } else {
        grid.visible = true;
        plate.visible = false;
        sand.visible = false;
    }
}

export function scatterSandJS() {
    scatterSand();
}

// ─── КАМЕРА ──────────────────────────────────────────────────
export function setCameraMode(mode) {
    cameraMode = mode;

    if (mode === 'top') {
        activeCamera = orthoCamera;
        controls.enabled = false;
    } else if (mode === 'cinematic') {
        activeCamera = perspectiveCamera;
        controls.enabled = false;
    } else {
        activeCamera = perspectiveCamera;
        controls.enabled = true;
        perspectiveCamera.position.set(40, 40, 40);
        perspectiveCamera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
    }

    if (renderPass) renderPass.camera = activeCamera;
}

export function takeScreenshot() {
    composer.render();
    const dataUrl = renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `chladni-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
}

export function setPalette(name) {
    if (PALETTES[name]) setGridPalette(PALETTES[name]);
    if (SAND_COLORS[name] !== undefined) setSandColor(SAND_COLORS[name]);
}

// ─── ЗЕРКАЛО: адаптация под амплитуду ────────────────────────
export function setMirrorForAmplitude(amplitude) {
    if (!mirror) return;
    mirror.userData.targetY = BASE_MIRROR_Y - (amplitude - 1.0) * MIRROR_SENSITIVITY;
}

// ─── МЫШЬ ────────────────────────────────────────────────────
function onMouseMove(event) {
    if (currentMode !== 'pillars') return;
    const hit = getWorldFromPointer(event.clientX, event.clientY);
    hoverIndex = hit ? hit.gridIndex : -1;
}

function onMouseDown(event) {
    mouseDownPos = { x: event.clientX, y: event.clientY };
}

function onMouseUp(event) {
    if (!mouseDownPos) return;
    const dx = event.clientX - mouseDownPos.x;
    const dy = event.clientY - mouseDownPos.y;
    mouseDownPos = null;

    if (dx * dx + dy * dy > 25) return;

    const hit = getWorldFromPointer(event.clientX, event.clientY);
    if (!hit) return;

    if (currentMode === 'pillars') {
        if (hit.gridIndex >= 0 && _dotNetRef) {
            _dotNetRef.invokeMethodAsync('OnCanvasClick', hit.gridIndex);
        }
    } else if (currentMode === 'sand') {
        applySandImpulse(hit.x, hit.z, 0.9);
    }
}

function onWindowResize() {
    if (!camera || !renderer || !composer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    const pixelRatio = Math.min(window.devicePixelRatio, 2);

    camera.aspect = aspect;
    camera.updateProjectionMatrix();

    const orthoSize = 25;
    orthoCamera.left = -orthoSize * aspect;
    orthoCamera.right = orthoSize * aspect;
    orthoCamera.top = orthoSize;
    orthoCamera.bottom = -orthoSize;
    orthoCamera.updateProjectionMatrix();

    renderer.setSize(w, h);
    composer.setSize(w, h);
    if (bloomPass) bloomPass.setSize(w, h);
    if (smaaPass) smaaPass.setSize(w * pixelRatio, h * pixelRatio);
    if (vignettePass) vignettePass.setSize(w, h);
}

function animate() {
    animationId = requestAnimationFrame(animate);

    if (cameraMode === 'cinematic') {
        cinematicAngle += 0.003;
        const R = 55;
        const x = Math.cos(cinematicAngle) * R;
        const z = Math.sin(cinematicAngle) * R;
        const y = 30 + Math.sin(cinematicAngle * 0.7) * 10;
        activeCamera.position.set(x, y, z);
        activeCamera.lookAt(0, 0, 0);
    } else if (controls.enabled) {
        controls.update();
    }

    if (mirror && mirror.userData.targetY !== undefined) {
        const dy = mirror.userData.targetY - mirror.position.y;
        if (Math.abs(dy) > 0.001) {
            mirror.position.y += dy * MIRROR_LERP;
        } else {
            mirror.position.y = mirror.userData.targetY;
        }
    }

    composer.render();
}

export function dispose() {
    cancelAnimationFrame(animationId);
    window.removeEventListener('resize', onWindowResize);
    if (renderer && renderer.domElement) {
        renderer.domElement.removeEventListener('mousemove', onMouseMove);
        renderer.domElement.removeEventListener('mousedown', onMouseDown);
        renderer.domElement.removeEventListener('mouseup', onMouseUp);
    }
    if (smaaPass) smaaPass.dispose?.();
    if (vignettePass) vignettePass.dispose?.();
    if (composer) composer.dispose?.();
    if (renderer) renderer.dispose();
    if (controls) controls.dispose();
    scene = null; camera = null; renderer = null;
    composer = null; bloomPass = null; renderPass = null;
    smaaPass = null; vignettePass = null;
    grid = null; sand = null; plate = null; mirror = null;
    _dotNetRef = null;
}

export function setEnvelope(data) {
    envelope = data;
    console.log('Envelope received. Length:', data?.length, 'Max:', Math.max(...data));
}