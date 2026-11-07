// =========================================
// ROOM SYSTEM
// =========================================

export class RoomSystem {

    constructor() {

        this.rooms = [

            // =====================================
            // FLOOR 1
            // =====================================

            {
                id: "101",
                floor: 1,
                minX: -14.5,
                maxX: -7.5,
                minZ: -14.5,
                maxZ: -4.5
            },

            {
                id: "102",
                floor: 1,
                minX: -6.5,
                maxX: -0.5,
                minZ: -14.5,
                maxZ: -4.5
            },

            {
                id: "103",
                floor: 1,
                minX: 0.5,
                maxX: 6.5,
                minZ: -14.5,
                maxZ: -4.5
            },

            {
                id: "104",
                floor: 1,
                minX: 7.5,
                maxX: 14.5,
                minZ: -14.5,
                maxZ: -4.5
            },


            {
                id: "105",
                floor: 1,
                minX: -14.5,
                maxX: -7.5,
                minZ: 4.5,
                maxZ: 14.5
            },

            {
                id: "106",
                floor: 1,
                minX: -6.5,
                maxX: -0.5,
                minZ: 4.5,
                maxZ: 14.5
            },

            {
                id: "107",
                floor: 1,
                minX: 0.5,
                maxX: 6.5,
                minZ: 4.5,
                maxZ: 14.5
            },

            {
                id: "108",
                floor: 1,
                minX: 7.5,
                maxX: 14.5,
                minZ: 4.5,
                maxZ: 14.5
            },


            // =====================================
            // FLOOR 2
            // =====================================

            {
                id: "201",
                floor: 2,
                minX: -14.5,
                maxX: -7.5,
                minZ: -14.5,
                maxZ: -4.5
            },

            {
                id: "202",
                floor: 2,
                minX: -6.5,
                maxX: -0.5,
                minZ: -14.5,
                maxZ: -4.5
            },

            {
                id: "203",
                floor: 2,
                minX: 0.5,
                maxX: 6.5,
                minZ: -14.5,
                maxZ: -4.5
            },

            {
                id: "204",
                floor: 2,
                minX: 7.5,
                maxX: 14.5,
                minZ: -14.5,
                maxZ: -4.5
            },


            {
                id: "205",
                floor: 2,
                minX: -14.5,
                maxX: -7.5,
                minZ: 4.5,
                maxZ: 14.5
            },

            {
                id: "206",
                floor: 2,
                minX: -6.5,
                maxX: -0.5,
                minZ: 4.5,
                maxZ: 14.5
            },

            {
                id: "207",
                floor: 2,
                minX: 0.5,
                maxX: 6.5,
                minZ: 4.5,
                maxZ: 14.5
            },

            {
                id: "208",
                floor: 2,
                minX: 7.5,
                maxX: 14.5,
                minZ: 4.5,
                maxZ: 14.5
            },


            // =====================================
            // FLOOR 3
            // =====================================

            {
                id: "301",
                floor: 3,
                minX: -14.5,
                maxX: -7.5,
                minZ: -14.5,
                maxZ: -4.5
            },

            {
                id: "302",
                floor: 3,
                minX: -6.5,
                maxX: -0.5,
                minZ: -14.5,
                maxZ: -4.5
            },

            {
                id: "303",
                floor: 3,
                minX: 0.5,
                maxX: 6.5,
                minZ: -14.5,
                maxZ: -4.5
            },

            {
                id: "304",
                floor: 3,
                minX: 7.5,
                maxX: 14.5,
                minZ: -14.5,
                maxZ: -4.5
            },


            {
                id: "305",
                floor: 3,
                minX: -14.5,
                maxX: -7.5,
                minZ: 4.5,
                maxZ: 14.5
            },

            {
                id: "306",
                floor: 3,
                minX: -6.5,
                maxX: -0.5,
                minZ: 4.5,
                maxZ: 14.5
            },

            {
                id: "307",
                floor: 3,
                minX: 0.5,
                maxX: 6.5,
                minZ: 4.5,
                maxZ: 14.5
            },

            {
                id: "308",
                floor: 3,
                minX: 7.5,
                maxX: 14.5,
                minZ: 4.5,
                maxZ: 14.5
            }

        ];


        this.currentRoom = null;

        this.currentFloor = null;

    }


    // =========================================
    // FIND ROOM
    // =========================================

    getRoom(
        x,
        y,
        z
    ) {

        // =====================================
        // DETERMINE FLOOR
        // =====================================

        let floor = 1;


        if (y >= 2.7 && y < 6.7) {

            floor = 2;

        }
        else if (y >= 6.7 && y < 10.7) {

            floor = 3;

        }


        // =====================================
        // SEARCH ROOM
        // =====================================

        for (
            const room
            of this.rooms
        ) {

            if (
                room.floor === floor &&

                x >= room.minX &&
                x <= room.maxX &&

                z >= room.minZ &&
                z <= room.maxZ
            ) {

                return room;

            }

        }


        return null;

    }


    // =========================================
    // UPDATE
    // =========================================

    update(position) {

        const room =
            this.getRoom(
                position.x,
                position.y,
                position.z
            );


        // =====================================
        // ROOM CHANGED
        // =====================================

        if (
            room &&
            room.id !== this.currentRoom
        ) {

            this.currentRoom =
                room.id;


            this.currentFloor =
                room.floor;


            console.log(
                "Entered Room:",
                room.id
            );


            console.log(
                "Floor:",
                room.floor
            );

        }


        // =====================================
        // OUTSIDE ROOM
        // =====================================

        if (!room) {

            this.currentRoom =
                null;

        }

    }


    // =========================================
    // GET CURRENT ROOM
    // =========================================

    getCurrentRoom() {

        return this.currentRoom;

    }


    // =========================================
    // GET CURRENT FLOOR
    // =========================================

    getCurrentFloor() {

        return this.currentFloor;

    }

}