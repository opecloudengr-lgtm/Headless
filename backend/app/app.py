import os
import time

from flask import Flask, jsonify, send_from_directory
from flask_login import LoginManager
from flask_cors import CORS
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError
from werkzeug.middleware.proxy_fix import ProxyFix

from models import (
    Category,
    MediaItem,
    User,
    db,
)

from routes import api_bp


# -------------------------------------------------------------------
# Flask Application
# -------------------------------------------------------------------

BASE_DIR = os.path.abspath(
    os.path.dirname(__file__)
)

# The React frontend is built and copied here at container-build time
# (see the Dockerfile). When it isn't present (e.g. running the API
# alone during development) Flask simply has no static frontend to serve.
FRONTEND_DIST = os.environ.get(
    "FRONTEND_DIST",
    os.path.join(BASE_DIR, "static_frontend"),
)

# static_folder is disabled here on purpose: with static_url_path="" Flask
# auto-registers its own static handler on the exact same "/<path:...>"
# rule used below for SPA fallback routing, and — since that implicit
# route is registered first, during Flask() construction — it wins the
# match and 404s outright on any client-side route (e.g. a hard refresh
# on /login or /media/1) instead of ever reaching serve_frontend().
app = Flask(__name__, static_folder=None)

# Railway (like Heroku/nginx) terminates TLS at its edge and forwards
# plain HTTP to the container, so without this Flask sees every
# request as insecure/wrong-host regardless of what the browser
# actually connected over.
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

app.config["SECRET_KEY"] = os.environ.get(
    "SECRET_KEY",
    "production-api-token-validation-key",
)

# ---------------------------------------------------------------
# Persistent data directory
#
# Railway's container filesystem is ephemeral across deploys, so the
# SQLite database and uploaded media files should live on a mounted
# Railway Volume. Point DATA_DIR at that volume's mount path in
# production (e.g. "/data"); it defaults to the project folder for
# local development.
# ---------------------------------------------------------------

DATA_DIR = os.environ.get("DATA_DIR", BASE_DIR)
os.makedirs(DATA_DIR, exist_ok=True)

database_url = os.environ.get("DATABASE_URL")

if database_url:
    # Railway/Heroku-style Postgres URLs use the "postgres://" scheme,
    # which SQLAlchemy 2.x no longer accepts.
    if database_url.startswith("postgres://"):
        database_url = database_url.replace(
            "postgres://", "postgresql://", 1
        )
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
else:
    app.config["SQLALCHEMY_DATABASE_URI"] = (
        "sqlite:///" + os.path.join(DATA_DIR, "headless_media.db")
    )

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False


# -------------------------------------------------------------------
# Upload Configuration
# -------------------------------------------------------------------

UPLOAD_FOLDER = os.environ.get(
    "UPLOAD_FOLDER",
    os.path.join(DATA_DIR, "uploads"),
)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

app.config["MAX_CONTENT_LENGTH"] = int(
    os.environ.get("MAX_CONTENT_LENGTH", 150 * 1024 * 1024)
)

# ---------------------------------------------------------------
# Demo mode
#
# The project has no email/SMS provider wired up, so OTPs are always
# printed to the server log. When DEMO_MODE is on (the default) the
# OTP is *also* echoed back in the JSON response so the deployed app
# is usable end-to-end from the browser without server log access.
# Turn this off once a real OTP delivery channel is added.
# ---------------------------------------------------------------

app.config["DEMO_MODE"] = os.environ.get(
    "DEMO_MODE", "true"
).lower() != "false"

# ---------------------------------------------------------------
# Session cookie
#
# Local dev runs Flask over plain HTTP, so a Secure-only cookie would
# silently never be sent and every login would appear to fail. Guard
# with FLASK_DEBUG (which is only ever set locally) rather than trying
# to detect "is this Railway" from a specific env var — Railway's own
# variables aren't guaranteed to be named consistently across
# platform versions, and defaulting to *not* Secure in production is
# the wrong failure mode (a cookie the browser then refuses to send
# back is exactly the "logged in, but nothing after that recognizes
# it" symptom this is fixing).
#
# If CORS_ORIGINS is set, the frontend is on a different origin than
# this API (e.g. deployed as two separate Railway services), so the
# cookie must be SameSite=None to be sent on those cross-origin
# fetches at all — SameSite=Lax is silently dropped by the browser on
# cross-site XHR/fetch, which looks identical to "login doesn't
# stick" from the frontend's point of view.
# ---------------------------------------------------------------

is_local_dev = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
cors_origins = os.environ.get("CORS_ORIGINS", "")
is_cross_origin = bool(cors_origins.strip())

app.config.update(
    SESSION_COOKIE_SAMESITE="None" if is_cross_origin else "Lax",
    SESSION_COOKIE_SECURE=not is_local_dev,
)


# -------------------------------------------------------------------
# Initialize Database
# -------------------------------------------------------------------

db.init_app(app)


# -------------------------------------------------------------------
# CORS (only relevant when the frontend is hosted on a different
# origin than the API, e.g. local Vite dev server on another port,
# or the frontend and backend deployed as two separate services)
# -------------------------------------------------------------------

if is_cross_origin:
    CORS(
        app,
        supports_credentials=True,
        origins=[o.strip() for o in cors_origins.split(",") if o.strip()],
    )


# -------------------------------------------------------------------
# Initialize Flask-Login
# -------------------------------------------------------------------

login_manager = LoginManager()

login_manager.init_app(app)


@login_manager.user_loader
def load_user(user_id):

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return None

    return db.session.get(
        User,
        user_id,
    )


@login_manager.unauthorized_handler
def unauthorized():

    return (
        jsonify(
            {
                "error": (
                    "Authentication required."
                )
            }
        ),
        401,
    )


# -------------------------------------------------------------------
# Register API Blueprint
# -------------------------------------------------------------------

app.register_blueprint(
    api_bp,
    url_prefix="/api",
)


# -------------------------------------------------------------------
# Health Check
# -------------------------------------------------------------------

@app.route("/api/health")
def health():

    return jsonify(
        {
            "application": "Headless Media API",
            "version": "1.0.0",
            "status": "running",
        }
    )


# -------------------------------------------------------------------
# Frontend (React SPA) Serving
#
# Every non-API route falls through to the built frontend's
# index.html so client-side routing (react-router) works on a
# hard refresh or direct link.
# -------------------------------------------------------------------

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):

    if path and os.path.isfile(os.path.join(FRONTEND_DIST, path)):
        return send_from_directory(FRONTEND_DIST, path)

    index_path = os.path.join(FRONTEND_DIST, "index.html")

    if os.path.isfile(index_path):
        return send_from_directory(FRONTEND_DIST, "index.html")

    return jsonify(
        {
            "application": "Headless Media API",
            "version": "1.0.0",
            "status": "running",
            "note": "Frontend build not found; API is available under /api.",
        }
    )


# -------------------------------------------------------------------
# Database Seeder
# -------------------------------------------------------------------

@app.cli.command("seed")
def seed_database():

    print("Creating fresh database...")

    db.drop_all()
    db.create_all()

    # ---------------------------------------------------------------
    # Categories
    # ---------------------------------------------------------------

    movie_category = Category(
        name="Movie",
        description="Movies and videos",
    )

    music_category = Category(
        name="Music",
        description="Music files",
    )

    ebook_category = Category(
        name="Ebook",
        description="Digital books",
    )

    db.session.add_all(
        [
            movie_category,
            music_category,
            ebook_category,
        ]
    )

    db.session.commit()

    print("Categories created.")

    # ---------------------------------------------------------------
    # Demo users
    # ---------------------------------------------------------------

    alice = User(
        username="Alice_Director",
        email="alice@media.com",
        is_admin=False,
        status="active",
    )

    alice.set_password(
        "password123"
    )

    bob = User(
        username="Bob_Musician",
        email="bob@media.com",
        is_admin=False,
        status="active",
    )

    bob.set_password(
        "password123"
    )

    admin = User(
        username="System_Admin",
        email="admin@media.com",
        is_admin=True,
        status="active",
    )

    admin.set_password(
        "adminpass"
    )

    db.session.add_all(
        [
            alice,
            bob,
            admin,
        ]
    )

    db.session.commit()

    print("Demo users created.")

    # ---------------------------------------------------------------
    # Follow relationships
    # ---------------------------------------------------------------

    alice.followed_creators.append(
        bob
    )

    bob.followed_creators.append(
        alice
    )

    db.session.commit()

    # ---------------------------------------------------------------
    # Demo media
    # ---------------------------------------------------------------

    demo_media = [

        MediaItem(
            title="Summer Lo-Fi Instrumental",
            description="Relaxing music.",
            file_path="Music/sample_lofi.mp3",
            uploader_id=bob.id,
            category_id=music_category.id,
            is_featured=False,
        ),

        MediaItem(
            title="Cyberpunk 2088",
            description="Indie sci-fi movie.",
            file_path="Movie/sample_movie.mp4",
            uploader_id=alice.id,
            category_id=movie_category.id,
            is_featured=True,
        ),

        MediaItem(
            title="Flask Backend Guide",
            description="REST API ebook.",
            file_path="Ebook/sample_guide.pdf",
            uploader_id=admin.id,
            category_id=ebook_category.id,
            is_featured=False,
        ),
    ]

    db.session.add_all(
        demo_media
    )

    db.session.commit()

    print(
        "Database seeded successfully."
    )


# -------------------------------------------------------------------
# Create Required Directories and Database
# -------------------------------------------------------------------

with app.app_context():

    os.makedirs(
        app.config["UPLOAD_FOLDER"],
        exist_ok=True,
    )

    for folder in (
        "Movie",
        "Music",
        "Ebook",
    ):

        os.makedirs(
            os.path.join(
                app.config["UPLOAD_FOLDER"],
                folder,
            ),
            exist_ok=True,
        )

    # Create tables if they do not exist.
    #
    # IMPORTANT:
    # This does NOT delete existing data.
    # Use `flask --app app seed` when you
    # intentionally want a fresh seeded database.
    #
    # create_all() checks for each table's existence and then issues
    # its CREATE TABLE — two gunicorn workers booting at the same time
    # against a brand-new database can both pass the "does it exist"
    # check for the same table before either has created it, and the
    # loser's CREATE TABLE then fails outright. Retrying after a short
    # pause lets the winner finish first, so create_all()'s own
    # existence check then correctly skips what's already there.
    for attempt in range(5):
        try:
            db.create_all()
            break
        except Exception as exc:
            db.session.rollback()
            if attempt == 4:
                raise
            print(f"create_all() hit a concurrent-worker race, retrying: {exc}")
            time.sleep(0.2 * (attempt + 1))

    # db.create_all() only creates missing tables — it never alters a
    # table that already exists from a previous deploy. This project
    # has no migration framework wired up, so a column added to an
    # existing model (like MediaItem.is_hidden) has to be patched onto
    # a live database by hand here, or every query touching it 500s
    # with "no such column" the moment this code reaches a database
    # that predates the column.
    inspector = inspect(db.engine)

    if "media_items" in inspector.get_table_names():
        existing_columns = {
            col["name"] for col in inspector.get_columns("media_items")
        }

        if "is_hidden" not in existing_columns:
            try:
                db.session.execute(text(
                    "ALTER TABLE media_items "
                    "ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT false"
                ))
                db.session.commit()
                print("Migrated media_items: added is_hidden column.")
            except Exception as exc:
                db.session.rollback()
                print(f"Could not add is_hidden to media_items: {exc}")

    # Create default categories if the database has no categories yet.
    #
    # Guarded with a try/except: gunicorn boots multiple worker
    # processes, each importing this module and running this same
    # startup block concurrently. Two workers can both see an empty
    # table and race to insert, so the loser's insert is caught and
    # discarded rather than crashing that worker.
    if Category.query.count() == 0:

        db.session.add_all(
            [
                Category(
                    name="Movie",
                    description="Movies and videos",
                ),

                Category(
                    name="Music",
                    description="Music files",
                ),

                Category(
                    name="Ebook",
                    description="Digital books",
                ),
            ]
        )

        try:
            db.session.commit()
            print(
                "Default categories created."
            )
        except IntegrityError:
            db.session.rollback()

    # Create the admin account if it does
    # not already exist. Credentials are configurable via env vars
    # so a real deployment doesn't ship with a known default password.
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@media.com")
    admin_username = os.environ.get("ADMIN_USERNAME", "System_Admin")
    admin_password = os.environ.get("ADMIN_PASSWORD", "adminpass")

    admin = User.query.filter_by(
        email=admin_email
    ).first()

    if admin is None:

        admin = User(
            username=admin_username,
            email=admin_email,
            is_admin=True,
            status="active",
        )

        admin.set_password(
            admin_password
        )

        db.session.add(admin)

        try:
            db.session.commit()
            print(
                f"Admin account created ({admin_email})."
            )
        except IntegrityError:
            db.session.rollback()


# -------------------------------------------------------------------
# Run Server
# -------------------------------------------------------------------

if __name__ == "__main__":

    app.run(
        debug=os.environ.get("FLASK_DEBUG", "true").lower() == "true",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
    )