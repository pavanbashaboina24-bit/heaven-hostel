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
export const L2 = ["radio", "keys", "rat", "lever", "cellar", "candles"];
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
/* ---- the effects of the story pages (fx) ---- */
#hh-screen .fx{position:absolute;inset:0;pointer-events:none;overflow:hidden}
#hh-screen .fog{position:absolute;left:-40%;width:180%;height:46%;opacity:.5;filter:blur(18px);
  background:radial-gradient(ellipse at 30% 50%,rgba(200,210,230,.30),transparent 60%),radial-gradient(ellipse at 75% 40%,rgba(200,210,230,.22),transparent 55%);animation:hhFog 22s linear infinite alternate}
#hh-screen .fog.f2{top:48%;animation-duration:30s;animation-direction:alternate-reverse;opacity:.4}
@keyframes hhFog{from{transform:translateX(-8%)}to{transform:translateX(8%)}}
#hh-screen .flick{position:absolute;inset:0;background:#000;opacity:0;animation:hhFlick 5.3s steps(1) infinite}
@keyframes hhFlick{0%{opacity:0}8%{opacity:.55}9%{opacity:0}10%{opacity:.7}11%{opacity:.05}42%{opacity:0}43%{opacity:.6}44.5%{opacity:0}76%{opacity:.4}77%{opacity:0}100%{opacity:0}}
#hh-screen .flash{position:absolute;inset:0;background:#dfe8ff;opacity:0;animation:hhFlash 6s linear infinite}
@keyframes hhFlash{0%,12%{opacity:0}12.5%{opacity:.95}14%{opacity:.1}15%{opacity:.7}18%{opacity:0}60%{opacity:0}60.4%{opacity:.5}63%{opacity:0}100%{opacity:0}}
#hh-screen .shakeit{animation:hhShake .7s ease-out 1}
@keyframes hhShake{0%{transform:translate(0,0)}10%{transform:translate(-14px,9px)}20%{transform:translate(12px,-10px)}30%{transform:translate(-9px,-6px)}45%{transform:translate(7px,5px)}65%{transform:translate(-3px,2px)}100%{transform:translate(0,0)}}
#hh-screen .eyes{position:absolute;width:132px;height:30px;opacity:0;animation:hhEyes 7s ease-in-out infinite}
#hh-screen .eyes i{position:absolute;top:0;width:46px;height:16px;border-radius:50%;background:radial-gradient(ellipse,#fff 0,#ff3a2a 30%,#8a0008 62%,transparent 72%);box-shadow:0 0 22px 6px rgba(255,30,20,.6);animation:hhBlinkEye 3.1s infinite}
#hh-screen .eyes i:first-child{left:0}#hh-screen .eyes i:last-child{right:0}
@keyframes hhEyes{0%,8%{opacity:0;transform:scale(.6)}22%,70%{opacity:1;transform:scale(1)}85%,100%{opacity:0;transform:scale(1.5)}}
@keyframes hhBlinkEye{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.05)}}
#hh-screen .drip{position:absolute;top:0;width:5px;border-radius:0 0 4px 4px;background:linear-gradient(#5a0006,#b0000c);height:0;animation:hhDrip 6s ease-in infinite}
@keyframes hhDrip{0%{height:0;opacity:1}55%{height:var(--h,34%);opacity:1}100%{height:var(--h,34%);opacity:0}}
#hh-screen .bars{position:absolute;inset:0;display:flex;justify-content:space-between}
#hh-screen .bars i{width:2.6%;height:100%;background:linear-gradient(90deg,#0a0a0b,#3a3b3f 45%,#0a0a0b);box-shadow:0 0 14px #000;transform:translateY(-110%);animation:hhBar .45s cubic-bezier(.2,.9,.3,1.2) forwards}
@keyframes hhBar{to{transform:translateY(0)}}
#hh-screen .chain{position:absolute;left:0;right:0;top:48%;height:16px;background:repeating-linear-gradient(90deg,#4a4a50 0 22px,#14141a 22px 30px);box-shadow:0 6px 12px #000;transform:translateX(-110%);animation:hhChain .5s .5s cubic-bezier(.2,.8,.2,1) forwards}
@keyframes hhChain{to{transform:translateX(0)}}
#hh-screen .ttl.glitch{animation:hhIn 1.6s .2s forwards,hhGlitch 3.7s 1.8s infinite}
@keyframes hhGlitch{0%,90%,100%{transform:none;text-shadow:0 0 22px rgba(224,27,36,.55),0 2px 4px #000}92%{transform:translate(-6px,1px) skewX(-8deg);text-shadow:4px 0 #0ff,-4px 0 #f0f}94%{transform:translate(5px,-2px);text-shadow:-3px 0 #0ff,3px 0 #f0f}96%{transform:none}}
#hh-screen .cap .w{opacity:0;filter:blur(5px);display:inline-block;animation:hhWord .6s forwards}
@keyframes hhWord{to{opacity:1;filter:blur(0)}}
#hh-screen canvas.dust{position:absolute;inset:0;width:100%;height:100%}
#hh-screen .bg.zoomin{animation-name:hhZoomIn;animation-duration:9s}
@keyframes hhZoomIn{from{transform:scale(1.02)}to{transform:scale(1.35) translate(-2%,1%)}}
`;

// ------------------------------------------------------
// the effects of a story page.  A page may have  fx: ["fog","dust","eyes" ...]
//   fog  dust  flicker  flash (lightning)  shake  eyes (red eyes in the dark)
//   blood (drips)  bars (iron bars slam down + chain)  glitch (the title)  zoom
// ------------------------------------------------------
const FX_DEFAULT = [["fog", "dust"], ["flicker", "dust"], ["fog", "eyes"], ["flash", "dust", "zoom"], ["blood", "fog"], ["flicker", "eyes", "dust"]];

function addFx(screen, list, token, isActive) {

    const box = document.createElement("div");

    box.className = "fx";

    screen.appendChild(box);

    const div = (cls, parent) => { const d = document.createElement("div"); d.className = cls; (parent || box).appendChild(d); return d; };

    for (const f of list) {

        if (f === "fog") { div("fog"); div("fog f2"); }

        else if (f === "flicker") div("flick");

        else if (f === "flash") div("flash");

        else if (f === "shake") { screen.classList.remove("shakeit"); void screen.offsetWidth; screen.classList.add("shakeit"); setTimeout(() => screen.classList.remove("shakeit"), 800); }

        else if (f === "eyes") {

            const n = 1 + Math.floor(Math.random() * 2);

            for (let k = 0; k < n; k++) {

                const e = div("eyes");

                e.style.left = (8 + Math.random() * 70) + "%";

                e.style.top = (14 + Math.random() * 28) + "%";

                e.style.animationDelay = (k * 2.4 + Math.random()) + "s";

                e.style.transform = "scale(" + (0.7 + Math.random() * 0.8) + ")";

                e.appendChild(document.createElement("i"));

                e.appendChild(document.createElement("i"));
            }
        }

        else if (f === "blood") {

            for (let k = 0; k < 9; k++) {

                const d = div("drip");

                d.style.left = (6 + Math.random() * 88) + "%";

                d.style.setProperty("--h", (16 + Math.random() * 36) + "%");

                d.style.animationDelay = (Math.random() * 4) + "s";

                d.style.animationDuration = (4 + Math.random() * 4) + "s";
            }
        }

        else if (f === "bars") {

            const b = div("bars");

            for (let k = 0; k < 18; k++) { const i = document.createElement("i"); i.style.animationDelay = (k % 6) * 0.07 + "s"; b.appendChild(i); }

            div("chain");
        }

        else if (f === "dust") {

            const cv = document.createElement("canvas");

            cv.className = "dust";

            cv.width = Math.min(960, innerWidth);

            cv.height = Math.min(540, innerHeight);

            box.appendChild(cv);

            const g = cv.getContext("2d");

            const P = [];

            for (let k = 0; k < 55; k++) P.push({ x: Math.random() * cv.width, y: Math.random() * cv.height, r: 0.6 + Math.random() * 1.8, vx: (Math.random() - 0.5) * 0.25, vy: -0.08 - Math.random() * 0.3, a: 0.2 + Math.random() * 0.5 });

            const loop = () => {

                if (!isActive(token) || !cv.isConnected) return;

                g.clearRect(0, 0, cv.width, cv.height);

                for (const p of P) {

                    p.x += p.vx + Math.sin(p.y * 0.02) * 0.1;

                    p.y += p.vy;

                    if (p.y < -4) { p.y = cv.height + 4; p.x = Math.random() * cv.width; }

                    g.fillStyle = "rgba(225,215,190," + p.a + ")";

                    g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill();
                }

                requestAnimationFrame(loop);
            };

            requestAnimationFrame(loop);
        }
    }

    return box;
}


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
        else if (!inventory.has("ramu_letter") && !this.flag("game_finished")) {
            ch = "The end"; ob = "Bring Ramu's letter."; ht = "It is sewn inside the swing seat in the yard. Cut it open with the rusty blade.";
        }
        else {
            ch = "The end"; ob = "Lay Ramu's letter on his bed."; ht = "Stand near his bed.";
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

            const fxs = it.fx || FX_DEFAULT[i % FX_DEFAULT.length];

            if (fxs.includes("zoom")) bg.classList.add("zoomin");

            this.screen.appendChild(bg);

            bg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, fill: "backwards" });

            for (const c of ["shade", "grain"]) {

                const d = document.createElement("div");

                d.className = c;

                this.screen.appendChild(d);
            }

            const token = {};

            this._fxToken = token;

            addFx(this.screen, fxs, token, (t) => this._fxToken === t && this.screen.classList.contains("on"));

            if (it.title) {

                const t = document.createElement("div");

                t.className = "ttl glitch";

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
            { img: "story_title.jpg", title: "HEAVEN HOSTEL", fx: ["fog", "dust", "flicker", "zoom"], text: "A boy named Ramu died here." },
            { img: "story_arrive.jpg", fx: ["fog", "dust", "zoom"], text: "It was a night just like this one.\n\nThe rain had stopped. The road was empty.\nThe gate of Heaven Hostel stood waiting." },
            { img: "story_empty.jpg", fx: ["flicker", "dust", "eyes"], text: "Since that night, students have vanished one by one, and the hostel stands empty.\n\nThe villagers will not walk past its wall after dark." },
            { img: "story_ghost_walk.jpg", fx: ["flash", "fog", "blood"], text: "They say his ghost still walks the halls.\n\nThey say he does not forgive.\nThey say he never sleeps." },
            { img: "story_hide.jpg", fx: ["flicker", "eyes", "dust"], text: "You came to find out why.\n\nIf you hear him, do not run in the open.\nHide.\nAnd do not let him see your light." }
        ], { last: "Enter  -  begin", onDone: () => { events.emit("game-begin"); this.refresh(); if (onStart) onStart(); } });
    }

    // the main gate has just closed behind you
    lockedIn(onDone) {

        this.pages([
            { img: "story_gate.jpg", title: "LOCKED IN", fx: ["bars", "shake", "flash", "dust"], text: "THE GATE SLAMS SHUT BEHIND YOU.\n\nThe chain wraps itself round the bars.\nThe padlock turns, all by itself." },
            { img: "story_night.jpg", title: "RAMU IS WATCHING YOU", fx: ["eyes", "flicker", "fog"], text: "You are not alone in here.\n\nFrom one dark window, something saw you come in.\nIt has been waiting a very long time." },
            { img: "story_ghost_walk.jpg", fx: ["blood", "dust", "flicker"], text: "No one who came in was ever allowed out.\n\nSolve his puzzles. Learn what happened to him.\nFind his letter.\n\nOnly then will the gate open again." }
        ], { last: "Enter  -  go in", onDone: () => { this.refresh(); if (onDone) onDone(); } });
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

        // all ten puzzles done: the hidden door in the mess hall appears
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
