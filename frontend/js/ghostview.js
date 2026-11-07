// ======================================================
// GHOST 3D MODEL VIEW   (Practice Mode only)
//
// A full-screen turntable that shows the REAL ghost model (the same model the game uses):
// short messy hair, red eyes, torn clothes and the heavy iron chain.
//   drag / swipe = turn him round      wheel / pinch = zoom
//   "Walk" button = he walks on the spot, dragging the chain
// It is only created when the player picks "Ghost 3D Model View".
// ======================================================
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { createGhostModel } from "./ghostmodel.js";

let view = null;

function build() {

    const wrap = document.createElement("div");

    wrap.id = "ghostview";

    wrap.style.cssText = "position:fixed;inset:0;z-index:99999;display:none;background:radial-gradient(ellipse at 50% 38%,#2a0a0c 0%,#0b0506 62%,#000 100%);touch-action:none;user-select:none;";

    wrap.innerHTML =
        '<canvas style="position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab"></canvas>' +
        '<div style="position:absolute;top:2.4vh;left:0;right:0;text-align:center;font-family:Georgia,serif;letter-spacing:.28em;color:#c9b99a;font-size:clamp(14px,2.2vw,22px);text-shadow:0 0 14px #7d0b12;pointer-events:none">GHOST 3D MODEL VIEW</div>' +
        '<div class="gv-hint" style="position:absolute;bottom:2.4vh;left:0;right:0;text-align:center;font-family:Georgia,serif;color:#8b7f68;font-size:clamp(11px,1.5vw,15px);letter-spacing:.12em;pointer-events:none">Drag to turn him round  -  scroll or pinch to zoom</div>' +
        '<div style="position:absolute;top:2vh;right:2vw;display:flex;gap:10px">' +
        '<button class="gv-walk" style="padding:10px 18px;background:rgba(40,8,10,.85);color:#e4d8c0;border:1px solid #7d0b12;font-family:Georgia,serif;letter-spacing:.14em;cursor:pointer">WALK</button>' +
        '<button class="gv-close" style="padding:10px 18px;background:rgba(40,8,10,.85);color:#e4d8c0;border:1px solid #7d0b12;font-family:Georgia,serif;letter-spacing:.14em;cursor:pointer">CLOSE</button>' +
        '</div>';

    document.body.appendChild(wrap);

    const canvas = wrap.querySelector("canvas");

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();

    scene.fog = new THREE.Fog(0x0b0506, 7, 16);

    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);

    // lights: a cold key from the front-left, a blood-red rim from behind, a little fill
    scene.add(new THREE.AmbientLight(0x6a5a60, 1.1));

    const key = new THREE.DirectionalLight(0xdfe6ff, 2.1);

    key.position.set(-2.5, 3.2, 3.2);

    scene.add(key);

    const rim = new THREE.DirectionalLight(0xff2a1a, 1.8);

    rim.position.set(2.8, 2.2, -3.0);

    scene.add(rim);

    const under = new THREE.PointLight(0xff5a3a, 0.8, 6, 2);

    under.position.set(0, 0.2, 1.6);

    scene.add(under);

    // floor
    const floor = new THREE.Mesh(
        new THREE.CircleGeometry(3.2, 48),
        new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 1 })
    );

    floor.rotation.x = -Math.PI / 2;

    scene.add(floor);

    const model = createGhostModel(scene);

    scene.add(model.root);

    if (model.setVisible) model.setVisible(true);

    model.root.position.set(0, 0, 0);

    model.floorY = 0;

    const look = new THREE.Vector3(0, 1.4, 6);

    const st = { az: 0.35, el: 0.08, dist: 5.2, walk: false, t: 0, drag: null, pinch: 0, last: 0 };

    const hand = new THREE.Vector3();

    function size() {

        const w = wrap.clientWidth || window.innerWidth, h = wrap.clientHeight || window.innerHeight;

        renderer.setSize(w, h, false);

        camera.aspect = w / h;

        camera.updateProjectionMatrix();
    }

    function frame(now) {

        if (!view || !view.open) return;

        view.raf = requestAnimationFrame(frame);

        const dt = Math.min(0.05, (now - st.last) / 1000 || 0.016);

        st.last = now;

        st.t += dt;

        if (!st.drag && !st.walk) st.az += dt * 0.12;         // slow turntable when untouched

        // the ghost: standing and breathing, or walking on the spot dragging the chain
        model.root.rotation.y = st.walk ? 0.0 : 0.0;

        model.update(dt, { speed: st.walk ? 1.05 : 0, run: false, look: st.walk ? null : new THREE.Vector3(camera.position.x, 1.7, camera.position.z), open: 0.0, calm: 1, leftTo: null, rightTo: null }, null, false);

        // keep him in place while walking
        model.root.position.set(0, 0, 0);

        const cy = 1.15 + st.el * 1.5 + Math.max(0, 5.2 - st.dist) * 0.2;

        camera.position.set(Math.sin(st.az) * st.dist * Math.cos(st.el), cy + Math.sin(st.el) * st.dist, Math.cos(st.az) * st.dist * Math.cos(st.el));

        camera.lookAt(0, 1.05 + Math.max(0, 5.2 - st.dist) * 0.2, 0);

        renderer.render(scene, camera);
    }

    // --- controls ---
    const down = (x) => { st.drag = { x, az: st.az }; canvas.style.cursor = "grabbing"; };

    canvas.addEventListener("mousedown", (e) => down(e.clientX));

    window.addEventListener("mousemove", (e) => { if (st.drag) { st.az = st.drag.az - (e.clientX - st.drag.x) * 0.008; } });

    window.addEventListener("mouseup", () => { st.drag = null; canvas.style.cursor = "grab"; });

    canvas.addEventListener("wheel", (e) => { e.preventDefault(); st.dist = Math.max(1.8, Math.min(8, st.dist + e.deltaY * 0.004)); }, { passive: false });

    canvas.addEventListener("touchstart", (e) => {
        if (e.touches.length === 2) st.pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        else down(e.touches[0].clientX);
    }, { passive: true });

    canvas.addEventListener("touchmove", (e) => {
        if (e.touches.length === 2) {
            const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            if (st.pinch) st.dist = Math.max(1.8, Math.min(8, st.dist - (d - st.pinch) * 0.01));
            st.pinch = d;
        }
        else if (st.drag) st.az = st.drag.az - (e.touches[0].clientX - st.drag.x) * 0.008;
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener("touchend", () => { st.drag = null; st.pinch = 0; });

    const walkBtn = wrap.querySelector(".gv-walk");

    walkBtn.addEventListener("click", () => { st.walk = !st.walk; walkBtn.textContent = st.walk ? "STAND" : "WALK"; });

    wrap.querySelector(".gv-close").addEventListener("click", () => close());

    window.addEventListener("keydown", (e) => { if (view && view.open && (e.key === "Escape" || e.key === "g" || e.key === "G")) { e.stopPropagation(); close(); } }, true);

    window.addEventListener("resize", () => { if (view && view.open) size(); });

    function close() {

        if (!view.open) return;

        view.open = false;

        cancelAnimationFrame(view.raf);

        wrap.style.display = "none";

        if (view.onClose) view.onClose();
    }

    return {
        open: false, raf: 0, onClose: null, st, model, camera, renderer,
        show(onClose) {
            this.onClose = onClose || null;
            this.open = true;
            wrap.style.display = "block";
            size();
            st.last = performance.now();
            this.raf = requestAnimationFrame(frame);
        },
        close
    };
}

export function openGhostView(onClose) {

    if (!view) view = build();

    if (view.open) return;

    view.show(onClose);

    return view;
}

export function closeGhostView() { if (view && view.open) view.close(); }

export function ghostViewDebug() { return view; }
