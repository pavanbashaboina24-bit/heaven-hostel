"""Settings for the Heaven Hostel server.  Everything can be changed with environment
variables (on Render: Environment tab), so no secrets are written in the code."""
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# where the game files live (the frontend folder is served by this same server)
FRONTEND_DIR = os.environ.get("HH_FRONTEND_DIR", os.path.join(os.path.dirname(BASE_DIR), "frontend"))

# the SQLite database file.  On Render use a Disk and point this to it (e.g. /var/data/hostel.db),
# otherwise the file is reset every time the service restarts.
DATABASE = os.environ.get("HH_DATABASE", os.path.join(BASE_DIR, "hostel.db"))

# used to sign the login tokens.  SET YOUR OWN on the server!
SECRET_KEY = os.environ.get("HH_SECRET_KEY", "change-me-before-you-deploy")

# how long a login token stays valid (days)
TOKEN_DAYS = int(os.environ.get("HH_TOKEN_DAYS", "60"))

# websites that may call the API from another address (comma separated, * = all)
CORS_ORIGINS = os.environ.get("HH_CORS_ORIGINS", "*")

# the best a legitimate run can do: anything faster is rejected as a fake score (seconds)
MIN_SECONDS = int(os.environ.get("HH_MIN_SECONDS", "240"))

PORT = int(os.environ.get("PORT", "5000"))
