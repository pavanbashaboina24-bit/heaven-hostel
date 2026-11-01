import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

import {
    RB, M, U, anim, mulberry32, canvasTexture, once, blob, crack,
    bloodDrips, plateTex, textTex, newBuilder, bulb, applyBoxUV,
    registerDoor, mergeMeshes, placeSpider, placeWeb, getPlayer, frameHooks
} from "./haunted.js";

import { events } from "./events.js";
import { inventory } from "./inventory.js";
import { audio } from "./audio.js";
import { story } from "./story.js";
import { locks } from "./locks.js";
import { buildHorror } from "./horror.js";
import { buildBoy } from "./swing.js";
// ======================================================
// THE OUTSIDE OF HAVEN HOSTEL
//
//   - weathered plaster facade (not just green boxes)
//   - cornices, plinth, corner stones, sills, shutters
//   - entrance porch with columns and a gable
//   - tall old stone compound wall, spikes, pillars
//   - an iron gate you open yourself (game starts outside)
//   - dead forest, graveyard, swing, well, wrecked van
//   - patchy dead ground, grass, drifting mist
// ======================================================

const TAPER = new THREE.CylinderGeometry(0.28, 0.5, 1, 7);

const UP = new THREE.Vector3(0, 1, 0);


// ======================================================
// TEXTURES
// ======================================================

function facadeTex() {

    return once("facadeTex", () =>
        canvasTexture(512, 512, (g, w, h) => {

            // faded old plaster
            g.fillStyle = "#8f8468";
            g.fillRect(0, 0, w, h);

            for (let i = 0; i < 5000; i++) {

                const v = 105 + Math.random() * 60;

                g.fillStyle =
                    "rgba(" + v + "," + (v - 8) + "," + (v - 28) + "," +
                    (0.06 + Math.random() * 0.1) + ")";

                g.fillRect(
                    Math.random() * w, Math.random() * h,
                    1 + Math.random() * 4, 1 + Math.random() * 4
                );
            }

            // broken plaster showing red brick
            for (let i = 0; i < 6; i++) {

                const px = Math.random() * (w - 120);
                const py = Math.random() * (h - 100);
                const pw = 50 + Math.random() * 90;
                const ph = 40 + Math.random() * 70;

                g.fillStyle = "#6c3a2b";
                g.fillRect(px, py, pw, ph);

                g.strokeStyle = "rgba(30,18,14,0.9)";
                g.lineWidth = 2;

                for (let y = py; y < py + ph; y += 12) {

                    g.beginPath();
                    g.moveTo(px, y);
                    g.lineTo(px + pw, y);
                    g.stroke();

                    for (let x = px + ((y / 12) % 2) * 12; x < px + pw; x += 24) {

                        g.beginPath();
                        g.moveTo(x, y);
                        g.lineTo(x, y + 12);
                        g.stroke();
                    }
                }

                blob(g, px + pw / 2, py + ph / 2, 8, "rgba(0,0,0,0)");
            }

            // black rain streaks running down from the top
            for (let i = 0; i < 18; i++) {

                const x = Math.random() * w;
                const wd = 6 + Math.random() * 26;

                const gr = g.createLinearGradient(
                    0, 0, 0, h * (0.4 + Math.random() * 0.6)
                );

                gr.addColorStop(0, "rgba(14,12,10,0.55)");
                gr.addColorStop(1, "rgba(14,12,10,0)");

                g.fillStyle = gr;
                g.fillRect(x, 0, wd, h);
            }

            // damp and moss at the bottom
            const dg = g.createLinearGradient(0, h, 0, h - 130);

            dg.addColorStop(0, "rgba(20,26,16,0.75)");
            dg.addColorStop(1, "rgba(20,26,16,0)");

            g.fillStyle = dg;
            g.fillRect(0, h - 130, w, 130);

            // old stains
            for (let i = 0; i < 8; i++) {

                blob(
                    g, Math.random() * w, Math.random() * h,
                    14 + Math.random() * 40, "rgba(40,28,16,0.3)"
                );
            }

            for (let i = 0; i < 7; i++) {

                crack(
                    g, Math.random() * w, Math.random() * h,
                    10 + Math.random() * 14,
                    "rgba(10,8,6,0.8)", 1 + Math.random() * 1.5
                );
            }

        }, true)
    );
}

function stoneTex() {

    return once("stoneTex", () =>
        canvasTexture(512, 256, (g, w, h) => {

            g.fillStyle = "#4b4a46";
            g.fillRect(0, 0, w, h);

            const rowH = 42;

            for (let y = 0; y < h; y += rowH) {

                let x = -((y / rowH) % 2) * 40;

                while (x < w) {

                    const bw = 70 + Math.random() * 60;

                    const v = 66 + Math.random() * 38;

                    g.fillStyle =
                        "rgb(" + v + "," + (v - 2) + "," + (v - 8) + ")";

                    g.fillRect(x + 2, y + 2, bw - 4, rowH - 4);

                    x += bw;
                }
            }

            for (let i = 0; i < 16; i++) {

                blob(
                    g, Math.random() * w, Math.random() * h,
                    10 + Math.random() * 28, "rgba(26,40,20,0.4)"
                );
            }

            for (let i = 0; i < 5; i++) {

                crack(
                    g, Math.random() * w, Math.random() * h,
                    8 + Math.random() * 10, "rgba(8,8,8,0.8)", 1.5
                );
            }

            const mg = g.createLinearGradient(0, h, 0, h - 80);

            mg.addColorStop(0, "rgba(18,30,12,0.65)");
            mg.addColorStop(1, "rgba(18,30,12,0)");

            g.fillStyle = mg;
            g.fillRect(0, h - 80, w, 80);

        }, true)
    );
}

function barkTex() {

    return once("barkTex", () =>
        canvasTexture(256, 256, (g, w, h) => {

            g.fillStyle = "#2b231c";
            g.fillRect(0, 0, w, h);

            // deep vertical fissures with lighter ridges between them
            for (let i = 0; i < 90; i++) {

                const v = 16 + Math.random() * 52;

                g.strokeStyle =
                    "rgba(" + v + "," + (v - 3) + "," + (v - 8) + ",0.85)";

                g.lineWidth = 1.5 + Math.random() * 5;

                g.beginPath();

                let x = Math.random() * w;

                g.moveTo(x, 0);

                for (let y = 0; y < h; y += 14) {

                    x += (Math.random() - 0.5) * 9;

                    g.lineTo(x, y);
                }

                g.stroke();
            }

            // dark cracks
            for (let i = 0; i < 46; i++) {

                g.strokeStyle = "rgba(4,3,2,0.9)";

                g.lineWidth = 1 + Math.random() * 2;

                g.beginPath();

                let x = Math.random() * w;
                let y = Math.random() * h;

                g.moveTo(x, y);

                for (let k = 0; k < 5; k++) {

                    x += (Math.random() - 0.5) * 8;
                    y += 8 + Math.random() * 18;

                    g.lineTo(x, y);
                }

                g.stroke();
            }

            // grey-green lichen and moss patches
            for (let i = 0; i < 22; i++) {

                blob(
                    g, Math.random() * w, Math.random() * h,
                    5 + Math.random() * 16,
                    Math.random() < 0.5
                        ? "rgba(70,84,60,0.45)"
                        : "rgba(120,124,108,0.35)"
                );
            }

            // small knots
            for (let i = 0; i < 4; i++) {

                const kx = Math.random() * w;
                const ky = Math.random() * h;

                g.fillStyle = "rgba(6,4,3,0.85)";
                g.beginPath();
                g.ellipse(kx, ky, 6, 10, 0, 0, 6.28);
                g.fill();

                g.strokeStyle = "rgba(90,80,66,0.7)";
                g.lineWidth = 2;
                g.stroke();
            }

        }, true)
    );
}

function leafTex() {

    return once("leafTex", () =>
        canvasTexture(128, 128, (g, w, h) => {

            g.clearRect(0, 0, w, h);

            for (let i = 0; i < 16; i++) {

                const x = 14 + Math.random() * (w - 28);
                const y = 14 + Math.random() * (h - 28);

                g.save();
                g.translate(x, y);
                g.rotate(Math.random() * 6.28);

                g.fillStyle =
                    "rgba(" + (70 + Math.random() * 50) + "," +
                    (40 + Math.random() * 28) + "," +
                    (14 + Math.random() * 12) + ",0.96)";

                g.beginPath();
                g.ellipse(0, 0, 11 + Math.random() * 5, 4 + Math.random() * 3, 0, 0, 6.28);
                g.fill();

                g.strokeStyle = "rgba(20,10,4,0.8)";
                g.lineWidth = 1;
                g.beginPath();
                g.moveTo(-12, 0);
                g.lineTo(12, 0);
                g.stroke();

                g.restore();
            }

        }, false)
    );
}

function mossTex() {

    return once("mossTex", () =>
        canvasTexture(128, 256, (g, w, h) => {

            g.clearRect(0, 0, w, h);

            // long hanging strands of grey moss
            for (let i = 0; i < 26; i++) {

                const x = 6 + Math.random() * (w - 12);

                g.strokeStyle =
                    "rgba(" + (80 + Math.random() * 30) + "," +
                    (90 + Math.random() * 30) + "," +
                    (76 + Math.random() * 24) + ",0.9)";

                g.lineWidth = 1 + Math.random() * 2;

                g.beginPath();
                g.moveTo(x, 0);

                let px = x;

                for (let y = 0; y < h * (0.5 + Math.random() * 0.5); y += 16) {

                    px += (Math.random() - 0.5) * 7;

                    g.lineTo(px, y);
                }

                g.stroke();
            }

        }, false)
    );
}

function dirtGroundTex() {

    return once("dirtGround", () =>
        canvasTexture(512, 512, (g, w, h) => {

            g.fillStyle = "#26231a";
            g.fillRect(0, 0, w, h);

            // mud, dead grass patches, dark soil, gravel
            for (let i = 0; i < 40; i++) {

                blob(
                    g, Math.random() * w, Math.random() * h,
                    24 + Math.random() * 70,
                    Math.random() < 0.5
                        ? "rgba(56,52,30,0.5)"
                        : "rgba(14,12,9,0.5)"
                );
            }

            for (let i = 0; i < 4500; i++) {

                const v = 30 + Math.random() * 60;

                g.fillStyle =
                    "rgba(" + v + "," + (v - 4) + "," + (v - 18) + ",0.55)";

                g.fillRect(
                    Math.random() * w, Math.random() * h,
                    1 + Math.random() * 3, 1 + Math.random() * 5
                );
            }

            // dead grass blades
            g.lineWidth = 1;

            for (let i = 0; i < 700; i++) {

                const x = Math.random() * w;
                const y = Math.random() * h;

                g.strokeStyle =
                    "rgba(" + (70 + Math.random() * 40) + "," +
                    (64 + Math.random() * 30) + ",30,0.5)";

                g.beginPath();
                g.moveTo(x, y);
                g.lineTo(x + (Math.random() - 0.5) * 8, y - 6 - Math.random() * 10);
                g.stroke();
            }

            // fallen leaves
            for (let i = 0; i < 90; i++) {

                g.fillStyle =
                    "rgba(" + (60 + Math.random() * 40) + "," +
                    (30 + Math.random() * 20) + ",14,0.7)";

                g.beginPath();
                g.ellipse(
                    Math.random() * w, Math.random() * h,
                    2 + Math.random() * 3, 1 + Math.random() * 2,
                    Math.random() * 3, 0, 6.28
                );
                g.fill();
            }

        }, true)
    );
}

function roadTex() {

    return once("roadTex", () =>
        canvasTexture(256, 512, (g, w, h) => {

            g.fillStyle = "#2c2820";
            g.fillRect(0, 0, w, h);

            for (let i = 0; i < 3000; i++) {

                const v = 40 + Math.random() * 50;

                g.fillStyle =
                    "rgba(" + v + "," + (v - 2) + "," + (v - 10) + ",0.6)";

                g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
            }

            // wheel ruts
            for (const rx of [w * 0.28, w * 0.72]) {

                const gr = g.createLinearGradient(rx - 22, 0, rx + 22, 0);

                gr.addColorStop(0, "rgba(8,8,6,0)");
                gr.addColorStop(0.5, "rgba(8,8,6,0.7)");
                gr.addColorStop(1, "rgba(8,8,6,0)");

                g.fillStyle = gr;
                g.fillRect(rx - 22, 0, 44, h);
            }

            // puddles
            for (let i = 0; i < 5; i++) {

                blob(
                    g, Math.random() * w, Math.random() * h,
                    14 + Math.random() * 22, "rgba(10,14,20,0.8)"
                );
            }

        }, false)
    );
}

function grassTex() {

    return once("grassTex", () =>
        canvasTexture(128, 128, (g, w, h) => {

            g.clearRect(0, 0, w, h);

            for (let i = 0; i < 30; i++) {

                const x = 10 + Math.random() * (w - 20);

                g.strokeStyle =
                    "rgba(" + (80 + Math.random() * 50) + "," +
                    (72 + Math.random() * 40) + "," +
                    (30 + Math.random() * 20) + ",0.95)";

                g.lineWidth = 1.5 + Math.random() * 1.5;

                g.beginPath();
                g.moveTo(x, h);
                g.quadraticCurveTo(
                    x + (Math.random() - 0.5) * 24, h * 0.5,
                    x + (Math.random() - 0.5) * 40, h * (0.05 + Math.random() * 0.4)
                );
                g.stroke();
            }

        }, false)
    );
}

function mistTex() {

    return once("mistTex", () =>
        canvasTexture(128, 128, (g, w, h) => {

            const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);

            gr.addColorStop(0, "rgba(150,165,190,0.55)");
            gr.addColorStop(1, "rgba(150,165,190,0)");

            g.fillStyle = gr;
            g.fillRect(0, 0, w, h);

        }, false)
    );
}

function ivyTex() {

    return once("ivyTex", () =>
        canvasTexture(256, 256, (g, w, h) => {

            g.clearRect(0, 0, w, h);

            // dead brown vines with a few dark leaves
            for (let i = 0; i < 9; i++) {

                g.strokeStyle = "rgba(44,34,22,0.95)";
                g.lineWidth = 2 + Math.random() * 2;

                let x = Math.random() * w;
                let y = h;

                g.beginPath();
                g.moveTo(x, y);

                while (y > 0) {

                    x += (Math.random() - 0.5) * 30;
                    y -= 14 + Math.random() * 16;

                    g.lineTo(x, y);

                    if (Math.random() < 0.5) {

                        g.fillStyle =
                            Math.random() < 0.5
                                ? "rgba(46,52,24,0.95)"
                                : "rgba(70,50,24,0.95)";

                        g.beginPath();
                        g.ellipse(
                            x + (Math.random() - 0.5) * 16, y,
                            6 + Math.random() * 5, 3 + Math.random() * 3,
                            Math.random() * 3, 0, 6.28
                        );
                        g.fill();
                    }
                }

                g.stroke();
            }

        }, false)
    );
}


// ======================================================
// MATERIALS
// ======================================================

export function getFacadeMaterial() {

    return once("facadeMat", () => {

        const t = facadeTex();

        return new THREE.MeshStandardMaterial({
            map: t || null,
            color: t ? 0xffffff : 0x8f8468,
            roughness: 0.95,
            // faintly lit by the moon so you can see it from the gate
            emissive: 0x1c2438,
            emissiveMap: t || null,
            emissiveIntensity: 0.55
        });
    });
}

function E() {

    return once("extMats", () => {

        const st = stoneTex();

        const bk = barkTex();

        return {

            stone: new THREE.MeshStandardMaterial({
                map: st || null,
                color: st ? 0xffffff : 0x5a5954,
                roughness: 1,
                emissive: 0x12161e,
                emissiveMap: st || null,
                emissiveIntensity: 0.5
            }),

            bark: new THREE.MeshStandardMaterial({
                map: bk || null,
                bumpMap: bk || null,
                bumpScale: 2.2,
                color: bk ? 0xffffff : 0x2a211a,
                roughness: 1,
                emissive: 0x0c0e14,
                emissiveMap: bk || null,
                emissiveIntensity: 0.4
            }),

            leaves: new THREE.MeshStandardMaterial({
                map: leafTex() || null,
                color: 0xffffff,
                transparent: true,
                alphaTest: 0.4,
                side: THREE.DoubleSide,
                roughness: 1
            }),

            moss: new THREE.MeshStandardMaterial({
                map: mossTex() || null,
                color: 0xffffff,
                transparent: true,
                alphaTest: 0.3,
                side: THREE.DoubleSide,
                roughness: 1
            }),

            mossClump: new THREE.MeshStandardMaterial({
                color: 0x2c3524, roughness: 1
            }),

            rust: new THREE.MeshStandardMaterial({
                color: 0x3a2418, roughness: 0.8, metalness: 0.6
            }),

            blackIron: new THREE.MeshStandardMaterial({
                color: 0x111214, roughness: 0.55, metalness: 0.8
            }),

            wood: new THREE.MeshStandardMaterial({
                color: 0x33261a, roughness: 0.95
            }),

            roofTile: new THREE.MeshStandardMaterial({
                color: 0x2f2320, roughness: 1
            }),

            grass: new THREE.MeshStandardMaterial({
                map: grassTex() || null,
                color: 0xffffff,
                transparent: true,
                alphaTest: 0.35,
                side: THREE.DoubleSide,
                roughness: 1
            }),

            ivy: new THREE.MeshStandardMaterial({
                map: ivyTex() || null,
                color: 0xffffff,
                transparent: true,
                alphaTest: 0.3,
                side: THREE.DoubleSide,
                roughness: 1
            }),

            mist: new THREE.MeshBasicMaterial({
                map: mistTex() || null,
                color: 0x9fb0cc,
                transparent: true,
                opacity: 0.32,
                depthWrite: false,
                side: THREE.DoubleSide,
                fog: false
            }),

            puddle: new THREE.MeshStandardMaterial({
                color: 0x07090d, roughness: 0.4, metalness: 0.2
            }),

            soil: new THREE.MeshStandardMaterial({
                color: 0x1c140e, roughness: 1
            }),

            van: new THREE.MeshStandardMaterial({
                color: 0x4a2a22, roughness: 0.7, metalness: 0.4
            }),

            glassDark: new THREE.MeshStandardMaterial({
                color: 0x080b10, roughness: 0.1, metalness: 0.5
            }),

            bone: new THREE.MeshStandardMaterial({
                color: 0xcfc8b0, roughness: 0.7
            })
        };
    });
}


// ======================================================
// SMALL BUILDERS
// ======================================================

// ------------------------------------------------------
// REAL-LOOKING DEAD TREES
//
// Every limb is a smooth curved tube that gets thinner toward
// the tip, with a bumpy bark surface, flared roots, crooked
// branches, thin twigs, a few dry leaves and hanging moss.
// ------------------------------------------------------

function tubeGeometry(pts, r0, r1, radial, flare, rng) {

    const curve = new THREE.CatmullRomCurve3(pts);

    const segs = Math.max(4, pts.length * 2);

    const positions = [];

    const normals = [];

    const uvs = [];

    const index = [];

    const up = new THREE.Vector3(0, 1, 0);

    const side = new THREE.Vector3(1, 0, 0);

    let lengthSoFar = 0;

    let prev = curve.getPoint(0);

    for (let i = 0; i <= segs; i++) {

        const t = i / segs;

        const c = curve.getPoint(t);

        lengthSoFar += c.distanceTo(prev);

        prev = c;

        const tan = curve.getTangent(t).normalize();

        const ref = Math.abs(tan.dot(up)) > 0.95 ? side : up;

        const n = new THREE.Vector3().crossVectors(tan, ref).normalize();

        const b = new THREE.Vector3().crossVectors(tan, n).normalize();

        // thinner toward the tip, wide flared base, little bulges
        let r = r0 + (r1 - r0) * Math.pow(t, 0.85);

        r *= 1 + flare * Math.pow(1 - t, 5);

        r *= 1 + (rng() - 0.5) * 0.12;

        for (let j = 0; j <= radial; j++) {

            const a = (j / radial) * Math.PI * 2;

            const wob = 1 + Math.sin(a * 3 + i * 1.3) * 0.07;

            const dx = n.x * Math.cos(a) + b.x * Math.sin(a);
            const dy = n.y * Math.cos(a) + b.y * Math.sin(a);
            const dz = n.z * Math.cos(a) + b.z * Math.sin(a);

            positions.push(
                c.x + dx * r * wob,
                c.y + dy * r * wob,
                c.z + dz * r * wob
            );

            normals.push(dx, dy, dz);

            uvs.push(j / radial * Math.max(1, r0 * 6), lengthSoFar * 0.55);
        }
    }

    for (let i = 0; i < segs; i++) {
        for (let j = 0; j < radial; j++) {

            const a = i * (radial + 1) + j;
            const b2 = a + radial + 1;

            index.push(a, b2, a + 1, b2, b2 + 1, a + 1);
        }
    }

    const geo = new THREE.BufferGeometry();

    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));

    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));

    geo.setIndex(index);

    return geo;
}

// ------------------------------------------------------
// KEEP-OUT ZONE: no tree limb may ever enter the hostel.
// The hostel body is |x|,|z| < 15.25 (plus the porch on the
// east side).  Any limb point inside the zone (with a margin
// for the thickness of the branch) is pushed out to the
// nearest edge, so branches bend round the walls instead.
// ------------------------------------------------------
const KEEP = 17.4;          // hostel half-size + branch margin
const PORCH_X = 21.5;       // porch sticks out on the east side
const PORCH_Z = 8.5;

function pushOut(p) {
    if (Math.abs(p.x) < KEEP && Math.abs(p.z) < KEEP) {
        const dx = KEEP - Math.abs(p.x);
        const dz = KEEP - Math.abs(p.z);
        if (dx < dz) p.x = Math.sign(p.x || 1) * KEEP;
        else p.z = Math.sign(p.z || 1) * KEEP;
    }
    if (p.x > 0 && p.x < PORCH_X && Math.abs(p.z) < PORCH_Z) {
        const dxp = PORCH_X - p.x;
        const dzp = PORCH_Z - Math.abs(p.z);
        if (dxp < dzp) p.x = PORCH_X;
        else p.z = Math.sign(p.z || 1) * PORCH_Z;
    }
    return p;
}

function addLimb(R, pts, r0, r1, radial, flare, rng) {

    for (const q of pts) pushOut(q);
const mesh = new THREE.Mesh(
        tubeGeometry(pts, r0, r1, radial, flare, rng), E().bark
    );

    R.group.add(mesh);

    R.merge.push(mesh);
}

function leafCluster(R, pos, size) {

    const e = E();

    const yaw = Math.random() * 3;

    R._m(U.pln, e.leaves, size, size, 1, pos.x, pos.y, pos.z, { ry: yaw, rx: (Math.random() - 0.5) * 0.7 });

    R._m(U.pln, e.leaves, size, size, 1, pos.x, pos.y, pos.z, { ry: yaw + 1.5, rx: (Math.random() - 0.5) * 0.7 });
}

function hangMoss(R, pos, len) {

    const e = E();

    R._m(U.pln, e.moss, 0.5, len, 1, pos.x, pos.y - len / 2, pos.z, { ry: Math.random() * 3 });
}

// a crooked branch that splits into smaller ones
function grow(R, origin, dir, len, r, depth, rng, detail) {

    // 3-4 points that bend and droop a little
    const pts = [origin.clone()];

    let p = origin.clone();

    let d = dir.clone();

    const steps = 3;

    for (let i = 0; i < steps; i++) {

        d.x += (rng() - 0.5) * 0.55;
        d.z += (rng() - 0.5) * 0.55;
        d.y += (rng() - 0.5) * 0.3 - 0.07 * (3 - depth);

        d.normalize();

        p = pushOut(p.clone().addScaledVector(d, len / steps));

        pts.push(p);
    }

    const tip = depth > 0 ? r * 0.5 : r * 0.12;

    addLimb(R, pts, r, tip, detail > 1 ? 6 : 4, 0, rng);

    if (depth <= 0) {

        // a few dry leaves still clinging to the twig ends
        if (detail > 1 && rng() < 0.28) leafCluster(R, p, 0.32 + rng() * 0.2);

        return;
    }

    const kids = depth > 1 ? 2 + Math.floor(rng() * 2) : 2;

    for (let k = 0; k < kids; k++) {

        const t = 0.45 + rng() * 0.5;

        const at = pts[Math.min(pts.length - 1, Math.floor(t * (pts.length - 1)) + 1)];

        const nd = dir.clone();

        nd.x += (rng() - 0.5) * 1.5;
        nd.z += (rng() - 0.5) * 1.5;
        nd.y += (rng() - 0.25) * 0.6;

        nd.normalize();

        grow(R, at, nd, len * (0.55 + rng() * 0.2), r * 0.52, depth - 1, rng, detail);
    }

    // hanging moss from thicker branches
    if (detail > 1 && depth >= 2 && rng() < 0.45) {

        hangMoss(R, pts[2], 0.6 + rng() * 0.8);
    }
}

// one tree.  detail: 2 = full (in the yard), 1 = lighter (forest)
function deadTree(R, x, z, rng, scale, collide, detail) {

    detail = detail || 2;

    const e = E();

    const h = (5.5 + rng() * 4.0) * scale;

    const r = (0.34 + rng() * 0.2) * scale;

    // --- flared roots creeping over the ground ---
    const roots = detail > 1 ? 7 : 4;

    for (let i = 0; i < roots; i++) {

        const a = (i / roots) * 6.28 + rng() * 0.6;

        const len = (1.3 + rng() * 1.4) * scale;

        const pts = [
            new THREE.Vector3(x + Math.cos(a) * 0.1, 0.55 * scale, z + Math.sin(a) * 0.1),
            new THREE.Vector3(x + Math.cos(a) * len * 0.35, 0.18 * scale, z + Math.sin(a) * len * 0.35),
            new THREE.Vector3(x + Math.cos(a + 0.2) * len * 0.7, 0.04, z + Math.sin(a + 0.2) * len * 0.7),
            new THREE.Vector3(x + Math.cos(a + 0.3) * len, -0.08, z + Math.sin(a + 0.3) * len)
        ];

        addLimb(R, pts, r * 0.55, r * 0.07, 5, 0, rng);
    }

    // moss clumps between the roots
    if (detail > 1) {

        for (let i = 0; i < 4; i++) {

            const a = rng() * 6.28;

            R._m(
                U.sph, e.mossClump, 0.5 + rng() * 0.4, 0.22, 0.5 + rng() * 0.4,
                x + Math.cos(a) * r * 1.3, 0.08, z + Math.sin(a) * r * 1.3
            );
        }
    }

    // --- the trunk: bent, tapering, flared at the bottom ---
    const lean = new THREE.Vector3((rng() - 0.5) * 0.5, 0, (rng() - 0.5) * 0.5);

    const trunk = [];

    for (let i = 0; i <= 5; i++) {

        const t = i / 5;

        trunk.push(new THREE.Vector3(
            x + lean.x * h * t * t + Math.sin(t * 5 + x) * 0.18,
            h * t - 0.15,
            z + lean.z * h * t * t + Math.cos(t * 4 + z) * 0.18
        ));
    }

    addLimb(R, trunk, r, r * 0.16, detail > 1 ? 9 : 6, 1.5, rng);

    // a dark hollow knot on the trunk
    if (detail > 1 && rng() < 0.8) {

        const ky = h * (0.12 + rng() * 0.18);

        const a = rng() * 6.28;

        const kx = x + Math.cos(a) * (r * 1.02);
        const kz = z + Math.sin(a) * (r * 1.02);

        R._m(
            U.sph, M().dark, 0.3, 0.46, 0.14,
            kx, ky, kz, { ry: -a + Math.PI / 2 }
        );
    }

    // --- main branches ---
    const nb = detail > 1 ? 6 + Math.floor(rng() * 3) : 4 + Math.floor(rng() * 2);

    for (let i = 0; i < nb; i++) {

        const t = 0.38 + (i / nb) * 0.58;

        const idx = Math.min(trunk.length - 1, Math.floor(t * (trunk.length - 1)) + 1);

        const a = rng() * 6.28 + i * 2.4;

        const dir = new THREE.Vector3(
            Math.cos(a) * 0.85, 0.3 + rng() * 0.75, Math.sin(a) * 0.85
        ).normalize();

        grow(
            R, trunk[idx], dir, (1.9 + rng() * 1.6) * scale,
            r * (0.34 - t * 0.12), detail > 1 ? 3 : 2, rng, detail
        );
    }

    // the broken top
    grow(R, trunk[trunk.length - 1], new THREE.Vector3(rng() - 0.5, 1, rng() - 0.5).normalize(),
        1.3 * scale, r * 0.16, 1, rng, detail);

    // fallen leaves round the base
    if (detail > 1) {

        for (let i = 0; i < 6; i++) {

            const a = rng() * 6.28;

            const d2 = 0.8 + rng() * 2.2;

            R._m(
                U.pln, e.leaves, 0.6, 0.6, 1,
                x + Math.cos(a) * d2, 0.02, z + Math.sin(a) * d2,
                { rx: -Math.PI / 2, rz: rng() * 6 }
            );
        }
    }

    if (collide) {
        R.collider(0.7, 3, 0.7, x, 0, z);
    }
}

// a fallen log lying in the grass
function fallenLog(R, x, z, rng) {

    const a = rng() * 3;

    const len = 3.2 + rng() * 2;

    const dx = Math.cos(a) * len / 2;
    const dz = Math.sin(a) * len / 2;

    const pts = [
        new THREE.Vector3(x - dx, 0.3, z - dz),
        new THREE.Vector3(x - dx * 0.3, 0.34, z - dz * 0.3 + 0.1),
        new THREE.Vector3(x + dx * 0.4, 0.3, z + dz * 0.4),
        new THREE.Vector3(x + dx, 0.26, z + dz)
    ];

    addLimb(R, pts, 0.34, 0.26, 8, 0, rng);

    R.collider(Math.abs(dx) * 2 + 0.5, 0.7, Math.abs(dz) * 2 + 0.5, x, 0, z);
}

function stump(R, x, z, rng) {

    const e = E();

    const pts = [
        new THREE.Vector3(x, -0.05, z),
        new THREE.Vector3(x + 0.04, 0.35, z),
        new THREE.Vector3(x - 0.03, 0.75 + rng() * 0.3, z + 0.03)
    ];

    addLimb(R, pts, 0.42, 0.34, 9, 0.9, rng);

    R._m(U.cyl, e.soil, 0.62, 0.05, 0.62, x - 0.03, 0.9, z + 0.03);

    R.collider(0.9, 1.0, 0.9, x, 0, z);
}

function gravestone(R, x, z, rng, cross) {

    const e = E();

    const yaw = (rng() - 0.5) * 0.7;

    const tilt = (rng() - 0.5) * 0.25;

    // mound of fresh soil
    R.box(e.soil, 1.0, 0.18, 2.0, x, 0, z + 1.0, { ry: yaw });

    // the stone / cross is solid
    R.collider(0.7, 1.3, 0.45, x, 0, z);

    if (cross) {

        R.box(e.stone, 0.12, 1.2, 0.12, x, 0, z, { ry: yaw, rz: tilt });

        R.box(e.stone, 0.6, 0.12, 0.12, x, 0.8, z, { ry: yaw, rz: tilt });
    }
    else {

        R.box(e.stone, 0.6, 0.9 + rng() * 0.4, 0.14, x, 0, z, { ry: yaw, rz: tilt });

        R.cyl(e.stone, 0.6, 0.14, x, 0.9, z, { rx: Math.PI / 2, ry: yaw });
    }
}


// ======================================================
// FACADE  (cornices, plinth, quoins, sills, shutters, ivy, pipes)
// ======================================================

function buildFacade(R, rng) {

    const e = E();

    const m = M();

    const S = 15.25;                   // outer face of the walls

    // dark stone plinth round the bottom
    R.box(e.stone, 30.9, 0.9, 0.5, 0, 0, -S - 0.1);

    R.box(e.stone, 30.9, 0.9, 0.5, 0, 0, S + 0.1);

    R.box(e.stone, 0.5, 0.9, 30.9, -S - 0.1, 0, 0);

    R.box(e.stone, 0.5, 0.9, 14.5, S + 0.1, 0, -8.2);

    R.box(e.stone, 0.5, 0.9, 14.5, S + 0.1, 0, 8.2);

    // cornice bands between the floors and under the roof
    for (const y of [3.78, 7.78, 11.78]) {

        R.box(e.stone, 31.0, 0.26, 0.45, 0, y, -S - 0.07);

        R.box(e.stone, 31.0, 0.26, 0.45, 0, y, S + 0.07);

        R.box(e.stone, 0.45, 0.26, 31.0, -S - 0.07, y, 0);

        R.box(e.stone, 0.45, 0.26, 31.0, S + 0.07, y, 0);
    }

    // corner stones
    for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {

            R.box(e.stone, 0.9, 13.4, 0.9, sx * (S - 0.05), 0, sz * (S - 0.05));

            R.box(e.stone, 1.1, 0.3, 1.1, sx * (S - 0.05), 13.4, sz * (S - 0.05));
        }
    }

    // roof edge: capped parapet, chimneys, lightning rod
    R.box(e.stone, 31.0, 0.2, 0.7, 0, 13.2, -S + 0.2);

    R.box(e.stone, 31.0, 0.2, 0.7, 0, 13.2, S - 0.2);

    R.box(e.stone, 0.7, 0.2, 31.0, -S + 0.2, 13.2, 0);

    R.box(e.stone, 0.7, 0.2, 31.0, S - 0.2, 13.2, 0);

    for (const [cx, cz] of [[-8.5, 6.5], [9.5, -4.5]]) {

        R.box(e.stone, 1.1, 3.2, 1.1, cx, 12.0, cz);

        R.box(e.stone, 1.4, 0.25, 1.4, cx, 15.2, cz);

        R.collider(1.1, 3.2, 1.1, cx, 12.0, cz);
    }

    R.cyl(e.blackIron, 0.05, 3.0, 11.5, 12.0, 11.5);

    // windows: sill, head stone, crooked shutters
    const wx = [-11.6, -4.6, 4.6, 11.6];

    for (const fy of [0, 4, 8]) {
        for (const side of [-1, 1]) {
            for (const x of wx) {

                const z = side * S;

                // stone sill + head
                R.box(e.stone, 2.1, 0.14, 0.45, x, fy + 0.9, z + side * 0.08);

                R.box(e.stone, 2.1, 0.22, 0.4, x, fy + 2.8, z + side * 0.05);

                // shutters hang open at odd angles, some are missing
                for (const s of [-1, 1]) {

                    if (rng() < 0.22) continue;

                    const open = 0.5 + rng() * 1.0;

                    const hang = (rng() - 0.5) * 0.18;

                    const px = x + s * 0.95;

                    R.box(
                        e.wood, 0.8, 1.9, 0.05,
                        px + s * 0.4 * Math.cos(open),
                        fy + 0.95,
                        z + side * (0.1 + 0.4 * Math.sin(open)),
                        { ry: -s * side * open, rz: hang }
                    );
                }
            }
        }
    }

    // down-pipes on the corners
    for (const [px, pz] of [[-S - 0.2, -8], [S + 0.2, 8], [-8, S + 0.2], [8, -S - 0.2]]) {

        R.cyl(e.rust, 0.14, 12.6, px, 0, pz);

        for (let y = 1; y < 12; y += 3) {
            R.box(e.rust, 0.22, 0.05, 0.22, px, y, pz);
        }
    }

    // dead vines creeping up the walls
    const ivyPlace = [
        [-S - 0.04, 6, -6, 3.4, 6.5, -Math.PI / 2],
        [-S - 0.04, 5, 8, 3.0, 8.5, -Math.PI / 2],
        [S + 0.04, 7, -9, 3.4, 7.5, Math.PI / 2],
        [-6, 6, S + 0.04, 3.6, 7.5, 0],
        [7, 5, S + 0.04, 3.2, 8.5, 0],
        [-8, 6, -S - 0.04, 3.4, 7.5, Math.PI],
        [6, 5.5, -S - 0.04, 3.8, 8.5, Math.PI],
        [13, 5, S + 0.04, 2.6, 7.0, 0]
    ];

    for (const [ix, iy, iz, iw, ih, iry] of ivyPlace) {

        R.pln(e.ivy, iw, ih, ix, iy, iz, { ry: iry });
    }

    // cracks in the plaster and hand prints on the outside
    for (let i = 0; i < 5; i++) {

        R.pln(
            m.hand, 0.3, 0.3,
            -9 + rng() * 6, 1.0 + rng() * 1.2, S + 0.02,
            { rz: (rng() - 0.5) * 0.6 }
        );
    }

    // web high up under the cornices
    placeWeb(R, -14.9, 11.2, -14.9, 2.2, Math.PI / 4);
}


// ======================================================
// ENTRANCE PORCH  (columns, roof, gable, lanterns)
// ======================================================

function buildPorch(R, rng) {

    const e = E();

    const m = M();

    // porch slab
    R.box(e.stone, 3.6, 0.03, 5.0, 16.9, 0, 0);

    // two steps up to the door (visual)
    R.box(e.stone, 0.5, 0.03, 3.0, 18.95, 0, 0);

    // columns
    for (const cz of [-2.1, 2.1]) {

        R.cyl(e.stone, 0.55, 3.67, 18.2, 0.03, cz);

        R.cyl(e.stone, 0.75, 0.2, 18.2, 0.03, cz);

        R.cyl(e.stone, 0.75, 0.2, 18.2, 3.5, cz);

        R.collider(0.6, 3.6, 0.6, 18.2, 0, cz);
    }

    // porch roof slab
    R.box(e.stone, 3.7, 0.3, 5.4, 16.9, 3.7, 0);

    // gable (triangle) above the roof slab, facing east
    const shape = new THREE.Shape();

    shape.moveTo(-2.7, 0);
    shape.lineTo(2.7, 0);
    shape.lineTo(0, 1.5);
    shape.lineTo(-2.7, 0);

    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.35, bevelEnabled: false
    });

    const gable = new THREE.Mesh(geo, e.stone);

    gable.rotation.y = Math.PI / 2;

    gable.position.set(18.5, 4.0, 0);

    R.group.add(gable);

    R.merge.push(gable);

    // stone surround of the front door
    R.box(e.stone, 0.3, 3.2, 0.3, 15.35, 0, -1.0);

    R.box(e.stone, 0.3, 3.2, 0.3, 15.35, 0, 1.0);

    R.box(e.stone, 0.35, 0.3, 2.4, 15.35, 3.1, 0);

    // skull over the door with red eyes
    R.sph(M().plaster, 0.34, 15.5, 3.55, 0);

    R.sph(m.eyes, 0.07, 15.66, 3.6, -0.09);

    R.sph(m.eyes, 0.07, 15.66, 3.6, 0.09);

    // porch lanterns (flicker)
    for (const [lz, dead] of [[-2.1, false], [2.1, true]]) {

        R.box(e.blackIron, 0.3, 0.4, 0.3, 17.85, 2.7, lz);

        bulb(R, 17.85, lz, dead, "Y", {
            y: 2.9, top: 3.1, color: 0xffc070, light: 0xffaa55
        });
    }

    // old hanging sign swinging in the wind
    const swing = new THREE.Group();

    swing.position.set(17.0, 3.65, 0);

    const sg = plateTex("HAVEN HOSTEL");

    const board = new THREE.Mesh(
        U.pln,
        new THREE.MeshStandardMaterial({
            map: sg || null, color: sg ? 0xffffff : 0x1d2a22,
            side: THREE.DoubleSide, roughness: 0.8
        })
    );

    board.scale.set(1.8, 0.62, 1);

    board.position.set(0, -0.6, 0);

    board.rotation.y = Math.PI / 2;

    swing.add(board);

    for (const dz of [-0.8, 0.8]) {

        const ch = new THREE.Mesh(U.box, e.blackIron);

        ch.scale.set(0.02, 0.3, 0.02);

        ch.position.set(0, -0.15, dz);

        swing.add(ch);
    }

    R.group.add(swing);

    anim.swings.push({ g: swing, speed: 1.1, phase: 0, amp: 0.1 });
}


// ======================================================
// COMPOUND WALL + GATE
// ======================================================

const WALL = 27;              // half-size of the compound

const WALL_H = 2.7;

const GATE_HALF = 1.9;        // half width of the gate opening

function wallSegment(R, x0, z0, x1, z1) {

    const e = E();

    const len = Math.hypot(x1 - x0, z1 - z0);

    const horiz = Math.abs(z1 - z0) < 0.01;

    const w = horiz ? len : 0.55;

    const d = horiz ? 0.55 : len;

    const g = new THREE.BoxGeometry(w, WALL_H, d);

    applyBoxUV(g, w, WALL_H, d, 2.5);

    const mesh = new THREE.Mesh(g, e.stone);

    mesh.position.set((x0 + x1) / 2, WALL_H / 2, (z0 + z1) / 2);

    R.group.add(mesh);

    R.cs.add(mesh);

    // iron spikes along the top
    const n = Math.floor(len / 0.4);

    for (let i = 0; i <= n; i++) {

        const t = i / n;

        const px = x0 + (x1 - x0) * t;

        const pz = z0 + (z1 - z0) * t;

        R._m(
            U.cone, e.blackIron, 0.09, 0.45, 0.09,
            px, WALL_H + 0.22, pz, {}
        );
    }

    R.box(e.blackIron, horiz ? len : 0.05, 0.05, horiz ? 0.05 : len,
        (x0 + x1) / 2, WALL_H + 0.1, (z0 + z1) / 2);
}

function buildCompound(R, rng) {

    const e = E();

    const m = M();

    const W = WALL;

    // four sides (east side is split for the gate)
    wallSegment(R, -W, -W, W, -W);

    wallSegment(R, -W, W, W, W);

    wallSegment(R, -W, -W, -W, W);

    wallSegment(R, W, -W, W, -GATE_HALF - 0.6);

    wallSegment(R, W, GATE_HALF + 0.6, W, W);

    // stone pillars every 9 m
    for (let t = -W; t <= W; t += 9) {

        for (const [px, pz] of [[t, -W], [t, W], [-W, t]]) {

            R.box(e.stone, 0.95, 3.4, 0.95, px, 0, pz);

            R.box(e.stone, 1.15, 0.2, 1.15, px, 3.4, pz);
        }

        if (Math.abs(t) > 4) R.box(e.stone, 0.95, 3.4, 0.95, W, 0, t);
    }

    // rubble where the wall has crumbled
    for (const [rx, rz] of [[-14, W - 0.3], [10, -W + 0.3], [-W + 0.3, 9], [W - 0.3, -15]]) {

        for (let i = 0; i < 9; i++) {

            R.box(
                e.stone, 0.2 + rng() * 0.4, 0.2 + rng() * 0.3, 0.2 + rng() * 0.4,
                rx + (rng() - 0.5) * 2.2, 0, rz + (rng() - 0.5) * 1.2,
                { ry: rng() * 6, rz: (rng() - 0.5) * 0.4 }
            );
        }
    }

    // dead vines on the wall (inside)
    for (const [vx, vz, vr] of [[-8, W - 0.32, Math.PI], [12, -W + 0.32, 0], [-W + 0.32, -6, Math.PI / 2]]) {

        R.pln(e.ivy, 3.2, 2.6, vx, 1.4, vz, { ry: vr });
    }

    // crows on the wall
    for (let i = 0; i < 12; i++) {

        const side = Math.floor(rng() * 3);

        const t = -W + rng() * 2 * W;

        const cx = side === 0 ? t : side === 1 ? t : -W;

        const cz = side === 0 ? -W : side === 1 ? W : t;

        R.sph(m.dark, 0.3, cx, WALL_H + 0.68, cz);

        R._m(U.cone, m.dark, 0.1, 0.22, 0.1, cx + 0.14, WALL_H + 0.72, cz, { rz: -1.57 });
    }
}

// the gate: two iron leaves you can open
function buildGate(R, rng) {

    const e = E();

    const m = M();

    const W = WALL;

    const GH = 3.0;                    // gate height

    // gate pillars with skulls and lanterns
    for (const pz of [-GATE_HALF - 0.6, GATE_HALF + 0.6]) {

        R.box(e.stone, 1.2, 4.2, 1.2, W, 0, pz);

        R.box(e.stone, 1.5, 0.28, 1.5, W, 4.2, pz);

        R.collider(1.2, 4.2, 1.2, W, 0, pz);

        // skull on top, glowing eyes
        R.sph(e.bone, 0.38, W, 4.7, pz);

        R.box(e.bone, 0.24, 0.12, 0.22, W + 0.06, 4.45, pz);

        R.sph(m.eyes, 0.08, W + 0.17, 4.75, pz - 0.1);

        R.sph(m.eyes, 0.08, W + 0.17, 4.75, pz + 0.1);

        // lantern bolted to the pillar
        R.box(e.blackIron, 0.3, 0.45, 0.3, W + 0.75, 2.6, pz);

        bulb(R, W + 0.75, pz, pz > 0, "Y", {
            y: 2.8, top: 3.1, color: 0xd8e8a8, light: 0xcfe0a0
        });
    }

    // iron arch over the gate, with a swinging sign
    R.box(e.blackIron, 0.2, 0.2, 2 * GATE_HALF + 1.2, W, 4.3, 0);

    const sg = plateTex("HAVEN HOSTEL");

    const swing = new THREE.Group();

    swing.position.set(W, 4.3, 0);

    const board = new THREE.Mesh(
        U.pln,
        new THREE.MeshStandardMaterial({
            map: sg || null, color: sg ? 0xffffff : 0x1d2a22,
            side: THREE.DoubleSide, roughness: 0.8
        })
    );

    board.scale.set(2.8, 0.9, 1);

    board.position.y = -0.98;

    board.rotation.y = Math.PI / 2;

    swing.add(board);

    // the sign hangs from the arch: 2 thick chains reach down to
    // an iron rail along the top of the board, and a rail below it
    for (const dz of [-1.2, 1.2]) {

        const ch = new THREE.Mesh(U.box, e.blackIron);

        ch.scale.set(0.06, 0.55, 0.06);

        ch.position.set(0, -0.27, dz);

        swing.add(ch);
    }

    for (const ry of [-0.53, -1.43]) {

        const rail = new THREE.Mesh(U.box, e.blackIron);

        rail.scale.set(0.07, 0.07, 2.95);

        rail.position.set(0, ry, 0);

        swing.add(rail);
    }

    R.group.add(swing);

    anim.swings.push({ g: swing, speed: 0.7, phase: 1.1, amp: 0.07 });

    // warning plate on the pillar
    const warn = plateTex("TURN BACK");

    if (warn) {

        // iron frame bolted flat onto the pillar, plate on top of it
        R.box(e.blackIron, 0.05, 0.44, 1.0, W + 0.625, 1.48, -GATE_HALF - 0.6);

        R.pln(
            new THREE.MeshStandardMaterial({ map: warn, roughness: 0.8 }),
            0.9, 0.34, W + 0.655, 1.7, -GATE_HALF - 0.6,
            { ry: Math.PI / 2, keep: true }
        );
    }

    // ---------------- the two gate leaves ----------------
    const leaves = [];

    for (const side of [-1, 1]) {

        // hinge on the pillar side
        const pivot = new THREE.Group();

        pivot.position.set(W, 0, side * GATE_HALF);

        R.group.add(pivot);

        const ldir = -side;                // leaf extends toward the centre

        // frame + bars
        const add = (mat, sx, sy, sz, px, py, pz, o) => {

            const mesh = new THREE.Mesh(
                o && o.cyl ? U.cyl : (o && o.cone ? U.cone : U.box), mat
            );

            mesh.scale.set(sx, sy, sz);

            mesh.position.set(px, py, pz);

            pivot.add(mesh);

            return mesh;
        };

        const lw = GATE_HALF;                // leaf width

        add(e.blackIron, 0.07, 0.1, lw, 0, 0.35, ldir * lw / 2);

        add(e.blackIron, 0.07, 0.1, lw, 0, GH - 0.35, ldir * lw / 2);

        add(e.blackIron, 0.07, 0.1, lw, 0, GH * 0.55, ldir * lw / 2);

        add(e.blackIron, 0.1, GH, 0.1, 0, GH / 2, ldir * 0.05);

        add(e.blackIron, 0.1, GH, 0.1, 0, GH / 2, ldir * (lw - 0.05));

        const nb = 9;

        for (let i = 1; i < nb; i++) {

            const pz = ldir * (lw * i / nb);

            add(e.blackIron, 0.045, GH - 0.3, 0.045, 0, GH / 2, pz);

            // spear tip
            add(e.blackIron, 0.1, 0.3, 0.1, 0, GH + 0.05, pz, { cone: true });
        }

        // ornamental ring in the middle
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.28, 0.025, 6, 16), e.blackIron
        );

        ring.rotation.y = Math.PI / 2;

        ring.position.set(0, GH * 0.7, ldir * lw / 2);

        pivot.add(ring);

        // rust and blood hand print on the bars
        const hp = new THREE.Mesh(U.pln, m.hand);

        hp.scale.set(0.35, 0.35, 1);

        hp.position.set(0.06, 1.3, ldir * lw * 0.6);

        hp.rotation.y = Math.PI / 2;

        pivot.add(hp);

        // invisible solid body so you cannot walk through a closed gate
        const body = new THREE.Mesh(U.box, m.dark);

        body.scale.set(0.12, GH, lw);

        body.position.set(0, GH / 2, ldir * lw / 2);

        body.visible = false;

        body.userData.pivot = pivot;

        pivot.add(body);

        R.cs.add(body);

        // invisible trigger (thicker than the body)
        const trig = new THREE.Mesh(
            U.box, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
        );

        trig.scale.set(0.5, GH - 0.4, lw);

        trig.position.set(0, GH / 2, ldir * lw / 2);

        trig.visible = false;

        pivot.add(trig);

        leaves.push({ pivot, trig, ldir });
    }

    // chain and padlock hanging on the left leaf
    {
        const chainG = new THREE.Group();

        chainG.position.set(0.1, 1.5, 0.0);

        for (let i = 0; i < 9; i++) {

            const link = new THREE.Mesh(U.box, e.blackIron);

            link.scale.set(0.07, 0.04, 0.12);

            link.position.set(0, -i * 0.07, 0);

            link.rotation.x = (i % 2) * Math.PI / 2;

            chainG.add(link);
        }

        const lock = new THREE.Mesh(U.box, e.rust);

        lock.scale.set(0.12, 0.16, 0.08);

        lock.position.set(0, -0.72, 0);

        chainG.add(lock);

        leaves[0].pivot.add(chainG);

        locks.register(() => { chainG.visible = !inventory.flag("gate_broken"); });

        chainG.position.z = leaves[0].ldir * 0.9;

        anim.swings.push({ g: chainG, speed: 1.3, phase: 0.4, amp: 0.05 });
    }

    // both leaves swing inward (toward the hostel, -x):
    // a leaf pointing +z opens with a negative angle, -z with a positive one
    const handles = leaves.map((lf) =>
        registerDoor(lf.pivot, 0, -lf.ldir * 1.7, false, "gate")
    );

    let gateHits = 0;

    // ---- THE TRAP: you open the gate, walk in ... and it closes behind you.
    // Heaven Hostel stays locked until Ramu's story is over.
    const lockedIn = () => inventory.flag("gate_locked_in");

    frameHooks.push(() => {

        if (lockedIn() || !inventory.flag("gate_broken") || !handles[0].isOpen) return;

        const p = getPlayer();

        // far enough inside that the swinging leaves cannot touch you
        if (!p || p.hidden || story.busy || p.pos.x > W - 2.8 || Math.abs(p.pos.z) > 6) return;

        inventory.setFlag("gate_locked_in");

        handles.forEach((hd) => hd.setOpen(false));

        setTimeout(() => {

            audio.play("slam", { vol: 1.3, send: 0.3, ui: true });

            audio.lockHit(3);

            story.lockedIn();

        }, 700);
    });

    const toggleAll = () => {

        // the chain and padlock: break them with the stone
        if (!inventory.flag("gate_broken")) {

            if (!inventory.has("gate_stone")) {

                audio.doorLocked();

                inventory.say("The gate is chained shut with a rusty padlock. Something heavy might break it.", 4);

                return;
            }

            gateHits++;

            if (gateHits < 3) {

                audio.lockHit(gateHits);

                inventory.say(gateHits === 1 ? "CLANG. The padlock dents." : "CLANG. The lock is bending...", 2.5);
            }
            else {

                audio.lockHit(3);

                gateHits = 0;

                inventory.remove("gate_stone");

                inventory.setFlag("gate_broken");

                inventory.say("The lock snaps. The chain slides to the ground.", 3.5);

                locks.refresh();

                story.refresh();
            }

            return;
        }

        if (lockedIn()) {

            audio.doorLocked();

            inventory.say("The gate will not move. The chain is wrapped tight.\nRamu is watching you.", 3.5);

            return;
        }

        const next = !handles[0].isOpen;

        handles.forEach((hd) => hd.setOpen(next));

        if (next) events.emit("gate");
    };

    leaves.forEach((lf) => {

        lf.trig.userData.getPrompt = () =>
            !inventory.flag("gate_broken")
                ? (inventory.has("gate_stone") ? "Press E - Smash the lock with the stone" : "Press E - The gate is chained shut")
                : lockedIn() ? "The gate is locked"
                : "Press E - " + (handles[0].isOpen ? "Close" : "Open") + " the gate";

        lf.trig.userData.interact = toggleAll;

        if (R.interaction) R.interaction.add(lf.trig);
    });

    return handles;
}


// ======================================================
// GROUND, ROAD, FOREST, GRAVEYARD, PROPS
// ======================================================

function buildGround(scene) {

    const e = E();

    const t = dirtGroundTex();

    if (t) t.repeat.set(160, 160);

    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(900, 900),
        new THREE.MeshStandardMaterial({
            map: t || null,
            color: t ? 0xffffff : 0x1b1f15,
            roughness: 1,
            emissive: 0x0a0c10,
            emissiveMap: t || null,
            emissiveIntensity: 0.5
        })
    );

    ground.rotation.x = -Math.PI / 2;

    ground.position.y = -0.04;

    scene.add(ground);

    // dirt road from the gate out into the forest
    const rt = roadTex();

    if (rt) {

        rt.wrapS = rt.wrapT = THREE.RepeatWrapping;

        rt.repeat.set(1, 14);
    }

    const road = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 70),
        new THREE.MeshStandardMaterial({
            map: rt || null,
            color: rt ? 0xffffff : 0x2c2820,
            roughness: 1,
            emissive: 0x0a0c10,
            emissiveMap: rt || null,
            emissiveIntensity: 0.45
        })
    );

    road.rotation.set(-Math.PI / 2, 0, Math.PI / 2);

    road.position.set(WALL + 35, -0.02, 0);

    scene.add(road);

    // road continues inside the gate up to the porch
    const inner = road.clone();

    inner.geometry = new THREE.PlaneGeometry(3.4, WALL - 18);

    inner.rotation.set(-Math.PI / 2, 0, Math.PI / 2);

    inner.position.set((WALL + 18) / 2 + 0.4, -0.015, 0);

    scene.add(inner);
}

function buildProps(R, rng) {

    const e = E();

    const m = M();

    // puddles on the road
    for (const [px, pz, s] of [[34, 1.2, 1.8], [41, -1.5, 2.4], [50, 1.0, 2.0], [23, -1.1, 1.5]]) {

        R._m(U.pln, e.puddle, s, s * 0.6, 1, px, 0.012, pz, { rx: -Math.PI / 2 });
    }

    // wrecked van at the side of the road
    {
        const vx = 46;
        const vz = 6.5;

        R.box(e.van, 5.0, 1.5, 2.1, vx, 0.5, vz, { ry: 0.25 });

        R.box(e.van, 2.0, 1.0, 2.0, vx + 1.1, 1.9, vz + 0.1, { ry: 0.25 });

        R.box(e.glassDark, 0.04, 0.7, 1.8, vx + 2.15, 2.0, vz - 0.05, { ry: 0.25 });

        for (const [dx, dz] of [[-1.6, -1.1], [-1.6, 1.1], [1.6, -1.1], [1.6, 1.1]]) {

            R.cyl(m.dark, 0.8, 0.3, vx + dx, 0.0, vz + dz, { rx: Math.PI / 2, ry: 0.25 });
        }

        // open rear door, blood on the side
        R.box(e.van, 0.08, 1.4, 1.0, vx - 2.6, 0.55, vz + 1.6, { ry: 1.5 });

        R.pln(m.blood, 1.4, 1.0, vx - 0.5, 1.0, vz + 1.07, { ry: 0.25 + Math.PI });

        R.collider(5.0, 2.4, 2.2, vx, 0, vz);
    }

    // wooden warning sign by the road: a post with the board bolted flat
    // onto its road side (-x); the lettering sits right on the board
    R.box(e.wood, 0.14, 2.7, 0.14, 40, 0, -3.2);

    R.box(e.wood, 0.1, 0.75, 1.5, 39.9, 1.7, -3.2);

    // cross brace behind the board
    R.box(e.wood, 0.06, 0.08, 1.5, 40.04, 1.9, -3.2);

    // bolts through the board into the post
    R.box(e.blackIron, 0.03, 0.07, 0.07, 39.84, 1.72, -3.2);

    R.box(e.blackIron, 0.03, 0.07, 0.07, 39.84, 2.4, -3.2);

    const warn = textTex("TURN BACK", "#8a0b0b", 512, 192);

    if (warn) {

        R.pln(
            new THREE.MeshBasicMaterial({
                map: warn, transparent: true, depthWrite: false,
                polygonOffset: true, polygonOffsetFactor: -2
            }),
            1.4, 0.6, 39.84, 2.075, -3.2,
            { ry: -Math.PI / 2, keep: true }
        );
    }

    // roadside lamp that flickers (lights the start)
    R.cyl(e.blackIron, 0.12, 4.4, 36, 0, -3.0);

    R.box(e.blackIron, 0.5, 0.1, 0.5, 36, 4.4, -3.0);

    bulb(R, 36, -3.0, false, "Y", {
        y: 4.2, top: 4.4, color: 0xd8e8a8, light: 0xcfe0a0
    });

    // lamp post near the porch
    R.cyl(e.blackIron, 0.12, 4.2, 20.5, 0, -4.5);

    R.box(e.blackIron, 0.5, 0.1, 0.5, 20.5, 4.2, -4.5);

    bulb(R, 20.5, -4.5, false, "Y", {
        y: 4.05, top: 4.2, color: 0xd8e8a8, light: 0xcfe0a0
    });

    // old well
    {
        const wx = -10;
        const wz = -21;

        R.cyl(e.stone, 1.6, 0.9, wx, 0, wz);

        R.cyl(m.dark, 1.15, 0.05, wx, 0.88, wz);

        for (const s of [-1, 1]) {
            R.box(e.wood, 0.1, 1.9, 0.1, wx + s * 0.8, 0.9, wz);
        }

        R.box(e.wood, 1.9, 0.1, 0.12, wx, 2.7, wz);

        R.cyl(e.wood, 0.1, 1.2, wx, 2.2, wz, { rz: Math.PI / 2 });

        R.collider(1.7, 2.8, 1.7, wx, 0, wz);
    }

    // swing hanging from a dead tree
    {
        const tx = 14;
        const tz = -21;

        const sw = new THREE.Group();

        sw.position.set(tx, 3.4, tz);

        for (const dz of [-0.25, 0.25]) {

            const rope = new THREE.Mesh(U.box, e.wood);

            rope.scale.set(0.025, 2.4, 0.025);

            rope.position.set(0.10, -1.2, dz);

            sw.add(rope);
        }

        const seat = new THREE.Mesh(U.box, e.wood);

        seat.scale.set(0.46, 0.05, 0.7);
            seat.position.set(0.08, -2.4, 0);

        sw.add(seat);

        R.group.add(sw);

        const swingAnim = { g: sw, speed: 0.8, phase: 0.3, amp: 0.2 };

        anim.swings.push(swingAnim);

        // ---- the player can sit on the swing and swing (key C) ----
        const EYE_LOCAL = new THREE.Vector3(-0.17, -1.715, 0);
        // the boy (14 years old): hands on the ropes, arms, shirt, legs.
        // He sits facing +x - the direction the swing moves - so the
        // player looks STRAIGHT ahead along the swing, not at its side.
        const boyWrap = new THREE.Group();
        boyWrap.rotation.y = Math.PI / 2;
        boyWrap.position.set(-0.07, -0.05, 0);
        const boy = buildBoy();
        boyWrap.add(boy);
        sw.add(boyWrap);
        let prevEyeX = null;
        let legU = 0;

        let riding = false;

        let lastT = 0;

        const trig = new THREE.Mesh(
            U.box, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
        );

        trig.scale.set(0.9, 1.6, 1.1);

        trig.position.set(0, -1.9, 0);

        trig.visible = false;

        trig.userData.key = "C";

        sw.add(trig);

        if (R.interaction) R.interaction.add(trig);

        trig.userData.getPrompt = () =>
            riding ? "Press C - Get off the swing" : "Press C - Sit on the swing";

        trig.userData.interact = () => {

            const p = getPlayer();

            if (!p) return;

                        if (riding) {
                riding = false;
                boy.visible = false;
                p.exitHide();
                return;
            }

            // a free place to step off: in front of the swing
            let exit = null;

            for (const [ex, ez] of [
                [tx, tz + 1.7], [tx + 1.5, tz + 1.2], [tx - 1.5, tz + 1.2], [tx, tz + 2.6]
            ]) {

                const pt = new THREE.Vector3(ex, 1.7, ez);

                if (!exit) exit = pt;

                if (!p.collisionSystem.check(pt, p.playerRadius, p.playerHeight)) {

                    exit = pt;

                    break;
                }
            }

            sw.updateMatrixWorld(true);

            const eye = sw.localToWorld(EYE_LOCAL.clone());

                        riding = true;
            lastT = 0;
            boy.visible = true;
            prevEyeX = null;
            // yaw -PI/2 = facing +x (along the swing's motion); you may
            // look around, and look DOWN to see your hands and legs
            p.enterHide({
                pos: eye, yaw: -Math.PI / 2, pitch: 0, exit, rest: true,
                yawRange: 1.6, pitchMin: -1.3, pitchMax: 0.7
            });
        };

        // ---- the letter is sewn inside the seat (after Ramu's last wish) ----
        const sitHandler = trig.userData.interact;
        const sitPrompt = trig.userData.getPrompt;
        const letterTime = () => inventory.flag("wish_known") && !inventory.flag("letter_found");
        Object.defineProperty(trig.userData, "key", { get: () => (letterTime() ? "E" : "C"), configurable: true });
        trig.userData.getPrompt = () => letterTime() ? "Press E - Cut open the swing seat" : sitPrompt();
        trig.userData.interact = () => {
            if (!letterTime()) { sitHandler(); return; }
            if (!inventory.has("blade")) { inventory.say("The stitching is tight. You need something sharp.", 3); return; }
            audio.paper();
            story.findLetter();
        };

        // every frame: the swing swings harder while you ride, and the
        // camera moves with the seat
        swingAnim.onFrame = (t) => {

            const dt = Math.min(0.1, Math.max(0, t - lastT));

            lastT = t;

            const targetSpeed = riding ? 1.9 : 0.8;

            const targetAmp = riding ? 0.62 : 0.2;

            // change speed without a jump in the swing's phase
            const newSpeed = swingAnim.speed + (targetSpeed - swingAnim.speed) * Math.min(1, dt * 0.8);

            swingAnim.phase += t * (swingAnim.speed - newSpeed);

            swingAnim.speed = newSpeed;

            swingAnim.amp += (targetAmp - swingAnim.amp) * Math.min(1, dt * (riding ? 0.35 : 0.5));

            if (riding) {

                const p = getPlayer();

                if (!p || !p.hidden) {

                    riding = false;

                    return;
                }

                                sw.updateMatrixWorld(true);
                p.pos.copy(sw.localToWorld(EYE_LOCAL.clone()));
                // keep the camera exactly on the seat THIS frame
                p.camY = p.pos.y;
                p.camera.position.copy(p.pos);
                // legs kick out going forward and tuck going back
                if (prevEyeX !== null && dt > 0) {
                    const vx = (p.pos.x - prevEyeX) / dt;
                    const u = Math.max(-1, Math.min(1, vx / 2.6));
                    legU += (u - legU) * Math.min(1, dt * 10);
                    for (const sh of boy.userData.shins) {
                        sh.rotation.x = -0.32 - 0.75 * legU;
                    }
                }
                prevEyeX = p.pos.x;
            }
            else {
                boy.visible = false;
            }
        };

        // the tree the swing hangs from: thick trunk, a branch
        // reaching out over the swing, and a brace under the branch
        deadTree(R, tx, tz - 1.4, rng, 1.15, true, 2);

        // thick branch from the trunk out over the swing
        R.box(e.bark, 0.24, 0.24, 2.7, tx, 3.25, tz - 0.2);

        R.box(e.bark, 0.15, 0.15, 1.1, tx, 2.8, tz - 0.9, { rx: -0.75 });
    }

    // scarecrow in the garden
    {
        const sx = -15;
        const sz = 17;

        R.box(e.wood, 0.1, 2.3, 0.1, sx, 0, sz);

        R.box(e.wood, 1.6, 0.08, 0.08, sx, 1.6, sz);

        R.box(m.cloth, 0.5, 0.9, 0.2, sx, 0.9, sz);

        R.sph(m.paper, 0.4, sx, 2.05, sz);

        R.sph(m.dark, 0.08, sx - 0.1, 2.1, sz - 0.18);

        R.sph(m.dark, 0.08, sx + 0.1, 2.1, sz - 0.18);

        R.cyl(m.dark, 0.6, 0.06, sx, 2.2, sz);

        R.cyl(m.dark, 0.28, 0.25, sx, 2.25, sz);

        R.collider(1.6, 2.4, 0.5, sx, 0, sz);
    }
}

function buildGraveyard(R, rng) {

    const e = E();

    // small iron fence round the graveyard.
    // The east side (towards the hostel) has an open gap at z -6.2 .. -3.8
    const GAP0 = -6.2;
    const GAP1 = -3.8;

    for (let i = 0; i <= 20; i++) {

        const z = -17 + i * 1.2;

        R.box(e.blackIron, 0.05, 1.0, 0.05, -24.5, 0, z);

        if (z > GAP0 + 0.01 && z < GAP1 - 0.01) continue;

        R.box(e.blackIron, 0.05, 1.0, 0.05, -17.5, 0, z);
    }

    for (let x = -24.5; x <= -17.5; x += 1.2) {

        R.box(e.blackIron, 0.05, 1.0, 0.05, x, 0, -17);

        R.box(e.blackIron, 0.05, 1.0, 0.05, x, 0, 7);
    }

    for (const zz of [-17, 7]) {
        R.box(e.blackIron, 7, 0.05, 0.05, -21, 0.8, zz);
    }

    R.box(e.blackIron, 0.05, 0.05, 24, -24.5, 0.8, -5);

    R.box(e.blackIron, 0.05, 0.05, GAP0 + 17, -17.5, 0.8, (-17 + GAP0) / 2);

    R.box(e.blackIron, 0.05, 0.05, 7 - GAP1, -17.5, 0.8, (GAP1 + 7) / 2);

    // invisible walls so the fence really blocks the player
    R.collider(7.3, 6.0, 0.5, -21, 0, -17);

    R.collider(7.3, 6.0, 0.5, -21, 0, 7);

    R.collider(0.5, 6.0, 24.3, -24.5, 0, -5);

    R.collider(0.5, 6.0, GAP0 + 17, -17.5, 0, (-17 + GAP0) / 2);

    R.collider(0.5, 6.0, 7 - GAP1, -17.5, 0, (GAP1 + 7) / 2);

    // graves
    let k = 0;

    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 3; col++) {

            gravestone(
                R, -23.2 + col * 2.3 + (rng() - 0.5) * 0.4,
                -15 + row * 4.2 + (rng() - 0.5) * 0.5,
                rng, (k++ % 3) === 0
            );
        }
    }

    // a weeping figure in a hood
    R.cyl(e.stone, 0.8, 0.5, -21, 0, 1.0);

    R.box(e.stone, 0.5, 1.5, 0.4, -21, 0.5, 1.0);

    R.sph(e.stone, 0.4, -21, 2.2, 1.0);

    R.box(e.stone, 0.8, 0.12, 0.3, -21, 1.8, 1.0);

    R.collider(0.9, 2.4, 0.9, -21, 0, 1.0);
}

function buildGrass(R, rng) {

    const e = E();

    // tufts of dead grass, away from the road and the porch
    for (let i = 0; i < 420; i++) {

        const x = -26 + rng() * 52;
        const z = -26 + rng() * 52;

        // keep the path to the door and the building clear
        if (Math.abs(x) < 15.8 && Math.abs(z) < 15.8) continue;

        if (x > 15 && Math.abs(z) < 2.4) continue;

        const s = 0.5 + rng() * 0.7;

        const yaw = rng() * 3;

        R._m(U.pln, e.grass, s, s, 1, x, s / 2, z, { ry: yaw });

        R._m(U.pln, e.grass, s, s, 1, x, s / 2, z, { ry: yaw + 1.57 });
    }
}

function buildForest(R, rng) {

    const trees = [];

    // inside the compound (solid)
        // (all of them stand well away from the hostel walls, the
    //  graveyard (x -26..-16, z -18..8) and the porch)
    const inner = [
        [-23, -22], [-24, 14], [-22, 22], [-6, -24], [6, -25],
        [20, -22], [24, -12], [23, 13], [20, 23], [8, 24],
        [-8, 24], [-23, -12], [-1, 22], [2, -23]
    ];

    for (const [tx, tz] of inner) {
        deadTree(R, tx, tz, rng, 1.0 + rng() * 0.25, true, 2);
    }

    // stumps and a fallen log or two in the yard
    for (const [sx, sz] of [[-12, -14], [9, 16], [-4, 18], [19, -17]]) {
        stump(R, sx, sz, rng);
    }

    fallenLog(R, -13, 21, rng);   // (moved: the back stairs stand at -20.5 / 12)

    fallenLog(R, 7, -21, rng);

    // forest outside the wall - a dense ring, with the road kept open
    let placed = 0;

    let tries = 0;

    while (placed < 78 && tries < 800) {

        tries++;

        const a = rng() * 6.28;

        const d = 31 + rng() * 38;

        const tx = Math.cos(a) * d;

        const tz = Math.sin(a) * d;

        // keep the dirt road open
        if (tx > 24 && Math.abs(tz) < 6) continue;

        if (Math.max(Math.abs(tx), Math.abs(tz)) < 30) continue;

        deadTree(R, tx, tz, rng, 1.0 + rng() * 0.5, true, 1);

        placed++;
    }
}

function buildMist(scene) {

    const e = E();

    const rng = mulberry32(99);

    for (let i = 0; i < 16; i++) {

        const size = 16 + rng() * 14;

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), e.mist);

        mesh.rotation.x = -Math.PI / 2;

        const a = rng() * 6.28;

        const d = 31 + rng() * 30;

        const x0 = Math.cos(a) * d;

        const z0 = Math.sin(a) * d;

        mesh.position.set(x0, 0.35 + rng() * 0.9, z0);

        scene.add(mesh);

        anim.mist.push({
            mesh, x0, z0,
            speed: 0.05 + rng() * 0.08,
            range: 2 + rng() * 3,
            phase: rng() * 6
        });
    }
}


// ======================================================
// BUILD EVERYTHING OUTSIDE
// ======================================================

export function buildExterior(scene, collisionSystem, interaction) {

    const rng = mulberry32(31337);

    const ctx = {
        scene,
        cs: collisionSystem,
        floorNumber: 1,
        floorHeight: 0,
        interaction
    };

    buildGround(scene);

    buildMist(scene);

    const R = newBuilder(ctx, 0, 0, 0);

        buildFacade(R, rng);
    buildHorror(R, rng, E(), anim);
buildPorch(R, rng);

    buildCompound(R, rng);

    buildGate(R, rng);

    buildProps(R, rng);

    buildGraveyard(R, rng);

    R.finish();

    // grass and the forest are merged separately so the quality
    // setting can switch them off on slow computers
    const track = (fn) => {

        const before = scene.children.length;

        const B = newBuilder(ctx, 0, 0, 0);

        fn(B);

        B.finish();

        return scene.children.slice(before).filter((c) => c.isMesh);
    };

    scene.userData.grass = track((B) => buildGrass(B, rng));

    scene.userData.forest = track((B) => buildForest(B, rng));

    scene.userData.mist = anim.mist.map((m) => m.mesh);
}