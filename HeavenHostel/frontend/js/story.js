// ======================================================
// THE STORY OF RAMU  -  chapters, clue counter, story screens
//
//   Start      you only know: a boy named Ramu died here and his
//              ghost walks the hostel.
//   Chapter 1  get in (gate, main door), then solve 3 puzzles
//              -> the STORY of Ramu is shown
//   Chapter 2  solve 3 more puzzles -> his LAST WISH
//   Finale     find his letter (in the swing) -> the ending
//
// Progress is kept in inventory flags, so Continue works.
// ======================================================

import { inventory } from "./inventory.js";
import { audio } from "./audio.js";
import { events } from "./events.js";
import { CLUES, STORY, ENDING, LETTER, REVEAL } from "./clues.js";
import { theCase, hint, whereIs, papersOf } from "./gen.js";
import { locks } from "./locks.js";

export const L1 = ["drawer", "cipher", "book", "fuse"];
export const L2 = ["radio", "keys", "rat", "lever", "candles"];
const ORDER = [...L1, ...L2];

const CSS = `
#hh-story{position:fixed;top:14px;right:16px;z-index:60;max-width:300px;display:none;
  font:13px/1.45 Georgia,serif;color:#d9d2c0;text-align:right;
  text-shadow:0 1px 4px #000;pointer-events:none}
body.playing #hh-story{display:block}
#hh-story .ch{font-size:11px;letter-spacing:.2em;color:#9b3a3a;text-transform:uppercase}
#hh-story .ob{margin-top:3px;color:#e8e0cc}
#hh-story .ht{margin-top:2px;font-size:11px;color:#8d8775;font-style:italic}
#hh-screen{position:fixed;inset:0;z-index:300;background:#000;display:none;overflow:hidden;
  font-family:Georgia,serif;color:#e6dfcc;text-align:center;box-sizing:border-box;cursor:pointer}
#hh-screen.on{display:block}
#hh-screen .bg{position:absolute;inset:-3%;background:#0a0a0c center/cover no-repeat;transform-origin:50% 55%;
  animation:hhPanA 16s ease-out forwards}
#hh-screen .bg.b{animation-name:hhPanB}
#hh-screen .bg.plain{background:radial-gradient(ellipse at 50% 40%,#2a1010,#050505 70%)}
@keyframes hhPanA{from{transform:scale(1.03) translate(0,0)}to{transform:scale(1.16) translate(-1.6%,-1%)}}
@keyframes hhPanB{from{transform:scale(1.16) translate(1.4%,1%)}to{transform:scale(1.03) translate(0,0)}}
#hh-screen .shade{position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(to top,rgba(0,0,0,.94) 0%,rgba(0,0,0,.72) 26%,rgba(0,0,0,.12) 58%,rgba(0,0,0,.35) 100%),
  radial-gradient(ellipse at center,rgba(0,0,0,0) 45%,rgba(0,0,0,.7) 100%)}
#hh-screen .grain{position:absolute;inset:0;pointer-events:none;opacity:.12;mix-blend-mode:overlay;
  background-image:repeating-radial-gradient(circle at 17% 32%,#fff 0,#000 1px,transparent 2px,transparent 3px)}
#hh-screen .ttl{position:absolute;left:0;right:0;top:7%;font:46px/1.1 var(--title-font,Georgia,serif);letter-spacing:.08em;color:#e01b24;
  text-shadow:0 0 22px rgba(224,27,36,.55),0 2px 4px #000;opacity:0;animation:hhIn 1.6s .2s forwards}
#hh-screen .cap{position:absolute;left:50%;bottom:15%;transform:translateX(-50%);width:min(820px,88vw);
  font-size:clamp(17px,2.5vw,26px);line-height:1.6;white-space:pre-wrap;text-shadow:0 2px 8px #000,0 0 18px #000;min-height:4.8em}
#hh-screen .cap em{color:#e01b24;font-style:normal}
#hh-screen .go{position:absolute;bottom:3.5%;left:0;right:0;font-size:12px;letter-spacing:.2em;color:#8a8470;text-transform:uppercase;opacity:0;transition:opacity .8s}
#hh-screen .go.on{opacity:1;animation:hhBlink 1.6s infinite}
#hh-screen .dots{position:absolute;bottom:7%;left:0;right:0;display:flex;gap:7px;justify-content:center}
#hh-screen .dots i{width:7px;height:7px;border-radius:50%;background:#4a4538}
#hh-screen .dots i.on{background:#e01b24;box-shadow:0 0 8px #e01b24}
@keyframes hhIn{to{opacity:1}}
@keyframes hhBlink{50%{opacity:.35}}
`;

class Story {

    constructor() {
        this.box = null;
        this.screen = null;
        this.queue = [];
        this.busy = false;
        this.timer = setInterval(() => this.tick(), 400);
        inventory.resetHooks.push(() => { this.queue = []; this.refresh(); });
    }

    // ------------------------------------------------ state
    flag(n) { return inventory.flag(n); }

    solved(id) { return inventory.flag("pz_" + id); }

    count(list) { return list.filter((id) => this.solved(id)).length; }

    // the next puzzle in the chain that is not solved yet
    next() { return ORDER.find((id) => !this.solved(id)); }

    clueText(id) {

        let t = CLUES[id].text.replace("@WORD@", theCase().word).replace("@ROOM@", theCase().keys.room).replace("@FREQ@", theCase().radio.answer.toFixed(1) + " MHz").replace("@GATEKEY@", whereIs("gatekey"));

        const nx = ORDER.find((x) => !this.solved(x) && x !== id);

        if (nx && id !== "candles") t += "\n\n- - - - - - - - - -\nHINT for the next clue:\n" + hint(nx);

        return t;
    }

    chapter() {
        if (!this.flag("story_shown")) return 1;
        return 2;
    }

    // ------------------------------------------------ HUD
    ui() {

        if (this.box) return;

        const st = document.createElement("style");

        st.textContent = CSS;

        document.head.appendChild(st);

        this.box = document.createElement("div");

        this.box.id = "hh-story";

        document.body.appendChild(this.box);

        this.screen = document.createElement("div");

        this.screen.id = "hh-screen";

        document.body.appendChild(this.screen);
    }

    refresh() {

        this.ui();

        const c1 = this.count(L1), c2 = this.count(L2);

        let ch = "", ob = "", ht = "";

        if (!this.flag("gate_broken")) {
            ch = "Heaven Hostel"; ob = "Get through the gate."; ht = "The chain is old, but strong. Something heavy might break it.";
        }
        else if (!this.flag("main_unlocked")) {
            ch = "Heaven Hostel"; ob = "Get into the hostel."; ht = "The key to the front door must be somewhere in the compound.";
        }
        else if (!this.flag("story_shown")) {
            ch = "Chapter 1"; ob = "What happened to Ramu?  Clues " + c1 + " / " + L1.length;
            ht = (c1 === 0 ? "It all began in Room 204. " : "") + hint(this.next());
        }
        else if (c2 < L2.length) {
            ch = "Chapter 2"; ob = "What does Ramu want?  Clues " + c2 + " / " + L2.length; ht = hint(this.next());
        }
        else if (!this.flag("letter_found")) {
            ch = "Chapter 2"; ob = "Find Ramu's letter."; ht = "Where did he sit alone, watching the gate?  (A hidden door has opened in the mess hall: north wall, opposite the bookcase.)";
        }
        else if (!this.flag("room_entered")) {
            ch = "Chapter 2"; ob = "Take Ramu's letter through the hidden door."; ht = "Mess hall, ground floor: the north wall, opposite the bookcase.";
        }
        else {
            ch = "The end"; ob = "Lay Ramu's letter on his bed."; ht = "";
        }

        this.box.innerHTML = '<div class="ch">' + ch + '</div><div class="ob">' + ob + '</div><div class="ht">' + ht + '</div>';
    }

    // ------------------------------------------------ full-screen story pages
    // list: strings, or { text, img: "story_x.jpg", title: "CHAPTER" }
    pages(list, opts) {

        this.ui();

        opts = opts || {};

        const items = list.map((p) => (typeof p === "string" ? { text: p } : p));

        // start loading the pictures now
        for (const it of items) { if (it.img) { const im = new Image(); im.src = "assets/story/" + it.img; } }

        const touch = document.body.classList.contains("touch");

        let i = 0, typing = null, cur = null;

        const finishTyping = () => {

            if (!typing) return false;

            clearInterval(typing);

            typing = null;

            cur.cap.textContent = cur.full;

            cur.go.classList.add("on");

            return true;
        };

        const show = () => {

            const it = items[i];

            this.screen.innerHTML = "";

            const bg = document.createElement("div");

            bg.className = "bg" + (i % 2 ? " b" : "") + (it.img ? "" : " plain");

            if (it.img) bg.style.backgroundImage = "url(assets/story/" + it.img + ")";

            this.screen.appendChild(bg);

            bg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, fill: "backwards" });

            for (const c of ["shade", "grain"]) {

                const d = document.createElement("div");

                d.className = c;

                this.screen.appendChild(d);
            }

            if (it.title) {

                const t = document.createElement("div");

                t.className = "ttl";

                t.textContent = it.title;

                this.screen.appendChild(t);
            }

            const cap = document.createElement("div");

            cap.className = "cap";

            this.screen.appendChild(cap);

            if (items.length > 1) {

                const dots = document.createElement("div");

                dots.className = "dots";

                items.forEach((_, k) => { const d = document.createElement("i"); if (k === i) d.className = "on"; dots.appendChild(d); });

                this.screen.appendChild(dots);
            }

            const go = document.createElement("div");

            go.className = "go";

            const more = i < items.length - 1;

            go.textContent = more ? (touch ? "Tap  -  continue" : "Enter  -  continue") : (opts.last || (touch ? "Tap  -  continue" : "Enter  -  continue"));

            this.screen.appendChild(go);

            // the words appear letter by letter
            const full = it.text;

            cur = { cap, full, go };

            let k = 0;

            clearInterval(typing);

            typing = setInterval(() => {

                k += 2;

                cap.textContent = full.slice(0, k);

                if (k >= full.length) { finishTyping(); }
            }, 30);
        };

        this.screen.classList.add("on");

        inventory.ui();

        inventory.reading = true;

        inventory.mode = "puzzle";

        const done = () => {

            clearInterval(typing);

            typing = null;

            this.screen.classList.remove("on");

            this.screen.onclick = null;

            inventory.reading = false;

            inventory.mode = null;

            inventory.puzzleKey = null;

            this.busy = false;

            if (opts.onDone) opts.onDone();
        };

        // Enter / Space / E / a tap: first finishes the typing, then goes on
        const step = () => {

            if (finishTyping()) return;

            audio.paper();

            if (++i >= items.length) done();
            else show();
        };

        inventory.puzzleKey = (e) => {

            if (e.type !== "keydown" || e.repeat) return;

            if (e.code === "Enter" || e.code === "Space" || e.code === "KeyE") step();
        };

        this.screen.onclick = step;

        this.busy = true;

        show();
    }

    intro(onStart) {

        this.pages([
            { img: "story_title.jpg", title: "HEAVEN HOSTEL", text: "A boy named Ramu died here." },
            { img: "story_empty.jpg", text: "Since then, students have disappeared and the hostel stands empty.\n\nThey say his ghost still walks the halls, and that he does not forgive." },
            { img: "story_hide.jpg", text: "You came to find out why.\n\nIf you see him, do not run in the open.\nHide." }
        ], { last: "Enter  -  begin", onDone: () => { events.emit("game-begin"); this.refresh(); if (onStart) onStart(); } });
    }

    // ------------------------------------------------ solving a puzzle
    solve(id) {

        const clue = { title: CLUES[id].title };

        inventory.setFlag("pz_" + id);

        clue.text = this.clueText(id);

        const cid = "clue_" + id;

        inventory.define(cid, { name: clue.title, kind: "letter", text: clue.text, icon: "\uD83D\uDCDC" });

        inventory.add(cid);

        // the papers of this puzzle are used up: the ones in your bag and the ones
        // still lying in the rooms vanish
        for (const tag of papersOf(id)) inventory.remove("pz_" + tag);

        if (id === "drawer") inventory.remove("pz_warden_note");

        locks.refresh();

        events.emit("puzzle-solved", id);

        audio.puzzle("thunk");

        // blade for the swing comes with the last wish
        if (id === "candles") inventory.add("blade");

        this.refresh();

        // show the page, then (maybe) the story
        // (the paper crumbles to dust when you close it: the next hint is on the HUD)
        inventory.openReader({ title: clue.title, text: clue.text, mode: "view", vanish: cid });

        if (id === "candles") inventory.setFlag("wish_known");

        if (L1.every((x) => this.solved(x)) && !this.flag("story_shown")) {
            this.queue.push("story");
        }

        if (id === "candles") {
            this.queue.push("wish");
        }

        // all nine puzzles done: the hidden door in the mess hall appears
        if (ORDER.every((x) => this.solved(x))) {
            this.queue.push("reveal");
        }
    }

    tick() {

        if (this.busy || inventory.reading || !document.body.classList.contains("playing")) return;

        const job = this.queue.shift();

        if (!job) return;

        if (job === "story") {

            inventory.setFlag("story_shown");

            this.pages(STORY, { last: "Enter  -  chapter 2", onDone: () => this.refresh() });
        }
        else if (job === "wish") {

            this.pages([{
                img: "story_wish.jpg", title: "HIS LAST WISH",
                text: "Ramu had one wish left.\n\nA letter he never sent, stitched into the seat of the swing under the dead tree.\n\nTake the rusty blade. Go out to the yard."
            }], { last: "Enter  -  go", onDone: () => { this.refresh(); inventory.say("The swing under the dead tree... in the yard.", 5); } });
        }
        else if (job === "reveal") {

            // the hidden door appears (mystery.js listens)
            this.pages(REVEAL, { last: "Enter  -  continue", onDone: () => { events.emit("reveal-door"); this.refresh(); } });
        }
        else if (job === "ending") {

            this.ending();
        }
    }

    // ------------------------------------------------ the letter and the end
    findLetter() {

        inventory.setFlag("letter_found");

        inventory.define("ramu_letter", { name: LETTER.title, kind: "letter", text: LETTER.text, icon: "\u2709\uFE0F" });

        inventory.add("ramu_letter");

        this.refresh();

        audio.paper();

        inventory.openReader({ title: LETTER.title, text: LETTER.text, mode: "view" });

        inventory.say("Take the letter to the hidden door in the mess hall.", 5);
    }

    ending() {

        this.pages(ENDING, {
            last: "Enter  -  back to the menu",
            onDone: () => {
                events.emit("gameover-story");
                if (this.onEnd) this.onEnd();
            }
        });
    }
}

export const story = new Story();
