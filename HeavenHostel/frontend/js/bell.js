import { inventory } from "./inventory.js";
import { events } from "./events.js";

// ======================================================
// THE OLD BRASS BELL  -  "I give up"
//
// You start the game with it in your bag.  Press H (or the BELL button on a
// phone, twice to be sure) to ring it: the ghost hears it, comes for you wherever you are,
// screams, and the run ends.  (main.js does the ringing, ghosts.summon()
// the coming.)  Nothing else happens to you: it only calls the ghost.
// ======================================================

inventory.define("bell", { name: "Old brass bell", kind: "thing", icon: "\uD83D\uDD14", text: "" });

// every new game starts with the bell
inventory.resetHooks.push(() => { inventory.add("bell"); });

if (!inventory.has("bell")) inventory.add("bell");

let armed = 0;

window.addEventListener("keydown", (e) => {

    if (e.code !== "KeyH" || e.repeat) return;

    if (!document.body.classList.contains("playing") || inventory.reading) return;

    const now = performance.now();

    // asked twice, so that it can never be rung by accident
    if (now - armed < 4000) {

        armed = 0;

        events.emit("ring-bell");
    }
    else {

        armed = now;

        inventory.say("Ring the old bell? The ghost will come for you and the run ends.\nPress H again to ring it.", 4);
    }
});
