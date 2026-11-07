import { inventory } from "./inventory.js";
import { events } from "./events.js";

// ======================================================
// ONLINE  (optional)  -  works only when the Flask server in /backend serves the game
//
//   - a guest account is made for you automatically (no password needed)
//   - your progress is saved to the server after every puzzle  (cloud save)
//   - when you finish the game your time goes on the LEADERBOARD
//
// Console commands (F12):
//   hhLeaderboard()            show the fastest escapes
//   hhRegister("name","pass")  make a real account        hhLogin("name","pass")  log in
//   hhLoad()                   load your cloud save into this browser (then reload the page)
//
// On a static host (no backend) everything here quietly does nothing.
// To use a server on another address:  <meta name="hh-api" content="https://your-server.onrender.com">
// ======================================================

const meta = document.querySelector('meta[name="hh-api"]');

const API = ((meta && meta.content) || "").replace(/\/$/, "");

let online = false;

let token = localStorage.getItem("hh_token") || "";

let deaths = Number(localStorage.getItem("hh_deaths") || 0);

async function call(method, path, body) {

    const r = await fetch(API + path, {
        method,
        headers: Object.assign({ "Content-Type": "application/json" }, token ? { Authorization: "Bearer " + token } : {}),
        body: body ? JSON.stringify(body) : undefined
    });

    let j = null;

    try { j = await r.json(); } catch (e) { /* no body */ }

    if (!r.ok) throw new Error((j && j.error) || ("HTTP " + r.status));

    return j;
}

async function ensureLogin() {

    if (!online) return false;

    if (token) {

        try { await call("GET", "/api/auth/me"); return true; } catch (e) { token = ""; }
    }

    try {

        const r = await call("POST", "/api/auth/guest", { name: localStorage.getItem("hh_name") || "" });

        token = r.token;

        localStorage.setItem("hh_token", token);

        localStorage.setItem("hh_name", r.username);

        return true;
    }
    catch (e) { return false; }
}

const fmt = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");

function panel(title, rows, foot) {

    let el = document.getElementById("hh-board");

    if (!el) {

        el = document.createElement("div");

        el.id = "hh-board";

        el.style.cssText = "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:1500;min-width:300px;max-width:92vw;padding:20px 26px;" +
            "background:rgba(8,6,6,.94);border:2px solid #a50f18;border-radius:10px;color:#e6dfcc;font:16px Georgia,serif;text-align:center;box-shadow:0 0 40px #000;";

        el.addEventListener("click", () => el.remove());

        document.body.appendChild(el);
    }

    el.innerHTML = "<div style='font-size:22px;color:#e01b24;letter-spacing:.12em;margin-bottom:10px'>" + title + "</div>" +
        rows.map((r) => "<div style='display:flex;justify-content:space-between;gap:24px;padding:3px 0;border-bottom:1px solid #2a2222'><span>" + r[0] + "</span><span>" + r[1] + "</span></div>").join("") +
        "<div style='margin-top:12px;font-size:12px;color:#8a8470'>" + (foot || "") + "  (tap to close)</div>";

    setTimeout(() => el.remove(), 20000);
}

async function board() {

    const j = await call("GET", "/api/game/leaderboard");

    panel("FASTEST ESCAPES", j.board.length ? j.board.map((b) => [b.rank + ".  " + b.name, fmt(b.seconds) + (b.deaths ? "  (" + b.deaths + " deaths)" : "")]) : [["Nobody has escaped yet", ""]], "");

    return j.board;
}

function puzzleCount() {

    return [...inventory.flags].filter((f) => /^pz_(drawer|cipher|book|fuse|radio|keys|rat|lever|candles)$/.test(f)).length;
}

async function pushProgress() {

    if (!(await ensureLogin())) return;

    try { await call("PUT", "/api/progress", { data: { flags: [...inventory.flags], items: [...inventory.items] }, puzzles: puzzleCount() }); }
    catch (e) { /* offline: ignore */ }
}

// ---------------------------------------------------- the game tells us what happens
events.on("game-begin", () => {

    localStorage.setItem("hh_t0", String(Date.now()));

    deaths = 0;

    localStorage.setItem("hh_deaths", "0");
});

events.on("player-died", () => { deaths++; localStorage.setItem("hh_deaths", String(deaths)); });

events.on("puzzle-solved", () => { pushProgress(); });

events.on("gameover-story", async () => {

    if (!online || !(await ensureLogin())) return;

    const t0 = Number(localStorage.getItem("hh_t0") || 0);

    const seconds = t0 ? Math.round((Date.now() - t0) / 1000) : 0;

    try {

        const r = await call("POST", "/api/game/score", { seconds, deaths });

        const b = await call("GET", "/api/game/leaderboard");

        panel("YOU ESCAPED", [["Your time", fmt(seconds)], ["Deaths", String(deaths)], ["Rank", "#" + r.rank]].concat(b.board.slice(0, 5).map((x) => [x.rank + ". " + x.name, fmt(x.seconds)])), "Heaven Hostel leaderboard");
    }
    catch (e) { /* too fast / offline: no score */ }
});

// ---------------------------------------------------- console helpers
window.hhLeaderboard = async () => { try { return await board(); } catch (e) { return "no server: " + e.message; } };

window.hhRegister = async (name, pass) => {

    const r = await call("POST", "/api/auth/register", { username: name, password: pass });

    token = r.token; localStorage.setItem("hh_token", token); localStorage.setItem("hh_name", r.username);

    await pushProgress();

    return "welcome, " + r.username;
};

window.hhLogin = async (name, pass) => {

    const r = await call("POST", "/api/auth/login", { username: name, password: pass });

    token = r.token; localStorage.setItem("hh_token", token); localStorage.setItem("hh_name", r.username);

    return "logged in as " + r.username + "  (hhLoad() brings your cloud save here)";
};

window.hhLoad = async () => {

    const r = await call("GET", "/api/progress");

    if (!r.data) return "no cloud save yet";

    localStorage.setItem("hh_items", JSON.stringify({ items: r.data.items || [], flags: r.data.flags || [] }));

    return "cloud save loaded (" + r.puzzles + " puzzles). Reload the page.";
};

// is there a server?
fetch(API + "/api/health").then((r) => r.ok ? r.json() : null).then((j) => { online = !!(j && j.ok); }).catch(() => { online = false; });
