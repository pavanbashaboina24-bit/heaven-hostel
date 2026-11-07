// ======================================================
// HEAVEN HOSTEL: the game is ONLINE ONLY again.
// This tiny file only cleans up phones/browsers that saved the old offline copy:
// it deletes the saved files and removes itself.
// ======================================================
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {

    event.waitUntil((async () => {

        for (const key of await caches.keys()) await caches.delete(key);

        await self.registration.unregister();

        for (const c of await self.clients.matchAll({ type: "window" })) c.navigate(c.url);
    })());
});