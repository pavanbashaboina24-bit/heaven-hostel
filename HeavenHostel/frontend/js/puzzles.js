// ======================================================
// THE PUZZLES  -  keyboard-driven screens + the stations in the world
//
//   drawer   Warden's drawer     4-digit code            (chapter 1)
//   cipher   Trunk, Room 204     word lock               (chapter 1)
//   book     (secrets.js)        pull the right book     (chapter 1)
//   fuse     Terrace fuse box    6 switches              (chapter 1)
//   radio    Reception radio     tune the dial           (chapter 2)
//   keys     Reception key board 3-digit room code       (chapter 2)
//   rat      (secrets.js)        feed the rat            (chapter 2)
//   lever    (secrets.js)        fit the lever handle    (chapter 2)
//   cellar   Tin box, the cellar 4-digit code from the chalk strokes   (chapter 2)
//   candles  Altar, terrace room 7 candles in order      (chapter 2, last)
//
// All screens use the keyboard only (the game keeps the mouse locked):
//   digits / letters = type    Backspace = delete    Enter = confirm    Q or Esc = leave
// ======================================================

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { inventory } from "./inventory.js";
import { audio } from "./audio.js";
import { story, L2 } from "./story.js";
import { theCase } from "./gen.js";

const CSS = `
#hh-puz{position:fixed;inset:0;z-index:250;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.72);
  font-family:Georgia,serif;color:#d8d0bc}
#hh-puz.on{display:flex}
#hh-puz .pn{min-width:420px;max-width:600px;background:#15110e;border:1px solid #4a3a2a;box-shadow:0 0 60px #000;padding:26px 34px;text-align:center}
#hh-puz h2{margin:0 0 8px;font-weight:normal;letter-spacing:.14em;text-transform:uppercase;font-size:17px;color:#c9b99a}
#hh-puz .ds{font-size:14px;line-height:1.55;color:#a39a86;margin-bottom:18px;white-space:pre-wrap}
#hh-puz .row{display:flex;gap:10px;justify-content:center;margin:12px 0}
#hh-puz .cell{width:46px;height:60px;border:1px solid #6a5a44;background:#0c0a08;font-size:30px;line-height:60px;color:#efe6cf;font-family:monospace}
#hh-puz .cell.cur{border-color:#b9482e}
#hh-puz .sw{width:62px;padding:8px 0;border:1px solid #6a5a44;background:#0c0a08;font-size:13px;color:#8d8775}
#hh-puz .sw b{display:block;font-size:22px;color:#efe6cf;margin-bottom:4px}
#hh-puz .sw.up{border-color:#b9482e;color:#e0a070;background:#241008}
#hh-puz .ft{margin-top:16px;font-size:12px;letter-spacing:.12em;color:#6f6a5c;text-transform:uppercase}
#hh-puz .msg{min-height:20px;margin-top:6px;font-size:14px;color:#c4553a}
#hh-puz .dial{position:relative;height:56px;margin:14px 0;border:1px solid #6a5a44;background:#0c0a08;overflow:hidden}
#hh-puz .dial .nd{position:absolute;top:0;bottom:0;width:2px;background:#d4442a;box-shadow:0 0 8px #d4442a}
#hh-puz .dial .tk{position:absolute;top:30px;bottom:0;width:1px;background:#5d5545}
#hh-puz .dial .lb{position:absolute;top:6px;font-size:11px;color:#8d8775;transform:translateX(-50%)}
#hh-puz .big{font-size:36px;font-family:monospace;color:#efe6cf;margin:4px 0}
#hh-puz .cd{display:inline-block;margin:5px;padding:9px 12px;border:1px solid #6a5a44;background:#0c0a08;font-size:14px;color:#cfc6b0;min-width:80px}
#hh-puz .cd i{display:block;font-style:normal;font-size:11px;color:#8d8775}
#hh-puz .cd.on{border-color:#e0a030;color:#ffd890;background:#2a1a06}
`;

let box = null, panel = null;

function ui() {

    if (box) return;

    const st = document.createElement("style");

    st.textContent = CSS;

    document.head.appendChild(st);

    box = document.createElement("div");

    box.id = "hh-puz";

    document.body.appendChild(box);
}

function frame(title, desc, footer) {

    ui();

    // on a phone the footer talks about the on-screen keys
    if (document.body.classList.contains("touch")) footer = "Tap the keys  -  OK to try  -  X to leave";

    box.innerHTML = "";

    panel = document.createElement("div");

    panel.className = "pn";

    const h = document.createElement("h2"); h.textContent = title; panel.appendChild(h);

    const d = document.createElement("div"); d.className = "ds"; d.textContent = desc; panel.appendChild(d);

    const body = document.createElement("div"); panel.appendChild(body);

    const msg = document.createElement("div"); msg.className = "msg"; panel.appendChild(msg);

    const f = document.createElement("div"); f.className = "ft"; f.textContent = footer; panel.appendChild(f);

    box.appendChild(panel);

    box.classList.add("on");

    return { body, msg };
}

export function closePuzzle() {

    if (box) box.classList.remove("on");

    delete document.body.dataset.puz;

    inventory.reading = false;

    inventory.mode = null;

    inventory.puzzleKey = null;

    stopStatic();
}

function begin(handler) {

    inventory.ui();

    inventory.reading = true;

    inventory.mode = "puzzle";

    inventory.puzzleKey = (e) => {

        if (e.type !== "keydown") return;

        if ((e.code === "KeyQ" || e.code === "Escape") && !e.repeat) { closePuzzle(); return; }

        handler(e);
    };
}

function wrong(msgEl, text) {

    audio.puzzle("wrong");

    msgEl.textContent = text;

    if (panel) {
        panel.animate([{ transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "translateX(0)" }], { duration: 220 });
    }
}

function right(id) {

    closePuzzle();

    story.solve(id);
}

// ------------------------------------------------------
// 1) CODE LOCK  (digits)  /  WORD LOCK (letters)
// ------------------------------------------------------
function codeLock(def) {

    const letters = def.type === "word";

    const n = def.answer.length;

    let val = "";

    const { body, msg } = frame(def.title, def.desc, "Type  -  Backspace  -  Enter to try  -  Q to leave");

    const row = document.createElement("div"); row.className = "row"; body.appendChild(row);

    const draw = () => {

        row.innerHTML = "";

        for (let i = 0; i < n; i++) {

            const c = document.createElement("div");

            c.className = "cell" + (i === val.length ? " cur" : "");

            c.textContent = val[i] || "";

            row.appendChild(c);
        }
    };

    draw();

    begin((e) => {

        if (e.code === "Backspace") { val = val.slice(0, -1); audio.puzzle("tick"); msg.textContent = ""; draw(); return; }

        if (e.code === "Enter") {

            if (val.length < n) return;

            if (val === def.answer) right(def.id);
            else { wrong(msg, def.wrong || "Nothing happens."); val = ""; draw(); }

            return;
        }

        if (e.repeat) return;

        const ch = letters ? (/^Key([A-Z])$/.exec(e.code) || [])[1] : (/^(?:Digit|Numpad)([0-9])$/.exec(e.code) || [])[1];

        if (ch && val.length < n) { val += ch; audio.puzzle("tick"); msg.textContent = ""; draw(); }
    });
}

// ------------------------------------------------------
// 2) SWITCHES  (A..F)
// ------------------------------------------------------
function switches(def) {

    const names = def.names;

    const on = names.map(() => false);

    const { body, msg } = frame(def.title, def.desc, "A-F  flip a switch  -  Enter  pull the lever  -  Q to leave");

    const row = document.createElement("div"); row.className = "row"; body.appendChild(row);

    const draw = () => {

        row.innerHTML = "";

        names.forEach((nm, i) => {

            const s = document.createElement("div");

            s.className = "sw" + (on[i] ? " up" : "");

            s.innerHTML = "<b>" + nm + "</b>" + (on[i] ? "UP" : "DOWN");

            row.appendChild(s);
        });
    };

    draw();

    begin((e) => {

        if (e.code === "Enter" && !e.repeat) {

            if (def.check(on)) right(def.id);
            else wrong(msg, "A spark. The lever springs back. Something is still wrong.");

            return;
        }

        if (e.repeat) return;

        const m = /^Key([A-Z])$/.exec(e.code);

        if (!m) return;

        const i = names.indexOf(m[1]);

        if (i >= 0) { on[i] = !on[i]; audio.puzzle("tick"); msg.textContent = ""; draw(); }
    });
}

// ------------------------------------------------------
// 3) RADIO TUNER
// ------------------------------------------------------
let stat = null;

function stopStatic() {

    if (!stat) return;

    const t = audio.ctx ? audio.ctx.currentTime : 0;

    try { stat.gain.gain.setTargetAtTime(0.0001, t, 0.05); stat.src.stop(t + 0.3); } catch (e) { /* stopped */ }

    stat = null;
}

function tuner(def) {

    let f = def.start;

    const { body, msg } = frame(def.title, def.desc, "Left / Right  tune  -  Shift  faster  -  Enter  listen  -  Q to leave");

    const big = document.createElement("div"); big.className = "big"; body.appendChild(big);

    const dial = document.createElement("div"); dial.className = "dial"; body.appendChild(dial);

    const lo = def.min, hi = def.max;

    for (let v = Math.ceil(lo); v <= hi; v += 2) {

        const x = (v - lo) / (hi - lo) * 100;

        const tk = document.createElement("div"); tk.className = "tk"; tk.style.left = x + "%"; dial.appendChild(tk);

        const lb = document.createElement("div"); lb.className = "lb"; lb.style.left = x + "%"; lb.textContent = v; dial.appendChild(lb);
    }

    const nd = document.createElement("div"); nd.className = "nd"; dial.appendChild(nd);

    // static noise loop (made of the lock-tick wav played fast is not nice: use a noise buffer)
    if (audio.ready && audio.ctx) {

        const ctx = audio.ctx;

        const buf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);

        const d = buf.getChannelData(0);

        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);

        const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;

        const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2200; bp.Q.value = 0.4;

        const g = ctx.createGain(); g.gain.value = 0.0001;

        src.connect(bp); bp.connect(g); g.connect(audio.sfxBus); src.start();

        stat = { src, gain: g };
    }

    const draw = () => {

        big.textContent = f.toFixed(1) + " MHz";

        nd.style.left = ((f - lo) / (hi - lo) * 100) + "%";

        if (stat) {

            const dist = Math.abs(f - def.answer);

            const v = dist < 0.05 ? 0.02 : Math.min(0.5, 0.06 + dist * 0.12);

            stat.gain.gain.setTargetAtTime(v, audio.ctx.currentTime, 0.04);
        }
    };

    draw();

    begin((e) => {

        const step = e.shiftKey ? 1.0 : 0.1;

        if (e.code === "ArrowLeft") { f = Math.max(lo, Math.round((f - step) * 10) / 10); audio.puzzle("tick"); msg.textContent = ""; draw(); }
        else if (e.code === "ArrowRight") { f = Math.min(hi, Math.round((f + step) * 10) / 10); audio.puzzle("tick"); msg.textContent = ""; draw(); }
        else if (e.code === "Enter" && !e.repeat) {

            if (Math.abs(f - def.answer) < 0.05) right(def.id);
            else if ([theCase().radio.anna, theCase().radio.roots, theCase().radio.night].some((s) => Math.abs(f - s) < 0.05)) wrong(msg, "A cheerful announcer. This is not what you are looking for.");
            else wrong(msg, "Only static.");
        }
    });
}

// ------------------------------------------------------
// 4) CANDLE ORDER  (7 names)
// ------------------------------------------------------
function sequence(def) {

    const items = def.items;

    let seq = [];

    const { body, msg } = frame(def.title, def.desc, "1-7  light a candle  -  Backspace  snuff the last  -  Enter  when all are lit  -  Q to leave");

    const row = document.createElement("div"); body.appendChild(row);

    const draw = () => {

        row.innerHTML = "";

        items.forEach((nm, i) => {

            const c = document.createElement("div");

            const at = seq.indexOf(i);

            c.className = "cd" + (at >= 0 ? " on" : "");

            c.innerHTML = "<i>" + (i + 1) + "</i>" + nm + (at >= 0 ? "<i>lit " + (at + 1) + "</i>" : "<i>&nbsp;</i>");

            row.appendChild(c);
        });
    };

    draw();

    begin((e) => {

        if (e.code === "Backspace") { seq.pop(); audio.puzzle("tick"); msg.textContent = ""; draw(); return; }

        if (e.code === "Enter" && !e.repeat) {

            if (seq.length < items.length) return;

            if (seq.every((v, i) => items[v] === def.answer[i])) right(def.id);
            else {
                wrong(msg, "All seven flames gutter and die. Something is cold in the room.");
                seq = [];
                draw();
            }

            return;
        }

        if (e.repeat) return;

        const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);

        if (m) {

            const i = Number(m[1]) - 1;

            if (i < items.length && !seq.includes(i)) { seq.push(i); audio.puzzle("tick"); msg.textContent = ""; draw(); }
        }
    });
}

// ------------------------------------------------------
// THE PUZZLES
// ------------------------------------------------------
export const PUZZLES = {

    drawer: {
        id: "drawer", type: "code", level: 1, title: "The warden's drawer",
        desc: "A small brass lock with four number wheels.\nCode = the room where Ramu died (3 numbers) + how many names are crossed out on his desk (1 number).",
        get answer() { return theCase().code; },
        wrong: "The wheels click, but the drawer does not move. Read the warden's note again."
    },

    cipher: {
        id: "cipher", type: "word", level: 1, title: "The old trunk",
        desc: "A brass lock with letter wheels.\nThe notebook has a word with its letters jumbled. Put the letters in order and type the word.\n(Amma's postcard says what the word is about.)",
        get answer() { return theCase().word; },
        wrong: "The lock does not budge."
    },

    fuse: {
        id: "fuse", type: "switches", level: 1, title: "Terrace fuse box",
        desc: "Six old switches, A to F, and a heavy lever.\nThe two halves of the electrician's card say which switches go UP. All the others stay DOWN.",
        names: ["A", "B", "C", "D", "E", "F"],
        check: (s) => {
            const sol = theCase().fuse.sol;
            return s.every((v, i) => !!v === !!sol[i]);
        }
    },

    radio: {
        id: "radio", type: "tuner", level: 2, title: "The old radio",
        desc: "A wooden radio with a glowing dial.\nTune to OLD GOLD FM. The station card and Ramu's draft letter give you the number.",
        min: 86, max: 108, start: 91.0,
        get answer() { return theCase().radio.answer; }
    },

    keys: {
        id: "keys", type: "code", level: 2, title: "The key board",
        desc: "Eight hooks, every key tagged with a room number.\nType the room number of Gopal's room (3 numbers).",
        get answer() { return theCase().keys.room; },
        wrong: "That hook only holds a rusty key. It is not his."
    },

    cellar: {
        id: "cellar", type: "code", level: 2, title: "Ramu's tin box",
        desc: "A small tin box with four number wheels, hidden in the cellar.\nThe four walls have chalk strokes on them (a slashed bundle = 5). Type the number of strokes: NORTH, EAST, SOUTH, WEST.\n(Ramu's secret note says so. Find it in the hostel.)",
        get answer() { return theCase().cellar.code; },
        wrong: "The wheels click, but the lid stays shut. Count the strokes again, wall by wall."
    },

    candles: {
        id: "candles", type: "sequence", level: 2, title: "The seven candles",
        desc: "Seven candles on the altar, each with a name scratched into the wax.\nPress a candle's number to light it. Light them in the order the boys joined in (1st, 2nd, 3rd ...).\nBackspace takes back the last one.",
        get items() { return theCase().candles.shown; },
        get answer() { return theCase().candles.order; }
    }
};

export function openPuzzle(id) {

    const def = PUZZLES[id];

    if (!def) return;

    audio.puzzle("tick");

    // tells the phone keypad which keys to show
    document.body.dataset.puz = def.type === "code" ? "digits" : def.type === "word" ? "letters" : def.type === "switches" ? "switch" : def.type === "tuner" ? "arrows" : "digits";

    if (def.type === "code" || def.type === "word") codeLock(def);
    else if (def.type === "switches") switches(def);
    else if (def.type === "tuner") tuner(def);
    else if (def.type === "sequence") sequence(def);
}

// ------------------------------------------------------
// A STATION IN THE WORLD:  invisible E-trigger that opens a puzzle
//   o = { id, label, x, y, z, sx, sy, sz }
// ------------------------------------------------------
const trigGeo = new THREE.BoxGeometry(1, 1, 1);

export function addStation(interaction, parent, o) {

    const def = PUZZLES[o.id];

    const trig = new THREE.Mesh(trigGeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));

    trig.scale.set(o.sx || 0.6, o.sy || 0.6, o.sz || 0.6);

    trig.position.set(o.x, o.y, o.z);

    trig.visible = false;

    parent.add(trig);

    const early = () => def.level === 2 && !inventory.flag("story_shown");

    trig.userData.getPrompt = () => {

        if (story.solved(o.id)) return "Press E - " + o.label + " (done)";

        return "Press E - " + o.label;
    };

    trig.userData.interact = () => {

        if (story.solved(o.id)) {

            inventory.say("Already solved.");

            return;
        }

        if (early()) {

            inventory.say("You do not understand what you are looking at yet. Learn who he was first.", 4);

            audio.doorLocked();

            return;
        }

        // the last puzzle (the candles) waits for the other four of chapter 2
        if (def.id === "candles") {

            const left = L2.filter((x) => x !== "candles" && !story.solved(x)).length;

            if (left > 0) {

                inventory.say("The candles will not light yet. " + left + " more clue" + (left > 1 ? "s" : "") + " must be found first.", 4);

                audio.doorLocked();

                return;
            }
        }

        openPuzzle(o.id);
    };

    interaction.add(trig);

    return trig;
}
