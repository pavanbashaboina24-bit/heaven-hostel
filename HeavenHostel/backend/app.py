"""Heaven Hostel server:  python app.py   (or:  gunicorn app:app)

  /            the game (the ../frontend folder)
  /api/...     accounts, cloud save, leaderboard

Run it on your computer:   pip install -r requirements.txt   then   python app.py
Then open  http://localhost:5000
"""
import os
import sys

from flask import Flask, jsonify, send_from_directory

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import config  # noqa: E402
from database import connection  # noqa: E402
from routes import auth, game, progress  # noqa: E402


def create_app():
    app = Flask(__name__, static_folder=None)
    app.config.update(
        DATABASE=config.DATABASE,
        SECRET_KEY=config.SECRET_KEY,
        TOKEN_DAYS=config.TOKEN_DAYS,
        MIN_SECONDS=config.MIN_SECONDS,
        MAX_CONTENT_LENGTH=256 * 1024,
    )
    connection.init_app(app)
    for module in (auth, progress, game):
        app.register_blueprint(module.bp)

    @app.after_request
    def headers(resp):
        resp.headers["Access-Control-Allow-Origin"] = config.CORS_ORIGINS
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        if not resp.headers.get("Cache-Control"):
            resp.headers["Cache-Control"] = "no-cache"
        return resp

    @app.route("/api/<path:_any>", methods=["OPTIONS"])
    def preflight(_any):
        return ("", 204)

    @app.errorhandler(404)
    def not_found(_e):
        return jsonify(error="Not found"), 404

    @app.route("/")
    def index():
        return send_from_directory(config.FRONTEND_DIR, "index.html")

    @app.route("/<path:path>")
    def files(path):
        return send_from_directory(config.FRONTEND_DIR, path)

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=config.PORT, debug=os.environ.get("HH_DEBUG") == "1")
