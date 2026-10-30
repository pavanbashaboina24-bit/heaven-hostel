import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

import { getPlayer } from "./haunted.js";

// ======================================================
// HORROR + REALISM PASS FOR THE OUTSIDE OF THE HOSTEL
//
//  - rain / water streaks running down from every sill
//  - soot under the cornices, damp + mould at the foot of the walls
//  - boarded-up windows (rotten planks, crooked)
//  - long claw scratches and smeared blood by the door
//  - a pale face that appears behind an upper window
//  - one window with a dying red glow
//
// Everything is drawn by code (no image files), like the rest
// of the game.
// ======================================================

const S = 15.25;                       // outer face of the walls
const WX = [-11.6, -4.6, 4.6, 11.6];   // window centres

let seed = 9137;
const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
};

function cv(w, h, draw) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d");
    draw(g, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

function decalMat(map, extra) {
    return new THREE.MeshStandardMaterial(Object.assign({
        map, transparent: true, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -3,
        roughness: 1, color: 0xffffff
    }, extra || {}));
}

// ---------------- textures ----------------
function streakTex() {
    return cv(128, 512, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        for (let i = 0; i < 14; i++) {
            const x = 10 + rnd() * (w - 20);
            const len = h * (0.35 + rnd() * 0.65);
            const wd = 2 + rnd() * 9;
            const grad = g.createLinearGradient(0, 0, 0, len);
            grad.addColorStop(0, "rgba(6,8,6," + (0.5 + rnd() * 0.3) + ")");
            grad.addColorStop(1, "rgba(6,8,6,0)");
            g.fillStyle = grad;
            g.fillRect(x, 0, wd, len);
        }
        // a few mouldy blotches near the top
        for (let i = 0; i < 6; i++) {
            g.fillStyle = "rgba(20,30,18," + (0.15 + rnd() * 0.2) + ")";
            g.beginPath();
            g.arc(rnd() * w, rnd() * 120, 6 + rnd() * 16, 0, 6.3);
            g.fill();
        }
    });
}

function bandTex(fromTop, tint) {
    return cv(512, 128, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        const grad = g.createLinearGradient(0, fromTop ? 0 : h, 0, fromTop ? h : 0);
        grad.addColorStop(0, "rgba(" + tint + ",0.78)");
        grad.addColorStop(1, "rgba(" + tint + ",0)");
        g.fillStyle = grad;
        g.fillRect(0, 0, w, h);
        // ragged edge: blotchy noise
        for (let i = 0; i < 260; i++) {
            const y = (fromTop ? rnd() * rnd() : 1 - rnd() * rnd()) * h;
            g.fillStyle = "rgba(" + tint + "," + (0.1 + rnd() * 0.3) + ")";
            g.beginPath();
            g.arc(rnd() * w, y, 3 + rnd() * 14, 0, 6.3);
            g.fill();
        }
    });
}

function scratchTex() {
    return cv(256, 256, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        for (let i = 0; i < 5; i++) {
            const x0 = 40 + i * 36 + rnd() * 8;
            g.strokeStyle = "rgba(28,6,4," + (0.8 + rnd() * 0.2) + ")";
            g.lineWidth = 3 + rnd() * 3;
            g.lineCap = "round";
            g.beginPath();
            g.moveTo(x0, 14 + rnd() * 20);
            g.bezierCurveTo(
                x0 + 12, 90, x0 - 14, 160, x0 + 8 + rnd() * 10, 235
            );
            g.stroke();
            // gouged splinters
            g.lineWidth = 1;
            for (let k = 0; k < 6; k++) {
                const yy = 40 + rnd() * 180;
                g.beginPath();
                g.moveTo(x0, yy);
                g.lineTo(x0 + (rnd() - 0.5) * 16, yy + 6 + rnd() * 8);
                g.stroke();
            }
        }
    });
}

function smearTex() {
    return cv(256, 512, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        // a long dragged smear sliding down the wall
        for (let i = 0; i < 40; i++) {
            const y = 20 + i * 11;
            const x = 128 + Math.sin(i * 0.35) * 28 + (rnd() - 0.5) * 8;
            const wd = 30 - i * 0.45 + rnd() * 8;
            g.fillStyle = "rgba(" + (70 + rnd() * 25) + ",4,4," + (0.7 - i * 0.008) + ")";
            g.beginPath();
            g.ellipse(x, y, Math.max(6, wd / 2), 9 + rnd() * 6, 0, 0, 6.3);
            g.fill();
        }
        // drips
        for (let i = 0; i < 9; i++) {
            const x = 90 + rnd() * 80;
            const y = 60 + rnd() * 300;
            g.fillStyle = "rgba(80,4,4,0.85)";
            const len = 20 + rnd() * 70;
            g.fillRect(x, y, 3 + rnd() * 3, len);
            g.beginPath();
            g.arc(x + 2, y + len, 4, 0, 6.3);
            g.fill();
        }
    });
}

function faceTex() {
    return cv(256, 320, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        // long dark hair
        g.fillStyle = "rgba(4,4,5,0.96)";
        g.beginPath();
        g.ellipse(128, 150, 96, 150, 0, 0, 6.3);
        g.fill();
        // pale, stretched face
        const fg = g.createRadialGradient(128, 130, 10, 128, 140, 100);
        fg.addColorStop(0, "#d9dcd6");
        fg.addColorStop(1, "#7f857f");
        g.fillStyle = fg;
        g.beginPath();
        g.ellipse(128, 142, 56, 88, 0, 0, 6.3);
        g.fill();
        // hollow eyes
        g.fillStyle = "#050505";
        g.beginPath(); g.ellipse(104, 118, 15, 22, -0.1, 0, 6.3); g.fill();
        g.beginPath(); g.ellipse(152, 118, 15, 22, 0.1, 0, 6.3); g.fill();
        // tiny dead pupils
        g.fillStyle = "#c9c9c0";
        g.beginPath(); g.arc(104, 124, 2.4, 0, 6.3); g.fill();
        g.beginPath(); g.arc(152, 124, 2.4, 0, 6.3); g.fill();
        // gaping mouth
        g.fillStyle = "#050202";
        g.beginPath(); g.ellipse(128, 198, 15, 34, 0, 0, 6.3); g.fill();
        // dark tear tracks
        g.strokeStyle = "rgba(20,10,10,0.7)";
        g.lineWidth = 3;
        for (const x of [104, 152]) {
            g.beginPath(); g.moveTo(x, 140); g.lineTo(x + (x < 128 ? -3 : 3), 190); g.stroke();
        }
    });
}

// face-direction helper: {x,z,ry} for the 4 sides of the hostel
const SIDES = {
    s: { nx: 0, nz: 1, ry: 0 },
    n: { nx: 0, nz: -1, ry: Math.PI },
    e: { nx: 1, nz: 0, ry: Math.PI / 2 },
    w: { nx: -1, nz: 0, ry: -Math.PI / 2 }
};

// point on a wall: along = coordinate along the wall, out = distance outward
function onWall(side, along, y, out) {
    const d = SIDES[side];
    if (d.nz) return { x: along, y, z: d.nz * (S + out) };
    return { x: d.nx * (S + out), y, z: along };
}

export function buildHorror(R, rng, mats, anim) {

    const streak = decalMat(streakTex());
    const soot = decalMat(bandTex(true, "4,4,4"));
    const damp = decalMat(bandTex(false, "10,16,8"));
    const claw = decalMat(scratchTex());
    const smear = decalMat(smearTex(), { emissive: 0x120000 });

    const wood = mats.wood;

    const place = (mat, w, h, side, along, y, out, extraRz) => {
        const p = onWall(side, along, y, out);
        return R._m(
            new THREE.PlaneGeometry(1, 1), mat, w, h, 1, p.x, p.y, p.z,
            { ry: SIDES[side].ry, rz: extraRz || 0 }
        );
    };

    for (const side of ["s", "n", "w"]) {

        const hasWindows = side !== "w";

        // soot under the roof line + damp rising from the ground
        place(soot, 30, 2.6, side, 0, 12.0, 0.05);
        place(damp, 30, 2.4, side, 0, 1.15, 0.05);

                for (const fy of hasWindows ? [0, 4, 8] : []) {
            for (const x of WX) {

                // water stains running down from the sill
                if (rnd() < 0.8) {
                    place(streak, 1.9 + rnd() * 0.8, 3.0, side, x, fy + 0.8 - 1.5, 0.045);
                }

                // boarded-up window: crooked planks nailed across
                if (rnd() < 0.3) {
                    const n = 3 + Math.floor(rnd() * 2);
                    for (let k = 0; k < n; k++) {
                        const y = fy + 1.05 + k * 0.5 + (rnd() - 0.5) * 0.1;
                        const p = onWall(side, x + (rnd() - 0.5) * 0.1, y, 0.12);
                        const horizontal = side === "s" || side === "n";
                        R.box(
                            wood,
                            horizontal ? 2.3 : 0.06,
                            0.2,
                            horizontal ? 0.06 : 2.3,
                            p.x, p.y, p.z,
                            { rz: (rnd() - 0.5) * 0.22 * (horizontal ? 1 : 0), rx: horizontal ? 0 : (rnd() - 0.5) * 0.22 }
                        );
                    }
                }
            }
        }
    }

    // the front (east) wall: scratches and smears beside the door
    place(claw, 1.2, 1.4, "e", -3.4, 1.9, 0.045, 0.08);
    place(claw, 1.1, 1.3, "e", 4.2, 2.3, 0.045, -0.12);
    place(smear, 1.3, 2.6, "e", 2.6, 1.7, 0.047);
    place(smear, 1.1, 2.2, "s", -9.2, 1.5, 0.047);
    place(smear, 1.0, 2.0, "w", 6.5, 1.6, 0.047);

    // ---------- the face in the window ----------
    // one window on the top floor (south side) and one in the middle
    // floor (north side).  They appear for a moment now and then,
    // never stay, and never move while you look straight at them.
    const faceMat = new THREE.MeshBasicMaterial({
        map: faceTex(), transparent: true, depthWrite: false,
        color: 0xa8aeb4, opacity: 0
    });

    const faces = [];

    for (const [side, x, fy, wait] of [["s", 4.6, 8, 17], ["n", -4.6, 4, 29]]) {

        const p = onWall(side, x, fy + 1.9, -0.7);

        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.05), faceMat.clone());

        m.position.set(p.x, p.y, p.z);

        m.rotation.y = SIDES[side].ry;

        m.renderOrder = 5;

        R.group.add(m);

        faces.push({ m, wait, phase: wait * 0.37 });
    }

    // ---------- a window with a dying red glow ----------
    const redMat = new THREE.MeshBasicMaterial({
        color: 0x7a0d08, transparent: true, opacity: 0.4,
        depthWrite: false
    });

    const rp = onWall("s", -4.6, 4 + 1.85, -0.6);

    const red = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.7), redMat);

    red.position.set(rp.x, rp.y, rp.z);

    red.rotation.y = SIDES.s.ry;

    R.group.add(red);

        // (speed/amp 0 = the shared swing loop leaves the plane still,
    //  onFrame runs the flicker)
    anim.swings.push({
        g: red, speed: 0, phase: 0, amp: 0,
        onFrame: (t) => {

            // a failing bulb: slow breathing + sudden flickers
            const flick = Math.sin(t * 23) * Math.sin(t * 7.3);

            redMat.opacity = Math.max(
                0.05,
                0.28 + Math.sin(t * 0.9) * 0.14 + (flick > 0.82 ? -0.25 : 0)
            );

            for (const f of faces) {

                const cyc = (t + f.phase) % f.wait;

                // visible for ~1.3 s, with a stutter as it appears
                if (cyc < 1.3) {

                    const k = cyc / 1.3;

                    const stutter = Math.sin(cyc * 40) > -0.2 ? 1 : 0.2;

                    f.m.material.opacity =
                        Math.min(1, k * 6) * (1 - Math.max(0, k - 0.8) * 5) * stutter * 0.9;

                    f.m.position.y += Math.sin(t * 3) * 0.0004;
                }
                else {
                    f.m.material.opacity = 0;
                }
            }
        }
    });

    buildHorrorMore(R, rng, mats, anim);
}

// ======================================================
// MORE HORROR FOR THE OUTSIDE
//
//  - blood messages written on the walls
//  - cracks in the plaster, broken window panes
//  - torn curtains hanging out of windows, moving in the wind
//  - a candle glow that drifts from window to window
//    (somebody is walking about inside)
//  - crows on the roof edge and the graveyard fence
//  - a tall, thin WATCHER that stands among the trees.  It only
//    appears while you are not looking, and is gone when you
//    turn round.
// ======================================================

function messageTex(text, w, h, size) {
    return cv(w, h, (g, cw, ch) => {
        g.clearRect(0, 0, cw, ch);
        g.font = "bold " + size + "px 'Courier New', monospace";
        g.textAlign = "center";
        g.textBaseline = "middle";
        // wet red letters with a few drips
        g.fillStyle = "rgba(96,6,6,0.92)";
        g.shadowColor = "rgba(60,0,0,0.9)";
        g.shadowBlur = 6;
        g.fillText(text, cw / 2 + (rnd() - 0.5) * 3, ch * 0.42);
        g.fillText(text, cw / 2 + 1.5, ch * 0.42 + 1.5);
        g.shadowBlur = 0;
        const letters = Math.max(1, text.length);
        for (let i = 0; i < letters * 1.4; i++) {
            const x = cw * 0.1 + rnd() * cw * 0.8;
            const len = 14 + rnd() * ch * 0.45;
            g.fillStyle = "rgba(90,5,5," + (0.55 + rnd() * 0.3) + ")";
            g.fillRect(x, ch * 0.5, 2 + rnd() * 3, len);
            g.beginPath();
            g.arc(x + 1.5, ch * 0.5 + len, 3.2, 0, 6.3);
            g.fill();
        }
    });
}

function crackTex() {
    return cv(256, 512, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        const branch = (x, y, ang, len, wd, depth) => {
            if (len < 8 || depth > 5) return;
            g.strokeStyle = "rgba(6,6,6," + (0.5 + rnd() * 0.4) + ")";
            g.lineWidth = wd;
            g.beginPath();
            g.moveTo(x, y);
            let cx = x, cy = y;
            const steps = 6;
            for (let i = 0; i < steps; i++) {
                ang += (rnd() - 0.5) * 0.9;
                cx += Math.cos(ang) * len / steps;
                cy += Math.sin(ang) * len / steps;
                g.lineTo(cx, cy);
            }
            g.stroke();
            if (rnd() < 0.8) branch(cx, cy, ang + 0.6 + rnd() * 0.5, len * 0.6, wd * 0.7, depth + 1);
            if (rnd() < 0.5) branch(cx, cy, ang - 0.6 - rnd() * 0.5, len * 0.55, wd * 0.7, depth + 1);
            branch(cx, cy, ang, len * 0.7, wd * 0.8, depth + 1);
        };
        branch(w * (0.3 + rnd() * 0.4), 6, Math.PI / 2, 150, 4, 0);
        branch(w * (0.3 + rnd() * 0.4), h * 0.5, Math.PI / 2.4, 110, 3, 1);
    });
}

function shardTex() {
    return cv(256, 300, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        // jagged glass teeth sticking in from the frame + dark holes
        g.fillStyle = "rgba(4,5,6,0.96)";
        const teeth = (x0, y0, dx, dy, n, size) => {
            g.beginPath();
            g.moveTo(x0, y0);
            for (let i = 0; i < n; i++) {
                const px = x0 + dx * (i + 0.5) / n;
                const py = y0 + dy * (i + 0.5) / n;
                const nx = -dy / Math.hypot(dx, dy);
                const ny = dx / Math.hypot(dx, dy);
                const s = size * (0.4 + rnd());
                g.lineTo(px + nx * s, py + ny * s);
                g.lineTo(x0 + dx * (i + 1) / n, y0 + dy * (i + 1) / n);
            }
            g.lineTo(x0 + dx - dy * 0.0, y0 + dy);
            g.closePath();
            g.fill();
        };
        teeth(0, 0, w, 0, 9, 70);
        teeth(0, 0, 0, h, 10, 55);
        teeth(w, 0, 0, h, 10, -55);
        teeth(0, h, w, 0, 9, -50);
        // hole in the middle of the pane + cracks round it
        g.beginPath();
        g.ellipse(w * 0.55, h * 0.45, 26, 40, 0.4, 0, 6.3);
        g.fill();
        g.strokeStyle = "rgba(210,220,225,0.35)";
        g.lineWidth = 1.2;
        for (let i = 0; i < 14; i++) {
            const a = rnd() * 6.28;
            g.beginPath();
            g.moveTo(w * 0.55, h * 0.45);
            g.lineTo(w * 0.55 + Math.cos(a) * (60 + rnd() * 80), h * 0.45 + Math.sin(a) * (70 + rnd() * 90));
            g.stroke();
        }
    });
}

function curtainTex() {
    return cv(128, 256, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        const grad = g.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "rgba(168,170,160,0.95)");
        grad.addColorStop(1, "rgba(104,108,100,0.8)");
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(w, 0);
        // ragged torn bottom edge
        for (let x = w; x >= 0; x -= 8) {
            g.lineTo(x, h * (0.72 + rnd() * 0.28));
        }
        g.closePath();
        g.fill();
        // folds + stains
        for (let x = 6; x < w; x += 12) {
            g.fillStyle = "rgba(20,22,18," + (0.08 + rnd() * 0.14) + ")";
            g.fillRect(x, 0, 3 + rnd() * 4, h);
        }
        for (let i = 0; i < 4; i++) {
            g.fillStyle = "rgba(60,20,14,0.18)";
            g.beginPath();
            g.arc(rnd() * w, rnd() * h * 0.7, 6 + rnd() * 12, 0, 6.3);
            g.fill();
        }
    });
}

function watcherTex() {
    return cv(128, 384, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        g.fillStyle = "#020202";
        // tall, thin body with long arms hanging below the knees
        g.beginPath();
        g.ellipse(64, 46, 17, 24, 0, 0, 6.3);            // head
        g.fill();
        g.fillRect(57, 62, 14, 30);                       // neck
        g.beginPath();
        g.moveTo(40, 88); g.lineTo(88, 88); g.lineTo(80, 215); g.lineTo(48, 215);
        g.closePath(); g.fill();                          // torso
        g.fillRect(50, 210, 10, 150);                     // legs
        g.fillRect(68, 210, 10, 150);
        g.beginPath();                                    // arms
        g.moveTo(40, 90); g.lineTo(26, 300); g.lineTo(32, 304); g.lineTo(48, 100);
        g.closePath(); g.fill();
        g.beginPath();
        g.moveTo(88, 90); g.lineTo(102, 300); g.lineTo(96, 304); g.lineTo(80, 100);
        g.closePath(); g.fill();
        // two faint pale eyes
        g.fillStyle = "rgba(220,225,215,0.85)";
        g.beginPath(); g.ellipse(57, 44, 3, 5, 0, 0, 6.3); g.fill();
        g.beginPath(); g.ellipse(71, 44, 3, 5, 0, 0, 6.3); g.fill();
    });
}

function crow(mat) {
    const c = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), mat);
    body.scale.set(0.12, 0.11, 0.26);
    c.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), mat);
    head.position.set(0, 0.1, 0.2);
    c.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.12, 6), mat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.095, 0.3);
    c.add(beak);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.22), mat);
    tail.position.set(0, -0.02, -0.28);
    tail.rotation.x = 0.35;
    c.add(tail);
    c.userData.head = head;
    return c;
}

function buildHorrorMore(R, rng, mats, anim) {

    const dummy = new THREE.Object3D();

    const place = (mat, w, h, side, along, y, out, rz) => {
        const p = onWall(side, along, y, out);
        return R._m(
            new THREE.PlaneGeometry(1, 1), mat, w, h, 1, p.x, p.y, p.z,
            { ry: SIDES[side].ry, rz: rz || 0 }
        );
    };

    // ---------- blood messages on the walls ----------
    const msg = (text, side, along, y, w, h, size, rz) => {
        place(
            decalMat(messageTex(text, 512, 256, size), { emissive: 0x100000 }),
            w, h, side, along, y, 0.052, rz
        );
    };

    msg("GET OUT", "e", -7.4, 3.3, 3.6, 1.8, 96, 0.05);
    msg("TURN BACK", "e", 7.6, 2.4, 3.8, 1.9, 78, -0.06);
    msg("HE SEES YOU", "s", -7.0, 3.7, 4.2, 2.1, 70, 0.03);
    msg("HELP US", "w", 4.0, 3.2, 3.4, 1.7, 90, -0.04);
    msg("DON'T LOOK", "n", 7.2, 3.6, 4.2, 2.1, 70, 0.04);

    // ---------- cracks in the plaster ----------
    const crack = decalMat(crackTex());

    for (let i = 0; i < 9; i++) {
        const side = ["s", "n", "e", "w"][i % 4];
        const along = (rnd() - 0.5) * 24;
        place(crack, 2.2 + rnd() * 1.4, 4.4 + rnd() * 2.4, side, along,
            2.8 + rnd() * 7, 0.05, (rnd() - 0.5) * 0.5);
    }

    // ---------- broken panes ----------
    const shard = decalMat(shardTex());

    for (const side of ["s", "n"]) {
        for (const fy of [0, 4, 8]) {
            for (const x of WX) {
                if (rnd() < 0.3) {
                    place(shard, 1.6, 1.9, side, x, fy + 1.85, 0.11);
                }
            }
        }
    }

    // ---------- torn curtains moving in the wind ----------
    const curtainMat = new THREE.MeshBasicMaterial({
        map: curtainTex(), transparent: true, depthWrite: false,
        side: THREE.DoubleSide, color: 0xb8bab0
    });

    const curtains = [];

    for (const [side, x, fy] of [["n", WX[1], 4], ["s", WX[2], 8], ["n", WX[3], 8], ["s", WX[0], 4]]) {

        const pivot = new THREE.Group();

        const p = onWall(side, x, fy + 2.75, 0.32);

        pivot.position.set(p.x, p.y, p.z);

        pivot.rotation.y = SIDES[side].ry;

        const cm = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.9), curtainMat);

        cm.position.y = -0.95;

        pivot.add(cm);

        R.group.add(pivot);

        curtains.push({ pivot, ph: rnd() * 6.28, spd: 0.8 + rnd() * 0.7 });
    }

    // ---------- the candle glow drifting from window to window ----------
    const glowMat = () => new THREE.MeshBasicMaterial({
        color: 0xff9a3c, transparent: true, opacity: 0, depthWrite: false
    });

    const glows = [];

    for (const [side, fy] of [["s", 4], ["n", 8]]) {
        for (const x of WX) {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1.6), glowMat());
            const p = onWall(side, x, fy + 1.85, -0.55);
            m.position.set(p.x, p.y, p.z);
            m.rotation.y = SIDES[side].ry;
            R.group.add(m);
            glows.push(m);
        }
    }

    // ---------- crows ----------
    const crowMat = new THREE.MeshBasicMaterial({ color: 0x060606 });

    const crows = [];

    const addCrow = (x, y, z, ry) => {
        const c = crow(crowMat);
        c.position.set(x, y, z);
        c.rotation.y = ry;
        c.scale.setScalar(0.9 + rnd() * 0.3);
        R.group.add(c);
        crows.push({ c, base: ry, next: rnd() * 6 });
    };

    // roof edge (the parapet top is at y 13.3)
    for (let i = 0; i < 7; i++) {
        const side = ["s", "n", "s", "n", "e", "w", "s"][i];
        const along = (rnd() - 0.5) * 26;
        const p = onWall(side, along, 13.42, -0.2);
        addCrow(p.x, p.y, p.z, SIDES[side].ry + (rnd() - 0.5) * 1.6);
    }

    // graveyard fence posts
    for (const [x, z] of [[-24.5, -12], [-24.5, -3], [-17.5, -14], [-21, 7]]) {
        addCrow(x, 1.27, z, rnd() * 6.28);
    }

    // ---------- the watcher ----------
    const watchMat = new THREE.MeshBasicMaterial({
        map: watcherTex(), transparent: true, depthWrite: false,
        opacity: 0, fog: false, side: THREE.DoubleSide
    });

    const watcher = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 3.45), watchMat);

    watcher.position.set(0, -50, 0);

    watcher.renderOrder = 4;

    R.group.add(watcher);

    const W = { op: 0, seen: false, wait: 6, last: 0, up: false };

    const tmpA = new THREE.Vector3();
    const tmpB = new THREE.Vector3();

    const relocate = (pl) => {

        const cam = pl.camera;

        cam.getWorldDirection(tmpA);

        const base = Math.atan2(tmpA.x, tmpA.z);

        for (let k = 0; k < 14; k++) {

            // behind / to the side of where the player is looking
            const a = base + Math.PI * (0.45 + rnd() * 1.1) * (rnd() < 0.5 ? 1 : -1);

            const d = 13 + rnd() * 9;

            const x = cam.position.x + Math.sin(a) * d;
            const z = cam.position.z + Math.cos(a) * d;

            // never inside the hostel, the compound is the stage
            if (Math.abs(x) < 17 && Math.abs(z) < 17) continue;
            if (Math.abs(x) > 55 || Math.abs(z) > 55) continue;

            watcher.position.set(x, 1.72, z);

            return true;
        }

        return false;
    };

    // ---------- one frame function for everything ----------
    let last = null;

    anim.swings.push({
        g: dummy, speed: 0, phase: 0, amp: 0,
        onFrame: (t) => {

            const dt = last === null ? 0.016 : Math.min(0.1, t - last);

            last = t;

            // curtains: a slow breath + gusts
            for (const c of curtains) {
                const gust = Math.max(0, Math.sin(t * 0.37 + c.ph)) ** 3;
                c.pivot.rotation.x =
                    Math.sin(t * c.spd + c.ph) * 0.1 + gust * 0.35;
                c.pivot.rotation.z = Math.sin(t * c.spd * 0.7 + c.ph) * 0.05;
            }

            // candle: lives in one window for ~7 s, then moves on
            const slot = Math.floor(t / 7) % glows.length;
            const within = (t % 7) / 7;
            for (let i = 0; i < glows.length; i++) {
                const target = i === slot
                    ? (Math.sin(Math.min(1, within * 1.15) * Math.PI) *
                       (0.5 + Math.sin(t * 17 + i) * Math.sin(t * 5.1) * 0.12))
                    : 0;
                glows[i].material.opacity +=
                    (target - glows[i].material.opacity) * Math.min(1, dt * 6);
            }

            // crows: a quick turn of the head now and then
            for (const c of crows) {
                c.next -= dt;
                if (c.next <= 0) {
                    c.next = 2 + rnd() * 7;
                    c.c.rotation.y = c.base + (rnd() - 0.5) * 1.1;
                }
            }

            // the watcher
            const pl = getPlayer();

            if (!pl || !pl.camera) return;

            const cam = pl.camera;

            const outside = !(Math.abs(cam.position.x) < 15.5 &&
                              Math.abs(cam.position.z) < 15.5);

            if (!outside) {
                W.op += (0 - W.op) * Math.min(1, dt * 4);
                watchMat.opacity = W.op;
                W.up = false;
                return;
            }

            if (!W.up) {
                W.wait -= dt;
                if (W.wait <= 0 && relocate(pl)) {
                    W.up = true;
                    W.seen = false;
                }
                return;
            }

            tmpB.copy(watcher.position).sub(cam.position);

            const dist = tmpB.length();

            tmpB.normalize();

            cam.getWorldDirection(tmpA);

            const looking = tmpA.dot(tmpB) > 0.9;

            if (looking && W.op > 0.15) W.seen = true;

            if (W.seen) {
                // you turned: it is gone, and comes back somewhere else
                W.op -= dt * 3.2;

                if (W.op <= 0) {
                    W.op = 0;
                    W.up = false;
                    W.wait = 25 + rnd() * 40;
                    watcher.position.y = -50;
                }
            }
            else if (!looking) {
                W.op = Math.min(0.88, W.op + dt * 0.22);
            }

            // it is only ever allowed to be close if you do not look
            if (dist < 6) {
                W.seen = true;
            }

            watchMat.opacity = Math.max(0, W.op);

            // always faces the player
            watcher.rotation.y = Math.atan2(
                cam.position.x - watcher.position.x,
                cam.position.z - watcher.position.z
            );
        }
    });
}
