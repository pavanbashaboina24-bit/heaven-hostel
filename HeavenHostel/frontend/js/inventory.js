import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

import { DIARY } from "./lore.js";


// ======================================================
// INVENTORY  -  things the player can pick up, read and use
//
//   inventory.add("cellar_key")      put an item in the bag
//   inventory.has("cellar_key")      does the player have it?
//   inventory.remove("cellar_key")   use it up
//   inventory.say("text")            small message on screen
//
//   addPickup(...)     an item you grab with E
//   addReadable(...)   a letter / book: E opens it, you READ it,
//                      then choose  E = keep it,  Q = put it back
//   addContainer(...)  a box / trunk: E searches it for something
//
//   B   opens the bag (1-9 reads a kept letter / book)
//
// The bag is remembered in the browser (so "Continue" keeps
// it); a NEW game empties it and puts everything back.
// ======================================================

const KEY = "hh_items";

const KEY_SPOT_STORE = "hh_keyspot";

// WHERE the cellar key can be hidden (one is picked at random for every
// new game):  "stairs", "reception" (the reception desk) or inside the
// trunk of one of the 24 dorm rooms ("f<floor>r<room>_trunk")
export const KEY_SPOTS = ["stairs", "reception"];

import { MAIN_KEY_SPOTS, locks } from "./locks.js";
import { newCase } from "./gen.js";

for (let f = 1; f <= 3; f++) {

    for (let r = 1; r <= 8; r++) KEY_SPOTS.push("f" + f + "r" + r + "_trunk");
}

const CSS = `
#hh-inv{position:fixed;left:16px;bottom:16px;z-index:12;display:flex;gap:8px;
flex-wrap:wrap;max-width:60%;pointer-events:none;font-family:Georgia,serif}
#hh-inv .it{display:flex;align-items:center;gap:6px;padding:6px 12px;
background:rgba(10,6,6,.88);border:1px solid #7a1414;color:#eadfc4;font-size:15px}
#hh-inv .ic{font-size:20px}
#hh-say{position:fixed;left:50%;bottom:18%;transform:translateX(-50%);z-index:12;
max-width:70%;padding:10px 20px;background:rgba(10,6,6,.92);border:1px solid #7a1414;
color:#eadfc4;font:17px Georgia,serif;text-align:center;pointer-events:none;
opacity:0;transition:opacity .4s;white-space:pre-line}
#hh-say.on{opacity:1}
#hh-reader{position:fixed;inset:0;z-index:40;display:none;align-items:center;
justify-content:center;background:rgba(0,0,0,.72);font-family:Georgia,serif}
#hh-reader.on{display:flex}
#hh-reader .paper{width:min(560px,88vw);max-height:80vh;overflow:auto;padding:28px 34px;
background:#d9ceb0;color:#2a2118;border:2px solid #4a3a22;
box-shadow:0 0 40px #000,inset 0 0 60px rgba(90,60,20,.45)}
#hh-reader h2{margin:0 0 14px;font-size:24px;letter-spacing:1px;color:#3a2410}
#hh-reader .body{font-size:19px;line-height:1.5;white-space:pre-line}
#hh-reader .foot{margin-top:20px;padding-top:12px;border-top:1px solid #8a7a58;
font:15px Arial,sans-serif;color:#5a4630;text-align:center}
body:not(.playing) #hh-inv,body:not(.playing) #hh-say,
body:not(.playing) #hh-reader{display:none}
`;

class Inventory {

    constructor() {

        this.items = new Set();

        this.flags = new Set();

        this.defs = {};

        this.pickups = [];

        this.resetHooks = [];

        this.box = null;

        this.sayBox = null;

        this.readerBox = null;

        this.sayTimer = 0;

        this.reading = false;

        this.mode = null;          // "pickup" | "view" | "bag"

        this.current = null;

        this.bagList = [];

        this.keySpot = null;

        try {
            const ks = localStorage.getItem(KEY_SPOT_STORE);

            if (KEY_SPOTS.includes(ks)) this.keySpot = ks;
        }
        catch (e) { /* ignore */ }

        if (!this.keySpot) this.rollKeySpot();

        try {

            const d = JSON.parse(localStorage.getItem(KEY));

            if (d && Array.isArray(d.items)) d.items.forEach((i) => this.items.add(i));

            if (d && Array.isArray(d.flags)) d.flags.forEach((f) => this.flags.add(f));
        }
        catch (e) { /* ignore */ }

        this.define("cellar_key", {
            name: "Cellar Key", icon: "\uD83D\uDDDD\uFE0F", kind: "key"
        });

        this.define("old_diary", {
            name: DIARY.title, icon: "\uD83D\uDCD6", kind: "book", text: DIARY.text
        });

        window.addEventListener("keydown", (e) => this.onKey(e), true);
    }

    // pick a new random hiding place for the cellar key
    rollKeySpot() {

        this.keySpot = KEY_SPOTS[Math.floor(Math.random() * KEY_SPOTS.length)];

        try { localStorage.setItem(KEY_SPOT_STORE, this.keySpot); } catch (e) { /* ignore */ }
    }

    // is the (still unfound) cellar key hidden at this place?
    keyAt(spot) {

        return this.keySpot === spot &&
            !this.has("cellar_key") && !this.flag("cellar_unlocked");
    }

    // describe an item:  { name, icon, kind: "key"|"letter"|"book"|"thing", text }
    define(id, def) {

        this.defs[id] = def;
    }

    save() {

        try {

            localStorage.setItem(KEY, JSON.stringify({
                items: [...this.items], flags: [...this.flags]
            }));
        }
        catch (e) { /* ignore */ }
    }

    has(id) { return this.items.has(id); }

    name(id) { return (this.defs[id] && this.defs[id].name) || id; }

    readable(id) {

        const d = this.defs[id];

        return !!(d && d.text && (d.kind === "letter" || d.kind === "book"));
    }

    add(id) {

        this.items.add(id);

        this.save();

        this.render();

        this.say("Picked up: " + this.name(id));
    }

    remove(id) {

        this.items.delete(id);

        this.save();

        this.render();
    }

    // things that happened (e.g. "cellar_unlocked")
    flag(name) { return this.flags.has(name); }

    setFlag(name) {

        this.flags.add(name);

        this.save();
    }

    // new game: empty the bag, put every item back, relock things
    reset() {

        // a brand new case: new notes, new rooms, new answers
        newCase();

        this.items.clear();

        this.flags.clear();

        this.rollKeySpot();

        // the iron key of the main door is hidden at one random place in the yard
        this.flags.add("mk_" + MAIN_KEY_SPOTS[Math.floor(Math.random() * MAIN_KEY_SPOTS.length)]);

        this.save();

        this.pickups.forEach((p) => p.show());

        this.resetHooks.forEach((fn) => fn());

        locks.refresh();

        this.render();
    }


    // ---------------------------------------------- HUD
    ui() {

        if (this.box) return;

        const st = document.createElement("style");

        st.textContent = CSS;

        document.head.appendChild(st);

        this.box = document.createElement("div");

        this.box.id = "hh-inv";

        document.body.appendChild(this.box);

        this.sayBox = document.createElement("div");

        this.sayBox.id = "hh-say";

        document.body.appendChild(this.sayBox);

        this.readerBox = document.createElement("div");

        this.readerBox.id = "hh-reader";

        document.body.appendChild(this.readerBox);
    }

    chip(icon, text) {

        const it = document.createElement("div");

        it.className = "it";

        const ic = document.createElement("span");

        ic.className = "ic";

        ic.textContent = icon;

        it.appendChild(ic);

        it.appendChild(document.createTextNode(text));

        this.box.appendChild(it);
    }

    render() {

        this.ui();

        this.box.innerHTML = "";

        let notes = 0;

        for (const id of this.items) {

            if (this.readable(id)) { notes++; continue; }

            const d = this.defs[id];

            this.chip((d && d.icon) || "\u2022", this.name(id));
        }

        if (notes) this.chip("\uD83D\uDCDC", "Letters & books: " + notes + "   (B)");
    }

    say(text, seconds) {

        this.ui();

        this.sayBox.textContent = text;

        this.sayBox.classList.add("on");

        clearTimeout(this.sayTimer);

        this.sayTimer = setTimeout(
            () => this.sayBox.classList.remove("on"),
            (seconds || 3) * 1000
        );
    }


    // ---------------------------------------------- READER
    // opts: { title, text, mode: "pickup" | "view", onKeep }
    openReader(opts) {

        this.ui();

        this.reading = true;

        this.mode = opts.mode;

        this.current = opts;

        const b = this.readerBox;

        b.innerHTML = "";

        const p = document.createElement("div");

        p.className = "paper";

        const h = document.createElement("h2");

        h.textContent = opts.title;

        const body = document.createElement("div");

        body.className = "body";

        body.textContent = opts.text;

        const foot = document.createElement("div");

        foot.className = "foot";

        foot.textContent = opts.mode === "pickup"
            ? "E - Keep it in your bag        Q - Put it back"
            : "Q - Close";

        p.appendChild(h);

        p.appendChild(body);

        p.appendChild(foot);

        b.appendChild(p);

        b.classList.add("on");
    }

    closeReader() {

        if (this.readerBox) this.readerBox.classList.remove("on");

        const back = this.mode === "view" && this.current && this.current.fromBag;

        // a solved clue paper crumbles to dust once you have read it
        const gone = this.current && this.current.vanish;

        this.reading = false;

        this.mode = null;

        this.current = null;

        if (gone && this.items.has(gone)) {

            this.remove(gone);

            this.say("The paper crumbles to dust in your hand.", 3);
        }

        if (back) this.openBag();
    }

    openBag() {

        this.ui();

        const all = [...this.items].filter((id) => this.readable(id));

        // case-file pages (clues, wish, puzzle notes) first, the rest after
        const rank = (id) => (id.startsWith("clue_") ? 0 : id.startsWith("pz_") ? 1 : 2);

        all.sort((a, b) => rank(a) - rank(b));

        this.bagAll = all;

        const pages = Math.max(1, Math.ceil(all.length / 9));

        this.bagPage = Math.min(this.bagPage || 0, pages - 1);

        this.bagList = all.slice(this.bagPage * 9, this.bagPage * 9 + 9);

        this.reading = true;

        this.mode = "bag";

        const b = this.readerBox;

        b.innerHTML = "";

        const p = document.createElement("div");

        p.className = "paper";

        const h = document.createElement("h2");

        h.textContent = "Your bag";

        p.appendChild(h);

        const body = document.createElement("div");

        body.className = "body";

        const lines = [];

        for (const id of this.items) {

            if (!this.readable(id)) lines.push("\u2022 " + this.name(id));
        }

        this.bagList.forEach((id, i) => lines.push((i + 1) + ".  " + this.name(id)));

        body.textContent = lines.length ? lines.join("\n") : "(empty)";

        p.appendChild(body);

        const foot = document.createElement("div");

        foot.className = "foot";

        const pgs = Math.max(1, Math.ceil((this.bagAll || []).length / 9));

        foot.textContent = (this.bagList.length
            ? "1-" + this.bagList.length + " - Read        "
            : "") + (pgs > 1 ? "\u2190 \u2192 - Page " + (this.bagPage + 1) + "/" + pgs + "        " : "") + "Q - Close";

        p.appendChild(foot);

        b.appendChild(p);

        b.classList.add("on");
    }

    closeBag() {

        if (this.readerBox) this.readerBox.classList.remove("on");

        this.reading = false;

        this.mode = null;
    }

    onKey(e) {

        const playing = document.body.classList.contains("playing");

        if (!this.reading) {

            if (e.code === "KeyB" && playing && !e.repeat) {

                e.preventDefault();

                e.stopImmediatePropagation();

                this.openBag();
            }

            return;
        }

        // while reading, the game must not see any key
        e.preventDefault();

        e.stopImmediatePropagation();

        // puzzles and story screens (puzzles.js / story.js) handle their own keys
        if (this.mode === "puzzle") {

            if (this.puzzleKey) this.puzzleKey(e);

            return;
        }

        if (e.repeat || e.type !== "keydown") return;

        if (this.mode === "bag") {

            if (e.code === "KeyQ" || e.code === "KeyB" || e.code === "Backspace") {
                this.closeBag();
            }
            else if (e.code === "ArrowRight" || e.code === "ArrowLeft") {

                const pgs = Math.max(1, Math.ceil((this.bagAll || []).length / 9));

                this.bagPage = ((this.bagPage || 0) + (e.code === "ArrowRight" ? 1 : pgs - 1)) % pgs;

                this.openBag();
            }
            else if (/^(Digit|Numpad)[1-9]$/.test(e.code)) {

                const id = this.bagList[Number(e.code.slice(-1)) - 1];

                if (id) {

                    const d = this.defs[id];

                    this.openReader({
                        title: d.name, text: d.text, mode: "view", fromBag: true
                    });
                }
            }

            return;
        }

        if (this.mode === "pickup" && e.code === "KeyE") {

            const keep = this.current && this.current.onKeep;

            this.closeReader();

            if (keep) keep();

            return;
        }

        if (e.code === "KeyQ" || e.code === "Backspace") this.closeReader();
    }
}

export const inventory = new Inventory();

inventory.render();


const trigGeo = new THREE.BoxGeometry(1, 1, 1);

function makeTrigger(parent, x, y, z, sx, sy, sz) {

    const trig = new THREE.Mesh(
        trigGeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
    );

    trig.scale.set(sx, sy, sz);

    trig.position.set(x, y, z);

    trig.visible = false;

    parent.add(trig);

    return trig;
}

function hideTrigger(interaction, trig) {

    const i = interaction.interactableObjects.indexOf(trig);

    if (i >= 0) interaction.interactableObjects.splice(i, 1);
}


// ======================================================
// A PICKUP:  the visible mesh + an invisible E-trigger
// ======================================================
export function addPickup(interaction, parent, o) {

    const s = o.size || 0.55;

    const trig = makeTrigger(parent, o.x, o.y, o.z, s, s, s);

    const pickup = {

        show() {

            // o.active() lets a pickup wait for its turn (the cellar key is
            // shown only at the place picked for this game)
            if (o.active && !o.active()) {

                pickup.hide();

                return;
            }

            if (o.mesh) o.mesh.visible = true;

            if (!interaction.interactableObjects.includes(trig)) {
                interaction.add(trig);
            }
        },

        hide() {

            if (o.mesh) o.mesh.visible = false;

            hideTrigger(interaction, trig);
        }
    };

    trig.userData.getPrompt = () =>
        "Press E - Pick up the " + inventory.name(o.id);

    trig.userData.interact = () => {

        pickup.hide();

        inventory.add(o.id);

        if (o.onPick) o.onPick();
    };

    inventory.pickups.push(pickup);

    if (inventory.has(o.id) || (o.active && !o.active())) pickup.hide();
    else interaction.add(trig);

    return pickup;
}


// ======================================================
// A LETTER / BOOK:  E opens it and you read it, then
// E = keep it in the bag,  Q = put it back
//   o = { id, title, text, kind: "letter"|"book", mesh, x, y, z, size }
// ======================================================
export function addReadable(interaction, parent, o) {

    // title and text are read when needed (the notes of a new game are new)
    const def = { kind: o.kind || "letter", icon: o.kind === "book" ? "\uD83D\uDCD5" : "\u2709\uFE0F" };

    Object.defineProperty(def, "name", { get: () => o.title, enumerable: true });

    Object.defineProperty(def, "text", { get: () => o.text, enumerable: true });

    inventory.define(o.id, def);

    const s = o.size || 0.5;

    const trig = makeTrigger(parent, o.x, o.y, o.z, s, s, s);

    const pickup = {

        show() {

            if (o.mesh) o.mesh.visible = true;

            if (!interaction.interactableObjects.includes(trig)) {
                interaction.add(trig);
            }
        },

        hide() {

            if (o.mesh) o.mesh.visible = false;

            hideTrigger(interaction, trig);
        }
    };

    trig.userData.getPrompt = () =>
        "Press E - Read the " + o.title.toLowerCase();

    trig.userData.interact = () => {

        inventory.openReader({
            title: o.title, text: o.text, mode: "pickup",
            onKeep: () => {

                pickup.hide();

                inventory.add(o.id);
            }
        });
    };

    inventory.pickups.push(pickup);

    if (inventory.has(o.id)) pickup.hide();
    else interaction.add(trig);

    inventory.render();

    return pickup;
}


// ======================================================
// A BOX / TRUNK:  E searches it.  If it holds something,
// you see it and can keep it.  (Each box is searched once.)
//   o = { id, label, x, y, z, sx, sy, sz, item: { title, text } }
// ======================================================
export function addContainer(interaction, parent, o) {

    const flagName = "box_" + o.id;

    const itemId = "thing_" + o.id;

    inventory.define(itemId, {
        name: o.item.title, kind: "thing", text: o.item.text, icon: "\uD83D\uDD0E"
    });

    const trig = makeTrigger(parent, o.x, o.y, o.z, o.sx, o.sy, o.sz);

    // the cellar key may be hidden in this very trunk
    const hasKey = () => inventory.keyAt(o.id);

    trig.userData.getPrompt = () =>
        inventory.flag(flagName) && !hasKey()
            ? "Press E - Search the " + o.label + " (empty)"
            : "Press E - Search the " + o.label;

    trig.userData.interact = () => {

        if (hasKey()) {

            inventory.openReader({
                title: "Cellar Key",
                text: "Under a pile of rags lies a heavy brass key on a frayed string.\n\nThe paper tag says: CELLAR.",
                mode: "pickup",
                onKeep: () => {

                    inventory.setFlag(flagName);

                    inventory.add("cellar_key");
                }
            });

            return;
        }

        if (inventory.flag(flagName)) {

            inventory.say("Nothing else here.");

            return;
        }

        inventory.openReader({
            title: o.item.title, text: o.item.text, mode: "pickup",
            onKeep: () => {

                inventory.setFlag(flagName);

                inventory.add(itemId);
            }
        });
    };

    interaction.add(trig);

    return trig;
}