import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

import {
    M, U, anim, mulberry32, placeWeb, placeSpider, textTex,
    newBuilder, once
} from "./haunted.js";


// ======================================================
// STAIRWELLS - tube lights on the wall, blood, skulls
//
//  flight A : left  stairs  y 0  -> 4
//  flight B : right stairs  y 4  -> 8
//  flight C : left  stairs  y 8  -> 12
//
//  step i :  top = base + 0.2 * (i + 1)
//            z   = 2.375 - 0.25 * i
// ======================================================

const STEP_TOP = (base, i) => base + 0.2 * (i + 1);

const STEP_Z = (i) => 2.375 - 0.25 * i;


function mats() {

    return once("stairMats", () => ({

        wood: new THREE.MeshStandardMaterial({
            color: 0x3b2412, roughness: 0.95
        }),

        rag: new THREE.MeshStandardMaterial({
            color: 0x120c08, roughness: 1
        }),

        flame: new THREE.MeshBasicMaterial({ color: 0xff9a2a }),

        core: new THREE.MeshBasicMaterial({ color: 0xffe27a }),

        bone: new THREE.MeshStandardMaterial({
            color: 0xcfc8b0, roughness: 0.7
        })
    }));
}


// ------------------------------------------------------
// A WALL LIGHT FOR THE STAIRWELL:  an old tube light on an
// iron plate (a real hostel has tube lights, not fire).
//   lean = -1 : on the left wall   lean = +1 : on the right wall
// It flickers like the corridor lights and stutters near the ghost.
// ------------------------------------------------------

function torch(R, x, y, z, lean, zone) {

    const t = mats();

    const m = M();

    const inward = -lean;                 // direction away from the wall

    // iron plate and a small cable going up the wall
    R.box(m.iron, 0.06, 0.12, 1.1, x + inward * 0.03, y + 0.78, z);

    R.box(m.dark, 0.02, 0.5, 0.02, x + inward * 0.02, y + 1.3, z + 0.45);

    // the tube itself
    const mat = new THREE.MeshBasicMaterial({ color: 0xcfe0ff });

    const tube = R._m(
        U.box, mat, 0.07, 0.05, 0.95,
        x + inward * 0.09, y + 0.85, z, { keep: true }
    );

    const b = {
        mesh: tube,
        mat,
        dead: false,
        phase: Math.random() * 100,
        base: new THREE.Color(0xcfe0ff),
        zone,
        lvl: 1,
        lightColor: 0xdfe8ff,
        power: 0.9,
        tube: true
    };

    R._bulbs = R._bulbs || [];

    R._bulbs.push(b);

    anim.bulbs.push(b);

    if (!anim.zones[zone]) anim.zones[zone] = [];

    anim.zones[zone].push(b);
}

function skull(R, x, y, z, yaw, glow) {

    const t = mats();

    const m = M();

    R.sph(t.bone, 0.2, x, y + 0.12, z);

    R.box(t.bone, 0.12, 0.06, 0.12, x, y + 0.02, z + 0.04 * Math.cos(yaw));

    R.sph(m.dark, 0.055, x - 0.045, y + 0.14, z + 0.085);

    R.sph(m.dark, 0.055, x + 0.045, y + 0.14, z + 0.085);

    if (glow) {

        R.sph(m.eyes, 0.025, x - 0.045, y + 0.14, z + 0.1);

        R.sph(m.eyes, 0.025, x + 0.045, y + 0.14, z + 0.1);
    }
}

function hangingChain(R, x, z, topY, links) {

    const m = M();

    const g = new THREE.Group();

    g.position.set(x, topY, z);

    for (let i = 0; i < links; i++) {

        const link = new THREE.Mesh(U.box, m.iron);

        link.scale.set(0.05, 0.14, 0.02);

        link.position.y = -i * 0.13;

        link.rotation.y = (i % 2) * Math.PI / 2;

        g.add(link);
    }

    // rusty hook at the end
    const hook = new THREE.Mesh(U.box, m.iron);

    hook.scale.set(0.12, 0.04, 0.04);

    hook.position.y = -links * 0.13;

    g.add(hook);

    R.group.add(g);

    anim.swings.push({
        g, speed: 0.9, phase: Math.random() * 6, amp: 0.06
    });
}


// ------------------------------------------------------
// ONE FLIGHT
// ------------------------------------------------------

function flight(R, side, base, rng) {

    const m = M();

    const x0 = side < 0 ? -14.74 : 14.74;           // outer wall face

    const cx = side < 0 ? -13 : 13;

    const zone = side < 0 ? "S-L" : "S-R";

    const lean = side < 0 ? -1 : 1;

    const wallRy = side < 0 ? Math.PI / 2 : -Math.PI / 2;

    // tube lights on the outer wall, one every 6 steps
    for (const i of [3, 9, 15]) {

        torch(R, x0 - lean * 0.0, STEP_TOP(base, i) + 1.15, STEP_Z(i), lean, zone);
    }

    // blood on the steps
    for (const i of [2, 6, 10, 13, 17]) {

        R.pln(
            m.blood, 0.8, 0.6,
            cx + (rng() - 0.5) * 1.6,
            STEP_TOP(base, i) + 0.012,
            STEP_Z(i),
            { rx: -Math.PI / 2, rz: rng() * 6 }
        );
    }

    // hand prints and drips on the wall
    for (const i of [5, 8, 12, 16]) {

        R.pln(
            m.hand, 0.32, 0.32,
            x0 - lean * 0.01,
            STEP_TOP(base, i) + 0.7 + rng() * 0.9,
            STEP_Z(i) + (rng() - 0.5) * 0.4,
            { ry: wallRy, rz: (rng() - 0.5) * 0.7 }
        );
    }

    R.pln(
        m.blood, 1.3, 1.3,
        x0 - lean * 0.01,
        STEP_TOP(base, 11) + 1.2, STEP_Z(11),
        { ry: wallRy }
    );

    // writing on the wall
    const words = side < 0
        ? ["GO BACK", "HE IS ABOVE"]
        : ["TOO LATE", "DON'T LOOK BACK"];

    const word = words[base === 8 ? 1 : 0];

    const tt = textTex(word, "#8a0b0b", 512, 192);

    if (tt) {

        R.pln(
            new THREE.MeshBasicMaterial({
                map: tt, transparent: true, depthWrite: false,
                polygonOffset: true, polygonOffsetFactor: -2
            }),
            2.8, 1.05,
            x0 - lean * 0.01,
            STEP_TOP(base, 7) + 1.9, STEP_Z(7),
            { ry: wallRy, keep: true }
        );
    }

    // skulls and bones left on the steps
    skull(R, cx - 1.0, STEP_TOP(base, 8), STEP_Z(8), 0, base === 4);

    skull(R, cx + 0.9, STEP_TOP(base, 14), STEP_Z(14), 0, false);

    R.box(mats().bone, 0.5, 0.05, 0.07, cx + 0.2, STEP_TOP(base, 5) + 0.02, STEP_Z(5), { ry: 0.5 });

    R.box(mats().bone, 0.5, 0.05, 0.07, cx + 0.2, STEP_TOP(base, 5) + 0.02, STEP_Z(5), { ry: -0.5 });

    // cobwebs in the corners and a big spider
    placeWeb(R, x0 - lean * 0.02, STEP_TOP(base, 18) + 2.3, -3.2, 1.6, wallRy);

    placeWeb(R, x0 - lean * 0.02, base + 3.6, 1.8, 1.4, wallRy);

    placeSpider(
        R, x0 - lean * 0.06, STEP_TOP(base, 17) + 1.9, -3.3, 1.6,
        wallRy, Math.PI / 2
    );
}

export function decorateStairs(scene, collisionSystem, interaction) {

    const rng = mulberry32(2468);

    const ctx = {
        scene,
        cs: collisionSystem,
        floorNumber: 1,
        floorHeight: 0,
        interaction
    };

    const R = newBuilder(ctx, 0, 0, 0);

    flight(R, -1, 0, rng);       // A

    flight(R, 1, 4, rng);        // B

    flight(R, -1, 8, rng);       // C

    // chains hanging down the empty shaft above flight A
    for (const [x, z, n] of [[-13, 1.2, 14], [-12.2, -0.6, 12], [-13.7, -2.0, 15]]) {

        hangingChain(R, x, z, 8.0, n);
    }

    R.finish();
}