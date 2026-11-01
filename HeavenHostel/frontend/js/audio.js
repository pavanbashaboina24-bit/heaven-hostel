// ======================================================
//  AUDIO  -  plays ONLY your own sound files
//
//  Put your files here:   frontend/assets/sounds/
//
//     footstep_1.mp3                      walking (2 sec, loops while you walk)
//     run.mp3                             running (2 sec, loops while you run)
//     stairs.mp3                          climbing the stairs (loops)
//     ladder.mp3                          climbing the ladder
//     door_open.mp3  door_close.mp3       every door and gate
//     door_locked.mp3                     (ready for locked doors)
//     cabinet_open.mp3  cabinet_close.mp3 hiding in a cabinet
//     flicker.mp3                         flashlight
//     heartbeat.mp3                       when hiding / running
//     glass_break.mp3                     now and then, inside
//
//  No sound is made by code any more (no wind, no drone,
//  no music, no generated effects).  If a file is missing,
//  that sound is just silent.
//
//  To add a sound later: put the file in the folder, add one
//  line to SAMPLE_FILES and use  this.play("name").
// ======================================================

import { events } from "./events.js";

//     NEW (horror sounds):
//     menu_click.mp3    every menu button (start menu, resume, back...)
//     door_voice.mp3    something behind the front door as you walk up
//     roam_1/2/3.mp3    eerie sounds now and then while you roam
//     ghost_near.mp3    the ghost comes near
//     ghost_hide.mp3    the ghost prowls while you hide
//     ghost_kill.mp3    the ghost kills you
const SAMPLE_DIR = "./assets/sounds/";

// ---- realistic one-shot sounds (made for this game, see assets/sounds/*.wav) ----
//   step_<surface>_1..6   one footstep       run_<surface>_1..4   one running step
//   surface = tile | concrete | metal | stairs | dirt
//   door_open_<room|main|gate>_1..2   door_close_<room|main|gate>_1..2
const SURFACES = ["tile", "concrete", "metal", "stairs", "dirt"];
const NEW_SAMPLES = {};
for (const sf of SURFACES) {
    for (let i = 1; i <= 6; i++) NEW_SAMPLES["step_" + sf + "_" + i] = "step_" + sf + "_" + i + ".wav";
    for (let i = 1; i <= 4; i++) NEW_SAMPLES["run_" + sf + "_" + i] = "run_" + sf + "_" + i + ".wav";
}
for (const k of ["room", "main", "gate"]) {
    for (let i = 1; i <= 2; i++) {
        NEW_SAMPLES["door_open_" + k + "_" + i] = "door_open_" + k + "_" + i + ".wav";
        NEW_SAMPLES["door_close_" + k + "_" + i] = "door_close_" + k + "_" + i + ".wav";
    }
}
for (const n of ["door_locked_new", "key_unlock", "lock_hit_1", "lock_hit_2", "lock_break",
    "paper_1", "paper_2", "paper_3", "puz_tick", "puz_thunk", "puz_wrong", "drawer",
    // new in v9: the old bell, a fall hitting the ground, a long scream, creaking wood, the roof wind
    "bell", "thud", "scream", "creak_1", "creak_2", "creak_3", "wind", "whisper_loop"]) {
    NEW_SAMPLES[n] = n + ".wav";
}

const SAMPLE_FILES = {
    footstep1: "footstep_1.mp3",
    run: "run.mp3",
    stairs: "stairs.mp3",
    ladder: "ladder.mp3",
    doorOpen: "door_open.mp3",
    doorClose: "door_close.mp3",
    doorLocked: "door_locked.mp3",
    cabinetOpen: "cabinet_open.mp3",
    cabinetClose: "cabinet_close.mp3",
    flicker: "flicker.mp3",
    glass: "glass_break.mp3",
    heartbeat: "heartbeat.mp3",
    menuClick: "menu_click.mp3",
    doorVoice: "door_voice.mp3",
    roam1: "roam_1.mp3",
    roam2: "roam_2.mp3",
    roam3: "roam_3.mp3",
    ghostNear: "ghost_near.mp3",
    ghostHide: "ghost_hide.mp3",
    ghostKill: "ghost_kill.mp3",
    // ---- ghost + menu (see ghosts.js) ----
    menuLoop: "menu_loop.mp3",       // the long low sound under every menu
    ropeScrape: "rope_scrape.mp3",   // rope dragged along the floor
    breath: "ghost_breath.mp3",      // his breathing
    growl: "ghost_growl.mp3",        // he has seen you / the end
    slam: "door_slam.mp3"            // the door that is shut behind you
};
Object.assign(SAMPLE_FILES, NEW_SAMPLES);

// How loud each file plays (1 = exactly as recorded).
// Make a number smaller to make that sound quieter.
const SAMPLE_VOL = {
    footstep: 2.2,      // walking (recorded quietly)
    run: 1.3,           // running
    stairs: 2.0,
    ladder: 0.6,
    door: 0.5,
    cabinet: 0.5,
    locked: 0.45,
    flicker: 0.6,       // flashlight flicker (your new quiet file)
    glass: 0.8,
    heartbeat: 0.75,
    menu: 0.9,          // every menu button
    doorVoice: 1.1,     // the sound behind the front door
    roam: 0.6,          // eerie sounds while roaming
    ghostNear: 1.0,
    ghostHide: 0.7,
    ghostKill: 1.1,
    menuLoop: 0.55,
    ropeScrape: 0.9,
    breath: 0.9,
    growl: 1.0,
    slam: 1.2
};

const rnd = (a, b) => a + Math.random() * (b - a);

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));


class AudioEngine {

    constructor() {

        this.ctx = null;

        this.ready = false;

        this.mode = "off";            // "menu" | "game" | "off"

        this.vol = { master: 0.85, music: 0.7, sfx: 0.9 };

        this.cam = null;

        this.hidden = false;

        this.paused = false;

        this.fear = 0;

        this.stepSide = 1;

        this.move = null;             // walking / running loop

        this.lastMoveStep = 0;

        this.samples = null;          // decoded sound files

        this.stairsPlay = null;

        this.stairsEnd = 0;

        this.lastStairStep = 0;

        this.heart = null;

        this.glassTimer = rnd(90, 180);

        this.onLightning = null;      // kept so other files still work
        // ---- horror sounds ----
        this.ghostFear = 0;           // set by the ghost: 0 far .. 1 on top of you
        this.menuLoopNode = null;     // the sound that never stops in the menus
        this.gw = null;               // the ghost's footsteps
        this.doorArmed = true;        // "behind the door" sound, once per approach
        this.roamTimer = rnd(25, 45); // next eerie sound while roaming
        this.hideTimer = rnd(5, 9);   // next prowl sound while hiding
        this.lastUi = 0;
        // The ghost code only has to announce itself:
        //   events.emit("ghost-near", { dist: 6 })   it is close
        //   events.emit("ghost-roam")                it prowls near your hiding place
        //   events.emit("ghost-kill")                it got you
        events.on("ghost-near", (d) => this.ghostNear(d && d.dist));
        events.on("ghost-roam", () => this.ghostRoam());
        events.on("ghost-kill", () => this.ghostKill());
    }


    // ==================================================
    // START  (must be called from a click)
    // ==================================================

    init() {

        if (this.ctx) {

            this.resume();

            return true;
        }

        const AC = window.AudioContext || window.webkitAudioContext;

        if (!AC) return false;

        try {

            const ctx = this.ctx = new AC();

            this.master = ctx.createGain();
            this.master.gain.value = this.vol.master;

            this.comp = ctx.createDynamicsCompressor();
            this.comp.threshold.value = -20;
            this.comp.knee.value = 24;
            this.comp.ratio.value = 6;
            this.comp.attack.value = 0.004;
            this.comp.release.value = 0.25;

            this.muffle = ctx.createBiquadFilter();
            this.muffle.type = "lowpass";
            this.muffle.frequency.value = 20000;

            this.pre = ctx.createGain();

            this.sfxBus = ctx.createGain();
            this.sfxBus.gain.value = this.vol.sfx;

            this.musicBus = ctx.createGain();
            this.musicBus.gain.value = this.vol.music;

            this.sfxBus.connect(this.pre);
            this.musicBus.connect(this.pre);

            this.pre.connect(this.muffle);
            this.muffle.connect(this.comp);
            this.comp.connect(this.master);
            this.master.connect(ctx.destination);

            // a little room echo (dark empty building)
            this.reverb = ctx.createConvolver();
            this.reverb.buffer = this.makeImpulse(3.2, 2.4);

            this.revSend = ctx.createGain();
            this.revSend.gain.value = 1;

            this.revReturn = ctx.createGain();
            this.revReturn.gain.value = 0.55;

            this.revSend.connect(this.reverb);
            this.reverb.connect(this.revReturn);
            this.revReturn.connect(this.pre);

            this.ready = true;
        }
        catch (e) {

            console.warn("Audio could not start:", e);

            this.ready = false;
        }

        this.resume();

        if (this.ready) this.loadSamples();

        return this.ready;
    }

    resume() {

        if (this.ctx && this.ctx.state === "suspended") {

            this.ctx.resume();
        }
    }

    makeImpulse(seconds, decay) {

        const ctx = this.ctx;

        const len = Math.floor(ctx.sampleRate * seconds);

        const buf = ctx.createBuffer(2, len, ctx.sampleRate);

        for (let c = 0; c < 2; c++) {

            const d = buf.getChannelData(c);

            for (let i = 0; i < len; i++) {

                d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
            }
        }

        return buf;
    }

    setVolumes(v) {

        Object.assign(this.vol, v);

        if (!this.ready) return;

        const t = this.ctx.currentTime;

        this.master.gain.setTargetAtTime(this.vol.master, t, 0.05);
        this.sfxBus.gain.setTargetAtTime(this.vol.sfx, t, 0.05);
        this.musicBus.gain.setTargetAtTime(this.vol.music, t, 0.05);
    }


    // ==================================================
    // YOUR SOUND FILES
    // ==================================================

    loadSamples() {

        if (this.samples || !this.ready) return;

        this.samples = {};

        for (const key in SAMPLE_FILES) {

            fetch(SAMPLE_DIR + SAMPLE_FILES[key])
                .then((r) => {

                    if (!r.ok) throw new Error(r.status);

                    return r.arrayBuffer();
                })
                .then((data) => new Promise((ok, fail) => {

                    this.ctx.decodeAudioData(data, ok, fail);
                }))
                .then((buf) => {

                    this.samples[key] = buf;
                })
                .catch(() => {

                    console.warn("Sound file not found:", SAMPLE_DIR + SAMPLE_FILES[key]);
                });
        }
    }

    sample(key) {

        return (this.samples && this.samples[key]) || null;
    }

    // plays one of your files; returns { src, gain } or null
    play(key, o) {

        const buf = this.sample(key);

        if (!buf || !this.ready) return null;

        o = o || {};

        const ctx = this.ctx;

        const t = ctx.currentTime + (o.t || 0);

        const vol = (o.vol === undefined ? 1 : Math.max(0.0001, o.vol)) *
            (o.ui ? this.vol.sfx : 1);

        const src = ctx.createBufferSource();

        src.buffer = buf;

        src.loop = !!o.loop;

        src.playbackRate.value = o.rate || 1;

        let node = src;

        if (o.lowpass) {

            const f = ctx.createBiquadFilter();

            f.type = "lowpass";

            f.frequency.value = o.lowpass;

            src.connect(f);

            node = f;
        }

        const g = ctx.createGain();

        g.gain.setValueAtTime(vol, t);

        if (o.fadeAt) {

            const len = o.fadeLen || 0.1;

            g.gain.setValueAtTime(vol, t + o.fadeAt);

            g.gain.linearRampToValueAtTime(0.0001, t + o.fadeAt + len);

            src.start(t);

            src.stop(t + o.fadeAt + len + 0.05);
        }
        else {

            src.start(t);
        }

        node.connect(g);

        // ui sounds skip the pause "muffle" so menus always sound clear
        g.connect(this.route(o.ui ? this.comp : this.sfxBus, o.pan, o.send, 1));

        return { src, gain: g };
    }

    // returns an input gain that leads (panned) to the bus + echo
    route(bus, pan, send, vol) {

        const ctx = this.ctx;

        const g = ctx.createGain();

        g.gain.value = vol === undefined ? 1 : vol;

        let last = g;

        if (pan && ctx.createStereoPanner) {

            const p = ctx.createStereoPanner();

            p.pan.value = clamp(pan, -1, 1);

            last.connect(p);

            last = p;
        }

        last.connect(bus);

        if (send > 0) {

            const s = ctx.createGain();

            s.gain.value = send;

            last.connect(s);

            s.connect(this.revSend);
        }

        return g;
    }

    spatial(x, y, z) {

        const cam = this.cam;

        if (!cam) return { gain: 1, pan: 0 };

        const dx = x - cam.position.x;
        const dz = z - cam.position.z;
        const dy = y - cam.position.y;

        const dist = Math.max(0.5, Math.hypot(dx, dz));

        const yaw = cam.rotation.y;

        const side = (dx * Math.cos(yaw) + dz * -Math.sin(yaw)) / dist;

        let gain = 1 / (1 + dist * 0.16);

        if (Math.abs(dy) > 3) gain *= 0.55;

        return { gain, pan: clamp(side * 0.85, -1, 1) };
    }

    // a random place around the listener
    around(minD, maxD) {

        const a = rnd(0, Math.PI * 2);

        const d = rnd(minD, maxD);

        return {
            pan: Math.sin(a) * 0.9,
            gain: 1 / (1 + d * 0.11)
        };
    }


    // ==================================================
    // MODES
    // ==================================================

    setMode(mode) {

        if (!this.ready) {

            this.mode = mode;

            return;
        }

        if (mode === this.mode) return;

        this.stopHeart();

        this.stopStairs();

        this.stopMove();

        this.stopGhostWalk();

        // the menu sound goes on until the game really starts
        if (mode !== "menu") this.stopMenuLoop(mode === "game" ? 0.2 : 0.6);

        this.mode = mode;

        this.hidden = false;

        this.setMuffle(false);

        if (mode === "game") {
            this.glassTimer = rnd(90, 180);
            this.roamTimer = rnd(20, 40);
            this.hideTimer = rnd(5, 9);
        }
    }

    setPaused(p) {

        this.paused = p;

        if (!this.ready) return;

        if (p) {

            this.stopStairs();

            this.stopMove();

            this.stopGhostWalk();
        }

        this.setMuffle(p || this.hidden);
    }

    setMuffle(on) {

        if (!this.ready) return;

        this.muffle.frequency.setTargetAtTime(
            on ? 420 : 20000, this.ctx.currentTime, on ? 0.12 : 0.3
        );
    }

    surface(pos, onStairs) {

        if (onStairs) return "stairs";

        if (Math.abs(pos.x) > 15 || Math.abs(pos.z) > 15) return "dirt";

        if (pos.y > 12.5) {

            return (pos.x > 11.5 && Math.abs(pos.z) < 4) ? "metal" : "concrete";
        }

        return "tile";
    }


    // ==================================================
    // UI + STORY  (no files for these -> silent)
    // ==================================================

    uiHover() { }

    uiClick() {
        // start menu -> any menu, Resume, Back ... all use this sound
        this.menuSound(1);
    }

    uiBack() {
        this.menuSound(0.88);
    }

    menuSound(rate) {
        if (!this.ready) return;
        const now = this.ctx.currentTime;
        if (now - this.lastUi < 0.12) return;      // no pile-ups
        this.lastUi = now;
        this.play("menuClick", {
            vol: SAMPLE_VOL.menu, rate, send: 0.15, ui: true
        });
    }

    // ==================================================
    // HORROR SOUNDS
    // ==================================================

    // walking up from the gate: a sound from the OTHER SIDE of the door
    doorVoice() {
        if (!this.ready) return;
        // the front door is at x 15.25; the sound comes from inside
        const s = this.spatial(13.2, 1.6, 0);
        this.play("doorVoice", {
            vol: SAMPLE_VOL.doorVoice * (0.55 + s.gain),
            pan: s.pan, send: 0.55, lowpass: 1400
        });
    }

    // one of the eerie sounds, somewhere around you
    roamSound() {
        if (!this.ready) return;
        const key = ["roam1", "roam2", "roam3"][Math.floor(Math.random() * 3)];
        const p = this.around(7, 16);
        this.play(key, {
            vol: SAMPLE_VOL.roam * (0.5 + p.gain),
            pan: p.pan, send: 0.5, lowpass: 6000
        });
    }

    // the ghost is close (dist in metres, closer = louder)
    ghostNear(dist) {
        if (!this.ready) return;
        const d = dist === undefined ? 6 : dist;
        const closeness = clamp(1.15 - d / 18, 0.25, 1);
        this.play("ghostNear", {
            vol: SAMPLE_VOL.ghostNear * closeness, send: 0.35
        });
    }

    // the ghost prowls near your hiding place (muffled by the cupboard)
    ghostRoam() {
        if (!this.ready) return;
        const p = this.around(2, 5);
        this.play("ghostHide", {
            vol: SAMPLE_VOL.ghostHide * (0.6 + p.gain),
            pan: p.pan, send: 0.3, lowpass: 1600
        });
    }

    // the ghost kills you
    ghostKill() {
        if (!this.ready) return;
        this.stopMove();
        this.stopStairs();
        this.play("ghostKill", {
            vol: SAMPLE_VOL.ghostKill, send: 0.3, ui: true
        });
    }

    achievement() { }

    whisper() { }

    stinger() { }

    updateMenu() {

        // the same low sound from the first screen until the game starts
        if (!this.ready || this.mode !== "menu") return;

        if (this.menuLoopNode) return;

        const p = this.play("menuLoop", {
            loop: true, vol: 0.0001, ui: true, send: 0.2
        });

        if (!p) return;

        const t = this.ctx.currentTime;

        p.gain.gain.cancelScheduledValues(t);

        p.gain.gain.setValueAtTime(0.0001, t);

        p.gain.gain.setTargetAtTime(SAMPLE_VOL.menuLoop * this.vol.sfx, t, 0.9);

        this.menuLoopNode = p;
    }

    stopMenuLoop(fade) {

        const p = this.menuLoopNode;

        if (!p) return;

        this.menuLoopNode = null;

        const t = this.ctx.currentTime;

        p.gain.gain.cancelScheduledValues(t);

        p.gain.gain.setTargetAtTime(0.0001, t, (fade || 1) / 3);

        try { p.src.stop(t + (fade || 1) + 0.6); } catch (e) { /* stopped */ }
    }

    // ==================================================
    // THE GHOST'S SOUNDS
    // ==================================================
    spatialPan(x, y, z) {
        return this.spatial(x, y, z).pan;
    }

    // a positional sound from the ghost (missing files are simply silent)
    ghostSfx(key, x, y, z, vol) {

        if (!this.ready || this.mode !== "game") return;

        const s = this.spatial(x, y, z);

        const v = (vol === undefined ? 1 : vol) * (SAMPLE_VOL[key] || 1);

        this.play(key, {
            vol: v * (0.25 + s.gain * 1.1),
            pan: s.pan, send: 0.35,
            lowpass: s.gain < 0.4 ? 2600 : 0
        });
    }

    // the "hide now!" warning (level 0..1: faint -> urgent)
    ghostWarn(level, pan) {

        if (!this.ready || this.mode !== "game") return;

        const l = Math.max(0, Math.min(1, level));

        this.play("ghostNear", {
            vol: SAMPLE_VOL.ghostNear * (0.3 + 0.75 * l),
            pan: pan || 0, send: 0.3,
            rate: 0.92 + 0.14 * l
        });
    }

    // the ghost's footsteps: a heavy step every few tenths of a second,
    // louder / duller with distance, faster when he runs
    ghostWalk(x, y, z, speed, run) {

        if (!this.ready || this.mode !== "game") return;

        const now = this.ctx.currentTime;

        if (speed <= 0.15) { this.gwNext = 0; return; }

        const gap = clamp(1.05 / (0.5 + speed * 0.62), run ? 0.2 : 0.36, 0.9);

        if (!this.gwNext) this.gwNext = now + 0.05;

        if (now < this.gwNext) return;

        this.gwNext = now + gap;

        const s = this.spatial(x, y, z);

        const key = (run ? "run_" : "step_") + (y > 12.5 ? "concrete" : "tile") + "_" + (1 + Math.floor(Math.random() * (run ? 4 : 6)));

        this.play(key, {
            vol: (0.25 + s.gain * 1.5) * (run ? 1.0 : 0.9),
            pan: s.pan, rate: run ? 0.82 : 0.74 + Math.random() * 0.05,
            lowpass: 700 + s.gain * 2600, send: 0.25
        });
    }

    stopGhostWalk() {

        const w = this.gw;

        if (!w) return;

        this.gw = null;

        const t = this.ctx.currentTime;

        w.gain.gain.cancelScheduledValues(t);

        w.gain.gain.setTargetAtTime(0.0001, t, 0.05);

        try { w.src.stop(t + 0.4); } catch (e) { /* stopped */ }
    }


    // ==================================================
    // SOUNDS
    // ==================================================

    flashlightClick() {

        this.play("flicker", { vol: SAMPLE_VOL.flicker });
    }

    glassBreak() {

        if (!this.ready) return;

        const p = this.around(4, 10);

        this.play("glass", {
            vol: SAMPLE_VOL.glass * (0.5 + p.gain), pan: p.pan, send: 0.5
        });
    }


    // called once for EVERY step of the walk cycle (player.onStep).
    // Every step is a separate recorded-style hit, a different variant each
    // time, so it sounds like shoes on the real floor instead of a loop.
    footstep(surface, running) {

        if (!this.ready || this.mode !== "game") return;

        const sf = SURFACES.includes(surface) ? surface : "tile";

        const n = 1 + Math.floor(Math.random() * (running ? 4 : 6));

        // never the same variant twice in a row
        let key = (running ? "run_" : "step_") + sf + "_" + n;

        if (key === this.lastStepKey) {

            key = (running ? "run_" : "step_") + sf + "_" + (1 + (n % (running ? 4 : 6)));
        }

        this.lastStepKey = key;

        if (!this.sample(key)) return;

        const vol = sf === "stairs" ? 0.95 : sf === "dirt" ? 0.8 : 0.85;

        this.play(key, {
            vol: vol * (running ? 1.1 : 0.9) * (0.88 + Math.random() * 0.24),
            rate: 0.95 + Math.random() * 0.1,
            send: 0.12
        });
    }

    stopMove() {

        if (!this.move) return;

        const t = this.ctx.currentTime;

        const m = this.move;

        this.move = null;

        m.gain.gain.cancelScheduledValues(t);

        m.gain.gain.setTargetAtTime(0.0001, t, 0.05);

        try { m.src.stop(t + 0.4); } catch (e) { /* already stopped */ }
    }

    // stairs.mp3 loops while the player keeps climbing
    stairsStep() {

        return;
        if (!this.sample("stairs")) return;

        this.lastStairStep = this.ctx.currentTime;

        if (this.stairsPlay) return;

        this.stairsPlay = this.play("stairs", {
            loop: true, vol: SAMPLE_VOL.stairs
        });
    }

    stopStairs() {

        if (!this.stairsPlay) return;

        const t = this.ctx.currentTime;

        const p = this.stairsPlay;

        this.stairsPlay = null;

        p.gain.gain.cancelScheduledValues(t);

        p.gain.gain.setTargetAtTime(0.0001, t, 0.05);

        try { p.src.stop(t + 0.4); } catch (e) { /* already stopped */ }
    }

    // every door and gate: x, y, z = where the door is
    door(kind, x, y, z, opening) {

        if (!this.ready || this.mode !== "game") return;

        const s = this.spatial(x, y, z);

        const set = kind === "gate" ? "gate" : kind === "main" ? "main" : "room";

        const key = "door_" + (opening ? "open_" : "close_") + set + "_" + (1 + Math.floor(Math.random() * 2));

        this.play(key, {
            vol: (opening ? 0.95 : 1.05) * (0.35 + s.gain),
            pan: s.pan, send: 0.1, rate: 0.97 + Math.random() * 0.06,
            lowpass: s.gain < 0.35 ? 2600 : undefined
        });
    }

    // locked door / gate: the handle rattles
    doorLocked() {

        if (!this.ready) return;

        if (!this.play("door_locked_new", { vol: 0.95, send: 0.1 })) {

            this.play("doorLocked", { vol: SAMPLE_VOL.locked, send: 0.2 });
        }
    }

    keyUnlock() { if (this.ready) this.play("key_unlock", { vol: 0.9, send: 0.1 }); }

    // stone on the gate lock: n = 1, 2 (hits) or 3 (it breaks)
    lockHit(n) {

        if (!this.ready) return;

        this.play(n >= 3 ? "lock_break" : "lock_hit_" + n, { vol: n >= 3 ? 1.2 : 1.0, send: 0.15 });
    }

    paper() { if (this.ready) this.play("paper_" + (1 + Math.floor(Math.random() * 3)), { vol: 0.8 }); }

    puzzle(kind) {

        if (!this.ready) return;

        const k = { tick: "puz_tick", thunk: "puz_thunk", wrong: "puz_wrong", drawer: "drawer" }[kind];

        if (k) this.play(k, { vol: kind === "tick" ? 0.8 : 1.0, send: 0.08 });
    }

    ladder() {

        if (!this.ready) return;

        // deeper and softer (it sounded too light / childish)
        this.play("ladder", {
            vol: SAMPLE_VOL.ladder * 0.8, t: 0.3, send: 0.2,
            rate: 0.78, lowpass: 3200
        });
    }

    setHidden(h) {

        if (!this.ready) return;

        this.hidden = h;

        this.setMuffle(h || this.paused);

        // cabinet: opens, and shuts behind you when you hide
        this.play("cabinetOpen", { vol: SAMPLE_VOL.cabinet, send: 0.2 });

        if (h) {

            this.play("cabinetClose", {
                t: 1.1, vol: SAMPLE_VOL.cabinet * 1.1, send: 0.2
            });
        }
    }

    // heartbeat.mp3 loops; louder + faster the more scared you are
    heartLoop() {

        if (!this.heart) {

            this.heart = this.play("heartbeat", { loop: true, vol: 0.0001 });
        }

        if (!this.heart) return;

        const t = this.ctx.currentTime;

        this.heart.gain.gain.setTargetAtTime(
            SAMPLE_VOL.heartbeat * (0.25 + 0.75 * this.fear), t, 0.15
        );

        this.heart.src.playbackRate.setTargetAtTime(
            0.85 + 0.5 * this.fear, t, 0.2
        );
    }

    stopHeart() {

        if (!this.heart) return;

        const t = this.ctx.currentTime;

        const h = this.heart;

        this.heart = null;

        h.gain.gain.cancelScheduledValues(t);

        h.gain.gain.setTargetAtTime(0.0001, t, 0.15);

        try { h.src.stop(t + 0.8); } catch (e) { /* already stopped */ }
    }


    // ==================================================
    // EVERY FRAME (game)
    // ==================================================

    update(dt, camera, zone, p) {

        if (!this.ready || this.mode !== "game") return;

        this.cam = camera;

        // ---------- fear -> heartbeat ----------
        const moving = p && p.keys &&
            (p.keys.forward || p.keys.back || p.keys.left || p.keys.right);

        const running = !!(p && !p.hidden && p.keys && p.keys.run && moving);

        // sitting / sleeping is calm: only real hiding raises the heartbeat
        const hidden = !!(p && p.hidden && !(p.hideSpot && p.hideSpot.rest));

        const target = Math.max(
            hidden ? 1.0 : (running ? 0.8 : 0),
            this.ghostFear || 0
        );

        this.fear += (target - this.fear) *
            Math.min(1, (target > this.fear ? 1.3 : 0.22) * dt);

        if (this.fear > 0.07) this.heartLoop();
        else this.stopHeart();

        // ---------- walk / run / stairs loops stop when the player stops ----------
        const now = this.ctx.currentTime;

        if (this.stairsPlay && now - this.lastStairStep > 0.6) {

            this.stopStairs();
        }

        if (this.move && now - this.lastMoveStep > 0.5) {

            this.stopMove();
        }

        // ---------- walking from the gate toward the door ----------
        if (p && p.pos) {
            const px = p.pos.x;
            const pz = p.pos.z;
            if (px > 28) {
                this.doorArmed = true;                 // outside again: re-arm
            }
            else if (this.doorArmed && px < 24.5 && px > 17 &&
                     Math.abs(pz) < 7 && !this.paused) {
                this.doorArmed = false;
                this.doorVoice();
            }
        }
        // ---------- eerie sounds while roaming ----------
        if (!this.paused && !hidden) {
            this.roamTimer -= dt;
            if (this.roamTimer <= 0) {
                this.roamTimer = rnd(30, 65);
                this.roamSound();
            }
        }
        // ---------- something prowls while you hide ----------
        if (hidden && !this.paused) {
            this.hideTimer -= dt;
            if (this.hideTimer <= 0) {
                this.hideTimer = rnd(8, 15);
                this.ghostRoam();
            }
        }
        else {
            this.hideTimer = Math.max(this.hideTimer, 4);
        }
        // ---------- now and then, glass breaks somewhere inside ----------
        const inside = zone !== "Y" && zone !== "T";

        this.glassTimer -= dt;

        if (this.glassTimer <= 0 && !this.paused) {

            this.glassTimer = rnd(90, 180);

            if (inside) this.glassBreak();
        }
    }
}

export const audio = new AudioEngine();