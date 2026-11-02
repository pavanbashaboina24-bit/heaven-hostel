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
import { audio } from "./audio.js";

for (let f = 1; f <= 3; f++) {

    for (let r = 1; r <= 8; r++) KEY_SPOTS.push("f" + f + "r" + r + "_trunk");
}

const WHISPERS = [
    "...I can see you reading.", "...behind you.", "...he is closer than you think.", "...do not turn around.",
    "...read it again. Slowly.", "...you are not the first to read this.", "...he is smiling now.", "...the ink was still wet."
];

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
#hh-reader .paper{position:relative;width:min(560px,88vw);max-height:80vh;overflow:auto;padding:34px 38px 26px;
background:
 radial-gradient(ellipse at 8% 6%,rgba(40,20,5,.65),transparent 38%),
 radial-gradient(ellipse at 96% 92%,rgba(30,12,2,.7),transparent 42%),
 radial-gradient(circle at 78% 22%,rgba(110,10,10,.34),transparent 22%),
 radial-gradient(circle at 20% 80%,rgba(100,8,8,.28),transparent 18%),
 repeating-linear-gradient(0deg,rgba(80,55,20,.05) 0 2px,transparent 2px 5px),
 #cbbd96;
color:#241a10;border:0;
clip-path:polygon(0 2%,3% 0,9% 1.5%,16% 0,26% 1%,38% 0,50% 1.6%,63% 0,74% 1%,88% 0,96% 1.4%,100% 0,99% 9%,100% 21%,98.6% 36%,100% 52%,99% 67%,100% 80%,98.8% 92%,100% 100%,92% 98.6%,81% 100%,68% 98.8%,55% 100%,41% 98.5%,28% 100%,16% 98.8%,6% 100%,0 99%,1.2% 88%,0 74%,1.4% 60%,0 46%,1.2% 31%,0 17%);
box-shadow:inset 0 0 70px rgba(70,40,10,.65);
transform:rotate(var(--rot,0deg));animation:hhUnfold .45s ease-out,hhCandle 3.1s steps(1) infinite .5s}
#hh-reader .paper::before{content:"";position:absolute;left:0;right:0;top:0;height:78px;pointer-events:none;
background:
 radial-gradient(ellipse 7px 30px at 12% 0,#6a0610 55%,transparent 60%),
 radial-gradient(ellipse 5px 52px at 31% 0,#7a0812 55%,transparent 60%),
 radial-gradient(ellipse 8px 24px at 55% 0,#5a050e 55%,transparent 60%),
 radial-gradient(ellipse 5px 62px at 79% 0,#7a0812 55%,transparent 60%),
 radial-gradient(ellipse 6px 36px at 93% 0,#6a0610 55%,transparent 60%);
animation:hhDripDown 5s ease-in infinite}
#hh-reader .paper::after{content:"";position:absolute;right:18px;bottom:46px;width:86px;height:104px;pointer-events:none;opacity:.5;transform:rotate(-14deg);
background:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 74'><g fill='%237a0812'><ellipse cx='30' cy='50' rx='17' ry='19'/><ellipse cx='11' cy='28' rx='5' ry='14' transform='rotate(-16 11 28)'/><ellipse cx='22' cy='17' rx='5' ry='16' transform='rotate(-4 22 17)'/><ellipse cx='36' cy='15' rx='5' ry='16' transform='rotate(4 36 15)'/><ellipse cx='49' cy='23' rx='5' ry='14' transform='rotate(16 49 23)'/><ellipse cx='54' cy='44' rx='4' ry='11' transform='rotate(60 54 44)'/></g></svg>") center/contain no-repeat}
#hh-reader h2{margin:0 0 14px;font:700 25px "Segoe Print","Bradley Hand","Comic Sans MS",Georgia,cursive;letter-spacing:1px;color:#3a0c0c;text-shadow:1px 1px 0 rgba(120,20,20,.35);animation:hhShiver 4.2s steps(1) infinite}
#hh-reader .body{font-size:19px;line-height:1.5;white-space:pre-line;font-family:Georgia,serif;position:relative}
#hh-reader .body .bad{color:#8a0a14;font-weight:700;display:inline-block;text-shadow:0 0 6px rgba(160,10,20,.5);animation:hhBad 2.4s ease-in-out infinite}
#hh-reader .body .whisper{display:block;margin-top:16px;color:#7a0812;font:italic 700 18px "Segoe Print","Bradley Hand",Georgia,cursive;opacity:0;animation:hhWhisper 6s 1.2s forwards}
#hh-reader .foot{margin-top:20px;padding-top:12px;border-top:1px solid #8a7a58;
font:15px Arial,sans-serif;color:#4a3826;text-align:center}
@keyframes hhUnfold{from{opacity:0;transform:rotate(var(--rot,0deg)) scale(.55) translateY(40px)}to{opacity:1;transform:rotate(var(--rot,0deg)) scale(1)}}
@keyframes hhCandle{0%{filter:brightness(1)}13%{filter:brightness(.78)}16%{filter:brightness(1.05)}41%{filter:brightness(.88)}44%{filter:brightness(1)}72%{filter:brightness(.7)}74%{filter:brightness(1)}}
@keyframes hhDripDown{0%{transform:translateY(-70px)}35%{transform:translateY(0)}100%{transform:translateY(0)}}
@keyframes hhShiver{0%,92%,100%{transform:none}93%{transform:translate(-2px,1px) skewX(-3deg)}95%{transform:translate(2px,-1px)}97%{transform:none}}
@keyframes hhBad{0%,100%{transform:translate(0,0);opacity:1}45%{transform:translate(1px,-1px);opacity:.82}50%{transform:translate(-1px,1px);opacity:1}}
@keyframes hhWhisper{0%{opacity:0}30%{opacity:.9}70%{opacity:.9}100%{opacity:.18}}
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

        // words that fear lives in: they shake and turn red
        const BAD = /\b(blood|dead|death|die|died|dying|kill|killed|alone|help|laugh|laughed|laughing|cry|crying|cried|scream|screamed|forgive|forgiven|afraid|dark|hurt|never|please|gone|scared|ghost|ramu)\b/gi;

        const txt = String(opts.text || "");

        let last = 0, mm;

        BAD.lastIndex = 0;

        while ((mm = BAD.exec(txt)) !== null) {

            if (mm.index > last) body.appendChild(document.createTextNode(txt.slice(last, mm.index)));

            const sp = document.createElement("span");

            sp.className = "bad";

            sp.textContent = mm[0];

            sp.style.animationDelay = (Math.random() * 2) + "s";

            body.appendChild(sp);

            last = mm.index + mm[0].length;
        }

        if (last < txt.length) body.appendChild(document.createTextNode(txt.slice(last)));

        // sometimes the paper writes something by itself
        if (opts.mode === "pickup" || opts.mode === "view") {

            if (Math.random() < 0.3) {

                const w = document.createElement("span");

                w.className = "whisper";

                w.textContent = WHISPERS[Math.floor(Math.random() * WHISPERS.length)];

                body.appendChild(w);
            }
        }

        p.style.setProperty("--rot", ((Math.random() - 0.5) * 2.4).toFixed(2) + "deg");

        const foot = document.createElement("div");

        foot.className = "foot";

        const tch = document.body.classList.contains("touch");

        foot.textContent = opts.mode === "pickup"
            ? (tch ? "Tap  KEEP IN BAG  or  PUT BACK" : "E - Keep it in your bag        Q - Put it back")
            : (tch ? "Tap  CLOSE" : "Q - Close");

        p.appendChild(h);

        p.appendChild(body);

        p.appendChild(foot);

        b.appendChild(p);

        b.classList.add("on");
    }

    closeReader(kept) {

        if (this.readerBox) this.readerBox.classList.remove("on");

        // a picked-up paper that is not kept goes back where it lay
        if (!kept && this.mode === "pickup" && this.current && this.current.onPut) {

            const put = this.current.onPut;

            setTimeout(put, 30);
        }

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

            this.closeReader(true);

            if (keep) keep();

            return;
        }

        if (e.code === "KeyQ" || e.code === "Backspace") this.closeReader();
    }
}

export const inventory = new Inventory();

inventory.render();


// ======================================================
// REALISTIC PICK UP: the thing flies up into your hand (and back if you put it back)
// ======================================================
const ROT90 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _qp = new THREE.Quaternion();

function handPoint(out) {

    const cam = inventory.camera;

    cam.getWorldDirection(_v2);

    out.copy(cam.position).addScaledVector(_v2, 0.55);

    out.y -= 0.12;

    return out;
}

function flyAnim(mesh, fromW, fromQ, toFn, toQFn, ms, scaleTo, done) {

    const parent = mesh.parent;

    const s0 = mesh.userData.hhScale || (mesh.userData.hhScale = mesh.scale.clone());

    const t0 = performance.now();

    const step = () => {

        const k = Math.min(1, (performance.now() - t0) / ms);

        const e = k * k * (3 - 2 * k);

        toFn(_v);

        _v.lerpVectors(fromW, _v.clone(), e);

        // a little arc upwards while it flies
        _v.y += Math.sin(k * Math.PI) * 0.12;

        if (parent) mesh.position.copy(parent.worldToLocal(_v.clone()));

        toQFn(_q);

        _q2.copy(fromQ).slerp(_q, e);

        if (parent) {

            parent.getWorldQuaternion(_qp);

            mesh.quaternion.copy(_qp.invert().multiply(_q2));
        }

        mesh.scale.copy(s0).multiplyScalar(1 + (scaleTo - 1) * e);

        if (k < 1) requestAnimationFrame(step);
        else done();
    };

    step();
}

function flyToHand(mesh, done) {

    if (!mesh || !inventory.camera || !mesh.parent) { done(); return; }

    mesh.visible = true;

    mesh.updateWorldMatrix(true, false);

    if (!mesh.userData.hhOrig) mesh.userData.hhOrig = { p: mesh.position.clone(), q: mesh.quaternion.clone() };

    const fromW = mesh.getWorldPosition(new THREE.Vector3());

    const fromQ = mesh.getWorldQuaternion(new THREE.Quaternion());

    const toW = (out) => handPoint(out);

    // the paper turns to face you
    const toQ = (out) => out.copy(inventory.camera.quaternion).multiply(ROT90);

    flyAnim(mesh, fromW, fromQ, toW, toQ, 430, 1.8, () => {

        const o = mesh.userData.hhOrig;

        mesh.position.copy(o.p);

        mesh.quaternion.copy(o.q);

        mesh.scale.copy(mesh.userData.hhScale);

        mesh.visible = false;

        done();
    });
}

function flyBack(mesh, done) {

    if (!mesh || !inventory.camera || !mesh.parent || !mesh.userData.hhOrig) { if (mesh) mesh.visible = true; if (done) done(); return; }

    const o = mesh.userData.hhOrig;

    mesh.visible = true;

    const parent = mesh.parent;

    parent.updateWorldMatrix(true, false);

    const fromW = handPoint(new THREE.Vector3());

    const fromQ = inventory.camera.quaternion.clone().multiply(ROT90);

    const toW = (out) => out.copy(o.p).applyMatrix4(parent.matrixWorld);

    const toQ = (out) => { parent.getWorldQuaternion(out); out.multiply(o.q); return out; };

    flyAnim(mesh, fromW, fromQ, toW, toQ, 380, 1, () => {

        mesh.position.copy(o.p);

        mesh.quaternion.copy(o.q);

        mesh.scale.copy(mesh.userData.hhScale);

        if (done) done();
    });
}

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

    let flying = false;

    trig.userData.interact = () => {

        if (flying) return;

        flying = true;

        hideTrigger(interaction, trig);

        flyToHand(o.mesh, () => {

            flying = false;

            pickup.hide();

            inventory.add(o.id);

            if (o.onPick) o.onPick();
        });
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

    // o.access(): e.g. a letter inside a drawer can be taken only while the drawer is open
    trig.userData.getPrompt = () => (o.access && !o.access() ? "" : "Press E - Pick up the " + o.title.toLowerCase());

    let flying = false;

    trig.userData.interact = () => {

        if (flying || (o.access && !o.access())) return;

        flying = true;

        hideTrigger(interaction, trig);

        flyToHand(o.mesh, () => {

            flying = false;

            inventory.openReader({
                title: o.title, text: o.text, mode: "pickup",
                onKeep: () => {

                    pickup.hide();

                    inventory.add(o.id);
                },
                onPut: () => {

                    pickup.show();

                    flyBack(o.mesh);
                }
            });
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

    // o.lid = { pivot, axis: "z", open: 1.9, thing, keyThing }  -> a REAL lid that opens
    const L = o.lid || null;

    let open = false;

    let spinning = 0;

    const spin = (to, ms) => {

        const ob = L.pivot.rotation, from = ob[L.axis], t0 = performance.now(), id = ++spinning;

        const step = () => {

            if (id !== spinning) return;

            const k = Math.min(1, (performance.now() - t0) / ms);

            ob[L.axis] = from + (to - from) * (k * k * (3 - 2 * k));

            if (k < 1) requestAnimationFrame(step);
        };

        step();
    };

    const sync = () => {

        if (!L) return;

        if (L.thing) L.thing.visible = open && !inventory.flag(flagName) && !hasKey();

        if (L.keyThing) L.keyThing.visible = open && !!hasKey();
    };

    const setOpen = (v) => {

        open = v;

        if (L) {

            spin(v ? L.open : 0, 650);

            audio.play(v ? "creak_1" : "thud", { vol: v ? 0.8 : 0.5, send: 0.25 });
        }

        sync();
    };

    if (L) {

        inventory.resetHooks.push(() => { open = false; spinning++; L.pivot.rotation[L.axis] = 0; sync(); });

        sync();
    }

    const take = (title, text, mesh, onKeep) => {

        hideTrigger(interaction, trig);

        flyToHand(mesh, () => {

            interaction.add(trig);

            inventory.openReader({
                title, text, mode: "pickup",
                onKeep: () => { onKeep(); sync(); },
                onPut: () => { if (mesh) flyBack(mesh); }
            });
        });
    };

    trig.userData.getPrompt = () => {

        if (L) {

            if (!open) return "Press E - Open the " + o.label;

            if (hasKey()) return "Press E - Take the cellar key";

            if (!inventory.flag(flagName)) return "Press E - Take the " + o.item.title.toLowerCase();

            return "Press E - Close the " + o.label;
        }

        return inventory.flag(flagName) && !hasKey()
            ? "Press E - Search the " + o.label + " (empty)"
            : "Press E - Search the " + o.label;
    };

    trig.userData.interact = () => {

        if (L && !open) { setOpen(true); return; }

        if (hasKey()) {

            take(
                "Cellar Key",
                "Under a pile of rags lies a heavy brass key on a frayed string.\n\nThe paper tag says: CELLAR.",
                L && L.keyThing,
                () => { inventory.setFlag(flagName); inventory.add("cellar_key"); }
            );

            return;
        }

        if (inventory.flag(flagName)) {

            if (L) setOpen(false);
            else inventory.say("Nothing else here.");

            return;
        }

        take(
            o.item.title, o.item.text, L && L.thing,
            () => { inventory.setFlag(flagName); inventory.add(itemId); }
        );
    };

    interaction.add(trig);

    return trig;
}