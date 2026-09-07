from datetime import datetime, timezone, timedelta
import secrets

from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash


db = SQLAlchemy()


# -------------------------------------------------------------------
# Association table: users following creators
# -------------------------------------------------------------------

follows = db.Table(
    "follows",

    db.Column(
        "follower_id",
        db.Integer,
        db.ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        primary_key=True,
    ),

    db.Column(
        "followed_id",
        db.Integer,
        db.ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        primary_key=True,
    ),
)


# -------------------------------------------------------------------
# Association table: users liking media
# -------------------------------------------------------------------

likes = db.Table(
    "likes",

    db.Column(
        "user_id",
        db.Integer,
        db.ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        primary_key=True,
    ),

    db.Column(
        "media_item_id",
        db.Integer,
        db.ForeignKey(
            "media_items.id",
            ondelete="CASCADE",
        ),
        primary_key=True,
    ),
)


# -------------------------------------------------------------------
# USER MODEL
# -------------------------------------------------------------------

class User(db.Model, UserMixin):

    __tablename__ = "users"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    username = db.Column(
        db.String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    email = db.Column(
        db.String(120),
        unique=True,
        nullable=False,
        index=True,
    )

    password_hash = db.Column(
        db.String(255),
        nullable=False,
    )

    is_admin = db.Column(
        db.Boolean,
        default=False,
        nullable=False,
    )

    status = db.Column(
        db.String(20),
        default="active",
        nullable=False,
    )

    # ---------------------------------------------------------------
    # OTP fields
    # ---------------------------------------------------------------

    otp_code = db.Column(
        db.String(6),
        nullable=True,
    )

    otp_expires_at = db.Column(
        db.DateTime(timezone=True),
        nullable=True,
    )

    otp_failed_attempts = db.Column(
        db.Integer,
        default=0,
        nullable=False,
    )

    # ---------------------------------------------------------------
    # User -> uploaded media
    # ---------------------------------------------------------------

    uploads = db.relationship(
        "MediaItem",
        backref="uploader",
        lazy=True,
        cascade="all, delete-orphan",
    )

    # ---------------------------------------------------------------
    # User -> creators being followed
    # ---------------------------------------------------------------

    followed_creators = db.relationship(
        "User",
        secondary=follows,

        primaryjoin=(
            follows.c.follower_id == id
        ),

        secondaryjoin=(
            follows.c.followed_id == id
        ),

        backref=db.backref(
            "followers",
            lazy="select",
        ),

        lazy="select",
    )

    # ---------------------------------------------------------------
    # User -> liked media
    # ---------------------------------------------------------------

    liked_items = db.relationship(
        "MediaItem",
        secondary=likes,

        backref=db.backref(
            "liked_by",
            lazy="select",
        ),

        lazy="select",
    )

    # ---------------------------------------------------------------
    # Password methods
    # ---------------------------------------------------------------

    def set_password(self, password):
        self.password_hash = generate_password_hash(
            str(password)
        )

    def check_password(self, password):
        if not self.password_hash:
            return False

        return check_password_hash(
            self.password_hash,
            str(password),
        )

    # ---------------------------------------------------------------
    # OTP methods
    # ---------------------------------------------------------------

    def generate_otp(self):
        """
        Generate a cryptographically stronger 6-digit OTP.

        OTP lifetime:
        5 minutes.

        Every new OTP resets the failed-attempt counter.
        """

        self.otp_code = (
            f"{secrets.randbelow(900000) + 100000}"
        )

        self.otp_expires_at = (
            datetime.now(timezone.utc)
            + timedelta(minutes=5)
        )

        self.otp_failed_attempts = 0

        return self.otp_code

    def clear_otp(self):
        """
        Remove the current OTP and reset its
        failed-attempt counter.
        """

        self.otp_code = None
        self.otp_expires_at = None
        self.otp_failed_attempts = 0


# -------------------------------------------------------------------
# CATEGORY MODEL
# -------------------------------------------------------------------

class Category(db.Model):

    __tablename__ = "categories"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    name = db.Column(
        db.String(50),
        unique=True,
        nullable=False,
    )

    description = db.Column(
        db.String(255),
    )

    items = db.relationship(
        "MediaItem",
        backref="category",
        lazy=True,
        cascade="all, delete-orphan",
    )


# -------------------------------------------------------------------
# MEDIA ITEM MODEL
# -------------------------------------------------------------------

class MediaItem(db.Model):

    __tablename__ = "media_items"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    title = db.Column(
        db.String(150),
        nullable=False,
    )

    description = db.Column(
        db.Text,
        nullable=True,
    )

    file_path = db.Column(
        db.String(255),
        nullable=False,
    )

    uploaded_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    is_featured = db.Column(
        db.Boolean,
        default=False,
        nullable=False,
    )

    uploader_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    category_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "categories.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    def to_dict(self):

        return {
            "id": self.id,

            "title": self.title,

            "description": self.description,

            "file_path": self.file_path,

            "uploaded_at": (
                self.uploaded_at.isoformat()
                if self.uploaded_at
                else None
            ),

            "is_featured": self.is_featured,

            "category": (
                self.category.name
                if self.category
                else None
            ),

            "likes_count": (
                len(self.liked_by)
                if self.liked_by is not None
                else 0
            ),

            "uploader": {
                "id": self.uploader_id,

                "username": (
                    self.uploader.username
                    if self.uploader
                    else None
                ),
            },
        }