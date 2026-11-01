import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";


// ======================================================
// FEEL SETTINGS  (change these to tune the game)
// ======================================================

// 0 = smooth camera, 1 = rough (default), 2 = very rough
export const FEEL = { roughness: 1 };

const WALK_BOB_HEIGHT = 0.05;

const RUN_BOB_HEIGHT = 0.09;

const WALK_BOB_SPEED = 9;

const RUN_BOB_SPEED = 14;


// ======================================================
// PLAYER
// ======================================================

export class Player {

    constructor(camera, collisionSystem) {

        this.camera = camera;

        this.collisionSystem = collisionSystem;


        // ----- body -----
        this.playerHeight = 1.7;

        this.playerRadius = 0.4;

        this.stepUp = 0.3;        // highest step he can climb

        this.stairRadius = 0.2;   // thinner body against stair blocks

        this.snapDown = 0.4;      // sticks to ground going down stairs


        // ----- speed -----
        this.walkSpeed = 5;

        this.runSpeed = 9;

        this.gravity = 20;

        // jump: Space.  5.2 m/s with gravity 20 = about 0.68 m high
        this.jumpSpeed = 5.2;

        this.verticalVelocity = 0;

        this.grounded = true;

        this.onSpiral = null;      // the round stair tower we stand on (or null)

        this._groundSpiral = null;

        // ----- falling (a drop of more than this many metres kills) -----
        this.deadlyFall = 6;

        this._airTop = null;       // highest point of the current fall / jump

        this.fatalFall = 0;        // set to the drop (m) when a fall killed him

        this.fallDrop = 0;         // how far he has fallen right now


        // ----- floors -----
        this.floorHeights = [0, 4, 8, 12];

        // the whole yard around the hostel
        this.worldMin = -75;

        this.worldMax = 75;

        // doors that are touching the player (they never trap him)
        this.ignoreDoors = new Set();

        this.onStairs = false;

        this.camY = camera.position.y;

        // hiding / climbing
        this.hidden = false;

        this.hideSpot = null;

        this.onHideChange = null;

        this.anim = null;

        // mouse sensitivity (menu changes it) and footstep callback
        this.sensitivity = 0.002;

        this.onStep = null;

        this._stepPhase = 0;


        // ----- real position (without camera shake) -----
        this.pos = camera.position.clone();

        // ----- look -----
        this.yaw = 0;

        this.pitch = 0;

        camera.rotation.order = "YXZ";


        // ----- camera feel -----
        this.bobTime = 0;

        this.idleTime = 0;


        // ----- keys -----
        this.keys = {
            forward: false,
            back: false,
            left: false,
            right: false,
            run: false,
            jump: false
        };

        this.setupKeyboard();

        this.setupMouseLook();
    }


    // ==================================================
    // KEYBOARD
    //   W / Arrow Up    -> front
    //   S / Arrow Down  -> back
    //   A / Arrow Left  -> left
    //   D / Arrow Right -> right
    //   Shift           -> run
    // ==================================================

    setKey(code, value) {

        switch (code) {

            case "KeyW":
            case "ArrowUp":
                this.keys.forward = value;
                return true;

            case "KeyS":
            case "ArrowDown":
                this.keys.back = value;
                return true;

            case "KeyA":
            case "ArrowLeft":
                this.keys.left = value;
                return true;

            case "KeyD":
            case "ArrowRight":
                this.keys.right = value;
                return true;

            case "ShiftLeft":
            case "ShiftRight":
                this.keys.run = value;
                return true;

            case "Space":
                this.keys.jump = value;
                return true;
        }

        return false;
    }

    setupKeyboard() {

        document.addEventListener(
            "keydown",
            (event) => {

                if (this.setKey(event.code, true)) {
                    event.preventDefault();
                }
            }
        );

        document.addEventListener(
            "keyup",
            (event) => {

                if (this.setKey(event.code, false)) {
                    event.preventDefault();
                }
            }
        );

        // stop "stuck key" when window loses focus
        window.addEventListener(
            "blur",
            () => {

                for (const k in this.keys) {
                    this.keys[k] = false;
                }
            }
        );
    }


    // ==================================================
    // MOUSE LOOK
    // ==================================================

    // turn the head by (mx, my) pixels: the mouse (locked pointer) and the finger (touch.js)
    lookBy(mx, my) {

                const sensitivity = this.sensitivity;

                this.yaw -=
                    mx * sensitivity;

                this.pitch -=
                    my * sensitivity;

                const maxLook =
                    Math.PI / 2 - 0.1;

                this.pitch =
                    Math.max(
                        -maxLook,
                        Math.min(maxLook, this.pitch)
                    );

                if (this.hidden && this.hideSpot) {

                    const dy = this.yaw - this.hideSpot.yaw;

                                        // a spot may allow a wider view (the swing: look
                    // down at your hands and legs)
                    const yr = this.hideSpot.yawRange || 0.7;
                    const pLo = this.hideSpot.pitchMin !== undefined
                        ? this.hideSpot.pitchMin : -0.35;
                    const pHi = this.hideSpot.pitchMax !== undefined
                        ? this.hideSpot.pitchMax : 0.35;
                    this.yaw =
                        this.hideSpot.yaw +
                        Math.max(-yr, Math.min(yr, dy));
                    this.pitch =
                        Math.max(pLo, Math.min(pHi, this.pitch));
                }
    }

    setupMouseLook() {

        document.addEventListener(
            "mousemove",
            (event) => {

                if (
                    document.pointerLockElement
                    !== document.body
                ) {
                    return;
                }

                this.lookBy(event.movementX, event.movementY);
            }
        );
    }


    // ==================================================
    // MAIN UPDATE
    // ==================================================

    update(delta) {

        delta = Math.min(delta, 0.05);

        // ----- hiding inside a cabinet: no walking -----
        if (this.hidden) {

            this.updateCamera(delta, false);

            return;
        }

        // ----- ladder climbing -----
        if (this.anim) {

            this.updateAnim(delta);

            this.updateCamera(delta, false);

            return;
        }

        // ----- input -> direction (flat, ignores looking up/down) -----
        let forward = 0;
        let right = 0;

        if (this.keys.forward) forward += 1;
        if (this.keys.back) forward -= 1;
        if (this.keys.right) right += 1;
        if (this.keys.left) right -= 1;

        const length =
            Math.hypot(forward, right);

        if (length > 0) {
            forward /= length;
            right /= length;
        }

        const sin = Math.sin(this.yaw);
        const cos = Math.cos(this.yaw);

        // forward = (-sin, -cos)   right = (cos, -sin)
        const dirX = -sin * forward + cos * right;
        const dirZ = -cos * forward - sin * right;

        // slower on the stairs (walking or running)
        const stairMul = this.onStairs ? 0.55 : 1;

        const speed =
            (this.keys.run
                ? this.runSpeed
                : this.walkSpeed) * stairMul;

        // ----- jump (Space) -----
        if (this.keys.jump && this.grounded && !this.onStairs) {

            this.verticalVelocity = this.jumpSpeed;

            this.grounded = false;
        }

        // never get trapped by a swinging door
        this.ignoreDoors.clear();

        for (const d of this.collisionSystem.overlappingDoors(
            this.pos, this.playerRadius, this.playerHeight
        )) {
            this.ignoreDoors.add(d);
        }

        const moving = length > 0;

        let mx = dirX * speed * delta;

        let mz = dirZ * speed * delta;

        // ----- the round iron stairs (spiral.js): walking on them follows the curve.
        // W climbs, S goes down, it does not matter where you look; you can not
        // jam against the pole or the rail.  Near the bottom and the top it is off,
        // so you can step on and off freely.
        const sp = this.onSpiral;

        if (sp && moving && this.grounded) {

            const feet = this.pos.y - this.playerHeight;

            const top = sp.y0 + sp.n * sp.rise;

            const dx = this.pos.x - sp.cx, dz = this.pos.z - sp.cz;

            const r = Math.hypot(dx, dz) || 1;

            const rx = dx / r, rz = dz / r;          // outwards

            const tx = -rz, tz = rx;                  // the way UP the stairs

            const len = Math.hypot(mx, mz);

            const along = mx * tx + mz * tz;

            const rad = mx * rx + mz * rz;

            // the very first step: walking straight OUT lets you step off again
            const leaving = feet < 0.4 && rad > len * 0.6;

            if (feet > 0.05 && feet < top - 0.3 && !leaving) {

                // clearly walking round the tower: that way; otherwise W = up, S = down
                let dir;

                if (Math.abs(along) > len * 0.35) dir = along > 0 ? 1 : -1;
                else dir = (this.keys.back && !this.keys.forward) ? -1 : 1;

                const mid = (sp.r0 + sp.r1) / 2 + 0.05;

                const pull = Math.max(-0.5, Math.min(0.5, (mid - r) * 0.6)) * len;

                mx = tx * dir * len + rx * (rad * 0.15 + pull);

                mz = tz * dir * len + rz * (rad * 0.15 + pull);
            }
        }

        this.move(mx, mz);

        this.updateVertical(delta);

        this.updateCamera(delta, moving);
    }


    // ==================================================
    // HORIZONTAL MOVE  (small steps, slides along walls)
    // ==================================================

    move(dx, dz) {

        const distance = Math.hypot(dx, dz);

        if (distance === 0) {
            return;
        }

        const steps =
            Math.ceil(distance / 0.15);

        const sx = dx / steps;
        const sz = dz / steps;

        for (let i = 0; i < steps; i++) {

            this.tryMove(sx, 0);
            this.tryMove(0, sz);
        }
    }

    tryMove(dx, dz) {

        if (dx === 0 && dz === 0) {
            return;
        }

        const oldX = this.pos.x;
        const oldZ = this.pos.z;

        this.pos.x += dx;
        this.pos.z += dz;

        // building edge
        this.pos.x = Math.max(
            this.worldMin + this.playerRadius,
            Math.min(
                this.worldMax - this.playerRadius,
                this.pos.x
            )
        );

        this.pos.z = Math.max(
            this.worldMin + this.playerRadius,
            Math.min(
                this.worldMax - this.playerRadius,
                this.pos.z
            )
        );

        if (this.isBlocked()) {

            this.pos.x = oldX;
            this.pos.z = oldZ;
        }
    }

    isBlocked() {

        const feet =
            this.pos.y - this.playerHeight;

        // walls, tables, counters, doors
        if (
            this.collisionSystem.check(
                this.pos,
                this.playerRadius,
                this.playerHeight,
                this.ignoreDoors
            )
        ) {
            return true;
        }

        // stair steps that are too tall to climb
        if (this.blockedByStairs(feet)) {
            return true;
        }

        // do not walk off into the stair hole
        if (this.grounded) {

            const ground =
                this.getGroundHeight(
                    this.pos.x,
                    this.pos.z,
                    feet
                );

            if (ground < feet - this.snapDown - 0.05) {
                return true;
            }
        }

        return false;
    }


    // ==================================================
    // STAIRS ARE SOLID  (can only climb 1 step at a time)
    // ==================================================

    blockedByStairs(feet) {

        const r = this.stairRadius;

        const x = this.pos.x;
        const z = this.pos.z;

        for (const stair of this.collisionSystem.stairs) {

            const box =
                this.collisionSystem.getBox(stair);

            if (
                x + r <= box.min.x ||
                x - r >= box.max.x ||
                z + r <= box.min.z ||
                z - r >= box.max.z
            ) {
                continue;
            }

            const head =
                feet + this.playerHeight;

            if (
                box.max.y > feet + this.stepUp &&
                box.min.y < head
            ) {
                return true;
            }
        }

        return false;
    }


    // ==================================================
    // DOES A FLOOR EXIST HERE?   (stair shafts have holes)
    //
    // left shaft : 2nd floor -> top landing (north)
    //              3rd floor -> bottom landing (south)
    //              terrace   -> top landing (north)
    // right shaft: 2nd floor -> bottom landing (south)
    //              3rd floor -> solid stair block
    //              terrace   -> safety net (walkable)
    // ==================================================

    hasFloor(x, z, h) {

        // the upper floors and the terrace end at the outer walls:
        // step over the edge and you fall (down to the yard)
        if (h > 0 && (x < -15.3 || x > 15.3 || z < -15.3 || z > 15.3)) {
            return false;
        }

        const inLeft = x >= -14.5 && x <= -11.5;

        const inRight = x >= 11.5 && x <= 14.5;

        if (!(inLeft || inRight) || z < -3.75 || z > 4) {
            return true;
        }

        if (h === 0) return true;

        if (inLeft) {

            if (h === 4) return z <= -2.5;

            if (h === 8) return z >= 2.5;

            if (h === 12) return z <= -2.5;
        }
        else {

            if (h === 4) return z >= 2.5;

            if (h === 8) return false;

            if (h === 12) return true;
        }

        return true;
    }


    // ==================================================
    // WHAT IS UNDER HIS FEET?
    // ==================================================

    getGroundHeight(x, z, feet) {

        const limit = feet + this.stepUp;

        let best = -Infinity;

        let fromStair = false;

        let spiralRef = null;

        let spiralH = -Infinity;

        // floors
        for (const h of this.floorHeights) {

            if (h > limit) continue;

            if (!this.hasFloor(x, z, h)) continue;

            if (h > best) best = h;
        }

        // flat roofs / platforms
        for (const pl of this.collisionSystem.platforms) {

            if (
                pl.y <= limit &&
                pl.y > best &&
                x >= pl.x0 - 0.1 && x <= pl.x1 + 0.1 &&
                z >= pl.z0 - 0.1 && z <= pl.z1 + 0.1
            ) {
                best = pl.y;
            }
        }

        // round stair towers (spiral.js): every tread is a wedge of 2*PI/per
        for (const sp of this.collisionSystem.spirals) {

            const dx = x - sp.cx, dz = z - sp.cz;

            const r = Math.hypot(dx, dz);

            if (r < sp.r0 || r > sp.r1) continue;

            let a = Math.atan2(dz, dx) - sp.a0;

            a = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

            const slice = Math.min(sp.per - 1, Math.floor(a / sp.dA));

            for (let idx = slice; idx < sp.n; idx += sp.per) {

                const h = sp.y0 + (idx + 1) * sp.rise;

                if (h <= limit && h > best) {

                    best = h;

                    fromStair = true;

                    spiralRef = sp;

                    spiralH = h;
                }
            }
        }

        // stair steps
        const m = 0.15;

        for (const stair of this.collisionSystem.stairs) {

            const box =
                this.collisionSystem.getBox(stair);

            if (
                x < box.min.x - m ||
                x > box.max.x + m ||
                z < box.min.z - m ||
                z > box.max.z + m
            ) {
                continue;
            }

            if (
                box.max.y <= limit &&
                box.max.y > best
            ) {
                best = box.max.y;

                fromStair = true;
            }
        }

        this._groundIsStair = fromStair;

        // (only if the round stairs really are what he stands on)
        this._groundSpiral = (spiralRef && Math.abs(best - spiralH) < 1e-6) ? spiralRef : null;

        return best;
    }


    // ==================================================
    // VERTICAL  (floors, stairs, falling)
    // ==================================================

    updateVertical(delta) {

        let feet =
            this.pos.y - this.playerHeight;

        const ground =
            this.getGroundHeight(
                this.pos.x,
                this.pos.z,
                feet
            );

        const land = () => {

            if (this._airTop !== null) {

                const drop = this._airTop - feet;

                if (drop > this.deadlyFall && !this.fatalFall) this.fatalFall = drop;

                this._airTop = null;
            }

            this.fallDrop = 0;
        };

        if (
            this.verticalVelocity <= 0 &&
            feet - ground <= this.snapDown
        ) {

            // standing / walking on something
            feet = ground;

            this.onStairs = !!this._groundIsStair;

            this.onSpiral = this._groundSpiral;

            this.verticalVelocity = 0;

            this.grounded = true;

            land();
        }
        else {

            // in the air: jumping, or falling off an edge / into a hole
            this.grounded = false;

            this.onStairs = false;

            this.onSpiral = null;

            if (this._airTop === null) this._airTop = feet;

            this.verticalVelocity -=
                this.gravity * delta;

            feet +=
                this.verticalVelocity * delta;

            if (feet > this._airTop) this._airTop = feet;

            this.fallDrop = Math.max(0, this._airTop - feet);

            if (feet <= ground) {

                feet = ground;

                this.verticalVelocity = 0;

                this.grounded = true;

                land();
            }
        }

        this.pos.y =
            feet + this.playerHeight;
    }


    // ==================================================
    // HIDING  (called by the cabinets)
    // ==================================================

    enterHide(spot) {

        this.hidden = true;

        this.hideSpot = spot;

        this.pos.copy(spot.pos);

        this.yaw = spot.yaw;

        this.pitch = spot.pitch || 0;

        this.verticalVelocity = 0;

        if (this.onHideChange) this.onHideChange(true);
    }

    exitHide() {

        if (!this.hidden) return;

        this.hidden = false;

        if (this.hideSpot) {
            this.pos.copy(this.hideSpot.exit);
        }

        this.hideSpot = null;

        this.verticalVelocity = 0;

        if (this.onHideChange) this.onHideChange(false);
    }


    // ==================================================
    // SCRIPTED MOVEMENT  (ladder)
    // points = [{ x, y, z, t }]  (y is EYE height)
    // ==================================================

    startPath(points, yaw) {

        if (this.anim || this.hidden) return;

        this.anim = {
            points,
            i: 0,
            t: 0,
            from: this.pos.clone()
        };

        if (yaw !== undefined) this.yaw = yaw;

        this.verticalVelocity = 0;
    }

    updateAnim(delta) {

        const a = this.anim;

        const target = a.points[a.i];

        a.t += delta;

        const k = Math.min(1, a.t / target.t);

        const e = k * k * (3 - 2 * k);

        this.pos.set(
            a.from.x + (target.x - a.from.x) * e,
            a.from.y + (target.y - a.from.y) * e,
            a.from.z + (target.z - a.from.z) * e
        );

        if (k >= 1) {

            a.from.set(target.x, target.y, target.z);

            a.i++;

            a.t = 0;

            if (a.i >= a.points.length) {

                this.anim = null;

                this.grounded = true;

                this.verticalVelocity = 0;
            }
        }
    }


    // ==================================================
    // CAMERA  (head bob + rough shake)
    // ==================================================

    updateCamera(delta, moving) {

        const camera = this.camera;

        // smooth the up/down jumps of single steps (no earthquake)
        const stairs = this.onStairs && this.grounded;

        if (
            this.hidden ||
            this.anim ||
            Math.abs(this.pos.y - this.camY) > 0.8
        ) {
            this.camY = this.pos.y;
        }
        else {

            this.camY +=
                (this.pos.y - this.camY) *
                Math.min(1, (stairs ? 7 : 22) * delta);
        }

        let bobY = 0;
        let swayX = 0;
        let roll = 0;
        let shakePitch = 0;
        let shakeYaw = 0;

        this.idleTime += delta;

        if (FEEL.roughness > 0) {

            // slow breathing when standing
            bobY += Math.sin(this.idleTime * 1.4) * 0.006;

            shakePitch +=
                Math.sin(this.idleTime * 0.9) * 0.0015;
        }

        if (moving && this.grounded && FEEL.roughness > 0) {

            const running = this.keys.run;

            this.bobTime +=
                delta *
                (running ? RUN_BOB_SPEED : WALK_BOB_SPEED);

            // one footstep every time the head bob bottoms out
            const phase = Math.floor(this.bobTime / Math.PI);

            if (phase !== this._stepPhase) {

                this._stepPhase = phase;

                if (this.onStep) this.onStep(running);
            }

            const amp =
                (running
                    ? RUN_BOB_HEIGHT
                    : WALK_BOB_HEIGHT) * FEEL.roughness *
                (stairs ? 0.25 : 1);

            // abs(sin) = sharp "footstep" bump
            bobY += -Math.abs(Math.sin(this.bobTime)) * amp;

            swayX = Math.cos(this.bobTime) * amp * 0.5;

            roll = Math.cos(this.bobTime) * 0.006 * FEEL.roughness;

            const jitter =
                (running ? 0.003 : 0.0015) * FEEL.roughness *
                (stairs ? 0 : 1);

            shakePitch += (Math.random() - 0.5) * jitter;

            shakeYaw += (Math.random() - 0.5) * jitter;
        }

        // sideways sway follows where the player is facing
        const rightX = Math.cos(this.yaw);
        const rightZ = -Math.sin(this.yaw);

        camera.position.set(
            this.pos.x + rightX * swayX,
            this.camY + bobY,
            this.pos.z + rightZ * swayX
        );

        camera.rotation.set(
            this.pitch + shakePitch,
            this.yaw + shakeYaw,
            roll,
            "YXZ"
        );
    }
}