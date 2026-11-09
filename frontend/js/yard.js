// ======================================================
// THE WAY IN:  stone -> gate lock -> hidden key -> main door lock
//
//   1. A heavy stone lies beside the road near the gate (E picks it up).
//   2. The gate is chained with a padlock.  E with the stone: three blows.
//   3. A heavy iron key is hidden at ONE random place in the compound
//      (a different place every new game): old well, grave mound, clay pot,
//      mailbox, crate, rusty bucket.  E searches each one.
//   4. The key opens the strong lock on the main door of the hostel.
//
// Edit the positions in YARD_SPOTS to move things.
// ======================================================
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { inventory, addPickup } from "./inventory.js";
import { audio } from "./audio.js";
import { story } from "./story.js";
import { locks, MAIN_KEY_SPOTS } from "./locks.js";
import { events } from "./events.js";
import { frameHooks } from "./haunted.js";
import { buildRitualSeal } from "./ritualdoor.js";

export const STONE_POS = { x: 29.4, z: 4.6 };

// ids must match MAIN_KEY_SPOTS in locks.js
export const YARD_SPOTS = [
    { id: "well",    label: "the old well",   x: -10.0, y: 0.9, z: -19.3, sx: 1.6, sy: 1.4, sz: 1.0,
      none: "Cold air and dark water. Nothing but your own breathing comes back.",
      found: "Tied under the rim of the bucket, on a wet string, hangs a heavy iron key." },
    { id: "grave",   label: "the grave mound", x: -19.5, y: 0.35, z: 2.6, sx: 1.4, sy: 0.7, sz: 1.8,
      none: "Loose earth, a rotten wooden cross. Nothing is buried here that you want to find.",
      found: "Something metal in the loose earth at the foot of the cross: a heavy iron key." },
    { id: "pot",     label: "the clay pot",   x: 19.3, y: 0.4, z: 7.3, sx: 0.7, sy: 0.8, sz: 0.7,
      none: "Dry soil and a dead plant. Nothing else.",
      found: "Under the dead plant, wrapped in a rag: a heavy iron key." },
    { id: "mailbox", label: "the mailbox",    x: 19.9, y: 1.15, z: -5.3, sx: 0.5, sy: 0.5, sz: 0.5,
      none: "A few wet leaves and a dead moth.",
      found: "Behind a pile of wet leaves: a heavy iron key." },
    { id: "crate",   label: "the wooden crate", x: 24.0, y: 0.45, z: 16.5, sx: 0.9, sy: 0.9, sz: 0.9,
      none: "Straw and mouse droppings.",
      found: "Buried in the straw: a heavy iron key." },
    { id: "bucket",  label: "the rusty bucket", x: 25.0, y: 0.35, z: -6.5, sx: 0.7, sy: 0.7, sz: 0.7,
      none: "Rainwater, a dead beetle. Nothing else.",
      found: "At the bottom of the bucket, under a rusted lid: a heavy iron key." }
];

inventory.define("gate_stone", { name: "Heavy stone", kind: "thing", icon: "\uD83E\uDEA8", text: "" });
inventory.define("main_key", { name: "Iron key (MAIN DOOR)", kind: "thing", icon: "\uD83D\uDDDD\uFE0F", text: "" });
inventory.define("blade", { name: "Rusty blade", kind: "thing", icon: "\uD83D\uDDE1\uFE0F", text: "" });

// make sure a key spot exists (old saves)
export function ensureKeySpot() {

    if (inventory.flag("main_unlocked") || inventory.has("main_key")) return;

    if (MAIN_KEY_SPOTS.some((s) => inventory.flag("mk_" + s))) return;

    inventory.setFlag("mk_" + MAIN_KEY_SPOTS[Math.floor(Math.random() * MAIN_KEY_SPOTS.length)]);
}

// ------------------------------------------------------
// the stone beside the road
// ------------------------------------------------------
// ------------------------------------------------------
// a REAL iron key: ring bow, collars, long shaft, a toothed bit, and a paper tag on a cord
// ------------------------------------------------------
function makeIronKey() {

    const key = new THREE.Group();

    const iron = new THREE.MeshStandardMaterial({ color: 0x3c3b39, roughness: 0.5, metalness: 0.9 });

    const rustM = new THREE.MeshStandardMaterial({ color: 0x6a4328, roughness: 0.95, metalness: 0.35 });

    const add = (mesh, x, y, z) => { mesh.position.set(x, y, z); key.add(mesh); return mesh; };

    // the bow (the round handle): a thick ring with a smaller ring inside
    add(new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.0115, 10, 28), iron), -0.1, 0, 0);

    add(new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.0075, 8, 20), rustM), -0.1, 0, 0);

    // the shaft, with three collars
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0095, 0.2, 12), iron);

    shaft.rotation.z = Math.PI / 2;

    add(shaft, 0.02, 0, 0);

    for (const x of [-0.046, -0.026, -0.008]) {

        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.0155, 0.0155, 0.007, 12), x === -0.026 ? rustM : iron);

        c.rotation.z = Math.PI / 2;

        add(c, x, 0, 0);
    }

    // the bit (the part that turns the lock): a plate with teeth
    add(new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.044, 0.011), iron), 0.07, -0.022, 0);

    for (const [x, h] of [[0.046, 0.014], [0.062, 0.02], [0.078, 0.012], [0.094, 0.018]]) add(new THREE.Mesh(new THREE.BoxGeometry(0.01, h, 0.011), iron), x, -0.044 - h / 2, 0);

    add(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.026, 0.011), rustM), 0.1, -0.012, 0);

    // a cord through the bow with a small paper tag: MAIN DOOR
    const cord = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0022, 5, 12), new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 1 }));

    add(cord, -0.1, 0.05, 0);

    const tagTex = new THREE.CanvasTexture((() => {

        const c = document.createElement("canvas");

        c.width = 128; c.height = 80;

        const g = c.getContext("2d");

        g.fillStyle = "#d8c9a0"; g.fillRect(0, 0, 128, 80);

        g.strokeStyle = "rgba(90,60,30,.5)"; g.lineWidth = 4; g.strokeRect(2, 2, 124, 76);

        g.fillStyle = "#3a1a10"; g.font = "bold 22px Georgia"; g.textAlign = "center"; g.fillText("MAIN", 64, 34); g.fillText("DOOR", 64, 60);

        g.fillStyle = "#e8e0c8"; g.beginPath(); g.arc(12, 12, 5, 0, 7); g.fill();

        return c;
    })());

    tagTex.colorSpace = THREE.SRGBColorSpace;

    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.038), new THREE.MeshStandardMaterial({ map: tagTex, side: THREE.DoubleSide, roughness: 1 }));

    add(tag, -0.1, 0.085, 0.002).rotation.z = 0.12;

    return key;
}

export function buildYardPuzzle(scene, interaction) {

    ensureKeySpot();

    const g = new THREE.Group();

    scene.add(g);

    // the key you find: shown turning slowly in your hand while you decide
    const keyMesh = makeIronKey();

    keyMesh.visible = false;

    keyMesh.scale.setScalar(0.62);          // a normal door key (about 14 cm long)

    scene.add(keyMesh);

    const hp = new THREE.Vector3(), hd = new THREE.Vector3(), keyFrom = new THREE.Vector3();

    let keyShown = -1;

    frameHooks.push((t) => {

        if (!keyMesh.visible || !inventory.camera) return;

        const cam = inventory.camera;

        cam.getWorldDirection(hd);

        // pickup animation: the key rises from the hiding place into your hand over a moment
        if (keyShown < 0) keyShown = t;

        const k = Math.min(1, (t - keyShown) / 0.7), e = 1 - Math.pow(1 - k, 3);

        hp.copy(cam.position).addScaledVector(hd, 0.42);

        hp.y -= 0.07;

        hp.x += (keyFrom.x - hp.x) * (1 - e) * 0.6;

        hp.y += (keyFrom.y - hp.y) * (1 - e) * 0.6;

        hp.z += (keyFrom.z - hp.z) * (1 - e) * 0.6;

        keyMesh.position.copy(hp);

        keyMesh.rotation.set(0.35 + (1 - e) * 1.2, t * 1.1, Math.PI / 2 + Math.sin(t * 2.0) * 0.06);
    });

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8a8880, roughness: 1 });

    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), stoneMat);

    rock.scale.set(1.2, 0.8, 1.0);

    rock.position.set(STONE_POS.x, 0.16, STONE_POS.z);

    rock.rotation.set(0.3, 0.8, 0.1);

    g.add(rock);

    const small = new THREE.Mesh(new THREE.DodecahedronGeometry(0.1, 0), stoneMat);

    small.position.set(STONE_POS.x + 0.35, 0.07, STONE_POS.z - 0.2);

    g.add(small);

    addPickup(interaction, g, {
        id: "gate_stone", mesh: rock, x: STONE_POS.x, y: 0.3, z: STONE_POS.z, size: 1.0,
        onPick: () => { rock.visible = false; inventory.say("A heavy stone, fits your hand. It might break a lock.", 3.5); story.refresh(); }
    });

    // keep the stone gone / back according to the save
    locks.register(() => { rock.visible = !inventory.has("gate_stone") && !inventory.flag("gate_broken"); });

    // ---- the key spots ----
    const clay = new THREE.MeshStandardMaterial({ color: 0x7a3f2a, roughness: 1 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x4b3a28, roughness: 1 });
    const iron = new THREE.MeshStandardMaterial({ color: 0x2a2623, roughness: 0.8, metalness: 0.4 });
    const soil = new THREE.MeshStandardMaterial({ color: 0x2c241c, roughness: 1 });

    const add = (geo, mat, x, y, z, rx, ry, rz) => {
        const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, rz || 0); g.add(m); return m;
    };

    // pot
    add(new THREE.CylinderGeometry(0.28, 0.2, 0.5, 12), clay, 19.3, 0.25, 7.3);
    add(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 12), soil, 19.3, 0.5, 7.3);
    // mailbox on a post
    add(new THREE.BoxGeometry(0.1, 1.1, 0.1), wood, 19.9, 0.55, -5.3);
    add(new THREE.BoxGeometry(0.4, 0.28, 0.24), iron, 19.9, 1.2, -5.3);
    // crate
    add(new THREE.BoxGeometry(0.9, 0.8, 0.9), wood, 24.0, 0.4, 16.5, 0, 0.3, 0);
    // bucket
    add(new THREE.CylinderGeometry(0.28, 0.22, 0.45, 12), iron, 25.0, 0.22, -6.5);
    // grave mound with a cross
    add(new THREE.BoxGeometry(1.1, 0.28, 1.9), soil, -19.5, 0.14, 2.6);
    add(new THREE.BoxGeometry(0.1, 1.1, 0.1), wood, -19.5, 0.8, 1.7, 0, 0, 0.12);
    add(new THREE.BoxGeometry(0.6, 0.1, 0.1), wood, -19.5, 1.05, 1.7, 0, 0, 0.12);

    for (const sp of YARD_SPOTS) {

        const trig = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));

        trig.scale.set(sp.sx, sp.sy, sp.sz);

        trig.position.set(sp.x, sp.y, sp.z);

        trig.visible = false;

        g.add(trig);

        trig.userData.getPrompt = () => "Press E - Search " + sp.label;

        trig.userData.interact = () => {

            if (inventory.flag("mk_" + sp.id) && !inventory.has("main_key") && !inventory.flag("main_unlocked")) {

                audio.paper();

                keyMesh.visible = true;

                keyShown = -1;

                keyFrom.set(sp.x, sp.y, sp.z);

                inventory.openReader({
                    title: "Iron key", mode: "pickup", bare: true,
                    text: sp.found + "\nA small paper tag hangs from the cord: MAIN DOOR.",
                    onKeep: () => { keyMesh.visible = false; inventory.add("main_key"); story.refresh(); },
                    onPut: () => { keyMesh.visible = false; }
                });
            }
            else {

                audio.paper();

                inventory.say(sp.none, 3.5);
            }
        };

        interaction.add(trig);
    }
}

// ------------------------------------------------------
// the strong lock on the main door
// ------------------------------------------------------
export function lockMainDoor(door, handle, width) {

    // the ritual-sealed door from the reference picture (ritualdoor.js): painted door, red + yellow
    // threads in a star, bells, chillies, lemons, bloody bag and a heavy bolt with an old padlock
    const hasp = buildRitualSeal(door, width);

    // tell the ghost when the front door stands open (he then also patrols the lawn outside it)
    {
        let lastOpen = null;

        frameHooks.push(() => {

            const o = !!handle.isOpen && unlocked();

            if (o !== lastOpen) { lastOpen = o; events.emit("main-door-state", o); }
        });
    }

    // the ending: the front door stands open
    events.on("outro-open-main", () => { if (!handle.isOpen) handle.setOpen(true); door.userData.isOpen = true; hasp.visible = false; });

    frameHooks.push((t) => { if (hasp.visible && hasp.userData.sway) hasp.userData.sway(t); });

    const openedBefore = door.userData.interact;

    const promptBefore = door.userData.getPrompt;

    const unlocked = () => inventory.flag("main_unlocked");

    locks.register(() => { hasp.visible = !unlocked(); door.userData.isLocked = !unlocked(); });

    door.userData.getPrompt = () => {

        if (unlocked()) return promptBefore();

        return inventory.has("main_key") ? "Press E - Unlock the main door" : "Press E - The main door is locked";
    };

    door.userData.interact = () => {

        if (unlocked()) { openedBefore(); return; }

        if (inventory.has("main_key")) {

            inventory.remove("main_key");

            inventory.setFlag("main_unlocked");

            audio.keyUnlock();

            inventory.say("The heavy lock gives way with a clunk... and the charms fall silent.", 3.5);

            locks.refresh();

            story.refresh();

            // the door swings open BY ITSELF, slowly, and something steps out of the dark
            setTimeout(() => {

                if (!handle.isOpen) { handle.setOpen(true); door.userData.isOpen = true; }

                const wp = new THREE.Vector3();

                door.getWorldPosition(wp);

                events.emit("main-door-unlocked", { x: wp.x, z: wp.z });

            }, 1600);

            return;
        }

        audio.doorLocked();

        inventory.say("A thick iron lock. The key must be somewhere in the compound.", 4);
    };
}