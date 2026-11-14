import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

import { createGhostModel } from "./ghostmodel.js";
import { anim, ghostFx } from "./haunted.js";
import { audio } from "./audio.js";
import { events } from "./events.js";
import { inventory } from "./inventory.js";

// ======================================================
// THE GHOST OF HAVEN HOSTEL
//
//   WHO:   Ramu, 19, from Kothapalli village, a resident of Room 204.
//          Teased until he could bear it no more; he died in his room.
//          His one wish: his letter must reach his mother.
//          (The whole story is in clues.js and story.js.)
//
//   HOW IT WORKS (everything is in this file + ghostmodel.js + audio.js):
//
//     SPAWN     an unseen spawn manager puts him in the hostel at random places and times, on
//               any floor (never in view, never in a locked room, never on top of you)
//     WANDER    a slow heavy walk along a waypoint graph that follows the REAL corridors, doors,
//               stairs, the lawn and the back stairs.  He stops at odd places: observes, scans,
//               tilts his head, looks BEHIND him, twitches, stands silently in a corner,
//               sometimes crawls, sometimes goes back to a room he has just checked
//     SUSPICIOUS he heard something (running, doors, light, things you touch): he STOPS, turns
//               his head to it, listens ... and then goes to look
//     SEARCH    looks round, checks rooms and hiding places (listens, knocks, slowly opens),
//               sometimes PRETENDS TO LEAVE (feint) and comes back creeping
//     CHASE     he SAW you: fast (faster the longer it lasts); he screams and breathes
//     ATTACK    only when he is really close AND has a clear way to you: grab, drag, game over
//
//     scenes of the DIRECTOR (rare, one at a time, never right after an escape):
//     STALK     he follows you out of sight and is gone when you turn round
//     BEHIND    he appears behind you and walks up slowly (he does not attack)
//     KNOCK     three knocks on the door of the room you are in, then the door opens slowly
//     WATCH     he stands outside and watches you through a window
//     small scares: lights stutter, a door slams, a book falls, a shadow runs by, distant
//               footsteps, whispers, laughter, a far knock
//
//   He is NOT omniscient: sight = distance + the cone of his eyes (+ a short all-round sense)
//   + a ray that walls and closed doors block; hearing = how loud you are; a hidden player is
//   only found if he saw you hide or if his search happens to check your hiding place (and
//   then only by chance: a place that was a close call can not find you again at once).
//   The game stays FAIR: mercy time after an escape, a warning before every scene, and an
//   anti-stuck watchdog (unstick/watchdog) so he can never be trapped by a door or a wall.
//
//   Tune everything in GHOST_CFG below.
// ======================================================

// ------------------------------------------------------
// ALL THE NUMBERS (world units are metres)
// ------------------------------------------------------
export const GHOST_CFG = {

    difficulty: "normal",

    // Ramu roams all floors, the stairs, the lawn and the terrace on his own.
    // He is NOT all-seeing any more: he sees you only inside the cone of his eyes (fov) and only
    // when nothing is in the way; he HEARS you running, opening doors, handling things; he
    // does not know where you are until he has seen or heard you.
    // Once he has SEEN you he is faster than you can walk and as fast as you can run, and he
    // gets faster the longer the chase lasts (chaseRamp).  A hiding place saves you, unless he
    // saw you go in (and even then he has to check it).
    levels: {

        easy: {
            walk: 1.9,            // roaming speed
            chase: 7.8,           // chase speed (the player walks at 5, runs at 9)
            chaseRamp: 0.08,      // he gets this much faster (fraction) over a long chase
            vision: 28,           // how far he can see you
            fov: 105,             // the cone of his eyes, in degrees
            nearSense: 2.2,       // closer than this he notices you from any side (if nothing is in between)
            hear: 1.0,            // multiplies how far your noise carries
            search: [9, 15],      // seconds he searches after losing you
            cooldown: [6, 14],    // seconds between his appearances
            life: [120, 220],     // seconds he stays before vanishing
            attack: 1.8,          // distance at which he grabs you
            lose: 1.7,            // seconds without seeing you before searching
            find: 0.05,           // chance a check finds an UNSEEN hider
            checkHide: 0.35,      // chance he checks a hiding place at all
            near: 0.03,           // chance a spawn is close / behind you
            scare: 0.7            // how often the bigger scary scenes happen (1 = normal)
        },

        normal: {
            walk: 2.4, chase: 9.2, chaseRamp: 0.10, vision: 34, fov: 120, nearSense: 3.0, hear: 1.2,
            search: [10, 18], cooldown: [4, 10], life: [150, 260],
            attack: 2.0, lose: 1.4, find: 0.08, checkHide: 0.5, near: 0.06, scare: 1.0
        },

        nightmare: {
            walk: 3.0, chase: 10.6, chaseRamp: 0.12, vision: 42, fov: 140, nearSense: 4.0, hear: 1.5,
            search: [13, 22], cooldown: [3, 7], life: [200, 320],
            attack: 2.2, lose: 1.6, find: 0.16, checkHide: 0.7, near: 0.1, scare: 1.3
        }
    },

    warnDist: 10,         // the "hide!" warning starts at this distance
    spawnMinDist: 22,     // he starts far away: you meet him WALKING, he never pops up next to you
    nearMinDist: 7,       // "near" spawns: behind you, at least this far
    firstSpawnDelay: [12, 22],   // grace at the start of a game
    dragSpeed: 1.7,       // how fast he drags you
    statueChance: 0.08,   // sometimes he just stands far away at the end of a corridor and stares
    roomStandChance: 0.04 // or stands silently in a room
};

export const GHOST_STORY = {
    name: "Ramu",
    age: 19,
    room: "Room 204",
    text: "A boy from a village, teased until he could bear it no more. He still walks the hostel looking for someone to listen."
};

// ======================================================
// NAVIGATION GRAPH  (built from the real plan of the hostel)
//
//   hall  z -4..4,  x -11.5..11.5   (the corridor / hall)
//   rooms north z -15..-4 and south z 4..15, doors at
//   x = -10.5, -3.5, 3.5, 10.5 (on z = +-4)
//   stairs: floor 0 -> 4 LEFT  (x -13), floor 4 -> 8 RIGHT (x 13)
//   (the stairs up to the terrace are left alone)
// ======================================================
const FLOORS = [0, 4, 8, 12];      // 12 = the terrace

// the cellar under Room 106 (cellar.js): Ramu comes down the ladder (walking, never popping up)
const CELLAR = { x0: -6.2, x1: -0.8, z0: 7.9, z1: 14.1, y: -4, hatchX: -3.5, hatchZ: 10.5 };
const HOSTEL_FLOORS = 3;           // floors with a hall and rooms
const EYE = 1.7;
const DOOR_X = [-10.5, -3.5, 3.5, 10.5];
const ROOM_CX = [-11, -3.5, 3.5, 11];
const HALL_X = [-10.5, -7, -3.5, 0, 3.5, 7, 10.5];

let SPIRAL_OPEN = false;     // the door at the top of the back stairs stands open (and is unlocked)
let YARD_OPEN = false;       // the main door is open: the lawn in front of it is part of his patrol

const LANE_Z = 2.4;     // the two free lanes along the hall (the middle is full of benches)

const NAV = (function build() {

    const nodes = [];
    const adj = [];

    const add = (x, z, fl, type, extra) => {
        const n = Object.assign({
            i: nodes.length, x, z, fl, y: FLOORS[fl], type,
            locked: false, room: null
        }, extra || {});
        nodes.push(n);
        adj.push([]);
        return n;
    };

    const link = (a, b, stair) => {
        const w = Math.hypot(a.x - b.x, a.z - b.z) + (stair ? 3 : 0);
        adj[a.i].push({ to: b.i, w, stair: !!stair });
        adj[b.i].push({ to: a.i, w, stair: !!stair });
    };

    // lane[fl][side] = nodes along that lane (side -1 = north lane, +1 = south lane)
    const lane = [];

    for (let fl = 0; fl < HOSTEL_FLOORS; fl++) {

        lane.push({ "-1": [], "1": [] });

        for (const side of [-1, 1]) {

            const L = HALL_X.map((x) => add(x, side * LANE_Z, fl, "hall"));

            lane[fl][side] = L;

            for (let i = 0; i + 1 < L.length; i++) link(L[i], L[i + 1]);

            for (let i = 0; i < 4; i++) {

                const x = DOOR_X[i];

                const A = L[HALL_X.indexOf(x)];

                const T = add(x, side * 4.0, fl, "door", { door: true });
                const I1 = add(x, side * 6.5, fl, "room");
                const I2 = add(ROOM_CX[i], side * 10, fl, "room");

                const locked = fl === 0 && side === -1 && (i === 0 || i === 3);

                const number = (fl + 1) * 100 + (side === -1 ? i + 1 : i + 5);

                for (const n of [T, I1, I2]) {
                    n.locked = locked;
                    n.room = number;
                }

                link(A, T);
                link(T, I1);
                link(I1, I2);
            }
        }
    }

    // stairs: floor 0 -> 4 on the left, floor 4 -> 8 on the right.
    // (a short step along the wall of the hall leads to the foot of each flight)
    const via = (laneNode, z, stairNode) => {
        const M = add(laneNode.x, z, laneNode.fl, "hall");
        link(laneNode, M);
        link(M, stairNode);
    };

    const SBL = add(-13, 3.05, 0, "stair");
    const STL = add(-13, -3.1, 1, "stair");
    via(lane[0]["1"][0], 3.05, SBL);
    via(lane[1]["-1"][0], -3.05, STL);
    link(SBL, STL, true);

    const SBR = add(13, 3.05, 1, "stair");
    const STR = add(13, -3.1, 2, "stair");
    via(lane[1]["1"][6], 3.05, SBR);
    via(lane[2]["-1"][6], -3.05, STR);
    link(SBR, STR, true);

    // the stairs to the terrace (LEFT shaft) and a loop of paths over the roof
    const SBT = add(-13, 3.05, 2, "stair");
    const STT = add(-13, -3.1, 3, "stair");
    via(lane[2]["1"][0], 3.05, SBT);
    link(SBT, STT, true);

    // the GRASS in front of the main door: a short path out to the road and two bits of lawn.
    // (he only goes there while the main door stands open; see YARD_OPEN)
    {
        const yE = add(16.4, 0, 0, "room", { yard: true });
        const y1 = add(18.6, 0, 0, "room", { yard: true });
        const y2 = add(22.0, 0, 0, "room", { yard: true });
        const y3 = add(19.5, -3.4, 0, "room", { yard: true });
        const y4 = add(19.5, 3.4, 0, "room", { yard: true });

        // The way in and out is a straight line through TWO doors: the inner door of the hall (x 11.4)
        // and the front door (x 15), with the little lobby between them.  (The nodes are placed
        // from a probe of the real collision: the walls are 0.8 thick, the doorways are 1 m wide.)
        const h0 = add(10.2, 0, 0, "hall");                    // in the hall, in front of the inner door
        const l0 = add(12.5, 0, 0, "hall", { lobby: true });   // in the lobby, between the two doors
        const dn = add(13.9, 0, 0, "hall", { lobby: true });   // in the lobby, in front of the front door
        link(lane[0]["-1"][6], h0);
        link(lane[0]["1"][6], h0);
        link(h0, l0);
        link(l0, dn);
        link(dn, yE);
        link(yE, y1);
        link(y1, y2);
        link(y1, y3);
        link(y1, y4);
    }

    // (the paths over the roof are found by probing the real collision world: see addCrossings)

    return { nodes, adj, add, link, lane, crossed: false, stairTop: STT };

})();

// the height of the stairs along z (rise 4 over 5 m)
function stairY(base, z) {
    return base + 4 * Math.max(0, Math.min(1, (2.5 - z) / 5));
}

function floorOf(feetY) {
    let best = 0;
    let bd = 1e9;
    for (let i = 0; i < FLOORS.length; i++) {
        const d = Math.abs(FLOORS[i] - feetY);
        if (d < bd) { bd = d; best = i; }
    }
    return best;
}

function nearestNode(x, z, fl, types) {
    let best = null;
    let bd = 1e9;
    for (const n of NAV.nodes) {
        if (n.fl !== fl) continue;
        if (types && types.indexOf(n.type) < 0) continue;
        const d = (n.x - x) * (n.x - x) + (n.z - z) * (n.z - z);
        if (d < bd) { bd = d; best = n; }
    }
    return best;
}

// Dijkstra over the graph (locked rooms are never used)
function findPath(from, to) {

    if (from === to) return [to];

    const N = NAV.nodes.length;
    const dist = new Array(N).fill(1e9);
    const prev = new Array(N).fill(-1);
    const done = new Array(N).fill(false);

    dist[from] = 0;

    for (let k = 0; k < N; k++) {

        let u = -1;
        let ud = 1e9;

        for (let i = 0; i < N; i++) {
            if (!done[i] && dist[i] < ud) { ud = dist[i]; u = i; }
        }

        if (u < 0 || u === to) break;

        done[u] = true;

        for (const e of NAV.adj[u]) {
            if (NAV.nodes[e.to].locked && e.to !== to) continue;
            const nd = dist[u] + e.w;
            if (nd < dist[e.to]) {
                dist[e.to] = nd;
                prev[e.to] = u;
            }
        }
    }

    if (prev[to] < 0) return null;

    const path = [];

    for (let v = to; v >= 0; v = prev[v]) path.push(v);

    return path.reverse();
}

function edgeBetween(a, b) {
    for (const e of NAV.adj[a]) if (e.to === b) return e;
    return null;
}

// ======================================================
// THE SYSTEM
// ======================================================
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angDiff = (a, b) => {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
};

export class GhostSystem {

    constructor(o) {

        this.scene = o.scene;
        this.camera = o.camera;
        this.player = o.player;
        this.cs = o.collisionSystem;
        this.inter = o.interactionSystem;

        // the ghost is shut inside the hostel: he starts only when the lock of the main door is
        // opened, and then he steps OUT of that door (main-door-unlocked is sent by yard.js)
        this.doorSpawn = null;

        events.on("main-door-unlocked", (d) => { this.doorSpawn = d || null; this.cool = 0.4; });

        // the ending cinematic: he is gone for good
        events.on("outro-start", () => { this.enabled = false; this.kill = null; this.model.setVisible(false); this.model.root.visible = false; });

        // ---- difficulty ----
        let diff = GHOST_CFG.difficulty;
        try {
            const s = localStorage.getItem("haven_ghost_difficulty");
            if (s && GHOST_CFG.levels[s]) diff = s;
        }
        catch (e) { /* no storage: fine */ }
        this.diffName = diff;
        this.L = GHOST_CFG.levels[diff];

        // ---- the body ----
        this.model = createGhostModel(this.scene);
        this.scene.add(this.model.root);
        this.model.setVisible(false);
        this.model.onStep = (side, run) => this.onStep(side, run);

        // ---- state ----
        this.enabled = false;          // false in practice mode / menus
        this.state = "away";           // away | pending | wander | suspicious |
                                       // search | chase | statue | stand | fade | kill
        this.cool = 30;
        this.life = 0;
        this.yaw = 0;
        this.gy = 0;                   // ground height under his feet
        this.fl = 0;
        this.speed = 0;
        this.path = [];
        this.pathI = 0;
        this.dest = null;
        this.curNode = null;
        this.blocked = 0;
        this.pause = 0;
        this.hideScan = 0;
        this.visible = false;

        this.seen = false;             // currently sees the player
        this.seenAt = -99;             // last time he saw the player
        this.lastKnown = new THREE.Vector3();
        this.loseT = 0;
        this.noiseLevel = 0;           // how loud the player is right now
        this.noiseAt = new THREE.Vector3();
        this.hearT = 0;
        this.witness = null;           // a hiding place he saw you enter
        this.targets = [];
        this.tIdx = 0;
        this.searchT = 0;
        this.linger = 0;
        this.checking = null;
        this.warn = 0;
        this.warnCd = 4;
        this.breathCd = 5;
        this.scrapeCd = 3;
        this.roamCd = 8;
        this.doorCd = 12;
        this.losT = 0;
        this.clock = 0;
        this.stuckPos = new THREE.Vector3();
        this.stuckT = 0;
        this.stairing = null;          // { from, to } node indexes while he is on a flight of stairs
        this.visitedNodes = new Set(); // places (halls, rooms, stairs) he has already walked to
        this.patrolFl = null;          // the floor he is searching room by room
        this.spawnPlan = null;
        this.flickerT = 0;
        this.modeIn = 0;

        this.kill = null;
        this.dead = false;
        this.hooks = { retry: null, menu: null };

        // ---- helpers (no per-frame allocations) ----
        this.ray = new THREE.Raycaster();
        this.v1 = new THREE.Vector3();
        this.v2 = new THREE.Vector3();
        this.v3 = new THREE.Vector3();
        this.eye = new THREE.Vector3();
        this.hand = new THREE.Vector3();
        this.cpos = new THREE.Vector3();
        this.tmpQ = new THREE.Quaternion();
        this.tmpM = new THREE.Matrix4();
        this.lookTarget = new THREE.Vector3();
        this.leftTarget = new THREE.Vector3();
        this.rightTarget = new THREE.Vector3();
        this.neck = new THREE.Vector3();
        this.up = new THREE.Vector3(0, 1, 0);

        // ---- caches of the real world ----
        this.doors = [];
        this.spots = null;
        this.losLists = [[], [], [], []];

        this.cacheWorld();

        this.addCrossings();

        this.makeUI();

        // ---- what the player's actions tell him ----
        // (debug handles for the automatic test runs; harmless in the game)
        this.debugNav = NAV;
        this.debugPath = findPath;

        this.initBrain();

        events.on("main-door-state", (open) => { YARD_OPEN = !!open; });
        events.on("spiral-door", (open) => { SPIRAL_OPEN = !!open; });
        events.on("door", () => this.addNoise(11));
        events.on("flashlight", () => this.addNoise(5));
        events.on("interact", () => this.addNoise(8));      // drawers, items, switches ...
        events.on("hide", () => this.onPlayerHide());
    }

    // ==================================================
    // WORLD CACHES
    // ==================================================
    cacheWorld() {

        // room doors (their closed positions)
        const wp = new THREE.Vector3();

        for (const d of anim.doors) {

            if (d.kind !== "room" && d.kind !== "main") continue;

            const mesh = d.pivot.children[0];

            if (!mesh) continue;

            mesh.updateWorldMatrix(true, false);

            mesh.getWorldPosition(wp);

            this.doors.push({
                d,
                mesh,
                x: wp.x,
                y: wp.y,
                z: wp.z,
                fl: floorOf(wp.y - 1.5),
                px: d.pivot.position.x,
                pz: d.pivot.position.z
            });
        }

        // what blocks his sight, per floor (walls, doors, tall furniture)
        const box = new THREE.Box3();

        for (const o of this.cs.objects) {

            if (!o.isMesh) continue;
            if (o.userData && o.userData.isStair) continue;

            const b = this.cs.getBox(o);

            if (b.max.x - b.min.x > 45 || b.max.z - b.min.z > 45) continue;

            for (let f = 0; f < FLOORS.length; f++) {
                const fy = FLOORS[f];
                if (b.max.y > fy + 0.9 && b.min.y < fy + 2.8) {
                    this.losLists[f].push(o);
                }
            }
        }
    }

    // The two lanes of each hall are joined wherever the REAL furniture leaves a
    // free gap (found by probing the collision world once).
    addCrossings() {

        if (NAV.crossed) return;

        NAV.crossed = true;

        const p = new THREE.Vector3();

        for (let fl = 0; fl < HOSTEL_FLOORS; fl++) {

            const runs = [];

            let start = null;

            const freeAt = (x) => {
                for (let z = -LANE_Z; z <= LANE_Z + 0.001; z += 0.2) {
                    p.set(x, FLOORS[fl] + EYE, z);
                    if (this.cs.check(p, 0.3, EYE)) return false;
                }
                return true;
            };

            for (let x = -10.5; x <= 10.5001; x += 0.25) {

                if (freeAt(x)) {
                    if (start === null) start = x;
                }
                else if (start !== null) {
                    runs.push({ a: start, b: x - 0.25 });
                    start = null;
                }
            }

            if (start !== null) runs.push({ a: start, b: 10.5 });

            runs.sort((r1, r2) => (r2.b - r2.a) - (r1.b - r1.a));

            const used = [];

            for (const r of runs) {

                const x = (r.a + r.b) / 2;

                if (used.some((u) => Math.abs(u - x) < 3)) continue;

                used.push(x);

                const nn = [];

                for (const side of [-1, 1]) {

                    const n = NAV.add(x, side * LANE_Z, fl, "hall");

                    // joined to its two neighbours on the lane
                    const L = NAV.lane[fl][side].slice().sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x));

                    NAV.link(n, L[0]);

                    const other = L.find((q) => (q.x - x) * (L[0].x - x) < 0) || L[1];

                    if (other) NAV.link(n, other);

                    nn.push(n);
                }

                NAV.link(nn[0], nn[1]);

                if (used.length >= 4) break;
            }

            this.crossings = this.crossings || [];

            this.crossings.push(used.length);
        }

        // ---- the terrace: a grid of free cells (found with the real colliders) ----
        const STEP = 1.5;
        const cell = new Map();
        const free = (x, z) => {
            p.set(x, 12 + EYE, z);
            return !this.cs.check(p, 0.35, EYE);
        };
        for (let x = -13.5; x <= 13.51; x += STEP) {
            for (let z = -13.5; z <= 13.51; z += STEP) {
                if (free(x, z)) cell.set(x.toFixed(1) + "," + z.toFixed(1), NAV.add(x, z, 3, "hall"));
            }
        }
        const segFree = (a, b) => {
            for (let t = 0.25; t < 1; t += 0.25) {
                if (!free(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false;
            }
            return true;
        };
        for (const n of cell.values()) {
            for (const [dx, dz] of [[STEP, 0], [0, STEP], [STEP, STEP], [STEP, -STEP]]) {
                const m2 = cell.get((n.x + dx).toFixed(1) + "," + (n.z + dz).toFixed(1));
                if (m2 && segFree(n, m2)) NAV.link(n, m2);
            }
        }
        // the foot of the roof stairs joins the nearest free cell
        let best = null, bd = 1e9;
        for (const n of cell.values()) {
            const d = Math.hypot(n.x - NAV.stairTop.x, n.z - NAV.stairTop.z);
            if (d < bd) { bd = d; best = n; }
        }
        if (best) NAV.link(NAV.stairTop, best);
        this.terraceCells = cell.size;

        // ---- the BACK STAIRS (the iron spiral tower outside the hostel): over the bridge and down the spiral ----
        // (the same numbers as SPIRAL in spiral.js: centre -20.5,12, 16 treads a turn, 44 treads, 12 m high)
        {
            const SP = { cx: -20.5, cz: 12.0, per: 16, n: 44, top: 12 };
            const dA = (Math.PI * 2) / SP.per, rise = SP.top / SP.n;
            const a0 = -((SP.n - 1) % SP.per + 0.5) * dA;
            const ang = (j) => a0 + (j % SP.per + 0.5) * dA;
            const sp = (x, z, y, type) => NAV.add(x, z, floorOf(y), type, { y, spiral: true });

            // the door at the top of the stairs + the bridge
            const dN = sp(-14.1, 12.0, 12, "stair");
            const b1 = sp(-16.2, 12.0, 12, "stair");
            const b2 = sp(-17.7, 12.0, 12, "stair");

            // nearest terrace cell to the door
            let tb = null, td = 1e9;
            for (const c of cell.values()) {
                const d = Math.hypot(c.x - dN.x, c.z - dN.z);
                if (d < td) { td = d; tb = c; }
            }
            if (tb && td < 6) NAV.link(tb, dN);
            NAV.link(dN, b1);
            NAV.link(b1, b2);

            // down the spiral: a node every two treads, halfway out on the tread
            let prev = b2;
            for (let j = SP.n - 1; j >= 1; j -= 2) {
                const a = ang(j);
                const r = j === SP.n - 1 ? 1.9 : 1.5;
                const n = sp(SP.cx + Math.cos(a) * r, SP.cz + Math.sin(a) * r, (j + 1) * rise, "stair");
                NAV.link(prev, n);
                prev = n;
            }

            // the foot of the stairs (inside the fence): he can walk there to look around
            const af = ang(0);
            const foot = NAV.add(SP.cx + Math.cos(af) * 1.9, SP.cz + Math.sin(af) * 1.9, 0, "room", { y: rise, spiral: true });
            NAV.link(prev, foot);

            this.spiralNodes = NAV.nodes.filter((q) => q.spiral).length;
            this.spiralLinked = !!(tb && td < 6);

            // a self-check: a path must exist from the roof stairs down to the foot of the back stairs
            const pth = findPath(NAV.stairTop.i, foot.i);

            this.spiralPathLen = pth ? pth.length : 0;

            // and one from the far end of the ground floor out to every bit of lawn
            const start = NAV.lane[0]["-1"][0].i;

            this.yardOk = NAV.nodes.filter((q) => q.yard).every((q) => { const w = findPath(start, q.i); return !!w && w.length > 1; });
        }
    }

    // every place where the player could hide (cabinets, tables, beds)
    getSpots() {

        if (this.spots) return this.spots;

        const list = [];

        for (const o of this.inter.interactableObjects) {

            if (!o.userData || !o.userData.hideAt) continue;
            if (o.userData.key === "C") continue;           // sitting / sleeping

            let s;

            try { s = o.userData.hideAt(); } catch (e) { continue; }

            if (!s || !s.pos || !s.exit) continue;

            list.push({
                pos: s.pos.clone(),
                exit: s.exit.clone(),
                fl: floorOf(s.pos.y - EYE)
            });
        }

        this.spots = list;

        return list;
    }

    // ==================================================
    // LIFE CYCLE
    // ==================================================
    setDifficulty(name) {

        if (!GHOST_CFG.levels[name]) return;

        this.diffName = name;
        this.L = GHOST_CFG.levels[name];

        try { localStorage.setItem("haven_ghost_difficulty", name); } catch (e) { /* ok */ }

        this.refreshUI();
    }

    // a new game (or Retry): exactly one ghost, nowhere yet
    reset(enable) {

        this.enabled = enable !== false;

        this.doorSpawn = null;

        this.despawn(true);

        this.clearBrain();

        this.kill = null;
        this.dead = false;
        this.state = "away";
        this.cool = rnd(GHOST_CFG.firstSpawnDelay[0], GHOST_CFG.firstSpawnDelay[1]);
        this.warn = 0;
        this.warnCd = 6;
        this.noiseLevel = 0;
        this.witness = null;
        this.seen = false;
        this.seenAt = -99;
        this.loseT = 0;
        this.hearT = 0;
        this.targets = [];
        this.spawnPlan = null;
        this.visitedNodes.clear();
        this.patrolFl = null;
        this.suspended = false;
        this.summoned = false;

        ghostFx.power = 0;
        ghostFx.flashlight = 0;
        audio.ghostFear = 0;

        this.hideDeath();
        this.flash(0);
    }

    // menu / pause: the ghost is not shown
    suspend(on) {
        if (this.model) this.model.setVisible(!on && this.visible);
    }

    get cinematic() {
        return !!this.kill;
    }

    // ==================================================
    // SPAWNING
    // ==================================================
    despawn(silent) {

        this.visible = false;
        this.model.setVisible(false);
        this.model.root.position.y = -50;
        audio.stopGhostWalk();
        this.path = [];
        this.dest = null;
        this.stairing = null;
        this.checking = null;
        this.state = "away";
        ghostFx.power = 0;

        // whatever scene he was in is over
        this.aggroDelay = 0;
        this.idle = null; this.stalk = null; this.knock = null; this.watch = null; this.feint = null;
        this.silent = false; this.gait = "walk"; this.gaitT = 0; this.checkStyle = null;
        this.bpReset();

        if (!silent) this.cool = rnd(this.L.cooldown[0], this.L.cooldown[1]);
    }

    // is a world position in front of the player's camera?
    inView(x, z, cone) {

        const c = this.camera.position;

        this.camera.getWorldDirection(this.v1);

        const dx = x - c.x, dz = z - c.z;

        const d = Math.hypot(dx, dz) || 1;

        return (this.v1.x * dx + this.v1.z * dz) / (Math.hypot(this.v1.x, this.v1.z) || 1) / d > cone;
    }

    // does the player have a clear view of the ghost right now?
    playerSeesGhost() {

        const p = this.camera.position;

        const g = this.model.root.position;

        if (Math.hypot(p.x - g.x, p.z - g.z) > 40) return false;

        // another floor (the slabs are not in the line-of-sight lists)
        if (Math.abs(p.y - (g.y + EYE)) > 3.2) return false;

        if (!this.inView(g.x, g.z, 0.2)) return false;

        this.v1.set(p.x, p.y, p.z);

        this.v2.set(g.x, g.y + EYE, g.z);

        return this.los(this.v1, this.v2, this.fl);
    }

    playerFloor() {
        return floorOf(this.player.pos.y - EYE);
    }

    playerInside() {
        const p = this.camera.position;
        // the terrace (on the roof) counts as inside: he walks up there too
        return Math.abs(p.x) < 15.2 && Math.abs(p.z) < 15.2;
    }

    // choose where he will appear (never in view, never locked, never unfair)
    chooseSpawn() {

        const p = this.camera.position;
        const pf = this.playerFloor();
        const near = Math.random() < this.L.near;

        const hidden = this.player.hidden;

        const tries = [];

        for (const n of NAV.nodes) {

            if (n.locked) continue;
            if (n.type === "door") continue;

            const d = Math.hypot(n.x - p.x, n.z - p.z) + Math.abs(n.fl - pf) * 14;

            let ok;

            if (near) ok = d > GHOST_CFG.nearMinDist && d < 20;
            else ok = d > Math.max(GHOST_CFG.spawnMinDist, hidden ? 16 : 0);

            if (!ok) continue;

            // never in front of the player's face
            if (this.inView(n.x, n.z, near ? -0.2 : 0.15) && n.fl === pf && d < 40) {
                if (!near) continue;
            }

            // "near" spawns: only behind or beside the player
            if (near && this.inView(n.x, n.z, 0.35) && n.fl === pf) continue;

            // not where a ray from the player reaches him
            if (n.fl === pf && d < 28) {
                this.v1.set(p.x, p.y, p.z);
                this.v2.set(n.x, n.y + EYE, n.z);
                if (this.los(this.v1, this.v2, pf)) continue;
            }

            tries.push(n);
        }

        if (!tries.length) return null;

        // a few extra "far at the end of the hall" candidates for the rare statue
        return pick(tries);
    }

    beginSpawn() {

        // the very first time: he comes out of the main door (the door that was just unlocked)
        let n = null, fromDoor = false;

        if (this.doorSpawn) {

            fromDoor = true;


            n = nearestNode(this.doorSpawn.x, this.doorSpawn.z, 0, ["hall", "door", "room"]);

            this.doorSpawn = null;
        }

        if (!n) n = this.chooseSpawn();

        if (!n) {
            this.cool = 6;
            return;
        }

        this.spawnPlan = { node: n, t: fromDoor ? rnd(1.2, 2.0) : rnd(2.5, 4.5) };

        this.state = "pending";

        // before he is seen: a sound from the place he is about to appear
        audio.ghostSfx(pick(["ropeScrape", "breath", "ropeScrape"]), n.x, n.y + 1.3, n.z, 0.9);

        ghostFx.x = n.x;
        ghostFx.z = n.z;
        ghostFx.y = n.y;
        ghostFx.power = 0.8;
    }

    finishSpawn() {

        const plan = this.spawnPlan;

        const n = plan.node;

        this.spawnPlan = null;

        const m = this.model.root;

        m.position.set(n.x, n.y, n.z);

        this.gy = n.y;
        this.fl = n.fl;
        this.stairing = null;
        this.curNode = n;
        this.yaw = Math.random() * Math.PI * 2;

        // at the end of a hall, far from the player: the rare "statue"
        const p = this.camera.position;
        const far = Math.hypot(n.x - p.x, n.z - p.z);

        let mode = "wander";

        if (n.type === "hall" && n.fl === this.playerFloor() &&
            far > 16 && far < 30 && Math.random() < GHOST_CFG.statueChance * 3) {

            mode = "statue";
        }
        else if (n.type === "room" && n.fl === this.playerFloor() &&
                 far < 24 && Math.random() < GHOST_CFG.roomStandChance * 2) {

            mode = "stand";
        }

        // a scene chosen by the director (stalking, knocking, watching ...)
        if (plan.mode) mode = "wander";

        this.visible = true;
        this.model.setVisible(true);
        this.model.rope.reset(this.model.handPos(this.hand));
        this.model.root.visible = true;

        this.life = rnd(this.L.life[0], this.L.life[1]);
        this.flickerT = 0.9;           // he blinks into existence

        this.speed = 0;
        this.path = [];
        this.dest = null;
        this.pause = 0.2;
        this.state = mode;
        this.statueT = rnd(5, 8);

        if (mode === "statue" || mode === "stand") {
            this.faceTo(p.x, p.z, true);
        }

        if (plan.mode) this.brainEnter(plan.mode, plan.data);

        events.emit("ghost-spawn", { x: n.x, z: n.z, mode: plan.mode || mode });
    }

    // ==================================================
    // SENSES
    // ==================================================
    // can a ray from a to b (both in world space) pass? (walls / doors block)
    los(a, b, fl) {

        const dir = this.v3.subVectors(b, a);

        const dist = dir.length();

        if (dist < 0.01) return true;

        dir.multiplyScalar(1 / dist);

        this.ray.set(a, dir);
        this.ray.near = 0;
        this.ray.far = dist - 0.2;

        const hits = this.ray.intersectObjects(this.losLists[clamp(fl, 0, 3)], false);

        return hits.length === 0;
    }

    isHiding() {
        const p = this.player;
        return p.hidden && !(p.hideSpot && p.hideSpot.rest);
    }

    addNoise(r) {
        this.noiseLevel = Math.max(this.noiseLevel, r);
    }

    // does he see the player right now?
    canSee(range) {

        const c = this.camera.position;
        const e = this.eye;

        const dy = c.y - e.y;

        if (Math.abs(dy) > 2.8) return false;

        const dx = c.x - e.x, dz = c.z - e.z;

        const dist = Math.hypot(dx, dz);

        if (dist > range) return false;

        const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);

        const dot = (dx * fx + dz * fz) / (dist || 1);

        // inside the cone of his eyes; during a chase he turns to follow you (all round);
        // very close he notices you from any side (as a real person would)
        const fov = this.state === "chase" ? 360 : this.L.fov;

        const half = (fov * Math.PI / 180) / 2;

        if (dist > this.L.nearSense && Math.acos(clamp(dot, -1, 1)) > half) return false;

        // a hidden player is never SEEN: he is found only by being witnessed
        // going in, or by a check of his hiding place (resolveCheck)
        if (this.isHiding()) return false;

        return this.los(e, c, this.fl);
    }

    senses(dt) {

        // ---- how loud is the player? ----
        const p = this.player;

        const k = p.keys;

        const moving = k.forward || k.back || k.left || k.right;

        if (!p.hidden && moving && !(p.swing)) {
            this.addNoise(k.run ? 15 : 6.5);
        }

        this.noiseLevel = Math.max(0, this.noiseLevel - dt * 14);

        // a hidden player cannot be seen, whatever the last ray said
        if (this.seen && this.isHiding()) this.seen = false;

        // ---- the sight ray (a few times per second) ----
        this.losT -= dt;

        if (this.losT <= 0) {

            this.losT = this.state === "chase" ? 0.1 : 0.16;

            let range = this.L.vision;

            if (this.state === "chase") range *= 1.35;

            // his light-blind eyes see a lit torch further
            if (!this.isHiding()) range *= 1.0;

            // outside the hostel he cannot see in
            this.seen = this.playerInside() && this.canSee(range);

            if (this.seen) {
                this.seenAt = this.clock;
                this.lastKnown.copy(this.camera.position);
                this.lastKnown.y = this.player.pos.y;
            }
        }

        // ---- the hearing ----
        this.hearT -= dt;

        if (this.hearT <= 0 && this.noiseLevel > 0.5) {

            this.hearT = 0.3;

            if (!this.playerInside()) return;

            const c = this.camera.position;

            const dx = c.x - this.model.root.position.x;
            const dz = c.z - this.model.root.position.z;
            const dy = Math.abs(c.y - this.eye.y);

            // sound carries badly through floors
            const eff = Math.hypot(dx, dz) + dy * 2.6;

            if (eff < this.noiseLevel * this.L.hear) {

                this.onHeard(c);
            }
        }
    }

    onHeard(pos) {

        if (this.state === "chase" || this.state === "kill") return;
        if (this.state === "away" || this.state === "pending") return;
        if (this.state === "statue") {
            this.vanish();
            return;
        }

        // his idea of where the noise was is a little off
        this.noiseAt.set(pos.x + rnd(-1.8, 1.8), this.player.pos.y, pos.z + rnd(-1.8, 1.8));

        this.lastKnown.copy(this.noiseAt);

        // the scenes of the director (stalking, knocking, watching) are not interrupted by noises
        if (this.state === "stalk" || this.state === "knock" || this.state === "watch") return;

        if (this.state === "feint") { this.feint = null; this.silent = false; this.state = "wander"; }

        if (this.state === "wander" || this.state === "stand") {
            this.state = "suspicious";
            this.idle = null;
            this.gait = "walk";
            this.searchKind = "heard";
            this.goTo(this.noiseAt.x, this.noiseAt.z, floorOf(pos.y - EYE));
            this.pause = rnd(0.7, 1.6);          // he stops, turns his head, listens ... then comes
            audio.ghostSfx("breath", this.model.root.position.x, this.eye.y, this.model.root.position.z, 0.8);
        }
        else if (this.state === "suspicious" || this.state === "search") {
            // retarget to the new noise
            this.goTo(this.noiseAt.x, this.noiseAt.z, floorOf(pos.y - EYE));
            if (this.state === "search") this.searchT = Math.max(this.searchT, rnd(this.L.search[0], this.L.search[1]) * 0.6);
        }
    }

    // the player has just crept into a cupboard / under a bed
    onPlayerHide() {

        if (!this.enabled || !this.visible || this.kill) return;

        const sp = this.player.hideSpot;

        if (!sp || sp.rest) return;

        // did he see you do it?
        const sawIt = (this.clock - this.seenAt) < 3.2 || (this.state === "chase" && this.model.root.position.distanceTo(this.player.pos) < 22);

        this.seen = false;
        this.losT = 0.16;

        if (sawIt && this.state !== "away" && this.state !== "pending") {

            this.witness = {
                pos: sp.pos.clone(),
                exit: sp.exit.clone(),
                fl: floorOf(sp.pos.y - EYE)
            };

            this.lastKnown.copy(sp.pos);

            this.beginSearch(this.witness.exit, this.witness.fl, true);
        }
        else {
            // heard a faint click at most
            this.addNoise(3);
        }
    }

    // ==================================================
    // MOVEMENT
    // ==================================================
    faceTo(x, z, snap) {

        const want = Math.atan2(x - this.model.root.position.x, z - this.model.root.position.z);

        if (snap) this.yaw = want;
        else this.yaw += angDiff(this.yaw, want);
    }

    // plan a walk to (x, z) on floor `fl`
    goTo(x, z, fl) {

        const pos = this.model.root.position;

        // in the middle of a flight he first finishes the flight (this is what
        // used to leave him stuck on the stairs), then he plans the rest
        // (and he never turns back to a node behind him: a new plan starts at the
        // node he is already walking towards, so slow walking can not stall him)
        let lead = null;

        if (this.stairing) lead = NAV.nodes[this.stairing.to];
        else if (this.path.length && this.pathI < this.path.length) lead = NAV.nodes[this.path[this.pathI]];

        const from = lead || this.nodeAtFeet();

        const to = nearestNode(x, z, fl, ["hall", "room", "door", "stair"]);

        if (!from || !to) {
            this.path = [];
            this.dest = { x, z, fl };
            return false;
        }

        const path = findPath(from.i, to.i);

        if (!path) {
            this.path = [];
            this.dest = null;
            return false;
        }

        this.path = path;
        this.pathI = (!lead && path.length > 1 && path[0] === from.i && this.nearNode(from, 1.2)) ? 1 : 0;
        this.dest = { x, z, fl };

        return true;
    }

    nearNode(n, r) {
        const p = this.model.root.position;
        return Math.hypot(p.x - n.x, p.z - n.z) < r;
    }

    // the graph node he is standing at / nearest to
    nodeAtFeet() {

        const p = this.model.root.position;

        return nearestNode(p.x, p.z, this.fl);
    }

    // returns true when he has arrived
    advance(dt, speed, turn) {

        const pos = this.model.root.position;

        this.prevX = pos.x;
        this.prevZ = pos.z;

        let wx, wz, n = null, edge = null, final = false;

        if (this.pathI < this.path.length) {

            n = NAV.nodes[this.path[this.pathI]];

            wx = n.x;
            wz = n.z;

            if (this.pathI > 0) {
                edge = edgeBetween(this.path[this.pathI - 1], this.path[this.pathI]);
            }
            else if (this.stairing && n.i === this.stairing.to) {
                edge = edgeBetween(this.stairing.from, this.stairing.to);
            }
        }
        else if (this.dest) {

            wx = this.dest.x;
            wz = this.dest.z;
            final = true;
        }
        else {
            this.path = [];
            this.pathI = 0;
            this.speed = 0;
            return true;
        }

        const dx = wx - pos.x, dz = wz - pos.z;

        const dist = Math.hypot(dx, dz);

        const onStairs = !!(edge && edge.stair);

        if (onStairs && n && (!this.stairing || this.stairing.to !== n.i)) {
            this.stairing = { from: this.path[this.pathI - 1], to: n.i };
        }

        // ---- reached the waypoint ----
        if (dist < (final ? 0.5 : 0.4)) {

            if (final) {
                this.dest = null;
                this.path = [];
                this.pathI = 0;
                this.speed = 0;
                return true;
            }

            this.curNode = n;

            this.fl = n.fl;

            this.visitedNodes.add(n.i);

            if (this.stairing && n.i === this.stairing.to) this.stairing = null;

            this.pathI++;

            this.blocked = 0;

            return false;
        }

        // ---- doors ahead: open them ----
        if (!onStairs) this.doorsAhead(wx, wz);

        // ---- turn, then walk ----
        const want = Math.atan2(dx, dz);

        const diff = angDiff(this.yaw, want);

        const maxTurn = turn * dt;

        this.yaw += clamp(diff, -maxTurn, maxTurn);

        let move = 0;

        if (Math.abs(diff) < 0.9) move = speed * dt * (1 - Math.min(0.6, Math.abs(diff) * 0.5));

        if (move > dist) move = dist;

        let nx = pos.x + Math.sin(this.yaw) * move;
        let nz = pos.z + Math.cos(this.yaw) * move;

        if (!onStairs && move > 0) {

            if (this.free(nx, nz)) {
                this.blocked = Math.max(0, this.blocked - dt);
            }
            else {

                // blocked: slide along the obstacle, or step round it
                let ok = false;

                const tries = [
                    [pos.x + Math.sin(this.yaw) * move, pos.z],
                    [pos.x, pos.z + Math.cos(this.yaw) * move]
                ];

                for (const a of [0.55, -0.55, 1.1, -1.1, 1.6, -1.6]) {
                    tries.push([
                        pos.x + Math.sin(this.yaw + a) * move,
                        pos.z + Math.cos(this.yaw + a) * move
                    ]);
                }

                for (const t of tries) {

                    // never step further from the waypoint than a small detour
                    if (Math.hypot(wx - t[0], wz - t[1]) > dist + move * 0.9) continue;

                    if (this.free(t[0], t[1])) {
                        nx = t[0];
                        nz = t[1];
                        ok = true;
                        break;
                    }
                }

                if (ok) {
                    this.blocked = Math.max(0, this.blocked - dt * 0.5);
                }
                else {
                    nx = pos.x;
                    nz = pos.z;
                    this.blocked += dt;
                }
            }
        }

        // ---- stuck recovery ----
        if (this.blocked > 0.7) this.doorsAhead(wx, wz, true);

        if (this.blocked > 2.2 && n && !this.stairing) {
            // slide the waypoint away or skip it
            this.pathI++;
            this.blocked = 0;
        }

        if (this.blocked > 3.5 && !this.stairing) {
            // truly stuck: drop this destination (he will choose another)
            this.blocked = 0;
            this.path = [];
            this.pathI = 0;
            this.dest = null;
            this.speed = 0;

            // ... and if that happens again and again, put him on a free spot (see unstick)
            this.dropCount = (this.dropT > 0 ? (this.dropCount || 0) : 0) + 1;
            this.dropT = 25;
            if (this.dropCount >= 2) { this.dropCount = 0; this.needUnstick = true; }

            return true;
        }

        pos.x = nx;
        pos.z = nz;

        // ---- height ----
        let targetY;

        if (onStairs) {

            const a = NAV.nodes[this.pathI > 0 ? this.path[this.pathI - 1] : this.stairing.from];
            const b = n;

            targetY = stairY(Math.min(a.y, b.y), pos.z);

            this.gy = targetY;
        }
        else {

            targetY = n ? n.y : FLOORS[this.fl];

            this.gy += (targetY - this.gy) * Math.min(1, dt * 6);
        }

        pos.y = this.gy;

        this.speed = Math.hypot(nx - this.prevX, nz - this.prevZ) / Math.max(dt, 1e-4);

        return false;
    }

    free(x, z) {

        this.cpos.set(x, this.gy + EYE, z);

        // chairs, beds, trunks, benches ...: a ghost walks through them (walls and CLOSED doors still stop him)
        if (!this._ign || this._ignN !== this.cs.objects.length) {

            this._ign = new Set(this.cs.objects.filter((o) => o.userData && o.userData.furniture));

            this._ignN = this.cs.objects.length;

            this._ignSig = "";
        }

        // An OPEN door leaf swings into the corridor and used to block the lane he walks in (that is
        // what trapped him in the halls).  An open leaf is brushed aside: it never stops him.
        let sig = "";

        for (const dd of this.doors) if (dd.d.isOpen) sig += dd.mesh.id + ",";

        if (sig !== this._ignSig) {

            this._ignAll = new Set(this._ign);

            for (const dd of this.doors) if (dd.d.isOpen) this._ignAll.add(dd.mesh);

            this._ignSig = sig;
        }

        return !this.cs.check(this.cpos, 0.3, EYE, this._ignAll || this._ign);
    }

    // open any closed room door in front of the ghost (silently for the achievements)
    doorsAhead(wx, wz, force) {

        const pos = this.model.root.position;

        // the door at the top of the back stairs
        if (!SPIRAL_OPEN && this.fl === 3 && Math.hypot(pos.x + 14.1, pos.z - 12) < 3.4) events.emit("ghost-opens-spiral-door");

        for (const dd of this.doors) {

            if (dd.fl !== this.fl) continue;
            if (dd.d.isOpen) continue;

            const cx = dd.x - pos.x, cz = dd.z - pos.z;

            // the big main door is opened from a bit further away
            const reach = dd.d.kind === "main" ? 3.4 : (force ? 1.6 : 1.5);

            if (Math.hypot(cx, cz) > reach + 0.7) continue;

            // only the doors that lie along his way
            const ax = wx - pos.x, az = wz - pos.z;

            const al = Math.hypot(ax, az) || 1;

            if ((cx * ax + cz * az) / al < -0.2 && !force) continue;

            this.openDoor(dd, true);

            this.doorReach = 0.7;
            this.doorPos = this.doorPos || new THREE.Vector3();
            this.doorPos.set(dd.x, dd.y, dd.z);
        }
    }

    // ------------------------------------------------------------------
    // ANTI-STUCK.  If he has been going nowhere for a long time, or keeps giving up his
    // destination at the same place, he is put on the nearest free spot of the map
    // (never in front of your eyes: then he simply fades away and appears somewhere else).
    // ------------------------------------------------------------------
    unstick(why) {

        const pos = this.model.root.position;

        this.stuckCount = (this.stuckCount || 0) + 1;

        this.stuckWhy = why;

        if (this.playerSeesGhost() && this.state !== "chase") { this.vanish(); return; }

        let best = null, bd = 1e9;

        for (const n of NAV.nodes) {

            if (n.locked || (n.spiral && !SPIRAL_OPEN)) continue;
            if (Math.abs(n.y - this.gy) > 1.6) continue;

            const d = Math.hypot(n.x - pos.x, n.z - pos.z);

            if (d < bd && d < 12 && this.free(n.x, n.z)) { bd = d; best = n; }
        }

        if (!best) { this.vanish(); return; }

        pos.x = best.x;
        pos.z = best.z;
        this.gy = best.y;
        pos.y = this.gy;
        this.fl = best.fl;
        this.curNode = best;
        this.path = [];
        this.pathI = 0;
        this.dest = null;
        this.blocked = 0;
        this.stairing = null;
        this.pause = 0.4;

        if (this.state === "chase") this.lastKnown = null;
    }

    // called every frame: has he made any progress?
    watchdog(dt) {

        const pos = this.model.root.position;

        const wd = this.wd || (this.wd = { x: pos.x, z: pos.z, t: 0, st: this.state, drops: 0, dropT: 0 });

        if (this.dropT > 0) { this.dropT -= dt; if (this.dropT <= 0) this.dropCount = 0; }

        // a broken position is repaired at once
        if (!isFinite(pos.x) || !isFinite(pos.z) || !isFinite(pos.y) || Math.abs(pos.x) > 70 || Math.abs(pos.z) > 70 || pos.y < -30 || pos.y > 40) {

            this.gy = FLOORS[clamp(this.fl | 0, 0, 3)];
            pos.set(0, this.gy, LANE_Z);
            this.path = []; this.pathI = 0; this.dest = null;
            return;
        }

        // standing still on purpose is fine (listening, staring, checking, knocking ...)
        const idle = this.pause > 0 || this.linger > 0 || this.checking || this.idle || this.state === "statue" || this.state === "stand" ||
            this.state === "away" || this.state === "pending" || this.state === "fade" || this.state === "kill" || this.state === "cellar" || this.suspended ||
            this.stairing || this.waitT > 0 || this.stalk || this.knock || this.watch || this.feint;

        const moved = Math.hypot(pos.x - wd.x, pos.z - wd.z);

        if (moved > 0.8 || idle || this.state !== wd.st) {

            wd.x = pos.x; wd.z = pos.z; wd.t = 0; wd.st = this.state;
            return;
        }

        wd.t += dt;

        if (wd.t > 14) { wd.t = 0; this.unstick("no progress in state " + this.state); }
    }

    openDoor(dd, open) {

        const d = dd.d;

        if (d.isOpen === open) return;

        // when he is not hunting he opens doors SLOWLY, with a long creak
        const slow = open && this.state !== "chase" && this.state !== "kill" && d.kind === "room";

        if (slow) {

            this.slowDoors.push({ d, speed: d.speed, silent: d.silent, t: 3.2 });

            d.speed = 1.2;
        }

        d.silent = true;

        d.setOpen(open);

        d.silent = false;

        if (slow) audio.creak(dd.x, 1.2, dd.z, 0.55);
        else audio.door(d.kind, dd.x, dd.y, dd.z, open);
    }

    // a door that stirs by itself when he is near
    nudgeDoor() {

        const pos = this.model.root.position;

        let best = null, bd = 7;

        for (const dd of this.doors) {

            if (dd.fl !== this.fl || dd.d.isOpen) continue;

            const d = Math.hypot(dd.x - pos.x, dd.z - pos.z);

            if (d < bd) { bd = d; best = dd; }
        }

        if (!best) return;

        const d = best.d;

        const dir = d.open > d.closed ? 1 : -1;

        d.target = d.closed + dir * 0.16;

        audio.door("room", best.x, best.y, best.z, true);

        setTimeout(() => {
            if (!d.isOpen) d.target = d.closed;
        }, 650);
    }

    // ==================================================
    // FOOTSTEPS (called by the walk animation)
    // ==================================================
    onStep(side, run) {
        // the footsteps are one looping sound that follows him
        // (audio.ghostWalk, called every frame in update())
    }

    // ==================================================
    // BEHAVIOURS
    // ==================================================
    // He sometimes goes back to a room he checked a moment ago ("did I miss something?"):
    // the same room can be inspected twice (the hiding places inside still follow the fair rules).
    pickWanderTarget() {

        if (!this.playerInCellar() && this.recentRooms.length > 2 && Math.random() < 0.12) {

            const c = this.recentRooms[Math.floor(Math.random() * (this.recentRooms.length - 1))];

            if (c && !c.locked && !(c.yard && !YARD_OPEN) && !(c.spiral && !SPIRAL_OPEN)) return c;
        }

        const n = this.pickWanderTargetBase();

        if (n && n.type === "room") {

            this.recentRooms.push(n);

            if (this.recentRooms.length > 6) this.recentRooms.shift();
        }

        return n;
    }

    pickWanderTargetBase() {

        // somebody is down in the cellar: he walks to Room 106, above the trapdoor
        if (this.playerInCellar()) {

            let best = null, bd = 1e9;

            for (const n of NAV.nodes) {

                if (n.type !== "room" || n.locked || n.room !== 106) continue;

                const d = Math.hypot(n.x - CELLAR.hatchX, n.z - CELLAR.hatchZ);

                if (d < bd) { bd = d; best = n; }
            }

            if (best) return best;
        }

        const seenSet = this.visitedNodes;

        const nodesOf = (f) => NAV.nodes.filter((n) => n.fl === f && !n.locked && !(n.yard && !YARD_OPEN) && !(n.spiral && !SPIRAL_OPEN) &&
            (n.type === "hall" || n.type === "room" || n.type === "stair"));

        // what is still to do on a floor: every ROOM he has not been in (halls and
        // stairs count only on floors without rooms, like the terrace)
        const todo = (f) => {

            const all = nodesOf(f);

            const rooms = all.filter((n) => n.type === "room");

            if (rooms.length) return rooms.filter((n) => !seenSet.has(n.i));

            // a floor without rooms (the terrace): three places are enough, then he
            // walks on to the next floor instead of searching the whole roof
            const doneHere = all.filter((n) => seenSet.has(n.i)).length;

            return doneHere >= 3 ? [] : all.filter((n) => !seenSet.has(n.i));
        };

        const floors = [0, 1, 2, 3].filter((f) => nodesOf(f).length > 0);

        // he searches ONE floor room by room, then walks up or down to the nearest
        // floor that still has rooms he has not been in; when the whole hostel
        // is done he starts again
        if (this.patrolFl === null || floors.indexOf(this.patrolFl) < 0) {
            this.patrolFl = floors.indexOf(this.fl) >= 0 ? this.fl : floors[0];
        }

        let list = todo(this.patrolFl);

        if (!list.length) {

            let cand = floors.filter((f) => f !== this.patrolFl && todo(f).length > 0);

            if (!cand.length) {

                seenSet.clear();

                cand = floors.filter((f) => f !== this.patrolFl);

                if (!cand.length) cand = floors;
            }

            cand.sort((a, b) => Math.abs(a - this.patrolFl) - Math.abs(b - this.patrolFl));

            this.patrolFl = cand[0];

            list = todo(this.patrolFl);
        }

        const here = this.model.root.position;

        // the nearest few: he goes room after room along the corridor
        const near = list.slice().sort((a, b) =>
            (Math.hypot(a.x - here.x, a.z - here.z) + Math.abs(a.fl - this.fl) * 12) -
            (Math.hypot(b.x - here.x, b.z - here.z) + Math.abs(b.fl - this.fl) * 12));

        const n = pick(near.slice(0, Math.min(3, near.length)));

        seenSet.add(n.i);

        return n;
    }

    // back to walking round the hostel (slowly, all floors, never standing still)
    toWander() {

        this.state = "wander";

        this.path = [];

        this.dest = null;

        this.checking = null;

        this.targets = [];

        this.cur = null;

        this.linger = 0;

        this.afterLinger = false;

        this.pause = 0.2;
    }

    beginSearch(center, fl, urgent) {

        // Without a witness he does not KNOW where you are: he looks round where he lost you or
        // where he heard you, checks a few places (rooms, cupboards, beds ...) and gives up.
        // A noise that turns out to be nothing is dropped quickly (sometimes at once).
        if (!this.witness) {

            this.searchKind = urgent ? "lost" : "heard";

            if (!urgent && !this.forceSearch && Math.random() < 0.28) { this.toWander(); return; }

            this.forceSearch = false;
        }

        this.state = "search";

        this.searchT = rnd(this.L.search[0], this.L.search[1]) * (this.witness ? 1 : (urgent ? 1 : 0.6));

        if (urgent) this.searchT *= 1.1;

        this.linger = 0;
        this.checking = null;

        // the one hiding place he saw you use: straight there, no other places
        if (this.witness) {

            this.searchT = 12;

            this.targets = [{ kind: "spot", spot: this.witness, sure: true }];

            this.tIdx = 0;

            this.nextTarget();

            return;
        }

        // targets: the centre, the hiding places near it, a couple of rooms
        const list = [];

        const c = { x: center.x, z: center.z, fl };

        // the hiding place he SAW you use comes first (he goes straight to it);
        // otherwise he starts at the place where he lost you
        if (this.witness) {
            list.push({ kind: "spot", spot: this.witness, sure: true });
            list.push({ kind: "point", x: c.x, z: c.z, fl });
        }
        else {
            list.push({ kind: "point", x: c.x, z: c.z, fl });
        }

        const spots = this.getSpots()
            .filter((s) => s.fl === fl && Math.hypot(s.exit.x - c.x, s.exit.z - c.z) < 15)
            .sort((a, b) => Math.hypot(a.exit.x - c.x, a.exit.z - c.z) - Math.hypot(b.exit.x - c.x, b.exit.z - c.z));

        for (const s of spots) {
            if (this.witness && Math.hypot(s.pos.x - this.witness.pos.x, s.pos.z - this.witness.pos.z) < 0.6) continue;
            if (Math.random() < this.L.checkHide) list.push({ kind: "spot", spot: s });
        }

        const rooms = NAV.nodes.filter((n) => n.fl === fl && n.type === "room" && !n.locked && !n.yard && !n.spiral &&
            Math.hypot(n.x - c.x, n.z - c.z) < 14).sort(() => Math.random() - 0.5).slice(0, 2);

        for (const r of rooms) list.push({ kind: "point", x: r.x, z: r.z, fl });

        this.targets = list;
        this.tIdx = 0;

        this.nextTarget();
    }

    nextTarget() {

        if (this.tIdx >= this.targets.length) {
            // nothing left to check: stand and listen, then give up
            this.targets = [];
            this.dest = null;
            this.path = [];
            this.linger = rnd(1.5, 3.5);
            return;
        }

        const t = this.targets[this.tIdx++];

        this.cur = t;

        if (t.kind === "spot") {

            this.goTo(t.spot.exit.x, t.spot.exit.z, t.spot.fl);

            // the last leg is straight to the front of the cupboard
            this.dest = { x: t.spot.exit.x, z: t.spot.exit.z, fl: t.spot.fl };
        }
        else {
            this.goTo(t.x, t.z, t.fl);
        }

        this.linger = 0;
    }

    // he is standing in front of a hiding place
    resolveCheck(spot, sure) {

        this.checking = null;

        this.witness = null;

        const p = this.player;

        const inside = this.isHiding() && p.pos.distanceTo(spot.pos) < 1.3;

        if (!inside) return;

        // a seen hider is found; an unseen one only now and then (a little more often when the
        // same place is checked again, but never right after a close call)
        const chance = this.findChance(spot, sure);

        if (Math.random() < chance) {
            this.startKill(true);
        }
        else {
            // a close call: he leans in, listens, and moves on; this place can not find you again for a while
            audio.ghostSfx("breath", spot.exit.x, EYE, spot.exit.z, 1.0);
            this.addNoise(0);
            this.spotMercy.set(this.spotKey(spot), this.clock + 35);
        }
    }

    // ==================================================================
    //  THE BRAIN
    //  Everything below is behaviour on top of the states above (wander / suspicious / search /
    //  chase ...).  It makes the roaming alive (he stops, listens, tilts his head, looks behind
    //  him, crawls), makes searching smarter and makes the scary scenes rare, different every
    //  time, and fair (mercy time after an escape, hiding places never find you twice in a row).
    // ==================================================================
    initBrain() {

        // extra body pose asked of the model this frame (see ghostmodel.js update())
        this.bp = { look: null, tilt: 0, headYaw: null, headSnap: false, twitch: 0, open: undefined, leftTo: null, rightTo: null };

        this.idle = null;              // what he is doing while he stands still on his patrol
        this.gait = "walk";            // walk | crawl
        this.gaitT = 0;                // > 0 while he is getting up from a crawl
        this.mercy = 0;                // seconds after an escape in which no new scare starts
        this.visits = new Map();       // how many times each hiding place has been checked
        this.spotMercy = new Map();    // a hiding place that was a close call can not find you again at once
        this.silent = false;           // creeping: no footsteps, no chain
        this.chaseT = 0;
        this.searchKind = "lost";      // lost = he lost you in a chase, heard = he went to a noise
        this.feint = null;
        this.pSpd = 0;                 // how fast the player moves (for stalking)
        this.lastPX = null;
        this.lastPZ = null;

        // the director: when the bigger scenes may happen (seconds until the next try)
        this.dir = { ev: rnd(20, 36), stalk: rnd(55, 100), knock: rnd(75, 130), behind: rnd(70, 120), window: rnd(100, 160), shadow: rnd(35, 70) };

        this.stalk = null;
        this.knock = null;
        this.watch = null;
        this.props = [];
        this.fxBurst = null;
        this.slowDoors = [];
        this.recentRooms = [];
        this.stuckCount = 0;
    }

    // a new game / a restart: every scene, prop and memory of the brain is wiped
    clearBrain() {

        for (const pr of this.props || []) { this.scene.remove(pr.mesh); pr.mesh.geometry.dispose(); pr.mesh.material.dispose(); }

        for (const s of this.slowDoors || []) { s.d.speed = s.speed; s.d.silent = s.silent; }

        this.initBrain();
    }

    bpReset() {

        const b = this.bp;

        b.look = null; b.tilt = 0; b.headYaw = null; b.headSnap = false; b.twitch = 0;
        b.open = undefined; b.leftTo = null; b.rightTo = null;
    }

    // turn the body towards a point at a limited speed (rad/s)
    turnTo(x, z, rate, dt) {

        const pos = this.model.root.position;

        const want = Math.atan2(x - pos.x, z - pos.z);

        this.yaw += clamp(angDiff(this.yaw, want), -rate * dt, rate * dt);
    }

    // ------------------------------------------------------------------
    // standing still on patrol: observing, looking behind him, tilting his head, twitching ...
    // ------------------------------------------------------------------
    maybeIdle() {

        if (this.state !== "wander" || this.idle) return false;

        const r = Math.random();

        let kind = null;

        if (r < 0.34) kind = null;              // just walks on
        else if (r < 0.56) kind = "scan";
        else if (r < 0.68) kind = "lookBack";
        else if (r < 0.78) kind = "tilt";
        else if (r < 0.85) kind = "twitch";
        else if (r < 0.92) kind = "corner";
        else kind = "stare";

        if (!kind) return false;

        const D = { scan: [3, 6], lookBack: [3, 5], tilt: [2.4, 4.2], twitch: [1.3, 2.2], corner: [6, 12], stare: [3.5, 6.5] }[kind];

        this.idle = { kind, t: 0, dur: rnd(D[0], D[1]), s: Math.random() < 0.5 ? 1 : -1, yaw0: this.yaw, snd: false, face: null };

        // "corner": he turns his face to the nearest wall and stands silently
        if (kind === "corner") {

            const pos = this.model.root.position;

            let best = null;

            for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {

                if (!this.free(pos.x + dx * 1.1, pos.z + dz * 1.1)) { best = Math.atan2(dx, dz); break; }
            }

            this.idle.face = best;

            if (best === null) this.idle.kind = "scan";
        }

        return true;
    }

    runIdle(dt) {

        const id = this.idle;

        const bp = this.bp;

        const pos = this.model.root.position;

        id.t += dt;

        switch (id.kind) {

            case "scan":

                // a slow sweep of the head, left and right, like someone listening
                bp.headYaw = Math.sin(id.t * 0.85) * 1.05 * id.s;
                bp.tilt = Math.sin(id.t * 0.4) * 0.12;

                break;

            case "lookBack":

                // the head snaps round to look BEHIND him, holds ... then the body follows
                if (id.t > 0.7) { bp.headYaw = 2.65 * id.s; bp.headSnap = id.t < 1.0; }

                if (id.t > id.dur * 0.6) this.yaw += angDiff(this.yaw, id.yaw0 + Math.PI * id.s) * Math.min(1, dt * 1.6);

                if (!id.snd && id.t > 0.7) { id.snd = true; audio.creak(pos.x, this.eye.y, pos.z, 0.5); }

                break;

            case "tilt":

                // the unnatural tilt of the head
                bp.tilt = (0.6 + 0.2 * Math.sin(id.t * 1.1)) * id.s;
                bp.headYaw = Math.sin(id.t * 0.5) * 0.3;

                if (!id.snd && id.t > 0.5) { id.snd = true; audio.creak(pos.x, this.eye.y, pos.z, 0.45); }

                break;

            case "twitch":

                bp.twitch = id.t < id.dur - 0.2 ? 1 : 0;

                if (!id.snd) { id.snd = true; audio.ghostSfx("breath", pos.x, this.eye.y, pos.z, 0.7); }

                break;

            case "corner":

                if (id.face !== null) this.yaw += angDiff(this.yaw, id.face) * Math.min(1, dt * 1.2);

                bp.headYaw = Math.sin(id.t * 0.3) * 0.25;
                bp.tilt = 0.2 * id.s;

                if (!id.snd && id.t > 2.5) { id.snd = true; audio.ghostSfx("breath", pos.x, this.eye.y, pos.z, 0.55); }

                break;

            case "stare": {

                // he faces down the corridor and stares at nothing ... and if you are looking at him,
                // his head turns to YOU, slowly, and stays
                bp.headYaw = Math.sin(id.t * 0.6) * 0.18;

                if (id.t > 1.8 && this.playerSeesGhost()) {

                    const c = this.camera.position;

                    bp.headYaw = null;
                    bp.look = this.lookTarget.set(c.x, c.y - 0.1, c.z);
                    bp.tilt = 0.5;
                }

                break;
            }
        }

        if (id.t >= id.dur) {

            this.idle = null;

            this.pause = rnd(0.1, 0.5);
        }
    }

    // ------------------------------------------------------------------
    // SEARCHING: where he looks, how he checks a hiding place, and what happens at the end
    // ------------------------------------------------------------------
    // a hiding place is named by where it is
    spotKey(spot) { return Math.round(spot.pos.x) + "_" + Math.round(spot.pos.z) + "_" + spot.fl; }

    // the chance that a check finds an UNSEEN hider: a little higher each time the same place
    // is checked again, but never right after a close call (the player must not be punished twice)
    findChance(spot, sure) {

        if (sure) return 1.0;

        const key = this.spotKey(spot);

        if ((this.spotMercy.get(key) || 0) > this.clock) return 0;

        const n = this.visits.get(key) || 0;

        return Math.min(0.28, this.L.find * (1 + 0.45 * n));
    }

    // how a check looks and sounds: he listens for your breathing, knocks softly, or slowly opens it
    startCheckStyle(spot) {

        const r = Math.random();

        const style = r < 0.4 ? "listen" : r < 0.7 ? "knock" : "open";

        this.checkT = 0;

        this.checkStyle = style;

        this.checkSnd = 0;

        this.linger = style === "listen" ? rnd(2.6, 4.6) : style === "knock" ? rnd(2.8, 4.2) : rnd(2.2, 3.4);

        const key = this.spotKey(spot);

        this.visits.set(key, (this.visits.get(key) || 0) + 1);
    }

    // sounds while he stands at the hiding place (called every frame while checking)
    checkSounds(dt, spot) {

        this.checkT += dt;

        const x = spot.pos.x, z = spot.pos.z;

        const y = this.gy + 1.1;

        if (this.checkStyle === "knock") {

            if (this.checkSnd === 0 && this.checkT > 0.5) { this.checkSnd = 1; audio.knock(x, y, z, 0.5); }
            if (this.checkSnd === 1 && this.checkT > 1.2) { this.checkSnd = 2; audio.knock(x, y, z, 0.6); }
            if (this.checkSnd === 2 && this.checkT > 1.9) { this.checkSnd = 3; audio.ghostSfx("breath", x, y, z, 0.9); }
        }
        else if (this.checkStyle === "listen") {

            if (this.checkSnd === 0 && this.checkT > 0.4) { this.checkSnd = 1; audio.ghostSfx("breath", x, y, z, 0.8); }
            if (this.checkSnd === 1 && this.checkT > 1.8) { this.checkSnd = 2; audio.ghostWhisper(x, y, z, 0.45); }
        }
        else {

            if (this.checkSnd === 0 && this.checkT > 0.6) { this.checkSnd = 1; audio.creak(x, y, z, 0.8); }
        }

        // he reaches for it slowly and leans closer
        this.bp.tilt = this.checkStyle === "listen" ? 0.5 : 0.15;
    }

    // the end of a search: back to patrol, or (sometimes) he PRETENDS to leave
    endSearch() {

        this.targets = [];
        this.checking = null;
        this.cur = null;
        this.path = [];
        this.dest = null;
        this.linger = 0;
        this.witness = null;

        // after an escape you get a breather
        if (this.searchKind === "lost") this.mercy = Math.max(this.mercy, 14);

        // a fake escape: he walks away loudly ... and comes back quietly
        if (this.searchKind === "lost" && !this.feintDone && Math.random() < (this.player.hidden ? 0.55 : 0.2)) {

            if (this.beginFeint()) return;
        }

        this.feintDone = false;

        this.toWander();
    }

    // ------------------------------------------------------------------
    // THE FAKE LEAVE: he walks off with loud footsteps, waits out of sight, comes back creeping
    // ------------------------------------------------------------------
    beginFeint() {

        const pos = this.model.root.position;

        const home = { x: this.lastKnown.x, z: this.lastKnown.z, fl: floorOf(this.lastKnown.y - EYE) };

        // somewhere far away on the same floor
        let best = [];

        for (const n of NAV.nodes) {

            if (n.fl !== home.fl || n.locked || n.yard || n.spiral || (n.type !== "hall" && n.type !== "room")) continue;

            const d = Math.hypot(n.x - home.x, n.z - home.z);

            if (d > 14 && d < 34) best.push(n);
        }

        if (!best.length) return false;

        const far = best[Math.floor(Math.random() * best.length)];

        this.state = "feint";

        this.feint = { phase: "leave", t: 0, home, far, wait: rnd(6, 11) };

        this.silent = false;

        this.goTo(far.x, far.z, far.fl);

        return true;
    }

    updateFeint(dt) {

        const f = this.feint;

        const pos = this.model.root.position;

        f.t += dt;

        if (f.phase === "leave") {

            // loud and obvious: he is going away
            if (this.advance(dt, this.L.walk * 1.15, 3) || f.t > 28) { f.phase = "wait"; f.t = 0; this.path = []; this.dest = null; }

            return true;
        }

        if (f.phase === "wait") {

            // standing out of sight, silent; the player thinks it is over
            this.speed = 0;

            this.silent = true;

            if (f.t > f.wait) {

                // back, creeping: the place he lost you, a few steps away from it
                const cand = NAV.nodes.filter((n) => n.fl === f.home.fl && !n.locked && !n.yard && !n.spiral &&
                    (n.type === "hall" || n.type === "room") && Math.hypot(n.x - f.home.x, n.z - f.home.z) < 7);

                const t = cand.length ? cand[Math.floor(Math.random() * cand.length)] : null;

                if (!t) { this.silent = false; this.feint = null; this.feintDone = true; this.toWander(); return false; }

                f.phase = "return"; f.t = 0;

                this.goTo(t.x, t.z, t.fl);
            }

            return false;
        }

        // return: creeping, no footsteps
        this.silent = true;

        if (this.advance(dt, this.L.walk * 0.95, 2.6) || f.t > 40) {

            this.silent = false;

            this.feint = null;

            this.feintDone = true;

            // he looks round, checks a couple of places (fairly), and finally goes on
            this.searchKind = "heard";

            this.witness = null;

            this.beginSearch(this.lastKnown, f.home.fl, false);

            return false;
        }

        return true;
    }

    // ------------------------------------------------------------------
    // the brain's clock: runs every frame
    // ------------------------------------------------------------------
    brainTick(dt) {

        const c = this.camera.position;

        // how fast the player moves (smoothed)
        if (this.lastPX !== null && dt > 0) {

            const v = Math.hypot(c.x - this.lastPX, c.z - this.lastPZ) / dt;

            this.pSpd += (Math.min(v, 12) - this.pSpd) * Math.min(1, dt * 3);
        }

        this.lastPX = c.x;
        this.lastPZ = c.z;

        if (this.mercy > 0) this.mercy -= dt;

        // doors he opened slowly / doors that slammed: put their normal speed back afterwards
        for (let i = this.slowDoors.length - 1; i >= 0; i--) {

            const s = this.slowDoors[i];

            s.t -= dt;

            if (s.t <= 0) { s.d.speed = s.speed; s.d.silent = s.silent; this.slowDoors.splice(i, 1); }
        }

        this.updateProps(dt);

        // how worked up he is: 0 patrol, 1 curious, 2 searching, 3 chasing, 4 attacking
        const S = this.state;

        this.aggr = S === "chase" ? 3 : S === "kill" ? 4 : (S === "search" || S === "feint") ? 2 : (S === "suspicious" || S === "stalk" || S === "knock" || S === "watch") ? 1 : 0;

        this.directorTick(dt);
    }

    // ------------------------------------------------------------------
    // THE DIRECTOR: decides WHEN scary things happen.  They are rare, never right after an escape
    // (mercy), never two at once, and every one of them gives you a warning or a way out.
    // ------------------------------------------------------------------
    directorTick(dt) {

        const d = this.dir;

        if (!this.playerInside() || this.suspended || this.player.anim) return;

        d.ev -= dt; d.stalk -= dt; d.knock -= dt; d.behind -= dt; d.window -= dt; d.shadow -= dt;

        const calm = this.state === "wander" || this.state === "away";

        const here = this.state !== "away" && this.state !== "pending";

        const k = this.L.scare;

        // small things in the air around you, while he is somewhere near
        if (d.ev <= 0) {

            d.ev = rnd(16, 40) / Math.sqrt(k);

            if (this.mercy <= 0 && here && (calm || this.state === "suspicious" || this.state === "search" || this.state === "stalk")) this.envEvent();
        }

        if (this.mercy > 0 || !calm || this.cellarBusy) return;

        // the bigger scenes (one at a time)
        if (d.stalk <= 0) { d.stalk = rnd(70, 140); if (Math.random() < 0.5 * k && this.tryStalk()) return; }

        if (d.knock <= 0) { d.knock = rnd(95, 170); if (Math.random() < 0.5 * k && this.tryKnock()) return; }

        if (d.behind <= 0) { d.behind = rnd(85, 150); if (Math.random() < 0.4 * k && this.tryBehind()) return; }

        if (d.window <= 0) { d.window = rnd(110, 190); if (Math.random() < 0.45 * k && this.tryWatch()) return; }
    }

    camForward() {

        const y = this.player.yaw;

        return { x: -Math.sin(y), z: -Math.cos(y) };
    }

    // a node around the player in a ring: behind him? out of his sight? with a clear line to him?
    pickNodeAround(minD, maxD, opt) {

        const c = this.camera.position;

        const f = this.camForward();

        const pf = opt.floor !== undefined ? opt.floor : this.playerFloor();

        const list = [];

        for (const n of NAV.nodes) {

            if (n.fl !== pf || n.locked || n.yard || (n.spiral && !SPIRAL_OPEN)) continue;

            if (n.type !== "hall" && n.type !== "room" && !(opt.door && n.type === "door")) continue;

            const dx = n.x - c.x, dz = n.z - c.z, d = Math.hypot(dx, dz);

            if (d < minD || d > maxD) continue;

            if (opt.behind && (dx * f.x + dz * f.z) / d > -0.25) continue;

            list.push(n);
        }

        // (the line-of-sight tests cost something: only a handful of random candidates are tried)
        if (opt.hidden || opt.los) {

            for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = list[i]; list[i] = list[j]; list[j] = t; }

            for (let i = 0; i < Math.min(14, list.length); i++) {

                const n = list[i];

                this.v1.set(c.x, c.y, c.z);
                this.v2.set(n.x, n.y + EYE, n.z);

                const clear = this.los(this.v1, this.v2, n.fl);

                if (opt.los && !clear) continue;

                if (opt.hidden && clear && this.inView(n.x, n.z, 0.1)) continue;

                return n;
            }

            return null;
        }

        return list.length ? list[Math.floor(Math.random() * list.length)] : null;
    }

    // a spawn at a chosen node with a chosen scene (the lights stutter there first)
    forceSpawn(n, mode, data) {

        if (this.state !== "away" || !n) return false;

        this.spawnPlan = { node: n, t: rnd(0.8, 1.5), mode, data };

        this.state = "pending";

        ghostFx.x = n.x;
        ghostFx.z = n.z;
        ghostFx.y = n.y;
        ghostFx.power = 0.8;

        return true;
    }

    // called when a forced spawn has appeared
    brainEnter(mode, data) {

        if (mode === "stalk") this.beginStalk(data.kind, true);
        else if (mode === "knock") this.beginKnock(data, true);
        else if (mode === "watch") this.beginWatch(data);
    }

    // ------------------------------------------------------------------
    // STALKING: he follows you from a distance and is never there when you turn round
    // ------------------------------------------------------------------
    tryStalk() {

        if (this.isHiding() || this.pSpd > 8) return false;

        if (this.state === "away") {

            const n = this.pickNodeAround(15, 26, { behind: true, hidden: true });

            return n ? this.forceSpawn(n, "stalk", { kind: "follow" }) : false;
        }

        const pos = this.model.root.position;

        const d = Math.hypot(this.camera.position.x - pos.x, this.camera.position.z - pos.z);

        if (d < 13 || d > 40) return false;

        this.beginStalk("follow", false);

        return true;
    }

    // a ghost that suddenly stands BEHIND you and walks up slowly (never attacks)
    tryBehind() {

        if (this.isHiding() || this.pSpd > 7) return false;

        if (this.state === "away") {

            const n = this.pickNodeAround(6.5, 10, { behind: true, los: true });

            return n ? this.forceSpawn(n, "stalk", { kind: "behind" }) : false;
        }

        return false;
    }

    beginStalk(kind, placed) {

        const pos = this.model.root.position;

        this.state = "stalk";
        this.idle = null;
        this.gait = "walk";
        this.path = [];
        this.dest = null;

        this.stalk = {
            kind, t: 0, phase: kind === "behind" ? "approach" : "follow",
            dur: kind === "behind" ? 40 : rnd(28, 55), spots: 0, react: null, rt: 0,
            D: rnd(10, 14), repath: 0, stare: 0, ducking: null
        };

        this.silent = Math.random() < (kind === "behind" ? 0.65 : 0.5);

        if (kind === "behind") {

            // a whisper and a flicker as he appears right behind you
            this.fxBurst = { t: 1.4 };

            audio.ghostWhisper(pos.x, this.eye.y, pos.z, 0.55);
        }
    }

    // spotted by the player: he vanishes, ducks out of sight, or freezes and stares
    stalkReact(st) {

        st.spots++;

        const r = Math.random();

        if (st.spots >= 3) return "vanish";

        return r < 0.4 ? "vanish" : r < 0.75 ? "duck" : "freeze";
    }

    updateStalk(dt) {

        const st = this.stalk;

        const pos = this.model.root.position;

        const c = this.camera.position;

        const dist = Math.hypot(c.x - pos.x, c.z - pos.z);

        const pf = this.playerFloor();

        st.t += dt;

        // the scene is over if you hide, leave the hostel or he has been at it too long
        if (!this.playerInside() || this.suspended) { this.endStalk("gone"); return false; }

        if (this.isHiding()) { st.hide = (st.hide || 0) + dt; if (st.hide > 5) { this.endStalk("hide"); return false; } }
        else st.hide = 0;

        const sees = this.playerSeesGhost();

        // ---- you saw him ----
        if (sees && !st.react && st.phase !== "duck") {

            const r = this.stalkReact(st);

            if (r === "vanish") {

                if (Math.random() < 0.4) audio.ghostLaugh(pos.x, this.eye.y, pos.z, 0.4);

                this.endStalk("spotted");

                return false;
            }

            st.react = r;

            st.rt = r === "freeze" ? rnd(1.2, 2.2) : 0;

            if (r === "duck") {

                // out of your sight, quickly: the nearest doorway or corner behind a wall
                const n = this.pickNodeAround(6, 16, { hidden: true, door: true, floor: this.fl });

                if (n) { st.phase = "duck"; st.ducking = n; this.goTo(n.x, n.z, n.fl); }
                else { this.endStalk("spotted"); return false; }
            }
            else st.phase = "freeze";
        }

        // ---- the phases ----
        const look = this.lookTarget.set(c.x, c.y - 0.15, c.z);

        if (st.phase === "freeze") {

            this.speed = 0;

            this.bp.look = look;
            this.bp.tilt = 0.45;

            this.turnTo(c.x, c.z, 3, dt);

            st.rt -= dt;

            if (st.rt <= 0) { this.endStalk("spotted"); return false; }

            return false;
        }

        if (st.phase === "duck") {

            this.silent = false;

            if (this.advance(dt, this.L.walk * 2.4, 6) || st.t > 60) {

                st.phase = "follow";
                st.react = null;
                st.hideWait = rnd(2.5, 5);
            }

            return true;
        }

        // ---- "behind": walks up slowly, stops close, stares, vanishes ----
        if (st.kind === "behind") {

            this.bp.look = look;

            if (st.phase === "approach") {

                st.repath -= dt;

                if (st.repath <= 0) { st.repath = 0.6; this.goTo(c.x, c.z, pf); }

                this.advance(dt, 1.05, 2.4);

                // stops well short of you, and stares
                if (dist < (sees ? 4.6 : 3.6)) { st.phase = "stare"; st.stare = rnd(1.6, 2.8); this.path = []; this.dest = null; }

                if (st.t > st.dur) { this.endStalk("done"); return false; }

                return true;
            }

            // stare
            this.speed = 0;

            this.bp.tilt = 0.5;

            this.turnTo(c.x, c.z, 3, dt);

            st.stare -= dt;

            if (st.stare <= 0) {

                audio.ghostWhisper(pos.x, this.eye.y, pos.z, 0.5);

                this.endStalk("done");

                return false;
            }

            return false;
        }

        // ---- "follow": keeps his distance, stays out of your sight ----
        if (st.hideWait > 0) { st.hideWait -= dt; this.speed = 0; return false; }

        st.repath -= dt;

        if (st.repath <= 0) {

            st.repath = 0.9;

            this.stalkRepath(st, dist, pf);
        }

        // he moves about as fast as you do (a little quicker if you run), never more
        const spd = clamp(this.pSpd * 1.05, this.L.walk * 0.75, this.L.walk * 1.9);

        this.advance(dt, dist > st.D + 6 ? spd * 1.4 : spd, 3);

        // standing in the dark, watching you
        if (dist < st.D + 2.5 && this.speed < 0.2) { this.bp.look = look; this.bp.tilt = 0.25; this.turnTo(c.x, c.z, 2, dt); }

        if (st.t > st.dur) {

            // the end: usually he is gone; rarely he commits and attacks
            const ambush = this.L.near * 2.2;

            if (!this.isHiding() && dist < 16 && Math.random() < ambush) {

                this.stalk = null;
                this.silent = false;
                this.seen = true;
                this.lastKnown.copy(this.player.pos);

                this.aggroDelay = 0.7;

                this.startChase();

                return false;
            }

            this.endStalk(Math.random() < 0.7 ? "done" : "gone");

            return false;
        }

        return true;
    }

    // plan the next step of the follow: a spot about D metres behind / away from you, out of your sight
    stalkRepath(st, dist, pf) {

        const c = this.camera.position;

        let t = null;

        if (dist < st.D - 3 || !this.path.length) {

            // too close (or no way): a spot at the right distance, hidden from your eyes
            t = this.pickNodeAround(st.D, st.D + 7, { hidden: true, door: true, floor: this.fl === pf ? pf : undefined });
        }

        if (!t) {

            const from = this.nodeAtFeet();

            const pn = nearestNode(c.x, c.z, pf, ["hall", "room"]);

            if (from && pn) {

                const route = findPath(from.i, pn.i);

                if (route && route.length > 1) {

                    // walk the route until about D metres from you
                    let len = 0;

                    for (let i = route.length - 1; i > 0; i--) {

                        const a = NAV.nodes[route[i]], b = NAV.nodes[route[i - 1]];

                        len += Math.hypot(a.x - b.x, a.z - b.z);

                        if (len >= st.D) { t = b; break; }
                    }

                    if (!t) t = NAV.nodes[route[0]];
                }
            }
        }

        if (t) this.goTo(t.x, t.z, t.fl);
    }

    endStalk(why) {

        this.stalk = null;
        this.silent = false;
        this.idle = null;
        this.mercy = Math.max(this.mercy, 12);

        // he disappears (a blink) or simply walks on with his patrol
        if (why === "gone" || why === "hide") this.toWander();
        else this.vanish();
    }

    // ------------------------------------------------------------------
    // THE KNOCK: three knocks on the door of the room you are in ... then it opens, slowly
    // ------------------------------------------------------------------
    tryKnock() {

        if (this.pSpd > 8) return false;

        const c = this.camera.position;

        const pf = this.playerFloor();

        // you must be INSIDE a room (not in the hall), behind a shut door
        if (pf > 2 || Math.abs(c.z) < 4.6 || Math.abs(c.z) > 14.8) return false;

        let rn = null, bd = 99;

        for (const n of NAV.nodes) {

            if (n.fl !== pf || n.type !== "room" || n.room == null || n.yard || n.spiral) continue;

            const d = Math.hypot(n.x - c.x, n.z - c.z);

            if (d < bd) { bd = d; rn = n; }
        }

        if (!rn || bd > 5) return false;

        const T = NAV.nodes.find((n) => n.type === "door" && n.room === rn.room && n.fl === pf);

        if (!T || T.locked) return false;

        let dd = null, dm = 2;

        for (const q of this.doors) {

            if (q.fl !== pf || q.d.kind !== "room") continue;

            const dq = Math.hypot(q.x - T.x, q.z - T.z);

            if (dq < dm) { dm = dq; dd = q; }
        }

        if (!dd || dd.d.isOpen) return false;

        const A = nearestNode(T.x, Math.sign(T.z) * LANE_Z, pf, ["hall"]);

        if (!A) return false;

        // the room's inner nodes (where he goes after he has come in)
        const inner = NAV.nodes.filter((n) => n.fl === pf && n.type === "room" && n.room === rn.room);

        const data = { T, A, dd, room: rn.room, inner };

        if (this.state === "away") return this.forceSpawn(A, "knock", data);

        const pos = this.model.root.position;

        if (Math.hypot(pos.x - A.x, pos.z - A.z) < 9) return false;

        this.beginKnock(data, false);

        return true;
    }

    beginKnock(data, placed) {

        this.state = "knock";
        this.idle = null;
        this.gait = "walk";
        this.path = [];
        this.dest = null;
        this.knock = { ...data, phase: placed ? "knock" : "walk", t: 0, n: 0, extra: false };
        this.silent = false;

        if (placed) this.faceTo(data.dd.x, data.dd.z, true);
        else this.goTo(data.A.x, data.A.z, data.A.fl);
    }

    updateKnock(dt) {

        const k = this.knock;

        const pos = this.model.root.position;

        const c = this.camera.position;

        k.t += dt;

        const dd = k.dd;

        // he gave up on us (the player left the room, the door was opened ...)
        if (!this.playerInside() || this.suspended) { this.knock = null; this.toWander(); return false; }

        if (k.phase === "walk") {

            if (this.advance(dt, this.L.walk * 1.25, 3) || k.t > 40) { k.phase = "knock"; k.t = 0; this.path = []; this.dest = null; }

            return true;
        }

        const at = (x, z) => this.turnTo(x, z, 2.5, dt);

        if (k.phase === "knock") {

            this.speed = 0;

            at(dd.x, dd.z);

            this.bp.look = this.lookTarget.set(dd.x, this.gy + 1.4, dd.z);
            this.bp.rightTo = this.rightTarget.set(dd.x, this.gy + 1.35, dd.z);

            const times = [0.7, 1.55, 2.5];

            if (k.n < 3 && k.t >= times[k.n]) { audio.knock(dd.x, this.gy + 1.4, dd.z, 0.55 + 0.25 * k.n); k.n++; }

            if (k.n >= 3 && k.t > 3.2) { k.phase = "wait"; k.t = 0; k.wait = rnd(2.4, 4.6); }

            return false;
        }

        if (k.phase === "wait") {

            this.speed = 0;

            at(dd.x, dd.z);

            this.bp.look = this.lookTarget.set(dd.x, this.gy + 1.4, dd.z);
            this.bp.tilt = 0.3;

            // sometimes two more knocks, softer, to make you sweat
            if (!k.extra && k.t > k.wait * 0.5 && Math.random() < 0.02) {

                k.extra = true;

                audio.knock(dd.x, this.gy + 1.4, dd.z, 0.5);

                setTimeout(() => audio.knock(dd.x, 1.4, dd.z, 0.45), 520);
            }

            if (k.t > k.wait) { k.phase = "open"; k.t = 0; }

            return false;
        }

        if (k.phase === "open") {

            this.speed = 0;

            at(dd.x, dd.z);

            this.bp.rightTo = this.rightTarget.set(dd.x, this.gy + 1.0, dd.z);

            if (!k.opened) {

                k.opened = true;

                this.slowOpenDoor(dd, 0.55);

                audio.creak(dd.x, 1.2, dd.z, 0.9);
            }

            if (k.t > 2.4) { k.phase = "enter"; k.t = 0; k.idx = 0; this.goToInner(k); }

            return false;
        }

        // enter: he walks slowly into the room, then searches it
        if (this.advance(dt, this.L.walk * 0.75, 2.4) || k.t > 30) {

            k.idx++;

            if (k.idx < k.inner.length && k.t < 30) { this.goToInner(k); return true; }

            const room = k.inner[k.inner.length - 1] || k.A;

            this.knock = null;

            this.lastKnown.set(room.x, c.y, room.z);

            this.searchKind = "heard";

            this.witness = null;

            this.forceSearch = true;

            this.mercy = Math.max(this.mercy, 10);

            this.beginSearch(this.lastKnown, k.A.fl, false);

            return false;
        }

        return true;
    }

    goToInner(k) {

        const n = k.inner[Math.min(k.idx, k.inner.length - 1)];

        if (n) this.goTo(n.x, n.z, n.fl);
    }

    // open a door slowly (and quietly, with a long creak played separately)
    slowOpenDoor(dd, speed) {

        this.slowDoors.push({ d: dd.d, speed: dd.d.speed, silent: dd.d.silent, t: 4 });

        dd.d.speed = speed;

        dd.d.silent = true;

        dd.d.setOpen(true);
    }

    // ------------------------------------------------------------------
    // THE WINDOW: he stands outside on the grass and watches you through the glass
    // ------------------------------------------------------------------
    tryWatch() {

        const c = this.camera.position;

        if (this.state !== "away" || this.playerFloor() !== 0 || this.isHiding() || this.pSpd > 8) return false;

        if (Math.abs(c.z) < 4.6 || Math.abs(c.z) > 14.8) return false;

        // the window of the room you are in (the same x as the room)
        const WX = [-11.6, -4.6, 4.6, 11.6];

        let wx = null, bd = 9;

        for (const x of WX) { const d = Math.abs(x - c.x); if (d < bd) { bd = d; wx = x; } }

        if (wx === null || bd > 3.0) return false;

        const s = Math.sign(c.z);

        // he must not be in front of your face: the window has to be roughly ahead or beside you
        const node = { x: wx, z: s * 16.05, y: 0, fl: 0, type: "hall", pseudo: true };

        return this.forceSpawn(node, "watch", { wx, s });
    }

    beginWatch(data) {

        this.state = "watch";
        this.idle = null;
        this.curNode = null;
        this.path = [];
        this.dest = null;
        this.silent = true;
        this.watch = { t: 0, dur: rnd(7, 12), seenT: 0, tapped: false, wx: data.wx, s: data.s };

        // he faces the window (into the room)
        this.yaw = data.s > 0 ? Math.PI : 0;
    }

    updateWatch(dt) {

        const w = this.watch;

        const c = this.camera.position;

        w.t += dt;

        this.speed = 0;

        this.bp.look = this.lookTarget.set(c.x, c.y - 0.1, c.z);
        this.bp.tilt = 0.3 + Math.sin(w.t * 0.7) * 0.12;

        if (this.playerSeesGhost()) w.seenT += dt;

        // when you see him he taps on the glass once ... and you look away and he is gone
        if (w.seenT > 0.9 && !w.tapped) { w.tapped = true; audio.knock(w.wx, 1.4, w.s * 15.4, 0.5); }

        if (w.seenT > 2.6 || w.t > w.dur || !this.playerInside() || this.playerFloor() !== 0) {

            this.watch = null;

            this.silent = false;

            this.mercy = Math.max(this.mercy, 10);

            this.vanish();

            return false;
        }

        return false;
    }

    // ------------------------------------------------------------------
    // SMALL SCARES AROUND YOU (rare, never constant): lights, a slammed door, something falling,
    // distant footsteps, a whisper, laughter, a shadow that crosses the hall
    // ------------------------------------------------------------------
    envEvent() {

        const c = this.camera.position;

        const f = this.camForward();

        const pf = this.playerFloor();

        const pick2 = [
            ["flicker", 3], ["door", 2], ["book", 2], ["steps", 2], ["whisper", 2], ["laugh", 1.2], ["shadow", 1.6], ["far", 1], ["scream", 0.5]
        ];

        let total = 0;

        for (const e of pick2) total += e[1];

        let r = Math.random() * total, kind = "flicker";

        for (const e of pick2) { r -= e[1]; if (r <= 0) { kind = e[0]; break; } }

        const rp = (a, b) => rnd(a, b);

        switch (kind) {

            case "flicker":

                this.fxBurst = { t: rnd(1.4, 2.6) };

                break;

            case "door": {

                // an open door near you slams shut
                let best = null, bd = 11;

                for (const dd of this.doors) {

                    if (dd.fl !== pf || dd.d.kind !== "room" || !dd.d.isOpen) continue;

                    const d = Math.hypot(dd.x - c.x, dd.z - c.z);

                    // not the one you are standing in
                    if (d < bd && d > 2.2) { bd = d; best = dd; }
                }

                if (best) {

                    this.slowDoors.push({ d: best.d, speed: best.d.speed, silent: best.d.silent, t: 2 });

                    best.d.speed = 12;

                    best.d.setOpen(false);

                    audio.play("slam", { vol: 0.8, pan: audio.spatial(best.x, 1.2, best.z).pan, send: 0.4 });
                }
                else this.fxBurst = { t: 1.6 };

                break;
            }

            case "book": this.spawnBook(); break;

            case "steps": {

                const n = this.pickNodeAround(14, 32, { floor: Math.random() < 0.6 ? pf : Math.max(0, Math.min(2, pf + (Math.random() < 0.5 ? 1 : -1))) });

                if (n) audio.distantSteps(n.x, n.y + 1, n.z, 5 + Math.floor(Math.random() * 4), 0.55);

                break;
            }

            case "whisper":

                audio.ghostWhisper(c.x - f.x * 1.3 + rp(-0.4, 0.4), c.y, c.z - f.z * 1.3 + rp(-0.4, 0.4), 0.6);

                break;

            case "laugh": {

                const n = this.pickNodeAround(16, 34, { floor: pf });

                if (n) audio.ghostLaugh(n.x, n.y + 1.3, n.z, 0.5);

                break;
            }

            case "shadow": this.spawnShadow(); break;

            case "far": {

                // someone knocks on a door somewhere else in the hostel
                const n = this.pickNodeAround(14, 34, { floor: pf });

                if (n) {

                    audio.knock(n.x, 1.4, n.z, 0.45);
                    setTimeout(() => audio.knock(n.x, 1.4, n.z, 0.5), 650);
                    setTimeout(() => audio.knock(n.x, 1.4, n.z, 0.55), 1350);
                }

                break;
            }

            case "scream": {

                const n = this.pickNodeAround(20, 38, { floor: pf });

                if (n) audio.ghostSfx("scream", n.x, n.y + 1.4, n.z, 0.3);

                break;
            }
        }
    }

    // a book falls off a shelf somewhere in front of you
    spawnBook() {

        const c = this.camera.position;

        const f = this.camForward();

        const floorY = FLOORS[this.playerFloor()];

        const base = Math.atan2(f.x, f.z);

        for (let i = 0; i < 8; i++) {

            const a = base + rnd(-0.7, 0.7), d = rnd(2.8, 5.2);

            const x = c.x + Math.sin(a) * d, z = c.z + Math.cos(a) * d;

            if (!this.free(x, z)) continue;

            const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.035, 0.3), new THREE.MeshStandardMaterial({ color: 0x4a2a22, roughness: 1 }));

            m.position.set(x, floorY + 1.9, z);

            m.rotation.set(rnd(-0.4, 0.4), rnd(0, 6), rnd(-0.4, 0.4));

            this.scene.add(m);

            this.props.push({ kind: "book", mesh: m, vy: 0, t: 0, landed: false, floorY });

            return;
        }
    }

    // a dark shape that runs across the end of the hall and is gone
    spawnShadow() {

        const c = this.camera.position;

        const f = this.camForward();

        const floorY = FLOORS[this.playerFloor()];

        const base = Math.atan2(f.x, f.z);

        for (let i = 0; i < 8; i++) {

            const a = base + rnd(-0.5, 0.5), d = rnd(6, 11);

            const x = c.x + Math.sin(a) * d, z = c.z + Math.cos(a) * d;

            if (!this.free(x, z)) continue;

            if (!this.shadowTex) {

                const cv = document.createElement("canvas");

                cv.width = 64; cv.height = 128;

                const g = cv.getContext("2d");

                g.fillStyle = "#000";
                g.beginPath(); g.ellipse(32, 24, 11, 14, 0, 0, 6.3); g.fill();                    // head
                g.fillRect(20, 36, 24, 52);                                                          // body
                g.fillRect(22, 88, 8, 36); g.fillRect(34, 88, 8, 36);                                // legs
                g.fillRect(10, 40, 9, 46); g.fillRect(45, 40, 9, 46);                                // arms

                this.shadowTex = new THREE.CanvasTexture(cv);
            }

            const mat = new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, fog: false });

            const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.15), mat);

            m.position.set(x, floorY + 1.07, z);

            m.rotation.y = Math.atan2(c.x - x, c.z - z);

            this.scene.add(m);

            // it runs sideways across your view
            const side = Math.random() < 0.5 ? 1 : -1;

            this.props.push({ kind: "shadow", mesh: m, t: 0, dx: -f.z * side * 5.0, dz: f.x * side * 5.0, x, z });

            audio.ghostSfx("breath", x, floorY + 1.4, z, 0.4);

            return;
        }
    }

    updateProps(dt) {

        for (let i = this.props.length - 1; i >= 0; i--) {

            const p = this.props[i];

            p.t += dt;

            if (p.kind === "book") {

                if (!p.landed) {

                    p.vy -= 9.8 * dt;

                    p.mesh.position.y += p.vy * dt;

                    if (p.mesh.position.y <= p.floorY + 0.03) {

                        p.mesh.position.y = p.floorY + 0.03;

                        p.landed = true;

                        audio.play("thud", { vol: 0.7, pan: audio.spatial(p.mesh.position.x, 1, p.mesh.position.z).pan, send: 0.4 });
                    }
                }

                if (p.t > 14) { this.scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); this.props.splice(i, 1); }
            }
            else if (p.kind === "shadow") {

                const k = p.t / 1.2;

                p.mesh.position.x = p.x + p.dx * k;
                p.mesh.position.z = p.z + p.dz * k;

                p.mesh.material.opacity = k < 0.2 ? k * 3.2 : k > 0.8 ? Math.max(0, (1 - k) * 3.2) : 0.64;

                if (k >= 1) { this.scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); this.props.splice(i, 1); }
            }
        }
    }

    vanish() {
        this.state = "fade";
        this.fadeT = 0.7;
    }

    // ==================================================
    // PER-FRAME
    // ==================================================
    // no blood effects (removed on request)
    bloodUpdate() { }

    update(dt, t) {

        this.clock += dt;

        this.bloodUpdate(dt, !!this.kill && !this.dead);

        if (!this.enabled) return;

        // the hidden room at the end of the game: he can not follow you there
        if (this.suspended) {

            if (this.state !== "away" || this.visible) this.despawn(true);

            return;
        }

        if (this.kill) {
            this.updateKill(dt);
            return;
        }

        if (this.dead) return;

        // ---------------- nothing happens before the main door's lock is opened ----------------
        if (!inventory.flag("main_unlocked")) return;

        // ---------------- the player is down in the cellar ----------------
        if (this.cellarVisit(dt)) return;

        // the brain: a fresh body pose request every frame, and the director's clock
        this.bpReset();

        this.brainTick(dt);

        // ---------------- not here ----------------
        if (this.state === "away") {

            this.cool -= dt;

            ghostFx.power = Math.max(0, ghostFx.power - dt);

            audio.ghostFear = Math.max(0, audio.ghostFear - dt * 0.5);

            if (this.cool <= 0) this.beginSpawn();

            return;
        }

        if (this.state === "pending") {

            this.spawnPlan.t -= dt;

            // lights stutter where he is about to appear
            ghostFx.power = 0.7 + Math.sin(this.clock * 20) * 0.2;

            if (this.spawnPlan.t <= 0) this.finishSpawn();

            return;
        }

        // ---------------- here ----------------
        const model = this.model;

        const pos = model.root.position;

        model.root.rotation.y = this.yaw;

        model.floorY = this.gy;

        // eye position for sight
        model.eyePos(this.eye);

        this.senses(dt);

        let move = false;

        const L = this.L;

        let look = null;
        let open;
        let calm = 1;
        let run = false;
        let leftTo = null;
        let rightTo = null;

        switch (this.state) {

            case "wander": {

                this.life -= dt;

                if (this.seen) { this.startChase(); break; }

                // standing still ON PURPOSE: observing, looking behind him, tilting his head ...
                if (this.idle) {

                    this.speed = 0;

                    this.runIdle(dt);
                }
                else if (this.pause > 0) {

                    this.pause -= dt;

                    this.speed = 0;
                }
                else if (this.path.length === 0 && !this.dest) {

                    const n = this.pickWanderTarget();

                    this.goTo(n.x, n.z, n.fl);

                    // every now and then he CRAWLS along the floor (never right next to you, never on the stairs)
                    const dp = Math.hypot(this.camera.position.x - pos.x, this.camera.position.z - pos.z);

                    this.gait = (Math.random() < 0.05 * L.scare && dp > 16 && !this.stairing && this.mercy <= 0) ? "crawl" : "walk";

                    if (this.path.length === 0 && !this.dest) this.pause = 0.4;
                }
                else {

                    const crawl = this.gait === "crawl";

                    if (this.gaitT > 0) this.gaitT -= dt;

                    if (this.advance(dt, L.walk * (crawl ? 0.5 : 1) * (this.gaitT > 0 ? 0.4 : 1), 3.0)) {

                        this.pause = rnd(0.1, 0.5);

                        if (crawl) { this.gait = "walk"; this.gaitT = 0.7; }
                        else this.maybeIdle();
                    }

                    move = true;
                }

                // he may BLINK OUT in front of your eyes, to turn up somewhere else later
                this.blinkT = (this.blinkT || 0) - dt;

                if (this.blinkT <= 0) {

                    this.blinkT = 0.6;

                    if (this.mercy <= 0 && !this.idle && !this.seen && Math.random() < 0.02 * L.scare) {

                        const dd = Math.hypot(this.camera.position.x - pos.x, this.camera.position.z - pos.z);

                        if (dd > 9 && dd < 30 && this.playerSeesGhost()) { this.vanish(); break; }
                    }
                }

                break;
            }

            case "stand":
            case "statue": {

                this.speed = 0;

                const c = this.camera.position;

                look = this.lookTarget.set(c.x, c.y, c.z);

                this.faceTo(c.x, c.z, false);

                this.statueT -= dt;

                const d = Math.hypot(c.x - pos.x, c.z - pos.z);

                if (this.state === "stand") {

                    if (this.seen) { this.startChase(); break; }

                    // waits behind the closed door until you are in the room
                    if (this.statueT < -25) this.vanish();
                }
                else if (this.statueT <= 0 || d < 8) {

                    this.vanish();
                }

                break;
            }

            case "suspicious": {

                if (this.seen) { this.startChase(); break; }

                if (this.pause > 0) {

                    // he STOPS and listens first: his head turns towards the sound
                    this.pause -= dt;
                    this.speed = 0;

                    look = this.lookTarget.set(this.noiseAt.x, this.eye.y, this.noiseAt.z);

                    this.turnTo(this.noiseAt.x, this.noiseAt.z, 2.2, dt);

                    break;
                }

                if (this.advance(dt, L.walk * 1.35, 3)) {
                    // arrived: looks round, then searches here
                    this.beginSearch(this.lastKnown, floorOf(this.lastKnown.y - EYE) , false);
                }

                move = true;

                break;
            }

            case "search": {

                if (this.seen) { this.startChase(); break; }

                this.searchT -= dt;

                if (this.linger > 0) {

                    this.linger -= dt;

                    this.speed = 0;

                    if (this.checking) {

                        // reaching toward the cupboard door, listening, knocking, slowly opening it
                        rightTo = this.leftTarget.set(this.checking.spot.pos.x, this.gy + 1.15, this.checking.spot.pos.z);
                        look = this.lookTarget.set(this.checking.spot.pos.x, this.gy + 1.2, this.checking.spot.pos.z);

                        this.checkSounds(dt, this.checking.spot);

                        if (this.linger <= 0) {
                            this.resolveCheck(this.checking.spot, this.checking.sure);
                            if (this.kill) break;
                        }
                    }
                    else if (this.linger <= 0 && this.targets.length === 0) {
                        // finished: he gives up (or pretends to: see endSearch)
                        this.endSearch();
                    }

                    break;
                }

                if (this.advance(dt, L.walk * 1.5, 3.2)) {

                    // arrived at a target
                    const cur = this.cur;

                    this.cur = null;

                    if (cur && cur.kind === "spot") {

                        this.checking = cur;
                        this.startCheckStyle(cur.spot);

                        this.faceTo(cur.spot.pos.x, cur.spot.pos.z, false);
                    }
                    else {
                        this.linger = rnd(1.4, 3.2);
                        this.checking = null;
                    }

                    if (this.tIdx >= this.targets.length && !(cur && cur.kind === "spot")) {
                        this.targets = [];
                    }
                    else {
                        // schedule the next one after the lingering ends
                        this.afterLinger = true;
                    }
                }

                move = true;

                // out of time: he gives up (or pretends to)
                if (this.searchT <= 0 && !this.checking && !(this.cur && this.cur.sure)) {
                    this.endSearch();
                }

                break;
            }

            case "chase": {

                run = true;

                calm = 0;

                open = 1;

                // (a ghost called by the bell never loses you)
                if (this.summoned) { this.seen = true; this.loseT = 0; }

                if (this.seen) this.loseT = 0; else this.loseT += dt;

                const c = this.camera.position;

                const dist = Math.hypot(c.x - pos.x, c.z - pos.z);

                const dy = Math.abs(c.y - this.eye.y);

                look = this.lookTarget.set(c.x, c.y - 0.1, c.z);

                // the moment he commits (after a knock, after stalking): he stops, snaps his head
                // round and SCREAMS first: a split second to react before he runs
                if (this.aggroDelay > 0) {

                    this.aggroDelay -= dt;

                    this.speed = 0;

                    this.turnTo(c.x, c.z, 7, dt);

                    this.bp.headSnap = true;

                    break;
                }

                // caught!
                if (dist < L.attack && dy < 1.7 && this.playerInside() && (this.seen || dist < 1.1) && this.los(this.eye, c, this.fl)) {   // (never through a wall or a shut door)
                    this.startKill(false);
                    break;
                }

                // the chase is over if you slipped away
                if (this.loseT > L.lose) {

                    audio.ghostSfx("growl", pos.x, this.eye.y, pos.z, 0.8);

                    this.beginSearch(this.lastKnown, floorOf(this.lastKnown.y - EYE), true);

                    break;
                }

                // direct pursuit when he can see you, otherwise follow the corridors
                const pf = this.playerFloor();

                this.chaseRepath = (this.chaseRepath || 0) - dt;

                if (this.chaseRepath <= 0) {

                    this.chaseRepath = 0.5;

                    const tx = this.seen ? c.x : this.lastKnown.x;
                    const tz = this.seen ? c.z : this.lastKnown.z;
                    const tf = this.seen ? pf : floorOf(this.lastKnown.y - EYE);

                    this.goTo(tx, tz, tf);

                    // a clear straight line: skip the waypoints
                    if (this.seen && tf === this.fl && dist < 16 && this.blocked < 0.6 && !this.stairing) {
                        this.path = [];
                        this.dest = { x: c.x, z: c.z, fl: tf };
                    }
                }

                // far from you he walks a bit slowly; the closer he gets the faster he runs
                const gap = dist + dy * 2;
                const near = 1 - clamp((gap - 8) / 22, 0, 1);      // 0 far ... 1 close

                // the longer the chase lasts the faster he gets (up to chaseRamp more)
                this.chaseT += dt;

                const ramp = 1 + L.chaseRamp * clamp(this.chaseT / 14, 0, 1);

                this.advance(dt, L.chase * (0.38 + 0.62 * near) * ramp * (this.gaitT > 0 ? 0.45 : 1), 8);

                if (this.gaitT > 0) this.gaitT -= dt;

                move = true;

                break;
            }

            case "stalk": {

                // (a scene of the director: he never attacks from here, see updateStalk)
                if (this.updateStalk(dt)) move = true;

                break;
            }

            case "knock": {

                if (this.seen) { this.knock = null; this.aggroDelay = 0.9; this.startChase(); break; }

                if (this.updateKnock(dt)) move = true;

                break;
            }

            case "watch": {

                this.updateWatch(dt);

                break;
            }

            case "feint": {

                // (the fake leave: see beginFeint)
                if (this.seen) { this.silent = false; this.feint = null; this.startChase(); break; }

                if (this.updateFeint(dt)) move = true;

                break;
            }

            case "fade": {

                this.speed = 0;

                this.fadeT -= dt;

                // blinks out
                model.setVisible(Math.sin(this.clock * 50) > -0.2 && this.fadeT > 0);

                if (this.fadeT <= 0) this.despawn(false);

                break;
            }
        }

        // after a search target has been dealt with, take the next one
        if (this.state === "search" && this.linger <= 0 && this.afterLinger) {
            this.afterLinger = false;
            if (this.tIdx < this.targets.length) this.nextTarget();
            else this.targets = [];
        }

        if (!move && this.state !== "chase") this.speed = Math.max(0, this.speed - dt * 6);

        // ---- the door he is reaching for ----
        if (this.doorReach > 0) {

            this.doorReach -= dt;

            if (!rightTo && this.doorPos) rightTo = this.rightTarget.copy(this.doorPos);
        }

        // ---- the body ----
        // (the brain's extra poses: head tilt, head turned right round, twitching, crawling)
        const bp = this.bp;

        if (bp.open !== undefined && open === undefined) open = bp.open;

        model.update(dt, {
            speed: this.speed,
            run,
            look: look || bp.look || (this.seen ? this.lookTarget.copy(this.camera.position) : null),
            open,
            calm,
            leftTo: leftTo || bp.leftTo || (run && this.seen ? this.leftTarget.copy(this.camera.position) : null),
            rightTo: rightTo || bp.rightTo,
            headTilt: bp.tilt,
            headYaw: bp.headYaw,
            headSnap: bp.headSnap,
            twitch: bp.twitch,
            crawl: this.gait === "crawl" && this.state !== "chase"
        }, null, false);

        // he blinks in when he appears
        if (this.flickerT > 0 && this.state !== "fade") {

            this.flickerT -= dt;

            model.setVisible(Math.sin(this.clock * 45) > -0.1 || this.flickerT <= 0);
        }

        // ---- sound + light effects around him ----
        // (creeping: no footsteps; crawling: only a soft scrape)
        audio.ghostWalk(pos.x, pos.y + 0.1, pos.z, (this.state === "fade" || this.silent) ? 0 : (this.gait === "crawl" ? this.speed * 0.4 : this.speed), run);

        this.effects(dt);

        // ---- anti-stuck ----
        this.watchdog(dt);

        if (this.needUnstick) { this.needUnstick = false; this.unstick("gave up the way twice"); }

        // ---- he walks into you ----
        const c = this.camera.position;

        const hd = Math.hypot(c.x - pos.x, c.z - pos.z);

        if (hd < 0.55 && Math.abs(c.y - this.eye.y) < 1.4 && this.state !== "fade" &&
            this.playerInside() && !this.isHiding() && this.los(this.eye, c, this.fl)) {

            if (this.state === "statue") this.vanish();
            else if (this.state === "stalk" || this.state === "watch") {

                // you bumped into the one who was following you: he is simply gone
                if (this.state === "stalk") this.endStalk("spotted");
                else { this.watch = null; this.silent = false; this.vanish(); }
            }
            else this.startKill(false);
        }
    }

    playerInCellar() {

        const c = this.camera.position;

        return c.y < -1.0 && c.x > CELLAR.x0 && c.x < CELLAR.x1 && c.z > CELLAR.z0 && c.z < CELLAR.z1;
    }

    // Room 106 -> the ladder -> the cellar.  He comes down WALKING, then goes straight for you.
    cellarVisit(dt) {

        const inC = this.playerInCellar();

        let cv = this.cellarV;

        const model = this.model, pos = model.root.position;

        if (!inC) {

            // you climbed out: he is at the foot of the ladder: put him back at the top, walking on
            if (cv && (cv.phase === "descend" || cv.phase === "come")) {

                pos.set(CELLAR.hatchX, 0, CELLAR.hatchZ);

                this.gy = 0;

                this.fl = 0;

                this.path = [];

                this.dest = null;

                this.state = "wander";

                this.pause = 1.5;
            }

            this.cellarV = null;

            return false;
        }

        if (!cv) cv = this.cellarV = { phase: "wait", t: 0 };

        if (cv.phase === "wait") {

            // normal roaming until he stands over the trapdoor
            if (this.state === "wander" && this.visible && this.fl === 0 &&
                Math.hypot(pos.x - CELLAR.hatchX, pos.z - CELLAR.hatchZ) < 2.4) {

                cv.phase = "descend";

                cv.t = 0;

                this.path = [];

                this.dest = null;

                this.speed = 1.3;

                pos.set(CELLAR.hatchX, 0, CELLAR.hatchZ);

                audio.play("creak_1", { vol: 0.9, send: 0.4 });
            }

            return false;
        }

        // the ghost's own body is driven here (the usual brain waits)
        const c = this.camera.position;

        model.eyePos(this.eye);

        if (cv.phase === "descend") {

            cv.t += dt;

            const k = Math.min(1, cv.t / 3.0);

            pos.set(CELLAR.hatchX, CELLAR.y * k, CELLAR.hatchZ);

            this.gy = CELLAR.y * k;

            this.speed = 1.3;

            this.yaw = Math.atan2(-(c.x - pos.x), -(c.z - pos.z));

            model.root.rotation.y = this.yaw;

            model.floorY = this.gy;

            if (k >= 1) cv.phase = "come";
        }
        else {

            const dx = c.x - pos.x, dz = c.z - pos.z, d = Math.hypot(dx, dz) || 1;

            this.yaw = Math.atan2(-dx, -dz);

            model.root.rotation.y = this.yaw;

            model.floorY = CELLAR.y;

            this.speed = this.L.chase * 0.6;

            pos.x += (dx / d) * this.speed * dt;

            pos.z += (dz / d) * this.speed * dt;

            pos.y = CELLAR.y;

            this.gy = CELLAR.y;

            if (d < 1.0) {

                audio.stopMove();

                audio.stopStairs();

                audio.stopGhostWalk();

                audio.play("thud", { vol: 1.0, send: 0.3, ui: true });

                audio.ghostKill();

                this.cellarV = null;

                this.showDeath(null, "Ramu was waiting for you in the cellar. The trapdoor closed. Nobody heard you.");

                return true;
            }
        }

        model.update(dt, { speed: this.speed, run: false, look: c, open: undefined, calm: 1, leftTo: null, rightTo: null }, null, false);

        audio.ghostWalk(pos.x, pos.y + 0.1, pos.z, this.speed, false);

        ghostFx.x = pos.x; ghostFx.y = pos.y; ghostFx.z = pos.z;

        ghostFx.power = 0.5;

        return true;
    }

    startChase() {

        if (this.state === "chase") return;

        this.state = "chase";
        this.loseT = 0;
        this.chaseRepath = 0;
        this.path = [];
        this.dest = null;
        this.checking = null;

        // everything else he was doing is over; a crawling ghost gets up first
        if (this.gait === "crawl") { this.gait = "walk"; this.gaitT = 0.7; }

        this.idle = null; this.stalk = null; this.knock = null; this.watch = null; this.feint = null;
        this.silent = false;
        this.chaseT = 0;
        this.mercy = 0;
        this.checkStyle = null;

        const p = this.model.root.position;

        // the roar + the rising warning
        audio.ghostSfx("growl", p.x, this.eye.y, p.z, 1.0);

        audio.ghostWarn(1, audio.spatialPan(p.x, p.y + 1.5, p.z));

        this.warnCd = 10;

        events.emit("ghost-chase", {});
    }

    // ==================================================
    // WARNING SOUNDS, LIGHT FLICKER, DOORS
    // ==================================================
    effects(dt) {

        const pos = this.model.root.position;

        const c = this.camera.position;

        const dx = c.x - pos.x, dz = c.z - pos.z;

        const floors = Math.abs(this.player.pos.y - EYE - this.gy) / 4;

        // distance with a penalty for being on another floor
        const d = Math.hypot(dx, dz) + floors * 9;

        const near = clamp(1 - d / GHOST_CFG.warnDist, 0, 1);

        let level = near;

        if (this.state === "chase") level = Math.max(level, 0.65);

        // rises quickly, falls slowly: the warning "remembers"
        this.warn += (level - this.warn) * Math.min(1, dt * (level > this.warn ? 3 : 0.9));

        audio.ghostFear = this.warn;

        const pan = audio.spatialPan(pos.x, pos.y + 1.5, pos.z);

        // the "HIDE!" warning: faint at first, urgent when close
        this.warnCd -= dt;

        if (this.state !== "chase" && this.warn > 0.2 && this.warnCd <= 0 && !this.player.hidden) {

            audio.ghostWarn(this.warn, pan);

            this.warnCd = 16 - 9 * this.warn;
        }

        // breathing when he is near, scraping rope while he walks
        this.breathCd -= dt;

        const chasing = this.state === "chase";

        if ((d < 8 || chasing) && this.breathCd <= 0 && !this.silent) {

            // a chase: his breathing is heavy and fast and right behind you
            audio.ghostSfx("breath", pos.x, this.eye.y, pos.z, chasing ? 0.9 + near * 0.5 : 0.5 + near * 0.6);

            this.breathCd = chasing ? rnd(1.4, 2.4) : rnd(3.5, 7);
        }

        // ... and now and then he growls or shrieks while he runs at you
        this.growlCd = (this.growlCd || 0) - dt;

        if (chasing && this.growlCd <= 0) {

            this.growlCd = rnd(4.5, 8);

            audio.ghostSfx(Math.random() < 0.25 ? "scream" : "growl", pos.x, this.eye.y, pos.z, 0.65);
        }

        // the heavy iron chain he drags: spatial, louder and brighter the closer he is, quiet when he is far
        {
            const moving = this.speed > 0.4 || this.state === "chase";
            const lvl = Math.pow(clamp(1 - d / 17, 0, 1), 1.35);
            audio.chainUpdate(pos.x, pos.y + 0.15, pos.z, this.silent ? 0 : (moving ? lvl * (this.state === "chase" ? 1.2 : 1) * (this.gait === "crawl" ? 1.25 : 1) : lvl * 0.1));
        }

        // while you hide and he prowls near you: the footsteps outside, a creak, a breath, a knock, a whisper
        this.roamCd -= dt;

        if (this.isHiding() && d < 10 && this.roamCd <= 0) {
            events.emit("ghost-roam");
            this.roamCd = rnd(8, 14);
        }

        this.tensionCd = (this.tensionCd || rnd(5, 9)) - dt;

        if (this.isHiding() && d < 18 && this.tensionCd <= 0 && this.state !== "chase") {

            this.tensionCd = rnd(6, 13);

            const hp = this.player.pos;

            const r = Math.random();

            // sounds placed between him and your hiding place
            const bx = (pos.x + hp.x * 2) / 3, bz = (pos.z + hp.z * 2) / 3;

            if (r < 0.3) audio.creak(bx, hp.y, bz, 0.7);
            else if (r < 0.55) audio.ghostSfx("breath", bx, hp.y, bz, 0.8);
            else if (r < 0.75) audio.knock(bx, hp.y - 0.3, bz, 0.4);
            else if (r < 0.9) audio.distantSteps(pos.x, pos.y + 1, pos.z, 4, 0.7);
            else audio.ghostWhisper(bx, hp.y, bz, 0.5);
        }

        // lights flicker and the torch stutters when he is close
        ghostFx.x = pos.x;
        ghostFx.z = pos.z;
        ghostFx.y = this.gy;
        ghostFx.power = clamp(1 - d / 13, 0, 1);
        ghostFx.flashlight = this.warn > 0.55 ? (this.warn - 0.5) : 0;

        // the director's flicker: the lights around YOU stutter for a moment
        if (this.fxBurst) {

            this.fxBurst.t -= dt;

            ghostFx.power = 1;
            ghostFx.x = c.x;
            ghostFx.z = c.z;
            ghostFx.y = this.player.pos.y - EYE;
            ghostFx.flashlight = Math.max(ghostFx.flashlight, 0.5);

            if (this.fxBurst.t <= 0) this.fxBurst = null;
        }

        // doors move by themselves
        this.doorCd -= dt;

        if (this.doorCd <= 0 && d < 12 && this.state !== "chase") {
            this.nudgeDoor();
            this.doorCd = rnd(9, 20);
        }
    }

    // ==================================================
    // THE KILL
    // ==================================================
    startKill(fromHiding) {

        if (this.kill || this.dead) return;

        // called by the bell: he screams as he reaches you
        if (this.summoned) audio.play("scream", { vol: 1.0, send: 0.3, ui: true });

        const player = this.player;

        // pulled out of the cupboard
        if (player.hidden) player.exitHide();

        for (const k in player.keys) player.keys[k] = false;

        this.state = "kill";

        const cam = this.camera;

        const m = this.model.root.position;

        // he stands right in front of you, face to face
        let dx = m.x - cam.position.x;
        let dz = m.z - cam.position.z;

        const dl = Math.hypot(dx, dz) || 1;

        dx /= dl;
        dz /= dl;

        this.kill = {
            t: 0,
            phase: 1,
            camStart: cam.position.clone(),
            camFl: floorOf(cam.position.y - EYE),
            dirX: dx,
            dirZ: dz,
            fromHiding,
            shake: 1,
            yaw: Math.atan2(-dx, -dz),
            hist: [],
            door: null,
            fade: 0,
            room: null,
            seq: 0,
            slammed: false
        };

        // ghost: snap to 0.95 m in front of the camera, facing it
        const k = this.kill;

        const cx = cam.position.x, cz = cam.position.z;

        m.x = cx + dx * 0.95;
        m.z = cz + dz * 0.95;
        m.y = this.gy = FLOORS[k.camFl];

        this.fl = k.camFl;
        this.stairing = null;

        this.yaw = Math.atan2(-dx, -dz);

        this.speed = 0;

        this.path = [];
        this.dest = null;

        // choose the room he will drag you to (same floor, not locked)
        this.planDrag();

        audio.ghostKill();

        this.flash(1);

        ghostFx.power = 1;

        events.emit("ghost-kill", {});

        this.model.setVisible(true);
    }

    planDrag() {

        const k = this.kill;

        const m = this.model.root.position;

        const from = nearestNode(m.x, m.z, k.camFl, ["hall", "door", "room"]);

        // nearest unlocked room on this floor
        let best = null, bd = 1e9;

        for (const n of NAV.nodes) {

            if (n.fl !== k.camFl || n.type !== "room" || n.locked) continue;

            // the deep node of the room
            if (Math.abs(n.z) < 8.5) continue;

            const d = Math.hypot(n.x - m.x, n.z - m.z);

            if (d < bd) { bd = d; best = n; }
        }

        k.path = null;

        if (from && best) {

            const p = findPath(from.i, best.i);

            if (p) {

                k.path = p.map((i) => NAV.nodes[i]);
                k.roomNode = best;
                k.pi = 0;
                k.dragPath = true;
            }
        }
    }

    flash(a) {
        // (no red / white flash over the screen any more: no blur effects)
    }

    // point on the ghost's recent trail, `back` metres behind him
    trailPoint(out, back) {

        const h = this.kill.hist;

        let need = back;

        for (let i = h.length - 1; i > 0; i--) {

            const a = h[i], b = h[i - 1];

            const seg = Math.hypot(a.x - b.x, a.z - b.z);

            if (seg >= need) {

                const f = need / (seg || 1);

                out.x = a.x + (b.x - a.x) * f;
                out.z = a.z + (b.z - a.z) * f;

                return out;
            }

            need -= seg;
        }

        const first = h[0];

        out.x = first.x;
        out.z = first.z;

        return out;
    }

    updateKill(dt) {

        const k = this.kill;

        k.t += dt;

        const model = this.model;

        const m = model.root.position;

        const cam = this.camera;

        const dir = this.v1;

        model.root.rotation.y = this.yaw;

        model.floorY = this.gy;

        model.eyePos(this.eye);

        // ---- the camera is ours now ----
        const base = k.camStart;

        let camX = base.x, camY = base.y, camZ = base.z;

        let look = this.lookTarget;
        let roll = 0;
        let fov = 75;
        let leftTo = null, rightTo = null;
        let open = 1;
        let taut = false;
        let ropeEnd = null;
        let speed = 0;

        // shaking: strong at first, never quite gone
        const sh = k.shake;

        const jx = (Math.sin(k.t * 41) + Math.sin(k.t * 23.7)) * 0.5 * sh;
        const jy = (Math.sin(k.t * 37 + 1) + Math.sin(k.t * 19.3)) * 0.5 * sh;

        // ============ PHASE 1: he grabs you ============
        if (k.phase === 1) {

            const p = clamp(k.t / 1.3, 0, 1);

            // lunges to 0.6 m
            const dist = 0.95 - 0.36 * p;

            m.x = base.x + k.dirX * dist;
            m.z = base.z + k.dirZ * dist;

            camY = base.y - Math.sin(p * Math.PI) * 0.07;

            // the camera snaps back, then looks up at his face
            look.set(m.x, this.eye.y + 0.04, m.z);

            leftTo = this.leftTarget.set(base.x - k.dirZ * 0.18, base.y - 0.25, base.z + k.dirX * 0.18);
            rightTo = this.rightTarget.set(base.x + k.dirZ * 0.12, base.y - 0.3, base.z - k.dirX * 0.12);

            k.shake = 1 - p * 0.3;

            fov = 75 - 14 * Math.sin(p * Math.PI);

            if (k.t > 0.12) this.flash(Math.max(0, 1 - (k.t - 0.12) * 4));

            if (k.t >= 1.3) { k.phase = 2; k.t = 0; }
        }

        // ============ PHASE 2: the rope ============
        else if (k.phase === 2) {

            const p = clamp(k.t / 2.0, 0, 1);

            m.x = base.x + k.dirX * 0.6;
            m.z = base.z + k.dirZ * 0.6;

            // the rope end is tied round your neck (just below the camera)
            this.neck.set(
                base.x + k.dirX * 0.1,
                base.y - 0.3,
                base.z + k.dirZ * 0.1
            );

            ropeEnd = this.neck;

            taut = p > 0.5;

            leftTo = this.leftTarget.set(base.x - k.dirZ * 0.1, base.y - 0.1, base.z + k.dirX * 0.1);
            rightTo = this.rightTarget.copy(this.neck);

            // you struggle: the view whips about, slowly rolls and tilts up
            const struggle = 1 - p * 0.55;

            look.set(m.x, this.eye.y + 0.2 + p * 0.9, m.z);

            roll = Math.sin(k.t * 9) * 0.1 * struggle + p * 0.18;

            k.shake = 0.8 * struggle + 0.2;

            fov = 75 - p * 18;

            this.noose(true, p, base);

            this.dark(p * 0.5);

            if (k.t >= 2.0) {

                k.phase = 3;
                k.t = 0;

                // the trail starts where you are standing
                k.hist = [
                    { x: base.x, z: base.z },
                    { x: m.x, z: m.z }
                ];

                k.seq = 0;
                k.pi = 0;

                // the rope has to turn him round: first he walks to the first node
                this.yaw = this.yaw;
            }
        }

        // ============ PHASE 3 + 4: dragged to the room ============
        else if (k.phase === 3) {

            speed = GHOST_CFG.dragSpeed;

            taut = true;

            open = 0.6;

            // he walks the graph path, pulling the rope
            const path = k.path;

            if (path && path.length && k.pi < path.length) {

                const n = path[k.pi];

                const dx = n.x - m.x, dz = n.z - m.z;

                const d = Math.hypot(dx, dz);

                // the door of the room opens just before he gets there
                if (n.type === "door" && d < 3.2 && !k.door) {

                    let best = null, bd = 3;

                    for (const dd of this.doors) {
                        if (dd.fl !== k.camFl) continue;
                        const dist = Math.hypot(dd.x - n.x, dd.z - n.z);
                        if (dist < bd) { bd = dist; best = dd; }
                    }

                    if (best) {
                        k.door = best;
                        this.openDoor(best, true);
                    }
                }

                if (d < 0.35) {
                    k.pi++;
                }
                else {

                    const want = Math.atan2(dx, dz);

                    this.yaw += clamp(angDiff(this.yaw, want), -4 * dt, 4 * dt);

                    const mv = Math.min(d, speed * dt);

                    m.x += Math.sin(this.yaw) * mv;
                    m.z += Math.cos(this.yaw) * mv;

                    // height: stairs are never part of the drag (same floor)
                    this.speed = speed;
                }
            }
            else {

                // arrived (or no path at all): turns round to face you
                speed = 0;

                this.speed = 0;

                const toCamX = k.hist.length ? k.hist[0].x : base.x;

                k.arrived = (k.arrived || 0) + dt;
            }

            // trail of the ghost's footprints
            const last = k.hist[k.hist.length - 1];

            if (Math.hypot(m.x - last.x, m.z - last.z) > 0.08) {
                k.hist.push({ x: m.x, z: m.z });
            }

            // the camera drags along the trail, low, 1.4 m behind him
            this.trailPoint(this.v2, 1.45);

            camX = this.v2.x;
            camZ = this.v2.z;
            camY = FLOORS[k.camFl] + 0.85 + Math.sin(k.t * 3.2) * 0.04;

            this.neck.set(camX, camY - 0.18, camZ);

            ropeEnd = this.neck;

            look.set(m.x, this.eye.y - 0.2, m.z);

            roll = Math.sin(k.t * 2.6) * 0.1;

            k.shake = 0.35;

            fov = 62;

            this.noose(true, 1, null, camX, camY, camZ);

            this.dark(0.55);

            leftTo = null;
            rightTo = this.rightTarget.copy(this.neck);

            // the room: once you are inside, the door slams
            if (k.door && !k.slammed) {

                const dd = k.door;

                // is the camera past the door?
                const through = (Math.abs(camZ) > Math.abs(dd.z) + 1.1) &&
                    Math.sign(camZ) === Math.sign(dd.z - 0.001);

                if (through) {

                    k.slammed = true;

                    this.openDoor(dd, false);

                    audio.ghostSfx("slam", dd.x, dd.y, dd.z, 1.2);

                    k.slamT = 0;

                    k.shake = 1;
                }
            }

            // done when he has arrived in the room (or after 25 s no matter what)
            const arrivedRoom = !path || k.pi >= path.length;

            if ((arrivedRoom && (k.arrived || 0) > 0.8 && (k.slammed || !k.door)) || k.t > 28) {

                // turn the door shut even if the camera never reached it
                if (k.door && !k.slammed) {
                    k.slammed = true;
                    this.openDoor(k.door, false);
                    audio.ghostSfx("slam", k.door.x, k.door.y, k.door.z, 1.2);
                }

                k.phase = 5;
                k.t = 0;
                k.shake = 0.6;
            }
        }

        // ============ PHASE 5: the last moments ============
        else if (k.phase === 5) {

            speed = 0;

            taut = true;

            open = 1;

            // the camera stays where the trail ended, looking up at him
            this.trailPoint(this.v2, 1.2);

            camX = this.v2.x;
            camZ = this.v2.z;
            camY = FLOORS[k.camFl] + 0.7;

            this.neck.set(camX, camY - 0.18, camZ);

            ropeEnd = this.neck;

            // he turns toward you and leans down
            const want = Math.atan2(camX - m.x, camZ - m.z);

            this.yaw += clamp(angDiff(this.yaw, want), -5 * dt, 5 * dt);

            look.set(m.x, this.eye.y + 0.05, m.z);

            leftTo = this.leftTarget.set(camX, camY + 0.1, camZ);
            rightTo = this.rightTarget.copy(this.neck);

            roll = 0.22 + Math.sin(k.t * 7) * 0.02;

            fov = 56;

            k.shake = Math.max(0.12, 0.5 - k.t * 0.2);

            this.noose(true, 1, null, camX, camY, camZ);

            // a pause, then the final sound, then black
            if (k.t > 1.4 && !k.finalSound) {

                k.finalSound = true;

                audio.ghostSfx("growl", m.x, this.eye.y, m.z, 1.3);
                audio.ghostWarn(1, 0);
            }

            const fadeP = clamp((k.t - 2.0) / 1.6, 0, 1);

            this.dark(0.55 + fadeP * 0.45);

            ghostFx.power = 1;

            ghostFx.flashlight = 1;

            if (k.t > 3.8) {

                k.phase = 6;
                k.t = 0;

                this.dark(1);
            }
        }

        // ============ PHASE 6: black, then the death screen ============
        else if (k.phase === 6) {

            speed = 0;

            this.dark(1);

            if (k.t > 1.0 && !k.shown) {

                k.shown = true;

                this.showDeath(k.roomNode ? k.roomNode.room : null);
            }

            // keep the last picture
            camX = cam.position.x;
            camY = cam.position.y;
            camZ = cam.position.z;
        }

        // ---- apply the camera ----
        cam.fov += (fov - cam.fov) * Math.min(1, dt * 6);

        cam.updateProjectionMatrix();

        if (k.phase !== 6) {

            cam.position.set(
                camX + jx * 0.03,
                camY + jy * 0.025,
                camZ
            );

            this.up.set(Math.sin(roll), Math.cos(roll), 0);

            this.tmpM.lookAt(cam.position, look, this.up);

            cam.quaternion.setFromRotationMatrix(this.tmpM);
        }

        // the ghost's own height
        if (k.phase >= 3) {
            m.y = this.gy;
        }

        // ---- the ghost body + rope ----
        if (k.phase !== 3) this.speed = 0;

        audio.ghostWalk(m.x, m.y + 0.1, m.z, this.speed, false);

        model.update(dt, {
            speed: k.phase === 3 ? this.speed : 0,
            run: false,
            look,
            open,
            calm: 0,
            leftTo,
            rightTo
        }, ropeEnd, taut);

        // the noose follows the camera
        this.nooseFollow(dt);

        // ---- lights go wild ----
        ghostFx.x = m.x;
        ghostFx.z = m.z;
        ghostFx.y = this.gy;
    }

    // ---- the loop of rope around your neck (seen at the bottom of the view) ----
    noose(on, p, base, cx, cy, cz) {

        if (!this.nooseMesh) {

            const M = this.model.M;

            this.nooseMesh = new THREE.Mesh(
                new THREE.TorusGeometry(0.17, 0.024, 8, 24), M.rope
            );

            this.nooseMesh.frustumCulled = false;

            this.scene.add(this.nooseMesh);
        }

        this.nooseMesh.visible = on;

        this.nooseP = p;
    }

    nooseFollow(dt) {

        const n = this.nooseMesh;

        if (!n || !n.visible) return;

        const cam = this.camera;

        cam.updateMatrixWorld(true);

        // in the camera's frame: just below and in front of the lens
        this.v2.set(0, -0.3 - 0.04 * (1 - (this.nooseP || 0)), -0.34);

        cam.localToWorld(this.v2);

        n.position.copy(this.v2);

        n.quaternion.copy(cam.quaternion);

        n.rotateX(Math.PI / 2.4);

        const s = 1.6 - 0.65 * (this.nooseP || 0);

        n.scale.setScalar(s);
    }

    dark(a) {

        if (!this.darkEl) return;

        this.darkEl.style.opacity = String(clamp(a, 0, 1));
    }

    // ==================================================
    // DEATH SCREEN + DIFFICULTY PANEL (made in code)
    // ==================================================
    makeUI() {

        if (typeof document === "undefined") return;

        const style = document.createElement("style");

        style.textContent = `
#ghost-flash,#ghost-dark{position:fixed;inset:0;pointer-events:none;z-index:9000;opacity:0}
#ghost-flash{display:none}
#ghost-dark{background:#000;transition:opacity .25s}
#ghost-death{position:fixed;inset:0;z-index:9500;background:#000;display:none;flex-direction:column;
 align-items:center;justify-content:center;color:#a01212;font-family:Georgia,'Times New Roman',serif;
 text-align:center;opacity:0;transition:opacity 1.6s}
#ghost-death.show{opacity:1}
#ghost-death h1{font-size:64px;letter-spacing:14px;margin:0 0 14px;font-weight:400;text-shadow:0 0 26px #600}
#ghost-death p{color:#6d5a5a;font-size:17px;max-width:520px;line-height:1.6;margin:0 0 38px}
#ghost-death button{background:transparent;border:1px solid #6a1414;color:#c9bcbc;font:inherit;font-size:19px;
 letter-spacing:4px;padding:12px 38px;margin:8px;cursor:pointer;min-width:230px;transition:all .25s}
#ghost-death button:hover{background:#400a0a;color:#fff;border-color:#a01212;box-shadow:0 0 22px #500}
#ghost-diff{position:fixed;left:18px;bottom:18px;z-index:200;display:none;color:#8a7a7a;
 font-family:Georgia,'Times New Roman',serif;font-size:14px;letter-spacing:2px}
#ghost-diff span{margin-right:10px;text-transform:uppercase}
#ghost-diff button{background:rgba(0,0,0,.5);border:1px solid #4a2a2a;color:#8a7a7a;font:inherit;
 padding:6px 12px;margin-right:6px;cursor:pointer;text-transform:uppercase;letter-spacing:2px}
#ghost-diff button.on{border-color:#a01212;color:#e8d8d8;background:rgba(80,10,10,.6)}
`;

        document.head.appendChild(style);

        const mk = (id) => {
            const e = document.createElement("div");
            e.id = id;
            document.body.appendChild(e);
            return e;
        };

        this.flashEl = mk("ghost-flash");
        this.darkEl = mk("ghost-dark");

        // ---- death screen ----
        const death = mk("ghost-death");

        death.innerHTML =
            "<h1>YOU DIED</h1>" +
            "<p id='ghost-death-text'></p>" +
            "<div><button id='ghost-retry'>RETRY</button></div>" +
            "<div><button id='ghost-menu'>MAIN MENU</button></div>";

        this.deathEl = death;

        death.querySelector("#ghost-retry").addEventListener("click", () => {
            if (this.hooks.retry) this.hooks.retry();
        });

        death.querySelector("#ghost-menu").addEventListener("click", () => {
            if (this.hooks.menu) this.hooks.menu();
        });

        // ---- difficulty picker (title / menu screens) ----
        const diff = mk("ghost-diff");

        diff.innerHTML = "<span>Ghost</span>" +
            ["easy", "normal", "nightmare"].map((n) =>
                "<button data-d='" + n + "'>" + n + "</button>").join("");

        diff.addEventListener("click", (e) => {
            const b = e.target.closest("button[data-d]");
            if (b) this.setDifficulty(b.getAttribute("data-d"));
        });

        this.diffEl = diff;

        this.refreshUI();
    }

    refreshUI() {

        if (!this.diffEl) return;

        for (const b of this.diffEl.querySelectorAll("button")) {
            b.classList.toggle("on", b.getAttribute("data-d") === this.diffName);
        }
    }

    showDifficulty(on) {
        if (this.diffEl) this.diffEl.style.display = on ? "block" : "none";
    }

    // the old bell: the ghost comes, finds you wherever you are, and kills you
    summon() {

        if (!this.enabled || this.kill || this.dead || this.suspended) return;

        const c = this.camera.position;

        const pf = this.playerFloor();

        let cand = NAV.nodes.filter((n) => n.fl === pf && !n.locked && !n.yard && !n.spiral && (n.type === "hall" || n.type === "room") &&
            Math.hypot(n.x - c.x, n.z - c.z) > 9 && Math.hypot(n.x - c.x, n.z - c.z) < 20);

        if (!cand.length) cand = NAV.nodes.filter((n) => n.fl === pf && !n.locked && n.type === "hall");

        if (!cand.length) cand = NAV.nodes.filter((n) => !n.locked && n.type === "hall");

        const n = pick(cand);

        if (this.player.hidden) this.player.exitHide();

        this.summoned = true;

        const pos = this.model.root.position;

        pos.set(n.x, n.y, n.z);

        this.gy = n.y;

        this.fl = n.fl;

        this.stairing = null;

        this.curNode = n;

        this.visible = true;

        this.model.setVisible(true);

        this.model.rope.reset(this.model.handPos(this.hand));

        this.model.root.visible = true;

        this.flickerT = 0.9;

        this.speed = 0;

        this.path = [];

        this.dest = null;

        this.state = "wander";

        this.seen = true;

        this.lastKnown.copy(c);

        this.faceTo(c.x, c.z, true);

        this.startChase();
    }

    // falling from the roof / a window: no ghost needed
    fallDeath(drop) {

        if (this.dead || this.kill) return;

        audio.stopMove();

        audio.stopStairs();

        audio.stopGhostWalk();

        audio.play("thud", { vol: 1.0, send: 0.3, ui: true });

        audio.play("ghostKill", { vol: 0.7, send: 0.3, ui: true });

        this.flash(1);

        this.showDeath(null, "You fell " + Math.round(drop) + " metres. Nobody heard you land.");
    }

    showDeath(roomNumber, custom) {

        if (!this.deathEl) return;

        events.emit("player-died");

        const txt = this.deathEl.querySelector("#ghost-death-text");

        txt.textContent = custom ? custom : roomNumber
            ? "He dragged you to Room " + roomNumber + ". The door never opened again."
            : "Something took you. The door never opened again.";

        this.deathEl.style.display = "flex";

        // next frame so the fade runs
        requestAnimationFrame(() => this.deathEl.classList.add("show"));

        this.dead = true;

        if (this.onDeathScreen) this.onDeathScreen();
    }

    hideDeath() {

        if (this.deathEl) {
            this.deathEl.classList.remove("show");
            this.deathEl.style.display = "none";
        }

        this.dark(0);

        if (this.nooseMesh) this.nooseMesh.visible = false;

        this.camera.fov = 75;
        this.camera.updateProjectionMatrix();
    }
}

// (for tests / tuning: the navigation graph and its helpers)
export const _nav = { NAV, findPath, nearestNode, FLOORS, stairY };