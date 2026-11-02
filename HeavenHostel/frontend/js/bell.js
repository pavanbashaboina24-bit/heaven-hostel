import { inventory } from "./inventory.js";

// ======================================================
// THE OLD BELL IS GONE  (it used to call the ghost and end the run)
// This file only takes the bell out of bags that were saved by older versions.
// ======================================================

try { inventory.items.delete("bell"); } catch (e) { /* nothing to remove */ }