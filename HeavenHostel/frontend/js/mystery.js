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

const ROOM = { x: 0, y: -24, z: 0, hx: 3.2, hz: 2.8 };

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

    const plaster = std(0x6a6454);

    const floorM = std(0x2a2520);

    const wood = std(0x4a3220);

    const darkWood = std(0x2e1f14);

    const iron = std(0x2a2c2f, { roughness: 0.6, metalness: 0.5 });

    const sheet = std(0xb9b09a);

    const blanket = std(0x7a3a30);

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

    // ---- the bed (west wall) ----
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

    // a small trunk
    R.box(darkWood, 0.8, 0.45, 0.5, 0.2, 0, hz - 0.5);

    R.box(iron, 0.82, 0.05, 0.52, 0.2, 0.3, hz - 0.5);

    R.collider(0.85, 0.5, 0.55, 0.2, 0, hz - 0.5);

    // ---- a drawing of the tamarind tree on the north wall ----
    const tex = canvasTexture(512, 384, (g, w, h) => {

        g.fillStyle = "#d9cfae"; g.fillRect(0, 0, w, h);

        g.fillStyle = "#b9a98a"; g.fillRect(0, h - 70, w, 70);

        g.fillStyle = "#4a3320"; g.fillRect(w / 2 - 14, h - 210, 28, 150);

        g.fillStyle = "#3d6a32";

        for (const [cx, cy, r] of [[w / 2, h - 230, 90], [w / 2 - 70, h - 200, 60], [w / 2 + 75, h - 205, 62], [w / 2 + 10, h - 285, 55]]) {

            g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
        }

        g.fillStyle = "#6a4a2a"; g.fillRect(40, h - 140, 60, 80); g.fillStyle = "#7a2a20"; g.fillRect(36, h - 160, 68, 24);

        g.fillStyle = "#2a1a10"; g.font = "bold 26px Georgia"; g.fillText("KOTHAPALLI", 20, 40);

        g.font = "20px Georgia"; g.fillText("Amma  Nanna  Ramu", 20, 70);
    });

    const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.12), new THREE.MeshBasicMaterial({ map: tex }));

    pic.position.set(0, 1.7, -hz + 0.02);

    R.group.add(pic);

    // ---- one warm bulb ----
    bulb(R, 0, 0, false, "U", { y: 2.9, top: 3.3, color: 0xffe2b0, light: 0xffd49a });

    R.finish();

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

    // ---- the bed: put the letter here ----
    const trig = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));

    trig.scale.set(1.5, 1.2, 2.5);

    trig.position.set(ROOM.x + bx, ROOM.y + 0.7, ROOM.z + bz);

    trig.visible = false;

    scene.add(trig);

    let done = false;

    trig.userData.getPrompt = () => (inventory.has("ramu_letter") ? "Press E - Lay Ramu's letter on his bed" : "Press E - Look at the bed");

    trig.userData.interact = () => {

        if (done) return;

        if (!inventory.has("ramu_letter")) {

            audio.puzzle("tick");

            inventory.say("A narrow bed, neatly made. Someone has been waiting here for a very long time.", 4);

            return;
        }

        done = true;

        audio.paper();

        boy.visible = true;

        const t0 = performance.now();

        const fadeIn = () => {

            const k = Math.min(1, (performance.now() - t0) / 1800);

            ghostMat.opacity = 0.55 * k;

            if (k < 1) requestAnimationFrame(fadeIn);
        };

        fadeIn();

        inventory.say("The letter lies on the shirt. The air in the room grows still...", 3);

        setTimeout(() => story.ending(), 2600);
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

    trig.userData.getPrompt = () => "Press E - Go through the door";

    trig.userData.interact = () => {

        if (going) return;

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
