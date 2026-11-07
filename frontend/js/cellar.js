import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

import {
    M, U, newBuilder, bulb, plateTex, getPlayer, doll, canvasTexture
} from "./haunted.js";

import { addStation } from "./puzzles.js";

import { theCase } from "./gen.js";

import { inventory, addPickup } from "./inventory.js";

import { DIARY } from "./lore.js";

import { audio } from "./audio.js";

import { events } from "./events.js";

import { story } from "./story.js";


// ======================================================
// THE CELLAR  (secret underground room)
//
//   - a locked trapdoor in ONE dorm room (room 6, ground floor,
//     south side, second room from the left)
//   - the CELLAR KEY lies on the left staircase
//   - key opens the padlock, E opens the lid, E climbs down
//   - the trapdoor SLAMS SHUT behind you; a ladder climbs back up
//   - the lid closes again after you leave
//   - down there: bones, a cage, chains, a ritual circle,
//     a doll facing the wall, and an old diary
//   - THE 10th PUZZLE lives here: Ramu's little tin box (south-west corner).
//     Its 4-digit code = the chalk strokes on the 4 walls (north, east, south,
//     west). The note that explains it lies in a random room of the hostel.
//
// To change where things are, edit the numbers below.
// ======================================================

// the trapdoor (world position, inside the dorm room, ground floor)
const HATCH = { x: -3.5, z: 10.5 };

// the cellar sits right under that room
const FLOOR = -4;
const CX = -3.5;
const ZC = 11.0;
const HX = 2.7;            // half width  (x)
const HZ = 3.1;            // half length (z)

const X0 = CX - HX;
const X1 = CX + HX;
const Z0 = ZC - HZ;
const Z1 = ZC + HZ;

// where the key lies (left staircase, on a low step)
const KEY_POS = { x: -13.3, y: 0.66, z: 1.75 };

// is the trapdoor lid open right now? (never saved: it starts closed)
let lidOpen = false;


export function buildCellar(scene, collisionSystem, interaction) {

    buildHatch(scene, interaction);

    buildRoom(scene, collisionSystem, interaction);

    placeKey(scene, interaction);
}


// ======================================================
// THE TRAPDOOR (top side)
// ======================================================
function buildHatch(scene, interaction) {

    const g = new THREE.Group();

    g.position.set(HATCH.x, 0, HATCH.z);

    scene.add(g);

    const wood = new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 1 });

    const iron = new THREE.MeshStandardMaterial({
        color: 0x25272a, roughness: 0.7, metalness: 0.4
    });

    const black = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const frame = new THREE.Mesh(U.box, iron);

    frame.scale.set(1.12, 0.03, 1.12);

    frame.position.y = 0.016;

    g.add(frame);

    // the hole (shown when the lid is open)
    const pit = new THREE.Mesh(U.pln, black);

    pit.scale.set(0.98, 0.98, 1);

    pit.rotation.x = -Math.PI / 2;

    pit.position.y = 0.034;

    g.add(pit);

    // lid hinged on the north edge
    const pivot = new THREE.Group();

    pivot.position.set(0, 0.05, -0.49);

    g.add(pivot);

    const lid = new THREE.Mesh(U.box, wood);

    lid.scale.set(0.98, 0.06, 0.98);

    lid.position.z = 0.49;

    pivot.add(lid);

    for (const dx of [-0.25, 0.25]) {

        const band = new THREE.Mesh(U.box, iron);

        band.scale.set(0.07, 0.075, 0.99);

        band.position.set(dx, 0, 0.49);

        pivot.add(band);
    }

    const ring = new THREE.Mesh(U.box, iron);

    ring.scale.set(0.18, 0.05, 0.04);

    ring.position.set(0, 0.05, 0.12);

    pivot.add(ring);

    // rusty padlock on the south edge
    const lock = new THREE.Mesh(U.box, iron);

    lock.scale.set(0.12, 0.1, 0.07);

    lock.position.set(0, 0.1, 0.9);

    g.add(lock);

    // invisible E trigger
    const trig = new THREE.Mesh(
        U.box, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
    );

    trig.scale.set(1.15, 0.5, 1.15);

    trig.position.y = 0.25;

    trig.visible = false;

    g.add(trig);

    interaction.add(trig);

    const unlocked = () => inventory.flag("cellar_unlocked");

    const refresh = () => {

        pivot.rotation.x = lidOpen ? -1.75 : 0;

        pit.visible = lidOpen;

        lock.visible = !unlocked();
    };

    const setLid = (open, withSound) => {

        if (lidOpen === open) return;

        lidOpen = open;

        if (withSound) audio.door("room", HATCH.x, 0, HATCH.z, open);

        refresh();
    };

    refresh();

    inventory.resetHooks.push(() => { lidOpen = false; refresh(); });

    // the lid is closed by the cellar code after you pass through
    hatchApi.setLid = setLid;

    trig.userData.getPrompt = () => {

        if (lidOpen) return "Press E - Climb down";

        if (!unlocked()) {

            return inventory.has("cellar_key")
                ? "Press E - Unlock the trapdoor"
                : "Press E - Try the trapdoor";
        }

        return "Press E - Open the trapdoor";
    };

    trig.userData.interact = () => {

        if (lidOpen) {

            const p = getPlayer();

            if (!p) return;

            audio.ladder();

            events.emit("cellar");

            p.startPath([
                { x: HATCH.x, y: 0.7, z: HATCH.z, t: 0.5 },
                { x: HATCH.x, y: FLOOR + 1.7, z: HATCH.z, t: 2.2 }
            ], 0);

            // ...and the lid slams shut behind you
            setTimeout(() => {

                setLid(false, true);

                inventory.say("The trapdoor slams shut above you.", 3.5);
            }, 3300);

            return;
        }

        if (!unlocked()) {

            if (inventory.has("cellar_key")) {

                inventory.remove("cellar_key");

                inventory.setFlag("cellar_unlocked");

                inventory.say("The key turns. The old padlock falls open.");
            }
            else {

                inventory.say(
                    "Locked. The padlock is old and rusted - " +
                    "there must be a key somewhere."
                );
            }

            audio.doorLocked();

            refresh();

            return;
        }

        setLid(true, true);
    };
}

const hatchApi = { setLid: () => {} };


// ======================================================
// THE ROOM UNDERGROUND
// ======================================================
function buildRoom(scene, collisionSystem, interaction) {

    const ctx = {
        scene, cs: collisionSystem, floorNumber: 1,
        floorHeight: FLOOR, interaction
    };

    // local coordinates: (0, 0) is the middle of the cellar
    const R = newBuilder(ctx, CX, FLOOR, ZC);

    const m = M();

    const stone = new THREE.MeshStandardMaterial({ color: 0x33362f, roughness: 1 });

    const floorM = new THREE.MeshStandardMaterial({ color: 0x1d1b19, roughness: 1 });

    const wood = new THREE.MeshStandardMaterial({ color: 0x3e2a1a, roughness: 1 });

    const iron = new THREE.MeshStandardMaterial({
        color: 0x2a2c2f, roughness: 0.7, metalness: 0.4
    });

    const glass = new THREE.MeshStandardMaterial({
        color: 0x4a6a4a, roughness: 0.3, transparent: true, opacity: 0.7
    });

    const wax = new THREE.MeshStandardMaterial({ color: 0xcfc6a8, roughness: 1 });

    const flame = new THREE.MeshBasicMaterial({ color: 0xff8a2a });

    const bone = new THREE.MeshStandardMaterial({ color: 0xcfc8b0, roughness: 0.9 });

    const cloth = new THREE.MeshStandardMaterial({ color: 0x3a1c1c, roughness: 1 });

    const W = HX * 2 + 0.6;

    const D = HZ * 2 + 0.6;

    // ---- walls, ceiling, floor ----
    const wall = (w, d, x, z) => {

        R.box(stone, w, 3.7, d, x, 0, z);

        R.collider(w, 3.7, d, x, 0, z);
    };

    wall(W, 0.3, 0, -HZ - 0.15);

    wall(W, 0.3, 0, HZ + 0.15);

    wall(0.3, D, -HX - 0.15, 0);

    wall(0.3, D, HX + 0.15, 0);

    R.box(stone, W, 0.3, D, 0, 3.65, 0);

    R.box(floorM, HX * 2, 0.1, HZ * 2, 0, -0.1, 0);

    // you can stand on the cellar floor
    collisionSystem.platforms.push({
        x0: X0, x1: X1, z0: Z0, z1: Z1, y: FLOOR
    });

    // ---- shelves with jars (west wall) ----
    for (const sz of [-2.0, -0.1]) {

        const sx = -HX + 0.3;

        for (const py of [0.4, 1.0, 1.6]) {

            R.box(wood, 0.5, 0.05, 1.8, sx, py, sz);
        }

        for (const dz of [-0.85, 0.85]) {

            R.box(wood, 0.5, 2.0, 0.06, sx, 0, sz + dz);
        }

        for (let i = 0; i < 5; i++) {

            R.cyl(glass, 0.16, 0.24, sx, 1.05, sz - 0.7 + i * 0.35);
        }

        R.collider(0.55, 2.0, 1.85, sx, 0, sz);
    }

    // ---- crates (north-east corner) ----
    R.box(wood, 0.9, 0.8, 0.9, HX - 0.6, 0, -HZ + 0.6);

    R.box(wood, 0.8, 0.7, 0.8, HX - 1.6, 0, -HZ + 0.55, { ry: 0.3 });

    R.box(wood, 0.7, 0.6, 0.7, HX - 0.65, 0.8, -HZ + 0.6, { ry: -0.2 });

    R.collider(0.95, 1.5, 0.95, HX - 0.6, 0, -HZ + 0.6);

    R.collider(0.85, 0.7, 0.85, HX - 1.6, 0, -HZ + 0.55);

    // ---- table with candles + the diary (south-east) ----
    const tx = 1.1;

    const tz = 2.3;

    R.box(wood, 1.5, 0.06, 0.8, tx, 0.75, tz);

    for (const dx of [-0.65, 0.65]) {

        for (const dz of [-0.3, 0.3]) {

            R.box(wood, 0.06, 0.75, 0.06, tx + dx, 0, tz + dz);
        }
    }

    R.collider(1.5, 0.85, 0.8, tx, 0, tz);

    for (const dx of [-0.5, 0.35]) {

        R.cyl(wax, 0.07, 0.2, tx + dx, 0.81, tz - 0.1);

        R._m(U.sph, flame, 0.05, 0.08, 0.05, tx + dx, 1.05, tz - 0.1, { keep: true });
    }

    // a skull on the table
    R._m(U.sph, bone, 0.2, 0.22, 0.24, tx + 0.6, 0.93, tz + 0.15, { keep: true });

    const diary = R._m(
        U.box,
        new THREE.MeshStandardMaterial({ color: 0x5a2a1e, roughness: 1 }),
        0.24, 0.04, 0.32, tx - 0.1, 0.84, tz + 0.15,
        { ry: 0.4, keep: true }
    );

    addReadablePickup(interaction, R.group, diary, tx - 0.1, 0.9, tz + 0.15);

    // ---- ritual circle on the floor, ringed by candles ----
    const cx = -0.9;

    const cz = 1.0;

    R.decal(m.blood, 2.8, 2.8, cx, cz, 0.3);

    R.decal(m.blood, 1.6, 1.6, cx + 0.1, cz - 0.1, 2.0);

    for (let i = 0; i < 8; i++) {

        const a = (i / 8) * Math.PI * 2;

        const px = cx + Math.cos(a) * 1.15;

        const pz = cz + Math.sin(a) * 1.15;

        R.cyl(wax, 0.06, 0.12 + (i % 3) * 0.05, px, 0, pz);

        R._m(U.sph, flame, 0.045, 0.07, 0.045, px, 0.2 + (i % 3) * 0.05, pz, { keep: true });
    }

    // ---- cage with a skeleton (east wall) ----
    const gx = HX - 0.75;

    const gz = 0.2;

    for (const dx of [-0.65, 0.65]) {

        for (const dz of [-0.9, 0.9]) {

            R.box(iron, 0.05, 2.0, 0.05, gx + dx, 0, gz + dz);
        }
    }

    for (let i = 0; i <= 5; i++) {

        const k = -0.9 + i * 0.36;

        R.box(iron, 0.03, 2.0, 0.03, gx - 0.65, 0, gz + k);

        R.box(iron, 0.03, 2.0, 0.03, gx + 0.65, 0, gz + k);
    }

    for (let i = 0; i <= 3; i++) {

        const k = -0.65 + i * 0.43;

        R.box(iron, 0.03, 2.0, 0.03, gx + k, 0, gz - 0.9);

        R.box(iron, 0.03, 2.0, 0.03, gx + k, 0, gz + 0.9);
    }

    R.box(iron, 1.35, 0.04, 0.04, gx, 1.0, gz - 0.9);

    R.box(iron, 1.35, 0.04, 0.04, gx, 1.0, gz + 0.9);

    R.collider(1.4, 2.0, 1.9, gx, 0, gz);

    // the skeleton curled up inside
    R._m(U.sph, bone, 0.2, 0.22, 0.24, gx - 0.1, 0.32, gz - 0.55, { keep: true });

    R.box(bone, 0.5, 0.08, 0.3, gx, 0.04, gz - 0.2, { ry: 0.3 });

    R.box(bone, 0.5, 0.06, 0.06, gx + 0.1, 0.05, gz + 0.25, { ry: 0.5 });

    R.box(bone, 0.5, 0.06, 0.06, gx - 0.1, 0.05, gz + 0.45, { ry: -0.3 });

    for (let i = 0; i < 4; i++) {

        R.box(bone, 0.22, 0.04, 0.04, gx - 0.15 + i * 0.07, 0.1, gz - 0.2, { ry: 1.57, rz: 0.2 });
    }

    // ---- an old cot with straps (south-west) ----
    const bx = -1.55;

    const bz = 2.45;

    R.box(iron, 0.9, 0.08, 1.9, bx, 0.38, bz);

    R.box(cloth, 0.84, 0.1, 1.84, bx, 0.46, bz);

    for (const dz of [-0.6, 0.0, 0.6]) {

        R.box(m.dark, 0.95, 0.03, 0.08, bx, 0.58, bz + dz);
    }

    for (const dx of [-0.4, 0.4]) {

        for (const dz of [-0.9, 0.9]) {

            R.box(iron, 0.05, 0.4, 0.05, bx + dx, 0, bz + dz);
        }
    }

    R.collider(0.95, 0.65, 1.95, bx, 0, bz);

    R.decal(m.blood, 0.9, 0.9, bx + 0.7, bz + 0.2, 1.2);

    // ---- a doll on a stool, facing the wall ----
    R.box(wood, 0.4, 0.05, 0.4, 0.2, 0.42, 2.8);

    for (const dx of [-0.15, 0.15]) {

        for (const dz of [-0.15, 0.15]) {

            R.box(wood, 0.04, 0.42, 0.04, 0.2 + dx, 0, 2.8 + dz);
        }
    }

    doll(R, 0.2, 0.47, 2.8, 0);

    // ---- chains hanging from the ceiling ----
    for (const [px, pz] of [[-1.6, -1.8], [-1.1, -2.1], [0.9, -1.6]]) {

        for (let i = 0; i < 7; i++) {

            R.box(iron, 0.04, 0.16, 0.025, px, 3.6 - i * 0.2, pz, { ry: i % 2 ? 1.57 : 0 });
        }

        R.cyl(iron, 0.14, 0.04, px, 2.2, pz);
    }

    // ---- scattered bones ----
    for (const [bx2, bz2, ry] of [
        [-0.2, -1.2, 0.4], [0.5, 0.4, 1.9], [-2.0, 1.5, 0.9], [1.9, -1.0, 2.6]
    ]) {

        R.box(bone, 0.4, 0.05, 0.06, bx2, 0.03, bz2, { ry });

        R.box(bone, 0.25, 0.05, 0.06, bx2 + 0.12, 0.03, bz2 + 0.1, { ry: ry + 1.2 });
    }

    // ---- writing on every wall + bloody hand prints ----
    const note = (text, w, y, x, z, ry) => {

        const tex = plateTex(text);

        if (!tex) return;

        R.pln(
            new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }),
            w, 0.8, x, y, z, { ry }
        );
    };

    note("HE IS STILL BELOW", 2.4, 2.0, 0.9, -HZ + 0.02, 0);

    note("LET ME OUT", 2.0, 1.9, HX - 0.02, -0.9, -Math.PI / 2);

    note("IT WAS NOT ME", 2.0, 1.8, -HX + 0.02, 2.0, Math.PI / 2);

    note("DON'T LOOK BACK", 2.4, 2.1, -1.0, HZ - 0.02, Math.PI);

    for (let i = 0; i < 6; i++) {

        R.pln(
            m.hand, 0.32, 0.32, -HX + 0.03, 0.8 + (i % 3) * 0.35, -2.4 + i * 0.5,
            { ry: Math.PI / 2 }
        );
    }

    for (let i = 0; i < 4; i++) {

        R.pln(
            m.hand, 0.32, 0.32, -2.0 + i * 0.7, 1.1 + (i % 2) * 0.4, -HZ + 0.03,
            { ry: 0 }
        );
    }

    R.decal(m.blood, 1.3, 1.3, 0.6, -1.4, 0.2);

    R.decal(m.blood, 0.9, 0.9, -1.8, -0.4, 2.2);

    // ---- the ladder hanging from the trapdoor ----
    const lx = HATCH.x - CX;

    const lz = HATCH.z - ZC;

    for (const dx of [-0.25, 0.25]) {

        R.box(iron, 0.05, 3.7, 0.05, lx + dx, 0, lz);
    }

    for (let i = 0; i < 12; i++) {

        R.box(iron, 0.5, 0.035, 0.035, lx, 0.3 + i * 0.3, lz);
    }

    // ---- THE 10th PUZZLE: chalk strokes on the four walls + Ramu's tin box ----
    const paintTally = (g, w, h, n, letter) => {

        g.clearRect(0, 0, w, h);

        g.fillStyle = "rgba(20,18,16,0.55)"; g.fillRect(0, 0, w, h);

        g.strokeStyle = "rgba(235,230,215,0.92)"; g.lineWidth = 6; g.lineCap = "round";

        const bundles = Math.ceil(n / 5);

        for (let b = 0; b < bundles; b++) {

            const left = Math.min(5, n - b * 5), x0 = 34 + (b % 2) * 100, y0 = 52 + Math.floor(b / 2) * 80;

            for (let k = 0; k < Math.min(4, left); k++) { g.beginPath(); g.moveTo(x0 + k * 16, y0); g.lineTo(x0 + k * 16 + (Math.random() * 3 - 1.5), y0 + 54); g.stroke(); }

            if (left === 5) { g.beginPath(); g.moveTo(x0 - 10, y0 + 46); g.lineTo(x0 + 64, y0 + 6); g.stroke(); }
        }

        g.fillStyle = "rgba(255,200,120,0.9)"; g.font = "bold 30px Georgia"; g.fillText(letter, w - 40, 36);
    };

    const walls = [["N", 0, -HZ + 0.035, 0, -1.0], ["E", HX - 0.035, 0, -Math.PI / 2, 1.8], ["S", 0, HZ - 0.035, Math.PI, 1.6], ["W", -HX + 0.035, 0, Math.PI / 2, -1.2]];

    const tallies = [];

    walls.forEach(([letter, wx, wz, ry, along], i) => {

        const tex = canvasTexture(256, 192, (g, w, h) => paintTally(g, w, h, theCase().cellar.tally[i], letter));

        tallies.push({ tex, letter, i });

        const x = letter === "N" || letter === "S" ? along : wx;

        const z = letter === "E" || letter === "W" ? along : wz;

        R.pln(new THREE.MeshBasicMaterial({ map: tex, color: 0xb8b0a0 }), 1.15, 0.86, x, 2.75, z, { ry });
    });

    // a new game = new numbers: paint the walls again
    inventory.resetHooks.push(() => {

        for (const t of tallies) {

            const cv = t.tex.image;

            paintTally(cv.getContext("2d"), cv.width, cv.height, theCase().cellar.tally[t.i], t.letter);

            t.tex.needsUpdate = true;
        }
    });

    // the tin box (south-west corner): a lid that springs open when it is solved
    const tinMat = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.55, metalness: 0.6 });

    const tinX = -HX + 0.65, tinZ = HZ - 0.65;

    R.box(tinMat, 0.6, 0.26, 0.4, tinX, 0.0, tinZ);

    R.collider(0.65, 0.3, 0.45, tinX, 0, tinZ);

    R.box(iron, 0.08, 0.06, 0.02, tinX, 0.2, tinZ - 0.21);

    const lidPivot = new THREE.Group();

    lidPivot.position.set(tinX, 0.26, tinZ + 0.2);

    const lid = new THREE.Mesh(U.box, tinMat);

    lid.scale.set(0.62, 0.04, 0.42);

    lid.position.set(0, 0.02, -0.2);

    lidPivot.add(lid);

    R.group.add(lidPivot);

    const syncLid = () => { lidPivot.rotation.x = story.solved("cellar") ? 1.9 : 0; };

    syncLid();

    inventory.resetHooks.push(syncLid);

    events.on("puzzle-solved", (id) => { if (id === "cellar") syncLid(); });

    addStation(interaction, R.group, { id: "cellar", label: "Open Ramu's tin box", x: tinX, y: 0.3, z: tinZ, sx: 1.1, sy: 0.9, sz: 1.0 });

    // ---- one weak bulb that flickers ----
    bulb(R, 0, 0.2, true, "U", { y: 3.0, top: 3.65 });

    R.finish();

    // ---- climb back up ----
    const up = new THREE.Mesh(
        U.box, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
    );

    up.scale.set(1.2, 3.6, 1.2);

    up.position.set(lx, 1.8, lz);

    up.visible = false;

    R.group.add(up);

    interaction.add(up);

    up.userData.getPrompt = () => "Press E - Climb up";

    up.userData.interact = () => {

        const p = getPlayer();

        if (!p) return;

        // the lid lifts for you, then falls shut again behind you
        hatchApi.setLid(true, true);

        audio.ladder();

        p.startPath([
            { x: HATCH.x, y: 0.9, z: HATCH.z, t: 2.2 },
            { x: HATCH.x, y: 1.7, z: HATCH.z + 1.2, t: 0.8 }
        ], 0);

        setTimeout(() => hatchApi.setLid(false, true), 5200);
    };
}

// the old diary: read it, then keep it or put it back
import { addReadable } from "./inventory.js";

function addReadablePickup(interaction, parent, mesh, x, y, z) {

    addReadable(interaction, parent, {
        id: "old_diary", title: DIARY.title, text: DIARY.text, kind: "book",
        mesh, x, y, z, size: 0.6
    });
}


// ======================================================
// THE CELLAR KEY
//
// It is hidden somewhere different in every new game:
//   - on a step of the left staircase,
//   - on the reception desk,
//   - or inside the trunk of one of the 24 dorm rooms (the trunk code
//     lives in inventory.js: addContainer).
// The place is picked in inventory.js (KEY_SPOTS).
// ======================================================
function makeKeyMesh() {

    const g = new THREE.Group();

    const brass = new THREE.MeshStandardMaterial({
        color: 0xb08d3a, roughness: 0.4, metalness: 0.6,
        emissive: 0x3a2a08
    });

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.011, 8, 16), brass);

    ring.rotation.x = Math.PI / 2;

    ring.position.x = -0.1;

    g.add(ring);

    const shaft = new THREE.Mesh(U.box, brass);

    shaft.scale.set(0.16, 0.016, 0.016);

    shaft.position.set(0.02, 0, 0);

    g.add(shaft);

    for (const dx of [0.07, 0.1]) {

        const tooth = new THREE.Mesh(U.box, brass);

        tooth.scale.set(0.014, 0.016, 0.04);

        tooth.position.set(dx, 0, 0.02);

        g.add(tooth);
    }

    g.scale.setScalar(1.7);        // a bit bigger so it can be spotted

    return g;
}

function placeKey(scene, interaction) {

    const spots = [
        { spot: "stairs", pos: KEY_POS, ry: 0.6 },
        { spot: "reception", pos: { x: 13.6, y: 1.035, z: -2.2 }, ry: 0.3 }
    ];

    for (const s of spots) {

        const g = makeKeyMesh();

        g.position.set(s.pos.x, s.pos.y, s.pos.z);

        g.rotation.y = s.ry;

        scene.add(g);

        addPickup(interaction, scene, {
            id: "cellar_key", mesh: g,
            x: s.pos.x, y: s.pos.y + 0.1, z: s.pos.z, size: 0.7,
            active: () => inventory.keyAt(s.spot)
        });
    }
}