import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";


// ======================================================
// COLLISION SYSTEM
//
// - Normal objects (walls, tables, counters) use a
//   cached bounding box (fast).
// - Doors (they have userData.pivot) are re-measured
//   every check because they swing open/closed.
// - Stairs are stored separately; the Player handles
//   them (climbing + blocking).
// ======================================================

export class CollisionSystem {

    constructor() {

        this.objects = [];

        this.stairs = [];

        // swinging doors (their boxes move)
        this.doors = [];

        // flat walkable areas above the floors (e.g. terrace-room roof)
        // { x0, x1, z0, z1, y }
        this.platforms = [];

        // round stair towers: { cx, cz, r0, r1, a0, dA, per, n, y0, rise }
        // (the Player reads them in getGroundHeight; see spiral.js)
        this.spirals = [];

        this._boxCache =
            new Map();

        this._playerBox =
            new THREE.Box3();
    }


    // ==================================================
    // ADD OBJECT
    // ==================================================

    add(object) {

        this.objects.push(object);

        if (
            object.userData &&
            object.userData.isStair
        ) {
            this.stairs.push(object);
        }

        if (
            object.userData &&
            object.userData.pivot
        ) {
            this.doors.push(object);
        }
    }


    // ==================================================
    // GET BOX  (cached unless object moves)
    // ==================================================

    getBox(object) {

        const isDynamic =
            object.userData &&
            object.userData.pivot;

        if (!isDynamic) {

            let cached =
                this._boxCache.get(object);

            if (cached) {
                return cached;
            }

            object.updateWorldMatrix(
                true,
                true
            );

            cached =
                new THREE.Box3()
                    .setFromObject(object);

            this._boxCache.set(
                object,
                cached
            );

            return cached;
        }

        object.updateWorldMatrix(
            true,
            true
        );

        return new THREE.Box3()
            .setFromObject(object);
    }


    // ==================================================
    // CHECK PLAYER COLLISION  (walls, tables, doors)
    // ==================================================

    check(
        position,
        radius,
        playerHeight = 1.7,
        ignore = null
    ) {

        const playerBox =
            this._playerBox;

        const playerFeet =
            position.y -
            playerHeight +
            0.05;

        const playerHead =
            position.y +
            0.1;

        playerBox.min.set(
            position.x - radius,
            playerFeet,
            position.z - radius
        );

        playerBox.max.set(
            position.x + radius,
            playerHead,
            position.z + radius
        );

        for (const object of this.objects) {

            if (
                object.userData &&
                (
                    object.userData.isStair ||
                    object.userData.isFloor
                )
            ) {
                continue;
            }

            if (ignore && ignore.has(object)) {
                continue;
            }

            if (
                playerBox.intersectsBox(
                    this.getBox(object)
                )
            ) {
                return true;
            }
        }

        return false;
    }


    // ==================================================
    // DOORS THAT ARE TOUCHING THE PLAYER RIGHT NOW
    // (used so a door never traps the player)
    // ==================================================

    overlappingDoors(
        position,
        radius,
        playerHeight = 1.7
    ) {

        const result = [];

        const box = this._playerBox;

        // exactly the same box as check(): a door is only ignored
        // when it is REALLY inside the player (it swung onto him)
        box.min.set(
            position.x - radius,
            position.y - playerHeight + 0.05,
            position.z - radius
        );

        box.max.set(
            position.x + radius,
            position.y + 0.1,
            position.z + radius
        );

        for (const door of this.doors) {

            if (box.intersectsBox(this.getBox(door))) {
                result.push(door);
            }
        }

        return result;
    }
}