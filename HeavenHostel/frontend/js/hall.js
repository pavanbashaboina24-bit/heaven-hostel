import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

import {
    RB, M, U, anim, mulberry32, placeSpider, hangSpider, placeWeb,
    chair, bulb, textTex, canvasTexture, once, blob, crack,
    bloodDrips, plateTex, mergeMeshes, newBuilder, cabinet, signTex,
    hideSpot
} from "./haunted.js";

import { addReadable, inventory } from "./inventory.js";
import { locks } from "./locks.js";
import { addStation } from "./puzzles.js";
import { addBookcase, addRatHole } from "./secrets.js";
import { addSecretDoor } from "./mystery.js";
import { RECEPTION_NOTE } from "./clues.js";

import { BOOKS } from "./lore.js";


// ======================================================
// MATERIALS ONLY THE HALLS NEED
// ======================================================

function H() {

    return once("hallMats", () => ({

        wood: new THREE.MeshStandardMaterial({
            color: 0x4a3524, roughness: 0.85
        }),

        woodDark: new THREE.MeshStandardMaterial({
            color: 0x2c1f15, roughness: 0.9
        }),

        sofa: new THREE.MeshStandardMaterial({
            color: 0x27403c, roughness: 1
        }),

        sofaTorn: new THREE.MeshStandardMaterial({
            color: 0x1a2826, roughness: 1
        }),

        felt: new THREE.MeshStandardMaterial({
            color: 0x1c4a2a, roughness: 0.9
        }),

        steel: new THREE.MeshStandardMaterial({
            color: 0x6d7378, roughness: 0.45, metalness: 0.7
        }),

        blue: new THREE.MeshStandardMaterial({
            color: 0x1d4468, roughness: 0.5
        }),

        plate: new THREE.MeshStandardMaterial({
            color: 0xb8bcc0, roughness: 0.4, metalness: 0.6
        }),

        tvBody: new THREE.MeshStandardMaterial({
            color: 0x141414, roughness: 0.6
        }),

        static: new THREE.MeshBasicMaterial({ color: 0x555555 }),

        book: [
            new THREE.MeshStandardMaterial({ color: 0x5a1f1f }),
            new THREE.MeshStandardMaterial({ color: 0x1f3a5a }),
            new THREE.MeshStandardMaterial({ color: 0x3a4a1f }),
            new THREE.MeshStandardMaterial({ color: 0x5a4a1f }),
            new THREE.MeshStandardMaterial({ color: 0x2a2a2a })
        ],

        rug: new THREE.MeshStandardMaterial({
            color: 0x3a1818, roughness: 1
        }),

        redLight: new THREE.MeshBasicMaterial({ color: 0xff2020 })
    }));
}

export function portraitTex() {

    return once("portrait", () =>
        canvasTexture(160, 220, (g, w, h) => {

            g.fillStyle = "#2a2118";
            g.fillRect(0, 0, w, h);

            g.fillStyle = "#14100c";
            g.fillRect(10, 10, w - 20, h - 20);

            // body
            g.fillStyle = "#0b0b0b";
            g.beginPath();
            g.ellipse(w / 2, h - 20, 58, 70, 0, 0, 6.28);
            g.fill();

            // face
            g.fillStyle = "#8d8472";
            g.beginPath();
            g.ellipse(w / 2, 92, 30, 40, 0, 0, 6.28);
            g.fill();

            // eyes scratched out
            g.strokeStyle = "#650606";
            g.lineWidth = 4;

            for (const ex of [-12, 12]) {

                g.beginPath();
                g.moveTo(w / 2 + ex - 8, 80);
                g.lineTo(w / 2 + ex + 8, 96);
                g.moveTo(w / 2 + ex + 8, 80);
                g.lineTo(w / 2 + ex - 8, 96);
                g.stroke();
            }

            bloodDrips(g, w / 2, 98, 5, 40, 60, "rgba(110,6,6,0.85)");

            g.fillStyle = "#d8cfae";
            g.font = "11px Arial, sans-serif";
            g.textAlign = "center";
            g.fillText("WARDEN  1962 - 1987", w / 2, h - 12);

        }, false)
    );
}

function clockTex() {

    return once("clock", () =>
        canvasTexture(128, 128, (g, w, h) => {

            g.fillStyle = "#cfc7a8";
            g.beginPath();
            g.arc(64, 64, 60, 0, 6.28);
            g.fill();

            g.strokeStyle = "#1a1a1a";
            g.lineWidth = 6;
            g.stroke();

            g.lineWidth = 3;

            for (let i = 0; i < 12; i++) {

                const a = (i / 12) * 6.28;

                g.beginPath();
                g.moveTo(64 + Math.cos(a) * 50, 64 + Math.sin(a) * 50);
                g.lineTo(64 + Math.cos(a) * 57, 64 + Math.sin(a) * 57);
                g.stroke();
            }

            // stuck at 3:07
            g.lineWidth = 5;

            g.beginPath();
            g.moveTo(64, 64);
            g.lineTo(64 + 34, 64 + 3);
            g.stroke();

            g.lineWidth = 3;

            g.beginPath();
            g.moveTo(64, 64);
            g.lineTo(64 + 8, 64 - 44);
            g.stroke();

            blob(g, 90, 95, 14, "rgba(100,6,6,0.5)");

        }, false)
    );
}

function pingpongTex() {

    return once("ppTex", () =>
        canvasTexture(256, 128, (g, w, h) => {

            g.fillStyle = "#1c4a2a";
            g.fillRect(0, 0, w, h);

            g.strokeStyle = "#cfd6cf";
            g.lineWidth = 3;

            g.strokeRect(4, 4, w - 8, h - 8);

            g.beginPath();
            g.moveTo(w / 2, 4);
            g.lineTo(w / 2, h - 4);
            g.stroke();

            for (let i = 0; i < 6; i++) {
                blob(g, Math.random() * w, Math.random() * h, 8 + Math.random() * 12,
                    "rgba(10,10,6,0.35)");
            }

        }, false)
    );
}


// ======================================================
// FURNITURE
// ======================================================

function table(R, x, z, sx, sz, opts) {

    const h = H();

    const top = R.box(h.wood, sx, 0.05, sz, x, 0.74, z);

    for (const dx of [-1, 1]) {
        for (const dz of [-1, 1]) {

            R.box(
                h.woodDark, 0.07, 0.74, 0.07,
                x + dx * (sx / 2 - 0.08),
                0,
                z + dz * (sz / 2 - 0.08)
            );
        }
    }

    // thick plank under the top
    R.box(h.woodDark, sx - 0.2, 0.08, 0.06, x, 0.64, z);

    R.collider(sx, 0.8, sz, x, 0, z);

    // long tables: hide under them (carrom table is too small)
    if (sx >= 1.8) {

        hideSpot(R, {
            x, z, w: sx + 0.1, h: 0.85, d: sz + 0.1, camY: 0.3,
            label: "under the table",
            exits: [
                [x, z - sz / 2 - 0.9], [x, z + sz / 2 + 0.9],
                [x - sx / 2 - 0.8, z], [x + sx / 2 + 0.8, z]
            ]
        });
    }

    return top;
}

function bench(R, x, z, sx, sz, broken) {

    const h = H();

    R.box(
        h.wood, sx, 0.05, sz, x, 0.42, z,
        broken ? { rz: 0.08 } : undefined
    );

    for (const dx of [-1, 1]) {
        for (const dz of [-1, 1]) {

            R.box(
                h.woodDark, 0.05, 0.42, 0.05,
                x + dx * (sx / 2 - 0.1),
                0,
                z + dz * (sz / 2 - 0.05)
            );
        }
    }

    R.collider(sx, 0.45, sz, x, 0, z);

    // sit on the bench, facing the table (the middle line z = 0)
    const dirZ = z > 0.3 ? -1 : 1;

    hideSpot(R, {
        x, z, w: sx + 0.1, h: 1.3, ty: 0.65, d: sz + 0.1, camY: 1.1,
        rest: true, look: [0, dirZ], verb: "Sit on the bench", upLabel: "Stand up",
        exits: [
            [x, z - dirZ * 0.9], [x - 1.2, z - dirZ * 0.9],
            [x + 1.2, z - dirZ * 0.9], [x - sx / 2 - 0.7, z], [x + sx / 2 + 0.7, z],
            [x, z + dirZ * 0.9], [x - 1.0, z + dirZ * 0.9], [x + 1.0, z + dirZ * 0.9]
        ]
    });
}

function dishes(R, x, z, sx, sz, rng, y) {

    const h = H();

    for (let i = 0; i < 5; i++) {

        const px = x + (rng() - 0.5) * (sx - 0.5);
        const pz = z + (rng() - 0.5) * (sz - 0.2);

        if (rng() < 0.6) {
            R.cyl(h.plate, 0.26, 0.02, px, y, pz);
        }
        else {
            R.cyl(h.steel, 0.07, 0.1, px, y, pz);
        }
    }
}

function sofa(R, x, z, ry) {

    const h = H();

    const g = new THREE.Group();

    g.position.set(x, 0, z);

    g.rotation.y = ry;

    R.group.add(g);

    const part = (mat, sx, sy, sz, px, py, pz, o) => {

        const m = new THREE.Mesh(U.box, mat);

        m.scale.set(sx, sy, sz);

        m.position.set(px, py + sy / 2, pz);

        if (o) m.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0);

        g.add(m);

        R.merge.push(m);
    };

    // faces +z
    part(h.sofa, 2.0, 0.4, 0.85, 0, 0.12, 0);

    part(h.sofaTorn, 2.0, 0.5, 0.18, 0, 0.5, -0.34, { rx: -0.1 });

    part(h.sofa, 0.2, 0.3, 0.85, -0.95, 0.4, 0);

    part(h.sofa, 0.2, 0.3, 0.85, 0.95, 0.4, 0);

    for (const lx of [-0.75, 0.75]) {
        part(h.woodDark, 0.06, 0.14, 0.06, lx, 0, 0.35);
    }

    // torn patch
    part(h.dark || M().dark, 0.5, 0.01, 0.4, 0.3, 0.53, 0.1);

    // collider
    const col = new THREE.Mesh(U.box, M().dark);

    col.scale.set(2.0, 0.9, 0.9);

    col.position.set(0, 0.45, 0);

    col.visible = false;

    g.add(col);

    R.cs.add(col);

    // sit on the sofa (it faces +z in its own turn)
    const fx = Math.sin(ry);

    const fz = Math.cos(ry);

    const sx = Math.cos(ry);

    const sz = -Math.sin(ry);

    hideSpot(R, {
        x, z, w: 2.12, h: 1.3, ty: 0.65, d: 1.02, ry, camY: 1.1,
        rest: true, look: [fx, fz], verb: "Sit on the sofa", upLabel: "Stand up",
        exits: [
            [x + fx * 1.1, z + fz * 1.1],
            [x + fx * 1.1 + sx * 0.8, z + fz * 1.1 + sz * 0.8],
            [x + fx * 1.1 - sx * 0.8, z + fz * 1.1 - sz * 0.8],
            [x - fx * 1.1, z - fz * 1.1]
        ]
    });
}

function tvUnit(R, x, z, ry) {

    const h = H();

    const g = new THREE.Group();

    g.position.set(x, 0, z);

    g.rotation.y = ry;

    R.group.add(g);

    const part = (mat, sx, sy, sz, px, py, pz) => {

        const m = new THREE.Mesh(U.box, mat);

        m.scale.set(sx, sy, sz);

        m.position.set(px, py + sy / 2, pz);

        g.add(m);

        R.merge.push(m);
    };

    part(h.woodDark, 1.2, 0.55, 0.5, 0, 0, 0);

    part(h.tvBody, 0.8, 0.6, 0.55, 0, 0.55, 0);

    // screen: flickers with static
    const mat = new THREE.MeshBasicMaterial({ color: 0x444444 });

    const screen = new THREE.Mesh(U.pln, mat);

    screen.scale.set(0.62, 0.42, 1);

    screen.position.set(0, 0.85, 0.285);

    g.add(screen);

    anim.flick.push({ mat, type: "static", phase: 0 });

    const col = new THREE.Mesh(U.box, M().dark);

    col.scale.set(1.2, 1.2, 0.55);

    col.position.set(0, 0.6, 0);

    col.visible = false;

    g.add(col);

    R.cs.add(col);
}

function bookshelf(R, x, z, ry, rng) {

    const h = H();

    const g = new THREE.Group();

    g.position.set(x, 0, z);

    g.rotation.y = ry;

    R.group.add(g);

    const part = (mat, sx, sy, sz, px, py, pz) => {

        const m = new THREE.Mesh(U.box, mat);

        m.scale.set(sx, sy, sz);

        m.position.set(px, py + sy / 2, pz);

        g.add(m);

        R.merge.push(m);
    };

    // faces +z. 1.6 wide, 0.35 deep, 2.0 high
    part(h.woodDark, 0.04, 2.0, 0.35, -0.8, 0, 0);

    part(h.woodDark, 0.04, 2.0, 0.35, 0.8, 0, 0);

    part(h.woodDark, 1.6, 2.0, 0.03, 0, 0, -0.16);

    for (let s = 0; s < 5; s++) {
        part(h.woodDark, 1.6, 0.03, 0.35, 0, s * 0.45, 0);
    }

    for (let s = 0; s < 4; s++) {

        let px = -0.72;

        while (px < 0.7) {

            if (rng() < 0.15) { px += 0.2; continue; }

            const w = 0.05 + rng() * 0.06;

            const bh = 0.25 + rng() * 0.15;

            part(
                h.book[Math.floor(rng() * h.book.length)],
                w, bh, 0.22, px + w / 2, s * 0.45 + 0.03, 0
            );

            px += w + 0.01;
        }
    }

    const col = new THREE.Mesh(U.box, M().dark);

    col.scale.set(1.6, 2.0, 0.35);

    col.position.set(0, 1.0, 0);

    col.visible = false;

    g.add(col);

    R.cs.add(col);

    // two books stick out of the shelf: they can be read, then kept or put back
    if (R.interaction) {

        const tag = "shelf" + Math.round(x * 10) + "_" + Math.round(z * 10);

        const br = mulberry32(Math.round(x * 100 + z * 10) + 777);

        const cover = [0x6a1e1e, 0x1e3a6a, 0x5a4a1e, 0x1e5a3a];

        for (let k = 0; k < 2; k++) {

            const t = BOOKS[Math.floor(br() * BOOKS.length)];

            const plank = (k === 0 ? 1 : 2) * 0.45 + 0.03;

            const px = -0.55 + k * 0.85 + br() * 0.2;

            const mesh = new THREE.Mesh(
                U.box,
                new THREE.MeshStandardMaterial({
                    color: cover[Math.floor(br() * cover.length)], roughness: 0.9
                })
            );

            mesh.scale.set(0.07, 0.34, 0.24);

            mesh.position.set(px, plank + 0.17, 0.09);

            g.add(mesh);

            addReadable(R.interaction, g, {
                id: "book_" + tag + "_" + k, title: t.title, text: t.text,
                kind: "book", mesh, x: px, y: plank + 0.17, z: 0.12, size: 0.38
            });
        }
    }
}

function pingpong(R, x, z) {

    const h = H();

    const tex = pingpongTex();

    const topMat = tex
        ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 })
        : h.felt;

    R.box(topMat, 2.74, 0.05, 1.52, x, 0.74, z);

    for (const dx of [-1, 1]) {
        for (const dz of [-1, 1]) {

            R.box(h.steel, 0.06, 0.74, 0.06, x + dx * 1.2, 0, z + dz * 0.65);
        }
    }

    // torn net
    R.pln(M().web, 1.5, 0.15, x, 0.88, z, { ry: Math.PI / 2 });

    R.box(h.plate, 0.04, 0.15, 1.5, x, 0.79, z);

    R.collider(2.74, 0.85, 1.52, x, 0, z);
}

function wallPlane(R, mat, w, hgt, x, y, z, ry) {

    R.pln(mat, w, hgt, x, y, z, { ry });
}


// ======================================================
// A HALL ON EVERY FLOOR  (x -11.3 .. 11.3, z -3.75 .. 3.75)
// ======================================================

export function furnishHall(
    scene, collisionSystem, interaction, floorNumber, floorHeight
) {

    const h = H();

    const m = M();

    const rng = mulberry32(floorNumber * 313 + 99);

    const ctx = {
        scene,
        cs: collisionSystem,
        floorNumber,
        floorHeight,
        interaction
    };

    const R = newBuilder(ctx, 0, floorHeight, 0);

    // ---------- hiding cabinets along both long walls ----------
    for (const x of [-7, 0, 7]) {

        cabinet(R, x, -3.75 + 0.35, 0);

        cabinet(R, x, 3.75 - 0.35, Math.PI);
    }

    // ---------- per-floor furniture ----------
    if (floorNumber === 1) {

        // MESS HALL: long tables with benches
        const tx = [-7.5, -2.5, 2.5, 7.5];

        tx.forEach((x, i) => {

            const top = table(R, x, 0, 3.0, 0.8);

            bench(R, x, -0.78, 2.8, 0.3, i === 1);

            bench(R, x, 0.78, 2.8, 0.3, false);

            dishes(R, x, 0, 3.0, 0.8, rng, 0.77);

            if (i === 2) {

                R.decal(m.blood, 1.3, 1.3, x, 0, 0.3);

                R.pln(
                    m.blood, 1.0, 0.7, x, 0.78, 0.1,
                    { rx: -Math.PI / 2 }
                );
            }
        });

        // water drum on a stand (between the cabinet and a room door)
        R.cyl(h.blue, 0.4, 0.55, 8.7, 0.85, -3.3);

        R.box(h.steel, 0.5, 0.85, 0.5, 8.7, 0, -3.3);

        R.collider(0.5, 1.4, 0.5, 8.7, 0, -3.3);

        // dustbin overflowing with rubbish
        R.cyl(h.steel, 0.42, 0.7, -8.7, 0, 3.3);

        R.collider(0.45, 0.7, 0.45, -8.7, 0, 3.3);

        for (let i = 0; i < 4; i++) {

            R.pln(
                M().paper, 0.2, 0.25,
                -8.7 + (rng() - 0.5) * 0.3, 0.74, 3.3 + (rng() - 0.5) * 0.3,
                { rx: -Math.PI / 2, rz: rng() * 6 }
            );
        }

        // warden portrait + stopped clock on the west wall
        const pt = portraitTex();

        if (pt) {

            R.pln(
                new THREE.MeshStandardMaterial({ map: pt, roughness: 0.9 }),
                0.9, 1.25, -11.28, 1.9, -0.8,
                { ry: Math.PI / 2, keep: true }
            );
        }

        const ck = clockTex();

        if (ck) {

            R.pln(
                new THREE.MeshStandardMaterial({ map: ck, roughness: 0.8 }),
                0.6, 0.6, 11.28, 2.6, -1.5,
                { ry: -Math.PI / 2, keep: true }
            );
        }
    }
    else if (floorNumber === 2) {

        // COMMON ROOM: sofas, TV, ping-pong table
        tvUnit(R, -10.8, 0, Math.PI / 2);

        sofa(R, -7.6, 0, -Math.PI / 2);

        sofa(R, -4.6, -1.25, Math.PI);

        // coffee table
        R.box(h.woodDark, 1.0, 0.04, 0.6, -8.7, 0.4, 0);

        R.collider(1.0, 0.45, 0.6, -8.7, 0, 0);

        // ping-pong table
        pingpong(R, 5.0, 0);

        // carrom table with stools
        table(R, 0.8, 0, 1.0, 1.0);

        for (const [sx, sz] of [[0.8, -0.95], [0.8, 0.95], [1.75, 0], [-0.15, 0]]) {

            R.cyl(h.woodDark, 0.34, 0.45, sx, 0, sz);
        }

        // chairs knocked over
        chair(R, 2.4, 2.4, true);

        chair(R, -1.5, -1.7, false);
    }
    else {

        // STUDY HALL: reading tables + bookshelves
        const tx = [-6.2, -0.4, 5.4];

        tx.forEach((x, i) => {

            table(R, x, 0, 2.2, 0.9);

            chair(R, x - 0.5, -0.85, i === 1);

            chair(R, x + 0.5, 0.85, false);

            chair(R, x + 0.5, -0.85, false);

            R.box(m.paper, 0.4, 0.04, 0.3, x - 0.4, 0.77, 0.1, { ry: 0.3 });

            R.cyl(m.paper, 0.05, 0.14, x + 0.5, 0.77, -0.2);
        });

        bookshelf(R, -11.15, -1.0, Math.PI / 2, rng);

        bookshelf(R, -11.15, 0.7, Math.PI / 2, rng);

        bookshelf(R, 11.15, -0.2, -Math.PI / 2, rng);

        bookshelf(R, 11.15, 1.5, -Math.PI / 2, rng);

        // old lamp with a red bulb
        R.cyl(h.steel, 0.05, 1.5, 3.2, 0, 3.15);

        R.sph(h.redLight, 0.18, 3.2, 1.55, 3.15);
    }

    // ---------- every hall: dust, blood, webs, writing ----------
    for (let i = 0; i < 8; i++) {

        R.pln(
            m.paper, 0.25, 0.32,
            -10 + rng() * 20, 0.015, -3 + rng() * 6,
            { rx: -Math.PI / 2, rz: rng() * 6 }
        );
    }

    for (let i = 0; i < 4; i++) {

        R.box(
            m.plaster, 0.1 + rng() * 0.15, 0.06, 0.1 + rng() * 0.15,
            -10 + rng() * 20, 0, -3 + rng() * 6,
            { ry: rng() * 6 }
        );
    }

    placeWeb(R, -11.0, 3.45, -3.6, 1.6, 0);

    placeWeb(R, 11.0, 3.45, 3.6, 1.6, Math.PI);

    placeWeb(R, -5.0, 3.55, 3.7, 1.3, Math.PI);

    placeSpider(R, -11.0, 3.2, -3.55, 1.5, 0, Math.PI / 2);

    placeSpider(R, 5.0, 3.55, 3.7, 1.1, Math.PI, Math.PI / 2);

    hangSpider(R, -3, 2.0, 1.2, 1.1);

    hangSpider(R, 4, -2.0, 0.9, 0.9);

    // the mess hall hides two "do something" puzzles: the bookcase (pull the right
    // book) and the rat hole (feed the rat) - see secrets.js
    if (floorNumber === 1) {

        addBookcase(R);

        addRatHole(R);

        // the door that is NOT there until the letter is found (mystery.js)
        addSecretDoor(R);
    }

    R.finish();
}


// ======================================================
// ENTRANCE ROOM  (ground floor, under the right stairs)
//
//    x 11.5 .. 14.75     z -3.75 .. 3.75
//    inner door (west)  ->  hall
//    main door  (east)  ->  outside
// ======================================================

export function furnishEntrance(
    scene, collisionSystem, interaction
) {

    const h = H();

    const m = M();

    const rng = mulberry32(4242);

    const ctx = {
        scene,
        cs: collisionSystem,
        floorNumber: 1,
        floorHeight: 0,
        interaction
    };

    const R = newBuilder(ctx, 0, 0, 0);

    // reception desk (north end)
    R.box(h.wood, 1.0, 0.95, 2.0, 13.85, 0, -2.6);

    R.collider(1.0, 0.95, 2.0, 13.85, 0, -2.6);

    R.box(h.woodDark, 1.05, 0.05, 2.05, 13.85, 0.95, -2.6);

    // register book + bell + dead flowers
    const register = R._m(
        U.box, m.paper, 0.4, 0.03, 0.3, 13.8, 1.015, -2.9,
        { ry: 0.2, keep: true }
    );

    addReadable(interaction, R.group, {
        id: "book_register", title: "Guest register", kind: "book",
        text: "HEAVEN HOSTEL - GUEST REGISTER\n\nLast entries:\n\n  Anvesh + 3 friends ........ one night\n  Ramu K. (Kothapalli) ...... until further notice\n  (a name rubbed out) ...... one night\n  (a name rubbed out) ...... one night\n\nIn the 'checked out' column every line is blank.\nIn the 'remarks' column someone has written, again and again:\n\"They always say one night.\"",
        mesh: register, x: 13.8, y: 1.08, z: -2.9, size: 0.5
    });

    // the warden's torn page on the desk (puzzle 1)
    const wnote = R._m(
        U.box, m.paper, 0.2, 0.008, 0.26, 13.62, 1.0, -3.35,
        { ry: -0.4, keep: true }
    );

    const wpk = addReadable(interaction, R.group, {
        id: RECEPTION_NOTE.id, title: RECEPTION_NOTE.title, text: RECEPTION_NOTE.text, kind: "letter",
        mesh: wnote, x: 13.62, y: 1.08, z: -3.35, size: 0.5
    });

    // once the drawer is open the note is not needed any more: it vanishes
    locks.register(() => {

        if (inventory.flag("pz_drawer") || inventory.has(RECEPTION_NOTE.id)) wpk.hide();
        else wpk.show();
    });

    // the locked drawer in the front of the desk (puzzle 1)
    R.box(h.woodDark, 0.04, 0.22, 0.8, 13.33, 0.7, -2.6);

    R.box(h.steel, 0.03, 0.06, 0.1, 13.30, 0.74, -2.6);

    addStation(interaction, R.group, {
        id: "drawer", label: "Try the warden's drawer",
        x: 13.28, y: 0.7, z: -2.6, sx: 0.5, sy: 0.5, sz: 1.0
    });

    // the old radio on the desk (puzzle 4)
    R.box(h.wood, 0.3, 0.2, 0.2, 13.58, 1.1, -1.95);

    R.cyl(h.steel, 0.045, 0.02, 13.46, 1.12, -1.95, { rz: Math.PI / 2 });

    addStation(interaction, R.group, {
        id: "radio", label: "Turn on the old radio",
        x: 13.56, y: 1.14, z: -1.95, sx: 0.45, sy: 0.35, sz: 0.4
    });

    // the key board (puzzle 5)
    addStation(interaction, R.group, {
        id: "keys", label: "Look at the key board",
        x: 14.6, y: 1.5, z: -2.6, sx: 0.5, sy: 0.95, sz: 1.5
    });

    R.cyl(h.steel, 0.12, 0.06, 13.9, 1.0, -2.2);

    R.cyl(m.bucket, 0.14, 0.2, 14.0, 1.0, -3.3);

    // key board behind the desk
    R.box(h.woodDark, 0.04, 0.7, 1.2, 14.7, 1.4, -2.6);

    for (let i = 0; i < 8; i++) {

        R.box(
            h.steel, 0.03, 0.12, 0.03,
            14.66, 1.55 + (i % 2) * 0.25, -3.1 + Math.floor(i / 2) * 0.35
        );
    }

    // bench along the south wall
    bench(R, 13.1, 3.4, 2.3, 0.4, false);

    // shoe rack and umbrella stand near the main door
    R.box(h.woodDark, 0.35, 0.8, 1.1, 14.55, 0, 2.0);

    R.collider(0.35, 0.8, 1.1, 14.55, 0, 2.0);

    R.cyl(h.steel, 0.25, 0.55, 14.5, 0, -1.4);

    // door mat
    R.box(h.rug, 1.1, 0.02, 1.6, 14.1, 0, 0);

    // notice on the north wall
    R.pln(m.notice, 0.7, 0.9, 12.4, 1.7, -3.72, { ry: 0 });

    // EXIT sign above the main door (inside)
    const ex = plateTex("EXIT");

    if (ex) {

        R.pln(
            new THREE.MeshBasicMaterial({ map: ex }),
            0.9, 0.34, 14.7, 3.5, 0,
            { ry: -Math.PI / 2, keep: true }
        );
    }

    // blood: drag marks leading to the exit (the hand prints are on the doors)
    for (let i = 0; i < 6; i++) {

        R.decal(
            m.foot, 0.22, 0.45,
            12.0 + i * 0.45, (i % 2 ? 0.2 : -0.2),
            Math.PI / 2
        );
    }

    R.decal(m.blood, 1.5, 1.5, 13.2, 0.6, rng() * 6);

    // webs and spiders
    placeWeb(R, 12.0, 3.4, 3.7, 1.4, Math.PI);

    placeWeb(R, 14.7, 3.4, 3.2, 1.3, -Math.PI / 2);

    placeSpider(R, 12.1, 3.15, 3.65, 1.3, Math.PI, Math.PI / 2);

    hangSpider(R, 12.5, 1.0, 1.0, 1.0);

    // its own flickering bulb
    bulb(R, 13.0, 0, false, "1-E", { y: 3.45, top: 4.0 });

    R.finish();
}