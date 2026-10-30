import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

import {
    RB, M, U, anim, mulberry32, placeSpider, hangSpider, placeWeb,
    chair, bulb, textTex, canvasTexture, once, blob, bloodDrips,
    newBuilder, cabinet, doll, getNetMaterial, getFloorMaterial, hideSpot,
    applyBoxUV, getPlayer
} from "./haunted.js";

import { portraitTex } from "./hall.js";

import { audio } from "./audio.js";

import { events } from "./events.js";
import { addStation } from "./puzzles.js";
import { addLeverSecret } from "./secrets.js";


// ======================================================
// THE ROOM ON THE TERRACE
//
//   x -4 .. 4      z -12.5 .. -7.5      walls 3.2 high
//   door on the south side, ladder on the east side
//   (the ladder climbs onto the roof of the room)
// ======================================================

const TERRACE_Y = 12;

const WALL_H = 3.2;

const ROOF_Y = 3.4;          // roof top, relative to the terrace

const LADDER_Z = -10;


function pentagramTex() {

    return once("pentagram", () =>
        canvasTexture(512, 512, (g, w, h) => {

            g.clearRect(0, 0, w, h);

            const cx = w / 2;
            const cy = h / 2;

            g.strokeStyle = "rgba(110,6,6,0.9)";
            g.lineWidth = 7;

            g.beginPath();
            g.arc(cx, cy, 235, 0, 6.28);
            g.stroke();

            g.lineWidth = 4;

            g.beginPath();
            g.arc(cx, cy, 205, 0, 6.28);
            g.stroke();

            // five-pointed star
            g.lineWidth = 8;

            g.beginPath();

            for (let i = 0; i <= 5; i++) {

                const a = -Math.PI / 2 + ((i * 2) % 5) * (Math.PI * 2 / 5);

                const px = cx + Math.cos(a) * 205;
                const py = cy + Math.sin(a) * 205;

                if (i === 0) g.moveTo(px, py);
                else g.lineTo(px, py);
            }

            g.stroke();

            // little symbols
            g.fillStyle = "rgba(110,6,6,0.9)";

            g.font = "bold 28px serif";

            g.textAlign = "center";

            const sym = ["X", "O", "T", "V", "Z", "H", "K", "A"];

            for (let i = 0; i < 8; i++) {

                const a = (i / 8) * 6.28;

                g.fillText(
                    sym[i],
                    cx + Math.cos(a) * 220,
                    cy + Math.sin(a) * 220 + 9
                );
            }

            bloodDrips(g, cx, cy + 235, 10, 300, 60, "rgba(110,6,6,0.85)");

            blob(g, cx, cy, 24, "rgba(80,0,0,0.8)");

        }, false)
    );
}

function candle(R, x, z, y) {

    const m = M();

    const wax = new THREE.MeshStandardMaterial({
        color: 0xd8d0b4, roughness: 0.8
    });

    R.cyl(wax, 0.08, 0.2, x, y, z);

    const flame = R._m(
        U.sph,
        once("flameMat", () => new THREE.MeshBasicMaterial({ color: 0xffa83a })),
        0.05, 0.1, 0.05, x, y + 0.26, z, { keep: true }
    );

    anim.flames.push({
        mesh: flame, sx: 0.05, sy: 0.1, phase: Math.random() * 10
    });
}

function mannequin(R, x, z, ry) {

    const m = M();

    const white = once("mannequinMat", () =>
        new THREE.MeshStandardMaterial({ color: 0xd9d4c6, roughness: 0.5 })
    );

    const g = new THREE.Group();

    g.position.set(x, 0, z);

    g.rotation.y = ry;

    R.group.add(g);

    const add = (geo, sx, sy, sz, px, py, pz, rot) => {

        const mesh = new THREE.Mesh(geo, white);

        mesh.scale.set(sx, sy, sz);

        mesh.position.set(px, py, pz);

        if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);

        g.add(mesh);

        R.merge.push(mesh);
    };

    add(U.cyl, 0.16, 0.8, 0.16, -0.09, 0.4, 0);        // legs
    add(U.cyl, 0.16, 0.8, 0.16, 0.09, 0.4, 0);
    add(U.cyl, 0.34, 0.6, 0.2, 0, 1.1, 0);              // body
    add(U.sph, 0.22, 0.28, 0.22, 0, 1.6, 0);            // head
    add(U.cyl, 0.07, 0.6, 0.07, -0.24, 1.15, 0.12, [-1.0, 0, 0]);   // arms out
    add(U.cyl, 0.07, 0.6, 0.07, 0.24, 1.15, 0.12, [-1.0, 0, 0]);

    // dark empty eyes
    const eye = new THREE.Mesh(U.sph, m.dark);

    eye.scale.set(0.05, 0.05, 0.03);

    eye.position.set(-0.06, 1.63, 0.1);

    g.add(eye);

    R.merge.push(eye);

    const eye2 = eye.clone();

    eye2.position.x = 0.06;

    g.add(eye2);

    R.merge.push(eye2);

    const col = new THREE.Mesh(U.box, m.dark);

    col.scale.set(0.6, 1.8, 0.4);

    col.position.set(0, 0.9, 0);

    col.visible = false;

    g.add(col);

    R.cs.add(col);
}

function chain(R, x, z, topY, links) {

    const m = M();

    const g = new THREE.Group();

    g.position.set(x, topY, z);

    for (let i = 0; i < links; i++) {

        const link = new THREE.Mesh(U.box, m.iron);

        link.scale.set(0.045, 0.13, 0.02);

        link.position.y = -i * 0.12;

        link.rotation.y = (i % 2) * Math.PI / 2;

        g.add(link);
    }

    R.group.add(g);

    anim.chains.push({ g, phase: Math.random() * 6 });
}

function netPanel(R, x0, z0, x1, z1, height) {

    const m = M();

    const len = Math.hypot(x1 - x0, z1 - z0);

    const cx = (x0 + x1) / 2;

    const cz = (z0 + z1) / 2;

    const ang = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2;

    const geo = new THREE.PlaneGeometry(len, height);

    const uv = geo.attributes.uv;

    for (let i = 0; i < uv.count; i++) {

        uv.setXY(i, uv.getX(i) * len / 0.4, uv.getY(i) * height / 0.4);
    }

    const net = new THREE.Mesh(geo, getNetMaterial());

    net.position.set(cx, height / 2, cz);

    net.rotation.y = ang;

    R.group.add(net);

    // top rail + posts
    const dirx = (x1 - x0) / len;

    const dirz = (z1 - z0) / len;

    R._m(U.box, m.iron, 0.06, 0.06, len, cx, height, cz, { ry: ang - Math.PI / 2 });

    const n = Math.max(2, Math.round(len / 1.3) + 1);

    for (let i = 0; i < n; i++) {

        const t = n === 1 ? 0 : i / (n - 1);

        R.box(
            m.iron, 0.07, height, 0.07,
            x0 + dirx * len * t, 0, z0 + dirz * len * t
        );
    }

    // blocks the player
    const col = new THREE.Mesh(U.box, m.dark);

    col.scale.set(0.12, height, len);

    col.position.set(cx, height / 2, cz);

    col.rotation.y = ang - Math.PI / 2;

    col.visible = false;

    R.group.add(col);

    R.cs.add(col);
}


// ======================================================
// SAFETY NETS AROUND / OVER THE STAIR OPENINGS (terrace)
// ======================================================

function buildNets(R) {

    const m = M();

    // right stair opening: a walkable net you can see down through
    const geo = new THREE.PlaneGeometry(3.0, 8.0);

    const uv = geo.attributes.uv;

    for (let i = 0; i < uv.count; i++) {

        uv.setXY(i, uv.getX(i) * 3.0 / 0.4, uv.getY(i) * 8.0 / 0.4);
    }

    const net = new THREE.Mesh(geo, getNetMaterial());

    net.rotation.x = -Math.PI / 2;

    net.position.set(13, 0.03, 0);

    R.group.add(net);

    // steel frame + cross bars
    R.box(m.iron, 3.2, 0.08, 0.1, 13, 0, -3.95);

    R.box(m.iron, 3.2, 0.08, 0.1, 13, 0, 3.95);

    R.box(m.iron, 0.1, 0.08, 8.0, 11.5, 0, 0);

    R.box(m.iron, 0.1, 0.08, 8.0, 14.5, 0, 0);

    for (let z = -3; z <= 3; z += 1.5) {

        R.box(m.iron, 3.0, 0.05, 0.05, 13, 0, z);
    }

    // left stair opening (the stairs come up here): fence it
    netPanel(R, -11.5, -2.5, -11.5, 4.0, 1.1);

    netPanel(R, -14.5, 4.0, -11.5, 4.0, 1.1);
}


// ======================================================
// BUILD THE WHOLE TERRACE
// ======================================================

export function buildTerrace(
    scene, collisionSystem, interaction, makeDoor
) {

    const m = M();

    const rng = mulberry32(1313);

    const ctx = {
        scene,
        cs: collisionSystem,
        floorNumber: 4,
        floorHeight: TERRACE_Y,
        interaction
    };

    const R = newBuilder(ctx, 0, TERRACE_Y, 0);

    buildNets(R);

    // ----------------------------------------------------
    // ROOM WALLS
    // ----------------------------------------------------
    R.solid(8.25, WALL_H, 0.25, 0, 0, -12.5);

    R.solid(0.25, WALL_H, 5.25, -4, 0, -10);

    R.solid(0.25, WALL_H, 5.25, 4, 0, -10);

    R.solid(3.425, WALL_H, 0.25, -2.4125, 0, -7.5);

    R.solid(3.425, WALL_H, 0.25, 2.4125, 0, -7.5);

    R.solid(1.4, 0.2, 0.25, 0, 3.0, -7.5);

    // door
    makeDoor(0, TERRACE_Y, -7.5);

    // ----------------------------------------------------
    // ROOF  (you can walk on it)
    // ----------------------------------------------------
    const roofGeo = new THREE.BoxGeometry(8.5, 0.2, 5.5);

    applyBoxUV(roofGeo, 8.5, 0.2, 5.5, 3);

    const roof = new THREE.Mesh(roofGeo, getFloorMaterial());

    roof.position.set(0, WALL_H + 0.1, -10);

    R.group.add(roof);

    collisionSystem.platforms.push({
        x0: -4.25, x1: 4.25,
        z0: -12.75, z1: -7.25,
        y: TERRACE_Y + ROOF_Y
    });

    // low wall round the roof (gap at the ladder)
    R.solid(8.5, 0.5, 0.15, 0, ROOF_Y, -12.7);

    R.solid(8.5, 0.5, 0.15, 0, ROOF_Y, -7.3);

    R.solid(0.15, 0.5, 5.5, -4.2, ROOF_Y, -10);

    R.solid(0.15, 0.5, 2.1, 4.2, ROOF_Y, -11.65);

    R.solid(0.15, 0.5, 2.1, 4.2, ROOF_Y, -8.35);

    // water tank + antenna on the roof
    R.cyl(m.bucket, 1.5, 1.3, -1.8, ROOF_Y + 0.4, -10.6);

    for (const dx of [-0.5, 0.5]) {
        for (const dz of [-0.5, 0.5]) {

            R.box(m.iron, 0.07, 0.4, 0.07, -1.8 + dx, ROOF_Y, -10.6 + dz);
        }
    }

    R.collider(1.6, 1.7, 1.6, -1.8, ROOF_Y, -10.6);

    // climb inside the tank on the roof to hide
    hideSpot(R, {
        x: -1.8, z: -10.6, w: 1.72, h: 2.0, ty: ROOF_Y + 1.0, d: 1.72,
        baseY: ROOF_Y, camY: 1.2, label: "inside the tank",
        exits: [
            [-1.8, -9.0], [-3.4, -10.6], [-0.2, -10.6], [-1.8, -12.0]
        ]
    });

    R.cyl(m.iron, 0.05, 2.8, 2.6, ROOF_Y, -8.3);

    const blinkMat = new THREE.MeshBasicMaterial({ color: 0xff2020 });

    R._m(U.sph, blinkMat, 0.14, 0.14, 0.14, 2.6, ROOF_Y + 2.85, -8.3, { keep: true });

    anim.flick.push({ mat: blinkMat, type: "blink", phase: 1.3 });

    // ----------------------------------------------------
    // LADDER  (east side of the room)
    // ----------------------------------------------------
    const LX = 4.45;

    for (const dz of [-0.25, 0.25]) {

        R.box(m.iron, 0.05, ROOF_Y + 0.55, 0.05, LX, 0, LADDER_Z + dz);
    }

    for (let i = 0; i < 13; i++) {

        R.box(m.iron, 0.04, 0.03, 0.52, LX, 0.25 + i * 0.27, LADDER_Z);
    }

    for (const by of [0.4, 1.8, 3.0]) {

        R.box(m.iron, 0.3, 0.04, 0.04, 4.28, by, LADDER_Z - 0.25);

        R.box(m.iron, 0.3, 0.04, 0.04, 4.28, by, LADDER_Z + 0.25);
    }

    const trigMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });

    const up = new THREE.Mesh(U.box, trigMat);

    up.scale.set(0.7, ROOF_Y, 1.1);

    up.position.set(4.5, ROOF_Y / 2, LADDER_Z);

    up.visible = false;

    R.group.add(up);

    const down = new THREE.Mesh(U.box, trigMat);

    down.scale.set(1.4, 0.3, 1.3);

    down.position.set(3.4, ROOF_Y + 0.15, LADDER_Z);

    down.visible = false;

    R.group.add(down);

    const eyeBase = TERRACE_Y + 1.7;

    const eyeRoof = TERRACE_Y + ROOF_Y + 1.7;

    // The player can look at either trigger from the top or the bottom,
    // so BOTH triggers do whatever fits where the player is standing:
    // low = climb up, on the roof = climb down.
    const onRoof = () => {

        const p = getPlayer();

        return !!p && p.pos.y > TERRACE_Y + ROOF_Y * 0.5 + 1.7;
    };

    const climbUp = () => {

        const p = getPlayer();

        if (!p) return;

        audio.ladder();

        events.emit("ladder");

        p.startPath([
            { x: 4.9, y: eyeBase, z: LADDER_Z, t: 0.45 },
            { x: 4.9, y: eyeRoof + 0.3, z: LADDER_Z, t: 2.4 },
            { x: 3.4, y: eyeRoof, z: LADDER_Z, t: 0.7 }
        ], Math.PI / 2);
    };

    const climbDown = () => {

        const p = getPlayer();

        if (!p) return;

        audio.ladder();

        p.startPath([
            { x: 4.9, y: eyeRoof + 0.3, z: LADDER_Z, t: 0.7 },
            { x: 4.9, y: eyeBase, z: LADDER_Z, t: 2.2 }
        ], Math.PI / 2);
    };

    const prompt = () => onRoof()
        ? "Press E - Climb down"
        : "Press E - Climb the ladder";

    const action = () => (onRoof() ? climbDown() : climbUp());

    up.userData.getPrompt = prompt;

    up.userData.interact = action;

    down.userData.getPrompt = prompt;

    down.userData.interact = action;

    interaction.add(up);

    interaction.add(down);

    // ----------------------------------------------------
    // INSIDE THE ROOM
    // ----------------------------------------------------

    // dim red bulb
    bulb(R, 0, -10, false, "T-R", {
        y: 2.55, top: 3.2, color: 0xff6a4a, light: 0xff3a1a
    });

    // blood circle on the floor
    const pt = pentagramTex();

    if (pt) {

        R.decal(
            new THREE.MeshBasicMaterial({
                map: pt, transparent: true, depthWrite: false,
                polygonOffset: true, polygonOffsetFactor: -2
            }),
            3.4, 3.4, 0, -10, 0.3
        );
    }

    // altar at the back wall with candles and a skull
    const cloth = new THREE.MeshStandardMaterial({
        color: 0x150a0a, roughness: 1
    });

    R.box(cloth, 2.0, 0.95, 0.8, 0, 0, -11.85);

    R.collider(2.0, 0.95, 0.8, 0, 0, -11.85);

    for (let i = 0; i < 7; i++) {

        candle(R, -0.85 + i * 0.28, -11.85 + (i % 2) * 0.15, 0.95);
    }

    // puzzle 6: the seven candles on the altar
    addStation(R.interaction, R.group, {
        id: "candles", label: "Look at the seven candles",
        x: 0, y: 1.0, z: -11.45, sx: 2.4, sy: 0.9, sz: 1.0
    });

    // puzzle 3: the fuse box on the wall beside the door (inside)
    R.box(m.iron, 0.7, 0.9, 0.1, -1.9, 1.15, -7.72);
    for (let i = 0; i < 6; i++) {
        R.box(m.dark, 0.05, 0.14, 0.06, -2.12 + i * 0.085, 1.25, -7.65);
    }
    R.box(m.wood, 0.1, 0.35, 0.06, -1.9, 0.95, -7.65);
    addStation(R.interaction, R.group, {
        id: "fuse", label: "Open the fuse box",
        x: -1.9, y: 1.15, z: -7.85, sx: 0.8, sy: 1.0, sz: 0.5
    });

    // puzzle 8: the lever without a handle + the hidden wall cupboard (secrets.js)
    addLeverSecret(R);

    const bone = new THREE.MeshStandardMaterial({
        color: 0xcfc8b0, roughness: 0.7
    });

    R.sph(bone, 0.24, 0.0, 1.1, -11.75);

    R.box(bone, 0.14, 0.1, 0.12, 0.0, 0.93, -11.68);

    R.sph(m.dark, 0.07, -0.06, 1.12, -11.64);

    R.sph(m.dark, 0.07, 0.06, 1.12, -11.64);

    // photographs with scratched-out faces
    const pTex = portraitTex();

    if (pTex) {

        const pm = new THREE.MeshStandardMaterial({
            map: pTex, roughness: 0.9
        });

        for (let i = 0; i < 5; i++) {

            R.pln(pm, 0.55, 0.75, -3.0 + i * 1.5, 1.95, -12.36, { keep: true });
        }
    }

    // mattress with chains
    R.box(m.mattress, 1.0, 0.15, 2.0, -2.8, 0.1, -10.2);

    R.pln(m.blood, 0.9, 0.9, -2.8, 0.27, -10.0, { rx: -Math.PI / 2 });

    for (const [cx, cz] of [[-3.4, -11.2], [-2.2, -11.2], [-3.4, -9.2], [-2.2, -9.2]]) {

        R.box(m.iron, 0.04, 0.04, 0.5, cx, 0.12, cz, { ry: Math.random() });
    }

    R.collider(1.1, 0.3, 2.1, -2.8, 0, -10.2);

    // two mannequins staring at the door
    mannequin(R, 2.9, -8.4, Math.PI);

    mannequin(R, 3.4, -9.3, Math.PI * 0.9);

    // rocking chair
    R.box(m.wood, 0.5, 0.05, 0.5, 2.9, 0.4, -11.3);

    R.box(m.wood, 0.5, 0.7, 0.05, 2.9, 0.45, -11.55);

    for (const dz of [-0.2, 0.2]) {

        R.box(m.wood, 0.04, 0.04, 0.7, 2.65 + dz * 0, 0.05, -11.3 + dz * 0, {});
    }

    R.box(m.wood, 0.04, 0.04, 0.7, 2.68, 0.05, -11.3);

    R.box(m.wood, 0.04, 0.04, 0.7, 3.12, 0.05, -11.3);

    R.collider(0.6, 1.1, 0.7, 2.9, 0, -11.3);

    // doll shelf
    R.box(m.wood, 0.4, 0.05, 1.6, -3.7, 1.2, -9.0);

    R.box(m.wood, 0.4, 0.05, 1.6, -3.7, 0.6, -9.0);

    for (let i = 0; i < 4; i++) {

        doll(R, -3.7, 1.25, -9.6 + i * 0.4, Math.PI / 2);
    }

    // old TV full of static
    R.box(m.wood, 0.6, 0.45, 0.6, -3.2, 0, -8.4);

    R.box(m.dark, 0.7, 0.55, 0.5, -3.2, 0.45, -8.4);

    const tvMat = new THREE.MeshBasicMaterial({ color: 0x555555 });

    const tvScreen = new THREE.Mesh(U.pln, tvMat);

    tvScreen.scale.set(0.5, 0.38, 1);

    tvScreen.position.set(-2.93, 0.72, -8.4);

    tvScreen.rotation.y = Math.PI / 2;

    R.group.add(tvScreen);

    anim.flick.push({ mat: tvMat, type: "static", phase: 0 });

    R.collider(0.7, 1.0, 0.6, -3.2, 0, -8.4);

    // hanging chains
    chain(R, -1.5, -9.2, WALL_H, 10);

    chain(R, 1.4, -10.8, WALL_H, 9);

    chain(R, 0.6, -8.6, WALL_H, 8);

    chain(R, -1.9, -11.5, WALL_H, 11);

    // boarded window on the north wall
    for (let i = 0; i < 3; i++) {

        R.box(
            m.wood, 1.3, 0.14, 0.05,
            2.6, 1.3 + i * 0.28, -12.34,
            { rz: (i - 1) * 0.08 }
        );
    }

    // writing on the walls
    const w1 = textTex("HE LIVES HERE", "#8a0b0b", 512, 192);

    const w2 = textTex("DON'T LOOK UP", "#8a0b0b", 512, 192);

    if (w1) {

        R.pln(
            new THREE.MeshBasicMaterial({
                map: w1, transparent: true, depthWrite: false,
                polygonOffset: true, polygonOffsetFactor: -2
            }),
            2.6, 1.0, -3.86, 2.0, -10.8, { ry: Math.PI / 2, keep: true }
        );
    }

    if (w2) {

        R.pln(
            new THREE.MeshBasicMaterial({
                map: w2, transparent: true, depthWrite: false,
                polygonOffset: true, polygonOffsetFactor: -2
            }),
            2.6, 1.0, 3.86, 2.0, -10.8, { ry: -Math.PI / 2, keep: true }
        );
    }

    // a place to hide
    cabinet(R, -3.56, -8.2, Math.PI / 2);

    // webs and spiders
    placeWeb(R, -3.84, 2.7, -12.2, 1.5, Math.PI / 2);

    placeWeb(R, 3.84, 2.8, -7.9, 1.5, -Math.PI / 2);

    placeWeb(R, 0.0, 2.9, -12.36, 1.6, 0);

    placeSpider(R, -3.8, 2.4, -12.2, 1.8, Math.PI / 2, Math.PI / 2);

    placeSpider(R, 0.3, 2.6, -12.34, 1.4, 0, Math.PI / 2);

    hangSpider(R, 1.0, -9.8, 1.0, 1.2);

    hangSpider(R, -0.6, -11.0, 0.7, 0.9);

    R.decal(m.blood, 1.8, 1.8, 1.0, -10.3, 2.1);

    // ----------------------------------------------------
    // OUTSIDE ON THE TERRACE
    // ----------------------------------------------------

    // ritual circle in front of the door, ringed with candles
    if (pt) {

        R.decal(
            new THREE.MeshBasicMaterial({
                map: pt, transparent: true, depthWrite: false,
                polygonOffset: true, polygonOffsetFactor: -2
            }),
            4.6, 4.6, 0, -4.0, 0
        );
    }

    for (let i = 0; i < 8; i++) {

        const a = (i / 8) * 6.28;

        candle(R, Math.cos(a) * 2.35, -4.0 + Math.sin(a) * 2.35, 0);
    }

    // clothes line with old gardener dresses and cook uniforms (they sway)
    for (const px of [-10.5, -3.0]) {

        R.cyl(m.iron, 0.07, 2.3, px, 0, 10.5);
    }

    R.box(m.iron, 7.5, 0.02, 0.02, -6.75, 2.2, 10.5);

    // old clothes hanging on the line (they sway in the wind):
    // faded gardener dresses and cook's uniforms
    const clothMat = (color) => new THREE.MeshStandardMaterial({
        color, roughness: 1, side: THREE.DoubleSide
    });

    const dressMat = clothMat(0x4f5a3a);       // faded green gardener dress
    const patchMat = clothMat(0x6b4f2e);       // brown patches
    const coatMat = clothMat(0xa9a28a);        // yellowed cook coat
    const stainMat = clothMat(0x5a1a1a);       // old stains
    const buttonMat = clothMat(0x2a2620);

    const shapeMesh = (pts, mat) => {

        const sh = new THREE.Shape();

        pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));

        return new THREE.Mesh(new THREE.ShapeGeometry(sh), mat);
    };

    const garden = () => {

        const g = new THREE.Group();

        // shoulders, narrow waist, wide ragged hem
        g.add(shapeMesh([
            [-0.2, 0], [0.2, 0], [0.22, -0.4], [0.52, -1.36], [0.4, -1.3],
            [0.28, -1.42], [0.15, -1.32], [0.02, -1.44], [-0.12, -1.33],
            [-0.26, -1.43], [-0.4, -1.3], [-0.52, -1.38], [-0.22, -0.4]
        ], dressMat));

        const patch = shapeMesh([
            [-0.18, -0.8], [0.02, -0.82], [0.0, -1.0], [-0.2, -0.98]
        ], patchMat);

        patch.position.z = 0.004;

        g.add(patch);

        return g;
    };

    const cook = () => {

        const g = new THREE.Group();

        // coat with two hanging sleeves
        g.add(shapeMesh([
            [-0.58, 0], [-0.28, 0], [0.28, 0], [0.58, 0], [0.62, -0.62],
            [0.34, -0.66], [0.3, -1.05], [-0.3, -1.05], [-0.34, -0.66],
            [-0.62, -0.62]
        ], coatMat));

        const stain = shapeMesh([
            [0.02, -0.55], [0.18, -0.6], [0.14, -0.78], [-0.02, -0.74]
        ], stainMat);

        stain.position.z = 0.004;

        g.add(stain);

        for (let k = 0; k < 4; k++) {

            const b = new THREE.Mesh(U.sph, buttonMat);

            b.scale.set(0.035, 0.035, 0.02);

            b.position.set(-0.07, -0.15 - k * 0.22, 0.012);

            g.add(b);
        }

        return g;
    };

    ["garden", "cook", "garden", "cook", "garden"].forEach((kind, i) => {

        const pivot = new THREE.Group();

        pivot.position.set(-9.8 + i * 1.5, 2.2, 10.5);

        pivot.add(kind === "garden" ? garden() : cook());

        R.group.add(pivot);

        anim.sheets.push({
            pivot, phase: Math.random() * 6.28, amp: 0.1 + Math.random() * 0.1
        });
    });

    // water tanks
    for (const [tx, tz] of [[9, -11.5], [11.3, -10]]) {

        R.cyl(m.dark, 1.5, 1.5, tx, 0.5, tz);

        for (const dx of [-0.5, 0.5]) {
            for (const dz of [-0.5, 0.5]) {

                R.box(m.iron, 0.08, 0.5, 0.08, tx + dx, 0, tz + dz);
            }
        }

        R.collider(1.6, 2.0, 1.6, tx, 0, tz);

        // climb inside the water tank to hide
        hideSpot(R, {
            x: tx, z: tz, w: 1.72, h: 2.1, ty: 1.05, d: 1.72, camY: 1.3,
            label: "inside the tank",
            exits: [
                [tx, tz + 1.6], [tx - 1.6, tz], [tx + 1.6, tz], [tx, tz - 1.6]
            ]
        });
    }

    // antenna with a blinking red light
    R.cyl(m.iron, 0.07, 4.2, -10.5, 0, -11);

    R.box(m.iron, 1.2, 0.05, 0.05, -10.5, 3.6, -11);

    const blink2 = new THREE.MeshBasicMaterial({ color: 0xff2020 });

    R._m(U.sph, blink2, 0.16, 0.16, 0.16, -10.5, 4.3, -11, { keep: true });

    anim.flick.push({ mat: blink2, type: "blink", phase: 0 });

    R.collider(0.3, 4.2, 0.3, -10.5, 0, -11);

    // scarecrow watching the stairs
    {
        const sx = 9.5;
        const sz = 6.5;

        R.box(m.wood, 0.1, 2.3, 0.1, sx, 0, sz);

        R.box(m.wood, 1.6, 0.08, 0.08, sx, 1.6, sz);

        R.box(m.cloth, 0.5, 0.9, 0.2, sx, 0.9, sz);

        R.box(m.cloth, 0.3, 0.5, 0.1, sx - 0.65, 1.15, sz);

        R.box(m.cloth, 0.3, 0.5, 0.1, sx + 0.65, 1.15, sz);

        R.sph(m.paper, 0.4, sx, 2.05, sz);

        R.sph(m.dark, 0.08, sx - 0.1, 2.1, sz - 0.18);

        R.sph(m.dark, 0.08, sx + 0.1, 2.1, sz - 0.18);

        R.cyl(m.dark, 0.6, 0.06, sx, 2.2, sz);

        R.cyl(m.dark, 0.28, 0.25, sx, 2.25, sz);

        R.collider(1.6, 2.4, 0.5, sx, 0, sz);
    }

    // rusty cot, broken chairs, rubble, papers
    R.box(m.iron, 0.9, 0.05, 1.9, -9.5, 0.4, -6.5);

    for (const dx of [-0.4, 0.4]) {
        for (const dz of [-0.9, 0.9]) {

            R.box(m.iron, 0.05, 0.4, 0.05, -9.5 + dx, 0, -6.5 + dz);
        }
    }

    R.box(m.mattress, 0.85, 0.12, 1.8, -9.5, 0.45, -6.5, { rz: 0.05 });

    R.collider(1.0, 0.6, 2.0, -9.5, 0, -6.5);

    chair(R, 6.5, -2.5, true);

    chair(R, -6.0, 5.5, true);

    chair(R, 4.0, 8.0, false);

    for (let i = 0; i < 14; i++) {

        R.box(
            m.plaster, 0.1 + rng() * 0.25, 0.08, 0.1 + rng() * 0.25,
            -13 + rng() * 26, 0, -14 + rng() * 28,
            { ry: rng() * 6 }
        );
    }

    for (let i = 0; i < 12; i++) {

        R.pln(
            m.paper, 0.25, 0.32,
            -13 + rng() * 26, 0.015, -13 + rng() * 26,
            { rx: -Math.PI / 2, rz: rng() * 6 }
        );
    }

    // blood, hand prints, writing outside
    R.decal(m.blood, 2.0, 2.0, 5.0, 3.0, 1.2);

    R.decal(m.blood, 1.2, 1.2, -6.0, -1.0, 2.2);

    for (let i = 0; i < 12; i++) {

        R.decal(
            m.foot, 0.22, 0.45,
            -8 + i * 0.7, (i % 2 ? 0.2 : -0.2) + 7.5,
            Math.PI / 2
        );
    }

    const jump = textTex("JUMP", "#8a0b0b", 512, 192);

    if (jump) {

        R.pln(
            new THREE.MeshBasicMaterial({
                map: jump, transparent: true, depthWrite: false,
                polygonOffset: true, polygonOffsetFactor: -2
            }),
            3.4, 1.1, 7.0, 0.65, 14.72, { ry: Math.PI, keep: true }
        );
    }

    const exitTxt = textTex("NO WAY OUT", "#8a0b0b", 512, 192);

    if (exitTxt) {

        R.pln(
            new THREE.MeshBasicMaterial({
                map: exitTxt, transparent: true, depthWrite: false,
                polygonOffset: true, polygonOffsetFactor: -2
            }),
            2.8, 1.0, -2.6, 1.9, -7.36, { keep: true }
        );
    }

    // crows sitting on the wall
    for (let i = 0; i < 10; i++) {

        const side = Math.floor(rng() * 4);

        const t = -13 + rng() * 26;

        const cx = side === 0 ? t : side === 1 ? t : side === 2 ? -14.9 : 14.9;

        const cz = side === 0 ? -14.9 : side === 1 ? 14.9 : t;

        R.sph(m.dark, 0.3, cx, 1.35, cz);

        R.cone = R.cone || null;

        R._m(U.cone, m.dark, 0.1, 0.2, 0.1, cx + 0.12, 1.4, cz, { rz: -1.57 });
    }

    // lanterns on poles (they flicker)
    R.box(m.iron, 0.4, 0.1, 0.4, 1.9, 2.75, -7.15);

    bulb(R, 1.9, -7.15, false, "T", {
        y: 2.55, top: 2.75, color: 0xffb060, light: 0xffa050
    });

    R.cyl(m.iron, 0.1, 2.6, -6.5, 0, 6.5);

    bulb(R, -6.5, 6.5, false, "T", {
        y: 2.6, top: 2.7, color: 0xffb060, light: 0xffa050
    });

    R.cyl(m.iron, 0.1, 2.6, 9.5, 0, -8.0);

    bulb(R, 9.5, -8.0, true, "T", {
        y: 2.6, top: 2.7, color: 0xffb060, light: 0xffa050
    });

    // webs + big spider by the door
    placeWeb(R, -1.2, 2.5, -7.34, 1.2, 0);

    placeSpider(R, -1.3, 2.3, -7.34, 1.4, 0, Math.PI / 2);

    R.finish();

    return R;
}