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

    keyMesh.scale.setScalar(1.9);

    scene.add(keyMesh);

    const hp = new THREE.Vector3(), hd = new THREE.Vector3();

    frameHooks.push((t) => {

        if (!keyMesh.visible || !inventory.camera) return;

        const cam = inventory.camera;

        cam.getWorldDirection(hd);

        hp.copy(cam.position).addScaledVector(hd, 0.55);

        hp.y -= 0.09;

        keyMesh.position.copy(hp);

        keyMesh.rotation.set(0.35, t * 1.3, Math.PI / 2);
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

    const iron = new THREE.MeshStandardMaterial({ color: 0x55504a, roughness: 0.55, metalness: 0.7 });

    const rust = new THREE.MeshStandardMaterial({ color: 0x9a6232, roughness: 0.8, metalness: 0.5, emissive: 0x1a0d04 });

    const hasp = new THREE.Group();

    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.22, width * 0.96), iron);

    bar.position.set(0.13, 0.1, 0);

    hasp.add(bar);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.3), rust);

    body.position.set(0.25, -0.12, 0);

    hasp.add(body);

    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 14, Math.PI), iron);

    shackle.position.set(0.25, 0.12, 0);

    shackle.rotation.set(0, Math.PI / 2, 0);

    hasp.add(shackle);

    door.add(hasp);

    // ================= the lock is COVERED with traditional charms against ghosts =================
    // black thread (kala dhaga) bound round the lock, a lemon with seven green chillies (nimbu-mirchi),
    // a red sacred thread, a black clay "nazar battu" face, an iron horseshoe, and a red trishul
    // with turmeric and white ash painted on the door.
    const mat = (c, r, m, e) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m || 0, emissive: e || 0x000000 });

    const thread = mat(0x0a0909, 0.95);

    const put = (mesh, x, y, z, parent) => { mesh.position.set(x, y, z); (parent || hasp).add(mesh); return mesh; };

    // 1) black thread: wrapped many times round the lock body and criss-crossed
    for (let i = 0; i < 9; i++) put(new THREE.Mesh(new THREE.BoxGeometry(0.212, 0.009, 0.312), thread), 0.25, -0.3 + i * 0.045 + (i % 2) * 0.004, 0);

    for (const z of [-0.09, -0.03, 0.04, 0.1]) {

        const v = put(new THREE.Mesh(new THREE.BoxGeometry(0.214, 0.41, 0.008), thread), 0.25, -0.12, z);

        v.rotation.x = z * 0.9;
    }

    // thread round the hasp bar too
    for (let i = -5; i <= 5; i++) put(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.236, 0.01), thread), 0.13, 0.1, i * 0.045);

    // 2) red sacred thread (mauli) tied on the shackle, with two loose ends
    const redM = mat(0xb01418, 0.8, 0, 0x300404);

    for (let i = 0; i < 4; i++) { const r = put(new THREE.Mesh(new THREE.TorusGeometry(0.1 + i * 0.002, 0.007, 5, 14, Math.PI), redM), 0.25, 0.12 + i * 0.012, 0); r.rotation.set(0, Math.PI / 2, 0); }

    put(new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.12, 3, 6), redM), 0.34, 0.0, 0.1).rotation.z = 0.2;

    put(new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.09, 3, 6), redM), 0.34, 0.02, -0.12).rotation.z = -0.15;

    // 3) nimbu-mirchi: one lemon and seven green chillies on a thread, hanging beside the lock
    const hang = new THREE.Group();

    hang.position.set(0.3, 0.2, 0.19);

    hasp.add(hang);

    const cordM = mat(0x2a1a10, 1);

    hang.add(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.62, 5), cordM)).position.y = -0.31;

    const lemonM = mat(0xe7d12a, 0.55, 0, 0x2a2406);

    const chilliM = mat(0x2f9a2c, 0.5, 0, 0x06200a);

    const lemon = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 10), lemonM);

    lemon.scale.set(1, 0.86, 1);

    lemon.position.y = -0.31;

    hang.add(lemon);

    // the lemon's two small pointed ends
    for (const s of [-1, 1]) { const n = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.025, 6), lemonM); n.position.set(0, -0.31 + s * 0.046, 0); n.rotation.z = s < 0 ? Math.PI : 0; hang.add(n); }

    for (let i = 0; i < 7; i++) {

        const up = i < 3;

        const chilli = new THREE.Mesh(new THREE.CapsuleGeometry(0.0085, 0.085, 3, 8), chilliM);

        chilli.position.set((i % 2 ? 0.012 : -0.012), up ? -0.06 - i * 0.07 : -0.4 - (i - 3) * 0.055, 0);

        chilli.rotation.z = (i % 2 ? 0.2 : -0.2);

        hang.add(chilli);
    }

    // 4) nazar battu: a black clay pot-face with big white eyes and teeth, on a cord
    const faceTex = new THREE.CanvasTexture((() => {

        const c = document.createElement("canvas");

        c.width = 128; c.height = 128;

        const g = c.getContext("2d");

        g.fillStyle = "#0b0a0a"; g.fillRect(0, 0, 128, 128);

        g.fillStyle = "#f2efe6"; g.beginPath(); g.ellipse(40, 50, 17, 12, 0, 0, 7); g.ellipse(88, 50, 17, 12, 0, 0, 7); g.fill();

        g.fillStyle = "#101010"; g.beginPath(); g.arc(40, 50, 6, 0, 7); g.arc(88, 50, 6, 0, 7); g.fill();

        g.fillStyle = "#b01418"; g.beginPath(); g.arc(64, 74, 5, 0, 7); g.fill();

        g.fillStyle = "#f2efe6"; g.beginPath(); g.moveTo(26, 90); g.quadraticCurveTo(64, 120, 102, 90); g.lineTo(96, 96); g.quadraticCurveTo(64, 112, 32, 96); g.fill();

        for (let k = 0; k < 6; k++) g.fillRect(34 + k * 12, 98 + (k % 2) * 3, 5, 9);

        return c;
    })());

    faceTex.colorSpace = THREE.SRGBColorSpace;

    const nazar = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.4, metalness: 0.2 }));

    nazar.rotation.y = Math.PI / 2;

    put(nazar, 0.3, -0.5, -0.17);

    put(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.34, 5), cordM), 0.3, -0.31, -0.17);

    // 5) an iron horseshoe nailed above the lock (open end up, to hold the luck in)
    const shoeM = mat(0x2e2c2b, 0.5, 0.85);

    const shoe = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.016, 7, 20, Math.PI * 1.6), shoeM);

    shoe.rotation.set(0, Math.PI / 2, Math.PI * 0.7);

    put(shoe, 0.18, 0.46, 0);

    for (const a of [-1, 1]) put(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.04, 5), shoeM), 0.18, 0.46 + a * 0.05, a * 0.05).rotation.z = Math.PI / 2;

    // 6) a red trishul, turmeric streaks and white ash lines painted on the door itself
    const doorArt = new THREE.CanvasTexture((() => {

        const c = document.createElement("canvas");

        c.width = 256; c.height = 320;

        const g = c.getContext("2d");

        g.clearRect(0, 0, 256, 320);

        // turmeric (haldi) streaks
        g.strokeStyle = "rgba(226,172,24,0.75)"; g.lineWidth = 9; g.lineCap = "round";

        for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(40 + k * 40, 250); g.lineTo(46 + k * 40 + (k % 2) * 8, 300); g.stroke(); }

        // white ash (vibhuti) lines
        g.strokeStyle = "rgba(235,232,222,0.85)"; g.lineWidth = 5;

        for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(40, 218 + k * 12); g.lineTo(216, 218 + k * 12); g.stroke(); }

        // the trishul in kumkum red: a shaft and three prongs
        g.strokeStyle = "rgba(190,16,22,0.95)"; g.lineWidth = 11;

        g.beginPath(); g.moveTo(128, 205); g.lineTo(128, 40); g.stroke();

        g.beginPath(); g.moveTo(84, 90); g.quadraticCurveTo(84, 150, 128, 150); g.quadraticCurveTo(172, 150, 172, 90); g.stroke();

        g.beginPath(); g.moveTo(84, 90); g.lineTo(84, 52); g.moveTo(172, 90); g.lineTo(172, 52); g.moveTo(128, 40); g.lineTo(128, 30); g.stroke();

        g.fillStyle = "rgba(190,16,22,0.95)";

        for (const x of [84, 128, 172]) { g.beginPath(); g.moveTo(x - 11, x === 128 ? 40 : 52); g.lineTo(x, x === 128 ? 14 : 24); g.lineTo(x + 11, x === 128 ? 40 : 52); g.fill(); }

        // kumkum dots
        for (let k = 0; k < 7; k++) { g.beginPath(); g.arc(34 + k * 31, 232 + (k % 2) * 6, 5, 0, 7); g.fill(); }

        return c;
    })());

    doorArt.colorSpace = THREE.SRGBColorSpace;

    const art = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.7), new THREE.MeshBasicMaterial({ map: doorArt, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, color: 0xd8d0c4 }));

    art.rotation.y = Math.PI / 2;

    put(art, 0.012, 0.62, 0, door);

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