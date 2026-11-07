import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";


export function createFloor(
    scene,
    collisionSystem,
    interactionSystem,
    floorNumber,
    baseHeight
) {

    const wallMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x777777
        });


    // =========================================
    // FLOOR
    // =========================================

    const floorGeometry =
        new THREE.BoxGeometry(
            30,
            0.2,
            30
        );


    const floor =
        new THREE.Mesh(
            floorGeometry,
            new THREE.MeshStandardMaterial({
                color: 0x444444
            })
        );


    floor.position.set(
        0,
        baseHeight,
        0
    );


    scene.add(floor);

    collisionSystem.add(floor);


    // =========================================
    // OUTER WALLS
    // =========================================

    createWall(
        scene,
        collisionSystem,
        0,
        baseHeight + 2,
        -15,
        30,
        4,
        0.5,
        wallMaterial
    );


    createWall(
        scene,
        collisionSystem,
        0,
        baseHeight + 2,
        15,
        30,
        4,
        0.5,
        wallMaterial
    );


    createWall(
        scene,
        collisionSystem,
        -15,
        baseHeight + 2,
        0,
        0.5,
        4,
        30,
        wallMaterial
    );


    createWall(
        scene,
        collisionSystem,
        15,
        baseHeight + 2,
        0,
        0.5,
        4,
        30,
        wallMaterial
    );


    // =========================================
    // ROOM DIVIDERS
    // =========================================

    createWall(
        scene,
        collisionSystem,
        -7,
        baseHeight + 2,
        -10,
        0.5,
        4,
        10,
        wallMaterial
    );


    createWall(
        scene,
        collisionSystem,
        0,
        baseHeight + 2,
        -10,
        0.5,
        4,
        10,
        wallMaterial
    );


    createWall(
        scene,
        collisionSystem,
        7,
        baseHeight + 2,
        -10,
        0.5,
        4,
        10,
        wallMaterial
    );


    createWall(
        scene,
        collisionSystem,
        -7,
        baseHeight + 2,
        10,
        0.5,
        4,
        10,
        wallMaterial
    );


    createWall(
        scene,
        collisionSystem,
        0,
        baseHeight + 2,
        10,
        0.5,
        4,
        10,
        wallMaterial
    );


    createWall(
        scene,
        collisionSystem,
        7,
        baseHeight + 2,
        10,
        0.5,
        4,
        10,
        wallMaterial
    );


    // =========================================
    // ROOM NUMBERS
    // =========================================

    const rooms = [
        1, 2, 3, 4,
        5, 6, 7, 8
    ];


    const positions = [
        [-11, -10],
        [-3.5, -10],
        [3.5, -10],
        [11, -10],

        [-11, 10],
        [-3.5, 10],
        [3.5, 10],
        [11, 10]
    ];


    for (
        let i = 0;
        i < rooms.length;
        i++
    ) {

        const roomNumber =
            floorNumber * 100 + rooms[i];


        createRoomDoor(
            scene,
            collisionSystem,
            interactionSystem,
            positions[i][0],
            baseHeight,
            positions[i][1],
            roomNumber,
            wallMaterial
        );
    }
}


function createWall(
    scene,
    collisionSystem,
    x,
    y,
    z,
    width,
    height,
    depth,
    material
) {

    const geometry =
        new THREE.BoxGeometry(
            width,
            height,
            depth
        );


    const wall =
        new THREE.Mesh(
            geometry,
            material
        );


    wall.position.set(
        x,
        y,
        z
    );


    scene.add(wall);

    collisionSystem.add(wall);
}


function createRoomDoor(
    scene,
    collisionSystem,
    interactionSystem,
    x,
    baseHeight,
    z,
    roomNumber,
    material
) {

    const doorGeometry =
        new THREE.BoxGeometry(
            1.4,
            3,
            0.15
        );


    const door =
        new THREE.Mesh(
            doorGeometry,
            material
        );


    door.position.set(
        x,
        baseHeight + 1.5,
        z
    );


    door.userData.roomNumber =
        roomNumber;


    door.userData.isOpen =
        false;


    door.userData.interact =
        () => {

            door.userData.isOpen =
                !door.userData.isOpen;

            console.log(
                "Room " +
                roomNumber +
                " door: " +
                (
                    door.userData.isOpen
                    ? "OPEN"
                    : "CLOSED"
                )
            );
        };


    scene.add(door);

    collisionSystem.add(door);

    interactionSystem.add(door);
}