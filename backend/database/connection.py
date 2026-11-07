"""A tiny SQLite helper: one connection per request, schema created on first start."""
import os
import sqlite3

from flask import current_app, g

SCHEMA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "schema.sql")


def get_db():
    if "db" not in g:
        path = current_app.config["DATABASE"]
        folder = os.path.dirname(path)
        if folder:
            os.makedirs(folder, exist_ok=True)
        g.db = sqlite3.connect(path)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def close_db(_exc=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = get_db()
    with open(SCHEMA, encoding="utf-8") as f:
        db.executescript(f.read())
    db.commit()


def init_app(app):
    app.teardown_appcontext(close_db)
    with app.app_context():
        init_db()
