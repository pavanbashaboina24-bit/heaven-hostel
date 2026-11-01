import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

import { inventory } from "./inventory.js";
import { audio } from "./audio.js";
import { story } from "./story.js";
import { frameHooks, getPlayer } from "./haunted.js";
import { tween } from "./secrets.js";

// ======================================================
// THE BACK STAIRS:  a round iron staircase behind the hostel
// that climbs to the terrace.
//
//   - it stands on the west side (the back) of the compound
//   - an iron cage with a LOCKED GATE closes the foot of it
//   - the key (spiral_key) lies in a random room of the hostel
//     (gen.js: rooms.gatekey, the hint is on the terrace photograph)
//   - when you go in, the gate slams shut behind you and a message
//     tells you that Heaven Hostel is locked until Ramu's story ends
//   - at the top a short bridge leads onto the terrace
//     (a gap in the west parapet, world.js)
//
// Edit the numbers below to move or resize it.
// ======================================================

export const SPIRAL = {
    cx: -20.5, cz: 12.0,       // centre of the tower
    r0: 0.40, r1: 2.40,        // the walkable part of a tread (from, to)
    per: 16,                   // treads in one full turn
    n: 44,                     // number of treads
    top: 12,                   // height of the terrace
    fence: 3.05                // radius of the cage
};

// the terrace ends here: a gap in the west parapet (see world.js)
export const BRIDGE = { z0: 10.8, z1: 13.2, xEnd: -14.9 };

inventory.define("spiral_key", {
    name: "Old iron key (back stairs)", kind: "thing", icon: "\uD83D\uDDDD\uFE0F", text: ""
});

const TAU = Math.PI * 2;

export function buildSpiral(scene, cs, interaction) {

    const S = SPIRAL;

    const dA = TAU / S.per;

    const rise = S.top / S.n;

    // the top tread points to the building (+x), the first one to the south
    const aTop = 0;

    const a0 = aTop - ((S.n - 1) % S.per + 0.5) * dA;

    const centreAngle = (j) => a0 + (j % S.per + 0.5) * dA;

    // ---------------------------------------------------- walking surface
    cs.spirals.push({
        cx: S.cx, cz: S.cz, r0: S.r0, r1: S.r1, a0, dA, per: S.per, n: S.n, y0: 0, rise
    });

    const iron = new THREE.MeshStandardMaterial({ color: 0x3a3b3e, roughness: 0.6, metalness: 0.55 });

    const rust = new THREE.MeshStandardMaterial({ color: 0x4a3a2e, roughness: 0.9, metalness: 0.3 });

    const conc = new THREE.MeshStandardMaterial({ color: 0x4a4944, roughness: 1 });

    const hidden = new THREE.MeshBasicMaterial({ visible: false });

    const group = new THREE.Group();

    group.position.set(S.cx, 0, S.cz);

    scene.add(group);

    const dummy = new THREE.Object3D();

    // collision helper: an invisible box (world coordinates)
    const wallBox = (x, yb, z, w, h, d) => {

        const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hidden);

        o.position.set(x, yb + h / 2, z);

        o.updateMatrixWorld(true);

        cs.add(o);

        return o;
    };

    // ---------------------------------------------------- base + centre pole
    const base = new THREE.Mesh(new THREE.CylinderGeometry(S.fence + 0.25, S.fence + 0.25, 0.04, 40), conc);

    base.position.y = 0.02;

    group.add(base);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, S.top + 0.4, 14), iron);

    pole.position.y = (S.top + 0.4) / 2;

    group.add(pole);

    wallBox(S.cx, 0, S.cz, 0.6, S.top + 0.4, 0.6);

    // ---------------------------------------------------- treads (one draw call)
    // one wedge, centred on angle 0 (three.js: x = sin t, z = cos t, so t = 90deg - a)
    const wedge = new THREE.CylinderGeometry(S.r1, S.r1, 0.12, 1, 1, false, Math.PI / 2 - dA / 2, dA);

    const treads = new THREE.InstancedMesh(wedge, rust, S.n);

    for (let j = 0; j < S.n; j++) {

        dummy.position.set(0, (j + 1) * rise - 0.06, 0);

        // the wedge is built around angle 0 (+x); turn it to the tread's own angle
        dummy.rotation.set(0, -centreAngle(j), 0);

        dummy.scale.set(1, 1, 1);

        dummy.updateMatrix();

        treads.setMatrixAt(j, dummy.matrix);
    }

    group.add(treads);

    // ---------------------------------------------------- rail: posts, handrail, colliders
    const RAIL_R = 2.3;

    const first = 2;                    // the first two treads stay open (you step on there)

    const posts = [];

    // (the last two treads stay open too: that is where you step onto the bridge)
    for (let j = first; j < S.n - 2; j++) {

        const a = centreAngle(j);

        const px = Math.cos(a) * RAIL_R, pz = Math.sin(a) * RAIL_R;

        const top = (j + 1) * rise;

        posts.push({ x: px, z: pz, y0: top, y1: top + 0.95, j });

        // an invisible block you can not walk through
        wallBox(S.cx + Math.cos(a) * (RAIL_R + 0.2), top, S.cz + Math.sin(a) * (RAIL_R + 0.2), 0.44, 1.1, 0.44);
    }

    const postGeo = new THREE.CylinderGeometry(0.03, 0.03, 1, 6);

    const postMesh = new THREE.InstancedMesh(postGeo, iron, posts.length);

    posts.forEach((p, i) => {

        dummy.position.set(p.x, (p.y0 + p.y1) / 2, p.z);

        dummy.rotation.set(0, 0, 0);

        dummy.scale.set(1, p.y1 - p.y0, 1);

        dummy.updateMatrix();

        postMesh.setMatrixAt(i, dummy.matrix);
    });

    group.add(postMesh);

    const railGeo = new THREE.BoxGeometry(1, 1, 1);

    const rails = new THREE.InstancedMesh(railGeo, iron, posts.length - 1);

    for (let i = 0; i < posts.length - 1; i++) {

        const p = posts[i], q = posts[i + 1];

        const a = new THREE.Vector3(p.x, p.y1, p.z), b = new THREE.Vector3(q.x, q.y1, q.z);

        dummy.position.copy(a).add(b).multiplyScalar(0.5);

        dummy.lookAt(dummy.position.x + (b.x - a.x), dummy.position.y + (b.y - a.y), dummy.position.z + (b.z - a.z));

        dummy.scale.set(0.05, 0.05, a.distanceTo(b));

        dummy.updateMatrix();

        rails.setMatrixAt(i, dummy.matrix);
    }

    group.add(rails);

    // ---------------------------------------------------- the cage round the foot
    const gateA = centreAngle(0);                       // the gate faces the first tread

    const NB = 36;

    const dB = TAU / NB;

    const gateHalf = 1.5 * dB;                          // half opening of the gate (radians)

    // bars stand every 10 degrees; the gate sits exactly between two of them
    const wrap = (t) => Math.abs(((t - gateA + Math.PI) % TAU + TAU) % TAU - Math.PI);

    const inGate = (t) => wrap(t) < gateHalf - 1e-3;

    const bars = [];

    for (let i = 0; i < NB; i++) {

        const a = gateA + (i + 0.5) * dB;

        if (inGate(a)) continue;

        bars.push(a);
    }

    const barMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.025, 0.025, 2.5, 6), iron, bars.length);

    bars.forEach((a, i) => {

        dummy.position.set(Math.cos(a) * S.fence, 1.25, Math.sin(a) * S.fence);

        dummy.rotation.set(0, 0, 0);

        dummy.scale.set(1, 1, 1);

        dummy.updateMatrix();

        barMesh.setMatrixAt(i, dummy.matrix);

        wallBox(S.cx + Math.cos(a) * S.fence, 0, S.cz + Math.sin(a) * S.fence, 0.34, 2.5, 0.34);
    });

    group.add(barMesh);

    // horizontal bars between neighbours (not across the gate)
    const hbars = [];

    for (let i = 0; i < NB; i++) {

        const a = gateA + (i + 0.5) * dB, b = a + dB;

        if (inGate(a) || inGate(b)) continue;

        for (const y of [0.55, 2.4]) hbars.push({ a, b, y });
    }

    const hMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.04, 0.04), iron, hbars.length);

    hbars.forEach((h, i) => {

        const x1 = Math.cos(h.a) * S.fence, z1 = Math.sin(h.a) * S.fence;

        const x2 = Math.cos(h.b) * S.fence, z2 = Math.sin(h.b) * S.fence;

        dummy.position.set((x1 + x2) / 2, h.y, (z1 + z2) / 2);

        dummy.rotation.set(0, -Math.atan2(z2 - z1, x2 - x1), 0);

        dummy.scale.set(Math.hypot(x2 - x1, z2 - z1) + 0.04, 1, 1);

        dummy.updateMatrix();

        hMesh.setMatrixAt(i, dummy.matrix);
    });

    group.add(hMesh);

    for (const m of [treads, postMesh, rails, barMesh, hMesh]) m.frustumCulled = false;

    // ---------------------------------------------------- the gate
    const hingeA = gateA - gateHalf;

    const farA = gateA + gateHalf;

    const hx = Math.cos(hingeA) * S.fence, hz = Math.sin(hingeA) * S.fence;

    const fx = Math.cos(farA) * S.fence, fz = Math.sin(farA) * S.fence;

    const gw = Math.hypot(fx - hx, fz - hz);

    const closedYaw = Math.atan2(-(fz - hz), fx - hx);

    // swing OUTWARD (away from the tower): pick the direction that puts the panel further out
    const outDist = (yaw) => {
        const mx = hx + Math.cos(yaw) * gw / 2, mz = hz - Math.sin(yaw) * gw / 2;
        return Math.hypot(mx, mz);
    };

    const openYaw = outDist(closedYaw + 1.75) > outDist(closedYaw - 1.75) ? closedYaw + 1.75 : closedYaw - 1.75;

    const gate = new THREE.Group();

    gate.position.set(hx, 0, hz);

    group.add(gate);

    for (let i = 0; i <= 6; i++) {

        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.3, 6), iron);

        bar.position.set((gw / 6) * i, 1.2, 0);

        gate.add(bar);
    }

    for (const y of [0.35, 1.2, 2.3]) {

        const rail = new THREE.Mesh(new THREE.BoxGeometry(gw, 0.05, 0.05), iron);

        rail.position.set(gw / 2, y, 0);

        gate.add(rail);
    }

    // the padlock + chain
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.06), new THREE.MeshStandardMaterial({ color: 0x6a5a30, roughness: 0.5, metalness: 0.7 }));

    lock.position.set(gw - 0.12, 1.2, 0.06);

    gate.add(lock);

    // what stops you while the gate is shut: a row of SMALL boxes along the gate line
    // (one big box would reach into the cage and trap you inside it)
    const gx = S.cx + (hx + fx) / 2, gz = S.cz + (hz + fz) / 2;

    const gateBlocks = [];

    for (let i = 0; i <= 6; i++) {

        const t = i / 6;

        gateBlocks.push(wallBox(S.cx + hx + (fx - hx) * t, 0, S.cz + hz + (fz - hz) * t, 0.32, 2.5, 0.32));
    }

    let blocking = true;

    const setBlock = (on) => {

        if (on && !blocking) { for (const b of gateBlocks) cs.objects.push(b); blocking = true; }

        if (!on && blocking) {

            for (const b of gateBlocks) {

                const i = cs.objects.indexOf(b);

                if (i >= 0) cs.objects.splice(i, 1);
            }

            blocking = false;
        }
    };

    // ---------------------------------------------------- bridge to the terrace
    const bx0 = S.cx + S.r1 - 0.3, bx1 = BRIDGE.xEnd + 0.4;

    const bridge = new THREE.Mesh(new THREE.BoxGeometry(bx1 - bx0, 0.2, BRIDGE.z1 - BRIDGE.z0), rust);

    bridge.position.set((bx0 + bx1) / 2, S.top - 0.1, (BRIDGE.z0 + BRIDGE.z1) / 2);

    scene.add(bridge);

    cs.platforms.push({ x0: bx0, x1: BRIDGE.xEnd, z0: BRIDGE.z0, z1: BRIDGE.z1, y: S.top });

    for (const z of [BRIDGE.z0 + 0.05, BRIDGE.z1 - 0.05]) {

        const r = new THREE.Mesh(new THREE.BoxGeometry(bx1 - bx0, 0.06, 0.06), iron);

        r.position.set((bx0 + bx1) / 2, S.top + 0.95, z);

        scene.add(r);

        wallBox((bx0 + bx1) / 2, S.top, z + (z < 12 ? -0.1 : 0.1), bx1 - bx0 - 0.6, 1.0, 0.2);
    }

    // ---------------------------------------------------- the lock: E on the gate
    const trig = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));

    trig.scale.set(2.2, 2.2, 2.2);

    trig.position.set(gx + (gx - S.cx) * 0.18, 1.1, gz + (gz - S.cz) * 0.18);

    trig.visible = false;

    scene.add(trig);

    trig.userData.getPrompt = () => {

        if (inventory.flag("spiral_shut")) return "The gate is locked";

        if (inventory.flag("spiral_open")) return "Go in - the iron stairs to the terrace";

        return inventory.has("spiral_key") ? "Press E - Unlock the gate" : "Press E - Look at the gate";
    };

    trig.userData.interact = () => {

        if (inventory.flag("spiral_shut")) {

            audio.doorLocked();

            inventory.say("The gate has locked behind you. There is only one way: up.", 3.5);

            return;
        }

        if (inventory.flag("spiral_open")) return;

        if (inventory.has("spiral_key")) {

            inventory.remove("spiral_key");

            inventory.setFlag("spiral_open");

            audio.keyUnlock();

            audio.play("creak_1", { vol: 0.9, send: 0.25, t: 0.3 });

            inventory.say("The key turns. The old padlock falls open and the gate creaks wide.", 3.5);

            setBlock(false);

            tween(gate, "rotation.y", openYaw, 800);
        }
        else {

            audio.doorLocked();

            inventory.say("A heavy padlock. The iron stairs behind this gate lead up to the terrace.\nThe key must be somewhere inside the hostel.", 4.5);
        }
    };

    interaction.add(trig);

    // ---------------------------------------------------- "you are locked in"
    const welcome = () => {

        inventory.setFlag("spiral_shut");

        // never close the gate ON the player: step him a little towards the middle
        const p0 = getPlayer();

        if (p0) {

            const dx = p0.pos.x - gx, dz = p0.pos.z - gz;

            const d = Math.hypot(dx, dz);

            if (d < 1.6) {

                const ux = (S.cx - gx) / (Math.hypot(S.cx - gx, S.cz - gz) || 1), uz = (S.cz - gz) / (Math.hypot(S.cx - gx, S.cz - gz) || 1);

                p0.pos.x += ux * (1.6 - d);

                p0.pos.z += uz * (1.6 - d);
            }
        }

        setBlock(true);

        tween(gate, "rotation.y", closedYaw, 250);

        audio.play("slam", { vol: 1.2, send: 0.25 });

        setTimeout(() => {

            story.pages([
                { img: "story_gate.jpg", title: "LOCKED IN", text: "THE GATE SLAMS SHUT BEHIND YOU.\n\nThe lock turns by itself.\nSomewhere above you, slow footsteps start to walk." },
                { img: "story_gate.jpg", text: "YOU ARE LOCKED IN WITH THE GHOST.\n\nHeaven Hostel has been locked since the night Ramu died. No one who came in was ever allowed to leave.\n\nThere is only one way out: finish what he began.\nSolve his puzzles, find his letter, and the hostel will show you the way." }
            ], { last: "Enter  -  climb" });

        }, 700);
    };

    frameHooks.push(() => {

        if (!inventory.flag("spiral_open") || inventory.flag("spiral_shut")) return;

        const p = getPlayer();

        if (!p || story.busy) return;

        // as soon as you are inside the cage (a bit past the gate)
        if (Math.hypot(p.pos.x - S.cx, p.pos.z - S.cz) < S.fence - 1.0 && p.pos.y < 3.5) welcome();
    });

    // ---------------------------------------------------- new game: lock it again
    const sync = () => {

        const open = inventory.flag("spiral_open") && !inventory.flag("spiral_shut");

        gate.rotation.y = open ? openYaw : closedYaw;

        setBlock(!open);
    };

    inventory.resetHooks.push(sync);

    sync();
}
