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
#hh-screen{position:fixed;inset:0;z-index:300;background:#000;display:none;align-items:center;justify-content:center;
  font-family:Georgia,serif;color:#d8d0bc;text-align:center;padding:40px;box-sizing:border-box}
#hh-screen.on{display:flex}
#hh-screen .txt{max-width:640px;white-space:pre-wrap;font-size:20px;line-height:1.65;opacity:0;transition:opacity 1.2s}
#hh-screen .txt.in{opacity:1}
#hh-screen .go{position:absolute;bottom:34px;left:0;right:0;font-size:13px;letter-spacing:.18em;color:#6f6a5c;text-transform:uppercase}
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
            ch = "Chapter 2"; ob = "Find Ramu's letter."; ht = "Where did he sit alone, watching the gate?";
        }
        else if (!this.flag("room_entered")) {
            ch = "Chapter 2"; ob = "Something has opened inside the hostel."; ht = "A cold draught is coming from the old mess hall, on the ground floor.";
        }
        else {
            ch = "The end"; ob = "Lay Ramu's letter on his bed."; ht = "";
        }

        this.box.innerHTML = '<div class="ch">' + ch + '</div><div class="ob">' + ob + '</div><div class="ht">' + ht + '</div>';
    }

    // ------------------------------------------------ full-screen text pages
    pages(list, opts) {

        this.ui();

        opts = opts || {};

        let i = 0;

        const show = () => {

            this.screen.innerHTML = "";

            const t = document.createElement("div");

            t.className = "txt";

            t.textContent = list[i];

            this.screen.appendChild(t);

            const g = document.createElement("div");

            g.className = "go";

            g.textContent = i < list.length - 1 ? "Enter  -  continue" : (opts.last || "Enter  -  continue");

            this.screen.appendChild(g);

            requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add("in")));
        };

        this.screen.classList.add("on");

        inventory.ui();

        inventory.reading = true;

        inventory.mode = "puzzle";

        const done = () => {

            this.screen.classList.remove("on");

            inventory.reading = false;

            inventory.mode = null;

            inventory.puzzleKey = null;

            this.busy = false;

            if (opts.onDone) opts.onDone();
        };

        inventory.puzzleKey = (e) => {

            if (e.type !== "keydown" || e.repeat) return;

            if (e.code === "Enter" || e.code === "Space" || e.code === "KeyE") {

                audio.paper();

                if (++i >= list.length) done();
                else show();
            }
        };

        this.busy = true;

        show();
    }

    intro(onStart) {

        this.pages([
            "HEAVEN HOSTEL\n\nA boy named Ramu died here.",
            "Since then, students have disappeared and the hostel stands empty.\n\nThey say his ghost still walks the halls, and that he does not forgive.",
            "You came to find out why.\n\nIf you see him, do not run in the open.\nHide."
        ], { last: "Enter  -  begin", onDone: () => { this.refresh(); if (onStart) onStart(); } });
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

        audio.puzzle("thunk");

        // blade for the swing comes with the last wish
        if (id === "candles") inventory.add("blade");

        this.refresh();

        // show the page, then (maybe) the story
        inventory.openReader({ title: clue.title, text: clue.text, mode: "view" });

        if (id === "candles") inventory.setFlag("wish_known");

        if (L1.every((x) => this.solved(x)) && !this.flag("story_shown")) {
            this.queue.push("story");
        }

        if (id === "candles") {
            this.queue.push("wish");
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

            this.refresh();

            inventory.say("The swing under the dead tree... in the yard.", 5);
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

        this.queue.push("reveal");
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
