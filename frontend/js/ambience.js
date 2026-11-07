import { audio } from "./audio.js";
import { frameHooks, getPlayer } from "./haunted.js";

// ======================================================
// PLACE SOUNDS
//   the roof wind on the terrace and on the back stairs (assets/sounds/wind.wav)
//   whispers in Ramu's secret room                       (assets/sounds/whisper_loop.wav)
// They fade in and out softly as you walk in and out of those places.
// ======================================================

const loops = { wind: null, whisper_loop: null };

const want = { wind: 0, whisper_loop: 0 };

const LEVEL = { wind: 0.5, whisper_loop: 0.35 };

function ensure(name) {

    if (loops[name]) return loops[name];

    if (!audio.ready) return null;

    const r = audio.play(name, { vol: 0.0001, loop: true, send: 0.15 });

    if (r) loops[name] = r;

    return loops[name];
}

let acc = 0;

frameHooks.push((t, dt) => {

    acc += dt;

    if (acc < 0.25) return;

    acc = 0;

    const p = getPlayer();

    if (!p || !audio.ready) return;

    const feet = p.pos.y - 1.7;

    want.wind = (feet > 11.2 || (p.pos.x < -15.5 && feet > 1.5)) ? LEVEL.wind : 0;

    want.whisper_loop = feet < -20 ? LEVEL.whisper_loop : 0;

    for (const name of Object.keys(loops)) {

        if (want[name] > 0 && !loops[name]) ensure(name);

        const l = loops[name];

        if (l) l.gain.gain.setTargetAtTime(Math.max(0.0001, want[name]), audio.ctx.currentTime, 0.9);
    }
});
