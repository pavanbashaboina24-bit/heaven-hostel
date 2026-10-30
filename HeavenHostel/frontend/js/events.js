// ======================================================
// TINY EVENT BUS  (game parts tell the menu / achievements
// what happened:  'gate', 'door', 'hide', 'flashlight', 'ladder')
// ======================================================

const handlers = {};

export const events = {

    on(name, fn) {

        (handlers[name] = handlers[name] || []).push(fn);
    },

    emit(name, data) {

        const list = handlers[name];

        if (!list) return;

        for (const fn of list) {

            try {
                fn(data);
            }
            catch (e) {
                console.error(e);
            }
        }
    }
};