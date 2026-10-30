import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

// ======================================================
// THE SWING  +  THE BOY WHO SITS ON IT
//
// Layout (local to the swing group, origin = the top beam):
//   - the beam runs along X, the swing moves back and forth
//     along Z, and the boy sits FACING +Z (toward the hostel),
//     so the player always looks STRAIGHT at the front of the
//     swing / straight ahead while sitting (never sideways).
//   - rope length ROPE, seat in the middle.
//
// The player is a 14 year old boy: small hands, thin arms,
// short legs.  While seated you can see your hands holding
// the ropes, your arms, your shirt, and (look down) your
// legs - they kick out and tuck in as the swing moves.
// ======================================================

export const ROPE = 2.35;

// hands + arms on the ropes: OFF (set to true to bring them back)
const SHOW_HANDS = false;

const SEAT_Y = -ROPE;                 // centre of the seat plank
const SEAT_TOP = SEAT_Y + 0.025;

// where the eyes of the seated boy are (swing-local)
export const EYE = new THREE.Vector3(0, SEAT_TOP + 0.66, -0.10);

function limb(parent, mat, a, b, r0, r1, seg) {

    const dir = new THREE.Vector3().subVectors(b, a);

    const len = dir.length();

    const m = new THREE.Mesh(
        new THREE.CylinderGeometry(r1, r0, len, seg || 10),
        mat
    );

    m.position.copy(a).addScaledVector(dir, 0.5);

    m.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0), dir.normalize()
    );

    parent.add(m);

    return m;
}

function ball(parent, mat, r, x, y, z, sx, sy, sz) {

    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), mat);

    m.position.set(x, y, z);

    m.scale.set(sx || 1, sy || 1, sz || 1);

    parent.add(m);

    return m;
}

// ------------------------------------------------------
// the boy (arms, hands, shirt, jeans, legs, shoes)
// ------------------------------------------------------
export function buildBoy() {

    const boy = new THREE.Group();

    const skin = new THREE.MeshStandardMaterial({
        color: 0xa87450, roughness: 0.75,
        emissive: 0x24140a, emissiveIntensity: 0.6
    });

    const shirt = new THREE.MeshStandardMaterial({
        color: 0x4b5668, roughness: 0.95,
        emissive: 0x0d1118, emissiveIntensity: 0.6
    });

    const jeans = new THREE.MeshStandardMaterial({
        color: 0x1f2f52, roughness: 0.95,
        emissive: 0x070b14, emissiveIntensity: 0.6
    });

    const shoe = new THREE.MeshStandardMaterial({
        color: 0xc9c6bd, roughness: 0.8,
        emissive: 0x1a1a18, emissiveIntensity: 0.5
    });

    const sole = new THREE.MeshStandardMaterial({
        color: 0x1b1b1b, roughness: 1
    });

    // ---------- torso (so looking down you see your shirt) ----------
    const torso = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.50, 0.19), shirt
    );

    torso.position.set(0, SEAT_TOP + 0.27, -0.16);

    boy.add(torso);

    // ---------- arms: shoulder -> elbow -> hand on the rope ----------
    // The arms / hands are switched OFF (SHOW_HANDS = false at the top):
    // the player only sees the legs while swinging.
    const arms = new THREE.Group();

    arms.visible = SHOW_HANDS;

    boy.add(arms);

    boy.userData.hands = [];

    for (const s of [-1, 1]) {

        const shoulder = new THREE.Vector3(s * 0.20, SEAT_TOP + 0.47, -0.17);

        const elbow = new THREE.Vector3(s * 0.285, SEAT_TOP + 0.34, -0.02);

        const hand = new THREE.Vector3(s * 0.235, SEAT_TOP + 0.50, 0.17);

        // short sleeve on the upper arm, bare forearm
        limb(arms, shirt, shoulder, elbow, 0.052, 0.046, 10);

        limb(arms, skin, elbow, hand, 0.040, 0.030, 10);

        ball(arms, shirt, 0.05, shoulder.x, shoulder.y, shoulder.z);

        // the hand: a fist round the rope (palm + 4 fingers + thumb)
        const h = new THREE.Group();

        h.position.copy(hand);

        ball(h, skin, 0.040, 0, 0, 0, 1, 0.95, 1.1);

        for (let i = 0; i < 4; i++) {

            const f = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.0085, 0.032, 4, 6), skin
            );

            f.rotation.z = Math.PI / 2;

            f.position.set(-s * 0.034, 0.024 - i * 0.017, 0.012);

            h.add(f);
        }

        const thumb = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.0095, 0.03, 4, 6), skin
        );

        thumb.position.set(-s * 0.012, 0.028, 0.036);

        thumb.rotation.x = 0.7;

        h.add(thumb);

        arms.add(h);

        boy.userData.hands.push(h);
    }

    // ---------- legs ----------
    boy.userData.shins = [];

    for (const s of [-1, 1]) {

        const hip = new THREE.Vector3(s * 0.10, SEAT_TOP + 0.075, -0.06);

        const knee = new THREE.Vector3(s * 0.115, SEAT_TOP + 0.10, 0.34);

        // thigh (jeans)
        limb(boy, jeans, hip, knee, 0.082, 0.062, 10);

        ball(boy, jeans, 0.064, knee.x, knee.y, knee.z);

        // lower leg pivots at the knee so it can kick
        const pivot = new THREE.Group();

        pivot.position.copy(knee);

        pivot.userData.side = s;

        boy.add(pivot);

        limb(
            pivot, jeans,
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, -0.40, 0.03),
            0.060, 0.044, 10
        );

        // sock + sneaker at the bottom of the shin
        limb(
            pivot, skin,
            new THREE.Vector3(0, -0.38, 0.03),
            new THREE.Vector3(0, -0.45, 0.035),
            0.036, 0.034, 8
        );

        const foot = new THREE.Group();

        foot.position.set(0, -0.46, 0.05);

        const upper = new THREE.Mesh(
            new THREE.BoxGeometry(0.095, 0.075, 0.25), shoe
        );

        upper.position.set(0, 0, 0.075);

        foot.add(upper);

        const bottom = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.022, 0.265), sole
        );

        bottom.position.set(0, -0.045, 0.078);

        foot.add(bottom);

        const toe = new THREE.Mesh(
            new THREE.SphereGeometry(0.048, 10, 8), shoe
        );

        toe.scale.set(1, 0.8, 1.1);

        toe.position.set(0, -0.003, 0.2);

        foot.add(toe);

        pivot.add(foot);

        boy.userData.shins.push(pivot);
    }

    boy.visible = false;

    return boy;
}

// ------------------------------------------------------
// the swing itself: ropes + seat + a hidden "press E" box
// ------------------------------------------------------
export class SwingRig {

    constructor(woodMat, ropeMat) {

        this.g = new THREE.Group();

        // ropes (hang from the beam, run to the seat front)
        for (const x of [-0.25, 0.25]) {

            const rope = new THREE.Mesh(
                new THREE.CylinderGeometry(0.013, 0.013, ROPE, 6), ropeMat
            );

            rope.position.set(x, -ROPE / 2, 0.17);

            this.g.add(rope);

            // knot on the beam
            const knot = new THREE.Mesh(
                new THREE.SphereGeometry(0.03, 8, 6), ropeMat
            );

            knot.position.set(x, -0.02, 0.17);

            this.g.add(knot);
        }

        // the plank
        this.seat = new THREE.Mesh(
            new THREE.BoxGeometry(0.62, 0.05, 0.42), woodMat
        );

        this.seat.position.set(0, SEAT_Y, 0);

        this.g.add(this.seat);

        // invisible, generous box for the "Press E" ray
        this.hit = new THREE.Mesh(
            new THREE.BoxGeometry(1.0, 0.9, 0.9),
            new THREE.MeshBasicMaterial({ visible: false })
        );

        this.hit.position.set(0, SEAT_Y + 0.3, 0);

        this.g.add(this.hit);

        // the boy (hidden until somebody sits)
        this.boy = buildBoy();

        this.g.add(this.boy);

        // ---- motion ----
        this.theta = 0;          // angle (+ = seat moves back)
        this.omega = 0;          // angular speed
        this.phi = 0.3;
        this.amp = 0.16;
        this.seated = false;
        this.pump = false;       // player is pushing (W / S)
        this.last = null;
    }

    // call every frame (safe to call more than once per frame)
    tick(t) {

        if (this.last === null) this.last = t;

        const dt = Math.min(0.05, t - this.last);

        if (!(dt > 0)) return;

        this.last = t;

        // amplitude: calm when empty, HARD when someone sits
        let target = 0.16;

        let rate = 0.12;

        if (this.seated) {

            target = this.pump ? 0.95 : 0.62;

            rate = this.pump ? 0.30 : 0.22;
        }

        this.amp += Math.sign(target - this.amp) *
            Math.min(Math.abs(target - this.amp), rate * dt);

        // heavier swing = slightly slower period (real pendulum)
        const w = 2.05 * (1 - this.amp * this.amp / 14);

        this.phi += w * dt;

        this.theta = this.amp * Math.sin(this.phi);

        this.omega = this.amp * w * Math.cos(this.phi);

        this.g.rotation.x = this.theta;

        // tiny sideways wobble only when empty
        this.g.rotation.z = this.seated
            ? 0
            : Math.cos(this.phi * 0.7) * 0.03;

        if (this.seated) this.animateLegs();
    }

    // legs kick OUT going forward, tuck going back
    animateLegs() {

        const maxW = Math.max(0.2, this.amp * 2.0);

        // forward = seat moving toward +Z = omega negative
        const u = Math.max(-1, Math.min(1, -this.omega / maxW));

        for (const p of this.boy.userData.shins) {

            p.rotation.x = -0.32 - 0.75 * u;
        }

        // fingers / hands stay on the ropes, nothing to do
    }

    // seat-local eye position -> world
    eyeWorld(out) {

        this.g.updateMatrixWorld(true);

        return this.g.localToWorld(out.copy(EYE));
    }

    setSeated(on) {

        this.seated = on;

        this.boy.visible = on;

        this.pump = false;
    }
}