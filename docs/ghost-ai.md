# Ghost AI (Ramu) - how he thinks

Code: `frontend/js/ghosts.js` (brain, states, director), `ghostmodel.js` (body poses), `audio.js` (synth sounds).
Tune everything in `GHOST_CFG` at the top of `ghosts.js` (per difficulty: speeds, vision, fov, hearing, search time, find chance, scare rate).

## States (aggression 0-4)
| aggr | state | what he does |
|---|---|---|
| 0 | wander | patrols all floors, stairs, the lawn and the back stairs; stops to observe, scan, tilt his head, look behind him, twitch, stand in a corner; sometimes crawls; sometimes revisits a room |
| 1 | suspicious | he heard something: stops, turns his head, listens, then goes to look |
| 2 | search | looks round, checks rooms and hiding places (listens / knocks / slowly opens); may PRETEND TO LEAVE (feint) and return creeping |
| 3 | chase | he saw you: fast, faster the longer it lasts; breathing, growls |
| 4 | kill | only when he is close AND has a clear way to you |

## Senses
* Vision: cone of his eyes (`fov`) + a short all-round sense (`nearSense`) + a ray that walls and shut doors block. All-round during a chase.
* Hearing: running, doors, the flashlight, and now anything you touch (drawers, items). He does not know your exact position.

## Fairness
* `mercy`: no new scene for ~12-14 s after an escape.
* A hiding place that was a close call cannot find you again for 35 s; repeat checks raise the chance slowly (max 28%).
* A scene always gives a warning (knocks, whisper, flicker, creak) and cannot kill by itself (only a rare "ambush" at the end of stalking, with a 0.7 s scream first).
* Anti-stuck: open door leaves never block him, `watchdog()` + `unstick()` put him on a free spot if he makes no progress.

## Director scenes (rare, one at a time)
stalk (follows out of sight, gone when you turn), behind (appears behind you, walks up slowly), knock (3 knocks, door opens slowly),
watch (outside a window), and small scares: light flicker, door slam, falling book, shadow, distant steps, whisper, laughter, far knock.
