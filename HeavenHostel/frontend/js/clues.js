// ======================================================
// ALL THE WORDS OF THE STORY AND THE PUZZLES
//
//   (the notes in the rooms are in gen.js - they change every game)
//   CLUES    the 10 pages you earn by solving a puzzle
//   STORY    what is shown when chapter 1 ends
//   LETTER   Ramu's letter (the ending)
//
// Edit the texts here; nothing else needs to change.
// ======================================================

// (the notes that lie in the rooms are made fresh for every game: see gen.js)

// the warden's torn page on the reception desk
export const RECEPTION_NOTE = {
    id: "pz_warden_note",
    title: "Warden's private note (torn)",
    text: "THE DRAWER CODE HAS 4 NUMBERS:\n\n  the first 3 numbers = the room where Ramu died (it ended there)\n  the last number = how many names are CROSSED OUT on his desk\n\nThe desk is in the same room. I could not bear to scrub the names off.\n\nExample: if 2 names are crossed out, the code is the room number followed by 2."
};

// ------------------------------------------------------
// WHAT YOU GET FOR SOLVING A PUZZLE   (10 clues)
// ------------------------------------------------------
export const CLUES = {

    drawer: {
        title: "Clue 1 - Incident report",
        text: "HEAVEN HOSTEL - INCIDENT REPORT (from the warden's drawer)\n\n21 June. Resident RAMU K., age 19, of Kothapalli village.\nFound in the morning in ROOM 204, where it all began. He had taken his own life during the night.\nThe boys on his floor said nothing. The warden's name is on this report, and so is the shame.\n\nTwice he had asked to be moved to another hostel. Twice the request was refused. 'Boys will be boys.'\n\nFamily not yet informed. File closed."
    },
    cipher: {
        title: "Clue 2 - Ramu's diary",
        text: "RAMU'S DIARY (from the trunk in Room 204)\n\nWeek 1.  The city is loud. The food is good. Amma, I will make you proud.\n\nWeek 2.  They laugh at the way I speak, the way I look, the clothes my mother stitched. It follows me down every corridor. When the nights are loud I close my eyes and think of one word, the word I locked my trunk with: @WORD@.\n\nWeek 3.  It is worse. They hide my books. They knock on my door at night and run. When I came to the mess hall, the whole room went quiet and then laughed. I stopped eating there.\n\nThe only place that still feels like mine is the terrace. The phone catches a signal up there. I call Amma and say 'all is well'.\n\nTonight they locked the terrace door."
    },
    book: {
        title: "Clue 3 - Ramu's report card",
        text: "The bookcase shudders. A hollow behind the books. Inside: a school report card, folded small.\n\nRAMU K.  -  Class rank: FIRST.\nTeacher's note: 'The first in his village to reach a city college. Do not let him down.'\n\nOn the back, in pencil:\n'I must not fail. Amma sold her bangles for my fees.'"
    },
    fuse: {
        title: "Clue 4 - The terrace photograph",
        text: "The fuse box hums. For a moment the red bulb turns white and you see what is taped inside the terrace door: a photograph.\n\nA thin boy in a village-stitched shirt, alone on the roof at night, holding a phone up to the stars. On the back, in his handwriting:\n\n\"This is where I stand when I tell Amma I am fine.\"\n\nBelow it, in other handwriting, someone has scrawled: \"LOCK HIM OUT.\"\n\nStuck to the photo is a tag: \"Back stairs to the roof - key left in @GATEKEY@.\""
    },
    radio: {
        title: "Clue 5 - The voice on the radio",
        text: "At @FREQ@ the static clears. Under it, a boy's voice, very faint, speaking to someone who is not there:\n\n\"Amma... it's me. I am fine. The food is good here. Don't worry about the money.\n\nTell Nanna I will fix the roof when I come home for Dasara.\n\nKothapalli... the big tamarind tree by the bus stop... I can see it when I close my eyes.\"\n\nThen only static."
    },
    keys: {
        title: "Clue 6 - Gopal's confession",
        text: "From Gopal's room, behind the key board (Room @ROOM@):\n\n\"I never laughed, but I never stopped them either. That is the same thing.\n\nThe night before, Ramu gave me a promise to keep: 'If something happens to me, send my letter to Amma.' I said yes. Then I was too frightened of the others to ask where he put it.\n\nThe next morning I packed and left. I have not slept since.\n\nHe said he hid it somewhere only a lonely boy would think of: a place where he used to sit by himself and watch the gate.\n\n- Gopal\""
    },
    rat: {
        title: "Clue 7 - The unposted envelope",
        text: "The rat snatches the cheese and drags it into the hole. A loose brick falls out of the wall. Behind it: a torn envelope.\n\nAddressed in a boy's hand: 'Amma and Nanna, Kothapalli village, by the big tamarind tree.'\nIt was never posted. The stamp is still stuck on.\n\nThe envelope is empty. Whatever he wrote, he did not send it.\nSo the letter is still somewhere in this place."
    },
    lever: {
        title: "Clue 8 - The village shirt",
        text: "The handle fits. You pull. A panel in the wall slides open. Inside: a neatly folded shirt, hand-stitched, and a note pinned to it:\n\n\"Amma stitched this shirt. When I feel alone I wear it and think of home.\n\nIf I am gone, give it back to her, with my letter.\n\nI hid the letter in the place where I can watch the gate.\""
    },
    cellar: {
        title: "Clue 9 - The tin box",
        text: "The wheels line up. The lid of the little tin box springs open.\n\nInside, wrapped in a page torn from a school notebook, lies ONE thin glass bangle. The page says, in a child's careful handwriting:\n\n\"Amma's bangle. I bought it back with my tea money. The first one.\nTwenty-nine more to go. Then she will wear them all again.\"\n\nUnder the bangle, a coin, folded in a tiny paper boat. He saved for months. He never told anyone.\n\nThere is still only the last candle left, up on the terrace."
    },
    candles: {
        title: "Clue 10 - Ramu's last wish",
        text: "The seventh candle lights. A drawer slides out of the altar. Inside: a rusty blade, and a folded page in Ramu's hand.\n\n\"If you are reading this, please forgive what I did. I only wish somebody had asked me how I was.\n\nI have one wish left.\nI wrote a letter to Amma and Nanna. I hid it where I used to sit alone and watch the gate - the swing under the dead tree. I stitched it inside the seat so that nobody would find it and laugh.\n\nPlease take it to Kothapalli. If they read it, I can rest.\n\n- Ramu\"\n\n(You take the blade. The swing is in the yard behind the hostel.)"
    }
};

// ------------------------------------------------------
// CHAPTER 1 ENDS: THE STORY
// ------------------------------------------------------
export const STORY = [
    { img: "story_village.jpg", title: "RAMU", text: "RAMU.\n\nA boy from Kothapalli, a small village.\nThe first in his family to study in the city.\nHis mother stitched his shirts. His father sold a cow for his fees." },

    { img: "story_arrive.jpg", title: "JUNE", text: "He came to Heaven Hostel in June.\n\nThe first week was quiet. Then the others noticed how he spoke, how he looked, what he wore. In the second week, one boy laughed. The next day, another." },

    { img: "story_laugh.jpg", title: "THE LAUGHTER", text: "By the third week the whole hostel had joined in.\n\nThey gave him a name. They hid his books. They locked him out of the only place where he could call home.\n\nHe asked the warden twice to be moved. Twice he was told: 'Boys will be boys.'" },

    { img: "story_night.jpg", title: "ROOM 204", text: "On the night of the 21st of June, Ramu could bear it no more. He died in Room 204 - the room where it all started.\n\nNobody told his family the reason. Nobody went to the village." },

    { img: "story_ghost_walk.jpg", title: "THE CRYING", text: "After that, the crying began.\n\nA week later, boys started to go missing. One saw a thin figure in the corridor. Within a month the hostel was empty.\n\nHe is not here to hurt anyone.\nHe is here because something he promised his mother was never finished." },

    { img: "story_chapter2.jpg", title: "CHAPTER 2", text: "You have learned who he was.\n\nNow find out what he wants.\n\n(Chapter 2 - The Last Wish)" }

];

export const LETTER = {
    title: "Ramu's letter",
    text: "Amma, Nanna,\n\nI am writing this by the light of the terrace bulb. Forgive me for not coming home for Dasara.\n\nI told you the food was good. It was not, but you needed to hear it. I told you I had friends. I wanted it to be true.\n\nPlease do not blame yourselves. You did everything right. You gave me a name I was proud of, and a shirt your hands made.\n\nIf you ever see a boy who is alone and quiet, sit beside him. That is all I wanted.\n\nTell the tamarind tree I miss it.\n\nYour son,\nRamu"
};

export const REVEAL = [
    {
        img: "story_door.jpg",
        text: "The last candle burns with a steady flame.\n\nThen the whole hostel shudders. Far away, deep inside the walls, a heavy stone slides."
    },
    {
        img: "story_door.jpg",
        text: "Somewhere inside Heaven Hostel, a door that was never there has opened.\n\nThe air that comes out of it smells of old paper and damp earth.\n\nIt is in the old mess hall, on the ground floor: the north wall, opposite the bookcase.\n\nBut first Ramu's letter: it is still hidden where he used to sit alone."
    }
];

export const ENDING = [
    { img: "story_room.jpg", text: "You lay the letter on the narrow bed, on top of the shirt his mother stitched.\n\nThe bulb stops flickering. For the first time, the little room is quiet." },
    { img: "story_boy.jpg", text: "A thin boy sits up on the edge of the bed. He is not angry. He is not frightening.\nHe reads the first line, and his shoulders, tight for so many years, finally relax.\n\n'Thank you,' he says. 'Someone asked.'" },
    { img: "story_freed.jpg", text: "The walls of the room fade like breath on glass.\nYou are standing in the mess hall. The front door stands open, and for the first time since you came in, the hostel lets you go.\n\nBehind you, in a window on the second floor, a thin figure lifts a hand. Then the window is only a window." },
    { img: "story_village.jpg", title: "THE END", text: "Some days later, a bus stops at Kothapalli.\nUnder the tamarind tree, a woman opens a letter.\n\nTHE END\n\nThank you for playing Heaven Hostel." }
];
