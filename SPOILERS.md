# HEAVEN HOSTEL - SPOILERS  (v10)

Notes, cards and items sit in different rooms in every new game, and the radio number, fuse switches,
book colour, word etc. change too. The RULES below always stay the same.

**Exact answers for the game you are playing right now:** press **F12**, open **Console**, type

    hhSpoiler()

and press Enter (capital **S**). It prints every answer, the room of every note and the room of the gate key.

---------------------------------------------------------------------------------------------------
## CHAPTER 1 - "What happened to Ramu?"  (4 puzzles, any order)

| # | Puzzle | Where | How to solve |
|---|--------|-------|--------------|
| 1 | Drawer code | Reception desk (warden's note) + Room 204 desk (name list) | Code = **204** + number of **crossed-out** names. 3 crossed out -> **2043** |
| 2 | Trunk word | Trunk at the foot of the bed, Room 204 | The notebook shows a word with its **letters jumbled** (e.g. `V L G A E L I`). Amma's postcard says what the word is about. Put the letters in order and type it (VILLAGE). |
| 3 | Bookcase | Mess hall (ground-floor hall), SOUTH wall | A note names a colour. Press E on the book of **that colour**. A hidden door at the bottom opens. |
| 4 | Fuse box | Terrace room, beside the door | Card 1 + card 2 list 3 switches that must be **UP**. All others DOWN. Press Enter to pull the lever. |

## CHAPTER 2 - "What does Ramu want?"  (6 puzzles, the candles come last)

| # | Puzzle | Where | How to solve |
|---|--------|-------|--------------|
| 5 | Radio | Reception desk | Anna FM's number is on the station card; the draft letter says Old Gold = Anna FM **+ N**. Tune to Anna + N. |
| 6 | Key board | Behind the reception desk | Third-floor rooms are 301-304 from the stairs. Gopal sleeps in the Nth room from the stairs -> **30N** (2nd = 302). |
| 7 | Rat hole | Mess hall, NORTH wall, near the floor | Pick up the **cheese** (in a random room, see the hint). Stand at the hole, press E. The rat takes it, a brick falls out. |
| 8 | Lever | Terrace room, back wall, left of the altar | Pick up the **iron handle** (random room, see the hint). E at the lever to fit it, E again to pull. A hidden cupboard opens. |
| 9 | Tin box (CELLAR) | Cellar under Room 106 (ground floor, south side): trapdoor, then the tin box in the SOUTH-WEST corner | A secret note (random room, see the hint) says: count the **chalk strokes** on the 4 cellar walls (slashed bundle = 5) and type them **North, East, South, West** (each wall has its letter). The trapdoor needs the **cellar key**: left stairs, reception desk or a dorm-room trunk (random every game). While you stay down there long enough, Ramu can come down the cellar for you: climb the ladder to escape. |
| 10 | Candles | Altar, terrace room | Needs puzzles 5-9 done first. The 3 diary pages list the names 1st-7th. Press the candle number whose name is 1st, then 2nd ... 7th. |

When ALL TEN are solved:
- you get the **rusty blade** and Ramu's last wish,
- and the **HIDDEN DOOR** appears (see below).

---------------------------------------------------------------------------------------------------
## THE HIDDEN DOOR AND THE ENDING
- **Where:** the old mess hall (ground-floor hall), **NORTH wall, directly OPPOSITE the bookcase** (the bookcase is on the south wall).
- **When:** it does not exist before puzzle 10 is solved. After that it is always there (also after Continue).
- Press **E** on the door: the screen fades and you are in **Ramu's secret room**, far underground. The ghost cannot follow you.
- In the room: **E on the south door** = go back to the hostel (you can come and go until you lay the letter).
- The hidden door only opens for someone **carrying Ramu's letter** (otherwise it says so).
- Stand near the bed (no need to aim): the prompt **Lay Ramu's letter on his bed** appears (ACT on a phone) = the ending. The room is big: walk round, look at the drawings (E) - it is his childhood room.
- Ramu's letter: cut the swing seat in the yard with the rusty blade (swing under the dead tree).
- Door not visible? F12 Console: `hhReveal()` shows it, `hhRoom()` goes straight in.

## THE BACK STAIRS (optional way to the terrace)
- West side of the yard, behind the hostel, past the graveyard fence: a round iron staircase inside a cage with a **locked gate**.
- **Key:** an old iron key on the floor of one random room. After puzzle 4 the clue page tells you the room. `hhSpoiler()` prints it too.
- Unlock the gate (E). It stays open. The stairs are dark and scary (blood, hands, chains, a red light, 3 scares).
- Climb: hold **W** (the stairs carry you round; **S** goes the other way). From the terrace walk onto the stairs and hold **W** to go DOWN.

## THE MAIN GATE TRAP
- Open the main gate (after smashing the lock), walk in: the gate closes behind you and the "LOCKED IN - Ramu is watching you" pages play. It stays locked for the rest of the game.

## THE GHOST
- Walks the whole hostel slowly, room by room, all floors (ground, 1st, 2nd, terrace, then down again), 24 hours a day. It never stands still and never vanishes.
- Half of its walks go to the rooms that still hold a clue (the one nearest to you first). If you stand in such a room it may suddenly appear in it, facing you.
- It can come down into the cellar too.
- It attacks only when it **sees** you (from far away, from any side). Slow when far, fast when close.
- **Hiding is safe**, unless it SAW you slip into the hiding place: then it comes straight to that place.
- **The old bell** (you start with it): press **H twice** (or BELL on a phone) to ring it. The ghost comes, finds you and kills you: the run ends. It only calls the ghost.

## OTHER THINGS
- Solved puzzles: their notes vanish, and the clue page you earn crumbles to dust after you read it (the hint is on the HUD).
- Falls: more than 6 m kills ("You fell ..."). Jump from the terrace-room roof over the parapet to fall. One floor (4 m) is safe.
- Phones: the touch controls appear by themselves (stick, look, ACT, JUMP, RUN, SIT, LIGHT, BAG, BELL, pause) and an on-screen keypad for puzzles.
- Trunks: every room's trunk is a painted tin trunk with hero-fan / movie-fan posters. Put your own pictures in `frontend/assets/posters/` (p01.jpg ... p12.jpg).
- Leaderboard (needs the Flask server, see README): `hhLeaderboard()` in the Console.
