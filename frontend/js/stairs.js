import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

import { getFloorMaterial, applyBoxUV }
    from "./haunted.js";


// ======================================================
// STAIR SETTINGS
// ======================================================

const STEP_COUNT = 20;

const STEP_WIDTH = 3;

const STEP_DEPTH = 0.25;

const STEP_HEIGHT = 0.2;

const LEFT_STAIR_X = -13;

const RIGHT_STAIR_X = 13;

const STAIR_START_Z = 2.375;


// ======================================================
// CREATE ALL STAIRS
//
// Stairs ZIG-ZAG between the two shafts so one flight
// never sits on top of another one:
//
//   Floor 1 -> 2 : LEFT  shaft
//   Floor 2 -> 3 : RIGHT shaft
//   Floor 3 -> terrace : LEFT shaft
//
// After climbing, walk across the corridor to the other
// shaft to continue up.
// ======================================================

export function createStairs(
    scene,
    collisionSystem
) {

    const stairMaterial = getFloorMaterial();


    // FLOOR 1 -> FLOOR 2   (left)
    createStaircase(
        scene,
        collisionSystem,
        LEFT_STAIR_X,
        STAIR_START_Z,
        0,      // baseHeight
        0,      // solid fill starts at
        1,
        2,
        stairMaterial
    );


    // FLOOR 2 -> FLOOR 3   (right, solid underneath so the
    // ground floor below becomes the entrance room)
    createStaircase(
        scene,
        collisionSystem,
        RIGHT_STAIR_X,
        STAIR_START_Z,
        4,
        4,
        2,
        3,
        stairMaterial
    );

    // solid landing at the top of that flight (z -3.75 .. -2.5)
    const landing =
        new THREE.Mesh(
            new THREE.BoxGeometry(STEP_WIDTH, 4, 1.25),
            stairMaterial
        );

    applyBoxUV(landing.geometry, STEP_WIDTH, 4, 1.25, 3);

    landing.userData.isStair = true;

    landing.position.set(RIGHT_STAIR_X, 6, -3.125);

    scene.add(landing);

    collisionSystem.add(landing);

    // FLOOR 3 -> TERRACE   (left)
    createStaircase(
        scene,
        collisionSystem,
        LEFT_STAIR_X,
        STAIR_START_Z,
        8,
        8,
        3,
        4,
        stairMaterial
    );
}


// ======================================================
// ONE STAIRCASE
// ======================================================

function createStaircase(
    scene,
    collisionSystem,
    x,
    startZ,
    baseHeight,
    fillFrom,
    fromFloor,
    toFloor,
    material
) {

    for (
        let i = 0;
        i < STEP_COUNT;
        i++
    ) {

        const stepTop =
            baseHeight +
            STEP_HEIGHT * (i + 1);

        const blockHeight =
            stepTop - fillFrom;

        const geometry =
            new THREE.BoxGeometry(
                STEP_WIDTH,
                blockHeight,
                STEP_DEPTH
            );

        applyBoxUV(
            geometry,
            STEP_WIDTH,
            blockHeight,
            STEP_DEPTH,
            3
        );

        const step =
            new THREE.Mesh(
                geometry,
                material
            );

        step.userData.isStair = true;

        step.userData.fromFloor = fromFloor;

        step.userData.toFloor = toFloor;

        step.userData.stepIndex = i;

        step.position.set(
            x,
            fillFrom + blockHeight / 2,
            startZ - i * STEP_DEPTH
        );

        scene.add(step);

        collisionSystem.add(step);
    }
}