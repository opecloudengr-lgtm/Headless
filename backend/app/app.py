import os

from flask import Flask, jsonify, send_from_directory
from flask_login import LoginManager
from flask_cors import CORS
from sqlalchemy.exc import IntegrityError

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

app = Flask(
    __name__,
    static_folder=FRONTEND_DIST,
    static_url_path="",
)

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

app.config.update(
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("RAILWAY_ENVIRONMENT") is not None,
)


# -------------------------------------------------------------------
# Initialize Database
# -------------------------------------------------------------------

db.init_app(app)


# -------------------------------------------------------------------
# CORS (only relevant when the frontend is hosted on a different
# origin than the API, e.g. local Vite dev server on another port)
# -------------------------------------------------------------------

cors_origins = os.environ.get("CORS_ORIGINS", "")

if cors_origins:
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

    if path and os.path.exists(os.path.join(app.static_folder or "", path)):
        return send_from_directory(app.static_folder, path)

    index_path = os.path.join(app.static_folder or "", "index.html")

    if os.path.isfile(index_path):
        return send_from_directory(app.static_folder, "index.html")

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
    db.create_all()

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