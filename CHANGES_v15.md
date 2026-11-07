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
