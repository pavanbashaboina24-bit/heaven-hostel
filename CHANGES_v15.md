# Heaven Hostel - round 15 changes

DONE
- Ritual-sealed main door (js/ritualdoor.js, used by js/yard.js): painted door, threads, bells, chillies, lemons, bag, bolt + padlock
- First key smaller (about 14 cm) + rise-into-hand pickup animation (js/yard.js)
- Intro story: Ramu thinks everyone entering the gate is an old friend and kills them (js/story.js, intro + "locked in")
- Gate: creaks open; walking in triggers a cinematic (push-in, vignette, creaks, slam, shake, flash) (js/exterior.js)
- Ghost model: back to the previous version (long hair, rope) as requested
- Ghost blood: removed completely (js/ghosts.js)
- Chain-drag sound: spatial, louder when near (js/audio.js, js/ghosts.js)
- Ramu: proper boy's hair instead of the cap (js/ghostmodel.js); still appears only after the letter is on the bed
- Hover highlight: glow + corner marks instead of a rectangle; "[E] Open..." key-cap prompt (js/interaction.js, index.html)
- Washroom door can be opened/closed from inside (js/haunted.js)
- Items live in the bag (B): icon tiles + inspect; nothing drawn on screen (js/inventory.js)
- Practice: "Ghost 3D Model View" (js/ghostview.js, js/menu.js, index.html)
- Top back-stairs door: 1.1 x 2.15 m with wall filled in beside it (js/spiral.js)
- Space under the first turn of the back stairs is solid (js/spiral.js)
- Ghost cannot kill through walls / shut doors (js/ghosts.js)
- Door fingerprints use each door's real size and stay attached (js/world.js)
- Palette shift (faded green / brown) (js/haunted.js); the floating white dust was removed; new icons from your artwork (assets/icon-*.png)

DONE (round 2)
- Graveyard has exactly four different entrances: east (pillars + lantern), north (iron arch + cross), south (ball pillars, gate ajar), west (ruined gate) (js/exterior.js)
- Crypt hatch in the graveyard = the way down to Ramu's underground room; sealed with chains until all puzzles are solved, then opens; leaving returns you there (js/mystery.js addCrypt). The old hall secret door is removed (js/hall.js)

NOT DONE
- Ghost stuck-at-door pathing, ghost on grass/back-stairs navigation changes
- Full environment redesign (textures, red lighting areas)

ROUND 16
- Back stairs: removed the solid blocks I had put under the stairs (they were in the way). Checked with the game's real Player + Collision code in Node: walking in through the gate and up to the terrace, and back down, both work (js/spiral.js)
- First screen: the poster picture is gone; an animated HEAVEN HOSTEL title (glowing, swaying, flickering, dripping blood) over the 3D gate (index.html)
- Ending: Ramu now turns his FRONT to you and says thank you (js/mystery.js). After he goes: dawn, you walk out of the open front door and gate, leave the letter on a stone, a girl (Ramu's sister) comes up the road, takes the letter, and a final scene shows her family crying as she reads it, then THE END (js/outro.js, js/story.js theEnd)
- Practice Mode is separate: ground floor only (you are put back if you climb), only doors can be used, no ghost/story/clues/stats/saves; the Ghost 3D Model View is only inside Practice Mode (button in the practice panel, key G, and the pause menu), no longer outside it (js/menu.js, js/main.js, js/interaction.js, index.html)
- Mystery door: the crypt hatch in the graveyard stays chained shut. A shovel stands near it; pick it up (E), then with Ramu's letter hit the hatch (E): three blows, the chains snap and the slab breaks open (js/mystery.js)

ROUND 17 / 18
- ENDING FIXED: after you walk out, the black screen is gone - the ending pictures (girl finds the letter at the gate, runs home, the family reads it and cries) and THE END now show. The black veil used to stay on top of them (js/outro.js). The walk-out can no longer get stuck either.
- Ghost: patrols the lawn in front of the open main door and can open the main door himself; walks the bridge and the back (spiral) stairs once the stair door is unlocked and open, and opens that door himself (js/ghosts.js, js/spiral.js, js/yard.js). A built-in self-check confirms a path exists from the roof stairs to the foot of the back stairs and to the lawn
- Sacred threads, knots, rusty padlock and chain on the doors that start locked (rooms 101 and 104) (js/ritualdoor.js, js/world.js)
- Damp, peeling, mouldy walls with water stains; dirty floors with grime and debris; dim dirty-yellow lights; a tighter flashlight with softer falloff; darker muted colour wash + dark corners (js/haunted.js, index.html)

ROUND 20 - GHOST AI UPGRADE (see docs/ghost-ai.md)
- Vision cone + near sense, hearing of interactions, listen-then-investigate, idle quirks (observe, scan, tilt, look behind, twitch, corner), crawling, blinking out
- Smarter search: varied hiding-place checks (listen / knock / slowly open), fair find chance, mercy, revisits, fake leave-and-return
- Director scenes: stalk, behind, door knock x3 then slow open, window watcher; small scares (flicker, slam, falling book, shadow, distant steps, whisper, laugh)
- Chase: speed ramp, heavy breathing and growls, short aggro delay before scene attacks
- Anti-stuck: open door leaves never block him, main-door route fixed, watchdog + unstick
