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
# Association table: users tagged on a media upload
# -------------------------------------------------------------------

media_tags = db.Table(
    "media_tags",

    db.Column(
        "media_item_id",
        db.Integer,
        db.ForeignKey("media_items.id", ondelete="CASCADE"),
        primary_key=True,
    ),

    db.Column(
        "tagged_user_id",
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


# -------------------------------------------------------------------
# Association table: users tagged in a timeline post
# -------------------------------------------------------------------

post_tags = db.Table(
    "post_tags",

    db.Column(
        "post_id",
        db.Integer,
        db.ForeignKey("posts.id", ondelete="CASCADE"),
        primary_key=True,
    ),

    db.Column(
        "tagged_user_id",
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


# -------------------------------------------------------------------
# Association table: users liking a timeline post
# -------------------------------------------------------------------

post_likes = db.Table(
    "post_likes",

    db.Column(
        "user_id",
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    ),

    db.Column(
        "post_id",
        db.Integer,
        db.ForeignKey("posts.id", ondelete="CASCADE"),
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

    is_hidden = db.Column(
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

    tagged_users = db.relationship(
        "User",
        secondary=media_tags,
        backref=db.backref("tagged_in_media", lazy="select"),
        lazy="select",
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

            "is_hidden": self.is_hidden,

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

            "comments_count": len(self.comments),

            "tagged_users": [
                {"id": u.id, "username": u.username}
                for u in self.tagged_users
            ],

            "uploader": {
                "id": self.uploader_id,

                "username": (
                    self.uploader.username
                    if self.uploader
                    else None
                ),
            },
        }


# -------------------------------------------------------------------
# POST MODEL (general timeline: short text posts, separate from
# media uploads — a request board / status-update feed)
# -------------------------------------------------------------------

class Post(db.Model):

    __tablename__ = "posts"

    id = db.Column(db.Integer, primary_key=True)

    body = db.Column(db.String(500), nullable=False)

    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    is_hidden = db.Column(db.Boolean, default=False, nullable=False)

    author_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    author = db.relationship(
        "User",
        backref=db.backref(
            "posts", lazy=True, cascade="all, delete-orphan"
        ),
    )

    tagged_users = db.relationship(
        "User",
        secondary=post_tags,
        backref=db.backref("tagged_in_posts", lazy="select"),
        lazy="select",
    )

    liked_by = db.relationship(
        "User",
        secondary=post_likes,
        backref=db.backref("liked_posts", lazy="select"),
        lazy="select",
    )

    def to_dict(self):

        return {
            "id": self.id,
            "body": self.body,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "is_hidden": self.is_hidden,
            "likes_count": len(self.liked_by),
            "comments_count": len(self.comments),
            "tagged_users": [
                {"id": u.id, "username": u.username}
                for u in self.tagged_users
            ],
            "author": {
                "id": self.author_id,
                "username": self.author.username if self.author else None,
            },
        }


# -------------------------------------------------------------------
# COMMENT MODEL (shared by media uploads and timeline posts —
# exactly one of media_item_id / post_id is set on any given row)
# -------------------------------------------------------------------

class Comment(db.Model):

    __tablename__ = "comments"

    id = db.Column(db.Integer, primary_key=True)

    body = db.Column(db.String(1000), nullable=False)

    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    author_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    media_item_id = db.Column(
        db.Integer,
        db.ForeignKey("media_items.id", ondelete="CASCADE"),
        nullable=True,
    )

    post_id = db.Column(
        db.Integer,
        db.ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=True,
    )

    author = db.relationship(
        "User",
        backref=db.backref(
            "comments", lazy=True, cascade="all, delete-orphan"
        ),
    )

    media_item = db.relationship(
        "MediaItem",
        backref=db.backref(
            "comments", lazy=True, cascade="all, delete-orphan"
        ),
    )

    post = db.relationship(
        "Post",
        backref=db.backref(
            "comments", lazy=True, cascade="all, delete-orphan"
        ),
    )

    def to_dict(self):

        return {
            "id": self.id,
            "body": self.body,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "media_item_id": self.media_item_id,
            "post_id": self.post_id,
            "author": {
                "id": self.author_id,
                "username": self.author.username if self.author else None,
            },
        }


# -------------------------------------------------------------------
# SAVED ITEM MODEL (bookmarks — works across both content types via
# an item_type discriminator rather than a typed foreign key)
# -------------------------------------------------------------------

class SavedItem(db.Model):

    __tablename__ = "saved_items"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    item_type = db.Column(db.String(20), nullable=False)  # "media" | "post"

    item_id = db.Column(db.Integer, nullable=False)

    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = db.relationship(
        "User",
        backref=db.backref(
            "saved_items", lazy=True, cascade="all, delete-orphan"
        ),
    )

    __table_args__ = (
        db.UniqueConstraint(
            "user_id", "item_type", "item_id", name="uq_saved_item"
        ),
    )


# -------------------------------------------------------------------
# REPORT MODEL (content moderation queue — media, posts, or comments)
# -------------------------------------------------------------------

class Report(db.Model):

    __tablename__ = "reports"

    id = db.Column(db.Integer, primary_key=True)

    item_type = db.Column(db.String(20), nullable=False)  # "media" | "post" | "comment"

    item_id = db.Column(db.Integer, nullable=False)

    reason = db.Column(db.String(500), nullable=False)

    status = db.Column(db.String(20), default="pending", nullable=False)  # pending | dismissed | actioned

    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    reporter_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    reporter = db.relationship(
        "User",
        backref=db.backref(
            "reports_filed", lazy=True, cascade="all, delete-orphan"
        ),
    )

    def to_dict(self):

        return {
            "id": self.id,
            "item_type": self.item_type,
            "item_id": self.item_id,
            "reason": self.reason,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "reporter": {
                "id": self.reporter_id,
                "username": self.reporter.username if self.reporter else None,
            },
        }