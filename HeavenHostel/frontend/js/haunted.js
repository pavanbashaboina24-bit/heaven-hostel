import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

import { inventory, addReadable, addContainer }
    from "./inventory.js";

import { pieceAt, paperPuzzle } from "./gen.js";
import { story } from "./story.js";
import { locks } from "./locks.js";
import { addStation } from "./puzzles.js";
import { placeSecretItems } from "./secrets.js";
import { LETTERS, BOOKS, TRINKETS }
    from "./lore.js";


// ======================================================
// HAUNTED HOSTEL  -  atmosphere, textures, room interiors
//
// Tune the mood here:
// ======================================================

import { audio } from "./audio.js";

import { events } from "./events.js";

// the ghost tells the lights where he is (see ghosts.js)
export const ghostFx = { x: 0, y: 0, z: 0, power: 0, flashlight: 0 };

export const SETTINGS = {

    ambient: 0.46,         // overall darkness (lower = darker)

    fogDensity: 0.066,    // thicker fog = scarier

    flashlight: 95,       // flashlight strength

    bulb: 16,             // strength of the flickering room bulbs

    vignette: true        // dark screen edges
};


// ======================================================
// SMALL HELPERS
// ======================================================

const rnd = Math.random;

function mulberry32(a) {

    return function () {

        a |= 0;
        a = (a + 0x6D2B79F5) | 0;

        let t = Math.imul(a ^ (a >>> 15), 1 | a);

        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const cache = {};

function once(key, fn) {

    if (!(key in cache)) {
        cache[key] = fn();
    }

    return cache[key];
}


// ======================================================
// CANVAS TEXTURES  (all drawn by code - no image files)
// ======================================================

function makeCanvas(w, h) {

    if (
        typeof document === "undefined" ||
        !document.createElement
    ) {
        return null;
    }

    const c = document.createElement("canvas");

    if (!c) return null;

    c.width = w;
    c.height = h;

    const ctx = c.getContext && c.getContext("2d");

    if (!ctx) return null;

    return { c, ctx };
}

function canvasTexture(w, h, draw, repeat) {

    const cv = makeCanvas(w, h);

    if (!cv) return null;

    draw(cv.ctx, w, h);

    const t = new THREE.CanvasTexture(cv.c);

    if (repeat) {
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.RepeatWrapping;
    }

    t.colorSpace = THREE.SRGBColorSpace;

    t.anisotropy = 4;

    return t;
}

function blob(g, x, y, r, col) {

    g.fillStyle = col;
    g.beginPath();

    const n = 9;

    for (let i = 0; i <= n; i++) {

        const a = (i / n) * Math.PI * 2;
        const rr = r * (0.6 + rnd() * 0.7);
        const px = x + Math.cos(a) * rr;
        const py = y + Math.sin(a) * rr;

        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
    }

    g.closePath();
    g.fill();
}

function crack(g, x, y, len, col, wid) {

    g.strokeStyle = col;
    g.lineWidth = wid;
    g.beginPath();
    g.moveTo(x, y);

    let a = rnd() * 6.28;

    for (let i = 0; i < len; i++) {

        a += (rnd() - 0.5) * 1.1;
        x += Math.cos(a) * (6 + rnd() * 10);
        y += Math.sin(a) * (6 + rnd() * 10);

        g.lineTo(x, y);
    }

    g.stroke();
}

function bloodDrips(g, x, y, count, spread, maxLen, col) {

    g.fillStyle = col;

    for (let i = 0; i < count; i++) {

        const px = x + (rnd() - 0.5) * spread;
        const len = 8 + rnd() * maxLen;
        const wd = 2 + rnd() * 3;

        g.fillRect(px, y, wd, len);

        g.beginPath();
        g.arc(px + wd / 2, y + len, wd * 0.9, 0, 6.28);
        g.fill();
    }
}


// ---------- wall: dirty, damp, peeling, cracked ----------

function wallTex() {

    return once("wallTex", () =>
        canvasTexture(512, 512, (g, w, h) => {

            g.fillStyle = "#5d5a52";
            g.fillRect(0, 0, w, h);

            for (let i = 0; i < 3500; i++) {

                const r = 60 + rnd() * 60;

                g.fillStyle =
                    "rgba(" + r + "," + r + "," + (r - 8) + "," +
                    (0.05 + rnd() * 0.08) + ")";

                g.fillRect(
                    rnd() * w, rnd() * h,
                    1 + rnd() * 3, 1 + rnd() * 3
                );
            }

            for (let i = 0; i < 8; i++) {

                const x = rnd() * w;
                const wd = 30 + rnd() * 90;

                const gr = g.createLinearGradient(
                    0, 0, 0, h * (0.3 + rnd() * 0.5)
                );

                gr.addColorStop(0, "rgba(28,36,26,0.6)");
                gr.addColorStop(1, "rgba(28,36,26,0)");

                g.fillStyle = gr;
                g.fillRect(x, 0, wd, h);
            }

            for (let i = 0; i < 7; i++) {

                blob(
                    g, rnd() * w, rnd() * h, 25 + rnd() * 45,
                    "rgba(150,142,120,0.28)"
                );

                blob(
                    g, rnd() * w, rnd() * h, 15 + rnd() * 30,
                    "rgba(20,16,12,0.35)"
                );
            }

            const bg = g.createLinearGradient(0, h, 0, h - 150);

            bg.addColorStop(0, "rgba(22,28,18,0.7)");
            bg.addColorStop(1, "rgba(22,28,18,0)");

            g.fillStyle = bg;
            g.fillRect(0, h - 150, w, 150);

            for (let i = 0; i < 5; i++) {

                crack(
                    g, rnd() * w, rnd() * h,
                    8 + rnd() * 14,
                    "rgba(12,10,8,0.75)", 1 + rnd() * 1.5
                );
            }

        }, true)
    );
}

function floorTex() {

    return once("floorTex", () =>
        canvasTexture(512, 512, (g, w, h) => {

            const t = 128;

            for (let y = 0; y < 4; y++) {
                for (let x = 0; x < 4; x++) {

                    const v = 52 + rnd() * 22;

                    g.fillStyle =
                        "rgb(" + v + "," + (v + 2) + "," + (v - 4) + ")";

                    g.fillRect(x * t, y * t, t, t);
                }
            }

            g.strokeStyle = "rgba(8,8,8,0.9)";
            g.lineWidth = 3;

            for (let i = 0; i <= 4; i++) {

                g.beginPath();
                g.moveTo(i * t, 0);
                g.lineTo(i * t, h);
                g.stroke();

                g.beginPath();
                g.moveTo(0, i * t);
                g.lineTo(w, i * t);
                g.stroke();
            }

            for (let i = 0; i < 9; i++) {

                blob(
                    g, rnd() * w, rnd() * h, 20 + rnd() * 50,
                    "rgba(12,10,6,0.35)"
                );
            }

            for (let i = 0; i < 4; i++) {

                crack(
                    g, rnd() * w, rnd() * h, 7 + rnd() * 10,
                    "rgba(5,5,5,0.8)", 1.5
                );
            }

        }, true)
    );
}

function doorTex() {

    return once("doorTex", () =>
        canvasTexture(256, 512, (g, w, h) => {

            g.fillStyle = "#3e2a1f";
            g.fillRect(0, 0, w, h);

            for (let i = 0; i < 90; i++) {

                g.strokeStyle =
                    "rgba(" + (20 + rnd() * 30) + ",12,6,0.35)";

                g.beginPath();
                g.moveTo(rnd() * w, 0);
                g.lineTo(rnd() * w, h);
                g.stroke();
            }

            g.strokeStyle = "rgba(10,6,3,0.9)";
            g.lineWidth = 6;

            g.strokeRect(30, 30, w - 60, h * 0.4 - 30);
            g.strokeRect(30, h * 0.45, w - 60, h * 0.5);

            for (let i = 0; i < 6; i++) {

                crack(
                    g, rnd() * w, rnd() * h, 4 + rnd() * 6,
                    "rgba(200,170,130,0.35)", 1.5
                );
            }

            g.fillStyle = "rgba(90,0,0,0.5)";

            for (let i = 0; i < 3; i++) {
                blob(g, rnd() * w, rnd() * h, 16, "rgba(80,0,0,0.45)");
            }

            g.fillStyle = "#b8a064";
            g.fillRect(w - 56, h * 0.5, 14, 14);

        }, false)
    );
}

function mattressTex() {

    return once("mattressTex", () =>
        canvasTexture(128, 256, (g, w, h) => {

            g.fillStyle = "#847d68";
            g.fillRect(0, 0, w, h);

            for (let i = 0; i < 6; i++) {
                blob(g, rnd() * w, rnd() * h, 10 + rnd() * 25,
                    "rgba(90,70,30,0.45)");
            }

            blob(g, w * 0.5, h * 0.5, 22, "rgba(90,5,5,0.55)");

            g.strokeStyle = "rgba(30,25,20,0.5)";

            for (let y = 0; y < h; y += 32) {
                g.beginPath();
                g.moveTo(0, y);
                g.lineTo(w, y);
                g.stroke();
            }

        }, false)
    );
}

function almirahTex() {

    return once("almirahTex", () =>
        canvasTexture(256, 512, (g, w, h) => {

            g.fillStyle = "#4b5a54";
            g.fillRect(0, 0, w, h);

            for (let i = 0; i < 14; i++) {
                blob(g, rnd() * w, rnd() * h, 8 + rnd() * 25,
                    "rgba(120,60,20,0.35)");
            }

            g.strokeStyle = "rgba(10,14,12,0.95)";
            g.lineWidth = 4;

            g.strokeRect(6, 6, w - 12, h - 12);

            g.beginPath();
            g.moveTo(w / 2, 6);
            g.lineTo(w / 2, h - 6);
            g.stroke();

            g.lineWidth = 2;

            for (let i = 0; i < 9; i++) {

                g.beginPath();
                g.moveTo(40, 40 + i * 10);
                g.lineTo(w / 2 - 20, 40 + i * 10);
                g.stroke();
            }

            g.fillStyle = "#222";
            g.fillRect(w / 2 - 14, h * 0.5, 8, 28);
            g.fillRect(w / 2 + 6, h * 0.5, 8, 28);

            bloodDrips(g, w * 0.7, 60, 3, 40, 80, "rgba(95,6,6,0.8)");

        }, false)
    );
}

function tileTex() {

    return once("tileTex", () =>
        canvasTexture(256, 256, (g, w, h) => {

            const t = 64;

            for (let y = 0; y < 4; y++) {
                for (let x = 0; x < 4; x++) {

                    const v = 150 + rnd() * 30;

                    g.fillStyle =
                        "rgb(" + (v - 40) + "," + v + "," + (v - 20) + ")";

                    g.fillRect(x * t, y * t, t, t);
                }
            }

            g.strokeStyle = "rgba(30,34,30,0.9)";
            g.lineWidth = 3;

            for (let i = 0; i <= 4; i++) {

                g.beginPath();
                g.moveTo(i * t, 0);
                g.lineTo(i * t, h);
                g.stroke();

                g.beginPath();
                g.moveTo(0, i * t);
                g.lineTo(w, i * t);
                g.stroke();
            }

            for (let i = 0; i < 6; i++) {
                blob(g, rnd() * w, rnd() * h, 12 + rnd() * 25,
                    "rgba(25,30,15,0.5)");
            }

            bloodDrips(g, 60 + rnd() * 120, 0, 3, 80, 120,
                "rgba(100,5,5,0.75)");

        }, true)
    );
}

function bloodTex() {

    return once("bloodTex", () =>
        canvasTexture(256, 256, (g, w, h) => {

            g.clearRect(0, 0, w, h);

            blob(g, w / 2, h / 2, 55, "rgba(95,4,4,0.9)");

            for (let i = 0; i < 12; i++) {

                const a = rnd() * 6.28;
                const d = 50 + rnd() * 60;

                blob(
                    g,
                    w / 2 + Math.cos(a) * d,
                    h / 2 + Math.sin(a) * d,
                    4 + rnd() * 10,
                    "rgba(95,4,4,0.85)"
                );
            }

            blob(g, w / 2, h / 2, 30, "rgba(60,0,0,0.9)");

        }, false)
    );
}

function handTex() {

    return once("handTex", () =>
        canvasTexture(128, 128, (g, w, h) => {

            g.clearRect(0, 0, w, h);

            g.fillStyle = "rgba(100,5,5,0.9)";

            g.beginPath();
            g.ellipse(64, 84, 26, 30, 0, 0, 6.28);
            g.fill();

            const fingers = [
                [34, 52, -0.35, 30],
                [48, 40, -0.12, 36],
                [64, 36, 0, 38],
                [80, 40, 0.12, 34],
                [96, 54, 0.6, 26]
            ];

            for (const f of fingers) {

                g.save();
                g.translate(f[0], f[1]);
                g.rotate(f[2]);
                g.fillRect(-5, -f[3], 10, f[3]);
                g.restore();
            }

            bloodDrips(g, 64, 100, 4, 50, 20, "rgba(100,5,5,0.9)");

        }, false)
    );
}

function footTex() {

    return once("footTex", () =>
        canvasTexture(64, 128, (g, w, h) => {

            g.clearRect(0, 0, w, h);

            g.fillStyle = "rgba(95,5,5,0.85)";

            g.beginPath();
            g.ellipse(32, 80, 15, 36, 0, 0, 6.28);
            g.fill();

            g.beginPath();
            g.ellipse(32, 28, 12, 14, 0, 0, 6.28);
            g.fill();

        }, false)
    );
}

function webTex() {

    return once("webTex", () =>
        canvasTexture(256, 256, (g, w, h) => {

            g.clearRect(0, 0, w, h);

            g.strokeStyle = "rgba(225,225,225,0.7)";
            g.lineWidth = 1;

            const cx = w / 2;
            const cy = h / 2;
            const spokes = 12;

            for (let i = 0; i < spokes; i++) {

                const a = (i / spokes) * 6.28 + rnd() * 0.1;

                g.beginPath();
                g.moveTo(cx, cy);
                g.lineTo(
                    cx + Math.cos(a) * 125,
                    cy + Math.sin(a) * 125
                );
                g.stroke();
            }

            for (let r = 14; r < 125; r += 12) {
                for (let i = 0; i < spokes; i++) {

                    if (rnd() < 0.12) continue;

                    const a0 = (i / spokes) * 6.28;
                    const a1 = ((i + 1) / spokes) * 6.28;
                    const am = (a0 + a1) / 2;

                    g.beginPath();

                    g.moveTo(
                        cx + Math.cos(a0) * r,
                        cy + Math.sin(a0) * r
                    );

                    g.quadraticCurveTo(
                        cx + Math.cos(am) * r * 0.9,
                        cy + Math.sin(am) * r * 0.9,
                        cx + Math.cos(a1) * r,
                        cy + Math.sin(a1) * r
                    );

                    g.stroke();
                }
            }

        }, false)
    );
}

function crackedGlassTex() {

    return once("glassTex", () =>
        canvasTexture(256, 256, (g, w, h) => {

            g.clearRect(0, 0, w, h);

            const cx = 60 + rnd() * 140;
            const cy = 60 + rnd() * 140;

            g.strokeStyle = "rgba(230,240,255,0.8)";

            for (let i = 0; i < 9; i++) {

                const a = (i / 9) * 6.28 + rnd() * 0.3;

                g.lineWidth = 1.2;
                g.beginPath();
                g.moveTo(cx, cy);
                g.lineTo(
                    cx + Math.cos(a) * (80 + rnd() * 120),
                    cy + Math.sin(a) * (80 + rnd() * 120)
                );
                g.stroke();
            }

            for (let r = 20; r < 100; r += 26) {

                g.beginPath();
                g.arc(cx, cy, r, 0, 6.28);
                g.stroke();
            }

        }, false)
    );
}

function textTex(text, color, w, h, font) {

    return once("text:" + text + color, () =>
        canvasTexture(w, h, (g) => {

            g.clearRect(0, 0, w, h);

            g.font = font || 'bold 78px "Brush Script MT", cursive';
            g.textAlign = "center";
            g.textBaseline = "middle";
            g.fillStyle = color;

            g.save();
            g.translate(w / 2, h * 0.45);
            g.rotate((rnd() - 0.5) * 0.08);

            const mw = g.measureText(text).width;
            const s = mw > 0 ? Math.min(1, (w * 0.9) / mw) : 1;

            g.scale(s, s);
            g.fillText(text, 0, 0);
            g.restore();

            bloodDrips(g, w / 2, h * 0.5, 9, w * 0.7, 55, color);

        }, false)
    );
}

function plateTex(text) {

    return once("plate:" + text, () =>
        canvasTexture(256, 96, (g, w, h) => {

            g.fillStyle = "#1d2a22";
            g.fillRect(0, 0, w, h);

            g.strokeStyle = "#8c8c78";
            g.lineWidth = 4;
            g.strokeRect(4, 4, w - 8, h - 8);

            g.fillStyle = "#d8d4bc";

            // shrink the text until it fits inside the board
            let size = 44;
            g.font = "bold " + size + "px Arial, sans-serif";

            while (g.measureText(text).width > w - 32 && size > 14) {

                size -= 2;
                g.font = "bold " + size + "px Arial, sans-serif";
            }

            g.textAlign = "center";
            g.textBaseline = "middle";
            g.fillText(text, w / 2, h / 2 + 2);

            for (let i = 0; i < 6; i++) {
                crack(g, rnd() * w, rnd() * h, 3, "rgba(0,0,0,0.5)", 1);
            }

            blob(g, w * 0.8, h * 0.8, 12, "rgba(80,0,0,0.5)");

        }, false)
    );
}

function noticeTex() {

    return once("noticeTex", () =>
        canvasTexture(256, 320, (g, w, h) => {

            g.fillStyle = "#b9b08e";
            g.fillRect(0, 0, w, h);

            blob(g, 60, 240, 40, "rgba(90,70,30,0.4)");
            blob(g, 200, 70, 30, "rgba(90,0,0,0.35)");

            g.fillStyle = "#2a2118";
            g.textAlign = "center";
            g.font = "bold 24px Arial, sans-serif";
            g.fillText("HOSTEL RULES", w / 2, 38);

            g.textAlign = "left";
            g.font = "17px Arial, sans-serif";

            const lines = [
                "1. NO VISITORS AFTER 9 PM",
                "2. SILENCE AFTER 10 PM",
                "3. NEVER LEAVE THE ROOM",
                "    AFTER MIDNIGHT",
                "4. DO NOT ANSWER IF",
                "    SOMEONE KNOCKS",
                "5. KEEP THE WINDOW SHUT",
                "6. DO NOT LOOK UNDER",
                "    THE BED"
            ];

            lines.forEach((l, i) => g.fillText(l, 16, 80 + i * 26));

            g.strokeStyle = "rgba(110,5,5,0.9)";
            g.lineWidth = 4;

            g.beginPath();
            g.moveTo(10, 205);
            g.lineTo(240, 210);
            g.stroke();

        }, false)
    );
}

function mirrorTex() {

    return once("mirrorTex", () =>
        canvasTexture(128, 192, (g, w, h) => {

            g.fillStyle = "#1a2328";
            g.fillRect(0, 0, w, h);

            for (let i = 0; i < 5; i++) {
                crack(g, rnd() * w, rnd() * h, 7, "rgba(200,215,225,0.7)", 1.5);
            }

            g.fillStyle = "rgba(130,8,8,0.9)";
            g.font = 'bold 26px "Brush Script MT", cursive';
            g.textAlign = "center";
            g.fillText("BEHIND", w / 2, 60);
            g.fillText("YOU", w / 2, 92);

            bloodDrips(g, w / 2, 96, 6, 70, 60, "rgba(130,8,8,0.9)");

        }, false)
    );
}

function ceilingStainTex() {

    return once("ceilStain", () =>
        canvasTexture(256, 256, (g, w, h) => {

            g.clearRect(0, 0, w, h);

            for (let i = 0; i < 6; i++) {
                blob(g, w / 2 + (rnd() - 0.5) * 60, h / 2 + (rnd() - 0.5) * 60,
                    25 + rnd() * 40, "rgba(18,22,10,0.35)");
            }

        }, false)
    );
}


// ======================================================
// SHARED MATERIALS
// ======================================================

function stdMat(tex, fallback, extra) {

    return new THREE.MeshStandardMaterial(
        Object.assign(
            {
                map: tex || null,
                color: tex ? 0xffffff : fallback,
                roughness: 0.9,
                metalness: 0.0
            },
            extra || {}
        )
    );
}

export function getWallMaterial() {
    return once("wallMat", () => stdMat(wallTex(), 0x5d5a52));
}

export function getFloorMaterial() {
    return once("floorMat", () => stdMat(floorTex(), 0x3a3a38));
}

export function getDoorMaterial() {
    return once("doorMat", () => stdMat(doorTex(), 0x3e2a1f));
}

function M() {

    return once("mats", () => ({

        iron: new THREE.MeshStandardMaterial({
            color: 0x232326, roughness: 0.6, metalness: 0.7
        }),

        mattress: stdMat(mattressTex(), 0x847d68),

        pillow: new THREE.MeshStandardMaterial({
            color: 0x8d887a, roughness: 1
        }),

        blanket: new THREE.MeshStandardMaterial({
            color: 0x4a2a2c, roughness: 1
        }),

        wood: new THREE.MeshStandardMaterial({
            color: 0x35261b, roughness: 0.9
        }),

        almirah: stdMat(almirahTex(), 0x4b5a54, {
            roughness: 0.6, metalness: 0.4
        }),

        porcelain: new THREE.MeshStandardMaterial({
            color: 0xc9c9bd, roughness: 0.35
        }),

        dark: new THREE.MeshStandardMaterial({
            color: 0x050505, roughness: 1
        }),

        bucket: new THREE.MeshStandardMaterial({
            color: 0x1f4f7a, roughness: 0.6
        }),

        redWater: new THREE.MeshStandardMaterial({
            color: 0x6a0707, roughness: 0.3
        }),

        steel: new THREE.MeshStandardMaterial({
            color: 0x777c80, roughness: 0.4, metalness: 0.8
        }),

        tile: stdMat(tileTex(), 0x9aa398, { roughness: 0.4 }),

        spider: new THREE.MeshStandardMaterial({
            color: 0x0a0a0a, roughness: 0.8
        }),

        cloth: new THREE.MeshStandardMaterial({
            color: 0x2c1a1d, roughness: 1, side: THREE.DoubleSide
        }),

        paper: new THREE.MeshStandardMaterial({
            color: 0xb8b39c, roughness: 1, side: THREE.DoubleSide
        }),

        plaster: new THREE.MeshStandardMaterial({
            color: 0x6a665c, roughness: 1
        }),

        doll: new THREE.MeshStandardMaterial({
            color: 0xc9b9a5, roughness: 0.6
        }),

        dollDress: new THREE.MeshStandardMaterial({
            color: 0x6b1a1a, roughness: 1
        }),

        eyes: new THREE.MeshBasicMaterial({ color: 0xff1a1a }),

        blood: new THREE.MeshStandardMaterial({
            map: bloodTex(), transparent: true, depthWrite: false,
            polygonOffset: true, polygonOffsetFactor: -2,
            roughness: 0.3
        }),

        hand: new THREE.MeshStandardMaterial({
            map: handTex(), transparent: true, depthWrite: false,
            polygonOffset: true, polygonOffsetFactor: -2
        }),

        foot: new THREE.MeshStandardMaterial({
            map: footTex(), transparent: true, depthWrite: false,
            polygonOffset: true, polygonOffsetFactor: -2
        }),

        web: new THREE.MeshBasicMaterial({
            map: webTex(), transparent: true, depthWrite: false,
            side: THREE.DoubleSide, opacity: 0.9
        }),

        // lit-less glass: it can never reflect a lamp as a bright "sun" spot
        glass: new THREE.MeshBasicMaterial({
            color: 0x1c2636, transparent: true, opacity: 0.28,
            side: THREE.DoubleSide, depthWrite: false
        }),

        crackedGlass: new THREE.MeshBasicMaterial({
            map: crackedGlassTex(), color: 0xb8c4d4, transparent: true,
            depthWrite: false, side: THREE.DoubleSide
        }),

        moonbeam: new THREE.MeshBasicMaterial({
            color: 0x000000, transparent: true, opacity: 0
        }),

        notice: stdMat(noticeTex(), 0xb9b08e, { side: THREE.DoubleSide }),

        mirror: stdMat(mirrorTex(), 0x1a2328, {
            roughness: 0.2, metalness: 0.6
        }),

        ceilStain: new THREE.MeshBasicMaterial({
            map: ceilingStainTex(), transparent: true, depthWrite: false
        }),

        tubeOff: new THREE.MeshStandardMaterial({
            color: 0x222222, roughness: 0.8
        })
    }));
}

const U = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
    sph: new THREE.SphereGeometry(0.5, 10, 8),
    pln: new THREE.PlaneGeometry(1, 1),
    cone: new THREE.ConeGeometry(0.5, 1, 10)
};


// ======================================================
// UV SCALING  (so textures tile instead of stretching)
// ======================================================

export function applyBoxUV(geometry, w, h, d, tile) {

    tile = tile || 2.5;

    const uv = geometry.attributes.uv;

    const sc = [
        [d, h], [d, h],
        [w, d], [w, d],
        [w, h], [w, h]
    ];

    const ox = rnd() * 4;
    const oy = rnd() * 4;

    for (let f = 0; f < 6; f++) {
        for (let i = 0; i < 4; i++) {

            const idx = f * 4 + i;

            uv.setXY(
                idx,
                uv.getX(idx) * sc[f][0] / tile + ox,
                uv.getY(idx) * sc[f][1] / tile + oy
            );
        }
    }

    uv.needsUpdate = true;
}


// ======================================================
// MERGE MANY SMALL MESHES  (keeps the game fast)
// ======================================================

function mergeMeshes(meshes, scene) {

    const byMat = new Map();

    for (const m of meshes) {

        m.updateWorldMatrix(true, false);

        const g = m.geometry.index
            ? m.geometry.toNonIndexed()
            : m.geometry.clone();

        g.applyMatrix4(m.matrixWorld);

        if (!byMat.has(m.material)) {
            byMat.set(m.material, []);
        }

        byMat.get(m.material).push(g);

        m.removeFromParent();
    }

    for (const [mat, geos] of byMat) {

        let n = 0;

        for (const g of geos) {
            n += g.attributes.position.count;
        }

        const pos = new Float32Array(n * 3);
        const nor = new Float32Array(n * 3);
        const uv = new Float32Array(n * 2);

        let o = 0;

        for (const g of geos) {

            pos.set(g.attributes.position.array, o * 3);
            nor.set(g.attributes.normal.array, o * 3);
            uv.set(g.attributes.uv.array, o * 2);

            o += g.attributes.position.count;

            g.dispose();
        }

        const mg = new THREE.BufferGeometry();

        mg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        mg.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
        mg.setAttribute("uv", new THREE.BufferAttribute(uv, 2));

        scene.add(new THREE.Mesh(mg, mat));
    }
}


// ======================================================
// ANIMATION + LIGHT REGISTRIES
// ======================================================

const anim = {
    fans: [],
    curtains: [],
    spiders: [],
    bulbs: [],
    zones: {},
    sheets: [],
    flames: [],
    chains: [],
    flick: [],
    doors: [],
    mist: [],
    swings: []
};

let SCENE = null;

let flashlight = null;

let glow = null;

let flashOn = true;

let menuMode = true;

let ambientLight = null;

let hemiLight = null;

let vigEl = null;

let PLAYER = null;

const pool = [];


// ======================================================
// ROOM BUILDER  (local coordinates inside one room)
//
//   x : across the room      (world x for south rooms)
//   y : up from the floor
//   z : 0 = door wall ... 10.5 = window wall
// ======================================================

class RB {

    constructor(ctx, rowN) {

        Object.assign(this, ctx);

        this.rowN = rowN;

        this.group = new THREE.Group();

        this.group.position.set(
            0,
            ctx.floorHeight,
            rowN ? -4.25 : 4.25
        );

        this.group.rotation.y = rowN ? Math.PI : 0;

        ctx.scene.add(this.group);

        this.merge = [];
    }

    _m(geo, mat, sx, sy, sz, x, y, z, o) {

        const m = new THREE.Mesh(geo, mat);

        m.scale.set(sx, sy, sz);

        m.position.set(x, y, z);

        if (o) {
            m.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0);
        }

        this.group.add(m);

        if (!(o && o.keep)) {
            this.merge.push(m);
        }

        return m;
    }

    box(mat, w, h, d, x, yb, z, o) {
        return this._m(U.box, mat, w, h, d, x, yb + h / 2, z, o);
    }

    cyl(mat, dia, h, x, yb, z, o) {
        return this._m(U.cyl, mat, dia, h, dia, x, yb + h / 2, z, o);
    }

    sph(mat, dia, x, y, z, o) {
        return this._m(U.sph, mat, dia, dia, dia, x, y, z, o);
    }

    pln(mat, w, h, x, y, z, o) {
        return this._m(U.pln, mat, w, h, 1, x, y, z, o);
    }

    decal(mat, w, d, x, z, yaw) {

        return this._m(
            U.pln, mat, w, d, 1, x, 0.012, z,
            { rx: -Math.PI / 2, rz: yaw || 0 }
        );
    }

    // invisible box that blocks the player
    collider(w, h, d, x, yb, z) {

        const m = this._m(
            U.box, M().dark, w, h, d, x, yb + h / 2, z, { keep: true }
        );

        m.visible = false;

        this.cs.add(m);

        return m;
    }

    // solid wall with the dirty wall texture
    solid(w, h, d, x, yb, z) {

        const g = new THREE.BoxGeometry(w, h, d);

        applyBoxUV(g, w, h, d);

        const m = new THREE.Mesh(g, getWallMaterial());

        m.position.set(x, yb + h / 2, z);

        this.group.add(m);

        this.cs.add(m);

        return m;
    }

    finish() {

        this.group.updateMatrixWorld(true);

        mergeMeshes(this.merge, this.scene);

        this.merge.length = 0;

        for (const b of this._bulbs || []) {

            b.pos = new THREE.Vector3()
                .setFromMatrixPosition(b.mesh.matrixWorld);

            b.pos.y -= 0.25;
        }
    }
}


// ======================================================
// SPIDERS
// ======================================================

function makeSpider(sc) {

    const mat = M().spider;

    const g = new THREE.Group();

    const part = (geo, sx, sy, sz, x, y, z) => {

        const m = new THREE.Mesh(geo, mat);

        m.scale.set(sx, sy, sz);

        m.position.set(x, y, z);

        g.add(m);
    };

    part(U.sph, 0.10 * sc, 0.08 * sc, 0.12 * sc, 0, 0, 0.06 * sc);

    part(U.sph, 0.17 * sc, 0.14 * sc, 0.22 * sc, 0, 0.02 * sc, -0.10 * sc);

    const up = new THREE.Vector3(0, 1, 0);

    const seg = (p0, p1) => {

        const dir = p1.clone().sub(p0);

        const len = dir.length();

        const m = new THREE.Mesh(U.box, mat);

        const t = Math.max(0.008, 0.014 * sc);

        m.scale.set(t, len, t);

        m.position.copy(p0).addScaledVector(dir, 0.5);

        m.quaternion.setFromUnitVectors(up, dir.normalize());

        g.add(m);
    };

    for (const s of [-1, 1]) {
        for (let k = 0; k < 4; k++) {

            const a = (k - 1.5) * 0.55;

            const p0 = new THREE.Vector3(s * 0.04, 0, 0.07 - k * 0.04)
                .multiplyScalar(sc);

            const knee = p0.clone().add(
                new THREE.Vector3(
                    s * Math.cos(a) * 0.2,
                    0.14,
                    Math.sin(a) * 0.2
                ).multiplyScalar(sc)
            );

            const foot = knee.clone().add(
                new THREE.Vector3(
                    s * Math.cos(a) * 0.16,
                    -0.22,
                    Math.sin(a) * 0.16
                ).multiplyScalar(sc)
            );

            seg(p0, knee);
            seg(knee, foot);
        }
    }

    return g;
}

// Spiders are SMALL and only a few are kept:
// 1 out of every SPIDER_KEEP_EVERY spots gets a spider.
const SPIDER_SIZE = 0.4;

const SPIDER_KEEP_EVERY = 4;

let spiderSpot = 0;

function keepSpider() {

    return (spiderSpot++ % SPIDER_KEEP_EVERY) === 0;
}

function placeSpider(R, x, y, z, sc, yaw, tiltX) {

    if (!keepSpider()) return;

    const s = makeSpider(sc * SPIDER_SIZE);

    s.position.set(x, y, z);

    s.rotation.set(tiltX || 0, yaw || 0, 0);

    R.group.add(s);

    for (const c of s.children) {
        R.merge.push(c);
    }
}

function hangSpider(R, x, z, len, sc) {

    if (!keepSpider()) return;

    const anchor = new THREE.Group();

    anchor.position.set(x, 4.0, z);

    const thread = new THREE.Mesh(U.box, M().web);

    thread.material = new THREE.MeshBasicMaterial({ color: 0xbfbfbf });

    thread.scale.set(0.006, len, 0.006);

    thread.position.y = -len / 2;

    const spider = makeSpider(sc * SPIDER_SIZE);

    spider.position.y = -len;

    anchor.add(thread);

    anchor.add(spider);

    R.group.add(anchor);

    anim.spiders.push({
        anchor, thread, spider,
        base: len, phase: rnd() * 6.28
    });
}

function placeWeb(R, x, y, z, size, ry) {

    R.pln(M().web, size, size, x, y, z, { ry: ry || 0 });
}


// ======================================================
// FURNITURE
// ======================================================

function singleBed(R, side, z, rng) {

    const m = M();

    const cx = side < 0 ? R.lx0 + 1.05 : R.lx1 - 1.05;

    const head = side < 0 ? R.lx0 + 0.04 : R.lx1 - 0.04;

    // legs
    for (const dx of [-0.95, 0.95]) {
        for (const dz of [-0.44, 0.44]) {
            R.box(m.iron, 0.05, 0.45, 0.05, cx + dx, 0, z + dz);
        }
    }

    // rails
    R.box(m.iron, 2.0, 0.05, 0.04, cx, 0.4, z - 0.45);
    R.box(m.iron, 2.0, 0.05, 0.04, cx, 0.4, z + 0.45);

    // headboard
    R.box(m.iron, 0.04, 0.85, 0.95, head, 0.1, z);

    // mattress
    const broken = rng() < 0.18;

    R.box(
        m.mattress, 1.9, 0.14, 0.88, cx, 0.45, z,
        broken ? { rz: side * 0.12 } : undefined
    );

    // pillow
    R.box(m.pillow, 0.4, 0.1, 0.3,
        head + side * -0 + (side < 0 ? 0.3 : -0.3), 0.6, z);

    // blanket
    if (rng() < 0.7) {

        R.box(
            m.blanket, 1.0, 0.07, 0.86,
            cx + (side < 0 ? 0.35 : -0.35), 0.6, z,
            { ry: (rng() - 0.5) * 0.3 }
        );
    }

    // blood stain on the mattress
    if (rng() < 0.4) {

        R.pln(
            m.blood, 0.8, 0.8,
            cx + (rng() - 0.5) * 0.8, 0.6, z,
            { rx: -Math.PI / 2 }
        );
    }

    R.collider(2.0, 0.9, 0.95, cx, 0, z);

    bedHide(R, cx, z, side, "under the bed", 0.95, true);

    return { cx, z, top: 0.62 };
}

function bunkBed(R, side, z, rng) {

    const m = M();

    const cx = side < 0 ? R.lx0 + 1.05 : R.lx1 - 1.05;

    const head = side < 0 ? R.lx0 + 0.04 : R.lx1 - 0.04;

    const foot = side < 0 ? cx + 0.98 : cx - 0.98;

    // 4 tall posts
    for (const dx of [-0.97, 0.97]) {
        for (const dz of [-0.46, 0.46]) {
            R.box(m.iron, 0.06, 1.85, 0.06, cx + dx, 0, z + dz);
        }
    }

    for (const level of [0, 1]) {

        const y = 0.38 + level * 0.78;

        R.box(m.iron, 1.96, 0.04, 0.04, cx, y, z - 0.46);
        R.box(m.iron, 1.96, 0.04, 0.04, cx, y, z + 0.46);

        if (!(level === 1 && rng() < 0.15)) {

            R.box(
                m.mattress, 1.9, 0.12, 0.88, cx, y + 0.04, z,
                level === 1 && rng() < 0.2
                    ? { rz: side * 0.1 }
                    : undefined
            );

            R.box(m.pillow, 0.38, 0.09, 0.3,
                head + (side < 0 ? 0.28 : -0.28), y + 0.16, z);

            if (rng() < 0.6) {

                R.box(
                    m.blanket, 0.9, 0.06, 0.84,
                    cx + (side < 0 ? 0.4 : -0.4), y + 0.16, z
                );
            }
        }
    }

    // ladder at the foot
    for (const dz of [-0.2, 0.2]) {
        R.box(m.iron, 0.04, 1.5, 0.04, foot, 0, z + dz);
    }

    for (let r = 0; r < 5; r++) {
        R.box(m.iron, 0.04, 0.03, 0.4, foot, 0.25 + r * 0.28, z);
    }

    R.collider(2.1, 1.9, 1.0, cx, 0, z);

    bedHide(R, cx, z, side, "under the bunk", 1.0);

    return { cx, z, top: 0.5 };
}

function almirah(R, side, z, rng) {

    const m = M();

    const cx = side < 0 ? R.lx0 + 0.32 : R.lx1 - 0.32;

    R.box(m.almirah, 0.6, 2.0, 1.1, cx, 0, z);

    // door facing the room, slightly ajar sometimes
    if (rng() < 0.5) {

        R.box(
            m.almirah, 0.04, 1.9, 0.5,
            cx + (side < 0 ? 0.42 : -0.42), 0.05,
            z + 0.45, { ry: side * 0.9 }
        );

        R.box(m.dark, 0.02, 1.7, 0.4,
            cx + (side < 0 ? 0.3 : -0.3), 0.15, z + 0.3);
    }

    R.collider(0.62, 2.0, 1.12, cx, 0, z);
}

function chair(R, x, z, fallen) {

    const m = M();

    const o = fallen
        ? { rz: 1.45, ry: rnd() * 6 }
        : { ry: (rnd() - 0.5) * 0.8 };

    const g = new THREE.Group();

    g.position.set(x, fallen ? 0.2 : 0, z);

    g.rotation.set(0, o.ry, o.rz || 0);

    R.group.add(g);

    const parts = [
        [m.wood, 0.42, 0.04, 0.42, 0, 0.45, 0],
        [m.wood, 0.42, 0.5, 0.04, 0, 0.5, -0.2],
        [m.wood, 0.04, 0.45, 0.04, -0.18, 0, -0.18],
        [m.wood, 0.04, 0.45, 0.04, 0.18, 0, -0.18],
        [m.wood, 0.04, 0.45, 0.04, -0.18, 0, 0.18],
        [m.wood, 0.04, 0.45, 0.04, 0.18, 0, 0.18]
    ];

    for (const p of parts) {

        const mesh = new THREE.Mesh(U.box, p[0]);

        mesh.scale.set(p[1], p[2], p[3]);

        mesh.position.set(p[4], p[5] + p[2] / 2, p[6]);

        g.add(mesh);

        R.merge.push(mesh);
    }

    // sit on it (not on a fallen chair)
    if (!fallen) {

        hideSpot(R, {
            x, z, w: 0.62, h: 1.3, ty: 0.65, d: 0.62, camY: 1.15,
            rest: true, look: [0, 1], verb: "Sit down", upLabel: "Stand up",
            exits: [
                [x, z - 0.9], [x - 0.8, z], [x + 0.8, z], [x, z + 0.9]
            ]
        });
    }
}

function desk(R, x, z) {

    const m = M();

    R.box(m.wood, 1.5, 0.05, 0.7, x, 0.74, z);

    for (const dx of [-0.7, 0.7]) {
        for (const dz of [-0.3, 0.3]) {
            R.box(m.wood, 0.05, 0.74, 0.05, x + dx, 0, z + dz);
        }
    }

    R.box(m.wood, 0.5, 0.25, 0.6, x + 0.45, 0.45, z);

    // books + candle stub
    R.box(m.paper, 0.25, 0.12, 0.18, x - 0.5, 0.79, z - 0.1);

    R.cyl(m.paper, 0.05, 0.12, x - 0.1, 0.79, z + 0.1);

    R.collider(1.55, 0.8, 0.75, x, 0, z);

    // hide under the desk, climb out on the open (-z) side
    hideSpot(R, {
        x: x - 0.2, z, tx: x, w: 1.67, h: 0.85, d: 0.87, camY: 0.35,
        label: "under the desk",
        exits: [
            [x - 0.2, z - 1.0], [x - 0.7, z - 1.0], [x + 0.3, z - 1.0],
            [x - 0.2, z - 1.5]
        ]
    });
}

function doll(R, x, y, z, yaw) {

    const m = M();

    const g = new THREE.Group();

    g.position.set(x, y, z);

    g.rotation.y = yaw;

    R.group.add(g);

    const add = (geo, mat, sx, sy, sz, px, py, pz) => {

        const mesh = new THREE.Mesh(geo, mat);

        mesh.scale.set(sx, sy, sz);

        mesh.position.set(px, py, pz);

        g.add(mesh);

        R.merge.push(mesh);
    };

    add(U.cone, m.dollDress, 0.26, 0.3, 0.26, 0, 0.15, 0);

    add(U.sph, m.doll, 0.18, 0.18, 0.18, 0, 0.38, 0);

    add(U.sph, m.dark, 0.035, 0.035, 0.02, -0.04, 0.4, 0.085);

    add(U.sph, m.dark, 0.035, 0.035, 0.02, 0.04, 0.4, 0.085);

    add(U.box, m.dark, 0.07, 0.012, 0.01, 0, 0.34, 0.088);
}

function bulb(R, x, z, dead, zoneKey, o) {

    o = o || {};

    const y = o.y || 3.52;

    const top = o.top || 4.0;

    const col = o.color || 0xffd9a0;

    const wire = R.cyl(
        M().dark, 0.012, top - y, x, y, z
    );

    const mat = new THREE.MeshBasicMaterial({
        color: dead ? 0x1a1a1a : col
    });

    const mesh = R._m(U.sph, mat, 0.14, 0.18, 0.14, x, y, z, { keep: true });

    const b = {
        mesh, mat, dead,
        phase: rnd() * 100,
        base: new THREE.Color(dead ? 0x1a1a1a : col),
        zone: zoneKey,
        lvl: 1,
        lightColor: o.light || 0xffc27a
    };

    R._bulbs = R._bulbs || [];

    R._bulbs.push(b);

    anim.bulbs.push(b);

    if (!anim.zones[zoneKey]) anim.zones[zoneKey] = [];

    anim.zones[zoneKey].push(b);

    return wire;
}

function fan(R, x, z, speed) {

    const m = M();

    const g = new THREE.Group();

    g.position.set(x, 3.55, z);

    R.group.add(g);

    const rod = new THREE.Mesh(U.cyl, m.iron);

    rod.scale.set(0.03, 0.45, 0.03);

    rod.position.y = 0.22;

    g.add(rod);

    const motor = new THREE.Mesh(U.cyl, m.iron);

    motor.scale.set(0.22, 0.12, 0.22);

    motor.position.y = -0.02;

    g.add(motor);

    const blades = new THREE.Group();

    blades.position.y = -0.06;

    g.add(blades);

    for (let i = 0; i < 3; i++) {

        const arm = new THREE.Group();

        arm.rotation.y = (i / 3) * Math.PI * 2;

        const b = new THREE.Mesh(U.box, m.iron);

        b.scale.set(0.65, 0.015, 0.13);

        b.position.set(0.42, 0, 0);

        b.rotation.z = 0.06;

        arm.add(b);

        blades.add(arm);
    }

    anim.fans.push({
        g, blades, speed,
        phase: rnd() * 10,
        wobble: 0.015 + rnd() * 0.03
    });
}


// ======================================================
// WASHROOMS
// ======================================================

function washroom(R, side, indian, rng) {

    const m = M();

    const xw = side > 0 ? R.lx1 : R.lx0;

    const dirIn = -side;

    // washroom: wide enough to walk into (the player is 0.8 m wide).
    // The window of the room is on the OTHER side of the room, so the
    // washroom never has to be squeezed.
    const WW = 2.7;

    const DOOR_W = 1.2;

    const SOLID = WW - 0.075 - DOOR_W;

    const inner = xw + dirIn * WW;

    const zf = 8.2;

    const stallD = 10.5 - zf;

    // inner side wall (full height)
    R.solid(0.15, 4, stallD, inner, 0, (zf + 10.5) / 2);

    // front wall piece (solid part)
    R.solid(SOLID, 4, 0.15, xw + dirIn * SOLID / 2, 0, zf);

    // small piece above the doorway
    const gapStart = xw + dirIn * SOLID;
    const gapEnd = xw + dirIn * (WW - 0.075);

    R.solid(
        Math.abs(gapEnd - gapStart), 1.8, 0.15,
        (gapStart + gapEnd) / 2, 2.2, zf
    ).userData.noCollide = false;

    // tile floor
    R.pln(
        m.tile, WW - 0.075, stallD,
        xw + dirIn * (WW - 0.075) / 2, 0.014, (zf + 10.5) / 2,
        { rx: -Math.PI / 2 }
    );

    // wall tiles
    R.pln(m.tile, WW - 0.075, 1.5, xw + dirIn * (WW - 0.075) / 2, 0.75, 10.48);

    R.pln(
        m.tile, stallD, 1.5, xw + dirIn * 0.02, 0.75, (zf + 10.5) / 2,
        { ry: dirIn * Math.PI / 2 }
    );

    R.pln(
        m.tile, stallD, 1.5, inner - dirIn * 0.09, 0.75, (zf + 10.5) / 2,
        { ry: -dirIn * Math.PI / 2 }
    );

    // washroom door: press E to open / close (swings out into the room)
    const hinge = new THREE.Group();

    hinge.position.set(xw + dirIn * SOLID, 0, zf);

    R.group.add(hinge);

    const panel = new THREE.Mesh(U.box, getDoorMaterial());

    panel.scale.set(DOOR_W - 0.02, 2.15, 0.05);

    panel.position.set(dirIn * (DOOR_W - 0.02) / 2, 1.075, 0);

    panel.userData.pivot = hinge;

    panel.userData.washDoor = true;

    hinge.add(panel);

    R.cs.add(panel);

    // the door swings almost flat against the front wall (about 160 deg)
    // so the doorway stays completely free for the player
    const wd = registerDoor(hinge, 0, dirIn * 2.75, rng() < 0.5, "wash");

    panel.userData.getPrompt = () =>
        "Press E - " + (wd.isOpen ? "Close" : "Open") +
        " the washroom door";

    panel.userData.interact = () => wd.toggle();

    if (R.interaction) R.interaction.add(panel);

    // blood hand print on the washroom door (moves with the door)
    const hp = new THREE.Mesh(U.pln, m.hand);

    hp.scale.set(0.3, 0.3, 1);

    hp.position.set(dirIn * 0.4, 1.3, -0.04);

    hp.rotation.y = Math.PI;

    hinge.add(hp);

    // fixtures
    const fx = xw + dirIn * 1.0;

    if (indian) {

        // squat pan
        R.box(m.porcelain, 0.55, 0.06, 0.8, fx, 0, 9.3);

        R.cyl(m.dark, 0.2, 0.07, fx, 0, 9.4);

        R.box(m.porcelain, 0.2, 0.08, 0.28, fx - 0.18, 0.04, 8.85);

        R.box(m.porcelain, 0.2, 0.08, 0.28, fx + 0.18, 0.04, 8.85);

        // flush tank + pipe + chain
        R.box(m.porcelain, 0.5, 0.35, 0.2, fx, 2.2, 10.38);

        R.cyl(m.steel, 0.06, 1.5, fx, 0.6, 10.36);

        R.box(m.iron, 0.01, 0.6, 0.01, fx + 0.15, 1.6, 10.28);
    }
    else {

        // western commode
        R.box(m.porcelain, 0.38, 0.4, 0.45, fx, 0, 10.0);

        R.cyl(m.porcelain, 0.42, 0.08, fx, 0.4, 9.88);

        R.cyl(m.dark, 0.3, 0.02, fx, 0.48, 9.88);

        // lid standing up
        R.box(m.porcelain, 0.38, 0.04, 0.4, fx, 0.75, 10.15, { rx: -1.35 });

        // flush tank
        R.box(m.porcelain, 0.5, 0.45, 0.22, fx, 0.55, 10.37);

        R.box(m.steel, 0.06, 0.02, 0.06, fx, 1.0, 10.37);
    }

    // tap, bucket, mug
    const tx = xw + dirIn * 0.45;

    R.cyl(m.steel, 0.03, 0.1, tx, 0.85, 10.42, { rx: Math.PI / 2 });

    R.cyl(m.bucket, 0.34, 0.32, tx, 0, 10.1);

    R.cyl(m.redWater, 0.3, 0.02, tx, 0.28, 10.1);

    R.cyl(m.bucket, 0.14, 0.12, tx + dirIn * 0.35, 0, 10.2);

    // wash basin + cracked mirror on the room-side wall
    R.box(m.porcelain, 0.5, 0.14, 0.45, xw + dirIn * 0.28, 0.82, 8.95);

    R.box(m.porcelain, 0.1, 0.8, 0.1, xw + dirIn * 0.28, 0, 8.95);

    R.pln(
        m.mirror, 0.5, 0.75, xw + dirIn * 0.03, 1.7, 8.95,
        { ry: dirIn * Math.PI / 2 }
    );

    // blood on the washroom floor
    R.decal(m.blood, 0.9, 0.9, fx + (rng() - 0.5) * 0.6, 8.9, rng() * 6);

    R.decal(m.blood, 0.5, 0.5, fx, 9.4, rng() * 6);

    // small frosted window high on the back wall (matches the room window:
    // same moonlit glass and the same dark frame)
    const vx = xw + dirIn * WW / 2;

    R.pln(
        new THREE.MeshBasicMaterial({
            color: 0x5d7488, transparent: true, opacity: 0.75, side: THREE.DoubleSide
        }),
        0.56, 0.44, vx, 1.98, 10.485, { ry: Math.PI }
    );

    R.box(m.iron, 0.66, 0.05, 0.06, vx, 1.73, 10.46);

    R.box(m.iron, 0.66, 0.05, 0.06, vx, 2.2, 10.46);

    R.box(m.iron, 0.05, 0.52, 0.06, vx - 0.305, 1.73, 10.46);

    R.box(m.iron, 0.05, 0.52, 0.06, vx + 0.305, 1.73, 10.46);

    R.box(m.iron, 0.04, 0.47, 0.05, vx, 1.75, 10.46);

    R.box(m.iron, 0.6, 0.04, 0.05, vx, 1.96, 10.46);

    // cobweb + spider in the corner
    placeWeb(R, xw + dirIn * 0.6, 3.5, 10.45, 1.1, 0);

    placeSpider(R, xw + dirIn * 0.5, 3.1, 10.4, 1.0, 0, Math.PI / 2);
}


// ======================================================
// WINDOW (opposite the door)
// ======================================================

function windowFrame(R, x, rng, rowN) {

    const m = M();

    const broken = rng() < 0.4;

    // wooden frame
    R.box(m.wood, 1.9, 0.07, 0.3, x, 0.98, 10.35);

    R.box(m.wood, 1.8, 0.07, 0.12, x, 2.78, 10.45);

    R.box(m.wood, 0.08, 1.8, 0.12, x - 0.85, 1.0, 10.45);

    R.box(m.wood, 0.08, 1.8, 0.12, x + 0.85, 1.0, 10.45);

    // iron bars
    for (let i = 0; i < 6; i++) {

        R.cyl(
            m.iron, 0.025, 1.8,
            x - 0.7 + i * 0.28, 1.0, 10.4
        );
    }

    // glass (also blocks the player)
    const glass = new THREE.Mesh(
        U.box, broken ? m.crackedGlass : m.glass
    );

    glass.scale.set(1.62, 1.8, 0.04);

    glass.position.set(x, 1.9, 10.75);

    R.group.add(glass);

    R.cs.add(glass);

    if (broken) {
        glass.material = m.crackedGlass;
    }

    // curtains (they sway)
    for (const s of [-1, 1]) {

        const c = new THREE.Mesh(U.pln, m.cloth);

        const torn = rng() < 0.5;

        const h = torn ? 1.7 : 2.3;

        c.scale.set(0.7, h, 1);

        const pivot = new THREE.Group();

        pivot.position.set(x + s * 0.7, 3.0, 10.28);

        c.position.y = -h / 2;

        pivot.add(c);

        R.group.add(pivot);

        anim.curtains.push({
            pivot, phase: rnd() * 6.28, amp: 0.04 + rnd() * 0.07
        });
    }

    // curtain rod
    R.cyl(m.iron, 0.025, 2.4, x, 3.0, 10.28, { rz: Math.PI / 2 });

    // spider web across the top of the window
    placeWeb(R, x + 0.55, 2.55, 10.3, 0.9, 0);
}


// ======================================================
// BUILD ONE ROOM
// ======================================================

const COLS = [
    [-15, -7, -10.5],
    [-7, 0, -3.5],
    [0, 7, 3.5],
    [7, 15, 10.5]
];

const SCRIBBLES = [
    "HELP ME", "HE WATCHES", "DON'T SLEEP", "GET OUT",
    "SHE IS BEHIND YOU", "NO ONE LEAVES", "I SEE YOU",
    "IT'S UNDER THE BED", "DON'T OPEN THE DOOR", "RUN", "WE ARE STILL HERE"
];

// ======================================================
// LETTERS, BOOKS AND A SEARCHABLE TRUNK IN EVERY ROOM
// (uses its own random numbers so the rooms keep their old look)
// ======================================================
// x of the window in each column (must match WINDOW_X in world.js)
const WINDOW_X_BY_COL = [-11.6, -4.6, 4.6, 11.6];

let bookMats = null;

function bookMaterials() {

    if (!bookMats) {

        bookMats = [0x5a1c1c, 0x1c2c4a, 0x4a3a1c, 0x233a2a].map(
            (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 })
        );
    }

    return bookMats;
}

function roomLoot(R, floorNumber, roomNo, deskX, trunkX, W) {

    if (!R.interaction) return;

    const m = M();

    const lr = mulberry32(floorNumber * 7919 + roomNo * 104729 + 5);

    const pick = (arr) => arr[Math.floor(lr() * arr.length)];

    const tag = "f" + floorNumber + "r" + roomNo;

    // a letter on the desk.  Which note lies here changes with every new game:
    // a puzzle note (gen.js) if this room has one, otherwise a random old letter
    // (85% of the rooms).  The text is looked up when you read it.
    const deskRoll = lr();

    const lore = pick(LETTERS);

    {
        const x = deskX + 0.15;

        const z = 10.15;

        const mesh = R._m(
            U.box, m.paper, 0.22, 0.008, 0.3, x, 0.797, z,
            { ry: (lr() - 0.5) * 1.2, keep: true }
        );

        const slot = { id: "pz_" + tag, kind: "letter", mesh, x, y: 0.85, z, size: 0.5 };

        Object.defineProperty(slot, "title", { get: () => (pieceAt(tag) || lore).title });

        Object.defineProperty(slot, "text", { get: () => (pieceAt(tag) || lore).text });

        const pk = addReadable(R.interaction, R.group, slot);

        locks.register(() => {

            const here = !!pieceAt(tag) || deskRoll < 0.85;

            // the paper of a solved puzzle is gone
            const pz = paperPuzzle(tag);

            const used = !!pz && story.solved(pz);

            if (!here || used || inventory.has(slot.id)) pk.hide();
            else pk.show();
        });
    }


    // a book on the desk
    if (lr() < 0.5) {

        const t = pick(BOOKS);

        const mats = bookMaterials();

        const x = deskX + 0.5;

        const z = 10.0;

        const mesh = R._m(
            U.box, mats[Math.floor(lr() * mats.length)], 0.2, 0.05, 0.28,
            x, 0.815, z, { ry: (lr() - 0.5) * 0.8, keep: true }
        );

        addReadable(R.interaction, R.group, {
            id: "book_" + tag, title: t.title, text: t.text, kind: "book",
            mesh, x, y: 0.86, z, size: 0.5
        });
    }

    // a loose page on the floor
    if (lr() < 0.35) {

        const t = pick(LETTERS);

        const x = R.lx0 + 1.5 + lr() * (W - 3);

        const z = 4.6 + lr() * 2.4;

        const mesh = R._m(
            U.box, m.paper, 0.24, 0.006, 0.32, x, 0.012, z,
            { ry: lr() * 6, keep: true }
        );

        addReadable(R.interaction, R.group, {
            id: "page_" + tag, title: t.title, text: t.text, kind: "letter",
            mesh, x, y: 0.12, z, size: 0.55
        });
    }

    // the trunk can be searched  (Room 204's trunk is the locked one - puzzle 2)
    if (tag === "f2r4") {

        pick(TRINKETS);

        addStation(R.interaction, R.group, {
            id: "cipher", label: "Try the locked trunk",
            x: trunkX, y: 0.28, z: 8.0, sx: 0.74, sy: 0.62, sz: 1.09
        });
    }
    else {

        addContainer(R.interaction, R.group, {
            id: tag + "_trunk", label: "trunk",
            x: trunkX, y: 0.28, z: 8.0, sx: 0.74, sy: 0.62, sz: 1.09,
            item: pick(TRINKETS)
        });
    }

    // the cheese and the lever handle (puzzles 7 and 8) lie in two random rooms
    placeSecretItems(R, tag, W);
}


function buildRoom(ctx, rowN, col, roomNo) {

    const m = M();

    const rng = mulberry32(
        ctx.floorNumber * 1000 + roomNo * 37 + 11
    );

    const [a, b, doorX] = COLS[col];

    const x0 = a + 0.25;
    const x1 = b - 0.25;

    const R = new RB(ctx, rowN);

    R.lx0 = rowN ? -x1 : x0;
    R.lx1 = rowN ? -x0 : x1;

    const lD = rowN ? -doorX : doorX;

    const W = R.lx1 - R.lx0;

    const big = W > 7;

    const zoneKey = ctx.floorNumber + "-" + roomNo;

    // the washroom always sits on the side towards the middle of the
    // building, so the room window (always on the outer side) is never
    // inside the bathroom.  (rng() is still called so nothing else changes)
    rng();

    const washSide = (rowN ? -1 : 1) * (col < 2 ? 1 : -1);

    const indian = (ctx.floorNumber + roomNo) % 2 === 0;

    const freeSide = -washSide;

    // ---------- washroom ----------
    washroom(R, washSide, indian, rng);

    // ---------- window opposite the door ----------
    // (kept clear of the washroom wall: it must never sit inside the bathroom)
    const winX = (rowN ? -1 : 1) * WINDOW_X_BY_COL[col];

    windowFrame(R, winX, rng, rowN);

    // ---------- beds ----------
    const slots = [1.9, 3.4, 4.9, 6.4];

    const perSide = big ? 3 + (rng() < 0.5 ? 1 : 0) : 2;

    const bedSpots = [];

    for (const side of [-1, 1]) {

        for (let i = 0; i < perSide; i++) {

            if (!big && rng() < 0.15) continue;

            const z = slots[i];

            // never put a bed in front of the washroom door
            if (side === washSide && z > 5.2) continue;

            const info = big
                ? bunkBed(R, side, z, rng)
                : singleBed(R, side, z, rng);

            bedSpots.push({ side, ...info });
        }
    }

    // ---------- almirahs ----------
    cabinet(R, R.lx0 + 0.31, 0.75, Math.PI / 2);

    cabinet(R, R.lx1 - 0.31, 0.75, -Math.PI / 2);

    // ---------- desk + chair + trunk on the free side ----------
    const deskX = freeSide < 0 ? R.lx0 + 1.0 : R.lx1 - 1.0;

    desk(R, deskX, 10.1);

    chair(R, deskX + (rng() - 0.5) * 0.6, 9.2, rng() < 0.35);

    const trunkX = freeSide < 0 ? R.lx0 + 0.35 : R.lx1 - 0.35;

    R.box(m.iron, 0.6, 0.45, 0.95, trunkX, 0, 8.0);

    R.collider(0.62, 0.5, 0.97, trunkX, 0, 8.0);

    // letters, books and a trunk you can search
    roomLoot(R, ctx.floorNumber, roomNo, deskX, trunkX, W);

    // ---------- ceiling fan + hanging bulb ----------
    const fanSpeed = rng() < 0.3 ? 0 : (0.6 + rng() * 2.4);

    fan(R, (R.lx0 + R.lx1) / 2, 5.3, fanSpeed);

    bulb(R, lD - 1.2, 3.0, rng() < 0.3, zoneKey);

    // ---------- spiders and webs ----------
    placeWeb(R, R.lx0 + 0.03, 3.4, 0.9, 1.3, Math.PI / 2);

    placeWeb(R, R.lx1 - 0.03, 3.45, 9.7, 1.4, -Math.PI / 2);

    placeWeb(R, R.lx0 + 0.9, 3.5, 10.45, 1.5, 0);

    placeWeb(R, R.lx1 - 0.9, 3.45, 0.3, 1.2, 0);

    placeSpider(R, R.lx0 + 0.9, 3.15, 10.4, 1.3, 0, Math.PI / 2);

    placeSpider(R, R.lx1 - 0.7, 3.2, 0.3, 0.9, 0, Math.PI / 2);

    for (let i = 0; i < 2 + Math.floor(rng() * 3); i++) {

        const ss = 0.4 + rng() * 0.5;

        placeSpider(
            R,
            R.lx0 + 1 + rng() * (W - 2),
            0.07 * ss + 0.02,
            1.5 + rng() * 8,
            ss,
            rng() * 6.28
        );
    }

    hangSpider(R, lD + (rng() - 0.5) * 2, 3 + rng() * 4, 0.8 + rng() * 0.9,
        0.7 + rng() * 0.5);

    if (rng() < 0.6) {

        hangSpider(R, lD + (rng() - 0.5) * 3, 6 + rng() * 3,
            0.6 + rng() * 0.8, 0.5 + rng() * 0.4);
    }

    // ---------- hostel stuff ----------
    R.pln(m.notice, 0.7, 0.9, lD + 1.5, 1.7, 0.02);

    // hanging clothes
    R.pln(m.cloth, 0.45, 1.0, lD + 1.3, 1.6, 10.44);

    R.pln(m.cloth, 0.4, 0.9, lD - 1.4, 1.65, 10.44);

    // slippers + bottle + papers on the floor
    for (let i = 0; i < 3; i++) {

        R.box(
            m.dark, 0.1, 0.03, 0.24,
            R.lx0 + 1.5 + rng() * (W - 3), 0, 1 + rng() * 8,
            { ry: rng() * 6 }
        );

        R.pln(
            m.paper, 0.25, 0.32,
            R.lx0 + 1.5 + rng() * (W - 3), 0.015, 1 + rng() * 8,
            { rx: -Math.PI / 2, rz: rng() * 6 }
        );
    }

    for (let i = 0; i < 4; i++) {

        R.box(
            m.plaster, 0.1 + rng() * 0.15, 0.06, 0.1 + rng() * 0.15,
            R.lx0 + 1 + rng() * (W - 2), 0, 0.5 + rng() * 9,
            { ry: rng() * 6 }
        );
    }

    // ---------- the scary stuff ----------

    // writing on a side wall
    const scribbleSide = rng() < 0.5 ? -1 : 1;

    const text = SCRIBBLES[Math.floor(rng() * SCRIBBLES.length)];

    const tt = textTex(text, "#8a0b0b", 512, 192);

    if (tt) {

        const mat = new THREE.MeshBasicMaterial({
            map: tt, transparent: true, depthWrite: false,
            polygonOffset: true, polygonOffsetFactor: -2
        });

        R.pln(
            mat, 2.4, 0.9,
            scribbleSide < 0 ? R.lx0 + 0.02 : R.lx1 - 0.02,
            2.4, 8.6,
            { ry: scribbleSide < 0 ? Math.PI / 2 : -Math.PI / 2, keep: true }
        );
    }

    // bloody hand prints near the door
    for (let i = 0; i < 3; i++) {

        R.pln(
            m.hand, 0.3, 0.3,
            lD + 0.9 + rng() * 0.8, 1.0 + rng() * 0.9, 0.02,
            { rz: (rng() - 0.5) * 0.6 }
        );
    }

    // big blood pool + drag marks
    R.decal(m.blood, 1.6, 1.6, lD + (rng() - 0.5) * 2, 4 + rng() * 3, rng() * 6);

    R.decal(m.blood, 0.9, 0.9, lD + (rng() - 0.5) * 2, 7.5 + rng(), rng() * 6);

    // footprints from the door
    if (rng() < 0.7) {

        for (let i = 0; i < 7; i++) {

            R.decal(
                m.foot, 0.2, 0.4,
                lD + (i % 2 ? 0.15 : -0.15), 0.8 + i * 0.9, 0.1
            );
        }
    }

    // damp stain on the ceiling
    R.pln(
        m.ceilStain, 3, 3, lD + (rng() - 0.5) * 2, 3.985, 3 + rng() * 5,
        { rx: Math.PI / 2 }
    );

    // creepy doll waiting on a bed
    if (bedSpots.length && rng() < 0.45) {

        const bs = bedSpots[Math.floor(rng() * bedSpots.length)];

        doll(
            R,
            bs.cx + (bs.side < 0 ? 0.3 : -0.3),
            bs.top + 0.04,
            bs.z,
            bs.side < 0 ? Math.PI / 2 : -Math.PI / 2
        );
    }

    // eyes watching from under a bed
    if (bedSpots.length && rng() < 0.3) {

        const bs = bedSpots[Math.floor(rng() * bedSpots.length)];

        const ex = bs.cx + (bs.side < 0 ? 0.55 : -0.55);

        R.sph(m.eyes, 0.04, ex, 0.2, bs.z - 0.07);

        R.sph(m.eyes, 0.04, ex, 0.2, bs.z + 0.07);
    }

    R.finish();

    return R;
}


// ======================================================
// ALL ROOMS OF ONE FLOOR
// ======================================================

export function furnishRooms(
    scene, collisionSystem, floorNumber, floorHeight, interaction
) {

    const ctx = {
        scene,
        cs: collisionSystem,
        floorNumber,
        floorHeight,
        interaction
    };

    for (const rowN of [true, false]) {
        for (let col = 0; col < 4; col++) {

            const roomNo = (rowN ? 0 : 4) + col + 1;

            buildRoom(ctx, rowN, col, roomNo);
        }
    }
}


// ======================================================
// ROOM NUMBER PLATE  (above every door, in the corridor)
// ======================================================

export function addRoomPlate(
    scene, doorX, floorHeight, wallZ, roomNumber
) {

    const tex = plateTex("ROOM " + roomNumber);

    const mat = new THREE.MeshStandardMaterial({
        map: tex || null,
        color: tex ? 0xffffff : 0x1d2a22,
        roughness: 0.8
    });

    const plate = new THREE.Mesh(U.pln, mat);

    plate.scale.set(0.9, 0.34, 1);

    if (wallZ < 0) {

        plate.position.set(doorX, floorHeight + 3.5, wallZ + 0.26);
    }
    else {

        plate.position.set(doorX, floorHeight + 3.5, wallZ - 0.26);

        plate.rotation.y = Math.PI;
    }

    scene.add(plate);
}


// ======================================================
// CORRIDOR  (flickering tube lights, blood trail, webs)
// ======================================================

export function decorateCorridor(
    scene, collisionSystem, floorNumber, floorHeight, interaction
) {

    const m = M();

    const rng = mulberry32(floorNumber * 7777 + 5);

    const ctx = { scene, cs: collisionSystem, floorNumber, floorHeight, interaction };

    const R = new RB(ctx, false);

    R.group.position.set(0, floorHeight, 0);

    const zoneKey = floorNumber + "-C";

    // tube lights
    [-9, -3, 3, 9].forEach((x, i) => {

        const dead = (i + floorNumber) % 4 === 0;

        R.box(m.iron, 1.3, 0.05, 0.2, x, 3.9, 0);

        const mat = new THREE.MeshBasicMaterial({
            color: dead ? 0x222222 : 0xcfe0ff
        });

        const tube = R._m(U.box, mat, 1.2, 0.04, 0.12, x, 3.86, 0, { keep: true });

        const b = {
            mesh: tube, mat, dead,
            phase: rnd() * 100,
            base: new THREE.Color(dead ? 0x222222 : 0xcfe0ff),
            zone: zoneKey, lvl: 1, tube: true
        };

        R._bulbs = R._bulbs || [];

        R._bulbs.push(b);

        anim.bulbs.push(b);

        if (!anim.zones[zoneKey]) anim.zones[zoneKey] = [];

        anim.zones[zoneKey].push(b);
    });

    // blood trail down the corridor
    const startX = -10 + rng() * 3;

    for (let i = 0; i < 16; i++) {

        R.decal(
            m.foot, 0.22, 0.45,
            startX + i * 0.85,
            (i % 2 ? 0.2 : -0.2) + 0.3,
            Math.PI / 2 + (rng() - 0.5) * 0.3
        );
    }

    R.decal(m.blood, 2.2, 2.2, startX + 13.5, 0.3, rng() * 6);

    R.decal(m.blood, 1.2, 1.2, -8, -1.5, rng() * 6);

    // hand prints and writing on the corridor wall
    for (let i = 0; i < 4; i++) {

        R.pln(
            m.hand, 0.3, 0.3,
            -11 + rng() * 22, 0.9 + rng() * 0.9, -3.72,
            { rz: (rng() - 0.5) * 0.7 }
        );
    }

    const tt = textTex(
        ["LEAVE", "TOO LATE", "HE IS COMING", "NO EXIT"][floorNumber % 4],
        "#7d0a0a", 512, 192
    );

    if (tt) {

        const mat = new THREE.MeshBasicMaterial({
            map: tt, transparent: true, depthWrite: false,
            polygonOffset: true, polygonOffsetFactor: -2
        });

        R.pln(mat, 3.2, 1.2, 5.5, 2.0, 3.72, { ry: Math.PI, keep: true });
    }

    // papers and rubble
    for (let i = 0; i < 12; i++) {

        R.pln(
            m.paper, 0.25, 0.32,
            -12 + rng() * 24, 0.015, -2.5 + rng() * 5,
            { rx: -Math.PI / 2, rz: rng() * 6 }
        );
    }

    // fallen chair
    chair(R, -4 + rng() * 8, -2.2, true);

    // cobwebs + spiders at the corridor ends and ceiling
    placeWeb(R, -10.9, 3.4, -3.65, 1.6, 0);

    placeWeb(R, 10.9, 3.4, 3.65, 1.6, Math.PI);

    placeWeb(R, 0, 3.5, 3.65, 1.4, Math.PI);

    placeSpider(R, -10.9, 3.1, -3.6, 1.4, 0, Math.PI / 2);

    placeSpider(R, 10.9, 3.1, 3.6, 1.2, Math.PI, Math.PI / 2);

    hangSpider(R, -6, 0, 1.0, 0.8);

    hangSpider(R, 6, 1, 1.4, 1.0);

    R.finish();
}


// ======================================================
// NIGHT, FOG, MOON, LIGHT POOL
// ======================================================

export function setupHauntedAtmosphere(scene) {

    SCENE = scene;

    scene.background = new THREE.Color(0x020308);

    scene.fog = new THREE.FogExp2(0x04060a, SETTINGS.fogDensity);

    ambientLight = new THREE.AmbientLight(0x6a7896, SETTINGS.ambient);

    hemiLight = new THREE.HemisphereLight(0x39465e, 0x0c0a08, 0.35);

    scene.add(ambientLight);

    scene.add(hemiLight);

    // two flickering lights that follow the player
    for (let i = 0; i < 2; i++) {

        const l = new THREE.PointLight(0xffc27a, 0, 11, 2);

        scene.add(l);

        pool.push({ light: l, target: null, fade: 1 });
    }

    // ground outside
    // ONE moon, on the north side only.  Rooms 01-04 (north row)
    // can see it through their windows, rooms 05-08 (south row)
    // never can.  There is no sun - it is always night.
    const mt = moonTex();

    const moon = new THREE.Mesh(
        new THREE.SphereGeometry(3.2, 24, 18),
        new THREE.MeshBasicMaterial({
            map: mt || null,
            color: mt ? 0x9aa6bd : 0x8f9bb2,
            fog: false
        })
    );

    moon.position.set(-60, 75, -170);

    scene.add(moon);

    // stars
    const n = 700;

    const pos = new Float32Array(n * 3);

    for (let i = 0; i < n; i++) {

        const a = rnd() * 6.28;
        const e = 0.1 + rnd() * 1.2;

        pos[i * 3] = Math.cos(a) * Math.cos(e) * 450;
        pos[i * 3 + 1] = Math.sin(e) * 450;
        pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * 450;
    }

    const sg = new THREE.BufferGeometry();

    sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));

    scene.add(new THREE.Points(
        sg,
        new THREE.PointsMaterial({
            color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false
        })
    ));
}


// ======================================================
// FLASHLIGHT  (press F)
// ======================================================

export function attachFlashlight(camera) {

    if (!SCENE) return;

    if (!camera.parent) {
        SCENE.add(camera);
    }

    flashlight = new THREE.SpotLight(
        0xfff1d0, SETTINGS.flashlight, 24, 0.5, 0.55, 1.6
    );

    flashlight.position.set(0.15, -0.1, 0);

    camera.add(flashlight);

    camera.add(flashlight.target);

    flashlight.target.position.set(0, 0, -5);

    glow = new THREE.PointLight(0xffe6c0, 2.2, 4.5, 2);

    camera.add(glow);

    document.addEventListener("keydown", (e) => {

        if (e.code === "KeyF" && !(PLAYER && PLAYER.hidden)) {
            flashOn = !flashOn;
            flashlight.visible = flashOn && !menuMode;
            glow.visible = flashOn && !menuMode;

            audio.flashlightClick();

            events.emit("flashlight");
        }
    });

    if (SETTINGS.vignette) {

        const v = document.createElement("div");

        v.style.cssText =
            "position:fixed;inset:0;pointer-events:none;z-index:2;" +
            "background:radial-gradient(ellipse at center," +
            "rgba(0,0,0,0) 45%,rgba(0,0,0,0.6) 100%);";

        v.id = "gameVignette";

        document.body.appendChild(v);

        vigEl = v;
    }

    const hint = document.createElement("div");

    hint.textContent = "F - flashlight";

    hint.style.cssText =
        "position:fixed;left:14px;bottom:12px;color:#9a9a9a;" +
        "font:13px Arial,sans-serif;z-index:3;pointer-events:none;";

    hint.id = "gameHint";

    document.body.appendChild(hint);
}


// ======================================================
// UPDATE EVERY FRAME
// ======================================================

function zoneOf(p) {

    // outside in the yard
    if (Math.abs(p.x) > 15 || Math.abs(p.z) > 15) return "Y";

    // terrace level and the roof of the terrace room
    if (p.y >= 12) {

        if (
            p.y < 15.2 &&
            Math.abs(p.x) < 4 &&
            p.z > -12.5 && p.z < -7.5
        ) {
            return "T-R";
        }

        return "T";
    }

    // the secret cellar under the entrance room
    if (p.y < -0.5) return "U";

    const f = Math.floor(p.y / 4) + 1;

    if (f < 1 || f > 3) return null;

    // entrance room (ground floor, under the right stairs)
    if (f === 1 && p.x > 11.45 && Math.abs(p.z) < 3.75) {
        return "1-E";
    }

    // the two stairwells (torches live here)
    if (Math.abs(p.z) < 3.75 && Math.abs(p.x) > 11.45) {
        return p.x < 0 ? "S-L" : "S-R";
    }

    if (p.z < -4 || p.z > 4) {

        const row = p.z < 0 ? 0 : 4;

        const col =
            p.x < -7 ? 0 : p.x < 0 ? 1 : p.x < 7 ? 2 : 3;

        return f + "-" + (row + col + 1);
    }

    return f + "-C";
}

// small jobs other modules want done every frame while you play (spiral.js, mystery.js)
export const frameHooks = [];

export function updateHaunted(t, dt, camera, playing) {

    if (playing === undefined) playing = true;

    if (playing) for (const f of frameHooks) f(t, dt);

    // ceiling fans
    for (const f of anim.fans) {

        if (f.speed > 0) {

            const stutter =
                Math.sin(t * 0.7 + f.phase) > 0.92 ? 0.15 : 1;

            f.blades.rotation.y += f.speed * stutter * dt * 3;
        }

        f.g.rotation.z = Math.sin(t * 1.3 + f.phase) * f.wobble;

        f.g.rotation.x = Math.cos(t * 1.1 + f.phase) * f.wobble;
    }

    // curtains
    for (const c of anim.curtains) {

        c.pivot.rotation.z = Math.sin(t * 0.8 + c.phase) * c.amp;

        c.pivot.rotation.x = Math.sin(t * 0.6 + c.phase * 2) * c.amp;
    }

    // hanging spiders
    for (const s of anim.spiders) {

        const len = s.base + Math.sin(t * 0.7 + s.phase) * 0.22;

        s.thread.scale.y = len;

        s.thread.position.y = -len / 2;

        s.spider.position.y = -len;

        s.spider.rotation.y += dt * 0.8;

        s.anchor.rotation.z = Math.sin(t * 0.9 + s.phase) * 0.05;
    }

    // doors swing smoothly
    for (const d of anim.doors) {

        const diff = d.target - d.pivot.rotation.y;

        if (Math.abs(diff) > 0.0005) {

            const step = d.speed * dt;

            d.pivot.rotation.y +=
                Math.abs(diff) <= step ? diff : Math.sign(diff) * step;
        }
    }

    // drifting ground mist
    for (const mi of anim.mist) {

        mi.mesh.position.x = mi.x0 + Math.sin(t * mi.speed + mi.phase) * mi.range;

        mi.mesh.position.z = mi.z0 + Math.cos(t * mi.speed * 0.7 + mi.phase) * mi.range * 0.6;
    }

    // swings / hanging signs
    for (const s of anim.swings) {

        s.g.rotation.z = Math.sin(t * s.speed + s.phase) * s.amp;

        s.g.rotation.x = Math.cos(t * s.speed * 0.7 + s.phase) * s.amp * 0.5;

        if (s.onFrame) s.onFrame(t);
    }

    // clothes / sheets on the terrace
    for (const s of anim.sheets) {

        s.pivot.rotation.x = Math.sin(t * 0.9 + s.phase) * s.amp;

        s.pivot.rotation.z = Math.sin(t * 0.55 + s.phase * 2) * s.amp * 0.5;
    }

    // candle flames
    for (const f of anim.flames) {

        const k = 0.8 + Math.sin(t * 17 + f.phase) * 0.15 +
            Math.random() * 0.12;

        f.mesh.scale.set(f.sx * k, f.sy * (0.8 + k * 0.4), f.sx * k);
    }

    // hanging chains
    for (const c of anim.chains) {

        c.g.rotation.z = Math.sin(t * 0.8 + c.phase) * 0.08;

        c.g.rotation.x = Math.cos(t * 0.6 + c.phase) * 0.06;
    }

    // static TVs and blinking lights
    for (const f of anim.flick) {

        if (f.type === "blink") {

            f.mat.color.setHex(
                Math.sin(t * 2.2 + f.phase) > 0.55 ? 0xff2020 : 0x300000
            );
        }
        else {

            const v = 0.15 + Math.random() * 0.5;

            f.mat.color.setRGB(v, v, v * 1.1);
        }
    }

    // bulbs flicker
    for (const b of anim.bulbs) {

        if (b.dead) continue;

        let lvl = 0.85 + 0.15 *
            Math.sin(t * 37 + b.phase) * Math.sin(t * 11 + b.phase * 2);

        const s = Math.sin(t * 0.9 + b.phase * 3.1);

        if (s > 0.985) lvl = 0.02;

        if (b.tube && Math.sin(t * 2.3 + b.phase) > 0.8) {
            lvl *= Math.random() < 0.5 ? 0.1 : 1;
        }

        // lights near the ghost stutter and die
        if (ghostFx.power > 0 && b.pos) {
            const gx = b.pos.x - ghostFx.x, gz = b.pos.z - ghostFx.z;
            if (Math.abs(b.pos.y - (ghostFx.y + 1.5)) < 3.4 && gx * gx + gz * gz < 190) {
                if (Math.random() < ghostFx.power * 0.35) lvl *= 0.04 + Math.random() * 0.5;
            }
        }
        b.lvl = lvl;

        b.mat.color.copy(b.base).multiplyScalar(0.25 + lvl * 0.75);
    }

    // light pool follows the player
    const zone = zoneOf(camera.position);

    const list = zone && anim.zones[zone]
        ? anim.zones[zone].filter((b) => !b.dead && b.pos)
        : [];

    list.sort((p, q) =>
        p.pos.distanceToSquared(camera.position) -
        q.pos.distanceToSquared(camera.position)
    );

    const isCorridor = zone && (zone.endsWith("-C") || zone === "T" || zone === "Y" || zone === "S-L" || zone === "S-R");

    for (let i = 0; i < pool.length; i++) {

        const p = pool[i];

        const target = (i === 0 || isCorridor) ? (list[i] || null) : null;

        if (target !== p.target) {

            p.target = target;

            p.fade = 0;

            if (target) {
                p.light.position.copy(target.pos);
                p.light.color.setHex(target.lightColor || 0xffc27a);
            }
        }

        p.fade = Math.min(1, p.fade + dt * 4);

        p.light.intensity = target
            ? SETTINGS.bulb * target.lvl * (target.power || 1) * p.fade
            : 0;
    }

    // sound follows the player
    if (playing) {

        audio.update(dt, camera, zone, PLAYER);
    }

    // fog: thinner outside so the hostel can be seen from the gate
    if (SCENE && SCENE.fog) {

        const wanted =
            zone === "Y" ? 0.034 :
            zone === "T" ? 0.042 :
            SETTINGS.fogDensity;

        SCENE.fog.density += (wanted - SCENE.fog.density) * Math.min(1, dt * 1.5);
    }

    // flashlight flickers once in a while
    if (flashlight && flashlight.visible && !menuMode) {

        const s = Math.sin(t * 0.37) * Math.sin(t * 1.9);

        flashlight.intensity =
            SETTINGS.flashlight * (s > 0.93 ? 0.35 + Math.random() * 0.4 : 1);
        // the torch stutters when the ghost is very close
        if (ghostFx.flashlight > 0 && Math.random() < ghostFx.flashlight * 0.3) {
            flashlight.intensity *= 0.08 + Math.random() * 0.5;
        }
    }
}


// ======================================================
// A LITTLE "TEST HOOK" (used for automatic checks)
// ======================================================

export const _internal = { anim, COLS };


// ======================================================
// MORE TEXTURES (ground, net, signs)
// ======================================================

function moonTex() {

    return once("moonTex", () =>
        canvasTexture(256, 128, (g, w, h) => {

            g.fillStyle = "#d9dcd6";
            g.fillRect(0, 0, w, h);

            for (let i = 0; i < 30; i++) {

                blob(g, rnd() * w, rnd() * h, 6 + rnd() * 16,
                    "rgba(110,115,125,0.45)");
            }

            for (let i = 0; i < 24; i++) {

                const x = rnd() * w;
                const y = rnd() * h;
                const r = 3 + rnd() * 9;

                g.strokeStyle = "rgba(90,95,105,0.6)";
                g.lineWidth = 1.5;
                g.beginPath();
                g.arc(x, y, r, 0, 6.28);
                g.stroke();
            }

        }, false)
    );
}

function groundTex() {

    return once("groundTex", () =>
        canvasTexture(256, 256, (g, w, h) => {

            g.fillStyle = "#1b1f15";
            g.fillRect(0, 0, w, h);

            for (let i = 0; i < 2600; i++) {

                const v = 20 + rnd() * 35;

                g.fillStyle =
                    "rgba(" + v + "," + (v + 8) + "," + (v - 6) + ",0.5)";

                g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 4);
            }

            for (let i = 0; i < 14; i++) {
                blob(g, rnd() * w, rnd() * h, 8 + rnd() * 20,
                    "rgba(8,6,3,0.4)");
            }

        }, true)
    );
}

function netTex() {

    return once("netTex", () =>
        canvasTexture(128, 128, (g, w, h) => {

            g.clearRect(0, 0, w, h);

            g.strokeStyle = "rgba(190,190,180,0.9)";
            g.lineWidth = 3;

            for (let i = -h; i < w + h; i += 32) {

                g.beginPath();
                g.moveTo(i, 0);
                g.lineTo(i + h, h);
                g.stroke();

                g.beginPath();
                g.moveTo(i + h, 0);
                g.lineTo(i, h);
                g.stroke();
            }

        }, true)
    );
}

export function getNetMaterial() {

    return once("netMat", () =>
        new THREE.MeshStandardMaterial({
            map: netTex() || null,
            color: 0xffffff,
            transparent: true,
            alphaTest: 0.3,
            side: THREE.DoubleSide,
            roughness: 0.7,
            metalness: 0.5
        })
    );
}

export function signTex(text) {
    return plateTex(text);
}

export function getGroundMaterialHint() {
    return groundTex();
}


// ======================================================
// BUILDER FOR OTHER MODULES (hall, entrance, yard, terrace)
// ======================================================

export function newBuilder(ctx, x, y, z) {

    const R = new RB(ctx, false);

    R.group.position.set(x, y, z);

    R.floorHeight = y;

    return R;
}


// ======================================================
// HIDING CABINETS  (press E in front of one to hide)
//
// The front of the cabinet is local +z. Rotate it with ry.
// ======================================================

export function getPlayer() {

    return PLAYER;
}

export function bindPlayer(player) {

    PLAYER = player;

    player.onHideChange = setHiddenView;
}

let restView = false;

function setHiddenView(hidden) {

    // sitting on a chair / sleeping on a bed is NOT hiding:
    // no dark screen, no cabinet sound, flashlight stays as it is
    if (hidden) restView = !!(PLAYER && PLAYER.hideSpot && PLAYER.hideSpot.rest);

    const rest = restView;

    if (!hidden) restView = false;

    if (rest) return;

    audio.setHidden(hidden);

    if (hidden) events.emit("hide");

    if (flashlight) {
        flashlight.visible = !hidden && flashOn && !menuMode;
        glow.visible = !hidden && flashOn && !menuMode;
    }

    if (vigEl) {

        vigEl.style.background = hidden
            ? "radial-gradient(ellipse at center," +
              "rgba(0,0,0,0.25) 10%,rgba(0,0,0,0.96) 85%)"
            : "radial-gradient(ellipse at center," +
              "rgba(0,0,0,0) 45%,rgba(0,0,0,0.6) 100%)";
    }
}

export function cabinet(R, x, z, ry, o) {

    o = o || {};

    const m = M();

    const Wd = o.w || 1.1;
    const D = o.d || 0.62;
    const H = o.h || 2.0;

    const g = new THREE.Group();

    g.position.set(x, 0, z);

    g.rotation.y = ry;

    R.group.add(g);

    const part = (mat, sx, sy, sz, px, py, pz) => {

        const mesh = new THREE.Mesh(U.box, mat);

        mesh.scale.set(sx, sy, sz);

        mesh.position.set(px, py + sy / 2, pz);

        g.add(mesh);

        R.merge.push(mesh);
    };

    // body
    part(m.almirah, Wd, H, 0.04, 0, 0, -D / 2 + 0.02);

    part(m.almirah, 0.04, H, D, -(Wd / 2 - 0.02), 0, 0);

    part(m.almirah, 0.04, H, D, Wd / 2 - 0.02, 0, 0);

    part(m.almirah, Wd, 0.04, D, 0, H - 0.04, 0);

    part(m.dark, Wd - 0.08, 0.1, D - 0.04, 0, 0, 0);

    // front doors with a thin gap in the middle and a slit at eye level
    const slit = 0.03;

    const doorW = Wd / 2 - 0.02 - slit;

    for (const s of [-1, 1]) {

        const cx = s * (slit + doorW / 2);

        part(m.almirah, doorW, 1.4, 0.03, cx, 0.05, D / 2 - 0.015);

        part(m.almirah, doorW, H - 0.04 - 1.6, 0.03, cx, 1.6, D / 2 - 0.015);

        part(m.iron, 0.025, 0.14, 0.03, s * (slit + 0.04), 0.95, D / 2 + 0.01);
    }

    // solid block the player cannot walk through
    const col = new THREE.Mesh(U.box, m.dark);

    col.scale.set(Wd, H, D);

    col.position.set(0, H / 2, 0);

    col.visible = false;

    g.add(col);

    R.cs.add(col);

    // invisible trigger in front of the doors
    const trig = new THREE.Mesh(
        U.box,
        new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
    );

    trig.scale.set(Wd - 0.1, H - 0.3, 0.05);

    trig.position.set(0, H / 2, D / 2 + 0.04);

    trig.visible = false;

    g.add(trig);

    const floorY = R.floorHeight;

    const get = () => {

        g.updateWorldMatrix(true, false);

        const inside = new THREE.Vector3(0, 0, 0).applyMatrix4(g.matrixWorld);

        inside.y = floorY + 1.55;

        const dir = new THREE.Vector3(0, 0, 1).transformDirection(g.matrixWorld);

        const exit = new THREE.Vector3(0, 0, D / 2 + 0.9)
            .applyMatrix4(g.matrixWorld);

        exit.y = floorY + 1.7;

        return {
            pos: inside,
            yaw: Math.atan2(-dir.x, -dir.z),
            exit
        };
    };

    trig.userData.getPrompt = () =>
        PLAYER && PLAYER.hidden
            ? "Press E - Come out"
            : "Press E - Hide inside";

    trig.userData.hideAt = get;
    trig.userData.interact = () => {

        if (!PLAYER) return;

        if (PLAYER.hidden) {
            PLAYER.exitHide();
        }
        else {
            PLAYER.enterHide(get());
        }
    };

    if (R.interaction) {
        R.interaction.add(trig);
    }

    return g;
}



// ======================================================
// HIDE SPOTS  (under beds / desks / tables, inside tanks)
//
// o = {
//   x, z       centre of the thing (builder coordinates)
//   w, h, d    size of the invisible E-trigger over it
//   ty         trigger centre height (default h / 2)
//   camY       eye height while hiding
//   label      "under the bed"  ->  "Press E - Hide under the bed"
//   exits      [[x, z], ...]  places to climb out; the first one
//              with free space is used
// }
// ======================================================
export function hideSpot(R, o) {

    const trig = new THREE.Mesh(
        U.box,
        new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
    );

    trig.scale.set(o.w, o.h, o.d);

    // (the trigger is centred on tx / tz when given: it must be a little
    //  BIGGER than the solid block, or the block hides it from the view ray)
    trig.position.set(
        o.tx === undefined ? o.x : o.tx,
        o.ty === undefined ? o.h / 2 : o.ty,
        o.tz === undefined ? o.z : o.tz
    );

    trig.rotation.y = o.ry || 0;

    trig.visible = false;

    R.group.add(trig);

    const floorY = R.floorHeight + (o.baseY || 0);

    const get = () => {

        R.group.updateWorldMatrix(true, false);

        const inside = new THREE.Vector3(o.x, 0, o.z)
            .applyMatrix4(R.group.matrixWorld);

        inside.y = floorY + o.camY;

        let exit = null;

        for (const [ex, ez] of o.exits) {

            const p = new THREE.Vector3(ex, 0, ez)
                .applyMatrix4(R.group.matrixWorld);

            p.y = floorY + 1.7;

            if (!exit) exit = p;

            const blocked = PLAYER.collisionSystem.check(
                p, PLAYER.playerRadius, PLAYER.playerHeight
            );

            if (!blocked) {

                exit = p;

                break;
            }
        }

        // look towards the place we will climb out to
        // (or, when sitting / lying, along o.look = [dx, dz])
        let yaw = Math.atan2(
            -(exit.x - inside.x), -(exit.z - inside.z)
        );

        if (o.look) {

            const d = new THREE.Vector3(o.look[0], 0, o.look[1])
                .transformDirection(R.group.matrixWorld);

            yaw = Math.atan2(-d.x, -d.z);
        }

        return {
            pos: inside, yaw, exit,
            rest: !!o.rest, pitch: o.pitch || 0
        };
    };

    // sitting / sleeping use the C key; hiding keeps E
    const keyName = o.rest ? "C" : "E";

    trig.userData.key = keyName;

    trig.userData.getPrompt = () => {

        if (PLAYER && PLAYER.hidden) {

            return o.rest
                ? "Press C - " + (o.upLabel || "Get up")
                : "Press E - Come out";
        }

        return "Press " + keyName + " - " + (o.verb || ("Hide " + o.label));
    };

    trig.userData.hideAt = get;
    trig.userData.interact = () => {

        if (!PLAYER) return;

        if (PLAYER.hidden) {
            PLAYER.exitHide();
        }
        else {
            PLAYER.enterHide(get());
        }
    };

    if (R.interaction) {
        R.interaction.add(trig);
    }
}

// a bed: hide under it, climb out at the foot end.
// A single bed also lets you lie on it and sleep (look at the mattress).
function bedHide(R, cx, z, side, label, h, sleepOn) {

    const fx = -side;                    // foot end direction (+x / -x)

    const out = cx + fx * 1.75;

    const exits = [
        [out, z], [out, z + 0.8], [out, z - 0.8], [out - fx * 0.3, z]
    ];

    if (sleepOn) {

        // low part of the bed = hide under it
        hideSpot(R, {
            x: cx, z, w: 2.12, h: 0.5, ty: 0.25, d: 1.07, camY: 0.3,
            label, exits
        });

        // top part = lie down on the mattress and sleep
        hideSpot(R, {
            x: cx, z, w: 2.12, h: 0.5, ty: 0.75, d: 1.07, camY: 1.0,
            rest: true, pitch: 1.1, look: [fx, 0],
            verb: "Lie down and sleep", upLabel: "Get up",
            exits
        });

        return;
    }

    hideSpot(R, {
        x: cx, z, w: 2.12, h, d: 1.07, camY: 0.3, label, exits
    });
}

// ======================================================
// EXPORTS FOR hall.js AND terrace.js
// ======================================================

export {
    RB, M, U, anim, mulberry32, makeSpider, placeSpider,
    hangSpider, placeWeb, chair, bulb, textTex, canvasTexture,
    once, blob, crack, bloodDrips, plateTex, mergeMeshes,
    singleBed, desk, doll
};


// ======================================================
// SMOOTH DOORS  (they swing, they are never instant)
// ======================================================

export function registerDoor(pivot, closedAngle, openAngle, startOpen, kind) {

    const d = {
        pivot,
        closed: closedAngle,
        open: openAngle,
        target: startOpen ? openAngle : closedAngle,
        isOpen: !!startOpen,
        speed: 2.6,
        kind: kind || "room",
        silent: false,
        setOpen(v) {

            if (v === this.isOpen) return;

            this.isOpen = v;

            this.target = v ? this.open : this.closed;

            if (!this.silent) {

                const wp = new THREE.Vector3();

                this.pivot.getWorldPosition(wp);

                audio.door(this.kind, wp.x, wp.y + 1.5, wp.z, v);

                if (v) events.emit("door", this.kind);
            }
        },
        toggle() {
            this.setOpen(!this.isOpen);
        }
    };

    pivot.rotation.y = d.target;

    anim.doors.push(d);

    return d;
}


// ======================================================
// MENU / SETTINGS HELPERS
// ======================================================

export function setMenuMode(on) {

    menuMode = on;

    if (flashlight) {

        flashlight.visible = !on && flashOn && !(PLAYER && PLAYER.hidden);

        glow.visible = flashlight.visible;
    }
}

export function setBrightness(v) {

    if (ambientLight) ambientLight.intensity = SETTINGS.ambient * v;

    if (hemiLight) hemiLight.intensity = 0.35 * v;
}

// every door shut again (new game) - silently
export function resetWorld() {

    for (const d of anim.doors) {

        const was = d.silent;

        d.silent = true;

        d.setOpen(false);

        d.silent = was;
    }
}

export { zoneOf };