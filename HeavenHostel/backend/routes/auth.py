"""Accounts: register, login, guest play and 'who am I'.  Tokens are signed, no sessions."""
import re

from flask import Blueprint, current_app, g, jsonify, request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash, generate_password_hash

from database.connection import get_db

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

NAME_RE = re.compile(r"^[A-Za-z0-9_ .-]{3,20}$")


def _serializer():
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt="hostel-login")


def make_token(player_id):
    return _serializer().dumps({"id": player_id})


def player_from_request():
    """Returns the player row for the 'Authorization: Bearer <token>' header, or None."""
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    try:
        data = _serializer().loads(header[7:], max_age=current_app.config["TOKEN_DAYS"] * 86400)
    except (BadSignature, SignatureExpired):
        return None
    return get_db().execute("SELECT * FROM players WHERE id = ?", (data.get("id"),)).fetchone()


def login_required(fn):
    from functools import wraps

    @wraps(fn)
    def wrapper(*args, **kwargs):
        player = player_from_request()
        if player is None:
            return jsonify(error="Please log in again."), 401
        g.player = player
        return fn(*args, **kwargs)

    return wrapper


def _reply(player):
    return jsonify(token=make_token(player["id"]), username=player["username"], guest=bool(player["is_guest"]))


@bp.post("/register")
def register():
    body = request.get_json(silent=True) or {}
    name = str(body.get("username", "")).strip()
    password = str(body.get("password", ""))
    if not NAME_RE.match(name):
        return jsonify(error="Name: 3-20 letters, numbers, space . _ -"), 400
    if len(password) < 6:
        return jsonify(error="Password: at least 6 characters."), 400
    db = get_db()
    if db.execute("SELECT 1 FROM players WHERE username = ?", (name,)).fetchone():
        return jsonify(error="That name is taken."), 409
    cur = db.execute("INSERT INTO players (username, pw_hash) VALUES (?, ?)", (name, generate_password_hash(password)))
    db.commit()
    player = db.execute("SELECT * FROM players WHERE id = ?", (cur.lastrowid,)).fetchone()
    return _reply(player), 201


@bp.post("/login")
def login():
    body = request.get_json(silent=True) or {}
    name = str(body.get("username", "")).strip()
    player = get_db().execute("SELECT * FROM players WHERE username = ? AND is_guest = 0", (name,)).fetchone()
    if not player or not check_password_hash(player["pw_hash"] or "", str(body.get("password", ""))):
        return jsonify(error="Wrong name or password."), 401
    return _reply(player)


@bp.post("/guest")
def guest():
    """Play without an account: a guest name (Guest-1234) is made for you."""
    import secrets

    db = get_db()
    name = str((request.get_json(silent=True) or {}).get("name", "")).strip()
    if not NAME_RE.match(name) or db.execute("SELECT 1 FROM players WHERE username = ?", (name,)).fetchone():
        name = "Guest-" + str(secrets.randbelow(9000) + 1000)
        while db.execute("SELECT 1 FROM players WHERE username = ?", (name,)).fetchone():
            name = "Guest-" + str(secrets.randbelow(900000) + 1000)
    cur = db.execute("INSERT INTO players (username, is_guest) VALUES (?, 1)", (name,))
    db.commit()
    player = db.execute("SELECT * FROM players WHERE id = ?", (cur.lastrowid,)).fetchone()
    return _reply(player), 201


@bp.get("/me")
@login_required
def me():
    p = g.player
    return jsonify(username=p["username"], guest=bool(p["is_guest"]), created=p["created_at"])
