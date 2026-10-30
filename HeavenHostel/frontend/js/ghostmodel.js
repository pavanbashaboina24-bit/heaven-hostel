import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

// ======================================================
// THE GHOST - 3D MODEL, MATERIALS, ANIMATION AND ROPE
//
// A 20 year old boy who died in the hostel.  Built from code
// (no model files are needed), with hand-painted textures:
//
//   - tall, thin, slightly wrong proportions (~2 m)
//   - deformed head: sunken eye sockets, hollow cheeks, brow,
//     long jaw, huge crooked mouth with broken teeth,
//     bloodshot eyes that move on their own
//   - messy black hair with a fringe over the forehead
//   - torn maroon shirt, charcoal trousers, mud + blood
//   - long dirty fingers (3 joints each) that twitch and grab
//   - a thick twisted rope: a small verlet simulation so it
//     really hangs, drags on the floor and pulls tight
//
// If you ever want a real model: put a GLB in assets/models/
// and load it in ghosts.js instead of calling createGhostModel().
// ======================================================

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// the real model (see the end of createGhostModel)
const GLB_URL = new URL("../assets/models/scary_ghost.glb", import.meta.url).href;
const GLB_SCALE = 1.06;       // 1.915 m model -> about 2.03 m ghost

async function loadGhostGLB() {
    const mod = await import("./vendor/GLTFLoader.js");
    return await new mod.GLTFLoader().loadAsync(GLB_URL);
}

let seed = 777;
const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
};

function cv(w, h, draw, srgb) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d");
    draw(g, w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
}

function noise(g, w, h, n, a, dark) {
    for (let i = 0; i < n; i++) {
        const v = dark ? 0 : 255;
        g.fillStyle = "rgba(" + v + "," + v + "," + v + "," + (rnd() * a) + ")";
        g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3);
    }
}

function blood(g, x, y, r, a) {
    for (let i = 0; i < 7; i++) {
        g.fillStyle = "rgba(" + (70 + rnd() * 40) + ",6,6," + (a * (0.5 + rnd() * 0.5)) + ")";
        g.beginPath();
        g.arc(x + (rnd() - 0.5) * r, y + (rnd() - 0.5) * r, r * (0.25 + rnd() * 0.55), 0, TAU);
        g.fill();
    }
}

function drip(g, x, y, len, w, a) {
    const grad = g.createLinearGradient(0, y, 0, y + len);
    grad.addColorStop(0, "rgba(78,5,5," + a + ")");
    grad.addColorStop(1, "rgba(50,3,3," + (a * 0.8) + ")");
    g.fillStyle = grad;
    g.fillRect(x - w / 2, y, w, len);
    g.beginPath();
    g.arc(x, y + len, w * 0.85, 0, TAU);
    g.fill();
}

// ------------------------------------------------------
// TEXTURES  (made once, shared)
// ------------------------------------------------------
let TEX = null;

function makeTextures() {

    if (TEX) return TEX;

    const t = {};

    // ----- face (planar projection: u = x, v = y of the head) -----
    t.face = cv(512, 512, (g, w, h) => {

        // pale grey-green dead skin, darker toward the edges
        const base = g.createRadialGradient(w / 2, h * 0.5, 40, w / 2, h * 0.5, w * 0.62);
        base.addColorStop(0, "#a3a69b");
        base.addColorStop(0.6, "#8c8f84");
        base.addColorStop(1, "#5d6058");
        g.fillStyle = base;
        g.fillRect(0, 0, w, h);

        noise(g, w, h, 5000, 0.07, true);
        noise(g, w, h, 2500, 0.05, false);

        // blue-grey veins
        g.lineWidth = 1;
        for (let i = 0; i < 38; i++) {
            g.strokeStyle = "rgba(60,76,90," + (0.12 + rnd() * 0.18) + ")";
            let x = rnd() * w, y = rnd() * h;
            g.beginPath();
            g.moveTo(x, y);
            for (let k = 0; k < 7; k++) {
                x += (rnd() - 0.5) * 36;
                y += (rnd() - 0.2) * 30;
                g.lineTo(x, y);
            }
            g.stroke();
        }

        // eye positions in the texture (u = 0.5 +- 0.16, v = 0.56)
        const ex = [w * 0.34, w * 0.66];
        const ey = h * (1 - 0.565);

        // huge dark sockets (the left one is bigger)
        for (let i = 0; i < 2; i++) {
            const rx = i === 0 ? 62 : 54;
            const ry = i === 0 ? 50 : 44;
            const sg = g.createRadialGradient(ex[i], ey, 6, ex[i], ey, rx * 1.35);
            sg.addColorStop(0, "rgba(8,4,6,0.98)");
            sg.addColorStop(0.55, "rgba(22,12,16,0.85)");
            sg.addColorStop(1, "rgba(30,20,24,0)");
            g.fillStyle = sg;
            g.beginPath();
            g.ellipse(ex[i], ey, rx * 1.3, ry * 1.25, i ? 0.15 : -0.2, 0, TAU);
            g.fill();
        }

        // heavy brow shadow + a forehead gash
        g.strokeStyle = "rgba(20,12,12,0.55)";
        g.lineWidth = 7;
        g.beginPath();
        g.moveTo(w * 0.2, h * 0.38);
        g.quadraticCurveTo(w * 0.5, h * 0.33, w * 0.82, h * 0.4);
        g.stroke();

        g.strokeStyle = "rgba(70,12,10,0.9)";
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(w * 0.55, h * 0.12);
        g.lineTo(w * 0.62, h * 0.2);
        g.lineTo(w * 0.58, h * 0.27);
        g.stroke();
        blood(g, w * 0.6, h * 0.2, 22, 0.75);
        drip(g, w * 0.6, h * 0.24, 70, 5, 0.8);

        // old dried blood from the left eye down the cheek
        drip(g, ex[0] - 8, ey + 38, 120, 9, 0.55);
        drip(g, ex[0] + 12, ey + 40, 80, 6, 0.5);
        // fresh blood from the right eye
        drip(g, ex[1] + 4, ey + 36, 150, 7, 0.9);

        // scratches on the right cheek
        g.strokeStyle = "rgba(96,22,18,0.8)";
        g.lineWidth = 2.5;
        for (let i = 0; i < 4; i++) {
            g.beginPath();
            g.moveTo(w * 0.72 + i * 9, h * 0.58);
            g.lineTo(w * 0.78 + i * 10, h * 0.78);
            g.stroke();
        }

        // nose holes and the lines beside the nose
        g.fillStyle = "rgba(10,4,4,0.85)";
        g.beginPath(); g.ellipse(w * 0.465, h * 0.585, 9, 15, 0.2, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(w * 0.535, h * 0.585, 9, 15, -0.2, 0, TAU); g.fill();
        g.strokeStyle = "rgba(20,14,14,0.4)";
        g.lineWidth = 3;
        g.beginPath(); g.moveTo(w * 0.42, h * 0.6); g.quadraticCurveTo(w * 0.36, h * 0.7, w * 0.33, h * 0.77); g.stroke();
        g.beginPath(); g.moveTo(w * 0.58, h * 0.6); g.quadraticCurveTo(w * 0.64, h * 0.7, w * 0.67, h * 0.77); g.stroke();

        // the mouth: too wide, dark lips, grin that curls up
        const my = h * (1 - 0.30);
        g.fillStyle = "rgba(36,12,14,0.95)";
        g.beginPath();
        g.moveTo(w * 0.24, my - 12);
        g.quadraticCurveTo(w * 0.5, my + 16, w * 0.76, my - 18);
        g.quadraticCurveTo(w * 0.5, my + 52, w * 0.24, my - 12);
        g.fill();
        // cracked lips
        g.strokeStyle = "rgba(15,6,8,0.9)";
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(w * 0.24, my - 12);
        g.quadraticCurveTo(w * 0.5, my + 16, w * 0.76, my - 18);
        g.stroke();
        blood(g, w * 0.5, my + 20, 30, 0.7);
        drip(g, w * 0.36, my + 24, 90, 8, 0.85);
        drip(g, w * 0.62, my + 26, 130, 10, 0.9);
        drip(g, w * 0.7, my + 16, 60, 5, 0.7);

        // chin bruise and stubble
        g.fillStyle = "rgba(52,34,50,0.35)";
        g.beginPath(); g.ellipse(w * 0.5, h * 0.88, 60, 34, 0, 0, TAU); g.fill();
        noise(g, w, h, 1800, 0.18, true);
    });

    // ----- generic dirty skin for neck / hands / arms -----
    t.skin = cv(256, 256, (g, w, h) => {
        g.fillStyle = "#8f9288";
        g.fillRect(0, 0, w, h);
        noise(g, w, h, 2400, 0.1, true);
        g.strokeStyle = "rgba(58,74,88,0.2)";
        for (let i = 0; i < 20; i++) {
            let x = rnd() * w, y = rnd() * h;
            g.beginPath(); g.moveTo(x, y);
            for (let k = 0; k < 5; k++) { x += (rnd() - 0.5) * 24; y += (rnd() - 0.5) * 24; g.lineTo(x, y); }
            g.stroke();
        }
        // dirt + blood
        for (let i = 0; i < 12; i++) {
            g.fillStyle = "rgba(40,30,22," + (0.1 + rnd() * 0.25) + ")";
            g.beginPath(); g.arc(rnd() * w, rnd() * h, 6 + rnd() * 18, 0, TAU); g.fill();
        }
        for (let i = 0; i < 6; i++) blood(g, rnd() * w, rnd() * h, 14 + rnd() * 16, 0.8);
    });

    // ----- shirt: faded maroon, wrinkled, stained, torn -----
    t.shirt = cv(512, 512, (g, w, h) => {
        const grad = g.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "#5a1b1d");
        grad.addColorStop(1, "#431314");
        g.fillStyle = grad;
        g.fillRect(0, 0, w, h);
        noise(g, w, h, 9000, 0.1, true);
        noise(g, w, h, 5000, 0.06, false);
        // wrinkles
        for (let i = 0; i < 60; i++) {
            const x = rnd() * w;
            g.strokeStyle = "rgba(10,2,2," + (0.12 + rnd() * 0.22) + ")";
            g.lineWidth = 1 + rnd() * 3;
            g.beginPath();
            g.moveTo(x, rnd() * h * 0.3);
            g.bezierCurveTo(x + 30, h * 0.35, x - 30, h * 0.7, x + (rnd() - 0.5) * 50, h);
            g.stroke();
        }
        // faded patches
        for (let i = 0; i < 14; i++) {
            g.fillStyle = "rgba(120,80,70," + (0.05 + rnd() * 0.1) + ")";
            g.beginPath(); g.arc(rnd() * w, rnd() * h, 20 + rnd() * 60, 0, TAU); g.fill();
        }
        // mud
        for (let i = 0; i < 16; i++) {
            g.fillStyle = "rgba(38,28,18," + (0.18 + rnd() * 0.3) + ")";
            g.beginPath(); g.ellipse(rnd() * w, h * (0.5 + rnd() * 0.5), 10 + rnd() * 40, 8 + rnd() * 24, rnd(), 0, TAU); g.fill();
        }
        // dried + fresh blood
        for (let i = 0; i < 9; i++) blood(g, rnd() * w, rnd() * h, 30 + rnd() * 50, 0.7);
        for (let i = 0; i < 6; i++) drip(g, rnd() * w, h * 0.3 + rnd() * h * 0.3, 60 + rnd() * 150, 6 + rnd() * 8, 0.8);
        // a dark ring of blood round the collar
        g.fillStyle = "rgba(60,4,4,0.55)";
        g.fillRect(0, 0, w, 36);
        // seams
        g.strokeStyle = "rgba(0,0,0,0.35)";
        g.lineWidth = 2;
        g.setLineDash([6, 5]);
        g.beginPath(); g.moveTo(w * 0.5, 0); g.lineTo(w * 0.5, h); g.stroke();
        g.setLineDash([]);
    });

    // ----- trousers: worn charcoal black, mud + blood -----
    t.pants = cv(256, 512, (g, w, h) => {
        g.fillStyle = "#26272a";
        g.fillRect(0, 0, w, h);
        noise(g, w, h, 6000, 0.12, true);
        noise(g, w, h, 3000, 0.07, false);
        for (let i = 0; i < 40; i++) {
            const x = rnd() * w;
            g.strokeStyle = "rgba(0,0,0," + (0.15 + rnd() * 0.25) + ")";
            g.lineWidth = 1 + rnd() * 3;
            g.beginPath(); g.moveTo(x, rnd() * h); g.lineTo(x + (rnd() - 0.5) * 40, rnd() * h); g.stroke();
        }
        // knees worn out
        g.fillStyle = "rgba(70,70,74,0.28)";
        g.beginPath(); g.ellipse(w * 0.5, h * 0.5, 50, 36, 0, 0, TAU); g.fill();
        for (let i = 0; i < 22; i++) {
            g.fillStyle = "rgba(48,36,22," + (0.2 + rnd() * 0.35) + ")";
            g.beginPath(); g.ellipse(rnd() * w, h * (0.45 + rnd() * 0.55), 8 + rnd() * 34, 6 + rnd() * 22, rnd(), 0, TAU); g.fill();
        }
        for (let i = 0; i < 7; i++) blood(g, rnd() * w, rnd() * h, 24 + rnd() * 34, 0.7);
        // torn hem
        g.fillStyle = "rgba(0,0,0,0.5)";
        for (let x = 0; x < w; x += 9) g.fillRect(x, h - 8 - rnd() * 22, 9, 30);
    });

    // ----- bloodshot eyeball -----
    t.eye = cv(128, 128, (g, w, h) => {
        g.fillStyle = "#d8d0b8";
        g.fillRect(0, 0, w, h);
        g.strokeStyle = "rgba(160,20,20,0.8)";
        for (let i = 0; i < 46; i++) {
            const a = rnd() * TAU;
            g.lineWidth = 0.8 + rnd() * 1.4;
            g.beginPath();
            g.moveTo(w / 2 + Math.cos(a) * 30, h / 2 + Math.sin(a) * 30);
            g.quadraticCurveTo(
                w / 2 + Math.cos(a + 0.2) * 52, h / 2 + Math.sin(a + 0.2) * 52,
                w / 2 + Math.cos(a - 0.1) * 70, h / 2 + Math.sin(a - 0.1) * 70
            );
            g.stroke();
        }
        g.fillStyle = "rgba(120,0,0,0.25)";
        g.fillRect(0, 0, w, h);
        // small dull iris + tiny pupil: the rest of the eye is white and red
        const ig = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, 11);
        ig.addColorStop(0, "#050505");
        ig.addColorStop(0.35, "#050505");
        ig.addColorStop(0.4, "#5a544c");
        ig.addColorStop(1, "#26221e");
        g.fillStyle = ig;
        g.beginPath(); g.arc(w / 2, h / 2, 11, 0, TAU); g.fill();
        g.fillStyle = "#030303";
        g.beginPath(); g.arc(w / 2, h / 2, 3.2, 0, TAU); g.fill();
    });

    // ----- black, greasy, matted hair -----
    t.hair = cv(256, 256, (g, w, h) => {
        g.fillStyle = "#080707";
        g.fillRect(0, 0, w, h);
        for (let i = 0; i < 420; i++) {
            const x = rnd() * w;
            g.strokeStyle = "rgba(" + (30 + rnd() * 30) + "," + (26 + rnd() * 24) + "," + (24 + rnd() * 22) + "," + (0.25 + rnd() * 0.5) + ")";
            g.lineWidth = 0.6 + rnd() * 1.6;
            g.beginPath();
            g.moveTo(x, 0);
            g.bezierCurveTo(x + (rnd() - 0.5) * 18, h * 0.3, x + (rnd() - 0.5) * 18, h * 0.65, x + (rnd() - 0.5) * 22, h);
            g.stroke();
        }
        // grease and dirt
        for (let i = 0; i < 18; i++) {
            g.fillStyle = "rgba(60,52,44," + (0.05 + rnd() * 0.1) + ")";
            g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 6 + rnd() * 22, 3 + rnd() * 10, 0, 0, TAU); g.fill();
        }
    });

    // ----- thick twisted rope -----
    t.rope = cv(64, 128, (g, w, h) => {
        g.fillStyle = "#5a4a30";
        g.fillRect(0, 0, w, h);
        // twisted strands: diagonal bands
        for (let y = -w; y < h + w; y += 16) {
            g.fillStyle = "rgba(150,126,84,0.9)";
            g.beginPath();
            g.moveTo(0, y + 12); g.lineTo(w, y - 4); g.lineTo(w, y + 6); g.lineTo(0, y + 22);
            g.closePath(); g.fill();
            g.fillStyle = "rgba(30,22,12,0.7)";
            g.beginPath();
            g.moveTo(0, y + 22); g.lineTo(w, y + 6); g.lineTo(w, y + 11); g.lineTo(0, y + 27);
            g.closePath(); g.fill();
        }
        // loose fibres + dirt + dried blood
        for (let i = 0; i < 160; i++) {
            g.strokeStyle = "rgba(190,170,120," + (0.2 + rnd() * 0.4) + ")";
            g.lineWidth = 0.6;
            const x = rnd() * w, y = rnd() * h;
            g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 8, y + 3 + rnd() * 6); g.stroke();
        }
        noise(g, w, h, 700, 0.35, true);
        for (let i = 0; i < 3; i++) blood(g, rnd() * w, rnd() * h, 12, 0.7);
    });
    t.rope.wrapS = t.rope.wrapT = THREE.RepeatWrapping;

    TEX = t;

    return t;
}

// ------------------------------------------------------
// MATERIALS
// ------------------------------------------------------
let MAT = null;

function makeMaterials() {

    if (MAT) return MAT;

    const t = makeTextures();

    const std = (o) => new THREE.MeshStandardMaterial(o);

    MAT = {
        face: std({ map: t.face, color: 0x938d88, roughness: 0.86, bumpMap: t.face, bumpScale: 1.1, emissive: 0x140f0c, emissiveIntensity: 0.3 }),
        skin: std({ map: t.skin, color: 0x9d9790, roughness: 0.86, bumpMap: t.skin, bumpScale: 0.6, emissive: 0x140f0c, emissiveIntensity: 0.3 }),
        dirtyTip: std({ color: 0x4a2a22, roughness: 0.9, emissive: 0x100804, emissiveIntensity: 0.5 }),
        shirt: std({ map: t.shirt, color: 0x8c7676, roughness: 0.97, bumpMap: t.shirt, bumpScale: 1.4, side: THREE.DoubleSide, emissive: 0x160606, emissiveIntensity: 0.3 }),
        pants: std({ map: t.pants, color: 0xa0a0a0, roughness: 0.96, bumpMap: t.pants, bumpScale: 1.0, emissive: 0x08080a, emissiveIntensity: 0.35 }),
        shoe: std({ color: 0x2c2118, roughness: 0.92, emissive: 0x0c0806, emissiveIntensity: 0.5 }),
        sole: std({ color: 0x0e0e0e, roughness: 1 }),
        hair: std({ map: t.hair, bumpMap: t.hair, bumpScale: 1.5, color: 0xbbbbbb, roughness: 1, emissive: 0x030202, emissiveIntensity: 0.4 }),
        lip: std({ color: 0x2a1a1c, roughness: 0.95, emissive: 0x080404, emissiveIntensity: 0.2 }),
        eye: std({ map: t.eye, color: 0xb8aea6, roughness: 0.7, emissive: 0x180303, emissiveIntensity: 0.18 }),
        socket: new THREE.MeshBasicMaterial({ color: 0x050304 }),
        mouth: new THREE.MeshBasicMaterial({ color: 0x0a0203 }),
        teeth: std({ color: 0xb4a883, roughness: 0.6, emissive: 0x1a1608, emissiveIntensity: 0.6 }),
        teethBad: std({ color: 0x6d5f3c, roughness: 0.7, emissive: 0x100c04, emissiveIntensity: 0.5 }),
        rope: std({ map: t.rope, color: 0x8a7c68, roughness: 1, bumpMap: t.rope, bumpScale: 1.6, emissive: 0x100a04, emissiveIntensity: 0.2 }),
        shadow: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false })
    };

    return MAT;
}

// ------------------------------------------------------
// HEAD
// ------------------------------------------------------
function buildHead(M) {

    const head = new THREE.Group();

    const g = new THREE.SphereGeometry(1, 64, 48);

    const p = g.attributes.position;

    const uv = g.attributes.uv;

    const rx = 0.102, ry = 0.135, rz = 0.115;

    for (let i = 0; i < p.count; i++) {

        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);

        let X = x * rx, Y = y * ry, Z = z * rz;

        // long, narrow jaw and a forward chin
        if (Y < -0.015) {
            const k = clamp((-Y - 0.015) / (ry - 0.015), 0, 1);
            X *= 1 - 0.38 * Math.pow(k, 1.1);
            Z *= 1 - 0.3 * k;
            if (z > 0) Z += 0.012 * k;
        }

        // asymmetry (left side swollen, crooked jaw)
        if (X < 0) X *= 1.035;
        X += 0.004 * Y / ry;

        if (z > 0) {

            // eye sockets (sunken)
            for (const s of [-1, 1]) {
                const dx = (X - s * 0.04) / (s < 0 ? 0.03 : 0.026);
                const dy = (Y - 0.025) / (s < 0 ? 0.03 : 0.025);
                Z -= 0.024 * Math.exp(-(dx * dx + dy * dy) * 1.3);
                // hollow cheek under each eye
                const cx = (X - s * 0.058) / 0.03;
                const cy = (Y + 0.038) / 0.034;
                Z -= 0.014 * Math.exp(-(cx * cx + cy * cy));
            }

            // heavy brow ridge
            Z += 0.011 * Math.exp(-Math.pow((Y - 0.058) / 0.014, 2)) *
                Math.exp(-Math.pow(X / 0.09, 2));

            // nose
            Z += 0.018 * Math.exp(-(Math.pow(X / 0.014, 2) + Math.pow((Y + 0.008) / 0.03, 2)));

            // the mouth is a trench; temples sink a little
            Z -= 0.009 * Math.exp(-Math.pow((Y + 0.067) / 0.008, 2)) *
                (Math.abs(X) < 0.058 ? 1 : 0);
            Z -= 0.008 * Math.exp(-Math.pow((Math.abs(X) - 0.09) / 0.02, 2)) *
                Math.exp(-Math.pow((Y - 0.04) / 0.04, 2));
        }

        p.setXYZ(i, X, Y, Z);

        // planar projection for the painted face
        uv.setXY(i, 0.5 + X / 0.25, 0.5 + (Y - 0.0) / 0.32);
    }

    g.computeVertexNormals();

    const skull = new THREE.Mesh(g, M.face);

    head.add(skull);

    // ---------- ears ----------
    for (const s of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), M.skin);
        ear.scale.set(0.45, 1.3, 0.8);
        ear.position.set(s * 0.102, -0.005, -0.012);
        head.add(ear);
    }

    // ---------- eyes ----------
    head.userData.eyes = [];

    for (const s of [-1, 1]) {

        const socket = new THREE.Mesh(
            new THREE.SphereGeometry(0.021, 14, 10), M.socket
        );
        socket.scale.set(1.2, 1.1, 0.5);
        socket.position.set(s * 0.04, 0.025, 0.07);
        head.add(socket);

        const eye = new THREE.Group();
        eye.position.set(s * 0.04, 0.025, 0.088);

        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.0148, 18, 14), M.eye);
        ball.rotation.y = -Math.PI / 2;           // the iris faces forward (+z)
        eye.add(ball);

        head.add(eye);
        head.userData.eyes.push(eye);
    }

    // ---------- mouth: dark cavity + teeth (a few broken) ----------
    const cavity = new THREE.Mesh(new THREE.CircleGeometry(1, 20), M.mouth);
    cavity.scale.set(0.056, 0.011, 1);
    cavity.position.set(0, -0.0672, 0.0935);
    head.add(cavity);
    head.userData.cavity = cavity;

    const upper = new THREE.Group();
    const lower = new THREE.Group();

    for (let i = 0; i < 11; i++) {
        const u = (i - 5) / 5;
        const x = u * 0.054;
        const curve = Math.sin(u * 1.4) * 0;
        const bad = rnd() < 0.3;
        const th = new THREE.Mesh(
            new THREE.BoxGeometry(0.0065 + rnd() * 0.0025, 0.009 + rnd() * 0.007, 0.005),
            bad ? M.teethBad : M.teeth
        );
        th.position.set(x, -0.061 - rnd() * 0.002, 0.0975 - Math.abs(u) * 0.011 + curve);
        th.rotation.z = (rnd() - 0.5) * 0.35;
        th.rotation.y = -u * 0.5;
        upper.add(th);
        if (rnd() < 0.15) th.visible = false;   // missing tooth
    }

    for (let i = 0; i < 10; i++) {
        const u = (i - 4.5) / 5;
        const x = u * 0.05;
        const bad = rnd() < 0.4;
        const th = new THREE.Mesh(
            new THREE.BoxGeometry(0.006 + rnd() * 0.002, 0.008 + rnd() * 0.006, 0.0045),
            bad ? M.teethBad : M.teeth
        );
        th.position.set(x, -0.0745 + rnd() * 0.002, 0.0965 - Math.abs(u) * 0.011);
        th.rotation.z = (rnd() - 0.5) * 0.4;
        th.rotation.y = -u * 0.5;
        lower.add(th);
        if (rnd() < 0.2) th.visible = false;
    }

    // dark cracked lips (the lower one moves with the jaw)
    const upLip = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), M.lip);
    upLip.scale.set(0.062, 0.0062, 0.0075);
    upLip.position.set(0, -0.0545, 0.0925);
    head.add(upLip);

    const lowLip = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), M.lip);
    lowLip.scale.set(0.054, 0.007, 0.0075);
    lowLip.position.set(0, -0.0865, 0.0915);
    lower.add(lowLip);

    head.add(upper);
    head.add(lower);

    head.userData.jaw = lower;

    // ---------- hair: cap on the back of the skull + hanging strands + a fringe ----------
    const cap = new THREE.Mesh(
        new THREE.SphereGeometry(1, 40, 24, 0, TAU, 0, Math.PI * 0.5), M.hair
    );
    cap.scale.set(rx * 1.08, ry * 1.09, rz * 1.1);
    cap.position.set(0, 0.016, -0.012);
    cap.rotation.x = -0.55;                         // tilted back: forehead and eyes stay clear
    head.add(cap);

    const strandGeo = new THREE.ConeGeometry(0.0032, 0.17, 4, 1, true);
    strandGeo.translate(0, -0.085, 0);              // hangs down from its root

    const COUNT = 330;
    const strands = new THREE.InstancedMesh(strandGeo, M.hair, COUNT);

    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s3 = new THREE.Vector3();
    const v3 = new THREE.Vector3();

    let n = 0;

    while (n < COUNT) {

        if (n < 46) {
            // the fringe: short strands over the forehead, above the brows
            const x = (rnd() - 0.5) * 0.15;
            const y = 0.086 + rnd() * 0.006;
            const z = rz * Math.sqrt(Math.max(0.01, 1 - (x / rx) * (x / rx) - (y / ry) * (y / ry))) + 0.004;
            v3.set(x, y, z);
            e.set(0.25 + rnd() * 0.25, (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.5);
            s3.set(1, 0.3 + rnd() * 0.35, 1);
        }
        else {
            // back and sides: they fall to the shoulders
            const theta = 0.45 + rnd() * 0.95;
            const phi = rnd() * TAU;
            const x = Math.sin(theta) * Math.cos(phi);
            const z = Math.sin(theta) * Math.sin(phi);
            const y = Math.cos(theta);
            if (z > 0.15 && theta > 0.75) continue;           // not over the face
            v3.set(x * rx * 1.04, y * ry * 1.05 + 0.014, z * rz * 1.05 - 0.008);
            e.set(z * 0.45 + (rnd() - 0.5) * 0.25, 0, -x * 0.45 + (rnd() - 0.5) * 0.25);
            s3.set(1, 0.55 + rnd() * 0.95, 1);
        }

        q.setFromEuler(e);
        m4.compose(v3, q, s3);
        strands.setMatrixAt(n, m4);
        n++;
    }

    strands.instanceMatrix.needsUpdate = true;
    strands.frustumCulled = false;
    head.add(strands);

    return head;
}

// ------------------------------------------------------
// HAND  (palm + 4 fingers x 3 joints + thumb x 2 joints)
// ------------------------------------------------------
function buildHand(M, side) {

    const hand = new THREE.Group();

    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.09, 0.026), M.skin);
    palm.position.set(0, -0.045, 0);
    hand.add(palm);

    const fingers = [];

    // long, thin, unsettling
    const lens = [[0.052, 0.036, 0.028], [0.058, 0.04, 0.03], [0.054, 0.037, 0.029], [0.044, 0.03, 0.024]];

    for (let i = 0; i < 4; i++) {

        const x = (i - 1.5) * 0.0215;

        const root = new THREE.Group();

        root.position.set(x, -0.09, 0);

        let parent = root;

        const joints = [];

        for (let j = 0; j < 3; j++) {

            const joint = new THREE.Group();

            joint.position.y = j === 0 ? 0 : -lens[i][j - 1];

            parent.add(joint);

            const seg = new THREE.Mesh(
                new THREE.CylinderGeometry(0.0074 - j * 0.0009, 0.0085 - j * 0.0009, lens[i][j], 7),
                j === 2 ? M.dirtyTip : M.skin
            );
            seg.position.y = -lens[i][j] / 2;
            joint.add(seg);

            // the dark, broken nail
            if (j === 2) {
                const nail = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.012, 0.003), M.sole);
                nail.position.set(0, -lens[i][j] + 0.007, 0.006);
                joint.add(nail);
            }

            joints.push(joint);
            parent = joint;
        }

        hand.add(root);
        fingers.push({ root, joints });
    }

    // thumb
    const troot = new THREE.Group();
    troot.position.set(-side * 0.04, -0.03, 0.006);
    troot.rotation.z = side * 0.6;
    troot.rotation.y = -side * 0.5;
    hand.add(troot);

    const thumb = [];
    let tp = troot;
    for (let j = 0; j < 2; j++) {
        const joint = new THREE.Group();
        joint.position.y = j === 0 ? 0 : -0.04;
        tp.add(joint);
        const seg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.0085 - j * 0.001, 0.0095 - j * 0.001, 0.04, 7),
            j === 1 ? M.dirtyTip : M.skin
        );
        seg.position.y = -0.02;
        joint.add(seg);
        thumb.push(joint);
        tp = joint;
    }

    // curl: 0 = fully open and spread, 1 = tight fist
    hand.userData.curl = (c, jitter, t) => {
        for (let i = 0; i < 4; i++) {
            const k = clamp(c + Math.sin(t * 1.7 + i * 1.9) * jitter, 0, 1.1);
            const f = fingers[i];
            f.joints[0].rotation.x = -k * 1.25;
            f.joints[1].rotation.x = -k * 1.5;
            f.joints[2].rotation.x = -k * 1.0;
            f.root.rotation.z = (i - 1.5) * (1 - c) * 0.12 * (side);
        }
        const kt = clamp(c * 0.8 + Math.sin(t * 1.3) * jitter * 0.5, 0, 1);
        thumb[0].rotation.x = -kt * 0.5;
        thumb[1].rotation.x = -kt * 0.9;
    };

    hand.userData.curl(0.35, 0, 0);

    return hand;
}

// ------------------------------------------------------
// ROPE  (verlet chain drawn with one InstancedMesh)
// ------------------------------------------------------
export class Rope {

    constructor(scene, mats) {

        this.N = 20;
        this.seg = 0.1;
        this.radius = 0.021;

        this.p = [];
        this.o = [];

        for (let i = 0; i < this.N; i++) {
            this.p.push(new THREE.Vector3(0, 1, i * -this.seg));
            this.o.push(new THREE.Vector3(0, 1, i * -this.seg));
        }

        const geo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, false);

        this.mesh = new THREE.InstancedMesh(geo, mats.rope, this.N - 1);

        this.mesh.frustumCulled = false;

        scene.add(this.mesh);

        // a few coils round the hand
        this.coil = new THREE.Group();

        for (let i = 0; i < 3; i++) {
            const c = new THREE.Mesh(
                new THREE.TorusGeometry(0.052 - i * 0.004, this.radius * 0.9, 6, 16), mats.rope
            );
            c.position.set(0, -i * 0.03, 0);
            c.rotation.set(Math.PI / 2 + (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.3, 0);
            this.coil.add(c);
        }

        this.floorY = 0;
        this._m = new THREE.Matrix4();
        this._q = new THREE.Quaternion();
        this._up = new THREE.Vector3(0, 1, 0);
        this._d = new THREE.Vector3();
        this._s = new THREE.Vector3();
        this._c = new THREE.Vector3();
        this.visible = true;
    }

    setVisible(v) {
        this.visible = v;
        this.mesh.visible = v;
        this.coil.visible = v;
    }

    // put the whole rope hanging from `anchor` (used when the ghost appears)
    reset(anchor) {
        for (let i = 0; i < this.N; i++) {
            this.p[i].set(anchor.x, anchor.y - i * this.seg * 0.9, anchor.z);
            this.o[i].copy(this.p[i]);
        }
    }

    // anchor = hand (world), end = optional point the end is tied to
    // body = {x, z, r, h0, h1}: a capsule the rope must not enter
    update(dt, anchor, end, body, floorY, taut) {

        if (!this.visible) return;

        dt = Math.min(dt, 0.04);

        this.floorY = floorY;

        const N = this.N;
        const P = this.p, O = this.o;

        // integrate
        const g = -9.8 * dt * dt;

        for (let i = 1; i < N; i++) {

            const p = P[i], o = O[i];

            const vx = (p.x - o.x) * 0.985;
            const vy = (p.y - o.y) * 0.985;
            const vz = (p.z - o.z) * 0.985;

            o.copy(p);

            p.x += vx;
            p.y += vy + g;
            p.z += vz;

            // the floor: rope lies on it and drags
            if (p.y < floorY + 0.022) {
                p.y = floorY + 0.022;
                o.x = lerp(o.x, p.x, 0.4);
                o.z = lerp(o.z, p.z, 0.4);
            }
        }

        // constraints
        const len = taut ? this.seg * 1.0 : this.seg;

        for (let it = 0; it < 7; it++) {

            P[0].copy(anchor);

            if (end) P[N - 1].copy(end);

            for (let i = 0; i < N - 1; i++) {

                const a = P[i], b = P[i + 1];

                const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;

                const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;

                const diff = (d - len) / d;

                const wa = i === 0 ? 0 : 0.5;
                const wb = (i + 1 === N - 1 && end) ? 0 : (i === 0 ? 1 : 0.5);

                a.x += dx * diff * wa; a.y += dy * diff * wa; a.z += dz * diff * wa;
                b.x -= dx * diff * wb; b.y -= dy * diff * wb; b.z -= dz * diff * wb;
            }

            // keep out of the ghost's body (a vertical capsule)
            if (body) {
                for (let i = 2; i < N; i++) {
                    const p = P[i];
                    if (p.y < body.h0 || p.y > body.h1) continue;
                    const dx = p.x - body.x, dz = p.z - body.z;
                    const d2 = dx * dx + dz * dz;
                    if (d2 < body.r * body.r) {
                        const d = Math.sqrt(d2) || 1e-4;
                        p.x = body.x + dx / d * body.r;
                        p.z = body.z + dz / d * body.r;
                    }
                }
            }

            for (let i = 1; i < N; i++) {
                if (P[i].y < floorY + 0.022) P[i].y = floorY + 0.022;
            }
        }

        // draw
        for (let i = 0; i < N - 1; i++) {

            const a = P[i], b = P[i + 1];

            this._d.subVectors(b, a);

            const l = this._d.length() || 1e-4;

            this._d.multiplyScalar(1 / l);

            this._q.setFromUnitVectors(this._up, this._d);

            this._c.addVectors(a, b).multiplyScalar(0.5);

            this._s.set(this.radius, l * 1.08, this.radius);

            this._m.compose(this._c, this._q, this._s);

            this.mesh.setMatrixAt(i, this._m);
        }

        this.mesh.instanceMatrix.needsUpdate = true;
    }

    dispose(scene) {
        scene.remove(this.mesh);
        this.mesh.geometry.dispose();
    }
}

// ------------------------------------------------------
// THE GHOST
// ------------------------------------------------------
export function createGhostModel(scene) {

    const M = makeMaterials();

    const root = new THREE.Group();

    root.name = "ghost";

    const body = new THREE.Group();          // everything that bobs / leans

    root.add(body);

    // ---------- blob shadow on the floor ----------
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), M.shadow);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    shadow.renderOrder = 2;
    root.add(shadow);

    // ---------- pelvis ----------
    const pelvis = new THREE.Group();
    pelvis.position.y = 1.03;
    body.add(pelvis);

    const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.125, 0.2, 16), M.pants);
    hips.scale.z = 0.7;
    hips.position.y = 0.0;
    pelvis.add(hips);

    // ---------- spine / chest ----------
    const spine = new THREE.Group();
    spine.position.y = 0.08;
    pelvis.add(spine);

    const belly = new THREE.Mesh(new THREE.CylinderGeometry(0.128, 0.122, 0.3, 18, 1, true), M.shirt);
    belly.scale.z = 0.62;
    belly.position.y = 0.14;
    spine.add(belly);

    const chest = new THREE.Group();
    chest.position.y = 0.28;
    spine.add(chest);

    const ribs = new THREE.Mesh(new THREE.CylinderGeometry(0.158, 0.13, 0.34, 20), M.shirt);
    ribs.scale.z = 0.64;
    ribs.position.y = 0.17;
    chest.add(ribs);

    // shoulders: a yoke bridging the arms, and the slope up to the neck
    const yoke = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), M.shirt);
    yoke.scale.set(0.235, 0.06, 0.1);
    yoke.position.set(0, 0.335, 0);
    chest.add(yoke);

    const slope = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.15, 0.1, 16, 1, true), M.shirt);
    slope.scale.z = 0.62;
    slope.position.y = 0.37;
    chest.add(slope);

    // torn hem strips hanging from the shirt
    const strips = [];

    for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + 0.3;
        const strip = new THREE.Group();
        strip.position.set(Math.cos(a) * 0.12, 0.0, Math.sin(a) * 0.075);
        strip.rotation.y = -a + Math.PI / 2;
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.045 + rnd() * 0.03, 0.12 + rnd() * 0.12), M.shirt);
        cloth.position.y = -cloth.geometry.parameters.height / 2;
        strip.add(cloth);
        spine.add(strip);
        strips.push(strip);
    }

    // ---------- neck + head ----------
    const neck = new THREE.Group();
    neck.position.y = 0.36;
    chest.add(neck);

    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.042, 0.14, 14), M.skin);
    neckMesh.position.y = 0.05;
    neck.add(neckMesh);

    for (const s of [-1, 1]) {
        const tendon = new THREE.Mesh(new THREE.CapsuleGeometry(0.0055, 0.1, 4, 8), M.skin);
        tendon.position.set(s * 0.02, 0.045, 0.026);
        tendon.rotation.z = s * -0.2;
        neck.add(tendon);
    }

    const adam = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 6), M.skin);
    adam.position.set(0, 0.05, 0.036);
    adam.scale.set(0.7, 1, 0.7);
    neck.add(adam);

    const headPivot = new THREE.Group();
    headPivot.position.y = 0.11;
    neck.add(headPivot);

    const head = buildHead(M);
    head.position.set(0, 0.115, 0.012);
    headPivot.add(head);

    // ---------- arms ----------
    const arms = [];

    for (const s of [-1, 1]) {   // -1 = left, +1 = right

        const shoulder = new THREE.Group();
        shoulder.position.set(s * 0.2, 0.33, 0);
        chest.add(shoulder);

        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), M.shirt);
        shoulder.add(ball);

        const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.04, 0.4, 12), M.shirt);
        upper.position.y = -0.2;
        shoulder.add(upper);

        const elbow = new THREE.Group();
        elbow.position.y = -0.4;
        shoulder.add(elbow);

        const elbowBall = new THREE.Mesh(new THREE.SphereGeometry(0.041, 10, 8), M.shirt);
        elbow.add(elbowBall);

        // sleeve (torn off half way) + bare, bloody forearm
        const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.036, 0.16, 12, 1, true), M.shirt);
        sleeve.position.y = -0.08;
        elbow.add(sleeve);

        const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.027, 0.27, 10), M.skin);
        forearm.position.y = -0.265;
        elbow.add(forearm);

        const wrist = new THREE.Group();
        wrist.position.y = -0.41;
        elbow.add(wrist);

        const hand = buildHand(M, s);
        hand.rotation.x = 0.1;
        wrist.add(hand);

        arms.push({ shoulder, elbow, wrist, hand, side: s });
    }

    // ---------- legs ----------
    const legs = [];

    for (const s of [-1, 1]) {

        const hip = new THREE.Group();
        hip.position.set(s * 0.082, -0.04, 0);
        pelvis.add(hip);

        const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.056, 0.5, 14), M.pants);
        thigh.position.y = -0.25;
        hip.add(thigh);

        const knee = new THREE.Group();
        knee.position.y = -0.5;
        hip.add(knee);

        const kneeBall = new THREE.Mesh(new THREE.SphereGeometry(0.056, 10, 8), M.pants);
        knee.add(kneeBall);

        const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.04, 0.46, 12), M.pants);
        shin.position.y = -0.23;
        knee.add(shin);

        const ankle = new THREE.Group();
        ankle.position.y = -0.46;
        knee.add(ankle);

        // ragged shoe: scuffed, muddy, one lace undone
        const shoe = new THREE.Group();
        const upperS = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.075, 0.2), M.shoe);
        upperS.position.set(0, -0.03, 0.05);
        shoe.add(upperS);
        const toe = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 8), M.shoe);
        toe.scale.set(1, 0.75, 1.05);
        toe.position.set(0, -0.04, 0.14);
        shoe.add(toe);
        const sole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.27), M.sole);
        sole.position.set(0, -0.075, 0.07);
        shoe.add(sole);
        ankle.add(shoe);

        legs.push({ hip, knee, ankle, side: s });
    }

    // ---------- the rope ----------
    const rope = new Rope(scene, M);

    arms[1].wrist.add(rope.coil);

    rope.coil.position.set(0, -0.07, 0.01);

    // ======================================================
    // ANIMATION
    // ======================================================
    const A = {
        phase: 0,
        t: 0,
        lastSin: 0,
        glanceYaw: 0,
        glancePitch: 0,
        glanceT: 2,
        headYaw: 0,
        headPitch: 0,
        eyeYaw: 0,
        eyePitch: 0,
        lean: 0.12,
        open: 0,
        reachL: 0,
        reachR: 0,
        curlL: 0.35,
        curlR: 0.7,
        doorT: 0
    };

    const tmpV = new THREE.Vector3();
    const tmpL = new THREE.Vector3();
    const tmpQ = new THREE.Quaternion();
    const tmpQ2 = new THREE.Quaternion();
    const down = new THREE.Vector3(0, -1, 0);
    const handWorld = new THREE.Vector3();
    const rootInv = new THREE.Matrix4();

    const model = {

        root, body, rope, head, headPivot, arms, legs, pelvis, chest, strips, M,

        floorY: 0,

        onStep: null,

        // world position of the right hand's grip (where the rope hangs from)
        handPos(out) {
            const w = arms[1].wrist;
            w.updateWorldMatrix(true, false);
            out.set(0, -0.09, 0.01);
            return w.localToWorld(out);
        },

        // eyes / neck position of the ghost in world space
        eyePos(out) {
            headPivot.updateWorldMatrix(true, false);
            out.set(0, 0.13, 0.05);
            return headPivot.localToWorld(out);
        },

        // p = {
        //   speed:  m/s the ghost is really moving
        //   run:    true while chasing
        //   look:   Vector3 (world) to look at, or null
        //   open:   0..1 jaw open
        //   leftTo: Vector3 (world) the left hand reaches toward, or null
        //   rightTo:Vector3 (world) the right hand pulls toward, or null
        //   door:   0..1 reaching to a door
        //   calm:   0..1 how relaxed (idle/wander) vs hunting
        // }
        update(dt, p, ropeEnd, taut) {

            A.t += dt;

            const t = A.t;

            const speed = p.speed || 0;
            const run = !!p.run;
            const moving = speed > 0.08;

            // ---------- walking cycle ----------
            const strideLen = run ? 2.3 : 1.0;

            if (moving) A.phase += TAU * (speed / strideLen) * dt;

            const walkK = clamp(speed / (run ? 4 : 1.3), 0, 1);

            const swing = Math.sin(A.phase);

            // footsteps (when the swing passes through zero)
            if (moving && ((swing >= 0) !== (A.lastSin >= 0)) && model.onStep) {
                model.onStep(swing < 0 ? 1 : -1, run);
            }

            A.lastSin = swing;

            const amp = (run ? 0.78 : 0.34) * walkK;

            const legSwing = [-swing * amp, swing * amp];

            for (let i = 0; i < 2; i++) {

                const L = legs[i];

                L.hip.rotation.x = legSwing[i] + (moving ? 0 : 0);
                L.hip.rotation.z = L.side * 0.02;

                const fwd = i === 0 ? swing : -swing;

                // the knee bends while the leg swings forward
                const flex = Math.max(0, Math.sin(A.phase * (i === 0 ? 1 : 1) + (i === 0 ? 1.1 : 1.1 + Math.PI)));

                L.knee.rotation.x = (moving ? (0.12 + flex * (run ? 1.25 : 0.55)) * walkK : 0.04);

                L.ankle.rotation.x = -(L.hip.rotation.x + L.knee.rotation.x) * 0.55;
            }

            // ---------- body: heavy hunch, bob, sway ----------
            const hunch = lerp(0.16, run ? 0.42 : 0.2, p.calm === undefined ? 0 : 1 - p.calm);

            A.lean = lerp(A.lean, hunch, Math.min(1, dt * 4));

            pelvis.position.y = 1.03 + Math.abs(Math.cos(A.phase)) * 0.025 * walkK
                + (run ? -0.05 : 0) - Math.sin(t * 1.6) * 0.003;

            pelvis.rotation.z = Math.sin(A.phase) * 0.045 * walkK;
            pelvis.rotation.y = -swing * 0.1 * walkK;

            spine.rotation.x = A.lean * 0.55;
            chest.rotation.x = A.lean * 0.45;
            chest.rotation.y = swing * 0.14 * walkK;
            chest.rotation.z = -Math.sin(A.phase) * 0.04 * walkK + Math.sin(t * 0.7) * 0.012;

            // breathing
            const breathRate = run ? 5.2 : 1.5;
            const breath = Math.sin(t * breathRate);
            chest.scale.set(1 + breath * 0.012, 1 + breath * 0.018, 1 + breath * 0.012);

            for (let i = 0; i < strips.length; i++) {
                strips[i].rotation.x = Math.sin(t * 2.4 + i * 1.7) * 0.1 + walkK * 0.3 * (run ? 1.6 : 0.8);
            }

            // ---------- arms ----------
            const calm = p.calm === undefined ? 1 : p.calm;

            for (let i = 0; i < 2; i++) {

                const arm = arms[i];

                const isRight = i === 1;

                const target = isRight ? p.rightTo : p.leftTo;

                let reach = isRight ? A.reachR : A.reachL;

                reach = lerp(reach, target ? 1 : 0, Math.min(1, dt * 7));

                if (isRight) A.reachR = reach; else A.reachL = reach;

                // ----- the natural pose -----
                const armSwing = Math.sin(A.phase + (isRight ? 0 : Math.PI)) * (run ? 0.7 : 0.3) * walkK;

                let sx, sz, ex;

                if (run) {
                    // hunting: the left arm claws forward, the rope arm pumps behind
                    sx = isRight ? -0.25 + armSwing : -1.25 + armSwing * 0.3;
                    sz = arm.side * (isRight ? 0.12 : 0.1);
                    ex = isRight ? -0.6 : -0.45;
                }
                else {
                    // dead arms hanging a little forward, fingers twitching
                    sx = (isRight ? -0.2 : 0.05) + armSwing + Math.sin(t * 0.6 + i) * 0.03;
                    sz = arm.side * 0.1;
                    ex = -0.15 - Math.sin(t * 0.9 + i) * 0.04;
                }

                arm.shoulder.rotation.x = lerp(arm.shoulder.rotation.x, sx, Math.min(1, dt * 8));
                arm.shoulder.rotation.z = lerp(arm.shoulder.rotation.z, sz, Math.min(1, dt * 8));
                arm.elbow.rotation.x = lerp(arm.elbow.rotation.x, ex, Math.min(1, dt * 8));

                // ----- reaching (grab, door, pulling the rope) -----
                if (reach > 0.01 && target) {

                    // direction from the shoulder to the target, in the chest frame
                    tmpV.copy(target);
                    chest.worldToLocal(tmpV);
                    tmpV.sub(arm.shoulder.position).normalize();

                    tmpQ.setFromUnitVectors(down, tmpV);

                    tmpQ2.setFromEuler(arm.shoulder.rotation);

                    tmpQ2.slerp(tmpQ, clamp(reach, 0, 1));

                    arm.shoulder.quaternion.copy(tmpQ2);

                    arm.elbow.rotation.x = lerp(arm.elbow.rotation.x, -0.25, reach);
                }

                // ----- hands -----
                const curl = isRight
                    ? lerp(0.78, 0.9, reach)
                    : (target ? lerp(0.3, 0.05, reach) : 0.32 + Math.sin(t * 0.8) * 0.06);

                arm.hand.userData.curl(curl, (calm > 0.5 ? 0.1 : 0.04), t + i * 3);
            }

            // ---------- head: looks where it is told + glances ----------
            A.glanceT -= dt;

            if (A.glanceT <= 0) {
                A.glanceT = 1.5 + rnd() * 3.5;
                A.glanceYaw = (rnd() - 0.5) * 1.5 * calm;
                A.glancePitch = (rnd() - 0.5) * 0.5 * calm;
            }

            let wantYaw = A.glanceYaw + Math.sin(t * 0.37) * 0.08;
            let wantPitch = A.glancePitch + 0.12 + Math.sin(t * 0.5) * 0.04;

            if (p.look) {

                tmpL.copy(p.look);

                headPivot.parent.worldToLocal(tmpL);

                tmpL.sub(headPivot.position);

                const yaw = Math.atan2(tmpL.x, tmpL.z);
                const pit = -Math.atan2(tmpL.y, Math.hypot(tmpL.x, tmpL.z));

                wantYaw = clamp(yaw, -1.2, 1.2);
                wantPitch = clamp(pit, -0.5, 0.6);
            }

            const hk = p.look ? Math.min(1, dt * 7) : Math.min(1, dt * 2.2);

            A.headYaw = lerp(A.headYaw, wantYaw, hk);
            A.headPitch = lerp(A.headPitch, wantPitch, hk);

            headPivot.rotation.set(A.headPitch - A.lean * 0.6, A.headYaw, Math.sin(t * 0.4) * 0.05 + 0.06, "YXZ");

            // eyes: they drift on their own, then snap to the target
            const ey = (p.look ? 0 : Math.sin(t * 1.3) * 0.3) + Math.sin(t * 7.1) * 0.015;
            const ep = Math.sin(t * 0.9 + 1) * 0.1;

            A.eyeYaw = lerp(A.eyeYaw, ey, Math.min(1, dt * 6));
            A.eyePitch = lerp(A.eyePitch, ep, Math.min(1, dt * 6));

            for (let i = 0; i < 2; i++) {
                const eye = head.userData.eyes[i];
                // the eyes do not quite agree with each other
                eye.rotation.set(A.eyePitch + (i ? 0.03 : -0.02), A.eyeYaw + (i ? 0.05 : -0.04), 0);
            }

            // jaw hangs open a little, wide when hunting
            const wantOpen = p.open !== undefined ? p.open : 0.12 + (Math.sin(t * 0.7) * 0.5 + 0.5) * 0.1;

            A.open = lerp(A.open, wantOpen, Math.min(1, dt * 6));

            head.userData.jaw.position.y = -A.open * 0.03;

            head.userData.cavity.scale.y = 0.012 + A.open * 0.026;
            head.userData.cavity.position.y = -0.0675 - A.open * 0.012;

            // ---------- rope ----------
            root.updateMatrixWorld(true);

            model.handPos(handWorld);

            const wx = root.position.x, wz = root.position.z;

            rope.update(
                dt,
                handWorld,
                ropeEnd || null,
                { x: wx, z: wz, r: 0.2, h0: model.floorY + 0.1, h1: model.floorY + 1.9 },
                model.floorY,
                !!taut
            );
        },

        // hide / show everything that belongs to the ghost
        setVisible(v) {
            root.visible = v;
            rope.setVisible(v);
        },

        // brightness of the whole figure (0..1) for fading in / out
        setFade(v) {
            // opacity on shared materials would affect every user, so we scale instead
            // (fades by shrinking into the floor / being shown or hidden)
            model._fade = v;
        },

        dispose() {
            rope.dispose(scene);
        }
    };


    // ======================================================
    // REAL 3D MODEL: assets/models/scary_ghost.glb
    // The procedural rig above keeps doing ALL the animation (walk, run, reach,
    // door grab, look-at, jaw, finger curl).  Every frame its joint rotations are
    // copied onto the bones of the GLB, so the new body moves exactly like the old
    // one and nothing in ghosts.js has to change.  If the GLB (or the loader) can't
    // be loaded the old built-in body simply stays visible.
    // ======================================================
    const baseUpdate = model.update;
    const baseHandPos = model.handPos;
    let glb = null;

    loadGhostGLB().then((gltf) => {
        try { glb = setupGLB(gltf); }
        catch (e) { console.warn("ghost model: could not use the GLB, keeping the built-in body", e); }
    }).catch((e) => console.warn("ghost model: GLB not loaded, keeping the built-in body", e));

    function underNode(o, top) {
        while (o) { if (o === top) return true; o = o.parent; }
        return false;
    }

    function setupGLB(gltf) {
        const g = gltf.scene;
        const bones = {};
        const order = [];
        g.traverse((o) => {
            if (o.isBone) { bones[o.name] = o; order.push(o); }
            if (o.isMesh || o.isSkinnedMesh) { o.frustumCulled = false; }
        });
        g.scale.setScalar(GLB_SCALE);
        root.add(g);

        // hide the old procedural body (but keep the rope coil in the hand)
        body.traverse((o) => { if (o.isMesh && !underNode(o, rope.coil)) o.visible = false; });

        // rest data
        const rest = new Map();
        for (const b of order) rest.set(b, { q: b.quaternion.clone(), p: b.position.clone(), wq: new THREE.Quaternion() });
        for (const b of order) {
            const r = rest.get(b);
            r.wq.copy(r.q);
            if (b.parent && rest.has(b.parent)) r.wq.premultiply(rest.get(b.parent).wq);
        }
        const hips = bones["Hips_01"];

        // right-hand side of the old rig (arms[1], legs[1]) is the +x side = "Left" bones of the GLB
        const src = {
            Hips_01: () => pelvis,
            Spine_02: () => spine,
            Spine2_04: () => chest,
            Head_08: () => headPivot,
            LeftArm_013: () => arms[1].shoulder, LeftForeArm_014: () => arms[1].elbow, LeftHand_017: () => arms[1].elbow,
            RightArm_039: () => arms[0].shoulder, RightForeArm_040: () => arms[0].elbow, RightHand_043: () => arms[0].elbow,
            LeftUpLeg_063: () => legs[1].hip, LeftLeg_064: () => legs[1].knee, LeftFoot_065: () => legs[1].ankle,
            RightUpLeg_068: () => legs[0].hip, RightLeg_069: () => legs[0].knee, RightFoot_070: () => legs[0].ankle
        };
        const blend = {
            Spine1_03: [() => spine, () => chest, 0.5],
            Neck_05: [() => chest, () => headPivot, 0.3],
            Neck1_06: [() => chest, () => headPivot, 0.55],
            Neck2_07: [() => chest, () => headPivot, 0.8]
        };

        // fingers: the old hands expose curl(c, jitter, t); remember what it was called with
        const fing = [{ side: "Left", arm: arms[1], c: 0.35, j: 0, t: 0 }, { side: "Right", arm: arms[0], c: 0.35, j: 0, t: 0 }];
        for (const f of fing) {
            const orig = f.arm.hand.userData.curl;
            f.arm.hand.userData.curl = (c, jitter, t) => { f.c = c; f.j = jitter; f.t = t; orig(c, jitter, t); };
        }

        // the rope coil now sits in the GLB hand
        const handL = bones["LeftHand_017"];
        handL.add(rope.coil);
        rope.coil.position.set(0, 0.1, 0.0);
        rope.coil.rotation.set(0, 0, 0);
        const handLocal = new THREE.Vector3(0, 0.11, 0);
        model.handPos = (out) => { handL.updateWorldMatrix(true, false); out.copy(handLocal); return handL.localToWorld(out); };

        const mouthMeshes = [];
        g.traverse((o) => { if (o.morphTargetDictionary && o.morphTargetDictionary.mouthOpen !== undefined) mouthMeshes.push(o); });

        const inv = new THREE.Quaternion(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qc = new THREE.Quaternion();
        const fin = new Map();
        const eul = new THREE.Euler();
        const axX = new THREE.Vector3(1, 0, 0);

        const rootSpace = (grp, out) => out.copy(grp.getWorldQuaternion(qc)).premultiply(inv);

        function sync() {
            root.updateMatrixWorld(true);
            root.getWorldQuaternion(inv).invert();

            for (const b of order) {
                const r = rest.get(b);
                const pf = b.parent && fin.has(b.parent) ? fin.get(b.parent) : null;
                let want;
                const s = src[b.name], bl = blend[b.name];
                if (s) { want = rootSpace(s(), new THREE.Quaternion()).multiply(r.wq); }
                else if (bl) {
                    rootSpace(bl[0](), qa); rootSpace(bl[1](), qb);
                    want = qa.slerp(qb, bl[2]).clone().multiply(r.wq);
                }
                else {
                    want = (pf ? pf.clone() : new THREE.Quaternion()).multiply(r.q);
                }
                fin.set(b, want);
                if (pf) b.quaternion.copy(pf).invert().multiply(want);
                else b.quaternion.copy(want);
            }

            // pelvis bob / crouch
            hips.position.set(rest.get(hips).p.x, rest.get(hips).p.y + (pelvis.position.y - 1.03) / GLB_SCALE, rest.get(hips).p.z);

            // eyes
            const eyes = head.userData.eyes;
            const eb = [bones["RightEye_010"], bones["LeftEye_09"]];
            for (let i = 0; i < 2; i++) {
                if (!eb[i] || !eyes[i]) continue;
                eul.set(eyes[i].rotation.x, eyes[i].rotation.y, 0);
                eb[i].quaternion.copy(rest.get(eb[i]).q).multiply(qa.setFromEuler(eul));
            }

            // fingers (the rest pose already has a relaxed curl of about 0.3)
            for (const f of fing) {
                const names = ["Index", "Middle", "Ring", "Pinky"];
                for (let i = 0; i < 4; i++) {
                    const k = clamp(f.c + Math.sin(f.t * 1.7 + i * 1.9) * f.j, 0, 1.1) - 0.3;
                    const mult = [1.25, 1.5, 1.0];
                    for (let j = 0; j < 3; j++) {
                        const b = bones[Object.keys(bones).find((n) => n.startsWith(f.side + "Hand" + names[i] + (j + 1)))];
                        if (b) b.quaternion.copy(rest.get(b).q).multiply(qa.setFromAxisAngle(axX, k * mult[j]));
                    }
                }
                const kt = clamp(f.c * 0.8 + Math.sin(f.t * 1.3) * f.j * 0.5, 0, 1) - 0.24;
                for (let j = 0; j < 2; j++) {
                    const b = bones[Object.keys(bones).find((n) => n.startsWith(f.side + "HandThumb" + (j + 1)))];
                    if (b) b.quaternion.copy(rest.get(b).q).multiply(qa.setFromAxisAngle(axX, kt * (j ? 0.9 : 0.5)));
                }
            }

            // jaw
            const open = clamp(-head.userData.jaw.position.y / 0.03, 0, 1.2);
            for (const mm of mouthMeshes) mm.morphTargetInfluences[mm.morphTargetDictionary.mouthOpen] = open * 0.95;
        }
        return { sync };
    }

    model.update = function (dt, p, ropeEnd, taut) {
        baseUpdate.call(model, dt, p, ropeEnd, taut);
        if (glb) {
            glb.sync();
            root.updateMatrixWorld(true);
        }
    };

    return model;
}
