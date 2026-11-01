import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

import { M, U, newBuilder, bulb, canvasTexture, getPlayer } from "./haunted.js";
import { inventory } from "./inventory.js";
import { audio } from "./audio.js";
import { story, L1, L2 } from "./story.js";
import { events } from "./events.js";
import { tween } from "./secrets.js";

// ======================================================
// RAMU'S SECRET ROOM  -  where the game ends
//
//   Nobody can know this room exists until the very end:
//
//   - the room itself is built far below the hostel (y = -24). It has no
//     stairs, no door and no way in: only the secret door below leads there.
//   - the SECRET DOOR is in the mess hall (ground-floor hall), north wall,
//     between the two doors on the right.  Until the letter is found it is
//     NOT THERE: not drawn, not clickable.
//   - when Ramu's letter is found (story.findLetter) the door appears,
//     opens, and E on it fades the screen and brings you into the room.
//   - in the room: E on the bed puts the letter there -> the ending.
//
// Edit the numbers below to move things.
// ======================================================

const ROOM = { x: 0, y: -24, z: 0, hx: 4.4, hz: 3.7 };

// the secret door in the mess hall (world position of the door's middle on the wall)
const DOOR = { x: 5.25, z: -3.75 };

// ------------------------------------------------------ the black fade
let fadeEl = null;

function fade(to, ms) {

    if (!fadeEl) {

        fadeEl = document.createElement("div");

        fadeEl.style.cssText = "position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:900;";

        document.body.appendChild(fadeEl);
    }

    fadeEl.style.transition = "opacity " + (ms || 900) + "ms ease";

    requestAnimationFrame(() => { fadeEl.style.opacity = String(to); });
}

// ======================================================
// THE ROOM UNDERGROUND (built once, empty and unreachable)
// ======================================================
export function buildMystery(scene, cs, interaction) {

    const ctx = { scene, cs, floorNumber: 1, floorHeight: ROOM.y, interaction };

    const R = newBuilder(ctx, ROOM.x, ROOM.y, ROOM.z);

    const m = M();

    const std = (color, extra) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 1 }, extra || {}));

    const plaster = std(0x7a735f, { emissive: 0x15120c });

    const floorM = std(0x3a2f26);

    const wood = std(0x5a4028);

    const darkWood = std(0x2e1f14);

    const iron = std(0x2a2c2f, { roughness: 0.6, metalness: 0.5 });

    const sheet = std(0xb9b09a);

    const blanket = std(0x8a3a30);

    const cloth = std(0xcdbb96, { emissive: 0x2a2418 });

    const paper = std(0xd8d0b4, { emissive: 0x2a2618 });

    const { hx, hz } = ROOM;

    const W = hx * 2 + 0.6, D = hz * 2 + 0.6;

    const wall = (w, d, x, z) => {

        R.box(plaster, w, 3.4, d, x, 0, z);

        R.collider(w, 3.4, d, x, 0, z);
    };

    wall(W, 0.3, 0, -hz - 0.15);

    wall(W, 0.3, 0, hz + 0.15);

    wall(0.3, D, -hx - 0.15, 0);

    wall(0.3, D, hx + 0.15, 0);

    R.box(plaster, W, 0.3, D, 0, 3.3, 0);

    R.box(floorM, hx * 2, 0.1, hz * 2, 0, -0.1, 0);

    cs.platforms.push({
        x0: ROOM.x - hx, x1: ROOM.x + hx, z0: ROOM.z - hz, z1: ROOM.z + hz, y: ROOM.y
    });

    // ------------------------------------------------ a child's drawing kit (crayon look)
    const FONT = '"Comic Sans MS","Segoe Print","Bradley Hand",cursive';

    const jit = (n) => (Math.random() - 0.5) * n;

    const line = (g, pts, col, wd) => {

        g.strokeStyle = col; g.lineWidth = wd || 4; g.lineCap = "round"; g.lineJoin = "round";

        g.beginPath();

        pts.forEach(([x, y], i) => { if (i) g.lineTo(x + jit(2.5), y + jit(2.5)); else g.moveTo(x, y); });

        g.stroke();
    };

    const fillC = (g, x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x + jit(1.5), y + jit(1.5), r, 0, Math.PI * 2); g.fill(); };

    const txt = (g, t, x, y, sz, col) => { g.font = sz + "px " + FONT; g.fillStyle = col || "#2a2a60"; g.fillText(t, x, y); };

    const kid = (g, x, y, s, col, mood) => {

        fillC(g, x, y, 13 * s, "#f0c8a0");

        line(g, [[x, y + 13 * s], [x, y + 50 * s]], col, 5 * s);

        line(g, [[x - 20 * s, y + 30 * s], [x, y + 24 * s], [x + 20 * s, y + 30 * s]], col, 4 * s);

        line(g, [[x, y + 50 * s], [x - 14 * s, y + 78 * s]], col, 4 * s);

        line(g, [[x, y + 50 * s], [x + 14 * s, y + 78 * s]], col, 4 * s);

        fillC(g, x - 4 * s, y - 2 * s, 1.6 * s, "#222"); fillC(g, x + 4 * s, y - 2 * s, 1.6 * s, "#222");

        line(g, mood === "sad" ? [[x - 5 * s, y + 7 * s], [x, y + 4 * s], [x + 5 * s, y + 7 * s]] : [[x - 5 * s, y + 4 * s], [x, y + 8 * s], [x + 5 * s, y + 4 * s]], "#222", 1.8 * s);

        if (mood === "sad") { line(g, [[x - 5 * s, y + 1], [x - 6 * s, y + 14 * s]], "#59a8ff", 1.6 * s); }
    };

    const tree = (g, x, y, s) => {

        line(g, [[x, y], [x, y - 90 * s]], "#6a4020", 14 * s);

        for (const [dx, dy, r] of [[0, -110, 46], [-38, -86, 32], [38, -88, 33], [4, -140, 30]]) fillC(g, x + dx * s, y + dy * s, r * s, "#2f8a3a");
    };

    const sun = (g, x, y, r) => {

        fillC(g, x, y, r, "#ffd23a");

        for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; line(g, [[x + Math.cos(a) * (r + 5), y + Math.sin(a) * (r + 5)], [x + Math.cos(a) * (r + 18), y + Math.sin(a) * (r + 18)]], "#ffb41a", 4); }
    };

    const sheetTex = (bg, draw) => canvasTexture(512, 384, (g, w, h) => {

        g.fillStyle = bg; g.fillRect(0, 0, w, h);

        for (let i = 0; i < 400; i++) { g.fillStyle = "rgba(90,70,40," + (Math.random() * 0.07) + ")"; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }

        draw(g, w, h);

        g.fillStyle = "rgba(235,225,175,.82)"; g.fillRect(8, 0, 56, 16); g.fillRect(w - 64, 0, 56, 16);

        g.strokeStyle = "rgba(60,45,25,.55)"; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4);
    });

    // ------------------------------------------------ his drawings and his memories
    const D_ = {

        village: sheetTex("#e4e2c2", (g, w, h) => {
            sun(g, 70, 70, 28); g.fillStyle = "#5aa84a"; g.fillRect(0, h - 90, w, 90); tree(g, w / 2 + 40, h - 90, 1.1);
            g.fillStyle = "#c46a3a"; g.fillRect(40, h - 180, 90, 90); g.fillStyle = "#8a2a20"; g.beginPath(); g.moveTo(30, h - 180); g.lineTo(85, h - 230); g.lineTo(140, h - 180); g.fill();
            kid(g, 170, h - 150, 0.9, "#c8302a"); kid(g, 215, h - 150, 0.9, "#2a50c8"); kid(g, 192, h - 128, 0.55, "#2a9a40");
            txt(g, "KOTHAPALLI - my home", 30, 36, 30, "#7a2a20"); txt(g, "Amma  Nanna  Ramu", 28, h - 14, 24, "#222");
        }),

        bangles: sheetTex("#efe0d0", (g, w, h) => {
            kid(g, 150, 110, 1.6, "#c8302a");
            for (let k = 0; k < 4; k++) { g.strokeStyle = "#ffcc22"; g.lineWidth = 4; g.beginPath(); g.arc(98 + k * 5, 168 + k * 3, 11, 0, 7); g.stroke(); }
            txt(g, "Amma's bangles", 270, 90, 30, "#b01818"); txt(g, "Amma sold them", 270, 140, 24); txt(g, "for my fees.", 270, 172, 24); txt(g, "I will buy them", 270, 230, 24, "#1a6a2a"); txt(g, "back one day!", 270, 262, 24, "#1a6a2a");
            line(g, [[260, 290], [470, 290]], "#999", 2);
        }),

        bus: sheetTex("#dfe8f0", (g, w, h) => {
            g.fillStyle = "#e8b020"; g.fillRect(60, 130, 340, 120); g.fillStyle = "#b0e0ff";
            for (let k = 0; k < 5; k++) g.fillRect(80 + k * 62, 150, 48, 40);
            fillC(g, 130, 255, 28, "#222"); fillC(g, 330, 255, 28, "#222");
            kid(g, 266, 160, 0.4, "#2a50c8"); line(g, [[250, 160], [235, 140]], "#2a50c8", 3);
            txt(g, "the bus to the city", 90, 70, 34, "#333"); txt(g, "bye bye Kothapalli", 110, 330, 26, "#7a2a20");
        }),

        hostel: sheetTex("#2a2c3a", (g, w, h) => {
            g.fillStyle = "#4a4a58"; g.fillRect(90, 80, 330, 230);
            for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) { g.fillStyle = (r + c) % 5 === 0 ? "#ffd860" : "#15151c"; g.fillRect(110 + c * 52, 100 + r * 70, 34, 44); }
            fillC(g, 430, 60, 22, "#e8e8d0");
            txt(g, "HEAVEN HOSTEL", 120, 52, 34, "#e8e0b0"); txt(g, "(it does not feel like heaven)", 100, 346, 22, "#c0b8e0");
        }),

        laugh: sheetTex("#d8d0c0", (g, w, h) => {
            for (let k = 0; k < 5; k++) { kid(g, 70 + k * 74, 120 - (k % 2) * 14, 0.9, "#555", ""); txt(g, "HA HA", 44 + k * 74, 96 - (k % 2) * 14, 20, "#a01818"); }
            kid(g, 260, 250, 0.9, "#c8302a", "sad"); txt(g, "me", 246, 360, 24);
            for (let k = 0; k < 30; k++) line(g, [[20 + Math.random() * 470, 20 + Math.random() * 120], [20 + Math.random() * 470, 20 + Math.random() * 120]], "rgba(20,20,20,.25)", 2);
        }),

        terrace: sheetTex("#10162e", (g, w, h) => {
            for (let k = 0; k < 40; k++) fillC(g, Math.random() * w, Math.random() * 150, 1.6, "#fff6c0");
            g.fillStyle = "#3a3a44"; g.fillRect(0, h - 90, w, 90); kid(g, 250, h - 190, 1.0, "#c8a03a");
            line(g, [[270, h - 150], [300, h - 190]], "#c8a03a", 4); g.fillStyle = "#101010"; g.fillRect(296, h - 218, 14, 24);
            for (let k = 0; k < 4; k++) line(g, [[320 + k * 10, h - 200], [320 + k * 10, h - 200 - 6 - k * 5]], "#7fd0ff", 3);
            txt(g, "the only place with signal", 40, 40, 26, "#e8e0b0"); txt(g, "\"Amma, I am fine.\"", 120, 350, 28, "#ffe08a");
        }),

        promises: sheetTex("#f0ecd0", (g, w, h) => {
            for (let k = 0; k < 9; k++) line(g, [[0, 70 + k * 34], [w, 70 + k * 34]], "#8ab0d8", 1.5);
            line(g, [[60, 0], [60, h]], "#d86a6a", 2);
            txt(g, "MY PROMISES", 120, 44, 34, "#1a2a80");
            txt(g, "1. Make Amma proud", 76, 100, 24); txt(g, "2. Fix Nanna's roof", 76, 134, 24); txt(g, "3. Buy back the bangles", 76, 168, 24);
            txt(g, "4. Find one friend", 76, 202, 24); txt(g, "5. Do not cry at night", 76, 236, 24);
            line(g, [[70, 106], [82, 116], [106, 92]], "#1a8a2a", 4); line(g, [[70, 140], [82, 150], [106, 126]], "#1a8a2a", 4);
            txt(g, "(I am trying, Amma)", 130, 320, 24, "#a01818");
        }),

        star: sheetTex("#e8dcc0", (g, w, h) => {
            g.fillStyle = "#ffcf2a"; g.beginPath();
            for (let k = 0; k < 10; k++) { const r = k % 2 ? 50 : 120, a = -Math.PI / 2 + k * Math.PI / 5; g.lineTo(256 + Math.cos(a) * r, 170 + Math.sin(a) * r); }
            g.fill(); g.strokeStyle = "#b07a00"; g.lineWidth = 5; g.stroke();
            txt(g, "FIRST", 196, 190, 46, "#7a2a20"); txt(g, "Amma will be so happy", 90, 350, 28, "#1a2a80");
        }),

        gopal: sheetTex("#d6e6d0", (g, w, h) => {
            g.fillStyle = "#5aa84a"; g.fillRect(0, h - 80, w, 80); kid(g, 170, 130, 1.5, "#c8302a"); kid(g, 330, 130, 1.5, "#2a9a40");
            line(g, [[360, 160], [430, 110]], "#6a4020", 9); fillC(g, 440, 100, 10, "#b02020");
            txt(g, "Gopal never laughed.", 60, 46, 30, "#1a2a80"); txt(g, "maybe he is my friend?", 70, 350, 28, "#7a2a20");
        }),

        calendar: sheetTex("#f4f0e0", (g, w, h) => {
            txt(g, "OCTOBER", 170, 50, 36, "#a01818");
            for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) {
                const n = r * 7 + c + 1; if (n > 31) continue;
                g.strokeStyle = "#999"; g.strokeRect(36 + c * 62, 80 + r * 52, 58, 48); txt(g, String(n), 44 + c * 62, 108 + r * 52, 20, "#333");
                if (n < 24) { line(g, [[40 + c * 62, 84 + r * 52], [90 + c * 62, 122 + r * 52]], "#c02020", 3); line(g, [[90 + c * 62, 84 + r * 52], [40 + c * 62, 122 + r * 52]], "#c02020", 3); }
            }
            g.strokeStyle = "#1a8a2a"; g.lineWidth = 5; g.beginPath(); g.arc(36 + 3 * 62 + 29, 80 + 3 * 52 + 24, 30, 0, 7); g.stroke();
            txt(g, "DASARA - going home!", 100, 370, 26, "#1a8a2a");
        }),

        roof: sheetTex("#e6dfc8", (g, w, h) => {
            g.fillStyle = "#c46a3a"; g.fillRect(110, 190, 220, 130); g.fillStyle = "#8a2a20"; g.beginPath(); g.moveTo(90, 190); g.lineTo(220, 100); g.lineTo(350, 190); g.fill();
            g.fillStyle = "#e6dfc8"; g.fillRect(190, 140, 50, 36); line(g, [[390, 280], [450, 190]], "#6a4020", 8); g.fillStyle = "#666"; g.fillRect(432, 176, 40, 22);
            txt(g, "Nanna's roof has a hole", 50, 46, 28, "#1a2a80"); txt(g, "I will fix it at Dasara.", 60, 352, 28, "#1a8a2a");
        }),

        swing: sheetTex("#dfe0e8", (g, w, h) => {
            g.fillStyle = "#5a5a48"; g.fillRect(0, h - 60, w, 60); line(g, [[256, h - 60], [256, 100]], "#4a3a28", 16); line(g, [[256, 110], [160, 120]], "#4a3a28", 10); line(g, [[256, 110], [352, 120]], "#4a3a28", 10);
            line(g, [[190, 125], [190, 250]], "#333", 3); line(g, [[250, 125], [250, 250]], "#333", 3); g.fillStyle = "#7a5a30"; g.fillRect(186, 250, 68, 12);
            g.fillStyle = "#fff"; g.fillRect(380, 90, 90, 60); line(g, [[380, 90], [425, 125], [470, 90]], "#888", 2);
            txt(g, "where I sit and watch the gate", 40, 44, 26, "#1a2a80"); txt(g, "my letter is safe inside", 70, 350, 26, "#a01818");
        })
    };

    const arts = [];

    const art = (tex, wd, ht, wallId, pos, y, caption) => {

        const off = 0.03;

        let px, pz, ry;

        if (wallId === "N") { px = pos; pz = -hz + off; ry = 0; }
        else if (wallId === "S") { px = pos; pz = hz - off; ry = Math.PI; }
        else if (wallId === "W") { px = -hx + off; pz = pos; ry = Math.PI / 2; }
        else { px = hx - off; pz = pos; ry = -Math.PI / 2; }

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(wd, ht), new THREE.MeshBasicMaterial({ map: tex, color: 0xb4ab98 }));

        mesh.position.set(px, y, pz);

        mesh.rotation.y = ry;

        R.group.add(mesh);

        arts.push({ px, pz, ry, y, wd, ht, caption });
    };

    art(D_.village, 1.7, 1.28, "N", 0, 1.75, "A drawing of a village: a big tamarind tree, a small house, and three people holding hands.\n'KOTHAPALLI - my home.'");
    art(D_.bangles, 1.4, 1.05, "N", -2.9, 1.75, "'Amma sold her bangles for my fees. I will buy them back one day.'");
    art(D_.bus, 1.4, 1.05, "N", 2.9, 1.75, "A yellow bus, and a small boy waving from the window.\n'Bye bye Kothapalli.'");
    art(D_.gopal, 1.4, 1.05, "W", -2.4, 1.75, "'Gopal never laughed. Maybe he is my friend?'");
    art(D_.calendar, 1.3, 1.0, "W", 0.3, 2.15, "Every day crossed off, up to one circled in green:\n'DASARA - going home!'");
    art(D_.swing, 1.4, 1.05, "W", 2.7, 1.75, "A swing under a tree, and a letter drawn inside the seat.\n'My letter is safe inside.'");
    art(D_.promises, 1.4, 1.05, "E", -1.3, 1.9, "'MY PROMISES: make Amma proud. Fix Nanna's roof. Buy back the bangles. Find one friend. Do not cry at night.'\nTwo are ticked. The rest are not.");
    art(D_.star, 1.2, 0.9, "E", 0.9, 1.9, "A gold star. 'FIRST. Amma will be so happy.'");
    art(D_.roof, 1.4, 1.05, "E", 2.7, 1.75, "'Nanna's roof has a hole. I will fix it at Dasara.'");
    art(D_.hostel, 1.4, 1.05, "S", -3.3, 1.75, "'HEAVEN HOSTEL (it does not feel like heaven).'");
    art(D_.laugh, 1.4, 1.05, "S", -1.7, 1.75, "A ring of boys. 'HA HA HA HA.' And one small boy, crying, in the middle.\n'me'");
    art(D_.terrace, 1.4, 1.05, "S", 1.7, 1.75, "A boy on a roof at night, holding a phone to the stars.\n'The only place with signal. Amma, I am fine.'");

    // ------------------------------------------------ the rug, toys, kite, stars
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.4), new THREE.MeshBasicMaterial({
        map: canvasTexture(256, 180, (g, w, h) => {
            g.fillStyle = "#6a2a24"; g.fillRect(0, 0, w, h); g.strokeStyle = "#d8b060"; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20);
            g.strokeStyle = "#3a5a8a"; g.lineWidth = 4; g.strokeRect(26, 26, w - 52, h - 52);
            for (let k = 0; k < 7; k++) { g.fillStyle = k % 2 ? "#d8b060" : "#3a5a8a"; g.beginPath(); g.arc(46 + k * 27, h / 2, 9, 0, 7); g.fill(); }
        }), color: 0x9a9080
    }));

    rug.rotation.x = -Math.PI / 2;

    rug.position.set(0.3, 0.012, 0.2);

    R.group.add(rug);

    // cricket bat and ball in a corner
    R.box(wood, 0.1, 0.9, 0.04, hx - 0.35, 0, -hz + 0.3, { ry: 0.2 });

    R.box(std(0xb02020), 0.12, 0.12, 0.12, hx - 0.8, 0, -hz + 0.45);

    // a toy bullock cart (his village toy)
    R.box(wood, 0.5, 0.06, 0.3, -2.0, 0.14, hz - 0.8);

    R.box(darkWood, 0.04, 0.22, 0.34, -1.82, 0, hz - 0.8);

    R.box(darkWood, 0.04, 0.22, 0.34, -2.18, 0, hz - 0.8);

    R.box(std(0xc08a50), 0.18, 0.14, 0.14, -2.45, 0.1, hz - 0.8);

    // paper boats and crayons on the floor
    for (const [x, z, c, r] of [[1.2, 1.6, 0xe8e0c8, 0.3], [-0.6, 2.2, 0xd8c8a0, 1.2], [1.9, -0.5, 0xe0e0e8, 2.2]]) R.box(std(c), 0.16, 0.08, 0.1, x, 0.02, z, { ry: r });

    for (const [x, z, c] of [[0.5, 0.6, 0xd02020], [0.62, 0.7, 0x2060d0], [0.4, 0.78, 0x20a040], [0.7, 0.55, 0xe0c020]]) R.box(std(c, { emissive: c, emissiveIntensity: 0.15 }), 0.1, 0.02, 0.02, x, 0.02, z, { ry: x * 5 });

    // a kite on a string, paper planes, a mobile of stars (hung from the ceiling)
    const kite = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.9), new THREE.MeshBasicMaterial({
        map: canvasTexture(128, 160, (g, w, h) => {
            g.fillStyle = "#c8302a"; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w, h * 0.4); g.lineTo(w / 2, h); g.lineTo(0, h * 0.4); g.fill();
            g.strokeStyle = "#ffd23a"; g.lineWidth = 5; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h * 0.4); g.lineTo(w, h * 0.4); g.stroke();
        }), color: 0xc0b8a8, side: THREE.DoubleSide
    }));

    kite.position.set(-1.4, 2.2, -0.8);

    kite.rotation.set(0.3, 0.6, 0.2);

    R.group.add(kite);

    R.box(std(0x333333), 0.01, 0.7, 0.01, -1.4, 2.65, -0.8);

    for (const [x, z, r] of [[1.4, -1.0, 0.5], [2.0, 0.8, -0.4], [-0.4, 1.4, 1.1]]) R.box(std(0xeee8d8), 0.3, 0.012, 0.18, x, 2.6, z, { ry: r });

    const starMat = new THREE.MeshBasicMaterial({ color: 0xffe28a });

    for (let k = 0; k < 60; k++) {

        const star = new THREE.Mesh(U.box, starMat);

        star.scale.set(0.07, 0.01, 0.07);

        star.position.set((Math.random() * 2 - 1) * (hx - 0.4), 3.14, (Math.random() * 2 - 1) * (hz - 0.4));

        star.rotation.y = Math.random() * 3;

        R.group.add(star);
    }

    // ------------------------------------------------ the bed (west wall)
    const bx = -hx + 0.75, bz = 0.3;

    for (const dx of [-0.42, 0.42]) {

        for (const dz of [-0.95, 0.95]) {

            R.box(iron, 0.06, 0.4, 0.06, bx + dx, 0, bz + dz);
        }
    }

    R.box(iron, 0.95, 0.05, 2.0, bx, 0.4, bz);

    R.box(sheet, 0.9, 0.12, 1.9, bx, 0.45, bz);

    R.box(blanket, 0.9, 0.06, 1.1, bx, 0.57, bz + 0.4);

    R.box(sheet, 0.5, 0.1, 0.3, bx, 0.57, bz - 0.8);

    R.box(iron, 1.0, 0.7, 0.05, bx, 0.4, bz - 1.0);

    R.collider(1.0, 0.7, 2.1, bx, 0, bz);

    // the village shirt, folded at the foot of the bed
    R._m(U.box, cloth, 0.4, 0.07, 0.34, bx, 0.62, bz + 0.78, { keep: true, ry: 0.15 });

    // ---- the desk (east wall) with his school bag and books ----
    const dx0 = hx - 0.8, dz0 = -1.3;

    R.box(wood, 0.7, 0.05, 1.5, dx0, 0.74, dz0);

    for (const sx of [-0.3, 0.3]) {

        for (const sz of [-0.65, 0.65]) {

            R.box(wood, 0.05, 0.74, 0.05, dx0 + sx, 0, dz0 + sz);
        }
    }

    R.collider(0.75, 0.8, 1.55, dx0, 0, dz0);

    R.box(darkWood, 0.34, 0.3, 0.42, dx0, 0.79, dz0 - 0.4);            // bag

    R.box(paper, 0.22, 0.1, 0.3, dx0 - 0.05, 0.79, dz0 + 0.2, { ry: 0.3 });   // books

    R.box(std(0x2a4a7a), 0.2, 0.08, 0.28, dx0 - 0.05, 0.89, dz0 + 0.2, { ry: -0.2 });

    // a chair
    R.box(wood, 0.45, 0.05, 0.45, dx0 - 0.85, 0.45, dz0 + 0.1);

    R.box(wood, 0.05, 0.45, 0.45, dx0 - 1.05, 0.45, dz0 + 0.1);

    R.collider(0.5, 0.9, 0.5, dx0 - 0.85, 0, dz0 + 0.1);

    // a small trunk (kept away from the door)
    R.box(darkWood, 0.8, 0.45, 0.5, -2.7, 0, hz - 0.5);

    R.box(iron, 0.82, 0.05, 0.52, -2.7, 0.3, hz - 0.5);

    R.collider(0.85, 0.5, 0.55, -2.7, 0, hz - 0.5);

    // ---- warm light: a ceiling bulb and a little lamp by the bed ----
    bulb(R, 0, 0, false, "U", { y: 2.9, top: 3.3, color: 0xffe2b0, light: 0xffd49a });

    bulb(R, bx + 1.2, bz + 1.0, false, "U", { y: 1.2, top: 3.3, color: 0xffc080, light: 0xffb070 });

    R.finish();

    // ------------------------------------------------ the pictures can be looked at (E)
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);

    for (const a of arts) {

        const t = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));

        t.scale.set(a.wd, a.ht, 0.9);

        t.rotation.y = a.ry;

        const inx = Math.sin(a.ry) * 0.45, inz = Math.cos(a.ry) * 0.45;

        t.position.set(ROOM.x + a.px + inx, ROOM.y + a.y, ROOM.z + a.pz + inz);

        t.visible = false;

        scene.add(t);

        t.userData.getPrompt = () => "Press E - Look at the drawing";

        t.userData.interact = () => { audio.paper(); inventory.say(a.caption, 6); };

        interaction.add(t);
    }

    // ---- the boy (appears when you put the letter on the bed) ----
    const ghostMat = new THREE.MeshBasicMaterial({ color: 0xbcd6ff, transparent: true, opacity: 0.0, depthWrite: false });

    const boy = new THREE.Group();

    boy.position.set(ROOM.x + bx + 0.1, ROOM.y, ROOM.z + bz - 0.2);

    const part = (geo, sx, sy, sz, px, py, pz) => {

        const o = new THREE.Mesh(geo, ghostMat);

        o.scale.set(sx, sy, sz);

        o.position.set(px, py, pz);

        boy.add(o);
    };

    part(U.sph, 0.2, 0.24, 0.2, 0.0, 1.12, 0.1);          // head

    part(U.box, 0.34, 0.5, 0.2, 0.0, 0.8, 0.0);           // body

    part(U.box, 0.12, 0.12, 0.45, -0.1, 0.55, 0.28);      // legs (sitting on the bed)

    part(U.box, 0.12, 0.12, 0.45, 0.1, 0.55, 0.28);

    part(U.box, 0.09, 0.4, 0.09, -0.24, 0.78, 0.1);       // arms

    part(U.box, 0.09, 0.4, 0.09, 0.24, 0.78, 0.1);

    boy.visible = false;

    boy.rotation.y = Math.PI / 2;

    scene.add(boy);

    // the letter, lying on the shirt once you put it there
    const letterMesh = new THREE.Mesh(U.box, new THREE.MeshBasicMaterial({ color: 0xf0e8cc }));

    letterMesh.scale.set(0.22, 0.012, 0.3);

    letterMesh.position.set(ROOM.x + bx, ROOM.y + 0.68, ROOM.z + bz + 0.78);

    letterMesh.rotation.y = 0.3;

    letterMesh.visible = false;

    scene.add(letterMesh);

    // ---- the bed: put the letter here ----
    // (its prompt shows whenever you stand near the bed - you do not have to aim at it)
    const trig = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));

    trig.scale.set(1.8, 1.4, 2.6);

    trig.position.set(ROOM.x + bx, ROOM.y + 0.7, ROOM.z + bz);

    trig.visible = false;

    scene.add(trig);

    let done = false;

    trig.userData.always = () => {

        if (done) return false;

        const p = getPlayer();

        if (!p || p.pos.y > ROOM.y + 6 || p.pos.y < ROOM.y - 1) return false;

        return Math.hypot(p.pos.x - (ROOM.x + bx), p.pos.z - (ROOM.z + bz)) < 3.6;
    };

    trig.userData.getPrompt = () => (inventory.has("ramu_letter")
        ? "Press E - Lay Ramu's letter on his bed"
        : "Press E - Look at the bed  (Ramu's letter is not with you)");

    trig.userData.interact = () => {

        if (done) return;

        if (!inventory.has("ramu_letter")) {

            audio.puzzle("tick");

            inventory.say("A narrow bed, neatly made. Someone has been waiting here for a very long time.\nHis letter is not with you: it is sewn inside the swing seat, in the yard.", 6);

            return;
        }

        done = true;

        audio.paper();

        boy.visible = true;

        letterMesh.visible = true;

        const t0 = performance.now();

        const fadeIn = () => {

            const k = Math.min(1, (performance.now() - t0) / 1800);

            ghostMat.opacity = 0.55 * k;

            if (k < 1) requestAnimationFrame(fadeIn);
        };

        fadeIn();

        inventory.say("The letter lies on the shirt. The air in the room grows still...", 3);

        inventory.setFlag("game_finished");

        setTimeout(() => {

            try { story.ending(); }
            catch (e) { events.emit("gameover-story"); if (story.onEnd) story.onEnd(); }

        }, 2600);
    };

    interaction.add(trig);

    // ---- the way back: a plain door in the south wall of the room ----
    const exitFrame = new THREE.Mesh(U.box, darkWood);

    exitFrame.scale.set(1.0, 2.1, 0.1);

    exitFrame.position.set(ROOM.x, ROOM.y + 1.05, ROOM.z + hz - 0.04);

    scene.add(exitFrame);

    const exitTrig = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));

    exitTrig.scale.set(1.4, 2.2, 1.2);

    exitTrig.position.set(ROOM.x, ROOM.y + 1.1, ROOM.z + hz - 0.6);

    exitTrig.visible = false;

    scene.add(exitTrig);

    exitTrig.userData.getPrompt = () => (done ? "" : "Press E - Go back to the hostel");

    exitTrig.userData.interact = () => {

        if (done) return;

        events.emit("leave-room");
    };

    interaction.add(exitTrig);

    inventory.resetHooks.push(() => {

        done = false;

        boy.visible = false;

        letterMesh.visible = false;

        ghostMat.opacity = 0;
    });
}

// ======================================================
// THE SECRET DOOR in the mess hall  (hidden until the letter is found)
// ======================================================
export function addSecretDoor(R) {

    const darkWood = new THREE.MeshStandardMaterial({ color: 0x2e1f14, roughness: 1 });

    const doorWood = new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 1 });

    const black = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const glow = new THREE.MeshBasicMaterial({ color: 0x9fc0ff, transparent: true, opacity: 0.0, depthWrite: false });

    const hidden = new THREE.Group();

    hidden.position.set(DOOR.x, 0, DOOR.z);

    R.group.add(hidden);

    const box = (mat, w, h, d, x, y, z) => {

        const o = new THREE.Mesh(U.box, mat);

        o.scale.set(w, h, d);

        o.position.set(x, y, z);

        hidden.add(o);

        return o;
    };

    // frame + the black doorway (in the wall plane) + a pale light leaking out
    box(darkWood, 0.12, 2.2, 0.2, -0.56, 1.1, 0.1);

    box(darkWood, 0.12, 2.2, 0.2, 0.56, 1.1, 0.1);

    box(darkWood, 1.24, 0.12, 0.2, 0, 2.26, 0.1);

    box(black, 1.0, 2.1, 0.02, 0, 1.05, 0.02);

    box(glow, 0.9, 2.0, 0.02, 0, 1.05, 0.05);

    // the door leaf, hinged on the left, swings into the hall
    const pivot = new THREE.Group();

    pivot.position.set(-0.5, 0, 0.14);

    hidden.add(pivot);

    const leaf = new THREE.Mesh(U.box, doorWood);

    leaf.scale.set(1.0, 2.1, 0.06);

    leaf.position.set(0.5, 1.05, 0);

    pivot.add(leaf);

    const knob = new THREE.Mesh(U.sph, new THREE.MeshStandardMaterial({ color: 0x9a8a50, metalness: 0.7, roughness: 0.4 }));

    knob.scale.set(0.07, 0.07, 0.07);

    knob.position.set(0.88, 1.0, 0.06);

    pivot.add(knob);

    hidden.visible = false;

    // the trigger (added to the interaction list only while the door is there)
    const trig = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));

    trig.scale.set(1.4, 2.2, 1.2);

    trig.position.set(DOOR.x, 1.1, DOOR.z + 0.6);

    trig.visible = false;

    R.group.add(trig);

    let listed = false;

    const list = (on) => {

        const arr = R.interaction.interactableObjects;

        if (on && !listed) { R.interaction.add(trig); listed = true; }

        if (!on && listed) {

            const i = arr.indexOf(trig);

            if (i >= 0) arr.splice(i, 1);

            listed = false;
        }
    };

    let going = false;

    trig.userData.getPrompt = () => (inventory.has("ramu_letter") || inventory.flag("room_entered")
        ? "Press E - Go through the door"
        : "Press E - The hidden door (it will not open yet)");

    trig.userData.interact = () => {

        if (going) return;

        // the room opens only for the one who carries his letter
        if (!inventory.has("ramu_letter") && !inventory.flag("room_entered")) {

            audio.doorLocked();

            inventory.say("The door is cold and will not open.\nIt waits for Ramu's letter: sewn inside the swing seat, in the yard.\n(Use the rusty blade.)", 6);

            return;
        }

        going = true;

        audio.puzzle("tick");

        inventory.say("You step through the door...", 2);

        fade(1, 1000);

        setTimeout(() => {

            const p = getPlayer();

            p.pos.set(ROOM.x + 0.2, ROOM.y + 1.7, ROOM.z + 2.2);

            p.camY = p.pos.y;

            p.yaw = 0;

            p.pitch = 0;

            p.verticalVelocity = 0;

            p.grounded = true;

            p._airTop = null;

            p.fatalFall = 0;

            p.hidden = false;

            p.anim = null;

            for (const k in p.keys) p.keys[k] = false;

            p.camera.position.copy(p.pos);

            inventory.setFlag("room_entered");

            events.emit("hidden-room");

            story.refresh();

            fade(0, 1400);

            setTimeout(() => {

                audio.play("slam", { vol: 0.9, send: 0.3 });

                inventory.say("The door shuts behind you. In this room, the hostel is quiet.", 4);

                going = false;

            }, 900);

        }, 1100);
    };

    const show = (animate) => {

        hidden.visible = true;

        list(true);

        if (animate) {

            tween(pivot, "rotation.y", 1.25, 1800);

            const t0 = performance.now();

            const f = () => {

                const k = Math.min(1, (performance.now() - t0) / 1800);

                glow.opacity = 0.35 * k;

                if (k < 1) requestAnimationFrame(f);
            };

            f();
        }
        else {

            pivot.rotation.y = 1.25;

            glow.opacity = 0.35;
        }
    };

    const sync = () => {

        going = false;

        // (once it has appeared it stays: Continue must never lock you out of the ending)
        const all = [...L1, ...L2].every((id) => story.solved(id));

        if (inventory.flag("door_revealed") || all) show(false);
        else {

            hidden.visible = false;

            list(false);

            pivot.rotation.y = 0;

            glow.opacity = 0;
        }
    };

    // back out of Ramu's room into the mess hall
    events.on("leave-room", () => {

        if (going) return;

        going = true;

        fade(1, 800);

        setTimeout(() => {

            const p = getPlayer();

            p.pos.set(DOOR.x, 1.7, DOOR.z + 1.4);

            p.camY = p.pos.y;

            p.yaw = Math.PI;

            p.pitch = 0;

            p.verticalVelocity = 0;

            p.grounded = true;

            p._airTop = null;

            p.fatalFall = 0;

            for (const k in p.keys) p.keys[k] = false;

            p.camera.position.copy(p.pos);

            events.emit("hostel-again");

            fade(0, 1000);

            setTimeout(() => { going = false; }, 600);

        }, 900);
    });

    // the story says: the door appears now
    events.on("reveal-door", () => {

        inventory.setFlag("door_revealed");

        audio.play("slam", { vol: 1.0, send: 0.3 });

        audio.puzzle("thunk");

        audio.play("creak_3", { vol: 0.9, send: 0.3, t: 0.8 });

        show(true);
    });

    inventory.resetHooks.push(sync);

    sync();

    // help for testing (browser console, F12):
    //   hhReveal()  - make the secret door appear now (as if the letter was found)
    //   hhRoom()    - go through the door straight away
    if (typeof window !== "undefined") {

        window.hhReveal = () => { events.emit("reveal-door"); return "the secret door is there now (mess hall, north wall, opposite the bookcase)"; };

        window.hhRoom = () => { events.emit("reveal-door"); trig.userData.interact(); return "going to Ramu's room..."; };
    }
}
