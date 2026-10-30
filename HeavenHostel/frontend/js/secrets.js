import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

import { inventory, addPickup } from "./inventory.js";
import { audio } from "./audio.js";
import { story } from "./story.js";
import { theCase } from "./gen.js";

// ======================================================
// THE THREE "DO SOMETHING" PUZZLES  (no codes)
//
//   book    MESS HALL, south wall: an old bookcase.  A note tells you the
//           colour of Ramu's favourite book.  Pull THAT book out (press E on it)
//           and a hidden door in the bottom of the bookcase swings open.
//
//   rat     MESS HALL, north wall: a hungry rat by a hole.  Find the cheese in
//           a room (see the hint), come back, press E at the hole: the rat takes
//           it and a loose brick falls out of the wall.
//
//   lever   TERRACE ROOM, back wall: a lever with no handle.  Find the iron
//           handle in a room, press E to fit it, press E again to pull it:
//           a hidden door in the wall swings open.
//
// Every one of them gives a normal clue page (clues.js) when it is solved,
// and a new game closes everything again (inventory.resetHooks).
// ======================================================

inventory.define("cheese", { name: "Piece of cheese", kind: "thing", icon: "\uD83E\uDDC0", text: "" });

inventory.define("handle", { name: "Iron lever handle", kind: "thing", icon: "\uD83D\uDD27", text: "" });

// ------------------------------------------------------ materials / shapes
const G = {
    box: new THREE.BoxGeometry(1, 1, 1),
    sph: new THREE.SphereGeometry(0.5, 10, 8),
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10)
};

let MAT = null;

function mats() {

    if (MAT) return MAT;

    const std = (color, extra) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.9 }, extra || {}));

    MAT = {
        wood: std(0x4a3020),
        woodDark: std(0x2b1c12),
        woodDoor: std(0x3c2616),
        dark: std(0x050403, { roughness: 1 }),
        brick: std(0x6a3a2c),
        brickLoose: std(0x7a4636),
        iron: std(0x3a3a3c, { roughness: 0.5, metalness: 0.6 }),
        ironBright: std(0x77787a, { roughness: 0.4, metalness: 0.7, emissive: 0x1a1a1c }),
        paper: std(0xcfc5a3, { emissive: 0x2a2618 }),
        cloth: std(0xb9a98a, { emissive: 0x2a2418 }),
        cheese: std(0xe2b52a, { emissive: 0x4a3a08 }),
        rat: std(0x3a3733),
        ratEye: new THREE.MeshBasicMaterial({ color: 0xd42a1a }),
        junk: [0x3a2a22, 0x2a2e34, 0x40382a, 0x2a2a2a].map((c) => std(c))
    };

    return MAT;
}

const BOOK_HEX = { RED: 0xb02020, GREEN: 0x1f8a3a, BLUE: 0x2a4fb0, YELLOW: 0xe0b820, WHITE: 0xe6e2d4, BLACK: 0x1c1c1c };

// ------------------------------------------------------ tiny tween (own loop)
const tweens = [];

let running = false;

function tickTweens(now) {

    for (let i = tweens.length - 1; i >= 0; i--) {

        const t = tweens[i];

        const k = Math.max(0, Math.min(1, (now - t.t0) / t.ms));

        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

        t.obj[t.key][t.axis] = t.from + (t.to - t.from) * e;

        if (k >= 1) {

            tweens.splice(i, 1);

            if (t.done) t.done();
        }
    }

    if (tweens.length) requestAnimationFrame(tickTweens);
    else running = false;
}

// tween("position.z", mesh, value, ms)
export function tween(obj, path, to, ms, done) {

    const [key, axis] = path.split(".");

    for (let i = tweens.length - 1; i >= 0; i--) {
        if (tweens[i].obj === obj && tweens[i].key === key && tweens[i].axis === axis) tweens.splice(i, 1);
    }

    tweens.push({ obj, key, axis, from: obj[key][axis], to, ms, t0: performance.now(), done });

    if (!running) {
        running = true;
        requestAnimationFrame(tickTweens);
    }
}

// ------------------------------------------------------ interaction helpers
const trigGeo = new THREE.BoxGeometry(1, 1, 1);

function trigger(R, x, y, z, sx, sy, sz, getPrompt, act) {

    const t = new THREE.Mesh(trigGeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));

    t.scale.set(sx, sy, sz);

    t.position.set(x, y, z);

    t.visible = false;

    R.group.add(t);

    t.userData.getPrompt = getPrompt;

    t.userData.interact = act;

    R.interaction.add(t);

    return t;
}

// chapter-2 things wait until the story of chapter 1 has been shown
function tooEarly() {

    if (inventory.flag("story_shown")) return false;

    inventory.say("You do not understand what you are looking at yet. Learn who he was first.", 4);

    audio.doorLocked();

    return true;
}

// a door that swings on a hinge: a group at the hinge, the board inside it
function hingedDoor(R, mat, hx, yb, hz, w, h, th) {

    const g = new THREE.Group();

    g.position.set(hx, yb, hz);

    const board = new THREE.Mesh(G.box, mat);

    board.scale.set(w, h, th);

    board.position.set(w / 2, h / 2, 0);

    g.add(board);

    R.group.add(g);

    return g;
}

// ======================================================
// 1) THE BOOKCASE  (mess hall = ground-floor hall, south wall)
// ======================================================
export function addBookcase(R) {

    const t = mats();

    const x0 = 5.25, zc = 3.575, W = 1.1, H = 1.9, D = 0.35;

    // the case
    R.box(t.wood, 0.05, H, D, x0 - W / 2 + 0.025, 0, zc);

    R.box(t.wood, 0.05, H, D, x0 + W / 2 - 0.025, 0, zc);

    R.box(t.woodDark, W, H, 0.03, x0, 0, 3.735);

    for (const yb of [0.5, 0.98, 1.4, 1.86]) R.box(t.wood, W, 0.04, D, x0, yb, zc);

    R.collider(W, H, D, x0, 0, zc);

    // untidy dull books on the top and bottom shelf
    for (let i = 0; i < 7; i++) {

        R.box(t.junk[i % 4], 0.1 + (i % 3) * 0.02, 0.26 + (i % 2) * 0.05, 0.2, x0 - 0.42 + i * 0.14, 1.44, zc, { rz: i === 3 ? 0.18 : 0 });

        R.box(t.junk[(i + 1) % 4], 0.11, 0.24 + (i % 3) * 0.03, 0.2, x0 - 0.4 + i * 0.14, 0.54, zc);
    }

    // the secret: the bottom of the bookcase is a hidden door
    const hx = x0 - W / 2 + 0.05;

    const frontZ = zc - D / 2 + 0.01;

    R.box(t.dark, W - 0.1, 0.44, 0.02, x0, 0.04, 3.715);

    const note = R._m(G.box, t.paper, 0.26, 0.02, 0.18, x0, 0.1, zc + 0.02, { keep: true, ry: 0.3 });

    const door = hingedDoor(R, t.woodDoor, hx, 0.03, frontZ, W - 0.1, 0.45, 0.03);

    // the six coloured books (the colours are shuffled for every new game)
    const mid = 1.02;

    const books = [];

    for (let i = 0; i < 6; i++) {

        const bx = x0 - 0.4 + i * 0.16;

        const mat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 });

        const mesh = R._m(G.box, mat, 0.12, 0.3, 0.22, bx, mid + 0.15, zc, { keep: true });

        const b = { i, mat, mesh, z0: zc, name: "" };

        books.push(b);

        trigger(
            R, bx, mid + 0.15, zc - 0.1, 0.15, 0.34, 0.3,
            () => story.solved("book") ? "Press E - the " + b.name + " book (done)" : "Press E - Pull out the " + b.name + " book",
            () => pull(b)
        );
    }

    let busy = false;

    const sync = () => {

        const c = theCase();

        books.forEach((b, i) => {

            b.name = c.book.shelf[i];

            b.mat.color.setHex(BOOK_HEX[b.name]);

            b.mat.emissive.setHex(BOOK_HEX[b.name]);

            b.mat.emissiveIntensity = 0.3;

            b.mesh.position.z = b.z0;
        });

        busy = false;

        const solved = story.solved("book");

        door.rotation.y = solved ? 1.7 : 0;

        if (solved) {
            const r = books.find((b) => b.name === c.book.color);
            if (r) r.mesh.position.z = r.z0 - 0.12;
        }
    };

    const pull = (b) => {

        if (story.solved("book")) { inventory.say("Already solved."); return; }

        if (busy) return;

        if (b.name === theCase().book.color) {

            busy = true;

            audio.puzzle("tick");

            tween(b.mesh, "position.z", b.z0 - 0.12, 300);

            inventory.say("The " + b.name + " book slides out... click.\nSomething moves at the bottom of the bookcase.", 3.5);

            setTimeout(() => { audio.puzzle("thunk"); tween(door, "rotation.y", 1.7, 900); }, 500);

            setTimeout(() => { busy = false; if (!story.solved("book")) story.solve("book"); }, 1800);
        }
        else {

            busy = true;

            audio.puzzle("wrong");

            tween(b.mesh, "position.z", b.z0 - 0.1, 250, () => tween(b.mesh, "position.z", b.z0, 250, () => { busy = false; }));

            inventory.say("You pull out the " + b.name + " book. Nothing happens.\nYou push it back.", 3);
        }
    };

    inventory.resetHooks.push(sync);

    sync();
}

// ======================================================
// 2) THE RAT HOLE  (mess hall = ground-floor hall, north wall)
// ======================================================
export function addRatHole(R) {

    const t = mats();

    const hx = -5.25, wz = -3.75;

    // a patch of old brick, the hole at the bottom, a hidden recess above it
    R.box(t.brick, 0.8, 0.85, 0.04, hx, 0, wz + 0.02);

    R.box(t.dark, 0.26, 0.2, 0.05, hx, 0, wz + 0.04);

    R.box(t.dark, 0.3, 0.18, 0.05, hx, 0.5, wz + 0.04);

    const envelope = R._m(G.box, t.paper, 0.2, 0.12, 0.012, hx, 0.59, wz + 0.075, { keep: true });

    const brick = R._m(G.box, t.brickLoose, 0.34, 0.22, 0.09, hx, 0.59, wz + 0.1, { keep: true });

    // the rat (faces +z), tail behind
    const rat = new THREE.Group();

    const body = new THREE.Mesh(G.sph, t.rat); body.scale.set(0.13, 0.12, 0.28); body.position.set(0, 0.07, 0); rat.add(body);

    const head = new THREE.Mesh(G.sph, t.rat); head.scale.set(0.09, 0.09, 0.13); head.position.set(0, 0.07, 0.16); rat.add(head);

    for (const s of [-1, 1]) {

        const eye = new THREE.Mesh(G.sph, t.ratEye); eye.scale.set(0.02, 0.02, 0.02); eye.position.set(s * 0.04, 0.095, 0.2); rat.add(eye);

        const ear = new THREE.Mesh(G.sph, t.rat); ear.scale.set(0.05, 0.05, 0.02); ear.position.set(s * 0.05, 0.13, 0.13); rat.add(ear);
    }

    const tail = new THREE.Mesh(G.cyl, t.rat); tail.scale.set(0.012, 0.3, 0.012); tail.rotation.x = Math.PI / 2; tail.position.set(0, 0.04, -0.28); rat.add(tail);

    const mouth = new THREE.Mesh(G.box, t.cheese); mouth.scale.set(0.07, 0.04, 0.05); mouth.position.set(0, 0.05, 0.24); mouth.visible = false; rat.add(mouth);

    R.group.add(rat);

    const cheese = new THREE.Mesh(G.box, t.cheese);

    cheese.scale.set(0.14, 0.07, 0.1);

    R.group.add(cheese);

    const REST = { x: hx + 0.5, z: wz + 0.45 };

    let busy = false;

    const sync = () => {

        const solved = story.solved("rat");

        envelope.visible = true;

        cheese.visible = false;

        mouth.visible = false;

        busy = false;

        if (solved) {

            brick.position.set(hx + 0.3, 0.06, wz + 0.45);

            brick.rotation.set(0.9, 0.5, 0);

            rat.visible = false;
        }
        else {

            brick.position.set(hx, 0.59, wz + 0.1);

            brick.rotation.set(0, 0, 0);

            rat.visible = true;

            rat.position.set(REST.x, 0, REST.z);

            rat.rotation.y = Math.atan2(hx - REST.x, wz + 0.2 - REST.z);
        }
    };

    const face = (tx, tz) => { rat.rotation.y = Math.atan2(tx - rat.position.x, tz - rat.position.z); };

    const act = () => {

        if (story.solved("rat")) { inventory.say("Already solved."); return; }

        if (tooEarly()) return;

        if (busy) return;

        const have = inventory.has("cheese") || inventory.flag("used_cheese");

        if (!have) {

            audio.puzzle("tick");

            inventory.say("A fat rat sits by a hole in the wall. It stares at you, hungry.\nMaybe it would like something to eat.", 4);

            return;
        }

        busy = true;

        if (inventory.has("cheese")) inventory.remove("cheese");

        inventory.setFlag("used_cheese");

        inventory.say("You put the cheese on the floor and step back...", 3);

        const cx = hx + 0.75, cz = wz + 1.1;

        cheese.position.set(cx, 0.04, cz);

        cheese.visible = true;

        // the rat runs to the cheese, grabs it, runs into the hole, a brick falls
        setTimeout(() => { face(cx, cz); tween(rat, "position.x", cx - 0.1, 700); tween(rat, "position.z", cz - 0.15, 700); }, 700);

        setTimeout(() => { face(hx, wz + 0.2); cheese.visible = false; mouth.visible = true; }, 1500);

        setTimeout(() => {
            tween(rat, "position.x", hx, 600);
            tween(rat, "position.z", wz + 0.15, 600, () => { rat.visible = false; mouth.visible = false; });
        }, 1600);

        setTimeout(() => {

            audio.puzzle("thunk");

            tween(brick, "position.y", 0.06, 500);
            tween(brick, "position.z", wz + 0.45, 500);
            tween(brick, "rotation.x", 0.9, 500);
        }, 2600);

        setTimeout(() => { busy = false; if (!story.solved("rat")) story.solve("rat"); }, 3700);
    };

    trigger(
        R, hx, 0.4, wz + 0.5, 1.0, 0.9, 0.9,
        () => {
            if (story.solved("rat")) return "Press E - the rat hole (done)";
            return (inventory.has("cheese") || inventory.flag("used_cheese")) ? "Press E - Put the cheese down for the rat" : "Press E - Look at the rat hole";
        },
        act
    );

    inventory.resetHooks.push(sync);

    sync();
}

// ======================================================
// 3) THE LEVER  (terrace room, back = north wall)
// ======================================================
export function addLeverSecret(R) {

    const t = mats();

    const wz = -12.375;

    const cx = -3.0, W = 0.9, H = 1.3, D = 0.3, yb = 0.8;

    // a hidden wall cupboard (its door looks like a plain old board)
    R.box(t.woodDark, W, H, 0.02, cx, yb, wz + 0.01);

    R.box(t.woodDark, 0.04, H, D, cx - W / 2 + 0.02, yb, wz + D / 2);

    R.box(t.woodDark, 0.04, H, D, cx + W / 2 - 0.02, yb, wz + D / 2);

    R.box(t.woodDark, W, 0.04, D, cx, yb, wz + D / 2);

    R.box(t.woodDark, W, 0.04, D, cx, yb + H - 0.04, wz + D / 2);

    R.collider(W, H, D, cx, yb, wz + D / 2);

    R.box(t.dark, W - 0.1, H - 0.1, 0.02, cx, yb + 0.05, wz + 0.03);

    // the shirt and the note inside
    R._m(G.box, t.cloth, 0.5, 0.34, 0.08, cx, yb + 0.25, wz + 0.12, { keep: true, rz: 0.06 });

    R._m(G.box, t.paper, 0.16, 0.2, 0.01, cx + 0.1, yb + 0.55, wz + 0.17, { keep: true, rz: -0.12 });

    const door = hingedDoor(R, t.woodDoor, cx - W / 2 + 0.03, yb + 0.04, wz + D - 0.01, W - 0.06, H - 0.08, 0.03);

    // the lever: a plate with a rusty stub, the handle is missing
    const lx = -1.95, ly = 1.25;

    R.box(t.iron, 0.24, 0.4, 0.04, lx, ly - 0.2, wz + 0.02);

    R._m(G.cyl, t.iron, 0.07, 0.12, 0.07, lx, ly, wz + 0.1, { rx: Math.PI / 2 });

    const lever = new THREE.Group();

    lever.position.set(lx, ly, wz + 0.15);

    const arm = new THREE.Mesh(G.cyl, t.ironBright); arm.scale.set(0.045, 0.62, 0.045); arm.position.set(0, 0.31, 0); lever.add(arm);

    const knob = new THREE.Mesh(G.sph, t.ironBright); knob.scale.set(0.12, 0.12, 0.12); knob.position.set(0, 0.64, 0); lever.add(knob);

    R.group.add(lever);

    let busy = false;

    const sync = () => {

        const solved = story.solved("lever");

        lever.visible = inventory.flag("lever_fitted") || solved;

        lever.rotation.x = solved ? 1.0 : 0;

        door.rotation.y = solved ? -1.7 : 0;

        busy = false;
    };

    const act = () => {

        if (story.solved("lever")) { inventory.say("Already solved."); return; }

        if (tooEarly()) return;

        if (busy) return;

        if (!inventory.flag("lever_fitted")) {

            if (inventory.has("handle")) {

                inventory.remove("handle");

                inventory.setFlag("lever_fitted");

                lever.visible = true;

                audio.puzzle("tick");

                inventory.say("The iron handle fits the stub perfectly.\nNow pull it (press E again).", 4);
            }
            else {

                audio.puzzle("tick");

                inventory.say("A lever with no handle - only a rusty stub.\nThe handle must be lying somewhere in the hostel.", 4);
            }

            return;
        }

        busy = true;

        audio.puzzle("thunk");

        tween(lever, "rotation.x", 1.0, 500);

        inventory.say("The lever clunks down. Something moves in the wall...", 3);

        setTimeout(() => { audio.puzzle("thunk"); tween(door, "rotation.y", -1.7, 900); }, 700);

        setTimeout(() => { busy = false; if (!story.solved("lever")) story.solve("lever"); }, 1900);
    };

    trigger(
        R, lx, 1.2, wz + 0.4, 0.7, 0.9, 0.8,
        () => {
            if (story.solved("lever")) return "Press E - the lever (done)";
            if (inventory.flag("lever_fitted")) return "Press E - Pull the lever";
            return inventory.has("handle") ? "Press E - Fit the handle on the lever" : "Press E - Look at the lever";
        },
        act
    );

    inventory.resetHooks.push(sync);

    sync();
}

// ======================================================
// THE THREE ITEMS lying in (random, new every game) rooms
//   the cheese (rat puzzle), the lever handle (lever puzzle) and the
//   old iron KEY of the back stairs (spiral.js).  Every dorm room calls this;
//   only the room named in the case shows the item.
// ======================================================
const ITEMS = [
    // [room slot in gen.js, item id, flag that says "it is used up"]
    ["cheese", "cheese", "used_cheese"],
    ["handle", "handle", "lever_fitted"],
    ["gatekey", "spiral_key", "spiral_open"]
];

export function placeSecretItems(R, tag, W) {

    if (!R.interaction) return;

    const t = mats();

    // a fixed spot per room (no random numbers used here)
    const u = ((tag.charCodeAt(1) * 7 + tag.charCodeAt(3) * 13) % 10) / 10;

    const v = ((tag.charCodeAt(1) * 5 + tag.charCodeAt(3) * 3) % 7) / 7;

    ITEMS.forEach(([slot, id, usedFlag], idx) => {

        const k = idx / 3;

        const x = R.lx0 + 1.5 + ((u + k) % 1) * (W - 3);

        const z = 5.0 + ((v + k) % 1) * 1.8;

        let mesh;

        if (id === "cheese") {

            mesh = R._m(G.box, t.cheese, 0.16, 0.07, 0.11, x, 0.045, z, { keep: true, ry: u * 6 });
        }
        else if (id === "handle") {

            mesh = R._m(G.cyl, t.ironBright, 0.045, 0.38, 0.045, x, 0.03, z, { keep: true, rz: Math.PI / 2, ry: u * 6 });
        }
        else {

            // a big old iron key
            mesh = R._m(G.box, t.ironBright, 0.22, 0.025, 0.05, x, 0.03, z, { keep: true, ry: u * 6 + 1 });

        }

        addPickup(R.interaction, R.group, {

            id, x, y: 0.12, z, size: 0.6, mesh,

            active: () => theCase().rooms[slot] === tag && !inventory.flag(usedFlag)
        });
    });
}
