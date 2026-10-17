// wwwroot/js/graphs.js

const CYAN = '#00d4ff';
const GRID_COLOR = 'rgba(0, 212, 255, 0.15)';

let waveformCanvas = null;
let waveformCtx = null;
let crossCanvas = null;
let crossCtx = null;

let W = 360;
let H = 70;

export function initGraphs(waveformId, crossId, width, height) {
    W = width || 360;
    H = height || 70;

    waveformCanvas = document.getElementById(waveformId);
    crossCanvas = document.getElementById(crossId);

    if (waveformCanvas) {
        setupCanvas(waveformCanvas);
        waveformCtx = waveformCanvas.getContext('2d');
    }
    if (crossCanvas) {
        setupCanvas(crossCanvas);
        crossCtx = crossCanvas.getContext('2d');
    }
}

function setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export function pushWaveform(samples) {
    if (!waveformCtx) return;
    const ctx = waveformCtx;

    ctx.clearRect(0, 0, W, H);

    // Нулевая линия
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();

    // Вертикальная сетка — 4 линии
    for (let i = 1; i < 4; i++) {
        const x = (i / 4) * W;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
    }

    // Нормировка по максимуму
    let maxAbs = 0.001;
    for (let i = 0; i < samples.length; i++) {
        const a = Math.abs(samples[i]);
        if (a > maxAbs) maxAbs = a;
    }

    const n = samples.length;
    const ampY = H / 2 - 4;

    // Основная кривая
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = CYAN;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * W;
        const y = H / 2 - (samples[i] / maxAbs) * ampY;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
}

export function pushCrossSection(data) {
    if (!crossCtx) return;
    const ctx = crossCtx;

    ctx.clearRect(0, 0, W, H);

    // Нулевая линия
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H - 1);
    ctx.lineTo(W, H - 1);
    ctx.stroke();

    // Вертикальная сетка
    for (let i = 1; i < 4; i++) {
        const x = (i / 4) * W;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
    }

    let maxAbs = 0.001;
    for (let i = 0; i < data.length; i++) {
        if (data[i] > maxAbs) maxAbs = data[i];
    }

    const n = data.length;
    const ampY = H - 6;

    // Заливка под кривой
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * W;
        const y = H - (data[i] / maxAbs) * ampY - 2;
        ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(0, 212, 255, 0.55)');
    grad.addColorStop(1, 'rgba(0, 212, 255, 0.0)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Верхняя линия
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = CYAN;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * W;
        const y = H - (data[i] / maxAbs) * ampY - 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
}

// Вызывается при переключении видимости отдельных графиков —
// просто очищаем скрытый canvas, чтобы не моргал при возврате.
export function clearCanvas(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}