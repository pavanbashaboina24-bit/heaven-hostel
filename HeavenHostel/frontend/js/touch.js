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
//   puzzles/notes: an on-screen keypad appears (letters, numbers, Enter,
//                  Backspace, arrows, Close) - it sends the same keys as a keyboard
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
body.touch { touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; overscroll-behavior: none; }
body.touch canvas { touch-action: none; }
#hh-touch { position: fixed; inset: 0; z-index: 800; pointer-events: none; display: none; font-family: var(--text-font, monospace); }
#hh-touch.on { display: block; }
#hh-touch .zone-look { position: absolute; top: 0; right: 0; width: 58%; height: 100%; pointer-events: auto; touch-action: none; }
#hh-touch .stick { position: absolute; left: max(4vmin, env(safe-area-inset-left)); bottom: max(5vmin, env(safe-area-inset-bottom)); width: 30vmin; height: 30vmin; max-width: 190px; max-height: 190px; min-width: 120px; min-height: 120px;
    border-radius: 50%; background: rgba(255,255,255,.07); border: 2px solid rgba(255,255,255,.25); pointer-events: auto; touch-action: none; }
#hh-touch .knob { position: absolute; left: 50%; top: 50%; width: 42%; height: 42%; margin: -21% 0 0 -21%; border-radius: 50%; background: rgba(224,27,36,.55); border: 2px solid rgba(255,255,255,.5); }
#hh-touch .btn { position: absolute; pointer-events: auto; touch-action: none; display: flex; align-items: center; justify-content: center; text-align: center;
    color: #fff; background: rgba(20,20,20,.55); border: 2px solid rgba(255,255,255,.35); border-radius: 50%; font-size: 13px; line-height: 1.05; letter-spacing: 1px; }
#hh-touch .btn:active, #hh-touch .btn.hold { background: rgba(224,27,36,.7); }
#hh-touch .act { right: max(5vmin, env(safe-area-inset-right)); bottom: max(8vmin, env(safe-area-inset-bottom)); width: 22vmin; height: 22vmin; max-width: 120px; max-height: 120px; min-width: 76px; min-height: 76px; font-size: 20px; background: rgba(165,15,24,.6); }
#hh-touch .jump { right: calc(max(5vmin, env(safe-area-inset-right)) + 24vmin); bottom: max(5vmin, env(safe-area-inset-bottom)); width: 15vmin; height: 15vmin; max-width: 82px; max-height: 82px; min-width: 56px; min-height: 56px; }
#hh-touch .run { right: max(5vmin, env(safe-area-inset-right)); bottom: calc(max(8vmin, env(safe-area-inset-bottom)) + 25vmin); width: 13vmin; height: 13vmin; max-width: 72px; max-height: 72px; min-width: 50px; min-height: 50px; }
#hh-touch .sit { right: calc(max(5vmin, env(safe-area-inset-right)) + 14vmin); bottom: calc(max(8vmin, env(safe-area-inset-bottom)) + 24vmin); width: 11vmin; height: 11vmin; max-width: 62px; max-height: 62px; min-width: 46px; min-height: 46px; }
#hh-touch .mini { width: 11vmin; height: 11vmin; max-width: 56px; max-height: 56px; min-width: 42px; min-height: 42px; font-size: 11px; }
#hh-touch .pause { top: max(2vmin, env(safe-area-inset-top)); right: max(2vmin, env(safe-area-inset-right)); }
#hh-touch .light { top: max(2vmin, env(safe-area-inset-top)); right: calc(max(2vmin, env(safe-area-inset-right)) + 13vmin); }
#hh-touch .bag { top: max(2vmin, env(safe-area-inset-top)); right: calc(max(2vmin, env(safe-area-inset-right)) + 26vmin); }
#hh-touch .bell { top: max(2vmin, env(safe-area-inset-top)); right: calc(max(2vmin, env(safe-area-inset-right)) + 39vmin); }
#hh-pad { position: fixed; left: 0; right: 0; bottom: 0; z-index: 810; display: none; padding: 6px 6px max(6px, env(safe-area-inset-bottom)); background: rgba(8,8,8,.92); border-top: 2px solid #a50f18; touch-action: none; }
#hh-pad.on { display: block; }
#hh-pad .r { display: flex; justify-content: center; gap: 4px; margin: 3px 0; }
#hh-pad button { flex: 1 1 0; max-width: 54px; min-width: 26px; height: 40px; border: 1px solid #555; border-radius: 6px; background: #1d1d1d; color: #eee; font: 600 15px var(--text-font, monospace); touch-action: manipulation; }
#hh-pad button.w { max-width: 96px; flex: 2 1 0; font-size: 12px; }
#hh-pad button.go { background: #a50f18; border-color: #e01b24; }
#hh-pad button:active { background: #e01b24; }
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
        <div class="btn act">ACT<br>(E)</div>
        <div class="btn jump">JUMP</div>
        <div class="btn run">RUN</div>
        <div class="btn sit">SIT<br>(C)</div>
        <div class="btn mini pause">II</div>
        <div class="btn mini light">LIGHT</div>
        <div class="btn mini bag">BAG</div>
        <div class="btn mini bell">BELL</div>`;

    document.body.appendChild(root);

    const rot = document.createElement("div");

    rot.id = "hh-rotate";

    rot.innerHTML = "Turn your phone sideways<br>to play Heaven Hostel";

    document.body.appendChild(rot);

    const q = (s) => root.querySelector(s);

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

    // ------------------------------------------------ the keypad (puzzles, notes, bag, story)
    const pad = document.createElement("div");

    pad.id = "hh-pad";

    const row = (cls) => { const r = document.createElement("div"); r.className = "r " + (cls || ""); pad.appendChild(r); return r; };

    const key = (r, label, code, k, cls) => {

        const b = document.createElement("button");

        b.textContent = label;

        if (cls) b.className = cls;

        b.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); press(code, k); });

        r.appendChild(b);
    };

    const r0 = row();

    for (let i = 1; i <= 9; i++) key(r0, String(i), "Digit" + i, String(i));

    key(r0, "0", "Digit0", "0");

    LETTERS.forEach((ln) => {

        const r = row();

        for (const ch of ln) key(r, ch, "Key" + ch, ch.toLowerCase());
    });

    const r4 = row();

    key(r4, "Close", "KeyQ", "q", "w");

    key(r4, "Keep", "KeyE", "e", "w");

    key(r4, "\u25C0", "ArrowLeft", "ArrowLeft");

    key(r4, "\u25B6", "ArrowRight", "ArrowRight");

    key(r4, "\u25B2", "ArrowUp", "ArrowUp");

    key(r4, "\u25BC", "ArrowDown", "ArrowDown");

    key(r4, "Del", "Backspace", "Backspace", "w");

    key(r4, "Enter", "Enter", "Enter", "w go");

    document.body.appendChild(pad);

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

    // ------------------------------------------------ show / hide
    setInterval(() => {

        const playing = document.body.classList.contains("playing");

        const reading = !!inventory.reading;

        root.classList.toggle("on", playing && !reading);

        // (the story screens are tapped, they do not need the keypad)
        pad.classList.toggle("on", playing && reading && !story.busy);

        // letting go of everything when a note/puzzle opens
        if (reading) { const k = api.player.keys; for (const n in k) k[n] = false; knob.style.transform = ""; }
    }, 120);
}
