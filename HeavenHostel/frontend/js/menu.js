import { audio } from "./audio.js";

import { events } from "./events.js";


// ======================================================
// MENUS, SETTINGS, ACHIEVEMENTS, STORY, PRACTICE, SAVE
// ======================================================

const $ = (id) => document.getElementById(id);

const SAVE_KEY = "haven_save_v1";

const ACH_KEY = "haven_ach_v1";

const STAT_KEY = "haven_stats_v1";

const SET_KEY = "haven_settings_v1";


export const settings = {
    sens: 1,
    shake: 1,
    bright: 1,
    quality: "high",
    master: 0.85,
    music: 0.7,
    sfx: 0.9
};


// ---------------- achievements ----------------

const ACHIEVEMENTS = [
    { id: "gate",    ic: "\u26E9", name: "The Gate Opens",     desc: "Push open the rusted gate." },
    { id: "enter",   ic: "\u{1F6AA}", name: "Unwelcome Guest",    desc: "Step inside Haven Hostel." },
    { id: "light",   ic: "\u{1F526}", name: "Let There Be Light", desc: "Switch your flashlight." },
    { id: "doors",   ic: "\u{1F5DD}", name: "Open Door Policy",   desc: "Open 10 doors." },
    { id: "hide",    ic: "\u{1F441}", name: "Hide & Pray",        desc: "Hide inside a cabinet." },
    { id: "run",     ic: "\u{1F3C3}", name: "Run For Your Life",  desc: "Run for 20 seconds in total." },
    { id: "walk",    ic: "\u{1F463}", name: "Wanderer",           desc: "Walk 500 metres." },
    { id: "floor3",  ic: "\u{1FA9C}", name: "Third Floor",        desc: "Reach the third floor." },
    { id: "terrace", ic: "\u{1F319}", name: "Under The Moon",     desc: "Reach the terrace." },
    { id: "room13",  ic: "\u{1F56F}", name: "The Thirteenth Room",desc: "Enter the room on the roof." },
    { id: "ladder",  ic: "\u{1FA9C}", name: "Eye Level",          desc: "Climb the ladder onto the roof." },
    { id: "grave",   ic: "\u271D",    name: "Rest In Peace",      desc: "Walk through the graveyard." },
    { id: "night",   ic: "\u{1F570}", name: "The Long Night",     desc: "Survive 10 minutes." }
];

let unlocked = {};

let stats = { run: 0, dist: 0, doors: 0, play: 0 };


// ---------------- story ----------------

const STORY = [
    { t: "Heaven Hostel.  A boys' hostel on a hill, at the edge of a quiet town." },
    { t: "A boy named Ramu lived here.  One night, he died in Room 204.  They say he took his own life." },
    { t: "It all started in that room." },
    { t: "After that, crying was heard in the empty room.  A week later, students began to go missing." },
    { t: "Some of them saw a thin figure in the corridors.  Within a month, the hostel was empty." },
    { t: "They say Ramu still walks its halls.  Nobody knows why." },
    { t: "You came to find out.", red: true }
];


// ======================================================
// MENU OBJECT
// ======================================================

export const menu = {

    hooks: null,

    current: "title",

    backTo: "title",

    sessionActive: false,

    practice: false,

    practiceDone: {},

    storyTimer: null,

    storyAbort: false,

    lastPos: null,

    saveTimer: 0,

    toastQueue: [],

    toastBusy: false,


    // ==================================================
    // START
    // ==================================================

    init(hooks) {

        this.hooks = hooks;

        loadAll();

        this.renderAchievements();

        this.bindSettings();

        this.bindClicks();

        initGrain();

        initRain();

        initEyes();

        audio.onLightning = () => this.flash();

        // sound can only start after the first click
        const wake = () => {

            audio.init();

            audio.setVolumes(settings);

            if (!this.sessionPlaying) audio.setMode("menu");

            if (hooks.onAudioReady) hooks.onAudioReady();
        };

        document.addEventListener("pointerdown", () => {

            if (!audio.ready) wake();
        });

        document.addEventListener("keydown", () => {

            if (!audio.ready) wake();
        });

        // button sounds
        document.addEventListener("mouseover", (e) => {

            if (e.target.closest && e.target.closest(".btn, .seg button")) {

                audio.uiHover();
            }
        });

        // achievements from game events
        events.on("gate", () => this.unlock("gate"));

        events.on("flashlight", () => this.unlock("light"));

        events.on("hide", () => {

            this.unlock("hide");

            this.practiceTick("hide");
        });

        events.on("ladder", () => {

            this.unlock("ladder");

            this.practiceTick("ladder");
        });

        events.on("door", () => {

            stats.doors++;

            if (stats.doors >= 10) this.unlock("doors");

            this.practiceTick("door");
        });

        events.on("flashlight", () => this.practiceTick("flash"));

        this.show("title");
    },


    // ==================================================
    // SCREENS
    // ==================================================

    show(name) {

        document.querySelectorAll(".screen").forEach((s) => {

            s.classList.remove("active");
        });

        const el = $("screen-" + name);

        if (el) el.classList.add("active");

        this.current = name;

        document.body.classList.remove("playing");

        // lets the stylesheet keep the pause screen clean and sharp
        document.body.dataset.screen = name;

        if (name === "menu") this.updateContinue();

        if (this.hooks && this.hooks.onMenuShown) this.hooks.onMenuShown(name);
    },

    hideAll() {

        document.querySelectorAll(".screen").forEach((s) => {

            s.classList.remove("active");
        });

        document.body.classList.add("playing");

        delete document.body.dataset.screen;
    },

    showPause() {

        this.show("pause");
    },

    updateContinue() {

        const b = $("btn-continue");

        if (this.sessionActive) {

            b.textContent = "Resume";

            b.disabled = false;
        }
        else {

            b.textContent = "Continue";

            b.disabled = !this.hasSave();
        }
    },


    // ==================================================
    // BUTTONS
    // ==================================================

    bindClicks() {

        document.addEventListener("click", (e) => {

            const btn = e.target.closest("[data-act]");

            if (!btn || btn.disabled) return;

            audio.uiClick();

            this.act(btn.getAttribute("data-act"));
        });
    },

    act(a) {

        const h = this.hooks;

        switch (a) {

            case "play":
                this.show("menu");
                break;

            case "ach-title":
                this.backTo = "title";
                this.showAchievements();
                break;

            case "ach-menu":
                this.backTo = "menu";
                this.showAchievements();
                break;

            case "ach-pause":
                this.backTo = "pause";
                this.showAchievements();
                break;

            case "settings-menu":
                this.backTo = "menu";
                this.showSettings();
                break;

            case "settings-pause":
                this.backTo = "pause";
                this.showSettings();
                break;

            case "back":
                saveSettings();
                this.show(this.backTo);
                break;

            case "to-title":
                this.show("title");
                break;

            case "to-menu":
                this.show("menu");
                break;

            case "continue":
                if (this.sessionActive) h.onResume();
                else h.onContinue(this.loadSave());
                break;

            case "new":
                this.show("choice");
                break;

            case "story-watch":
                this.startStory();
                break;

            case "story-skip":
            case "story-go":
                this.stopStory();
                h.onNew();
                break;

            case "practice":
                h.onPractice();
                break;

            case "resume":
                h.onResume();
                break;

            case "to-menu-save":
                h.onQuitToMenu();
                this.show("menu");
                break;
        }
    },


    // ==================================================
    // STORY
    // ==================================================

    startStory() {

        this.show("story");

        const box = $("story-text");

        box.innerHTML = "";

        $("story-go").style.display = "none";

        this.storyAbort = false;

        let pi = 0;

        const nextPara = () => {

            if (this.storyAbort) return;

            if (pi >= STORY.length) {

                $("story-go").style.display = "inline-block";

                return;
            }

            const item = STORY[pi];

            const p = document.createElement("p");

            if (item.red) p.className = "red";

            box.appendChild(p);

            const caret = document.createElement("span");

            caret.className = "caret";

            let ci = 0;

            if (pi === 2 || pi === 3) audio.whisper();

            if (item.red && pi === STORY.length - 1) audio.stinger();

            const type = () => {

                if (this.storyAbort) return;

                if (ci < item.t.length) {

                    ci++;

                    p.textContent = item.t.slice(0, ci);

                    p.appendChild(caret);

                    this.storyTimer = setTimeout(type, 30 + Math.random() * 30);
                }
                else {

                    caret.remove();

                    pi++;

                    this.storyTimer = setTimeout(nextPara, 1500);
                }
            };

            type();
        };

        nextPara();
    },

    stopStory() {

        this.storyAbort = true;

        clearTimeout(this.storyTimer);
    },


    // ==================================================
    // ACHIEVEMENTS
    // ==================================================

    renderAchievements() {

        const grid = $("ach-grid");

        grid.innerHTML = "";

        let n = 0;

        for (const a of ACHIEVEMENTS) {

            const got = !!unlocked[a.id];

            if (got) n++;

            const d = document.createElement("div");

            d.className = "ach" + (got ? " got" : "");

            d.innerHTML =
                "<div class='ic'>" + (got ? a.ic : "?") + "</div>" +
                "<div><b>" + (got ? a.name : "??????") + "</b><small>" +
                a.desc + "</small></div>";

            grid.appendChild(d);
        }

        $("ach-count").textContent =
            n + " / " + ACHIEVEMENTS.length + " UNLOCKED";
    },

    showAchievements() {

        this.renderAchievements();

        this.show("ach");
    },

    unlock(id) {

        if (unlocked[id]) return;

        const a = ACHIEVEMENTS.find((x) => x.id === id);

        if (!a) return;

        unlocked[id] = true;

        try {
            localStorage.setItem(ACH_KEY, JSON.stringify(unlocked));
        }
        catch (e) { /* private mode */ }

        this.toast(a.name, a.desc);

        audio.achievement();
    },

    toast(name, desc) {

        this.toastQueue.push([name, desc]);

        if (!this.toastBusy) this.nextToast();
    },

    nextToast() {

        const item = this.toastQueue.shift();

        if (!item) {

            this.toastBusy = false;

            return;
        }

        this.toastBusy = true;

        $("toast-name").textContent = item[0];

        $("toast-desc").textContent = item[1];

        const t = $("toast");

        t.classList.add("show");

        setTimeout(() => {

            t.classList.remove("show");

            setTimeout(() => this.nextToast(), 600);

        }, 4200);
    },


    // ==================================================
    // EVERY FRAME WHILE PLAYING
    // ==================================================

    tick(player, dt) {

        const p = player.pos;

        stats.play += dt;

        if (stats.play >= 600) this.unlock("night");

        const moving = player.keys.forward || player.keys.back ||
            player.keys.left || player.keys.right;

        if (moving && player.keys.run && !player.hidden && !player.anim) {

            stats.run += dt;

            this.practiceRun += dt;

            if (stats.run >= 20) this.unlock("run");

            if (this.practiceRun >= 2) this.practiceTick("run");
        }

        // distance walked
        if (this.lastPos && !player.anim && !player.hidden) {

            const d = Math.hypot(p.x - this.lastPos.x, p.z - this.lastPos.z);

            if (d < 1.5) {

                stats.dist += d;

                this.practiceDist += d;
            }
        }

        this.lastPos = { x: p.x, z: p.z };

        if (stats.dist >= 500) this.unlock("walk");

        if (this.practiceDist >= 4) this.practiceTick("walk");

        // where are we?
        if (Math.abs(p.x) < 14.6 && Math.abs(p.z) < 14.6 && p.y < 12) {

            this.unlock("enter");
        }

        if (p.y >= 8 && p.y < 12) this.unlock("floor3");

        if (p.y >= 4) this.practiceTick("stairs");

        if (!p.grounded && p.verticalVelocity > 1) this.practiceTick("jump");

        if (p.y >= 12) this.unlock("terrace");

        if (
            p.y >= 12 && p.y < 15.2 &&
            Math.abs(p.x) < 4 && p.z > -12.5 && p.z < -7.5
        ) {
            this.unlock("room13");
        }

        if (p.x < -17.5 && p.x > -24.5 && p.z > -17 && p.z < 7) {

            this.unlock("grave");
        }

        // look around (practice)
        if (this.lastYaw !== undefined) {

            this.practiceLook += Math.abs(player.yaw - this.lastYaw);

            if (this.practiceLook > 1.5) this.practiceTick("look");
        }

        this.lastYaw = player.yaw;

        // autosave every 5 seconds
        this.saveTimer += dt;

        if (this.saveTimer > 5) {

            this.saveTimer = 0;

            this.save(player);

            saveStats();
        }
    },


    // ==================================================
    // PRACTICE MODE
    // ==================================================

    startPractice() {

        this.practice = true;

        this.practiceDone = {};

        this.practiceRun = 0;

        this.practiceDist = 0;

        this.practiceLook = 0;

        this.lastYaw = undefined;

        const list = $("practice-list");

        list.innerHTML = "";

        const items = [
            ["look", "Look around (mouse)"],
            ["walk", "Walk (W A S D / arrows)"],
            ["run", "Run (hold Shift)"],
            ["jump", "Jump (Space)"],
            ["door", "Open a door (E)"],
            ["flash", "Flashlight on / off (F)"],
            ["hide", "Hide in a cabinet (E)"],
            ["stairs", "Climb the stairs up"],
            ["ladder", "Climb the terrace ladder"]
        ];

        for (const [id, text] of items) {

            const li = document.createElement("li");

            li.id = "pr-" + id;

            li.textContent = text;

            list.appendChild(li);
        }

        document.body.classList.add("practice");
    },

    stopPractice() {

        this.practice = false;

        document.body.classList.remove("practice");
    },

    practiceTick(id) {

        if (!this.practice || this.practiceDone[id]) return;

        this.practiceDone[id] = true;

        const li = $("pr-" + id);

        if (li) li.classList.add("done");

        const total = document.querySelectorAll("#practice-list li").length;

        if (Object.keys(this.practiceDone).length >= total) {

            this.toast("Practice complete", "You are as ready as you will ever be.");

            audio.achievement();
        }
    },


    // ==================================================
    // SAVE / LOAD
    // ==================================================

    hasSave() {

        try {
            return !!localStorage.getItem(SAVE_KEY);
        }
        catch (e) {
            return false;
        }
    },

    save(player) {

        if (this.practice || player.hidden || player.anim) return;

        try {

            localStorage.setItem(SAVE_KEY, JSON.stringify({
                x: player.pos.x,
                y: player.pos.y,
                z: player.pos.z,
                yaw: player.yaw
            }));
        }
        catch (e) { /* private mode */ }
    },

    loadSave() {

        try {
            return JSON.parse(localStorage.getItem(SAVE_KEY));
        }
        catch (e) {
            return null;
        }
    },


    // ==================================================
    // SETTINGS SCREEN
    // ==================================================

    bindSettings() {

        const slider = (id, key, fmt) => {

            const el = $("set-" + id);

            const out = $("val-" + id);

            const sync = () => {

                el.value = settings[key];

                out.textContent = fmt(settings[key]);
            };

            sync();

            el.addEventListener("input", () => {

                settings[key] = parseFloat(el.value);

                out.textContent = fmt(settings[key]);

                this.apply();
            });

            this["sync_" + id] = sync;
        };

        slider("sens", "sens", (v) => v.toFixed(2) + "x");

        slider("shake", "shake", (v) => v.toFixed(1) + "x");

        slider("bright", "bright", (v) => Math.round(v * 100) + "%");

        slider("master", "master", (v) => Math.round(v * 100) + "%");

        slider("music", "music", (v) => Math.round(v * 100) + "%");

        slider("sfx", "sfx", (v) => Math.round(v * 100) + "%");

        document.querySelectorAll("#set-quality button").forEach((b) => {

            b.addEventListener("click", () => {

                settings.quality = b.getAttribute("data-q");

                this.markQuality();

                this.apply();
            });
        });

        this.markQuality();

        this.apply();
    },

    markQuality() {

        document.querySelectorAll("#set-quality button").forEach((b) => {

            b.classList.toggle(
                "on", b.getAttribute("data-q") === settings.quality
            );
        });
    },

    showSettings() {

        for (const k of ["sens", "shake", "bright", "master", "music", "sfx"]) {

            if (this["sync_" + k]) this["sync_" + k]();
        }

        this.markQuality();

        this.show("settings");
    },

    apply() {

        audio.setVolumes({
            master: settings.master,
            music: settings.music,
            sfx: settings.sfx
        });

        if (this.hooks && this.hooks.onSettings) this.hooks.onSettings(settings);
    },


    // ==================================================
    // LIGHTNING
    // ==================================================

    flash() {

        const f = $("flash");

        f.classList.remove("go");

        void f.offsetWidth;

        f.classList.add("go");
    }
};


// ======================================================
// PERSISTENCE
// ======================================================

function loadAll() {

    try {

        const a = JSON.parse(localStorage.getItem(ACH_KEY));

        if (a) unlocked = a;

        const s = JSON.parse(localStorage.getItem(STAT_KEY));

        if (s) Object.assign(stats, s);

        const st = JSON.parse(localStorage.getItem(SET_KEY));

        if (st) Object.assign(settings, st);
    }
    catch (e) { /* first run / private mode */ }
}

function saveSettings() {

    try {
        localStorage.setItem(SET_KEY, JSON.stringify(settings));
    }
    catch (e) { /* ignore */ }
}

function saveStats() {

    try {
        localStorage.setItem(STAT_KEY, JSON.stringify(stats));
    }
    catch (e) { /* ignore */ }
}


// ======================================================
// BACKGROUND EFFECTS  (film grain, rain, eyes in the dark)
// ======================================================

function initGrain() {

    const c = $("grain");

    const g = c.getContext("2d");

    const img = g.createImageData(c.width, c.height);

    const draw = () => {

        for (let i = 0; i < img.data.length; i += 4) {

            const v = Math.random() * 255;

            img.data[i] = v;
            img.data[i + 1] = v;
            img.data[i + 2] = v;
            img.data[i + 3] = 255;
        }

        g.putImageData(img, 0, 0);
    };

    draw();

    setInterval(draw, 90);
}

function initRain() {

    const c = $("rain");

    const g = c.getContext("2d");

    const drops = [];

    const resize = () => {

        c.width = window.innerWidth;

        c.height = window.innerHeight;
    };

    resize();

    window.addEventListener("resize", resize);

    for (let i = 0; i < 160; i++) {

        drops.push({
            x: Math.random() * c.width,
            y: Math.random() * c.height,
            l: 10 + Math.random() * 22,
            v: 14 + Math.random() * 16
        });
    }

    const loop = () => {

        requestAnimationFrame(loop);

        if (document.body.classList.contains("playing")) return;

        g.clearRect(0, 0, c.width, c.height);

        g.strokeStyle = "rgba(170,185,215,0.35)";

        g.lineWidth = 1;

        g.beginPath();

        for (const d of drops) {

            g.moveTo(d.x, d.y);

            g.lineTo(d.x - d.l * 0.18, d.y + d.l);

            d.y += d.v;

            d.x -= d.v * 0.18;

            if (d.y > c.height) {

                d.y = -30;

                d.x = Math.random() * (c.width + 200);
            }
        }

        g.stroke();
    };

    loop();
}

function initEyes() {

    const eyes = document.querySelectorAll("#eyes i");

    const blink = () => {

        const e = eyes[Math.floor(Math.random() * eyes.length)];

        e.classList.remove("on");

        void e.offsetWidth;

        const side = Math.random() < 0.5;

        e.style.left = (side ? 2 + Math.random() * 12 : 84 + Math.random() * 12) + "%";

        e.style.top = (20 + Math.random() * 60) + "%";

        e.classList.add("on");

        setTimeout(blink, 5000 + Math.random() * 8000);
    };

    setTimeout(blink, 4000);
}