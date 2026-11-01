import { inventory } from "./inventory.js";
import { events } from "./events.js";
import { story } from "./story.js";

// ======================================================
// TOUCH CONTROLS  -  play Heaven Hostel on a phone or tablet
//
//   left thumb   : the round stick (walk; push to the edge to run)
//   right thumb  : drag anywhere on the right side to look round
//   buttons      : ACT (= E: open, pick up, hide, use)   SIT (= C)
//                  JUMP   RUN (toggle)   LIGHT (= F torch)   BAG   BELL   pause
//   notes/pickups: real buttons KEEP IN BAG / PUT BACK / CLOSE (no E or Q)
//   puzzles:       a SMALL keypad in the bottom-right corner, only the keys that
//                  puzzle needs (digits, letters or arrows), so the game stays visible
//   the ACT button changes its name (OPEN, TAKE, SEARCH, HIDE ...) to match what you aim at
//
// It switches on by itself on phones/tablets (coarse pointer).
// Add  ?touch=1  to the address to try it on a computer, ?touch=0 to switch it off.
// ======================================================

export const IS_TOUCH = (() => {

    const q = new URLSearchParams(location.search).get("touch");

    if (q === "1") return true;

    if (q === "0") return false;

    try {

        return matchMedia("(pointer: coarse)").matches || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    }
    catch (e) { return false; }
})();

const CSS = `
body.touch { touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; overscroll-behavior: none; -webkit-tap-highlight-color: transparent; }
body.touch canvas { touch-action: none; }
body.touch #gameHint { display: none !important; }
#hh-touch { position: fixed; inset: 0; z-index: 800; pointer-events: none; display: none; font-family: var(--text-font, monospace); -webkit-tap-highlight-color: transparent; }
#hh-touch.on { display: block; }
/* the look-round area is INVISIBLE: no pad, no circle, you just drag the right side */
#hh-touch .zone-look { position: absolute; top: 0; right: 0; width: 60%; height: 100%; pointer-events: auto; touch-action: none; background: none; border: 0; outline: 0; }
#hh-touch .stick { position: absolute; left: max(4vmin, env(safe-area-inset-left)); bottom: max(5vmin, env(safe-area-inset-bottom)); width: 28vmin; height: 28vmin; max-width: 170px; max-height: 170px; min-width: 112px; min-height: 112px;
    border-radius: 50%; background: rgba(255,255,255,.06); border: 2px solid rgba(255,255,255,.22); pointer-events: auto; touch-action: none; }
#hh-touch .knob { position: absolute; left: 50%; top: 50%; width: 42%; height: 42%; margin: -21% 0 0 -21%; border-radius: 50%; background: rgba(224,27,36,.5); border: 2px solid rgba(255,255,255,.45); }
#hh-touch .btn { position: absolute; pointer-events: auto; touch-action: none; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
    color: #fff; background: rgba(18,18,18,.5); border: 2px solid rgba(255,255,255,.32); border-radius: 50%; font-size: 12px; font-weight: 700; line-height: 1.05; letter-spacing: .5px; -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px); }
#hh-touch .btn small { display: block; font-size: 9px; font-weight: 600; opacity: .8; letter-spacing: .5px; margin-top: 1px; }
#hh-touch .btn:active, #hh-touch .btn.hold { background: rgba(224,27,36,.75); }
/* bottom right: ACT is the big one, JUMP / RUN / SIT sit around it, nothing overlaps */
#hh-touch .act { right: max(4vmin, env(safe-area-inset-right)); bottom: max(5vmin, env(safe-area-inset-bottom)); width: 21vmin; height: 21vmin; max-width: 118px; max-height: 118px; min-width: 78px; min-height: 78px; font-size: 16px; background: rgba(165,15,24,.62); border-color: rgba(255,255,255,.55); }
#hh-touch .act.idle { background: rgba(60,20,22,.45); opacity: .8; }
#hh-touch .jump { right: calc(max(4vmin, env(safe-area-inset-right)) + 23vmin); bottom: max(5vmin, env(safe-area-inset-bottom)); width: 14vmin; height: 14vmin; max-width: 80px; max-height: 80px; min-width: 56px; min-height: 56px; }
#hh-touch .run { right: max(4vmin, env(safe-area-inset-right)); bottom: calc(max(5vmin, env(safe-area-inset-bottom)) + 23vmin); width: 14vmin; height: 14vmin; max-width: 80px; max-height: 80px; min-width: 56px; min-height: 56px; }
#hh-touch .sit { right: calc(max(4vmin, env(safe-area-inset-right)) + 19vmin); bottom: calc(max(5vmin, env(safe-area-inset-bottom)) + 19vmin); width: 12vmin; height: 12vmin; max-width: 68px; max-height: 68px; min-width: 50px; min-height: 50px; }
/* top right: one tidy row  PAUSE  BAG  LIGHT  BELL */
#hh-touch .mini { top: max(2vmin, env(safe-area-inset-top)); width: 11.5vmin; height: 11.5vmin; max-width: 60px; max-height: 60px; min-width: 44px; min-height: 44px; font-size: 18px; }
#hh-touch .pause { right: max(2vmin, env(safe-area-inset-right)); }
#hh-touch .bag { right: calc(max(2vmin, env(safe-area-inset-right)) + 13.5vmin); }
#hh-touch .light { right: calc(max(2vmin, env(safe-area-inset-right)) + 27vmin); }
#hh-touch .bell { right: calc(max(2vmin, env(safe-area-inset-right)) + 40.5vmin); }
@media (max-height: 380px) { #hh-touch .mini { width: 42px; height: 42px; min-width: 40px; min-height: 40px; } #hh-touch .bag { right: calc(max(2vmin, env(safe-area-inset-right)) + 48px); } #hh-touch .light { right: calc(max(2vmin, env(safe-area-inset-right)) + 94px); } #hh-touch .bell { right: calc(max(2vmin, env(safe-area-inset-right)) + 140px); } }
/* the small keypad: bottom-right corner, see-through, only the keys that are needed */
#hh-pad { position: fixed; right: max(6px, env(safe-area-inset-right)); bottom: max(6px, env(safe-area-inset-bottom)); width: min(300px, 46vw); z-index: 810; display: none; padding: 5px; background: rgba(8,8,8,.62); border: 1px solid rgba(165,15,24,.8); border-radius: 10px; touch-action: none; }
#hh-pad.on { display: block; }
#hh-pad .r { display: flex; justify-content: center; gap: 3px; margin: 2px 0; }
#hh-pad .r:empty, #hh-pad .r.off { display: none; }
#hh-pad button { flex: 1 1 0; min-width: 22px; height: 34px; border: 1px solid #666; border-radius: 6px; background: rgba(30,30,30,.9); color: #eee; font: 700 14px var(--text-font, monospace); touch-action: manipulation; padding: 0; }
#hh-pad button.w { flex: 2 1 0; font-size: 12px; }
#hh-pad button.big { height: 46px; font-size: 14px; flex: 1 1 0; }
#hh-pad button.go { background: #a50f18; border-color: #e01b24; }
#hh-pad button.keep { background: #1f5a2a; border-color: #3fbf5a; }
#hh-pad button:active { background: #e01b24; }
/* puzzle panels become a small card in the top-left so the room stays visible */
body.touch #hh-puz { background: none; align-items: flex-start; justify-content: flex-start; pointer-events: none; }
body.touch #hh-puz .pn { pointer-events: auto; min-width: 0; width: min(330px, 46vw); max-width: 46vw; margin: 6px; padding: 9px 12px; background: rgba(14,10,8,.84); box-shadow: 0 0 18px #000; }
body.touch #hh-puz h2 { font-size: 13px; margin-bottom: 4px; }
body.touch #hh-puz .ds { font-size: 11.5px; line-height: 1.4; margin-bottom: 8px; max-height: 34vh; overflow: auto; }
body.touch #hh-puz .row { margin: 6px 0; gap: 5px; }
body.touch #hh-puz .cell { width: 34px; height: 42px; font-size: 22px; line-height: 42px; }
body.touch #hh-puz .sw { width: 44px; padding: 4px 0; font-size: 10px; }
body.touch #hh-puz .sw b { font-size: 16px; margin-bottom: 2px; }
body.touch #hh-puz .big { font-size: 24px; }
body.touch #hh-puz .dial { height: 44px; margin: 8px 0; }
body.touch #hh-puz .cd { margin: 3px; padding: 5px 8px; font-size: 11px; min-width: 56px; }
body.touch #hh-puz .ft { margin-top: 6px; font-size: 9.5px; letter-spacing: .06em; }
body.touch #hh-puz .msg { font-size: 11.5px; min-height: 14px; }
/* notes, pickups, bag: smaller paper, bottom space left for the buttons */
body.touch #hh-reader { align-items: flex-start; padding-top: 8px; background: rgba(0,0,0,.55); }
body.touch #hh-reader .paper { width: min(520px, 62vw); max-height: calc(100vh - 86px); padding: 14px 18px; }
body.touch #hh-reader h2 { font-size: 17px; margin-bottom: 8px; }
body.touch #hh-reader .body { font-size: 14px; line-height: 1.4; }
body.touch #hh-reader .foot { margin-top: 10px; padding-top: 8px; font-size: 12px; }
/* the lines of text on the HUD, made for a small screen */
body.touch #hh-story { top: 6px; left: 8px; right: auto; text-align: left; max-width: 34vw; font-size: 11px; line-height: 1.35; background: rgba(0,0,0,.35); padding: 4px 8px; border-left: 2px solid #9b3a3a; }
body.touch #hh-story .ch { font-size: 9px; }
body.touch #hh-story .ht { font-size: 10px; }
body.touch #hh-inv { left: 8px; bottom: auto; top: 118px; max-width: 34vw; gap: 4px; }
body.touch #hh-inv .it { padding: 3px 7px; font-size: 11px; }
body.touch #hh-inv .ic { font-size: 14px; }
body.touch #hh-say { bottom: 36%; max-width: 54%; font-size: 14px; padding: 7px 12px; }
body.touch #interactionMessage { bottom: 38%; font-size: 12px; padding: 6px 12px; letter-spacing: .06em; max-width: 56vw; text-align: center; }
body.touch #hh-screen .ttl { font-size: clamp(24px, 7vw, 40px); }
body.touch #hh-screen .cap { font-size: clamp(13px, 3.1vw, 19px); bottom: 17%; width: 84vw; }
#hh-rotate { position: fixed; inset: 0; z-index: 2000; display: none; align-items: center; justify-content: center; text-align: center; background: #000; color: #d9d0b6; font: 22px var(--text-font, monospace); padding: 30px; }
@media (orientation: portrait) { body.touch.playing #hh-rotate { display: flex; } }
`;

const LETTERS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

function press(code, key) {

    const o = { code, key: key || code, bubbles: true, cancelable: true };

    document.body.dispatchEvent(new KeyboardEvent("keydown", o));

    setTimeout(() => document.body.dispatchEvent(new KeyboardEvent("keyup", o)), 40);
}

export function initTouch(api) {

    // api: { player, interaction, pause }
    if (!IS_TOUCH) return;

    document.body.classList.add("touch");

    const st = document.createElement("style");

    st.textContent = CSS;

    document.head.appendChild(st);

    // meta: full screen, no zoom
    const vp = document.querySelector('meta[name="viewport"]');

    if (vp) vp.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover");

    const root = document.createElement("div");

    root.id = "hh-touch";

    root.innerHTML = `
        <div class="zone-look"></div>
        <div class="stick"><div class="knob"></div></div>
        <div class="btn act idle"><span class="lbl">ACT</span></div>
        <div class="btn jump">JUMP</div>
        <div class="btn run">RUN</div>
        <div class="btn sit">SIT</div>
        <div class="btn mini pause">&#10074;&#10074;<small>MENU</small></div>
        <div class="btn mini bag">&#127890;<small>BAG</small></div>
        <div class="btn mini light">&#128294;<small>LIGHT</small></div>
        <div class="btn mini bell">&#128276;<small>BELL</small></div>`;

    document.body.appendChild(root);

    const rot = document.createElement("div");

    rot.id = "hh-rotate";

    rot.innerHTML = "Turn your phone sideways<br>to play Heaven Hostel";

    document.body.appendChild(rot);

    const q = (s) => root.querySelector(s);

    // a phone thumb is not a keyboard: walk and run at a calm, normal pace
    api.player.speedScale = 0.62;

    // ------------------------------------------------ the stick
    const stick = q(".stick"), knob = q(".knob");

    let stickId = null, runLatch = false, runAuto = false;

    const setMove = (x, y) => {

        const k = api.player.keys;

        k.forward = y < -0.3;

        k.back = y > 0.3;

        k.left = x < -0.3;

        k.right = x > 0.3;

        runAuto = Math.hypot(x, y) > 0.92;

        k.run = runLatch || runAuto;
    };

    const stickMove = (e) => {

        const r = stick.getBoundingClientRect();

        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;

        let dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2);

        const m = Math.hypot(dx, dy);

        if (m > 1) { dx /= m; dy /= m; }

        knob.style.transform = "translate(" + (dx * r.width * 0.3) + "px," + (dy * r.height * 0.3) + "px)";

        setMove(dx, dy);
    };

    stick.addEventListener("pointerdown", (e) => { stickId = e.pointerId; stick.setPointerCapture(e.pointerId); stickMove(e); e.preventDefault(); });

    stick.addEventListener("pointermove", (e) => { if (e.pointerId === stickId) stickMove(e); });

    const stickEnd = (e) => {

        if (e.pointerId !== stickId) return;

        stickId = null;

        knob.style.transform = "";

        setMove(0, 0);
    };

    stick.addEventListener("pointerup", stickEnd);

    stick.addEventListener("pointercancel", stickEnd);

    // ------------------------------------------------ look round (right side)
    const look = q(".zone-look");

    let lookId = null, lx = 0, ly = 0;

    look.addEventListener("pointerdown", (e) => { lookId = e.pointerId; lx = e.clientX; ly = e.clientY; look.setPointerCapture(e.pointerId); e.preventDefault(); });

    look.addEventListener("pointermove", (e) => {

        if (e.pointerId !== lookId) return;

        api.player.lookBy((e.clientX - lx) * 1.7, (e.clientY - ly) * 1.7);

        lx = e.clientX;

        ly = e.clientY;
    });

    const lookEnd = (e) => { if (e.pointerId === lookId) lookId = null; };

    look.addEventListener("pointerup", lookEnd);

    look.addEventListener("pointercancel", lookEnd);

    // ------------------------------------------------ buttons
    const tap = (sel, fn) => {

        const el = q(sel);

        el.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); fn(el); });
    };

    tap(".act", () => api.interaction.interact("E"));

    tap(".sit", () => api.interaction.interact("C"));

    tap(".jump", () => { api.player.keys.jump = true; setTimeout(() => { api.player.keys.jump = false; }, 140); });

    tap(".run", (el) => { runLatch = !runLatch; el.classList.toggle("hold", runLatch); api.player.keys.run = runLatch || runAuto; });

    tap(".light", () => press("KeyF", "f"));

    tap(".bag", () => press("KeyB", "b"));

    tap(".bell", () => press("KeyH", "h"));

    tap(".pause", () => api.pause());

    // ------------------------------------------------ the small keypad
    // (it only shows the keys the open note / pickup / puzzle needs)
    const pad = document.createElement("div");

    pad.id = "hh-pad";

    const btns = [];

    const row = () => { const r = document.createElement("div"); r.className = "r"; pad.appendChild(r); return r; };

    const key = (r, label, code, k, cls, grp) => {

        const b = document.createElement("button");

        b.textContent = label;

        if (cls) b.className = cls;

        b.dataset.g = grp;

        b.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); press(code, k); });

        r.appendChild(b);

        btns.push(b);

        return b;
    };

    const rBig = row();      // KEEP IN BAG / PUT BACK / CLOSE
    key(rBig, "KEEP IN BAG", "KeyE", "e", "big keep", "keep");
    key(rBig, "PUT BACK", "KeyQ", "q", "big", "put");
    key(rBig, "CLOSE", "KeyQ", "q", "big", "close");

    const r0 = row();
    for (let i = 1; i <= 9; i++) key(r0, String(i), "Digit" + i, String(i), "", "d");
    key(r0, "0", "Digit0", "0", "", "d");

    const rl = LETTERS.map((ln) => {
        const r = row();
        for (const ch of ln) key(r, ch, "Key" + ch, ch.toLowerCase(), "", "l");
        return r;
    });

    const r4 = row();
    key(r4, "\u25C0", "ArrowLeft", "ArrowLeft", "", "arrows");
    key(r4, "\u25B6", "ArrowRight", "ArrowRight", "", "arrows");
    key(r4, "\u25B2", "ArrowUp", "ArrowUp", "", "arrows");
    key(r4, "\u25BC", "ArrowDown", "ArrowDown", "", "arrows");
    key(r4, "DEL", "Backspace", "Backspace", "w", "del");
    key(r4, "OK", "Enter", "Enter", "w go", "go");
    key(r4, "X", "KeyQ", "q", "w", "pclose");

    document.body.appendChild(pad);

    const rows = [...pad.querySelectorAll(".r")];

    let lastSig = "";

    const setPad = (groups) => {

        const sig = groups.join(",");

        if (sig === lastSig) return;

        lastSig = sig;

        for (const b of btns) b.style.display = groups.includes(b.dataset.g) ? "" : "none";

        for (const r of rows) r.classList.toggle("off", ![...r.children].some((b) => b.style.display !== "none"));
    };

    const padGroups = () => {

        const m = inventory.mode;

        if (m === "pickup") return ["keep", "put"];

        if (m === "view") return ["close"];

        if (m === "bag") return ["d", "arrows", "close"];

        const p = document.body.dataset.puz || "";

        if (p === "digits") return ["d", "del", "go", "pclose"];

        if (p === "letters" || p === "switch") return ["l", "del", "go", "pclose"];

        if (p === "arrows") return ["arrows", "go", "pclose"];

        return ["d", "l", "arrows", "del", "go", "pclose"];
    };

    // ------------------------------------------------ first tap: full screen + landscape
    let fsTried = false;

    document.addEventListener("pointerdown", () => {

        if (fsTried || !document.body.classList.contains("playing")) return;

        fsTried = true;

        try {

            const el = document.documentElement;

            const go = el.requestFullscreen || el.webkitRequestFullscreen;

            if (go) {

                const p = go.call(el);

                if (p && p.then) p.then(() => { try { screen.orientation.lock("landscape").catch(() => {}); } catch (e) { /* ignore */ } }).catch(() => {});
            }
        }
        catch (e) { /* ignore */ }
    }, true);

    // ------------------------------------------------ show / hide + the ACT button's name
    const actBtn = q(".act"), actLbl = q(".act .lbl");

    const NAMES = [
        [/open/i, "OPEN"], [/close|shut/i, "CLOSE"], [/climb|ladder|stairs/i, "CLIMB"], [/hide|enter the/i, "HIDE"],
        [/search/i, "SEARCH"], [/unlock|key/i, "UNLOCK"], [/pick|take|grab/i, "TAKE"], [/put|place|lay|fit/i, "PUT"],
        [/pull|lever|switch/i, "PULL"], [/light|candle/i, "LIGHT"], [/read|look|examine/i, "LOOK"], [/ring|bell/i, "RING"],
        [/go through|go in|go back|leave/i, "GO"], [/smash|break/i, "SMASH"], [/swing|ride/i, "RIDE"], [/cut/i, "CUT"], [/tune|radio/i, "TUNE"]
    ];

    const nameFor = (t) => { for (const [re, n] of NAMES) if (re.test(t)) return n; return "USE"; };

    const hint = document.getElementById("interactionMessage");

    let lastLbl = "";

    setInterval(() => {

        const playing = document.body.classList.contains("playing");

        const reading = !!inventory.reading;

        root.classList.toggle("on", playing && !reading);

        // (the story screens are tapped, they do not need the keypad)
        const showPad = playing && reading && !story.busy;

        if (showPad) setPad(padGroups());

        pad.classList.toggle("on", showPad);

        // ACT says what it will do
        if (playing && !reading) {

            const aim = hint && hint.style.display !== "none" ? (hint.textContent || "") : "";

            const lbl = aim ? nameFor(aim.replace(/^.*?(Tap ACT)/i, "").replace(/^[^A-Za-z]+/, "")) : "ACT";

            if (lbl !== lastLbl) { lastLbl = lbl; actLbl.textContent = lbl; actBtn.classList.toggle("idle", !aim); }
        }

        // letting go of everything when a note/puzzle opens
        if (reading) { const k = api.player.keys; for (const n in k) k[n] = false; knob.style.transform = ""; }
    }, 100);
}
