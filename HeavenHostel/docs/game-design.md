# Game design notes

* **Loop:** explore -> find notes -> solve a puzzle -> a clue page + the next hint -> ... -> nine puzzles -> hidden door -> ending.
* **Ghost:** patrols every floor slowly, 24/7. Kills only when it sees you. Hiding is safe unless it SAW you hide. The old bell = "I give up".
* **Fairness:** every note of a puzzle lies in a fixed, hinted room. Puzzles are plain: one rule, one answer.
* **Replay:** `gen.js` makes a new case (answers and rooms) for every new game.
* **Mobile:** touch.js (stick, look, buttons, keypad). Graphics quality drops to "medium" the first time on a phone.
* **Online (optional):** `backend/` (Flask + SQLite): guest/real accounts, cloud save after every puzzle, leaderboard.
* **Art:** `story_*.jpg` story screens, `p01-p12.jpg` poster stickers on the trunks. Original artwork, easy to replace.
