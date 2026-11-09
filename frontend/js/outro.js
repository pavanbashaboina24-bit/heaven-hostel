// ======================================================
// THE ENDING CINEMATIC
//
//   1. Ramu thanks you (mystery.js), then the screen fades.
//   2. DAWN.  You walk out of the hostel by yourself: through the front door, along the path and
//      out through the open gate.  At the gate you leave Ramu's letter on a stone.
//   3. A GIRL (Ramu's sister) comes up the road, finds the letter, picks it up and takes it home.
//   4. HOME.  A small house: the girl reads the letter to her mother and father.  They cry together.
//   5. THE END.
//
// It uses the real game camera and scene: the player is walked by script (keys are overridden every
// frame), the ghost is switched off, and the "home" is a little room built far below the map.
// ======================================================
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { getPlayer, frameHooks } from "./haunted.js";
import { createGhostModel } from "./ghostmodel.js";
import { inventory } from "./inventory.js";
import { audio } from "./audio.js";
import { events } from "./events.js";

let SCENE = null;

export function initOutro(scene) { SCENE = scene; }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------- black / warm overlay
let veil = null;

function fadeTo(opacity, ms, color) {

    if (!veil) {

        veil = document.createElement("div");

        veil.style.cssText = "position:fixed;inset:0;z-index:901;pointer-events:none;opacity:0;background:#000;";

        document.body.appendChild(veil);
    }

    veil.style.background = color || "#000";

    veil.style.transition = "opacity " + ms + "ms ease";

    requestAnimationFrame(() => { veil.style.opacity = String(opacity); });

    return sleep(ms);
}

// ---------------------------------------------------- the player is walked by the script
const drive = { on: false, goal: null, yaw: null, speed: true, pos: null, look: null };

let hookAdded = false;

function addHook() {

    if (hookAdded) return;

    hookAdded = true;

    frameHooks.push((t, dt) => {

        const p = getPlayer();

        if (!p || !drive.on) return;

        for (const k in p.keys) p.keys[k] = false;

        if (drive.pos) {

            // a camera on rails (the home scene): the player does not move by himself
            p.pos.copy(drive.pos);

            p.verticalVelocity = 0; p.grounded = true; p._airTop = null; p.fatalFall = 0; p.camY = p.pos.y;

            p.camera.position.copy(p.pos);
        }
        else if (drive.goal) {

            const dx = drive.goal.x - p.pos.x, dz = drive.goal.z - p.pos.z;

            if (Math.hypot(dx, dz) > 0.35) {

                p.keys.forward = true;

                p.yaw = Math.atan2(-dx, -dz);
            }
            else drive.reached = true;
        }

        if (drive.yaw !== null) p.yaw += (drive.yaw - p.yaw) * Math.min(1, dt * 1.6);

        if (drive.look !== null) p.pitch += (drive.look - p.pitch) * Math.min(1, dt * 2);

        // (mouse and touch look are ignored while the ending plays)
    });
}

async function walkTo(x, z) {

    drive.goal = { x, z };

    drive.reached = false;

    drive.yaw = null;

    const t0 = performance.now();

    while (!drive.reached && performance.now() - t0 < 14000) await sleep(100);

    // if something stood in the way, he is simply put at the spot so the ending always goes on
    if (!drive.reached) {

        const p = getPlayer();

        p.pos.set(x, p.pos.y, z);

        p.camera.position.copy(p.pos);
    }

    drive.goal = null;
}

// ---------------------------------------------------- a soft sob (synthesised)
function sob(vol) {

    const ctx = audio.ctx;

    if (!ctx || !audio.sfxBus) return;

    try {

        const len = Math.floor(ctx.sampleRate * 0.9), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);

        let lp = 0;

        for (let i = 0; i < len; i++) {

            const t = i / len, env = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.25)), 2) * (1 - t * 0.5);

            lp += ((Math.random() * 2 - 1) - lp) * (0.12 + 0.1 * Math.sin(t * 24));

            d[i] = lp * env * (0.9 + 0.5 * Math.sin(t * 38));
        }

        const src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();

        src.buffer = buf; f.type = "bandpass"; f.frequency.value = 520 + Math.random() * 280; f.Q.value = 0.9;

        g.gain.value = vol || 0.5;

        src.connect(f); f.connect(g); g.connect(audio.sfxBus);

        src.start();
    }
    catch (e) { /* no audio: fine */ }
}

// ---------------------------------------------------- people
function person(outfit, scale) {

    const m = createGhostModel(SCENE, { ramu: true, outfit });

    m.root.scale.setScalar(scale || 1);

    SCENE.add(m.root);

    if (m.setVisible) m.setVisible(true);

    m.root.visible = true;

    const fade = setInterval(() => { if (m.ramu) { m.ramu.setOpacity(1); clearInterval(fade); } }, 200);

    return m;
}

const GIRL = { shirt: 0x8a2f2a, pants: 0xcdbd9a, hair: "long", hairColor: 0x2a1a12 };

// ======================================================
export async function startOutro(done) {

    // whatever happens during the walk, the pictures and THE END always follow
    try { await runOutro(); }
    catch (e) { console.error("outro", e); }

    await finishOutro(done);
}

// the black veil goes away again as soon as the pictures are on screen (it used to stay and hide them)
async function finishOutro(done) {

    drive.on = false;

    drive.goal = null; drive.yaw = null; drive.look = null; drive.pos = null;

    const p = getPlayer();

    if (p && p.camera) { p.camera.fov = Math.max(p.camera.fov, 70); p.camera.updateProjectionMatrix(); }

    await fadeTo(1, 500);

    if (done) { try { done(); } catch (e) { console.error("outro end", e); } }

    await sleep(250);

    await fadeTo(0, 900);
}

async function runOutro() {

    const p = getPlayer();

    if (!SCENE || !p) return;

    addHook();

    drive.on = true;

    events.emit("outro-start");

    inventory.say("", 0.1);

    // ---------- 1. to the front of the hostel, at dawn ----------
    await fadeTo(1, 1200);

    events.emit("outro-open-main");

    events.emit("outro-open-gate");

    p.pos.set(12.2, 1.7, 0.0);

    p.camY = p.pos.y; p.yaw = -Math.PI / 2; p.pitch = 0.0; p.verticalVelocity = 0; p.grounded = true; p.hidden = false; p.anim = null;

    p.camera.position.copy(p.pos);

    const old = { bg: SCENE.background ? SCENE.background.clone() : null, fog: SCENE.fog ? SCENE.fog.color.clone() : null, dens: SCENE.fog ? SCENE.fog.density : 0 };

    // dawn: a low warm sun, a pale warm sky, a thin mist
    const sun = new THREE.DirectionalLight(0xffcf9a, 2.2);

    sun.position.set(60, 14, -6);

    SCENE.add(sun);

    const disc = new THREE.Mesh(new THREE.SphereGeometry(5, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffe2b0, fog: false }));

    disc.position.set(150, 12, -10);

    SCENE.add(disc);

    SCENE.background = new THREE.Color(0xc89a72);

    if (SCENE.fog) { SCENE.fog.color.set(0xb88f6e); SCENE.fog.density = Math.max(0.004, SCENE.fog.density * 0.35); }

    await fadeTo(0, 1800);

    inventory.say("The hostel is quiet. Pale light comes in through the open door...", 4);

    await sleep(1600);

    // ---------- 2. walking out ----------
    await walkTo(15.6, 0);

    inventory.say("For the first time, nothing is following you.", 3.5);

    await walkTo(22.5, 0);

    // the letter: left on a flat stone by the gate
    const stone = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.6), new THREE.MeshStandardMaterial({ color: 0x6c6a64, roughness: 1 }));

    stone.position.set(25.4, 0.25, 1.6);

    SCENE.add(stone);

    const letter = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.012, 0.3), new THREE.MeshStandardMaterial({ color: 0xf0e8cc, roughness: 1, emissive: 0x3a3524 }));

    letter.position.set(25.4, 0.51, 1.6);

    letter.rotation.y = 0.3;

    letter.visible = false;

    SCENE.add(letter);

    await walkTo(24.2, 0.6);

    audio.paper();

    letter.visible = true;

    inventory.say("You lay Ramu's letter on the old stone by the gate, where someone will find it.", 4.5);

    await sleep(3600);

    await walkTo(31.5, 0);

    // turn and look back at the hostel in the sunrise
    drive.yaw = Math.PI / 2;

    drive.look = 0.05;

    inventory.say("The hostel stands in the morning light. It is only an old building now.", 4.5);

    await sleep(3200);

    // ---------- 3. the pictures: the girl takes the letter home, the family reads it and cries ----------
    // (they follow in story.outroPictures(), shown by the callback)
    await fadeTo(1, 1800);

    sun.visible = false; disc.visible = false; stone.visible = false; letter.visible = false;

}

// ======================================================
// the little house at Kothapalli: the girl reads the letter to her mother and father
// ======================================================
async function homeScene(p, old) {

    const Y = -48;

    const g = new THREE.Group();

    g.position.set(0, Y, 0);

    SCENE.add(g);

    const mat = (c, r) => new THREE.MeshStandardMaterial({ color: c, roughness: r === undefined ? 1 : r });

    const box = (m, w, h, d, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); g.add(o); return o; };

    // room
    box(mat(0x3a2c20), 8, 0.2, 7, 0, -0.1, 0);                 // earth floor
    box(mat(0x5a4a3a), 8, 3, 0.2, 0, 1.5, -3.5);              // walls
    box(mat(0x56463a), 0.2, 3, 7, -4, 1.5, 0);
    box(mat(0x56463a), 0.2, 3, 7, 4, 1.5, 0);
    box(mat(0x3a2e24), 8, 0.2, 7, 0, 3.1, 0);                  // roof

    // a mat, a low table, a lamp
    box(mat(0x7a5a3a), 3.2, 0.03, 2.4, 0, 0.015, -0.4);
    box(mat(0x4a3322), 1.0, 0.35, 0.8, 0, 0.18, -0.4);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd18a }));
    lamp.position.set(0.3, 0.45, -0.5);
    g.add(lamp);

    const light = new THREE.PointLight(0xffb060, 2.6, 9, 1.6);
    light.position.set(0.3, 0.9, -0.4);
    g.add(light);

    // a window with cold dawn light
    box(new THREE.MeshBasicMaterial({ color: 0x9aa8b8 }), 1.1, 1.1, 0.05, 2.4, 1.7, -3.38);

    const letterOnTable = box(new THREE.MeshStandardMaterial({ color: 0xf0e8cc, roughness: 1, emissive: 0x4a4030 }), 0.22, 0.012, 0.3, -0.1, 0.37, -0.4);
    letterOnTable.rotation.y = 0.4;

    // the family, around the table
    const girl = person(GIRL, 0.92);
    const mother = person({ shirt: 0x6a1f2a, pants: 0x6a1f2a, hair: "long", hairColor: 0x3a3030 }, 0.9);
    const father = person({ shirt: 0xcfc9b8, pants: 0x4a4038, hair: "short", hairColor: 0x9a9a98 }, 1.0);

    const spots = [[girl, -0.1, 0.55, 0], [mother, -1.35, -0.2, Math.PI / 2 - 0.2], [father, 1.15, -0.2, -Math.PI / 2 + 0.2]];

    for (const [m, x, z, ry] of spots) {

        m.root.position.set(x, Y, z);

        m.root.rotation.y = ry;
    }

    // the girl faces the camera-side of the table, reading; the parents look down at the letter
    girl.root.rotation.y = 0.1;

    const down = new THREE.Vector3(0, Y + 0.4, -0.4);

    // tears: small drops that fall from the faces
    const tears = [];

    const tg = new THREE.SphereGeometry(0.012, 6, 5), tm = new THREE.MeshBasicMaterial({ color: 0xbcd4ff });

    for (let i = 0; i < 24; i++) { const t = new THREE.Mesh(tg, tm); t.visible = false; SCENE.add(t); tears.push({ m: t, life: 0, who: i % 3 }); }

    const people = [girl, mother, father];

    // the camera glides slowly towards them
    let T = 0;

    drive.pos = new THREE.Vector3(0.2, Y + 1.45, 3.2);

    p.pitch = -0.12;

    p.yaw = 0;

    // keep the camera floor under the player
    if (p.collisionSystem && p.collisionSystem.platforms) p.collisionSystem.platforms.push({ x0: -3.9, x1: 3.9, z0: -3.4, z1: 3.4, y: Y });

    if (SCENE.background) SCENE.background = new THREE.Color(0x0a0806);

    if (SCENE.fog) { SCENE.fog.color.set(0x0a0806); SCENE.fog.density = 0.02; }

    const hook = (t, dt) => {

        T += dt;

        drive.pos.z = 3.2 - Math.min(1.5, T * 0.075);

        drive.pos.y = Y + 1.45 - Math.min(0.2, T * 0.01);

        light.intensity = 2.5 + Math.sin(T * 9) * 0.15 + Math.sin(T * 23) * 0.08;

        for (const m of people) {

            m.update(dt, { speed: 0, run: false, look: down, open: undefined, calm: 1, leftTo: null, rightTo: null }, null, false);
        }

        // sobbing shoulders
        for (let i = 0; i < people.length; i++) people[i].root.position.y = Y + Math.sin(T * 5 + i * 2) * 0.006 * (Math.sin(T * 0.9 + i) > 0.4 ? 1 : 0.2);

        for (const tr of tears) {

            if (tr.life <= 0) {

                if (Math.random() < dt * 0.9) {

                    const m = people[tr.who].root;

                    tr.life = 1.4;

                    tr.m.visible = true;

                    tr.m.position.set(m.position.x + (Math.random() - 0.5) * 0.08, Y + 1.38 * m.scale.y, m.position.z + 0.1 * Math.cos(m.rotation.y));
                }
            }
            else {

                tr.life -= dt;

                tr.m.position.y -= dt * 0.7;

                if (tr.life <= 0) tr.m.visible = false;
            }
        }
    };

    frameHooks.push(hook);

    await fadeTo(0, 2000);

    let alive = true;

    (async () => { while (alive) { sob(0.35 + Math.random() * 0.2); await sleep(1500 + Math.random() * 1800); } })();

    const say = async (txt, ms) => { inventory.say(txt, ms / 1000 + 0.5); await sleep(ms); };

    await say("In a small house in Kothapalli, the letter is opened.", 4200);

    await say("Sister:  \"Amma... it is from Ramu.\"", 4200);

    await say("\"I am sorry I never told you how much it hurt. I did not want you to worry.\"", 5600);

    await say("\"I loved you all. I was only too tired to say it.\"", 5200);

    await say("Amma:  \"My boy... my Ramu...\"", 4200);

    await say("Father:  \"We should have listened. We should have heard him.\"", 5200);

    await say("They hold each other, and for the first time in many years, the whole family cries together.", 6500);

    await say("Ramu was heard at last.", 4500);

    alive = false;

    await fadeTo(1, 2500);

    frameHooks.splice(frameHooks.indexOf(hook), 1);

    for (const m of people) m.root.visible = false;

    g.visible = false;

    for (const tr of tears) tr.m.visible = false;

    drive.pos = null;
}

// (for testing in the browser console:  hhHome() shows only the family scene)
if (typeof window !== "undefined") {

    window.hhHome = () => { const p = getPlayer(); addHook(); drive.on = true; return homeScene(p, {}); };

    window.hhOutroEnd = (cb) => finishOutro(cb);
}
