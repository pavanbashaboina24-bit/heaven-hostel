"""The leaderboard, simple statistics and the health check."""
from flask import Blueprint, current_app, g, jsonify, request

from database.connection import get_db
from routes.auth import login_required

bp = Blueprint("game", __name__, url_prefix="/api")


@bp.get("/health")
def health():
    return jsonify(ok=True, game="Heaven Hostel")


@bp.post("/game/score")
@login_required
def add_score():
    body = request.get_json(silent=True) or {}
    try:
        seconds = int(body.get("seconds", 0))
        deaths = int(body.get("deaths", 0))
    except (TypeError, ValueError):
        return jsonify(error="Bad numbers."), 400
    if seconds < current_app.config["MIN_SECONDS"] or seconds > 60 * 60 * 24 * 14:
        return jsonify(error="That time is not possible."), 400
    db = get_db()
    db.execute("INSERT INTO scores (player_id, seconds, deaths) VALUES (?, ?, ?)", (g.player["id"], seconds, max(0, deaths)))
    db.commit()
    rank = db.execute("SELECT COUNT(*) AS n FROM scores WHERE seconds < ?", (seconds,)).fetchone()["n"] + 1
    return jsonify(ok=True, rank=rank), 201


@bp.get("/game/leaderboard")
def leaderboard():
    """Fastest escapes: each player's best time, top 20."""
    rows = get_db().execute(
        "SELECT p.username, MIN(s.seconds) AS seconds, MIN(s.deaths) AS deaths "
        "FROM scores s JOIN players p ON p.id = s.player_id "
        "GROUP BY p.id ORDER BY seconds ASC LIMIT 20"
    ).fetchall()
    return jsonify(board=[{"rank": i + 1, "name": r["username"], "seconds": r["seconds"], "deaths": r["deaths"]} for i, r in enumerate(rows)])


@bp.get("/game/stats")
def stats():
    db = get_db()
    players = db.execute("SELECT COUNT(*) AS n FROM players").fetchone()["n"]
    wins = db.execute("SELECT COUNT(*) AS n FROM scores").fetchone()["n"]
    best = db.execute("SELECT MIN(seconds) AS s FROM scores").fetchone()["s"]
    return jsonify(players=players, escapes=wins, best_seconds=best)
