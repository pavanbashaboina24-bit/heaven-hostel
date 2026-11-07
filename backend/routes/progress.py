"""Cloud save: the game stores its flags and items here so you can continue on another device."""
import json

from flask import Blueprint, g, jsonify, request

from database.connection import get_db
from routes.auth import login_required

bp = Blueprint("progress", __name__, url_prefix="/api/progress")

MAX_BYTES = 64 * 1024


@bp.get("")
@login_required
def load():
    row = get_db().execute("SELECT data, puzzles, updated_at FROM progress WHERE player_id = ?", (g.player["id"],)).fetchone()
    if not row:
        return jsonify(data=None)
    return jsonify(data=json.loads(row["data"]), puzzles=row["puzzles"], updated=row["updated_at"])


@bp.put("")
@login_required
def save():
    raw = request.get_data()
    if len(raw) > MAX_BYTES:
        return jsonify(error="Save is too big."), 413
    body = request.get_json(silent=True) or {}
    data = body.get("data")
    if not isinstance(data, dict):
        return jsonify(error="Send {data: {...}}"), 400
    puzzles = max(0, min(9, int(body.get("puzzles", 0) or 0)))
    db = get_db()
    db.execute(
        "INSERT INTO progress (player_id, data, puzzles, updated_at) VALUES (?, ?, ?, datetime('now')) "
        "ON CONFLICT(player_id) DO UPDATE SET data = excluded.data, puzzles = excluded.puzzles, updated_at = excluded.updated_at",
        (g.player["id"], json.dumps(data), puzzles),
    )
    db.commit()
    return jsonify(ok=True)


@bp.delete("")
@login_required
def wipe():
    db = get_db()
    db.execute("DELETE FROM progress WHERE player_id = ?", (g.player["id"],))
    db.commit()
    return jsonify(ok=True)
