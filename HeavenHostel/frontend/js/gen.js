// ======================================================
// A NEW CASE FOR EVERY NEW GAME   (9 puzzles, all easy to follow)
//
// Everything the puzzles need is made up fresh when you start a new game
// (Continue keeps the same case, it is saved in localStorage):
//
//   CHAPTER 1 (4 puzzles)
//   drawer   reception drawer    code = 204 + how many names are CROSSED OUT (1-5)
//   cipher   trunk, Room 204     the nickname, every letter is moved ONE step forward
//   book     bookcase, mess hall pull out the book with the colour written in a note
//   fuse     terrace fuse box    the two cards say which switches must be UP
//
//   CHAPTER 2 (5 puzzles)
//   radio    reception radio     Old Gold FM = Anna FM + a number given in a note
//   keys     reception key board Gopal's room = "the 2nd room from the stairs" -> 302
//   rat      mess hall rat hole  find the cheese in a room, put it at the rat hole
//   lever    terrace back wall   find the missing lever handle in a room, fit it, pull
//   candles  terrace altar       light the 7 candles in the order of the 3 diary pages
//
// hint(id) tells where every note / item of a puzzle lies, so the search is
// easy and the thinking stays simple.
//
// SPOILERS:  type   hhSpoiler()   in the browser console (F12) while the game runs
// ======================================================

const KEY = "hh_case";

export const NAMES = ["Suresh", "Kiran", "Vamsi", "Naresh", "Chandu", "Bhanu", "Anil", "Mahesh", "Rajesh", "Praveen", "Teja", "Sandeep", "Harsha", "Manoj"];

export const NICKS = ["BUMPKIN", "PEASANT", "SCARECROW", "MUDFOOT", "HAYSEED", "YOKEL"];

export const BOOK_COLORS = ["RED", "GREEN", "BLUE", "YELLOW", "WHITE", "BLACK"];

const NUM = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

const ORD = ["", "first", "second", "third", "fourth"];

// rooms that can hold a note (the two locked ground-floor rooms and Room 204 are not in it)
const ALL_ROOMS = [];
for (let f = 1; f <= 3; f++) for (let r = 1; r <= 8; r++) ALL_ROOMS.push("f" + f + "r" + r);
const SKIP = ["f1r1", "f1r4", "f2r4"];
export const ROOM_POOL = ALL_ROOMS.filter((t) => !SKIP.includes(t));

const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export const roomName = (tag) => "Room " + (Number(tag[1]) * 100 + Number(tag[3]));

// every letter moves ONE step forward (A->B).  Reading it = one step back.
function caesar(s, k) {
    return s.replace(/[A-Z]/g, (c) => String.fromCharCode((c.charCodeAt(0) - 65 + k) % 26 + 65));
}

const SW = ["A", "B", "C", "D", "E", "F"];

const listOf = (arr) => arr.length === 1 ? arr[0] : arr.slice(0, -1).join(", ") + " and " + arr[arr.length - 1];

// ------------------------------------------------------ the whole case
export function makeCase() {

    const names = shuffle(NAMES);

    const laughers = names.slice(0, 7);

    const K = 1 + rnd(5);

    const struck = names.slice(7, 7 + K);

    const list = shuffle([...laughers.map((n) => ({ n, s: false })), ...struck.map((n) => ({ n, s: true }))]);

    const word = pick(NICKS);

    const plain = "THEY CALLED ME " + word;

    // fuse box: 3 switches must be UP, the first two are on card 1, the third on card 2
    const up = shuffle([0, 1, 2, 3, 4, 5]).slice(0, 3);

    const upSorted = up.map((i) => SW[i]);

    const sol = SW.map((_, i) => up.includes(i));

    // radio: Old Gold = Anna FM + 2, 3 or 4 MHz
    const anna = 88 + rnd(9) * 0.5;

    const plus = 2 + rnd(3);

    const answer = anna + plus;

    const p = 1 + rnd(4);

    const bookColor = pick(BOOK_COLORS);

    // rooms of the notes and items (Room 204 is always the first: its desk, its trunk)
    const rooms = shuffle(ROOM_POOL);

    const slots = ["ramuNote", "cipher", "postcard", "bookNote", "card1", "card2", "stations", "draft", "k1", "k2", "d1", "d2", "d3", "cheese", "handle", "gatekey"];

    const at = { names: "f2r4" };

    slots.forEach((s, i) => { at[s] = rooms[i]; });

    return {
        v: 4, laughers, struck, list, code: "204" + K,
        word, shift: 1, cipher: caesar(plain, 1),
        fuse: { sol, first: upSorted.slice(0, 2).sort(), second: upSorted.slice(2) },
        radio: { anna, plus, roots: answer + 3, night: 104 + rnd(4), answer },
        keys: { pos: p, room: String(300 + p) },
        book: { color: bookColor, shelf: shuffle(BOOK_COLORS) },
        candles: { order: laughers.slice(), shown: shuffle(laughers) },
        rooms: at
    };
}

let current = null;

function load() {

    try {

        const j = JSON.parse(localStorage.getItem(KEY));

        if (j && j.v === 4) return j;
    }
    catch (e) { /* none */ }

    return null;
}

export function theCase() {

    if (!current) current = load();

    if (!current) newCase();

    return current;
}

export function newCase() {

    current = makeCase();

    try { localStorage.setItem(KEY, JSON.stringify(current)); } catch (e) { /* ignore */ }

    return current;
}

// ------------------------------------------------------
// the text of every note (built from the case)
// ------------------------------------------------------
export function pieceText(key) {

    const c = theCase();

    switch (key) {

        case "names": {
            const lines = c.list.map((e) => "    " + e.n + (e.s ? "      [CROSSED OUT]" : "")).join("\n");
            return { title: "Names scratched into the desk", text: "ROOM 204\n\nSomeone has scratched a list into the wood. Some names have a line through them.\n\n" + lines + "\n\nUnder the list, in pencil:\n\"Crossed out = the boys who said sorry. The rest still laugh.\"" };
        }

        case "ramuNote":
            return { title: "A boy's note, folded small", text: "To whoever finds this -\n\nMy name is Ramu. I came here from Kothapalli to study.\nIf the warden asks where he can find me, tell him the truth:\nRoom 204.\n\nI am tired of being the joke on every floor.\n\n- Ramu" };

        case "cipher":
            return { title: "Notebook - the last page", text: "The last page of a school notebook. The writing is neat, but the words make no sense:\n\n" + c.cipher + "\n\nIn the margin: \"Amma's secret way. Her postcard explains it.\"\nBelow it, a tiny drawing of a trunk with a lock." };

        case "postcard":
            return { title: "A postcard from home", text: "Ramu, my son,\n\nIf the other boys ever read your diary, write it our secret way:\nevery letter is written ONE step forward in the alphabet.\nSo B stands for A, C stands for B, and so on.\n\nTo read it, go ONE step BACK.\n(Example: the word DBU is CAT.)\n\nEat well. We are proud of you.\n\n- Amma" };

        case "bookNote":
            return { title: "The warden's note about Ramu", text: "Ramu loved books. He read all day, because nobody talked to him.\n\nThe book he loved most had a " + c.book.color + " cover.\nHe kept it in the old bookcase in the MESS HALL (ground floor).\n\nI never looked behind it. I should have." };

        case "card1":
            return { title: "Electrician's card (1 of 2)", text: "TERRACE ROOM - FUSE BOX\nSix switches: A B C D E F.\n\nThese switches must be UP:\n\n    " + listOf(c.fuse.first) + "\n\n(the card is torn here - the other half is in another room)" };

        case "card2":
            return { title: "Electrician's card (2 of 2)", text: "...continued\n\nAlso UP:\n\n    " + listOf(c.fuse.second) + "\n\nEVERY OTHER switch stays DOWN.\n\nThen pull the heavy lever.\nThe box is on the terrace, inside the room, beside the door." };

        case "stations":
            return { title: "Radio station card", text: "HOSTEL RADIO - STATIONS WE CAN GET\n\n    ANNA FM ........... " + c.radio.anna.toFixed(1) + "\n    ROOTS FM .......... " + c.radio.roots.toFixed(1) + "\n    NIGHT TALK ........ " + c.radio.night.toFixed(1) + "\n    OLD GOLD .......... (the number has burned off)\n\nOne of the boys wrote underneath: \"Old Gold plays what Ramu's mother used to sing.\"" };

        case "draft":
            return { title: "A draft letter, never sent (to Gopal)", text: "Gopal,\n\nYou are the only one who never laughed, so I will tell you my secret place on the radio.\n\nOld Gold FM is exactly " + NUM[c.radio.plus].toUpperCase() + " (" + c.radio.plus + ") MHz ABOVE Anna FM.\nSo take the number of Anna FM and add " + c.radio.plus + ".\n\nWhen the static clears there, it sounds like home.\n\n- Ramu" };

        case "k1":
            return { title: "Warden's room list (1 of 2)", text: "THIRD FLOOR - NORTH ROW\n\nFour rooms in a row:\n301, 302, 303, 304.\n\n301 is the FIRST room, next to the stairs.\n304 is the LAST room, at the far end.\n\n(Key board, reception: every hook is a room number.)" };

        case "k2":
            return { title: "Warden's room list (2 of 2)", text: "THIRD FLOOR - who sleeps where\n\nGopal sleeps in the " + ORD[c.keys.pos].toUpperCase() + " room from the stairs.\n\n(Gopal is the quiet boy who never laughed.)" };

        case "d1": case "d2": case "d3": {
            const o = c.candles.order;
            const i = Number(key[1]);
            if (i === 1) return { title: "Ramu's diary - who laughed first", text: "Week 2.\n\nI wrote the names in the order they joined in, so that I would not forget:\n\n   1st:  " + o[0] + "\n   2nd:  " + o[1] + "\n   3rd:  " + o[2] + "\n\n(the page goes on in another room)" };
            if (i === 2) return { title: "Ramu's diary - it spreads", text: "Week 2, later.\n\nThe next two to join in:\n\n   4th:  " + o[3] + "\n   5th:  " + o[4] + "\n\n(the page goes on in another room)" };
            return { title: "Ramu's diary - the last to join", text: "Week 3.\n\nThe last two to join in:\n\n   6th:  " + o[5] + "\n   7th:  " + o[6] + "\n\nSeven names. Seven candles.\nThe boys who said sorry are not among them." };
        }
    }

    return null;
}

// which note (if any) lies in this room
export function pieceAt(tag) {

    const c = theCase();

    for (const k of Object.keys(c.rooms)) {

        if (c.rooms[k] === tag) return pieceText(k);
    }

    return null;
}

// the papers of every puzzle: they vanish once the puzzle is solved
export const PAPER_PUZZLE = {
    names: "drawer", cipher: "cipher", postcard: "cipher", bookNote: "book",
    card1: "fuse", card2: "fuse", stations: "radio", draft: "radio",
    k1: "keys", k2: "keys", d1: "candles", d2: "candles", d3: "candles"
};

// the puzzle whose paper lies in this room (or null)
export function paperPuzzle(tag) {

    const c = theCase();

    for (const k of Object.keys(PAPER_PUZZLE)) {

        if (c.rooms[k] === tag) return PAPER_PUZZLE[k];
    }

    return null;
}

// the rooms that hold the papers of a puzzle
export function papersOf(id) {

    const c = theCase();

    return Object.keys(PAPER_PUZZLE).filter((k) => PAPER_PUZZLE[k] === id).map((k) => c.rooms[k]);
}

export function whereIs(key) { return roomName(theCase().rooms[key]); }

// ------------------------------------------------------
// the hint that leads to each puzzle
// ------------------------------------------------------
export function hint(id) {

    switch (id) {

        case "drawer": return "The warden's note is on the reception desk. The list of names is in Room 204, on Ramu's desk.";

        case "cipher": return "The locked trunk is at the foot of the bed in Room 204. Notebook: " + whereIs("cipher") + ". Amma's postcard: " + whereIs("postcard") + ".";

        case "book": return "The bookcase is in the MESS HALL (ground floor hall), on the south wall. The warden's note about the book: " + whereIs("bookNote") + ".";

        case "fuse": return "The fuse box is in the little room on the terrace, beside the door. Electrician's cards: " + whereIs("card1") + " and " + whereIs("card2") + ".";

        case "radio": return "The old radio is on the reception desk. Station card: " + whereIs("stations") + ". Ramu's draft letter: " + whereIs("draft") + ".";

        case "keys": return "The key board hangs behind the reception desk. The warden's room lists: " + whereIs("k1") + " and " + whereIs("k2") + ".";

        case "rat": return "The rat hole is in the MESS HALL, on the north wall, near the floor. Something the rat likes is lying in " + whereIs("cheese") + ".";

        case "lever": return "The broken lever is on the back wall of the terrace room, left of the altar. The missing handle is lying in " + whereIs("handle") + ".";

        case "candles": return "The seven candles are on the altar in the terrace room. Ramu's diary pages: " + whereIs("d1") + ", " + whereIs("d2") + " and " + whereIs("d3") + ".";
    }

    return "";
}

// ------------------------------------------------------
// SPOILERS for the current game (also: hhSpoiler() in the console)
// ------------------------------------------------------
export function spoilers() {

    const c = theCase();

    const sw = c.fuse.sol.map((v, i) => v ? SW[i] : null).filter(Boolean);

    return [
        "SPOILERS - THIS GAME'S ANSWERS",
        "",
        "1 drawer  (reception)  code " + c.code + "   [204 + " + c.struck.length + " crossed-out names]",
        "2 cipher  (Room 204 trunk)  word " + c.word + "   [every letter one step back]",
        "3 book    (mess hall bookcase)  pull the " + c.book.color + " book",
        "4 fuse    (terrace box)  UP: " + sw.join(", ") + "  (all others DOWN), then Enter",
        "5 radio   (reception)  tune to " + c.radio.answer.toFixed(1) + " MHz   [Anna " + c.radio.anna.toFixed(1) + " + " + c.radio.plus + "]",
        "6 keys    (reception key board)  type " + c.keys.room + "   [" + ORD[c.keys.pos] + " room from the stairs]",
        "7 rat     (mess hall rat hole)  cheese is in " + whereIs("cheese") + "; stand at the hole and press E",
        "8 lever   (terrace back wall)  handle is in " + whereIs("handle") + "; press E at the lever twice (fit, then pull)",
        "9 candles (terrace altar)  order: " + c.candles.order.join(" > "),
        "+ back stairs: the iron key is in " + whereIs("gatekey") + "; unlock the cage gate (west side, behind the hostel), climb the spiral to the terrace",
        "+ ending: after the letter, the hidden door opens in the mess hall (north wall, middle); go through it and put the letter on Ramu's bed",
        "",
        "Notes: names " + whereIs("names") + ", notebook " + whereIs("cipher") + ", postcard " + whereIs("postcard") + ", book note " + whereIs("bookNote") + ",",
        "cards " + whereIs("card1") + " + " + whereIs("card2") + ", stations " + whereIs("stations") + ", draft " + whereIs("draft") + ",",
        "room lists " + whereIs("k1") + " + " + whereIs("k2") + ", diary " + whereIs("d1") + " + " + whereIs("d2") + " + " + whereIs("d3") + "."
    ].join("\n");
}

if (typeof window !== "undefined") {

    window.hhSpoiler = () => { const t = spoilers(); console.log(t); return t; };
}
