// ======================================================
// LOCK STATE  (gate chain, main door lock): small shared registry
//   locks.register(fn)   fn() shows / hides the lock meshes
//   locks.refresh()      called on new game / continue / when a lock changes
// ======================================================
export const MAIN_KEY_SPOTS = ["well", "grave", "pot", "mailbox", "crate", "bucket"];

export const locks = {

    fns: [],

    register(fn) { this.fns.push(fn); try { fn(); } catch (e) { /* not built yet */ } },

    refresh() { for (const fn of this.fns) { try { fn(); } catch (e) { /* ignore */ } } }
};
