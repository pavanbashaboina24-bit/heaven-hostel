import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

import { createFloor1 } from "./world.js";

import { Player, FEEL } from "./player.js";

import { CollisionSystem } from "./collision.js";

import { RoomSystem } from "./room.js";

import {
    attachFlashlight, updateHaunted, bindPlayer, setMenuMode,
    setBrightness, resetWorld, zoneOf
} from "./haunted.js";

import { InteractionSystem } from "./interaction.js";

import { audio } from "./audio.js";

import { inventory } from "./inventory.js";
import { story } from "./story.js";
import { locks } from "./locks.js";
import { ensureKeySpot } from "./yard.js";

import { menu, settings } from "./menu.js";
import { GhostSystem } from "./ghosts.js";
import { events } from "./events.js";


// =========================================
// SCENE, CAMERA, RENDERER
// =========================================

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

// START: outside the gate, on the dirt road, looking at the hostel
const START = { x: 38, y: 1.7, z: 0, yaw: Math.PI / 2 };

camera.position.set(START.x, START.y, START.z);

const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

document.body.appendChild(renderer.domElement);


// =========================================
// GAME SYSTEMS
// =========================================

const collisionSystem = new CollisionSystem();

const interactionSystem = new InteractionSystem(camera, scene);

const roomSystem = new RoomSystem();

createFloor1(scene, collisionSystem, interactionSystem);

const player = new Player(camera, collisionSystem);

attachFlashlight(camera);

bindPlayer(player);

setMenuMode(true);

interactionSystem.setOccluders(collisionSystem.objects);
// the ghost of the hostel (ghosts.js + ghostmodel.js)
const ghosts = new GhostSystem({
    scene, camera, player, collisionSystem, interactionSystem
});


// =========================================
// GAME STATE
//   loading -> title/menu -> playing <-> paused
// =========================================

const state = {
    mode: "menu",          // "menu" | "playing" | "paused"
    session: false         // a game is running (can be resumed)
};

function placePlayer(x, y, z, yaw) {

    player.pos.set(x, y, z);

    player.camY = y;

    player.yaw = yaw;

    player.pitch = 0;

    player.hidden = false;

    player.hideSpot = null;

    player.anim = null;

    player.verticalVelocity = 0;

    player.grounded = true;

    player._airTop = null;

    player.fatalFall = 0;

    player.fallDrop = 0;

    for (const k in player.keys) player.keys[k] = false;

    camera.position.copy(player.pos);
}


// =========================================
// SETTINGS (quality, sensitivity, brightness, shake)
// =========================================

function applyQuality(q) {

    // sharp by default; Low only for slow computers
    const dpr = window.devicePixelRatio || 1;

    const ratio = q === "low"
        ? Math.min(dpr, 0.85)
        : q === "medium"
            ? Math.min(dpr, 1.5)
            : Math.min(dpr, 2);

    renderer.setPixelRatio(ratio);

    renderer.setSize(window.innerWidth, window.innerHeight);

    const fx = scene.userData;

    for (const m of fx.forest || []) m.visible = q !== "low";

    for (const m of fx.grass || []) m.visible = q !== "low";

    for (const m of fx.mist || []) m.visible = q === "high";
}

function applySettings(s) {

    player.sensitivity = 0.002 * s.sens;

    FEEL.roughness = s.shake;

    setBrightness(s.bright);

    applyQuality(s.quality);
}


// =========================================
// START / PAUSE / RESUME
// =========================================

function lockPointer() {

    document.body.requestPointerLock();
}

function startPlaying() {

    state.mode = "playing";

    state.session = true;

    menu.sessionActive = true;

    menu.hideAll();
    setMenuMode(false);
    ghosts.suspend(false);
    ghosts.showDifficulty(false);
    audio.setPaused(false);
    audio.setMode("game");
    menu.lastPos = null;

    lockPointer();
}

function enterMenuMode() {

    state.mode = "menu";
    setMenuMode(true);
    ghosts.suspend(true);
    interactionSystem.hide();
    audio.setMode("menu");
}

document.addEventListener("pointerlockchange", () => {

    const locked = document.pointerLockElement === document.body;

    if (!locked && state.mode === "playing") {

        state.mode = "paused";

        for (const k in player.keys) player.keys[k] = false;

        interactionSystem.hide();

        menu.save(player);

        menu.showPause();

        audio.setPaused(true);
    }
});

document.addEventListener("pointerlockerror", () => {

    // the browser needs a moment before it lets us lock again
    if (state.mode === "playing") {

        state.mode = "paused";

        menu.showPause();
    }
});

document.addEventListener("keydown", (event) => {

    if (state.mode !== "playing" || ghosts.cinematic) return;
    if (event.key.toLowerCase() === "e") {

        interactionSystem.interact("E");
    }

    // C = sit / sleep / swing  (E stays for opening, hiding and picking up)
    if (event.key.toLowerCase() === "c") {

        interactionSystem.interact("C");
    }
});


// ======================================================
// WHEN THE GHOST HAS KILLED YOU
// ======================================================
function retryGame() {
    ghosts.reset(true);
    resetWorld();
    // the clues, locks and items you found stay as they were
    ensureKeySpot();
    locks.refresh();
    story.refresh();
    menu.stopPractice();
    placePlayer(START.x, START.y, START.z, START.yaw);
    startPlaying();
}
ghosts.hooks.retry = retryGame;
// the hidden room at the end: the ghost can not follow you there
events.on("hidden-room", () => { ghosts.suspended = true; });
story.onEnd = () => ghosts.hooks.menu();
ghosts.hooks.menu = () => {
    ghosts.reset(false);
    state.session = false;
    menu.sessionActive = false;
    enterMenuMode();
    menu.show("title");
};
ghosts.onDeathScreen = () => {
    // nothing may react to the mouse / pointer lock any more
    state.mode = "menu";
    state.session = false;
    menu.sessionActive = false;
    setMenuMode(true);
    interactionSystem.hide();
    audio.setMode("off");
    if (document.pointerLockElement) document.exitPointerLock();
};
menu.init({

    onSettings(s) {

        applySettings(s);
    },

    onNew() {
        ghosts.reset(true);
        resetWorld();

        // empty the bag, put the items back, relock the cellar
        inventory.reset();

        story.refresh();

        menu.stopPractice();

        placePlayer(START.x, START.y, START.z, START.yaw);

        startPlaying();
    },

    onContinue(save) {
        ghosts.reset(true);
        resetWorld();

        menu.stopPractice();

        ensureKeySpot();

        locks.refresh();

        story.refresh();

        if (save) {

            placePlayer(save.x, save.y, save.z, save.yaw);
        }
        else {

            placePlayer(START.x, START.y, START.z, START.yaw);
        }

        startPlaying();
    },

    onPractice() {
        ghosts.reset(false);
        resetWorld();

        // inside the ground-floor hall
        placePlayer(0, 1.7, 2.4, 0);

        menu.startPractice();

        startPlaying();
    },

    onResume() {

        state.mode = "playing";

        menu.hideAll();

        setMenuMode(false);

        audio.setPaused(false);

        audio.setMode("game");

        lockPointer();
    },

    onQuitToMenu() {

        menu.save(player);

        enterMenuMode();
    },

    onMenuShown(name) {
        ghosts.showDifficulty(name === "title" || name === "menu" || name === "choice");

        // title / menus use the slow camera drift and the menu music
        if (name === "title" || name === "menu" || name === "choice") {

            if (state.mode === "playing" || state.mode === "paused") {

                // came back from the game: keep session so it can be resumed
                enterMenuMode();
            }

            if (audio.ready && audio.mode !== "menu" && state.mode === "menu") {

                audio.setMode("menu");
            }
        }
    },

    onAudioReady() {

        audio.setVolumes(settings);
    }
});

// footsteps follow the head bob
player.onStep = (running) => {

    audio.footstep(audio.surface(player.pos, player.onStairs), running);
};

applySettings(settings);


// =========================================
// LOADING DONE -> TITLE SCREEN
// =========================================

const loading = document.getElementById("loading");

setTimeout(() => loading.classList.add("gone"), 500);


// =========================================
// GAME LOOP
// =========================================

const clock = new THREE.Clock();

function animate() {

    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.1);

    const t = performance.now() / 1000;

    if (state.mode === "playing") {

        // the game stands still while a letter / book / the bag is open
        if (inventory.reading) {

            for (const k in player.keys) {
                player.keys[k] = false;
            }
        }

        // (the ghost takes the camera while he is killing you)
        if (!ghosts.cinematic) player.update(delta);

        // a fall from the roof (more than 6 m) kills
        if (player.fatalFall && !ghosts.dead) {

            const drop = player.fatalFall;

            player.fatalFall = 0;

            ghosts.fallDeath(drop);
        }
        if (!inventory.reading) ghosts.update(delta, t);
        updateHaunted(t, delta, camera, true);
        roomSystem.update(camera.position);
        if (ghosts.cinematic) interactionSystem.hide();
        else interactionSystem.update();

        menu.tick(player, delta);
    }
    else if (state.mode === "paused") {

        updateHaunted(t, delta, camera, false);
    }
    else {

        // title / menus: the camera slowly drifts in front of the gate
        camera.position.set(
            36 + Math.sin(t * 0.1) * 0.7,
            1.95 + Math.sin(t * 0.23) * 0.05,
            Math.sin(t * 0.07) * 1.4
        );

        camera.rotation.set(
            0.05 + Math.sin(t * 0.13) * 0.012,
            Math.PI / 2 + Math.sin(t * 0.08) * 0.05,
            Math.sin(t * 0.11) * 0.004,
            "YXZ"
        );

        updateHaunted(t, delta, camera, false);

        audio.updateMenu(delta);
    }

    renderer.render(scene, camera);
}

animate();

// small hook for testing / tweaking from the browser console
import { theCase } from "./gen.js";
window.__game = { theCase, THREE, scene, camera, renderer, player, ghosts, inventory, audio, interactionSystem, collisionSystem, state, placePlayer, startPlaying };


// =========================================
// WINDOW RESIZE
// =========================================

window.addEventListener("resize", () => {

    camera.aspect = window.innerWidth / window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
});