# Heaven Hostel

A first-person horror mystery that runs in the browser (three.js). A boy named Ramu died in Room 204.
Find out why, solve his ten puzzles, and give his letter back.

* Play on a **computer** (WASD + mouse) or a **phone / tablet** (touch controls appear by themselves).
* Spoilers and answers: `docs/puzzles.md`  (or press F12, type `hhSpoiler()` in the game).

## Folders
```
frontend/   the game (HTML + JavaScript + assets)
  js/         the game code (see the comment at the top of every file)
  assets/
    sounds/     all sounds
    story/      the 15 pictures of the story screens
    posters/    12 hero-fan / movie-fan posters used on the room trunks
    models/     the ghost
backend/    Flask server: serves the game + accounts, cloud save, leaderboard (optional)
docs/       story, game design, puzzles / spoilers
render.yaml deploy file for Render
```

## Run it on your computer
Just the game (no server):
```
cd frontend
python -m http.server 8000      # then open http://localhost:8000
```
Game + server (cloud save, leaderboard):
```
pip install -r requirements.txt
cd backend
python app.py                   # open http://localhost:5000
```

## Controls
| Keyboard | Phone |
|----------|-------|
| W A S D, mouse | stick (left thumb), drag on the right to look |
| E  use / pick up / hide | ACT |
| C  sit / crouch | SIT |
| Shift run, Space jump | RUN, JUMP |
| F torch | LIGHT |
| B bag | BAG |
| H H  ring the old bell (the ghost comes: the run ends) | BELL (tap twice) |
| Esc pause | II |

Add `?touch=1` to the address to try the touch controls on a computer.

## Deploy on Render
**Option A - one web service with the server (recommended: cloud save + leaderboard)**
1. Push this repository to GitHub.
2. Render -> New + -> **Blueprint** -> pick the repository (it reads `render.yaml`).
3. Done. The address Render gives you serves the game at `/` and the API at `/api`.
   (Add a Disk and set `HH_DATABASE=/var/data/hostel.db` if you want the leaderboard to survive restarts.)

**Option B - static site only (no server)**: New + -> Static Site, Publish directory `frontend`.
The game works fully; cloud save and the leaderboard are simply switched off.

## Credits
Code, story and art: built for this project. All pictures and posters are original (no film characters);
sounds are synthesised or from the original sound pack in `assets/sounds`.
