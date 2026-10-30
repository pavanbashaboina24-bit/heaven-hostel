import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";


import { createStairs }
    from "./stairs.js";

import { buildCellar }
    from "./cellar.js";

import {
    getWallMaterial,
    getFloorMaterial,
    getDoorMaterial,
    applyBoxUV,
    furnishRooms,
    decorateCorridor,
    addRoomPlate,
    setupHauntedAtmosphere,
    registerDoor,
    M
} from "./haunted.js";

import {
    furnishHall,
    furnishEntrance
} from "./hall.js";

import { buildExterior, getFacadeMaterial } from "./exterior.js";
import { buildYardPuzzle, lockMainDoor } from "./yard.js";

import { decorateStairs } from "./stairdecor.js";

import { buildTerrace } from "./terrace.js";
import { buildSpiral, BRIDGE } from "./spiral.js";
import { buildMystery } from "./mystery.js";


// ======================================================
// BUILDING CONSTANTS
// ======================================================

const BUILDING_SIZE = 30;

const BUILDING_MIN = -15;

const BUILDING_MAX = 15;


// ======================================================
// STAIR CONSTANTS
// ======================================================

const STAIR_WIDTH = 3;

const LEFT_STAIR_X = -13;

const RIGHT_STAIR_X = 13;

const STAIR_START_Z = 3.325;

const STAIR_STEP_COUNT = 20;

const STAIR_STEP_DEPTH = 0.35;


// ======================================================
// MAIN FLOOR CREATION
// ======================================================

export function createFloor1(
    scene,
    collisionSystem,
    interactionSystem
) {

    // ==================================================
    // MATERIALS
    // ==================================================

    const floorMaterial = getFloorMaterial();

    const wallMaterial = getWallMaterial();

    const doorMaterial = getDoorMaterial();


    // ==================================================
    // FLOOR 1
    // ==================================================

    createFloor(
        scene,
        floorMaterial,
        0
    );


    // ==================================================
    // FLOOR 1 OUTER WALLS
    // ==================================================

    createOuterWalls(
        scene,
        collisionSystem,
        wallMaterial,
        0
    );


    // ==================================================
    // STAIRS
    // ==================================================

    createStairs(
        scene,
        collisionSystem
    );


    // ==================================================
    // FLOOR 1 ROOMS
    // ==================================================

    createRooms(
        scene,
        collisionSystem,
        interactionSystem,
        wallMaterial,
        doorMaterial,
        1,
        0
    );

    // ==================================================
    // ENTRANCE ROOM (under the right stairs), MAIN DOOR, YARD
    // ==================================================
    furnishEntrance(
        scene,
        collisionSystem,
        interactionSystem
    );

    createDoorAlongZ(
        scene,
        collisionSystem,
        interactionSystem,
        15,
        0,
        0,
        "the main door",
        doorMaterial,
        { width: 1.6, swing: 1 }
    );

    // the stone, the hidden key and the yard hiding places (yard.js)
    buildYardPuzzle(scene, interactionSystem);

    buildExterior(
        scene,
        collisionSystem,
        interactionSystem
    );

    decorateStairs(
        scene,
        collisionSystem,
        interactionSystem
    );

    // secret underground room + the key to it
    buildCellar(
        scene,
        collisionSystem,
        interactionSystem
    );

    // the iron back stairs to the terrace (locked gate, key in a room)
    buildSpiral(
        scene,
        collisionSystem,
        interactionSystem
    );

    // Ramu's secret room, far below: the way in appears only at the end
    buildMystery(
        scene,
        collisionSystem,
        interactionSystem
    );


    


    // ==================================================
    // LIGHTS
    // ==================================================

    createLights(
        scene
    );


    // ==================================================
    // FLOOR 2
    // ==================================================

    createUpperFloor(
        scene,
        collisionSystem,
        interactionSystem,
        wallMaterial,
        doorMaterial,
        2,
        4
    );


    // ==================================================
    // FLOOR 3
    // ==================================================

    createUpperFloor(
        scene,
        collisionSystem,
        interactionSystem,
        wallMaterial,
        doorMaterial,
        3,
        8
    );


    // ==================================================
    // TERRACE
    // ==================================================

    createTerrace(
        scene,
        collisionSystem,
        wallMaterial,
        12,
        interactionSystem,
        doorMaterial
    );
}


// ======================================================
// FLOOR 1
// ======================================================

function createFloor(
    scene,
    material,
    floorHeight
) {

    const geometry =
        new THREE.BoxGeometry(
            BUILDING_SIZE,
            0.2,
            BUILDING_SIZE
        );
    applyBoxUV(geometry, BUILDING_SIZE, 0.2, BUILDING_SIZE, 3);


    const floor =
        new THREE.Mesh(
            geometry,
            material
        );


    floor.position.set(
        0,
        floorHeight - 0.1,
        0
    );


    floor.userData.isFloor =
        true;


    floor.userData.floorHeight =
        floorHeight;


    scene.add(
        floor
    );
}


// ======================================================
// UPPER FLOOR
// ======================================================

function createUpperFloor(
    scene,
    collisionSystem,
    interactionSystem,
    wallMaterial,
    doorMaterial,
    floorNumber,
    floorHeight
) {

    // ==================================================
    // FLOOR SLAB
    // ==================================================

    createUpperFloorSlab(
        scene,
        floorHeight
    );


    // ==================================================
    // OUTER WALLS
    // ==================================================

    createOuterWalls(
        scene,
        collisionSystem,
        wallMaterial,
        floorHeight
    );


    // ==================================================
    // ROOMS
    // ==================================================

    createRooms(
        scene,
        collisionSystem,
        interactionSystem,
        wallMaterial,
        doorMaterial,
        floorNumber,
        floorHeight
    );
}


// ======================================================
// UPPER FLOOR SLAB
// ======================================================
//
// Hall:
//
// z = -4 → +4
//
// Stair:
//
// x = -14.5 → -11.5
// x = +11.5 → +14.5
//
// The main stair area remains open.
//
// We add small landing areas at:
//
// TOP:
// z = -3.75
//
// BOTTOM:
// z = +3.75
//
// This gives the player a solid place to step
// after reaching the final stair step.
// ======================================================

function createUpperFloorSlab(
    scene,
    floorHeight
) {

    const material = getFloorMaterial();


    // ==================================================
    // NORTH ROOM AREA
    // ==================================================

    createFloorSection(
        scene,
        material,

        0,
        30,

        11,
        -9.5,

        floorHeight
    );


    // ==================================================
    // SOUTH ROOM AREA
    // ==================================================

    createFloorSection(
        scene,
        material,

        0,
        30,

        11,
        9.5,

        floorHeight
    );


    // ==================================================
    // HALL LEFT OUTER STRIP
    // ==================================================

    createFloorSection(
        scene,
        material,

        -14.75,
        0.5,

        8,
        0,

        floorHeight
    );


    // ==================================================
    // HALL CENTER
    // ==================================================

    createFloorSection(
        scene,
        material,

        0,
        23,

        8,
        0,

        floorHeight
    );


    // ==================================================
    // HALL RIGHT OUTER STRIP
    // ==================================================

    createFloorSection(
        scene,
        material,

        14.75,
        0.5,

        8,
        0,

        floorHeight
    );


    // ==================================================
    // LANDINGS NEXT TO THE STAIRS
    //   2nd floor : left  -> top (north)   right -> foot (south)
    //   3rd floor : left  -> foot (south)  right -> solid stair block
    //   terrace   : left  -> top (north)   right -> safety net
    // ==================================================
    const northLanding = (x) =>
        createFloorSection(
            scene,
            material,
            x,
            STAIR_WIDTH,
            1.5,
            -3.25,
            floorHeight
        );

    const southLanding = (x) =>
        createFloorSection(
            scene,
            material,
            x,
            STAIR_WIDTH,
            1.5,
            3.25,
            floorHeight
        );

    if (floorHeight === 4) {

        northLanding(LEFT_STAIR_X);

        southLanding(RIGHT_STAIR_X);
    }

    if (floorHeight === 8) {

        southLanding(LEFT_STAIR_X);
    }

    if (floorHeight === 12) {

        northLanding(LEFT_STAIR_X);
    }
}


// ======================================================
// FLOOR SECTION
// ======================================================

function createFloorSection(
    scene,
    material,
    x,
    width,
    depth,
    z,
    floorHeight
) {

    const geometry =
        new THREE.BoxGeometry(
            width,
            0.2,
            depth
        );
    applyBoxUV(geometry, width, 0.2, depth, 3);


    const floor =
        new THREE.Mesh(
            geometry,
            material
        );


    floor.position.set(
        x,
        floorHeight - 0.1,
        z
    );


    floor.userData.isFloor =
        true;


    floor.userData.floorHeight =
        floorHeight;


    scene.add(
        floor
    );
}


// ======================================================
// OUTER WALLS
// ======================================================

function createOuterWalls(
    scene,
    collisionSystem,
    material,
    floorHeight
) {

    const wallY =
        floorHeight + 2;


    // ==================================================
    // NORTH
    // ==================================================

    createWallWithWindows(scene, collisionSystem, material, floorHeight, -15);


    // ==================================================
    // SOUTH
    // ==================================================

    createWallWithWindows(scene, collisionSystem, material, floorHeight, 15);


    // ==================================================
    // WEST
    // ==================================================

    createWall(
        scene,
        collisionSystem,

        -15,
        wallY,
        0,

        0.5,
        4,
        30,

        material,
        1
    );


    // ==================================================
    // EAST
    // ==================================================

    if (floorHeight === 0) {

        // main door opening: z -0.8 .. 0.8
        createWall(
            scene, collisionSystem, 15, wallY, -7.9,
            0.5, 4, 14.2, material, 0
        );

        createWall(
            scene, collisionSystem, 15, wallY, 7.9,
            0.5, 4, 14.2, material, 0
        );

        createWall(
            scene, collisionSystem, 15, 3.5, 0,
            0.5, 1, 1.6, material, 0
        );
    }
    else {

        createWall(
            scene, collisionSystem, 15, wallY, 0,
            0.5, 4, 30, material, 0
        );
    }
}


// ======================================================
// ROOMS
// ======================================================

function createRooms(
    scene,
    collisionSystem,
    interactionSystem,
    wallMaterial,
    doorMaterial,
    floorNumber,
    floorHeight
) {

    // ==================================================
    // NORTH ROOM WALL
    // ==================================================

    createNorthRoomWall(
        scene,
        collisionSystem,
        interactionSystem,
        wallMaterial,
        doorMaterial,
        floorNumber,
        floorHeight
    );


    // ==================================================
    // SOUTH ROOM WALL
    // ==================================================

    createSouthRoomWall(
        scene,
        collisionSystem,
        interactionSystem,
        wallMaterial,
        doorMaterial,
        floorNumber,
        floorHeight
    );


    // ==================================================
    // NORTH ROOM DIVIDER 1
    // ==================================================

    createWall(
        scene,
        collisionSystem,

        -7,
        floorHeight + 2,
        -9.5,

        0.5,
        4,
        11,

        wallMaterial
    );


    // ==================================================
    // NORTH ROOM DIVIDER 2
    // ==================================================

    createWall(
        scene,
        collisionSystem,

        0,
        floorHeight + 2,
        -9.5,

        0.5,
        4,
        11,

        wallMaterial
    );


    // ==================================================
    // NORTH ROOM DIVIDER 3
    // ==================================================

    createWall(
        scene,
        collisionSystem,

        7,
        floorHeight + 2,
        -9.5,

        0.5,
        4,
        11,

        wallMaterial
    );


    // ==================================================
    // SOUTH ROOM DIVIDER 1
    // ==================================================

    createWall(
        scene,
        collisionSystem,

        -7,
        floorHeight + 2,
        9.5,

        0.5,
        4,
        11,

        wallMaterial
    );


    // ==================================================
    // SOUTH ROOM DIVIDER 2
    // ==================================================

    createWall(
        scene,
        collisionSystem,

        0,
        floorHeight + 2,
        9.5,

        0.5,
        4,
        11,

        wallMaterial
    );


    // ==================================================
    // SOUTH ROOM DIVIDER 3
    // ==================================================

    createWall(
        scene,
        collisionSystem,

        7,
        floorHeight + 2,
        9.5,

        0.5,
        4,
        11,

        wallMaterial
    );

    // ==================================================
    // WALLS BESIDE THE STAIRS (no gaps to see through)
    // ==================================================
    createStairWalls(
        scene,
        collisionSystem,
        interactionSystem,
        wallMaterial,
        doorMaterial,
        floorHeight
    );

    // ==================================================
    // HAUNTED INTERIOR  (furniture, washrooms, windows,
    // blood, spiders ...) for all 8 rooms of this floor
    // ==================================================
    furnishRooms(
        scene,
        collisionSystem,
        floorNumber,
        floorHeight,
        interactionSystem
    );

    decorateCorridor(
        scene,
        collisionSystem,
        floorNumber,
        floorHeight,
        interactionSystem
    );

    // ==================================================
    // THE HALL OF THIS FLOOR (tables, benches, hiding cabinets)
    // ==================================================
    furnishHall(
        scene,
        collisionSystem,
        interactionSystem,
        floorNumber,
        floorHeight
    );
}


// ======================================================
// NORTH ROOM WALL
// ======================================================

function createNorthRoomWall(
    scene,
    collisionSystem,
    interactionSystem,
    wallMaterial,
    doorMaterial,
    floorNumber,
    floorHeight
) {

    const wallZ = -4;

    const wallHeight = 4;

    const wallDepth = 0.5;


    // ==================================================
    // ROOM DOOR OPENINGS
    // ==================================================

    const openings = [

        [-11.2, -9.8],

        [-4.2, -2.8],

        [2.8, 4.2],

        [9.8, 11.2]

    ];


    createWallSegments(
        scene,
        collisionSystem,

        wallMaterial,

        floorHeight,

        wallZ,

        wallHeight,
        wallDepth,

        openings
    );


    // ==================================================
    // ROOM 01
    // ==================================================

    createDoor(
        scene,
        collisionSystem,
        interactionSystem,

        -10.5,
        floorHeight + 1.5,
        wallZ,

        String(floorNumber) + "01",

        doorMaterial,
        { hinge: "right" }
    );


    // ==================================================
    // ROOM 02
    // ==================================================

    createDoor(
        scene,
        collisionSystem,
        interactionSystem,

        -3.5,
        floorHeight + 1.5,
        wallZ,

        String(floorNumber) + "02",

        doorMaterial
    );


    // ==================================================
    // ROOM 03
    // ==================================================

    createDoor(
        scene,
        collisionSystem,
        interactionSystem,

        3.5,
        floorHeight + 1.5,
        wallZ,

        String(floorNumber) + "03",

        doorMaterial
    );


    // ==================================================
    // ROOM 04
    // ==================================================

    createDoor(
        scene,
        collisionSystem,
        interactionSystem,

        10.5,
        floorHeight + 1.5,
        wallZ,

        String(floorNumber) + "04",

        doorMaterial
    );
}


// ======================================================
// SOUTH ROOM WALL
// ======================================================

function createSouthRoomWall(
    scene,
    collisionSystem,
    interactionSystem,
    wallMaterial,
    doorMaterial,
    floorNumber,
    floorHeight
) {

    const wallZ = 4;

    const wallHeight = 4;

    const wallDepth = 0.5;


    // ==================================================
    // ROOM DOOR OPENINGS
    // ==================================================

    const openings = [

        [-11.2, -9.8],

        [-4.2, -2.8],

        [2.8, 4.2],

        [9.8, 11.2]

    ];


    createWallSegments(
        scene,
        collisionSystem,

        wallMaterial,

        floorHeight,

        wallZ,

        wallHeight,
        wallDepth,

        openings
    );


    // ==================================================
    // ROOM 05
    // ==================================================

    createDoor(
        scene,
        collisionSystem,
        interactionSystem,

        -10.5,
        floorHeight + 1.5,
        wallZ,

        String(floorNumber) + "05",

        doorMaterial
    );


    // ==================================================
    // ROOM 06
    // ==================================================

    createDoor(
        scene,
        collisionSystem,
        interactionSystem,

        -3.5,
        floorHeight + 1.5,
        wallZ,

        String(floorNumber) + "06",

        doorMaterial
    );


    // ==================================================
    // ROOM 07
    // ==================================================

    createDoor(
        scene,
        collisionSystem,
        interactionSystem,

        3.5,
        floorHeight + 1.5,
        wallZ,

        String(floorNumber) + "07",

        doorMaterial
    );


    // ==================================================
    // ROOM 08
    // ==================================================

    createDoor(
        scene,
        collisionSystem,
        interactionSystem,

        10.5,
        floorHeight + 1.5,
        wallZ,

        String(floorNumber) + "08",

        doorMaterial
    );
}


// ======================================================
// CREATE WALL SEGMENTS AROUND OPENINGS
// ======================================================

function createWallSegments(
    scene,
    collisionSystem,
    material,
    floorHeight,
    wallZ,
    wallHeight,
    wallDepth,
    openings
) {

    let currentX =
        BUILDING_MIN;


    // ==================================================
    // CREATE SEGMENTS
    // ==================================================

    for (
        const opening
        of openings
    ) {

        const openingMin =
            opening[0];

        const openingMax =
            opening[1];


        const segmentWidth =
            openingMin -
            currentX;


        if (
            segmentWidth > 0
        ) {

            createWall(
                scene,
                collisionSystem,

                currentX +
                segmentWidth / 2,

                floorHeight +
                wallHeight / 2,

                wallZ,

                segmentWidth,
                wallHeight,
                wallDepth,

                material
            );
        }


        // wall above the door (fills the gap over the door)
        createWall(
            scene,
            collisionSystem,
            (openingMin + openingMax) / 2,
            floorHeight + 3.5,
            wallZ,
            openingMax - openingMin,
            1,
            wallDepth,
            material
        );

        currentX =
            openingMax;
    }


    // ==================================================
    // FINAL WALL SEGMENT
    // ==================================================

    const finalWidth =
        BUILDING_MAX -
        currentX;


    if (
        finalWidth > 0
    ) {

        createWall(
            scene,
            collisionSystem,

            currentX +
            finalWidth / 2,

            floorHeight +
            wallHeight / 2,

            wallZ,

            finalWidth,
            wallHeight,
            wallDepth,

            material
        );
    }
}


// ======================================================
// WALL
// ======================================================

function createWall(
    scene,
    collisionSystem,
    x,
    y,
    z,
    width,
    height,
    depth,
    material,
    outerFace
) {

    const geometry =
        new THREE.BoxGeometry(
            width,
            height,
            depth
        );
    applyBoxUV(geometry, width, height, depth);


    const wall =
        new THREE.Mesh(
            geometry,
            outerFace === undefined
                ? material
                : outerMaterials(material, outerFace)
        );


    wall.position.set(
        x,
        y,
        z
    );


    scene.add(
        wall
    );


    collisionSystem.add(
        wall
    );
}


// ======================================================
// DOOR
// ======================================================

function createDoor(
    scene,
    collisionSystem,
    interactionSystem,
    x,
    y,
    z,
    roomNumber,
    material,
    opts
) {

    opts = opts || {};

    const hingeRight = opts.hinge === "right";

    const labelText = opts.label || ("Room " + roomNumber);

    // ==================================================
    // DOOR PIVOT
    // ==================================================

    const pivot =
        new THREE.Group();


    pivot.position.set(
        hingeRight ? x + 0.7 : x - 0.7,
        0,
        z
    );


    // ==================================================
    // DOOR GEOMETRY
    // ==================================================

    const geometry =
        new THREE.BoxGeometry(
            1.4,
            3,
            0.15
        );


    const door =
        new THREE.Mesh(
            geometry,
            material
        );


    door.position.set(
        hingeRight ? -0.7 : 0.7,
        y,
        0
    );


    // ==================================================
    // DOOR DATA
    // ==================================================

    door.userData.isOpen =
        false;


    door.userData.isLocked =
        roomNumber === "101" ||
        roomNumber === "104";


    door.userData.roomNumber =
        roomNumber;

    door.userData.getPrompt = () =>
        door.userData.isLocked
            ? labelText + " is locked"
            : "Press E - " +
              (handle.isOpen ? "Close " : "Open ") +
              labelText;


    door.userData.pivot =
        pivot;

    const handle = registerDoor(
        pivot,
        0,
        hingeRight ? Math.PI / 2 : -Math.PI / 2,
        false,
        "room"
    );

    addDoorPrints(door, 1.4, 0.15, 2, true);


    // ==================================================
    // INTERACTION
    // ==================================================

    door.userData.interact =
        () => {

            // ==========================================
            // LOCKED
            // ==========================================

            if (
                door.userData.isLocked
            ) {

                console.log(
                    "Room " +
                    roomNumber +
                    " is locked."
                );

                return;
            }


            // ==========================================
            // TOGGLE DOOR
            // ==========================================

            handle.toggle();

            door.userData.isOpen =
                handle.isOpen;
        };


    // ==================================================
    // ADD DOOR TO PIVOT
    // ==================================================

    pivot.add(
        door
    );


    // ==================================================
    // ADD TO SCENE
    // ==================================================

    scene.add(
        pivot
    );

    if (opts.plate !== false) {
        addRoomPlate(scene, x, y - 1.5, z, roomNumber);
    }


    // ==================================================
    // COLLISION
    // ==================================================

    collisionSystem.add(
        door
    );


    // ==================================================
    // INTERACTION
    // ==================================================

    interactionSystem.add(
        door
    );
}




// ======================================================
// LIGHTS
// ======================================================

function createLights(
    scene
) {

    // night, fog, moon, flickering bulbs
    setupHauntedAtmosphere(
        scene
    );
}


// ======================================================
// TERRACE
// ======================================================

function createTerrace(
    scene,
    collisionSystem,
    wallMaterial,
    terraceHeight,
    interactionSystem,
    doorMaterial
) {

    // ==================================================
    // TERRACE FLOOR
    // ==================================================

    createUpperFloorSlab(
        scene,
        terraceHeight
    );


    // ==================================================
    // TERRACE WALL HEIGHT
    // ==================================================

    const wallHeight = 1.2;


    // ==================================================
    // NORTH TERRACE WALL
    // ==================================================

    createWall(
        scene,
        collisionSystem,

        0,

        terraceHeight +
        wallHeight / 2,

        -15,

        30,
        wallHeight,
        0.5,

        wallMaterial
    );


    // ==================================================
    // SOUTH TERRACE WALL
    // ==================================================

    createWall(
        scene,
        collisionSystem,

        0,

        terraceHeight +
        wallHeight / 2,

        15,

        30,
        wallHeight,
        0.5,

        wallMaterial
    );


    // ==================================================
    // WEST TERRACE WALL  (with a gap where the back stairs come in: spiral.js)
    // ==================================================

    {
        const gap0 = BRIDGE.z0, gap1 = BRIDGE.z1;

        createWall(
            scene,
            collisionSystem,

            -15,

            terraceHeight +
            wallHeight / 2,

            (-15 + gap0) / 2,

            0.5,
            wallHeight,
            gap0 + 15,

            wallMaterial
        );

        createWall(
            scene,
            collisionSystem,

            -15,

            terraceHeight +
            wallHeight / 2,

            (gap1 + 15) / 2,

            0.5,
            wallHeight,
            15 - gap1,

            wallMaterial
        );
    }


    // ==================================================
    // EAST TERRACE WALL
    // ==================================================

    createWall(
        scene,
        collisionSystem,

        15,

        terraceHeight +
        wallHeight / 2,

        0,

        0.5,
        wallHeight,
        30,

        wallMaterial
    );

    // ==================================================
    // ROOM ON THE TERRACE + LADDER + NETS + SCARY STUFF
    // ==================================================
    buildTerrace(
        scene,
        collisionSystem,
        interactionSystem,
        (dx, fh, dz) => createDoor(
            scene,
            collisionSystem,
            interactionSystem,
            dx,
            fh + 1.5,
            dz,
            "RF",
            doorMaterial,
            { label: "the roof room", plate: false }
        )
    );
}

// ======================================================
// OUTER WALL WITH A WINDOW OPPOSITE EVERY ROOM DOOR
// ======================================================

const WINDOW_X = [-11.6, -4.6, 4.6, 11.6];

const WINDOW_HALF = 0.8;

const WINDOW_SILL = 1.0;

const WINDOW_HEAD = 2.8;

function createWallWithWindows(
    scene,
    collisionSystem,
    material,
    floorHeight,
    wallZ
) {

    const wallHeight = 4;

    const wallDepth = 0.5;

    let currentX = BUILDING_MIN;

    const piece = (x0, x1, y0, y1) => {

        const w = x1 - x0;

        const h = y1 - y0;

        if (w <= 0.001 || h <= 0.001) return;

        createWall(
            scene,
            collisionSystem,
            (x0 + x1) / 2,
            floorHeight + (y0 + y1) / 2,
            wallZ,
            w,
            h,
            wallDepth,
            material,
            wallZ < 0 ? 5 : 4
        );
    };

    for (const wx of WINDOW_X) {

        const a = wx - WINDOW_HALF;

        const b = wx + WINDOW_HALF;

        // full-height wall up to the window
        piece(currentX, a, 0, wallHeight);

        // under the window
        piece(a, b, 0, WINDOW_SILL);

        // above the window
        piece(a, b, WINDOW_HEAD, wallHeight);

        currentX = b;
    }

    piece(currentX, BUILDING_MAX, 0, wallHeight);
}


// ======================================================
// DOOR IN A WALL THAT RUNS NORTH-SOUTH  (main door, hall door)
//
// swing = +1 opens toward +x,  -1 opens toward -x
// ======================================================

function createDoorAlongZ(
    scene,
    collisionSystem,
    interactionSystem,
    x,
    floorHeight,
    z,
    label,
    material,
    opts
) {

    opts = opts || {};

    const width = opts.width || 1.4;

    const swing = opts.swing || 1;

    const pivot = new THREE.Group();

    pivot.position.set(x, 0, z - width / 2);

    const door = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 3, width),
        material
    );

    door.position.set(0, floorHeight + 1.5, width / 2);

    door.userData.isOpen = false;

    door.userData.isLocked = false;

    door.userData.roomNumber = label;

    door.userData.pivot = pivot;

    door.userData.getPrompt = () =>
        "Press E - " +
        (handle.isOpen ? "Close " : "Open ") +
        label;

    const handle = registerDoor(pivot, 0, swing * Math.PI / 2, false, "main");

    door.userData.interact = () => {

        handle.toggle();

        door.userData.isOpen = handle.isOpen;
    };

    // the main door has a strong lock (yard.js)
    if (label === "the main door") lockMainDoor(door, handle, width);

    // blood hand prints stuck ON the door (they swing with it)
    addDoorPrints(door, width, 0.15, 3, false);

    pivot.add(door);

    scene.add(pivot);

    collisionSystem.add(door);

    interactionSystem.add(door);

    return door;
}


// ======================================================
// WALLS BESIDE THE STAIRS
//
// Both stair shafts are closed on the hall side. Only the
// foot of a flight and the top landing have an opening.
// ======================================================

function createStairWalls(
    scene,
    collisionSystem,
    interactionSystem,
    wallMaterial,
    doorMaterial,
    floorHeight
) {

    const wallY = floorHeight + 2;

    const seg = (x, z0, z1) => {

        if (z1 - z0 < 0.01) return;

        createWall(
            scene, collisionSystem, x, wallY,
            (z0 + z1) / 2, 0.2, 4, z1 - z0, wallMaterial
        );
    };

    // wall above an opening (opening height 2.6)
    const lintel = (x, z0, z1) => {

        createWall(
            scene, collisionSystem, x, floorHeight + 3.3,
            (z0 + z1) / 2, 0.2, 1.4, z1 - z0, wallMaterial
        );
    };

    const L = -11.4;

    const Rr = 11.4;

    if (floorHeight === 0) {

        // left stairs: foot opening in the south
        seg(L, -3.75, 2.5);
        lintel(L, 2.5, 3.75);

        // right side = entrance room: door into the hall
        seg(Rr, -3.75, -0.7);
        seg(Rr, 0.7, 3.75);

        createWall(
            scene, collisionSystem, Rr, floorHeight + 3.5, 0,
            0.2, 1, 1.4, wallMaterial
        );

        createDoorAlongZ(
            scene, collisionSystem, interactionSystem,
            Rr, floorHeight, 0, "the hall door", doorMaterial,
            { width: 1.4, swing: -1 }
        );
    }
    else if (floorHeight === 4) {

        // left: you arrive from the stairs in the north
        seg(L, -2.5, 3.75);
        lintel(L, -3.75, -2.5);

        // right: foot of the next flight in the south
        seg(Rr, -3.75, 2.5);
        lintel(Rr, 2.5, 3.75);
    }
    else if (floorHeight === 8) {

        // left: foot of the flight to the terrace in the south
        seg(L, -3.75, 2.5);
        lintel(L, 2.5, 3.75);

        // right: you arrive from the stairs in the north
        seg(Rr, -2.5, 3.75);
        lintel(Rr, -3.75, -2.5);
    }
}


// ======================================================
// OUTER WALLS: inside face = dirty wall, outside face = facade
// outerFace: 0 = +x, 1 = -x, 4 = +z, 5 = -z
// ======================================================

const outerCache = {};

function outerMaterials(material, face) {

    if (!outerCache[face]) {

        const f = getFacadeMaterial();

        const list = [];

        for (let i = 0; i < 6; i++) {
            list.push(i === face ? f : material);
        }

        outerCache[face] = list;
    }

    return outerCache[face];
}


// ======================================================
// BLOODY HAND PRINTS ON A DOOR  (children of the door,
// so they move when the door opens)
//
// alongX = true  : door is 'w' wide in x, 'd' thick in z
// alongX = false : door is 'd' thick in x, 'w' wide in z
// ======================================================

function addDoorPrints(door, w, d, count, alongX) {

    const hand = M().hand;

    for (let i = 0; i < count; i++) {

        for (const face of [1, -1]) {

            const plane = new THREE.Mesh(
                new THREE.PlaneGeometry(0.3, 0.3),
                hand
            );

            const off = (Math.random() - 0.5) * (w * 0.6);

            const y = -0.6 + Math.random() * 1.2;

            if (alongX) {

                plane.position.set(off, y, face * (d / 2 + 0.003));

                plane.rotation.y = face > 0 ? 0 : Math.PI;
            }
            else {

                plane.position.set(face * (d / 2 + 0.003), y, off);

                plane.rotation.y = face > 0 ? Math.PI / 2 : -Math.PI / 2;
            }

            plane.rotation.z = (Math.random() - 0.5) * 0.7;

            door.add(plane);
        }
    }
}