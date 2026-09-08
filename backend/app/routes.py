import os
import re
from datetime import datetime, timezone, timedelta

from flask import Blueprint, Response, current_app, jsonify, request, session
from flask_login import current_user, login_required, login_user, logout_user
from sqlalchemy import func, or_
from werkzeug.utils import secure_filename

from models import (
    Category,
    Comment,
    MediaItem,
    Post,
    Report,
    SavedItem,
    User,
    db,
)


api_bp = Blueprint("api", __name__)


ALLOWED_EXTENSIONS = {
    "Music": {"mp3", "wav", "m4a"},
    "Ebook": {"pdf", "epub"},
    "Movie": {"mp4", "mkv", "avi"},
}


def allowed_file(filename, category_name):
    if not filename or "." not in filename:
        return False

    extension = filename.rsplit(".", 1)[1].lower()

    return extension in ALLOWED_EXTENSIONS.get(
        category_name,
        set(),
    )


def is_saved_by_current_user(item_type, item_id):
    if not current_user.is_authenticated:
        return False

    return db.session.execute(
        db.select(SavedItem.id).where(
            SavedItem.user_id == current_user.id,
            SavedItem.item_type == item_type,
            SavedItem.item_id == item_id,
        )
    ).scalar_one_or_none() is not None


def serialize_item(item):
    """
    MediaItem.to_dict() plus viewer-specific state (like/save), which
    depends on the request's logged-in user and so can't live on the
    model itself.
    """
    data = item.to_dict()

    data["liked_by_me"] = bool(
        current_user.is_authenticated
        and any(u.id == current_user.id for u in item.liked_by)
    )

    data["saved_by_me"] = is_saved_by_current_user("media", item.id)

    return data


def serialize_post(post):
    data = post.to_dict()

    data["liked_by_me"] = bool(
        current_user.is_authenticated
        and any(u.id == current_user.id for u in post.liked_by)
    )

    data["saved_by_me"] = is_saved_by_current_user("post", post.id)

    return data


def serialize_comment(comment):
    return comment.to_dict()


TAG_MENTION_PATTERN = re.compile(r"@([A-Za-z0-9_.]{3,50})")


def resolve_tagged_users(usernames):
    """
    Look up existing users by username, silently dropping anything
    that doesn't resolve to a real account. Used for both explicit
    tag lists (upload form, post composer) and @mentions parsed out
    of free text.
    """
    cleaned = {u.strip().lstrip("@") for u in usernames if u and u.strip()}

    if not cleaned:
        return []

    return db.session.execute(
        db.select(User).where(User.username.in_(cleaned))
    ).scalars().all()


# -------------------------------------------------------------------
# CATEGORY ROUTE
# -------------------------------------------------------------------

@api_bp.route("/categories", methods=["GET"])
def list_categories():
    categories = db.session.execute(
        db.select(Category).order_by(Category.id.asc())
    ).scalars().all()

    return jsonify({
        "categories": [
            {
                "id": category.id,
                "name": category.name,
                "description": category.description,
            }
            for category in categories
        ]
    }), 200


# -------------------------------------------------------------------
# PUBLIC EXPLORE
# -------------------------------------------------------------------

@api_bp.route("/explore", methods=["GET"])
def explore():
    category_filter = request.args.get("category")
    search_query = request.args.get("q")

    stmt = db.select(MediaItem).where(MediaItem.is_hidden.is_(False))

    if category_filter:
        stmt = (
            stmt.join(Category)
            .where(Category.name.ilike(category_filter))
        )

    if search_query:
        search_pattern = f"%{search_query}%"

        stmt = stmt.where(
            or_(
                MediaItem.title.ilike(search_pattern),
                MediaItem.description.ilike(search_pattern),
            )
        )

    stmt = stmt.order_by(MediaItem.uploaded_at.desc())

    items = db.session.execute(stmt).scalars().all()

    featured_items = db.session.execute(
        db.select(MediaItem)
        .where(MediaItem.is_featured.is_(True), MediaItem.is_hidden.is_(False))
        .order_by(MediaItem.uploaded_at.desc())
        .limit(5)
    ).scalars().all()

    return jsonify({
        "featured_spotlight": [
            serialize_item(item)
            for item in featured_items
        ],
        "catalog_results": [
            serialize_item(item)
            for item in items
        ],
    }), 200


# -------------------------------------------------------------------
# MEDIA STREAM
# -------------------------------------------------------------------

@api_bp.route("/media/<int:item_id>/stream", methods=["GET"])
def stream_media(item_id):
    item = db.session.get(MediaItem, item_id)

    if item is None:
        return jsonify({
            "error": "Media item not found."
        }), 404

    is_owner_or_admin = current_user.is_authenticated and (
        current_user.id == item.uploader_id or current_user.is_admin
    )

    if item.is_hidden and not is_owner_or_admin:
        return jsonify({
            "error": "Media item not found."
        }), 404

    full_file_path = os.path.abspath(
        os.path.join(
            current_app.config["UPLOAD_FOLDER"],
            item.file_path,
        )
    )

    if not os.path.isfile(full_file_path):
        return jsonify({
            "error": "Media file asset missing on server disk."
        }), 404

    is_guest = not current_user.is_authenticated

    if item.category and item.category.name == "Ebook" and is_guest:
        return jsonify({
            "error": (
                "Access denied. Login required "
                "to read full E-books."
            )
        }), 403

    mimetypes = {
        "Music": "audio/mpeg",
        "Movie": "video/mp4",
        "Ebook": "application/pdf",
    }

    mimetype = mimetypes.get(
        item.category.name if item.category else "",
        "application/octet-stream",
    )

    file_size = os.path.getsize(full_file_path)

    if file_size == 0:
        return jsonify({
            "error": "The requested asset is empty."
        }), 404

    guest_limit = 350 * 1024

    effective_file_size = (
        min(file_size, guest_limit)
        if is_guest
        else file_size
    )

    range_header = request.headers.get("Range")

    start_byte = 0
    end_byte = effective_file_size - 1
    is_range_request = False

    if range_header:
        match = re.fullmatch(
            r"bytes=(\d+)-(\d*)",
            range_header.strip(),
        )

        if not match:
            return jsonify({
                "error": "Invalid Range header."
            }), 416

        is_range_request = True

        start_byte = int(match.group(1))

        if match.group(2):
            end_byte = int(match.group(2))

    if start_byte >= effective_file_size:
        return jsonify({
            "error": "Requested byte range is not satisfiable."
        }), 416

    if end_byte >= effective_file_size:
        end_byte = effective_file_size - 1

    if end_byte < start_byte:
        return jsonify({
            "error": "Invalid byte range."
        }), 416

    length_to_send = end_byte - start_byte + 1

    def generate_range_chunks(start, length):
        chunk_size = 8192
        bytes_remaining = length

        with open(full_file_path, "rb") as file_handle:
            file_handle.seek(start)

            while bytes_remaining > 0:
                chunk = file_handle.read(
                    min(chunk_size, bytes_remaining)
                )

                if not chunk:
                    break

                yield chunk
                bytes_remaining -= len(chunk)

    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(length_to_send),
    }

    status_code = 206 if is_range_request else 200

    if is_range_request:
        headers["Content-Range"] = (
            f"bytes {start_byte}-{end_byte}/{effective_file_size}"
        )

    return Response(
        generate_range_chunks(
            start_byte,
            length_to_send,
        ),
        status=status_code,
        mimetype=mimetype,
        headers=headers,
    )


# --------------------------------------------------------------# AUTHENTICATION
# -------------------------------------------------------------------

# Simple-project authentication limits.
MAX_LOGIN_ATTEMPTS = 3
LOGIN_LOCK_MINUTES = 10


def normalize_email(value):
    """Normalize an email for consistent comparisons."""
    return str(value or "").strip().lower()


def normalize_username(value):
    """Normalize a username for case-insensitive comparisons."""
    return str(value or "").strip()


def valid_email(email):
    """Basic email validation suitable for this simple project."""
    return bool(
        re.fullmatch(
            r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}",
            email,
        )
    )


def valid_username(username):
    """
    Username rules:
    - 3 to 50 characters
    - letters, numbers, underscore and dot only
    """
    return bool(
        re.fullmatch(
            r"[A-Za-z0-9_.]{3,50}",
            username,
        )
    )


def demo_otp_payload(otp_code):
    """
    No email/SMS provider is configured for this project, so the OTP
    is always printed to the server log. When DEMO_MODE is enabled
    (the default — see app.py) it is also included in the JSON
    response so the deployed app is usable from the browser alone.
    """
    if current_app.config.get("DEMO_MODE"):
        return {"demo_otp_code": otp_code}
    return {}


def login_lock_active():
    """Return True while this browser session is temporarily locked."""
    locked_until = session.get("login_locked_until")

    if not locked_until:
        return False

    try:
        locked_time = datetime.fromisoformat(locked_until)
    except (TypeError, ValueError):
        session.pop("login_locked_until", None)
        session.pop("login_failed_attempts", None)
        return False

    if datetime.now(timezone.utc) >= locked_time:
        session.pop("login_locked_until", None)
        session.pop("login_failed_attempts", None)
        return False

    return True


def register_login_failure():
    """Count a failed username/password login in this browser session."""
    attempts = int(
        session.get("login_failed_attempts", 0)
    ) + 1

    session["login_failed_attempts"] = attempts

    if attempts >= MAX_LOGIN_ATTEMPTS:
        locked_until = (
            datetime.now(timezone.utc)
            + timedelta(minutes=LOGIN_LOCK_MINUTES)
        )

        session["login_locked_until"] = (
            locked_until.isoformat()
        )


def clear_login_failures():
    """Reset failed-login tracking after successful credentials."""
    session.pop("login_failed_attempts", None)
    session.pop("login_locked_until", None)


@api_bp.route("/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}

    username = normalize_username(
        data.get("username", "")
    )

    email = normalize_email(
        data.get("email", "")
    )

    password = str(
        data.get("password", "")
    )

    # -----------------------------
    # Registration validation
    # -----------------------------

    if not username or not email or not password:
        return jsonify({
            "error": (
                "Username, email and password "
                "are required."
            )
        }), 400

    if not valid_username(username):
        return jsonify({
            "error": (
                "Username must be 3-50 characters "
                "and may contain only letters, "
                "numbers, underscores and dots."
            )
        }), 400

    if not valid_email(email):
        return jsonify({
            "error": "Please provide a valid email address."
        }), 400

    if len(password) < 6:
        return jsonify({
            "error": (
                "Password must be at least "
                "6 characters long."
            )
        }), 400

    # -----------------------------
    # Case-insensitive duplicate check
    # -----------------------------

    existing = db.session.execute(
        db.select(User).where(
            or_(
                func.lower(User.username)
                == username.lower(),
                func.lower(User.email)
                == email,
            )
        )
    ).scalar_one_or_none()

    if existing:
        return jsonify({
            "error": (
                "Username or email is "
                "already registered."
            )
        }), 409

    # -----------------------------
    # Create account
    # -----------------------------

    new_user = User(
        username=username,
        email=email,
    )

    new_user.set_password(password)

    # Registration automatically requests OTP.
    new_user.generate_otp()

    db.session.add(new_user)
    db.session.commit()

    # For this simple project, the OTP is printed
    # in the Flask terminal instead of being emailed.
    print(
        f"[REGISTRATION OTP] Email: "
        f"{new_user.email} | "
        f"Code: {new_user.otp_code}"
    )

    return jsonify({
        "success": (
            "Account registered successfully. "
            "An OTP has been requested automatically."
        ),
        "user_id": new_user.id,
        "email": new_user.email,
        "otp_requested": True,
        "message": (
            "Check the Flask terminal for the OTP, "
            "then use POST /api/auth/verify-otp."
        ),
        **demo_otp_payload(new_user.otp_code),
    }), 201


@api_bp.route("/auth/login", methods=["POST"])
def login():
    """
    Password login is the first authentication step.

    Accepted JSON:
    {
        "identifier": "john",
        "password": "123456"
    }

    The identifier can be either username or email.

    A correct password automatically generates an OTP.
    The user is not logged in until the OTP is verified.
    """

    if login_lock_active():
        return jsonify({
            "error": (
                "Too many failed login attempts. "
                f"Try again in {LOGIN_LOCK_MINUTES} minutes."
            )
        }), 429

    data = request.get_json(silent=True) or {}

    identifier = str(
        data.get(
            "identifier",
            data.get(
                "username",
                data.get("email", "")
            ),
        )
    ).strip()

    password = str(
        data.get("password", "")
    )

    if not identifier or not password:
        return jsonify({
            "error": (
                "Username/email and password "
                "are required."
            )
        }), 400

    # -----------------------------
    # Case-insensitive username/email lookup
    # -----------------------------

    user = db.session.execute(
        db.select(User).where(
            or_(
                func.lower(User.username)
                == identifier.lower(),
                func.lower(User.email)
                == identifier.lower(),
            )
        )
    ).scalar_one_or_none()

    # Do not reveal whether the username/email exists.
    if user is None or not user.check_password(password):
        register_login_failure()

        attempts = int(
            session.get("login_failed_attempts", 0)
        )

        if attempts >= MAX_LOGIN_ATTEMPTS:
            return jsonify({
                "error": (
                    "Too many failed login attempts. "
                    f"Login is locked for "
                    f"{LOGIN_LOCK_MINUTES} minutes."
                )
            }), 429

        remaining = MAX_LOGIN_ATTEMPTS - attempts

        return jsonify({
            "error": "Invalid username/email or password.",
            "attempts_remaining": remaining,
        }), 401

    if user.status == "suspended":
        return jsonify({
            "error": "Account suspended."
        }), 403

    # Correct password: reset password-attempt counter.
    clear_login_failures()

    # Automatically request OTP after successful password.
    user.generate_otp()

    db.session.commit()

    print(
        f"[LOGIN OTP] Email: {user.email} | "
        f"Code: {user.otp_code}"
    )

    return jsonify({
        "success": (
            "Password accepted. "
            "OTP generated successfully."
        ),
        "email": user.email,
        "otp_required": True,
        "message": (
            "Check the Flask terminal for the OTP, "
            "then use POST /api/auth/verify-otp."
        ),
        **demo_otp_payload(user.otp_code),
    }), 200


@api_bp.route("/auth/request-otp", methods=["POST"])
def request_otp():
    """
    Manually request/resend an OTP.

    This remains available for:
    - a newly registered user
    - a user whose OTP expired
    - a user who used all 3 OTP attempts
    - a user who wants another OTP
    """

    data = request.get_json(silent=True) or {}

    email = normalize_email(
        data.get("email", "")
    )

    if not email:
        return jsonify({
            "error": "Email is required."
        }), 400

    if not valid_email(email):
        return jsonify({
            "error": "Please provide a valid email address."
        }), 400

    user = db.session.execute(
        db.select(User).where(
            func.lower(User.email) == email
        )
    ).scalar_one_or_none()

    if user is None:
        # Avoid exposing whether an email exists.
        return jsonify({
            "success": (
                "If the account exists, "
                "an OTP has been generated."
            )
        }), 200

    if user.status == "suspended":
        return jsonify({
            "error": "Account suspended."
        }), 403

    user.generate_otp()

    db.session.commit()

    print(
        f"[OTP] Email: {user.email} | "
        f"Code: {user.otp_code}"
    )

    return jsonify({
        "success": (
            "OTP generated successfully. "
            "Check the Flask terminal."
        ),
        **demo_otp_payload(user.otp_code),
    }), 200


@api_bp.route("/auth/verify-otp", methods=["POST"])
def verify_otp():
    data = request.get_json(silent=True) or {}

    email = normalize_email(
        data.get("email", "")
    )

    otp_code = str(
        data.get("otp_code", "")
    ).strip()

    if not email or not otp_code:
        return jsonify({
            "error": "Email and OTP are required."
        }), 400

    if not valid_email(email):
        return jsonify({
            "error": "Please provide a valid email address."
        }), 400

    if not re.fullmatch(r"\d{6}", otp_code):
        return jsonify({
            "error": "OTP must be a 6-digit number."
        }), 400

    user = db.session.execute(
        db.select(User).where(
            func.lower(User.email) == email
        )
    ).scalar_one_or_none()

    if user is None or user.otp_code is None:
        return jsonify({
            "error": "Invalid OTP request."
        }), 400

    if user.status == "suspended":
        return jsonify({
            "error": "Account suspended."
        }), 403

    # Maximum 3 wrong OTP attempts.
    if user.otp_failed_attempts >= 3:
        user.clear_otp()
        db.session.commit()

        return jsonify({
            "error": (
                "Too many failed OTP attempts. "
                "Request a new OTP."
            )
        }), 429

    # Check OTP expiration.
    if (
        user.otp_expires_at is None
        or datetime.now(timezone.utc)
        > user.otp_expires_at.replace(
            tzinfo=timezone.utc
        )
    ):
        user.clear_otp()
        db.session.commit()

        return jsonify({
            "error": (
                "OTP expired. "
                "Request a new OTP."
            )
        }), 400

    # Check OTP.
    if user.otp_code != otp_code:
        user.otp_failed_attempts += 1

        attempts_used = user.otp_failed_attempts
        attempts_remaining = (
            3 - attempts_used
        )

        db.session.commit()

        if attempts_remaining <= 0:
            user.clear_otp()
            db.session.commit()

            return jsonify({
                "error": (
                    "Too many failed OTP attempts. "
                    "Request a new OTP."
                )
            }), 429

        return jsonify({
            "error": "Incorrect OTP.",
            "attempts_remaining": attempts_remaining,
        }), 401

    # Correct OTP.
    username = user.username

    user.clear_otp()

    db.session.commit()

    login_user(user)

    return jsonify({
        "success": "Login successful.",
        "username": username,
        "user_id": user.id,
    }), 200


@api_bp.route("/auth/logout", methods=["POST"])
@login_required
def logout():
    logout_user()

    return jsonify({
        "success": "Logged out successfully."
    }), 200


@api_bp.route("/auth/me", methods=["GET"])
def current_session():
    """
    Lightweight session check used by the frontend on load to
    restore (or confirm the absence of) a logged-in session,
    without the heavier payload of /api/dashboard.
    """

    if not current_user.is_authenticated:
        return jsonify({"authenticated": False}), 200

    return jsonify({
        "authenticated": True,
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "is_admin": current_user.is_admin,
            "status": current_user.status,
        },
    }), 200


# -------------------------------------------------------------------
# USER DASHBOARD
# -------------------------------------------------------------------

@api_bp.route("/dashboard", methods=["GET"])
@login_required
def user_dashboard():
    followed_ids = [
        user.id
        for user in current_user.followed_creators
    ]

    subscription_feed = []

    if followed_ids:
        subscription_feed = db.session.execute(
            db.select(MediaItem)
            .where(
                MediaItem.uploader_id.in_(
                    followed_ids
                ),
                MediaItem.is_hidden.is_(False),
            )
            .order_by(
                MediaItem.uploaded_at.desc()
            )
            .limit(10)
        ).scalars().all()

    category_breakdown = {}

    categories = db.session.execute(
        db.select(Category).order_by(
            Category.id.asc()
        )
    ).scalars().all()

    for category in categories:
        latest = db.session.execute(
            db.select(MediaItem)
            .where(
                MediaItem.category_id == category.id,
                MediaItem.is_hidden.is_(False),
            )
            .order_by(
                MediaItem.uploaded_at.desc()
            )
            .limit(3)
        ).scalars().all()

        category_breakdown[category.name] = [
            serialize_item(item)
            for item in latest
        ]

    return jsonify({
        "profile_summary": {
            "user_id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "is_administrator": current_user.is_admin,
            "total_personal_uploads": len(
                current_user.uploads
            ),
        },
        "subscription_timeline_feed": [
            serialize_item(item)
            for item in subscription_feed
        ],
        "explore_genres_onboarding": (
            category_breakdown
        ),
    }), 200


# -------------------------------------------------------------------
# USER PROFILE
# -------------------------------------------------------------------

@api_bp.route(
    "/user/profile/edit",
    methods=["PUT"],
)
@login_required
def edit_profile_details():
    data = request.get_json(silent=True) or {}

    username = data.get("username")
    email = data.get("email")

    if username:
        username = str(username).strip()

        existing = db.session.execute(
            db.select(User).where(
                User.username == username,
                User.id != current_user.id,
            )
        ).scalar_one_or_none()

        if existing:
            return jsonify({
                "error": "Username already claimed."
            }), 409

        current_user.username = username

    if email:
        email = str(email).strip().lower()

        existing = db.session.execute(
            db.select(User).where(
                User.email == email,
                User.id != current_user.id,
            )
        ).scalar_one_or_none()

        if existing:
            return jsonify({
                "error": "Email already claimed."
            }), 409

        current_user.email = email

    db.session.commit()

    return jsonify({
        "success": (
            "Account details updated successfully."
        )
    }), 200


@api_bp.route(
    "/user/my-uploads",
    methods=["GET"],
)
@login_required
def get_personal_uploads():
    return jsonify({
        "my_uploads": [
            serialize_item(item)
            for item in current_user.uploads
        ]
    }), 200


@api_bp.route(
    "/user/<int:user_id>/profile",
    methods=["GET"],
)
def get_user_public_profile(user_id):
    user = db.session.get(
        User,
        user_id,
    )

    if user is None:
        return jsonify({
            "error": "User not found."
        }), 404

    total_received_likes = sum(
        len(item.liked_by)
        for item in user.uploads
    )

    is_owner_or_admin = current_user.is_authenticated and (
        current_user.id == user.id or current_user.is_admin
    )

    visible_uploads = [
        item for item in user.uploads
        if is_owner_or_admin or not item.is_hidden
    ]

    return jsonify({
        "user_id": user.id,
        "username": user.username,
        "status": user.status,
        "total_uploads_count": len(
            visible_uploads
        ),
        "total_likes_received": (
            total_received_likes
        ),
        "followers_count": len(user.followers),
        "following_count": len(user.followed_creators),
        "followed_by_me": bool(
            current_user.is_authenticated
            and user in current_user.followed_creators
        ),
        "public_catalog": [
            serialize_item(item)
            for item in visible_uploads
        ],
    }), 200


@api_bp.route(
    "/media/<int:item_id>",
    methods=["GET"],
)
def get_media_item(item_id):
    """Single-item lookup, e.g. for a media detail page deep link."""

    item = db.session.get(
        MediaItem,
        item_id,
    )

    if item is None:
        return jsonify({
            "error": "Media item not found."
        }), 404

    is_owner_or_admin = current_user.is_authenticated and (
        current_user.id == item.uploader_id or current_user.is_admin
    )

    if item.is_hidden and not is_owner_or_admin:
        return jsonify({
            "error": "Media item not found."
        }), 404

    return jsonify({
        "item": serialize_item(item)
    }), 200


# -------------------------------------------------------------------
# MEDIA UPLOAD / EDIT / DELETE
# -------------------------------------------------------------------

@api_bp.route(
    "/media/upload",
    methods=["POST"],
)
@login_required
def upload_media():
    title = request.form.get(
        "title",
        "",
    ).strip()

    description = request.form.get(
        "description",
        "",
    ).strip()

    category_id = request.form.get(
        "category_id",
        "",
    ).strip()

    is_featured = (
        request.form.get(
            "is_featured",
            "false",
        ).lower()
        == "true"
    )

    tagged_usernames_raw = request.form.get("tagged_usernames", "")
    tagged_usernames = [
        u for u in tagged_usernames_raw.split(",") if u.strip()
    ]

    if not title or not category_id:
        return jsonify({
            "error": (
                "Title and category_id "
                "are required."
            )
        }), 400

    try:
        category_id_int = int(category_id)

    except (TypeError, ValueError):
        return jsonify({
            "error": (
                "category_id must be a number."
            )
        }), 400

    category = db.session.get(
        Category,
        category_id_int,
    )

    if category is None:
        return jsonify({
            "error": "Category not found."
        }), 404

    if "media_file" not in request.files:
        return jsonify({
            "error": "media_file is required."
        }), 400

    file = request.files["media_file"]

    if not file or file.filename == "":
        return jsonify({
            "error": "Please select a file."
        }), 400

    if not allowed_file(
        file.filename,
        category.name,
    ):
        allowed = sorted(
            ALLOWED_EXTENSIONS.get(
                category.name,
                set(),
            )
        )

        return jsonify({
            "error": (
                f"Invalid file type for "
                f"{category.name}. "
                f"Allowed extensions: "
                f"{', '.join(allowed)}"
            )
        }), 400

    filename = secure_filename(
        file.filename
    )

    if not filename:
        return jsonify({
            "error": "Invalid filename."
        }), 400

    category_dir = os.path.join(
        current_app.config["UPLOAD_FOLDER"],
        category.name,
    )

    os.makedirs(
        category_dir,
        exist_ok=True,
    )

    save_path = os.path.join(
        category_dir,
        filename,
    )

    file.save(save_path)

    database_file_path = (
        f"{category.name}/{filename}"
    )

    new_item = MediaItem(
        title=title,
        description=description,
        category_id=category.id,
        uploader_id=current_user.id,
        file_path=database_file_path,
        is_featured=(
            is_featured
            if current_user.is_admin
            else False
        ),
    )

    if tagged_usernames:
        new_item.tagged_users = resolve_tagged_users(tagged_usernames)

    try:
        db.session.add(new_item)
        db.session.commit()

    except Exception:
        db.session.rollback()

        if os.path.exists(save_path):
            os.remove(save_path)

        return jsonify({
            "error": "Database storage failed."
        }), 500

    return jsonify({
        "success": (
            "Media uploaded successfully."
        ),
        "item": serialize_item(new_item),
    }), 201


@api_bp.route(
    "/media/<int:item_id>/edit",
    methods=["PUT"],
)
@login_required
def edit_media_item(item_id):
    item = db.session.get(
        MediaItem,
        item_id,
    )

    if item is None:
        return jsonify({
            "error": "Media item not found."
        }), 404

    if (
        item.uploader_id != current_user.id
        and not current_user.is_admin
    ):
        return jsonify({
            "error": (
                "Unauthorized modification attempt."
            )
        }), 403

    data = request.get_json(
        silent=True
    ) or {}

    if "title" in data:
        title = str(
            data["title"]
        ).strip()

        if not title:
            return jsonify({
                "error": (
                    "Title cannot be empty."
                )
            }), 400

        item.title = title

    if "description" in data:
        item.description = data[
            "description"
        ]

    db.session.commit()

    return jsonify({
        "success": (
            "Media item updated successfully."
        ),
        "item": serialize_item(item),
    }), 200


@api_bp.route(
    "/media/<int:item_id>/delete",
    methods=["DELETE"],
)
@login_required
def delete_media_item(item_id):
    item = db.session.get(
        MediaItem,
        item_id,
    )

    if item is None:
        return jsonify({
            "error": "Media item not found."
        }), 404

    if (
        item.uploader_id != current_user.id
        and not current_user.is_admin
    ):
        return jsonify({
            "error": (
                "Unauthorized deletion attempt."
            )
        }), 403

    file_disk_path = os.path.abspath(
        os.path.join(
            current_app.config[
                "UPLOAD_FOLDER"
            ],
            item.file_path,
        )
    )

    try:
        db.session.delete(item)
        db.session.commit()

        if os.path.exists(
            file_disk_path
        ):
            os.remove(
                file_disk_path
            )

    except Exception:
        db.session.rollback()

        return jsonify({
            "error": (
                "Database deletion "
                "failure occurred."
            )
        }), 500

    return jsonify({
        "success": (
            "Media item deleted successfully."
        )
    }), 200


# -------------------------------------------------------------------
# FOLLOW / LIKE
# -------------------------------------------------------------------

@api_bp.route(
    "/creator/<int:creator_id>/follow",
    methods=["POST"],
)
@login_required
def toggle_follow_creator(creator_id):
    if current_user.id == creator_id:
        return jsonify({
            "error": (
                "You cannot follow yourself."
            )
        }), 400

    creator = db.session.get(
        User,
        creator_id,
    )

    if creator is None:
        return jsonify({
            "error": "Creator not found."
        }), 404

    if creator in current_user.followed_creators:
        current_user.followed_creators.remove(
            creator
        )
        action = "unfollowed"

    else:
        current_user.followed_creators.append(
            creator
        )
        action = "followed"

    db.session.commit()

    return jsonify({
        "success": (
            f"Successfully {action} "
            f"{creator.username}."
        ),
        "followers": len(
            creator.followers
        ),
    }), 200


@api_bp.route(
    "/media/<int:item_id>/like",
    methods=["POST"],
)
@login_required
def toggle_like_media(item_id):
    item = db.session.get(
        MediaItem,
        item_id,
    )

    if item is None:
        return jsonify({
            "error": "Media item not found."
        }), 404

    if item in current_user.liked_items:
        current_user.liked_items.remove(
            item
        )
        action = "removed"

    else:
        current_user.liked_items.append(
            item
        )
        action = "added"

    db.session.commit()

    return jsonify({
        "success": (
            f"Like {action} successfully."
        ),
        "likes_count": len(
            item.liked_by
        ),
    }), 200


# -------------------------------------------------------------------
# ADMIN ROUTES
# -------------------------------------------------------------------

@api_bp.route(
    "/admin/users",
    methods=["GET"],
)
@login_required
def admin_list_all_users():
    if not current_user.is_admin:
        return jsonify({
            "error": (
                "Administrative privileges "
                "required."
            )
        }), 403

    users = db.session.execute(
        db.select(User).order_by(
            User.id.asc()
        )
    ).scalars().all()

    return jsonify({
        "system_accounts": [
            {
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
                "is_admin": user.is_admin,
                "status": user.status,
                "total_uploads": len(
                    user.uploads
                ),
            }
            for user in users
        ]
    }), 200


@api_bp.route(
    "/admin/user/<int:user_id>/status",
    methods=["PUT"],
)
@login_required
def admin_modify_user_status(user_id):
    if not current_user.is_admin:
        return jsonify({
            "error": (
                "Administrative privileges "
                "required."
            )
        }), 403

    user = db.session.get(
        User,
        user_id,
    )

    if user is None:
        return jsonify({
            "error": "User not found."
        }), 404

    if user.id == current_user.id:
        return jsonify({
            "error": (
                "You cannot change your "
                "own admin account status."
            )
        }), 400

    data = request.get_json(
        silent=True
    ) or {}

    new_status = str(
        data.get("status", "")
    ).lower().strip()

    if new_status not in {
        "active",
        "suspended",
    }:
        return jsonify({
            "error": (
                "Status must be "
                "'active' or 'suspended'."
            )
        }), 400

    user.status = new_status

    db.session.commit()

    return jsonify({
        "success": (
            f"User '{user.username}' "
            f"status changed to "
            f"'{user.status}'."
        )
    }), 200


@api_bp.route(
    "/admin/media/<int:item_id>/feature",
    methods=["PUT"],
)
@login_required
def admin_toggle_featured_spotlight(item_id):
    if not current_user.is_admin:
        return jsonify({
            "error": (
                "Administrative privileges "
                "required."
            )
        }), 403

    item = db.session.get(
        MediaItem,
        item_id,
    )

    if item is None:
        return jsonify({
            "error": "Media item not found."
        }), 404

    data = request.get_json(
        silent=True
    ) or {}

    if "is_featured" not in data:
        return jsonify({
            "error": (
                "is_featured is required."
            )
        }), 400

    is_featured = data[
        "is_featured"
    ]

    if not isinstance(
        is_featured,
        bool,
    ):
        return jsonify({
            "error": (
                "is_featured must be "
                "true or false."
            )
        }), 400

    item.is_featured = is_featured

    db.session.commit()

    action = (
        "featured"
        if is_featured
        else "removed from featured"
    )

    return jsonify({
        "success": (
            f"Media item {action} "
            "successfully."
        ),
        "media_item": serialize_item(item),
    }), 200


# -------------------------------------------------------------------
# TAGGED-IN (closes the request-fulfillment loop: whoever asked for
# something on the Timeline can see here when a creator tags them
# on an upload or a post)
# -------------------------------------------------------------------

@api_bp.route("/user/tagged", methods=["GET"])
@login_required
def get_tagged_in():
    tagged_media = [
        item for item in current_user.tagged_in_media
        if not item.is_hidden
    ]

    tagged_posts = [
        post for post in current_user.tagged_in_posts
        if not post.is_hidden
    ]

    tagged_media.sort(key=lambda item: item.uploaded_at, reverse=True)
    tagged_posts.sort(key=lambda post: post.created_at, reverse=True)

    return jsonify({
        "tagged_media": [serialize_item(item) for item in tagged_media],
        "tagged_posts": [serialize_post(post) for post in tagged_posts],
    }), 200


# -------------------------------------------------------------------
# USER SEARCH (tag picker autocomplete)
# -------------------------------------------------------------------

@api_bp.route("/users/search", methods=["GET"])
def search_users():
    query = (request.args.get("q") or "").strip()

    if len(query) < 1:
        return jsonify({"users": []}), 200

    users = db.session.execute(
        db.select(User)
        .where(User.username.ilike(f"%{query}%"))
        .order_by(User.username.asc())
        .limit(10)
    ).scalars().all()

    return jsonify({
        "users": [
            {"id": u.id, "username": u.username}
            for u in users
        ]
    }), 200


# -------------------------------------------------------------------
# TIMELINE / POSTS
#
# A separate feed from media uploads: short text posts (think a
# Twitter/Facebook wall) where anyone can ask for something, share an
# update, or tag other users. A creator who later uploads media that
# answers a request tags the requester directly on the upload (see
# tagged_usernames on POST /media/upload) rather than replying here.
# -------------------------------------------------------------------

@api_bp.route("/timeline", methods=["GET"])
def list_timeline():
    posts = db.session.execute(
        db.select(Post)
        .where(Post.is_hidden.is_(False))
        .order_by(Post.created_at.desc())
        .limit(100)
    ).scalars().all()

    return jsonify({
        "posts": [serialize_post(p) for p in posts]
    }), 200


@api_bp.route("/posts", methods=["POST"])
@login_required
def create_post():
    data = request.get_json(silent=True) or {}

    body = str(data.get("body", "")).strip()

    if not body:
        return jsonify({"error": "Post body is required."}), 400

    if len(body) > 500:
        return jsonify({"error": "Posts are limited to 500 characters."}), 400

    explicit_tags = data.get("tagged_usernames") or []

    if not isinstance(explicit_tags, list):
        return jsonify({"error": "tagged_usernames must be a list."}), 400

    mentioned = TAG_MENTION_PATTERN.findall(body)

    new_post = Post(body=body, author_id=current_user.id)
    new_post.tagged_users = resolve_tagged_users([*explicit_tags, *mentioned])

    db.session.add(new_post)
    db.session.commit()

    return jsonify({
        "success": "Post published.",
        "post": serialize_post(new_post),
    }), 201


@api_bp.route("/posts/<int:post_id>", methods=["GET"])
def get_post(post_id):
    post = db.session.get(Post, post_id)

    if post is None:
        return jsonify({"error": "Post not found."}), 404

    is_owner_or_admin = current_user.is_authenticated and (
        current_user.id == post.author_id or current_user.is_admin
    )

    if post.is_hidden and not is_owner_or_admin:
        return jsonify({"error": "Post not found."}), 404

    return jsonify({"post": serialize_post(post)}), 200


@api_bp.route("/posts/<int:post_id>", methods=["DELETE"])
@login_required
def delete_post(post_id):
    post = db.session.get(Post, post_id)

    if post is None:
        return jsonify({"error": "Post not found."}), 404

    if post.author_id != current_user.id and not current_user.is_admin:
        return jsonify({"error": "Unauthorized deletion attempt."}), 403

    db.session.delete(post)
    db.session.commit()

    return jsonify({"success": "Post deleted successfully."}), 200


@api_bp.route("/posts/<int:post_id>/like", methods=["POST"])
@login_required
def toggle_like_post(post_id):
    post = db.session.get(Post, post_id)

    if post is None:
        return jsonify({"error": "Post not found."}), 404

    if post in current_user.liked_posts:
        current_user.liked_posts.remove(post)
        action = "removed"
    else:
        current_user.liked_posts.append(post)
        action = "added"

    db.session.commit()

    return jsonify({
        "success": f"Like {action} successfully.",
        "likes_count": len(post.liked_by),
    }), 200


# -------------------------------------------------------------------
# COMMENTS (shared by media uploads and timeline posts)
# -------------------------------------------------------------------

@api_bp.route("/media/<int:item_id>/comments", methods=["GET"])
def list_media_comments(item_id):
    item = db.session.get(MediaItem, item_id)

    if item is None:
        return jsonify({"error": "Media item not found."}), 404

    comments = db.session.execute(
        db.select(Comment)
        .where(Comment.media_item_id == item_id)
        .order_by(Comment.created_at.asc())
    ).scalars().all()

    return jsonify({
        "comments": [serialize_comment(c) for c in comments]
    }), 200


@api_bp.route("/posts/<int:post_id>/comments", methods=["GET"])
def list_post_comments(post_id):
    post = db.session.get(Post, post_id)

    if post is None:
        return jsonify({"error": "Post not found."}), 404

    comments = db.session.execute(
        db.select(Comment)
        .where(Comment.post_id == post_id)
        .order_by(Comment.created_at.asc())
    ).scalars().all()

    return jsonify({
        "comments": [serialize_comment(c) for c in comments]
    }), 200


@api_bp.route("/comments", methods=["POST"])
@login_required
def create_comment():
    data = request.get_json(silent=True) or {}

    body = str(data.get("body", "")).strip()
    media_item_id = data.get("media_item_id")
    post_id = data.get("post_id")

    if not body:
        return jsonify({"error": "Comment body is required."}), 400

    if len(body) > 1000:
        return jsonify({"error": "Comments are limited to 1000 characters."}), 400

    if bool(media_item_id) == bool(post_id):
        return jsonify({
            "error": "Provide exactly one of media_item_id or post_id."
        }), 400

    if media_item_id:
        target = db.session.get(MediaItem, media_item_id)
        if target is None:
            return jsonify({"error": "Media item not found."}), 404
        comment = Comment(body=body, author_id=current_user.id, media_item_id=media_item_id)
    else:
        target = db.session.get(Post, post_id)
        if target is None:
            return jsonify({"error": "Post not found."}), 404
        comment = Comment(body=body, author_id=current_user.id, post_id=post_id)

    db.session.add(comment)
    db.session.commit()

    return jsonify({
        "success": "Comment added.",
        "comment": serialize_comment(comment),
    }), 201


@api_bp.route("/comments/<int:comment_id>", methods=["DELETE"])
@login_required
def delete_comment(comment_id):
    comment = db.session.get(Comment, comment_id)

    if comment is None:
        return jsonify({"error": "Comment not found."}), 404

    owns_parent_content = (
        (comment.media_item and comment.media_item.uploader_id == current_user.id)
        or (comment.post and comment.post.author_id == current_user.id)
    )

    if (
        comment.author_id != current_user.id
        and not owns_parent_content
        and not current_user.is_admin
    ):
        return jsonify({"error": "Unauthorized deletion attempt."}), 403

    db.session.delete(comment)
    db.session.commit()

    return jsonify({"success": "Comment deleted successfully."}), 200


# -------------------------------------------------------------------
# SAVE / BOOKMARK (works across media uploads and timeline posts)
# -------------------------------------------------------------------

SAVEABLE_TYPES = {"media": MediaItem, "post": Post}


@api_bp.route("/save/<item_type>/<int:item_id>", methods=["POST"])
@login_required
def toggle_save(item_type, item_id):
    model = SAVEABLE_TYPES.get(item_type)

    if model is None:
        return jsonify({"error": "Invalid item type."}), 400

    target = db.session.get(model, item_id)

    if target is None:
        return jsonify({"error": "Item not found."}), 404

    existing = db.session.execute(
        db.select(SavedItem).where(
            SavedItem.user_id == current_user.id,
            SavedItem.item_type == item_type,
            SavedItem.item_id == item_id,
        )
    ).scalar_one_or_none()

    if existing:
        db.session.delete(existing)
        db.session.commit()
        return jsonify({"success": "Removed from saved items.", "saved": False}), 200

    db.session.add(SavedItem(user_id=current_user.id, item_type=item_type, item_id=item_id))
    db.session.commit()

    return jsonify({"success": "Saved.", "saved": True}), 200


@api_bp.route("/saved", methods=["GET"])
@login_required
def list_saved_items():
    saved_rows = db.session.execute(
        db.select(SavedItem)
        .where(SavedItem.user_id == current_user.id)
        .order_by(SavedItem.created_at.desc())
    ).scalars().all()

    saved_media = []
    saved_posts = []

    for row in saved_rows:
        model = SAVEABLE_TYPES.get(row.item_type)
        target = db.session.get(model, row.item_id) if model else None

        if target is None:
            continue

        if row.item_type == "media":
            saved_media.append(serialize_item(target))
        else:
            saved_posts.append(serialize_post(target))

    return jsonify({
        "saved_media": saved_media,
        "saved_posts": saved_posts,
    }), 200


# -------------------------------------------------------------------
# REPORT (content moderation queue)
# -------------------------------------------------------------------

REPORTABLE_TYPES = {"media": MediaItem, "post": Post, "comment": Comment}


@api_bp.route("/report/<item_type>/<int:item_id>", methods=["POST"])
@login_required
def report_item(item_type, item_id):
    model = REPORTABLE_TYPES.get(item_type)

    if model is None:
        return jsonify({"error": "Invalid item type."}), 400

    target = db.session.get(model, item_id)

    if target is None:
        return jsonify({"error": "Item not found."}), 404

    data = request.get_json(silent=True) or {}
    reason = str(data.get("reason", "")).strip()

    if not reason:
        return jsonify({"error": "A reason is required."}), 400

    db.session.add(Report(
        item_type=item_type,
        item_id=item_id,
        reason=reason[:500],
        reporter_id=current_user.id,
    ))
    db.session.commit()

    return jsonify({"success": "Report submitted. Our team will review it."}), 201


@api_bp.route("/admin/reports", methods=["GET"])
@login_required
def admin_list_reports():
    if not current_user.is_admin:
        return jsonify({"error": "Administrative privileges required."}), 403

    status_filter = request.args.get("status", "pending")

    stmt = db.select(Report).order_by(Report.created_at.desc())

    if status_filter != "all":
        stmt = stmt.where(Report.status == status_filter)

    reports = db.session.execute(stmt).scalars().all()

    return jsonify({
        "reports": [r.to_dict() for r in reports]
    }), 200


@api_bp.route("/admin/reports/<int:report_id>/resolve", methods=["PUT"])
@login_required
def admin_resolve_report(report_id):
    if not current_user.is_admin:
        return jsonify({"error": "Administrative privileges required."}), 403

    report = db.session.get(Report, report_id)

    if report is None:
        return jsonify({"error": "Report not found."}), 404

    data = request.get_json(silent=True) or {}
    action = data.get("action")

    if action not in {"dismiss", "hide"}:
        return jsonify({"error": "action must be 'dismiss' or 'hide'."}), 400

    if action == "hide":
        model = REPORTABLE_TYPES.get(report.item_type)
        target = db.session.get(model, report.item_id) if model else None

        if target is not None and hasattr(target, "is_hidden"):
            target.is_hidden = True
        elif target is not None:
            # Comments have no visibility flag of their own — hiding
            # a reported comment means removing it outright.
            db.session.delete(target)

        report.status = "actioned"
    else:
        report.status = "dismissed"

    db.session.commit()

    return jsonify({
        "success": f"Report {report.status}.",
        "report": report.to_dict(),
    }), 200