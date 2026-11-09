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

        // what you are aiming at (drawers, lids, papers ...) gets a soft warm glow + four small corner
        // marks instead of a plain rectangle: objects with userData.outline = true get it
        this.hl = new THREE.Group();

        this.hlFill = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshBasicMaterial({ color: 0xff7a3c, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false })
        );

        this.hlFill.renderOrder = 998;

        this.hl.add(this.hlFill);

        // corner ticks: three short strokes at every corner of the box
        const pts = [], T = 0.2;

        for (const sx of [-0.5, 0.5]) for (const sy of [-0.5, 0.5]) for (const sz of [-0.5, 0.5]) {

            pts.push(sx, sy, sz, sx - Math.sign(sx) * T, sy, sz);

            pts.push(sx, sy, sz, sx, sy - Math.sign(sy) * T, sz);

            pts.push(sx, sy, sz, sx, sy, sz - Math.sign(sz) * T);
        }

        const cg = new THREE.BufferGeometry();

        cg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));

        this.hlMark = new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ color: 0xffd6a0, transparent: true, depthTest: false, depthWrite: false }));

        this.hlMark.renderOrder = 999;

        this.hlMark.frustumCulled = false;

        this.hl.add(this.hlMark);

        this.hl.visible = false;

        scene.add(this.hl);

        this.hlTarget = null;

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

        this.hlTarget = null;

        this.hl.visible = false;

        this.interactionMessage.style.display = "none";
    }

    update() {

        // keep the frame on its target (it follows a sliding drawer)
        if (this.hlTarget) {

            const o = this.hlTarget;

            o.updateWorldMatrix(true, false);

            o.matrixWorld.decompose(this.hl.position, this.hl.quaternion, this.hl.scale);

            this.hl.scale.multiplyScalar(1.04);

            const k = Math.sin(performance.now() * 0.005);

            this.hlFill.material.opacity = 0.13 + 0.07 * k;

            this.hlMark.material.opacity = 0.75 + 0.25 * k;
        }

        this.raycaster.setFromCamera(this.center, this.camera);

        const hits =
            this.raycaster.intersectObjects(
                this.interactableObjects,
                false
            );

        if (hits.length === 0) {

            if (!this.always()) this.hide();

            return;
        }

        const hit = hits[0];

        if (hit.distance > this.maxDistance) {

            if (!this.always()) this.hide();

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

                    if (!this.always()) this.hide();

                    return;
                }
            }
        }

        this.select(hit.object);
    }

    // an object that is "always" reachable (userData.always() is true) answers
    // even when you are not aiming at it (e.g. the bed in Ramu's room)
    always() {

        for (const o of this.interactableObjects) {

            if (o.userData.always && o.userData.always() && this.select(o)) return true;
        }

        return false;
    }

    select(object) {

        // PRACTICE MODE is only for practising movement: no clues, drawers, keys or puzzles; only doors
        if (document.body.classList.contains("practice") && object.userData.pivot === undefined) {

            this.currentObject = null;

            this.hide();

            return;
        }

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

        // an object may have nothing to offer right now (empty prompt): act as if not aimed at
        if (!text) {

            this.currentObject = null;

            this.hide();

            return false;
        }

        // on a phone the buttons are called ACT and SIT
        if (document.body.classList.contains("touch")) {

            text = String(text).replace(/Press E to/g, "Tap ACT to").replace(/Press E/g, "Tap ACT").replace(/Press C/g, "Tap SIT");
        }

        // "Press E - Open the door"  ->  [E] Open the door   (a small glowing key cap)
        const mm = /^Press ([A-Z]) - (.*)$/.exec(String(text));

        if (mm) {

            this.interactionMessage.textContent = "";

            const k = document.createElement("span");

            k.className = "k";

            k.textContent = mm[1];

            this.interactionMessage.appendChild(k);

            this.interactionMessage.appendChild(document.createTextNode(mm[2]));
        }
        else this.interactionMessage.textContent = text;

        this.interactionMessage.style.display = "block";

        this.hlTarget = object.userData.outline ? object : null;

        this.hl.visible = !!this.hlTarget;

        return true;
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