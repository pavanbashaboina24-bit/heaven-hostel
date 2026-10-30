import * as THREE from
"https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";


// ======================================================
// INTERACTION  (doors, hiding cabinets, ladder ...)
//
// An object becomes interactive when it is added with
// add(object) and has:
//
//   object.userData.interact()      what happens on E
//   object.userData.getPrompt()     (optional) text shown
//
// Walls block interaction: you cannot open a door
// through a wall any more.
// ======================================================

export class InteractionSystem {

    constructor(camera, scene) {

        this.camera = camera;

        this.scene = scene;

        this.raycaster = new THREE.Raycaster();

        this.center = new THREE.Vector2(0, 0);

        this.interactableObjects = [];

        this.occluders = [];

        this.currentObject = null;

        this.maxDistance = 3.2;

        this.interactionMessage =
            document.getElementById("interactionMessage");
    }

    add(object) {

        this.interactableObjects.push(object);
    }

    // list of meshes that can block the view (walls, furniture)
    setOccluders(list) {

        this.occluders = list;
    }

    hide() {

        this.currentObject = null;

        this.interactionMessage.style.display = "none";
    }

    update() {

        this.raycaster.setFromCamera(this.center, this.camera);

        const hits =
            this.raycaster.intersectObjects(
                this.interactableObjects,
                false
            );

        if (hits.length === 0) {

            this.hide();

            return;
        }

        const hit = hits[0];

        if (hit.distance > this.maxDistance) {

            this.hide();

            return;
        }

        // is a wall / table in the way?
        if (this.occluders.length) {

            const blocks =
                this.raycaster.intersectObjects(
                    this.occluders,
                    false
                );

            for (const b of blocks) {

                if (b.object === hit.object) continue;

                if (this.interactableObjects.includes(b.object)) continue;

                if (b.distance < hit.distance - 0.03) {

                    this.hide();

                    return;
                }
            }
        }

        const object = hit.object;

        this.currentObject = object;

        let text;

        if (object.userData.getPrompt) {

            text = object.userData.getPrompt();
        }
        else {

            text =
                "Room " +
                object.userData.roomNumber +
                " - Press E to interact";
        }

        this.interactionMessage.textContent = text;

        this.interactionMessage.style.display = "block";
    }

    // key = "E" (default) or "C".  An object answers only to its own key:
    // userData.key = "C" is used for sitting, sleeping and the swing.
    interact(key) {

        if (!this.currentObject) return;

        const object = this.currentObject;

        if ((object.userData.key || "E") !== (key || "E")) return;

        if (object.userData.interact) {

            object.userData.interact();
        }
    }
}