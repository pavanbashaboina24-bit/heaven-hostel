import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

// ======================================================
// HOSTEL TRUNKS  -  every room has one at the foot of the wall.
//
// Instead of a plain black box each trunk is a painted tin trunk like the ones
// students carry to a hostel: bright paint (blue, green, red, orange ...), metal
// straps and rivets, a stencilled name and number, scuffs and rust, and stickers
// of hero-fan / movie-fan POSTERS (assets/posters/p01.jpg ... p12.jpg).
//
//   Want your own pictures?  Put JPG files into  frontend/assets/posters/  and name them
//   p01.jpg ... p12.jpg (they are used in turns).  Any size works.
// ======================================================

const POSTER_DIR = "./assets/posters/";

const POSTER_COUNT = 12;

const PAINT = [
    "#1f4e8c", "#2f6b3a", "#9a2a1f", "#c27a1c", "#5b2a7a", "#3a4a58", "#0f6b6b", "#a8932a",
    "#7a1f4a", "#2a5a2a", "#b5532a", "#2a3f8a"
];

const NAMES = ["R. KUMAR", "S. REDDY", "A. RAO", "P. VARMA", "K. NAIDU", "M. SHARMA", "V. KRISHNA", "T. BABU", "N. SAI", "H. RAJU", "D. CHARAN", "B. TEJA"];

// ---- the poster pictures (loaded once, the trunks repaint themselves when they arrive)
const posters = [];

const waiting = new Set();

let repaintTimer = 0;

function loadPosters() {

    if (posters.length) return;

    for (let i = 1; i <= POSTER_COUNT; i++) {

        const img = new Image();

        const rec = { img, ok: false };

        img.onload = () => {

            rec.ok = true;

            // repaint every trunk once, after the last picture has arrived
            clearTimeout(repaintTimer);

            repaintTimer = setTimeout(() => waiting.forEach((fn) => fn()), 300);
        };

        img.onerror = () => { rec.ok = false; };

        img.src = POSTER_DIR + "p" + String(i).padStart(2, "0") + ".jpg";

        posters.push(rec);
    }
}

// small random generator so the same trunk always looks the same
function rng(seed) {

    let s = seed * 2654435761 >>> 0;

    return () => {

        s = (s + 0x6D2B79F5) >>> 0;

        let t = s;

        t = Math.imul(t ^ (t >>> 15), t | 1);

        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function shade(hex, f) {

    const n = parseInt(hex.slice(1), 16);

    const r = Math.max(0, Math.min(255, ((n >> 16) & 255) * f)) | 0;

    const g = Math.max(0, Math.min(255, ((n >> 8) & 255) * f)) | 0;

    const b = Math.max(0, Math.min(255, (n & 255) * f)) | 0;

    return "rgb(" + r + "," + g + "," + b + ")";
}

function sticker(g, rec, x, y, w, h, rot, r) {

    g.save();

    g.translate(x + w / 2, y + h / 2);

    g.rotate(rot);

    // white paper border + soft shadow
    g.shadowColor = "rgba(0,0,0,.45)";

    g.shadowBlur = 8;

    g.fillStyle = "#f2efe6";

    g.fillRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10);

    g.shadowBlur = 0;

    if (rec && rec.ok) {

        g.drawImage(rec.img, -w / 2, -h / 2, w, h);
    }
    else {

        // until the picture arrives: a colourful block
        const grad = g.createLinearGradient(0, -h / 2, 0, h / 2);

        grad.addColorStop(0, "#e8c040");

        grad.addColorStop(1, "#b02030");

        g.fillStyle = grad;

        g.fillRect(-w / 2, -h / 2, w, h);
    }

    // a bit of sun-fade and a torn corner
    g.fillStyle = "rgba(255,255,255,.07)";

    g.fillRect(-w / 2, -h / 2, w, h);

    g.fillStyle = "rgba(0,0,0,.25)";

    g.beginPath();

    g.moveTo(w / 2, h / 2 - 16 - r() * 8);

    g.lineTo(w / 2, h / 2);

    g.lineTo(w / 2 - 16 - r() * 8, h / 2);

    g.closePath();

    g.fill();

    // a strip of clear tape
    g.fillStyle = "rgba(235,225,180,.55)";

    g.fillRect(-12, -h / 2 - 10, 26, 14);

    g.restore();
}

// one painted face of the trunk
function paintFace(canvas, kind, v) {

    const g = canvas.getContext("2d");

    const W = canvas.width, H = canvas.height;

    const r = rng(v.seed * 10 + kind.length * 7 + 3);

    // paint
    g.fillStyle = v.paint;

    g.fillRect(0, 0, W, H);

    // brushed-metal streaks and speckle
    for (let i = 0; i < 140; i++) {

        g.fillStyle = "rgba(" + (r() < 0.5 ? "255,255,255" : "0,0,0") + "," + (0.03 + r() * 0.06).toFixed(3) + ")";

        g.fillRect(r() * W, r() * H, 20 + r() * 120, 1 + r() * 2);
    }

    // darker edge
    const edge = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.75);

    edge.addColorStop(0, "rgba(0,0,0,0)");

    edge.addColorStop(1, "rgba(0,0,0,.38)");

    g.fillStyle = edge;

    g.fillRect(0, 0, W, H);

    // metal straps, rivets
    const strap = (x, y, w, h) => {

        g.fillStyle = "#23262a";

        g.fillRect(x, y, w, h);

        g.fillStyle = "rgba(255,255,255,.16)";

        g.fillRect(x, y, w, 3);

        g.fillStyle = "#9aa0a6";

        const n = Math.max(2, Math.floor((w > h ? w : h) / 54));

        for (let i = 0; i < n; i++) {

            const px = w > h ? x + 20 + i * ((w - 40) / Math.max(1, n - 1)) : x + w / 2;

            const py = w > h ? y + h / 2 : y + 20 + i * ((h - 40) / Math.max(1, n - 1));

            g.beginPath(); g.arc(px, py, 4, 0, Math.PI * 2); g.fill();
        }
    };

    if (kind === "top") {

        strap(0, 18, W, 24);

        strap(0, H - 42, W, 24);

        strap(W / 2 - 12, 0, 24, H);
    }
    else {

        strap(0, 10, W, 20);

        strap(0, H - 30, W, 20);

        strap(24, 0, 20, H);

        strap(W - 44, 0, 20, H);
    }

    // stickers (hero fans, movie fans) - the pictures
    const placed = [];

    const stickers = kind === "top" ? 3 : kind === "front" ? 2 : 2;

    for (let i = 0; i < stickers; i++) {

        const rec = posters[(v.seed * 3 + i * 5 + kind.length) % POSTER_COUNT];

        const sw = kind === "top" ? W * (0.36 + r() * 0.08) : W * (0.2 + r() * 0.08);

        const sh = sw * 1.42;

        const x = kind === "top" ? 24 + (i * (W - 60 - sw) / 2) + r() * 12 : 60 + (i * (W - 140 - sw) / Math.max(1, stickers - 1)) * (r() * 0.4 + 0.8);

        const y = kind === "top" ? 70 + r() * (H - sh - 140) : 36 + r() * Math.max(2, H - sh - 80);

        sticker(g, rec, x, Math.max(26, Math.min(H - sh - 26, y)), sw, Math.min(sh, H - 60), (r() - 0.5) * 0.35, r);

        placed.push(i);
    }

    // stencil: the student's name and room number, painted in white
    if (kind !== "top") {

        g.save();

        g.fillStyle = "rgba(245,245,235,.92)";

        g.font = "bold " + Math.floor(H * 0.18) + "px Impact, Haettenschweiler, 'Arial Black', sans-serif";

        g.textBaseline = "middle";

        const label = v.name;

        const tw = g.measureText(label).width;

        g.fillText(label, Math.max(60, W - tw - 70), H * 0.5);

        g.font = "bold " + Math.floor(H * 0.1) + "px Impact, 'Arial Black', sans-serif";

        g.fillText("ROOM " + v.room, Math.max(60, W - 230), H * 0.78);

        g.restore();
    }

    // a heart or a cricket bat doodle on the lid
    if (kind === "top") {

        g.fillStyle = "rgba(255,255,255,.85)";

        g.font = "bold " + Math.floor(H * 0.07) + "px 'Comic Sans MS', 'Trebuchet MS', sans-serif";

        g.fillText(v.tag, 36, H - 52);
    }

    // scuffs, rust and scratches
    for (let i = 0; i < 26; i++) {

        g.fillStyle = "rgba(120,60,20," + (0.08 + r() * 0.18).toFixed(2) + ")";

        g.beginPath(); g.ellipse(r() * W, r() * H, 3 + r() * 14, 2 + r() * 8, r() * 3, 0, Math.PI * 2); g.fill();
    }

    g.strokeStyle = "rgba(255,255,255,.22)";

    for (let i = 0; i < 18; i++) {

        g.lineWidth = 1;

        g.beginPath(); const x = r() * W, y = r() * H; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 70, y + (r() - 0.5) * 40); g.stroke();
    }
}

const TAGS = ["HERO FAN", "MOVIE LOVER", "FIRST DAY FIRST SHOW", "MASS FAN CLUB", "SUPERHERO ZONE", "CRICKET FEVER", "FILM BUFF", "DON'T TOUCH!"];

const cache = new Map();

// the six faces of a trunk (BoxGeometry order: +x -x +y -y +z -z)
export function trunkMaterials(room, floor) {

    loadPosters();

    const seed = (floor * 13 + room * 7) % 97;

    if (cache.has(seed)) return cache.get(seed);

    const v = {
        seed,
        paint: PAINT[seed % PAINT.length],
        name: NAMES[(seed * 5 + 1) % NAMES.length],
        room: String(floor * 100 + room),
        tag: TAGS[seed % TAGS.length]
    };

    const faces = [
        ["side", 448, 224], ["side", 448, 224],
        ["top", 288, 448], ["bottom", 128, 128],
        ["front", 288, 224], ["front", 288, 224]
    ];

    const mats = faces.map(([kind, w, h], i) => {

        const canvas = document.createElement("canvas");

        canvas.width = w;

        canvas.height = h;

        const tex = new THREE.CanvasTexture(canvas);

        tex.colorSpace = THREE.SRGBColorSpace;

        tex.anisotropy = 4;

        const redraw = () => { paintFace(canvas, kind === "bottom" ? "front" : kind, { ...v, seed: v.seed + i }); tex.needsUpdate = true; };

        redraw();

        waiting.add(redraw);

        return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, metalness: 0.25 });
    });

    cache.set(seed, mats);

    return mats;
}
