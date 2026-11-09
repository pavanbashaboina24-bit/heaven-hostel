// ======================================================
// THE RITUAL-SEALED MAIN DOOR  (built from the reference picture)
//
//   - an old brown door with two sunken panels, cracks and blood hand prints
//   - red + yellow sacred threads tied in a star across the whole door
//   - two brass bells, a string of red chillies and two lemons
//   - a bag of rice stained with blood and two strips of red cloth
//   - a heavy rusty iron bolt with an old brass padlock hanging from it
//
// Everything that hangs ON the door goes into one group ("hasp").  yard.js shows
// that group while the door is locked and hides it when the key opens the lock.
// Door space: +x is the face you see, z is the width, y is up (the door is 3 high).
// ======================================================
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { frameHooks } from "./haunted.js";

const TAU = Math.PI * 2;

// small seeded random so the door looks the same every time
function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// ------------------------------------------------------
// the painted face of the door
// ------------------------------------------------------
function paintDoorFace(width, height) {

    const W = 512, H = Math.round(512 * height / width);
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    const r = rng(77);

    // old wood
    const grad = g.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, "#5b3317"); grad.addColorStop(0.5, "#6b3d1d"); grad.addColorStop(1, "#52301a");
    g.fillStyle = grad; g.fillRect(0, 0, W, H);

    // grain
    for (let i = 0; i < 260; i++) {
        g.strokeStyle = "rgba(" + (20 + r() * 30) + "," + (8 + r() * 12) + ",4," + (0.08 + r() * 0.2) + ")";
        g.lineWidth = 0.6 + r() * 1.6;
        const x = r() * W;
        g.beginPath(); g.moveTo(x, 0);
        g.bezierCurveTo(x + (r() - 0.5) * 18, H * 0.3, x + (r() - 0.5) * 18, H * 0.7, x + (r() - 0.5) * 10, H);
        g.stroke();
    }

    // two sunken panels with a dark frame and a lit edge
    const panel = (x, y, w, h) => {
        g.fillStyle = "rgba(0,0,0,0.30)"; g.fillRect(x - 10, y - 10, w + 20, h + 20);
        g.fillStyle = "#6e4122"; g.fillRect(x, y, w, h);
        g.strokeStyle = "rgba(20,8,2,0.85)"; g.lineWidth = 7; g.strokeRect(x, y, w, h);
        g.strokeStyle = "rgba(190,130,80,0.25)"; g.lineWidth = 2; g.strokeRect(x + 6, y + 6, w - 12, h - 12);
    };
    panel(62, H * 0.07, W - 124, H * 0.40);
    panel(62, H * 0.52, W - 124, H * 0.43);

    // cracks
    g.strokeStyle = "rgba(25,12,6,0.8)"; g.lineWidth = 1.5;
    for (let k = 0; k < 7; k++) {
        let x = 90 + r() * (W - 180), y = H * 0.08 + r() * H * 0.3;
        g.beginPath(); g.moveTo(x, y);
        for (let s = 0; s < 7; s++) { x += (r() - 0.45) * 22; y += 8 + r() * 24; g.lineTo(x, y); }
        g.stroke();
    }

    // dirt and age
    for (let i = 0; i < 70; i++) {
        g.fillStyle = "rgba(10,6,3," + (0.04 + r() * 0.1) + ")";
        g.beginPath(); g.ellipse(r() * W, r() * H, 10 + r() * 50, 6 + r() * 26, r() * 3, 0, TAU); g.fill();
    }

    // a hand print (palm, five fingers, thumb)
    const hand = (x, y, rot, s, a) => {
        g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
        g.fillStyle = "rgba(150,18,18," + a + ")";
        g.beginPath(); g.ellipse(0, 10, 24, 30, 0, 0, TAU); g.fill();
        for (const [fx, fy, fr, fl] of [[-17, -14, -0.25, 30], [-6, -24, -0.08, 36], [6, -26, 0.05, 38], [17, -20, 0.2, 33]]) {
            g.save(); g.translate(fx, fy); g.rotate(fr);
            g.beginPath(); g.ellipse(0, -fl / 2, 5.2, fl / 2, 0, 0, TAU); g.fill(); g.restore();
        }
        g.save(); g.translate(-24, 14); g.rotate(-0.9);
        g.beginPath(); g.ellipse(0, -13, 5.5, 15, 0, 0, TAU); g.fill(); g.restore();
        // smear and drips
        g.strokeStyle = "rgba(130,14,14," + a * 0.8 + ")"; g.lineWidth = 3;
        for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-14 + k * 14, 36); g.lineTo(-14 + k * 14, 50 + r() * 60); g.stroke(); }
        g.restore();
    };
    hand(160, H * 0.20, -0.15, 1.15, 0.75);
    hand(300, H * 0.30, 0.25, 1.1, 0.7);
    hand(150, H * 0.55, 0.1, 1.2, 0.6);
    hand(350, H * 0.60, -0.3, 1.1, 0.65);
    hand(400, H * 0.78, 0.2, 1.0, 0.45);

    // long blood runs down the lower panel
    for (let k = 0; k < 9; k++) {
        const x = 150 + r() * 220, y0 = H * (0.72 + r() * 0.08), y1 = y0 + 60 + r() * 180;
        g.strokeStyle = "rgba(120,10,10," + (0.4 + r() * 0.3) + ")"; g.lineWidth = 2 + r() * 3;
        g.beginPath(); g.moveTo(x, y0); g.lineTo(x + (r() - 0.5) * 5, y1); g.stroke();
        g.fillStyle = g.strokeStyle; g.beginPath(); g.arc(x, y1, 3.5, 0, TAU); g.fill();
    }

    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
}

// a sack with blood on it
function bagTexture() {
    const c = document.createElement("canvas");
    c.width = 128; c.height = 128;
    const g = c.getContext("2d"), r = rng(5);
    g.fillStyle = "#cdbfa4"; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 400; i++) { g.fillStyle = "rgba(90,70,40," + r() * 0.12 + ")"; g.fillRect(r() * 128, r() * 128, 2, 1); }
    for (let i = 0; i < 9; i++) {
        g.fillStyle = "rgba(140,14,14," + (0.35 + r() * 0.4) + ")";
        g.beginPath(); g.ellipse(r() * 128, 30 + r() * 90, 6 + r() * 16, 8 + r() * 24, 0, 0, TAU); g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

// ------------------------------------------------------
// the whole seal
// ------------------------------------------------------
export function buildRitualSeal(door, width) {

    const H = 3;
    const hasp = new THREE.Group();
    hasp.scale.z = width / 1.4;                 // the picture was drawn for a 1.4 wide door
    door.add(hasp);

    const std = (c, rough, metal, em) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal || 0, emissive: em || 0x000000 });

    // ---- 1. the painted face (only the +x side shows it) ----
    const base = door.material;
    const face = new THREE.MeshStandardMaterial({ map: paintDoorFace(width, H), roughness: 0.85, metalness: 0.02, emissive: 0x1a0a04, emissiveIntensity: 0.35 });
    door.material = [face, base, base, base, base, base];

    const FX = 0.085;                           // threads lie just in front of the wood
    const P = (z, y, x) => new THREE.Vector3(x === undefined ? FX : x, y, z);

    // ---- 2. red + yellow threads tied in a star ----
    const red = std(0xb01418, 0.8, 0, 0x2a0404);
    const gold = std(0xd8a41c, 0.7, 0, 0x2a1c04);

    const strand = (a, b, mat, sag, rad) => {
        const mid = a.clone().add(b).multiplyScalar(0.5);
        mid.y -= sag; mid.x += 0.004;
        const curve = new THREE.CatmullRomCurve3([a, mid, b]);
        const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 14, rad || 0.0058, 5, false), mat);
        hasp.add(m);
    };

    // two strands (one red, one yellow) side by side = the twisted look of the picture
    const pair = (a, b, sag) => {
        strand(a, b, red, sag || 0.03, 0.0088);
        strand(a.clone().add(new THREE.Vector3(0.006, 0.012, 0.005)), b.clone().add(new THREE.Vector3(0.006, 0.012, -0.004)), gold, (sag || 0.03) + 0.01, 0.0072);
    };

    const N = {
        TL: [0.72, 1.00], TR: [-0.71, 0.99], TK: [0.0, 0.72], TK2: [0.0, 0.52],
        ML: [0.72, 0.16], MR: [-0.69, 0.08], CL: [0.0, -0.11],
        BL: [0.71, -0.88], BR: [-0.70, -0.44], BAG: [0.66, -0.30], LB: [0.28, -0.46], RB: [-0.30, -0.56]
    };
    const n = (k) => P(N[k][0], N[k][1]);

    pair(n("TL"), n("TK"), 0.05);
    pair(n("TR"), n("TK"), 0.05);
    pair(n("TL"), n("TK2"), 0.03);
    pair(n("TR"), n("TK2"), 0.03);
    pair(n("TL"), n("TR"), 0.16);
    pair(n("TK"), n("TK2"), 0.0);
    pair(n("TK2"), n("CL"), 0.0);
    pair(n("TL"), n("BR"), 0.04);             // the two long diagonals
    pair(n("TR"), n("BAG"), 0.04);
    pair(n("ML"), n("CL"), 0.05);
    pair(n("MR"), n("CL"), 0.05);
    pair(n("TK2"), n("ML"), 0.02);
    pair(n("TK2"), n("MR"), 0.02);
    pair(n("BL"), n("LB"), 0.03);
    pair(n("BR"), n("RB"), 0.03);
    pair(n("ML"), n("BL"), 0.0);              // loose verticals down the edges
    pair(n("TR"), n("MR"), 0.0);
    pair(n("MR"), n("BR"), 0.0);

    // knots with loose tufts
    const knot = (z, y, s) => {
        const k = new THREE.Group();
        k.position.copy(P(z, y, 0.1));
        k.add(new THREE.Mesh(new THREE.SphereGeometry(0.03 * (s || 1), 10, 8), red));
        for (let i = 0; i < 7; i++) {
            const t = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.07 * (s || 1), 4), i % 2 ? gold : red);
            t.rotation.set((i - 3) * 0.35, 0, (i % 3 - 1) * 0.5);
            t.position.set(0, -0.02, 0);
            k.add(t);
        }
        hasp.add(k);
    };
    for (const k of ["TL", "TR", "TK", "TK2", "ML", "MR", "CL", "BL", "BR"]) knot(N[k][0], N[k][1], k === "TL" || k === "TR" ? 1.4 : 1);

    // ---- 3. the heavy iron bolt and the old padlock ----
    const iron = std(0x6a4a30, 0.7, 0.75, 0x140a04);
    const dark = std(0x2b2724, 0.6, 0.8);
    const BY = -0.40;

    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.88, 12), iron);
    bolt.rotation.x = Math.PI / 2; bolt.position.set(0.125, BY, 0); hasp.add(bolt);

    for (const z of [0.40, 0.19, -0.22, -0.42]) {                       // the brackets
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.05), dark);
        b.position.set(0.1, BY, z); hasp.add(b);
    }
    const knob = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.08), dark);   // the bolt handle
    knob.position.set(0.17, BY, 0.34); hasp.add(knob);

    // staple the lock hangs from
    const staple = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 12, Math.PI), dark);
    staple.position.set(0.125, BY - 0.03, 0); staple.rotation.set(0, Math.PI / 2, Math.PI); hasp.add(staple);

    // padlock (round, rusty brass, keyhole)
    const brass = std(0x8a6a34, 0.55, 0.85, 0x1a1004);
    const pad = new THREE.Group();
    pad.position.set(0.14, BY - 0.24, 0);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.06, 20), brass);
    body.rotation.z = Math.PI / 2; pad.add(body);
    const body2 = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.07, 20), std(0x6b4f28, 0.7, 0.7)); // worn face
    body2.rotation.z = Math.PI / 2; body2.position.x = 0.004; pad.add(body2);
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.014, 8, 14, Math.PI), dark);
    shackle.position.set(0, 0.105, 0); shackle.rotation.set(0, Math.PI / 2, 0); pad.add(shackle);
    const kh = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 10), std(0x050403, 1));
    kh.rotation.z = Math.PI / 2; kh.position.set(0.04, 0.01, 0); pad.add(kh);
    const ks = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.04, 0.012), std(0x050403, 1));
    ks.position.set(0.04, -0.018, 0); pad.add(ks);
    hasp.add(pad);
    // a short chain from the staple to the shackle
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 6), dark);
    chain.position.set(0.135, BY - 0.1, 0); hasp.add(chain);

    // ---- 4. two brass bells on cords ----
    const bellPts = [];
    for (const [rr, yy] of [[0.004, 0.07], [0.024, 0.066], [0.040, 0.045], [0.049, 0.01], [0.056, -0.02], [0.062, -0.05], [0.054, -0.056], [0.03, -0.045], [0.0, -0.04]]) bellPts.push(new THREE.Vector2(rr, yy));
    const bellGeo = new THREE.LatheGeometry(bellPts, 18);
    const bellMat = std(0xb68a34, 0.38, 0.9, 0x201004);
    const bell = (z, y) => {
        const b = new THREE.Group();
        b.position.set(0.11, y, z);
        b.scale.setScalar(1.4);
        b.add(new THREE.Mesh(bellGeo, bellMat));
        const clap = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), dark); clap.position.y = -0.06; b.add(clap);
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.18, 5), std(0xb38a2a, 0.9));
        cord.position.y = 0.16; b.add(cord);
        hasp.add(b);
        return b;
    };
    const bellA = bell(0.58, 0.46), bellB = bell(-0.37, 0.45);

    // ---- 5. chillies + lemons (right) ----
    const chilli = std(0xa81410, 0.5, 0, 0x2a0402);
    const cordM = std(0xc9a24a, 0.9);
    const hangR = new THREE.Group(); hangR.position.set(0.1, 0, -0.70); hasp.add(hangR);
    const cr = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.95, 5), cordM); cr.position.y = 0.2; hangR.add(cr);
    for (let i = 0; i < 7; i++) {
        const ch = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.12, 3, 8), chilli);
        ch.position.set((i % 2 ? 0.02 : -0.02), 0.62 - i * 0.062, (i % 3 - 1) * 0.008);
        ch.rotation.z = (i % 2 ? 0.2 : -0.2);
        hangR.add(ch);
    }
    const lemonM = std(0x9bb02c, 0.55, 0, 0x1c2204);
    for (const [zz, yy] of [[-0.03, -0.1], [0.05, -0.14]]) {
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.048, 14, 10), lemonM);
        l.scale.set(1, 0.9, 1); l.position.set(0.02, yy, zz); hangR.add(l);
    }

    // ---- 6. the blood-stained bag (left) and red cloth strips ----
    const bag = new THREE.Group(); bag.position.set(0.11, -0.31, 0.70); hasp.add(bag);
    const sack = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), std(0xffffff, 1));
    sack.material.map = bagTexture(); sack.scale.set(0.85, 1.2, 0.8); sack.position.y = -0.03; bag.add(sack);
    const neck = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 10), sack.material); neck.position.y = 0.12; bag.add(neck);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.007, 5, 12), red); tie.rotation.x = Math.PI / 2; tie.position.y = 0.13; bag.add(tie);

    const clothM = new THREE.MeshStandardMaterial({ color: 0x9a1214, roughness: 1, side: THREE.DoubleSide, emissive: 0x200404 });
    const cloth = (z, y, w, h, rz) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 1, 4), clothM);
        m.position.set(0.1, y, z); m.rotation.set(0, Math.PI / 2, rz || 0);
        // ragged: wobble the lower edge
        const pos = m.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(i * 1.7) * 0.012 * (0.5 - pos.getY(i) / h));
        pos.needsUpdate = true;
        hasp.add(m);
    };
    cloth(0.62, -0.58, 0.09, 0.34, 0.12);
    cloth(0.72, -0.62, 0.07, 0.26, -0.1);
    cloth(-0.68, -0.80, 0.1, 0.42, -0.06);

    // a little red light: the seal feels alive
    const glow = new THREE.PointLight(0xff3a1a, 0.9, 4.2, 2);
    glow.position.set(0.6, 0.1, 0);
    hasp.add(glow);

    // the bells and strips sway very slightly (called by yard.js every frame)
    hasp.userData.sway = (t) => {
        bellA.rotation.z = Math.sin(t * 1.3) * 0.05; bellB.rotation.z = Math.sin(t * 1.1 + 1.7) * 0.05;
        hangR.rotation.x = Math.sin(t * 0.9) * 0.02;
        glow.intensity = 0.8 + Math.sin(t * 3.1) * 0.12 + Math.sin(t * 7.3) * 0.06;
    };

    return hasp;
}

// ------------------------------------------------------
// the SACRED THREADS on the doors that start locked (rooms 101 and 104): red + yellow thread
// tied in knots across the door, with a rusty padlock and a chain.  They disappear when the door unlocks.
// Door space: the door is 1.4 wide (x), 3 high (y), 0.15 thick (z); both faces get the same threads.
// ------------------------------------------------------
export function addSacredThreads(door) {

    const grp = new THREE.Group();

    door.add(grp);

    const red = new THREE.MeshStandardMaterial({ color: 0xa0161a, roughness: 0.85, emissive: 0x200404 });

    const gold = new THREE.MeshStandardMaterial({ color: 0xc9941c, roughness: 0.75, emissive: 0x241804 });

    const iron = new THREE.MeshStandardMaterial({ color: 0x2c2622, roughness: 0.6, metalness: 0.7 });

    const rust = new THREE.MeshStandardMaterial({ color: 0x6b3a20, roughness: 0.8, metalness: 0.4 });

    const face = new THREE.Group();

    const V = (x, y) => new THREE.Vector3(x, y, 0.095);

    const strand = (a, b, mat, sag, rad) => {

        const mid = a.clone().add(b).multiplyScalar(0.5);

        mid.y -= sag; mid.z += 0.004;

        face.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, mid, b]), 12, rad, 5, false), mat));
    };

    const pair = (a, b, sag) => {

        strand(a, b, red, sag, 0.0085);

        strand(a.clone().add(new THREE.Vector3(0.007, 0.012, 0.004)), b.clone().add(new THREE.Vector3(0.007, 0.012, 0.004)), gold, sag + 0.01, 0.0065);
    };

    const TL = V(-0.62, 0.95), TR = V(0.62, 0.95), C = V(0, 0.15), BL = V(-0.62, -0.7), BR = V(0.62, -0.7), TM = V(0, 1.15), BM = V(0, -0.55);

    pair(TL, C, 0.04); pair(TR, C, 0.04); pair(BL, C, 0.03); pair(BR, C, 0.03);
    pair(TL, TR, 0.14); pair(TM, C, 0); pair(C, BM, 0);

    for (const q of [TL, TR, C, BL, BR, TM]) {

        const k = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), red);

        k.position.copy(q); k.position.z += 0.012;

        face.add(k);

        for (let i = 0; i < 5; i++) {

            const t = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.08, 4), i % 2 ? gold : red);

            t.position.set(q.x + (i - 2) * 0.012, q.y - 0.05, q.z + 0.012);

            t.rotation.z = (i - 2) * 0.2;

            face.add(t);
        }
    }

    // a rusty padlock on a chain at the bottom of the star
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 16), rust);

    pad.rotation.x = Math.PI / 2; pad.position.set(0, -0.72, 0.12);

    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.011, 6, 12, Math.PI), iron);

    shackle.position.set(0, -0.66, 0.12);

    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.2, 6), iron);

    chain.position.set(0, -0.58, 0.115);

    face.add(pad, shackle, chain);

    grp.add(face);

    const back = face.clone();

    back.rotation.y = Math.PI;

    grp.add(back);

    // gone as soon as the door is unlocked
    frameHooks.push(() => { grp.visible = !!door.userData.isLocked; });

    return grp;
}
