import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

import { createGhostModel } from "./ghostmodel.js";
import { anim, ghostFx } from "./haunted.js";
import { audio } from "./audio.js";
import { events } from "./events.js";

// ======================================================
// THE GHOST OF HAVEN HOSTEL
//
//   WHO:   Ramu, 19, from Kothapalli village, a resident of Room 204.
//          Teased until he could bear it no more; he died in his room.
//          His one wish: his letter must reach his mother.
//          (The whole story is in clues.js and story.js.)
//
//   HOW IT WORKS (everything is in this file + ghostmodel.js):
//
//     SPAWN     an unseen spawn manager puts him in the hostel
//               at random places and times (never in view, never
//               in a locked room, never on top of you)
//     WANDER    slow heavy walk along a waypoint graph that
//               follows the REAL corridors, doors and stairs
//     SUSPICIOUS he heard something (running, doors, light):
//               goes to where it came from
//     SEARCH    looks round, checks rooms and hiding places
//     CHASE     he SAW you: fast, but you can out-run him
//     ATTACK    caught: rope, drag, room, door, black screen
//
//   He is NOT omniscient: sight = distance + view cone + a ray
//   that walls and closed doors block; hearing = how loud you
//   are; a hidden player is only found if he saw you hide or
//   if his search happens to check your hiding place.
//
//   Tune everything in GHOST_CFG below.
// ======================================================

// ------------------------------------------------------
// ALL THE NUMBERS (world units are metres)
// ------------------------------------------------------
export const GHOST_CFG = {

    difficulty: "normal",

    // Ramu is FAST and he never stops roaming: all floors, the stairs and the terrace.
    // Once he has SEEN you he runs faster than you can run (the player runs at 9)
    // and kills quickly.  Only a hiding place saves you - unless he saw you go in.
    levels: {

        easy: {
            walk: 1.9,            // roaming speed
            chase: 8.2,           // chase speed (the player walks at 5, runs at 9)
            vision: 35,           // how far he can see you (he spots you from far away)
            fov: 360,             // he sees from ANY side: front, back, left, right
            hear: 1.0,            // multiplies how far your noise carries
            search: [5, 9],       // seconds he searches after losing you (then he goes away)
            cooldown: [5, 12],    // seconds between his appearances
            life: [120, 220],     // seconds he stays before vanishing
            attack: 1.8,          // distance at which he grabs you
            lose: 1.4,            // seconds without seeing you before searching
            find: 0.04,           // chance a check finds an UNSEEN hider
            checkHide: 0.15,      // chance he checks a hiding place at all
            near: 0.2             // chance a spawn is close / behind you
        },

        normal: {
            walk: 2.4, chase: 10.0, vision: 45, fov: 360, hear: 1.25,
            search: [5, 9], cooldown: [3, 8], life: [150, 260],
            attack: 2.0, lose: 1.2, find: 0.05, checkHide: 0.15, near: 0.28
        },

        nightmare: {
            walk: 3.0, chase: 11.5, vision: 55, fov: 360, hear: 1.6,
            search: [7, 12], cooldown: [2, 5], life: [200, 320],
            attack: 2.2, lose: 1.6, find: 0.12, checkHide: 0.3, near: 0.4
        }
    },

    warnDist: 10,         // the "hide!" warning starts at this distance
    spawnMinDist: 13,     // never closer than this (except "near" spawns)
    nearMinDist: 7,       // "near" spawns: behind you, at least this far
    firstSpawnDelay: [12, 22],   // grace at the start of a game
    dragSpeed: 1.7,       // how fast he drags you
    statueChance: 0,      // (off) he never stands still waiting
    roomStandChance: 0 // (off)
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
const HOSTEL_FLOORS = 3;           // floors with a hall and rooms
const EYE = 1.7;
const DOOR_X = [-10.5, -3.5, 3.5, 10.5];
const ROOM_CX = [-11, -3.5, 3.5, 11];
const HALL_X = [-10.5, -7, -3.5, 0, 3.5, 7, 10.5];

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
        events.on("door", () => this.addNoise(11));
        events.on("flashlight", () => this.addNoise(5));
        events.on("hide", () => this.onPlayerHide());
    }

    // ==================================================
    // WORLD CACHES
    // ==================================================
    cacheWorld() {

        // room doors (their closed positions)
        const wp = new THREE.Vector3();

        for (const d of anim.doors) {

            if (d.kind !== "room") continue;

            const mesh = d.pivot.children[0];

            if (!mesh) continue;

            mesh.updateWorldMatrix(true, false);

            mesh.getWorldPosition(wp);

            this.doors.push({
                d,
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

        this.despawn(true);

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

        const n = this.chooseSpawn();

        if (!n) {
            this.cool = 6;
            return;
        }

        this.spawnPlan = { node: n, t: rnd(2.5, 4.5) };

        this.state = "pending";

        // before he is seen: a sound from the place he is about to appear
        audio.ghostSfx(pick(["ropeScrape", "breath", "ropeScrape"]), n.x, n.y + 1.3, n.z, 0.9);

        ghostFx.x = n.x;
        ghostFx.z = n.z;
        ghostFx.y = n.y;
        ghostFx.power = 0.8;
    }

    finishSpawn() {

        const n = this.spawnPlan.node;

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

        events.emit("ghost-spawn", { x: n.x, z: n.z, mode });
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

        const half = (this.L.fov * Math.PI / 180) / 2;

        if (dist > 1.6 && Math.acos(clamp(dot, -1, 1)) > half) return false;

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

        if (this.state === "wander" || this.state === "stand") {
            this.state = "suspicious";
            this.goTo(this.noiseAt.x, this.noiseAt.z, floorOf(pos.y - EYE));
            this.pause = 0;
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

        return !this.cs.check(this.cpos, 0.3, EYE);
    }

    // open any closed room door in front of the ghost (silently for the achievements)
    doorsAhead(wx, wz, force) {

        const pos = this.model.root.position;

        const reach = force ? 1.6 : 1.5;

        for (const dd of this.doors) {

            if (dd.fl !== this.fl) continue;
            if (dd.d.isOpen) continue;

            const cx = dd.x - pos.x, cz = dd.z - pos.z;

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

    openDoor(dd, open) {

        const d = dd.d;

        if (d.isOpen === open) return;

        d.silent = true;

        d.setOpen(open);

        d.silent = false;

        audio.door(d.kind, dd.x, dd.y, dd.z, open);
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
    pickWanderTarget() {

        const seenSet = this.visitedNodes;

        const nodesOf = (f) => NAV.nodes.filter((n) => n.fl === f && !n.locked &&
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

    beginSearch(center, fl, urgent) {

        this.state = "search";

        this.searchT = rnd(this.L.search[0], this.L.search[1]);

        if (urgent) this.searchT *= 1.1;

        this.linger = 0;
        this.checking = null;

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

        const rooms = NAV.nodes.filter((n) => n.fl === fl && n.type === "room" && !n.locked &&
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

        const p = this.player;

        const inside = this.isHiding() && p.pos.distanceTo(spot.pos) < 1.3;

        if (!inside) return;

        // a seen hider is found; an unseen one only now and then
        const chance = sure ? 1.0 : this.L.find;

        if (Math.random() < chance) {
            this.startKill(true);
        }
        else {
            // a close call: he leans in, listens, and moves on
            audio.ghostSfx("breath", spot.exit.x, EYE, spot.exit.z, 1.0);
            this.addNoise(0);
        }
    }

    vanish() {
        this.state = "fade";
        this.fadeT = 0.7;
    }

    // ==================================================
    // PER-FRAME
    // ==================================================
    update(dt, t) {

        this.clock += dt;

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

                if (this.pause > 0) {

                    this.pause -= dt;

                    this.speed = 0;
                }
                else if (this.path.length === 0 && !this.dest) {

                    const n = this.pickWanderTarget();

                    this.goTo(n.x, n.z, n.fl);

                    if (this.path.length === 0 && !this.dest) this.pause = 0.4;
                }
                else {

                    // sometimes he just stops and stares into a room
                    if (this.advance(dt, L.walk, 3.0)) {
                        this.pause = rnd(0.1, 0.5);
                    }

                    move = true;
                }

                // he dies away when his time is up and nobody is looking
                if (this.life <= 0 && !this.playerSeesGhost()) this.vanish();

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
                    this.pause -= dt;
                    this.speed = 0;
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

                        // reaching toward the cupboard door
                        rightTo = this.leftTarget.set(this.checking.spot.pos.x, this.gy + 1.15, this.checking.spot.pos.z);
                        look = this.lookTarget.set(this.checking.spot.pos.x, this.gy + 1.2, this.checking.spot.pos.z);

                        if (this.linger <= 0) {
                            this.resolveCheck(this.checking.spot, this.checking.sure);
                            if (this.kill) break;
                        }
                    }
                    else if (this.linger <= 0 && this.targets.length === 0) {
                        // finished: gives up and goes back to wandering
                        this.state = "wander";
                        this.path = [];
                        this.dest = null;
                        this.pause = rnd(1, 3);
                    }

                    break;
                }

                if (this.advance(dt, L.walk * 1.5, 3.2)) {

                    // arrived at a target
                    const cur = this.cur;

                    this.cur = null;

                    if (cur && cur.kind === "spot") {

                        this.checking = cur;
                        this.linger = 2.3;

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

                // out of time: back to wandering
                if (this.searchT <= 0 && !this.checking && !(this.cur && this.cur.sure)) {
                    this.state = "wander";
                    this.path = [];
                    this.dest = null;
                    this.pause = rnd(1, 3);
                }

                break;
            }

            case "chase": {

                run = true;

                calm = 0;

                open = 1;

                if (this.seen) this.loseT = 0; else this.loseT += dt;

                const c = this.camera.position;

                const dist = Math.hypot(c.x - pos.x, c.z - pos.z);

                const dy = Math.abs(c.y - this.eye.y);

                look = this.lookTarget.set(c.x, c.y - 0.1, c.z);

                // caught!
                if (dist < L.attack && dy < 1.7 && this.playerInside() && (this.seen || dist < 1.1)) {
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
                this.advance(dt, L.chase * (0.38 + 0.62 * near), 8);

                move = true;

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
        model.update(dt, {
            speed: this.speed,
            run,
            look: look || (this.seen ? this.lookTarget.copy(this.camera.position) : null),
            open,
            calm,
            leftTo: leftTo || (run && this.seen ? this.leftTarget.copy(this.camera.position) : null),
            rightTo
        }, null, false);

        // he blinks in when he appears
        if (this.flickerT > 0 && this.state !== "fade") {

            this.flickerT -= dt;

            model.setVisible(Math.sin(this.clock * 45) > -0.1 || this.flickerT <= 0);
        }

        // ---- sound + light effects around him ----
        audio.ghostWalk(pos.x, pos.y + 0.1, pos.z, this.state === "fade" ? 0 : this.speed, run);

        this.effects(dt);

        // ---- he walks into you ----
        const c = this.camera.position;

        const hd = Math.hypot(c.x - pos.x, c.z - pos.z);

        if (hd < 0.55 && Math.abs(c.y - this.eye.y) < 1.4 && this.state !== "fade" &&
            this.playerInside() && !this.isHiding()) {

            if (this.state === "statue") this.vanish();
            else this.startKill(false);
        }
    }

    startChase() {

        if (this.state === "chase") return;

        this.state = "chase";
        this.loseT = 0;
        this.chaseRepath = 0;
        this.path = [];
        this.dest = null;
        this.checking = null;

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

        if (d < 8 && this.breathCd <= 0) {
            audio.ghostSfx("breath", pos.x, this.eye.y, pos.z, 0.5 + near * 0.6);
            this.breathCd = rnd(3.5, 7);
        }

        this.scrapeCd -= dt;

        if (this.speed > 0.4 && this.scrapeCd <= 0 && this.state !== "chase") {
            audio.ghostSfx("ropeScrape", pos.x, pos.y + 0.1, pos.z, 0.55);
            this.scrapeCd = rnd(2.8, 5.5);
        }

        // while you hide and he prowls near you
        this.roamCd -= dt;

        if (this.isHiding() && d < 10 && this.roamCd <= 0) {
            events.emit("ghost-roam");
            this.roamCd = rnd(8, 14);
        }

        // lights flicker and the torch stutters when he is close
        ghostFx.x = pos.x;
        ghostFx.z = pos.z;
        ghostFx.y = this.gy;
        ghostFx.power = clamp(1 - d / 13, 0, 1);
        ghostFx.flashlight = this.warn > 0.55 ? (this.warn - 0.5) : 0;

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
        if (this.flashEl) this.flashEl.style.opacity = String(a);
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
#ghost-flash{background:radial-gradient(circle,rgba(255,255,255,.95),rgba(140,0,0,.9) 70%);transition:opacity .08s}
#ghost-dark{background:radial-gradient(circle at 50% 55%,rgba(0,0,0,0) 15%,#000 85%);transition:opacity .25s}
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

    // falling from the roof / a window: no ghost needed
    fallDeath(drop) {

        if (this.dead || this.kill) return;

        audio.stopMove();

        audio.stopStairs();

        audio.stopGhostWalk();

        audio.play("ghostKill", { vol: 1.0, send: 0.3, ui: true });

        this.flash(1);

        this.showDeath(null, "You fell " + Math.round(drop) + " metres. Nobody heard you land.");
    }

    showDeath(roomNumber, custom) {

        if (!this.deathEl) return;

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
