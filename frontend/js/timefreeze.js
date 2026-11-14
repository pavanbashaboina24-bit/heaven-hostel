// ======================================================
// TIMEFREEZE  -  makes the game really STOP while the pause menu / menu is open.
//
// Many scenes of the game (gate cinematic, secret doors, ghost knocks, cellar hatch ...) run on
// setTimeout.  This tiny module wraps setTimeout / clearTimeout so those timers can be frozen:
//
//     freezeTimers(true)    pause menu opened: every running timer stops where it is
//     freezeTimers(false)   Resume: each timer carries on with the time it had left
//     dropFrozenTimers()    a brand-new game starts: forget what was frozen
//
// Timers created WHILE frozen (the menus themselves) run normally.
// It must be imported before any other game file (main.js does that).
// ======================================================

const realSet = window.setTimeout.bind(window);
const realClear = window.clearTimeout.bind(window);

let nextId = 1000000000;

const live = new Map();     // virtual id -> { fn, ms, args, due, real }

const frozen = [];          // [{ id, fn, left, args }]

window.setTimeout = function (fn, ms, ...args) {

    // (a string handler or a missing function: leave it to the browser)
    if (typeof fn !== "function") return realSet(fn, ms, ...args);

    const id = nextId++;

    const ent = { fn, args, due: performance.now() + (ms || 0), real: 0 };

    ent.real = realSet(() => {

        live.delete(id);

        fn(...args);

    }, ms);

    live.set(id, ent);

    return id;
};

window.clearTimeout = function (id) {

    const ent = live.get(id);

    if (ent) {

        realClear(ent.real);

        live.delete(id);

        return;
    }

    const i = frozen.findIndex((f) => f.id === id);

    if (i >= 0) {

        frozen.splice(i, 1);

        return;
    }

    realClear(id);
};

let isFrozen = false;

export function freezeTimers(on) {

    if (on === isFrozen) return;

    isFrozen = on;

    if (on) {

        const now = performance.now();

        for (const [id, ent] of live) {

            realClear(ent.real);

            frozen.push({ id, fn: ent.fn, args: ent.args, left: Math.max(0, ent.due - now) });
        }

        live.clear();

        return;
    }

    for (const f of frozen.splice(0)) {

        const ent = { fn: f.fn, args: f.args, due: performance.now() + f.left, real: 0 };

        ent.real = realSet(() => {

            live.delete(f.id);

            f.fn(...f.args);

        }, f.left);

        live.set(f.id, ent);
    }
}

export function dropFrozenTimers() {

    frozen.length = 0;

    isFrozen = false;
}
