# Headless — Media Sharing Platform

A full-stack media sharing app: upload, browse, follow creators, and like
Movies, Music, and Ebooks. Password + OTP authentication, an admin panel
for managing users and featured content, and a wine & white UI.

On top of media sharing, Headless has a lightweight social layer:
- **Timeline** — a separate feed of short text posts (`/timeline`), for
  asking for something, sharing an update, or tagging other users.
- **Comments** — on both media uploads and timeline posts.
- **Save/bookmark** — media and posts, listed under Profile → Saved.
- **Report** — media, posts, or comments; admins review and dismiss or
  remove the content from Admin → Reports.
- **Tagging** — `@username` in a post/comment auto-links to that user;
  the upload form has an explicit tag picker so a creator can tag whoever
  requested what they just uploaded. Tagged content shows up under
  Profile → Tagged In for the person who was tagged.

- **Backend**: Flask, Flask-Login (session auth), SQLAlchemy, SQLite (or Postgres).
- **Frontend**: React (Vite), React Router, Tailwind CSS.
- **Deployment**: single Docker image — Flask serves both the API (`/api/*`) and the built React app.

## Project structure

```
backend/
  app/
    app.py        # app setup, config, static frontend serving
    models.py      # User, Category, MediaItem + follow/like association tables
    routes.py       # all API routes, under /api
  requirements.txt
frontend/
  src/
    pages/          # route-level views
    components/     # Navbar, MediaCard, Logo, route guards, ...
    api/client.js    # fetch wrapper for the backend API
    context/AuthContext.jsx
Dockerfile           # multi-stage build: Vite build -> Flask + gunicorn
railway.json
```

## How authentication works

1. `POST /api/auth/register` — creates the account and immediately generates a one-time code (OTP).
2. `POST /api/auth/login` — checks username/email + password, then generates a fresh OTP.
3. `POST /api/auth/verify-otp` — checks the OTP and, if valid, logs the user in (sets a signed session cookie).

There's no email/SMS provider wired up. The OTP is always printed to the
server log, and — since `DEMO_MODE=true` by default — it's also returned in
the API response so the app is fully usable from the browser without server
access. Set `DEMO_MODE=false` once real OTP delivery is added.

## Local development

**Backend**

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
FLASK_DEBUG=true PORT=5000 python app/app.py
```

This creates `backend/app/headless_media.db`, seeds the `Movie` / `Music` /
`Ebook` categories, and creates an admin account (`admin@media.com` /
`adminpass` by default — override via `ADMIN_EMAIL` / `ADMIN_PASSWORD`).

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api` to `http://127.0.0.1:5000` (see `vite.config.js`), so
just open the printed `http://localhost:5173` URL.

## Deploying to Railway

This repo ships a `Dockerfile` that builds the frontend and bundles it into
the Flask app, plus a `railway.json` pointing Railway at it. From the
Railway dashboard:

1. **New Project → Deploy from GitHub repo**, select this repository.
   Railway will detect `railway.json` / `Dockerfile` automatically.
2. **Add a Volume** (Settings → Volumes) mounted at `/data`, and set the
   environment variable `DATA_DIR=/data`. Without this, the SQLite
   database and uploaded files are lost on every redeploy, since the
   container filesystem is ephemeral.
3. Set environment variables (Settings → Variables):
   - `SECRET_KEY` — a long random string.
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_USERNAME` — your real admin credentials.
   - `DATA_DIR=/data` (per the volume above).
   - `DEMO_MODE=true` (keep this on unless you add real email/SMS OTP delivery).
4. Deploy. Railway sets `PORT` automatically; the container's `gunicorn`
   command reads it.

Optional: attach a Railway Postgres plugin and Railway will inject
`DATABASE_URL` automatically — the app switches to it over SQLite when
present.

## API overview

All routes are under `/api`. See `backend/app/routes.py` for the full
implementation.

| Area | Routes |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/request-otp`, `POST /auth/verify-otp`, `POST /auth/logout`, `GET /auth/me` |
| Catalog | `GET /categories`, `GET /explore?category=&q=`, `GET /media/<id>`, `GET /media/<id>/stream` |
| Media | `POST /media/upload`, `PUT /media/<id>/edit`, `DELETE /media/<id>/delete` |
| Social | `POST /creator/<id>/follow`, `POST /media/<id>/like` |
| Timeline | `GET /timeline`, `POST /posts`, `GET /posts/<id>`, `DELETE /posts/<id>`, `POST /posts/<id>/like` |
| Comments | `GET /media/<id>/comments`, `GET /posts/<id>/comments`, `POST /comments`, `DELETE /comments/<id>` |
| Save | `POST /save/<media\|post>/<id>`, `GET /saved` |
| Report | `POST /report/<media\|post\|comment>/<id>`, `GET /admin/reports`, `PUT /admin/reports/<id>/resolve` |
| Tagging | `GET /users/search?q=`, `GET /user/tagged` (tagging itself happens via `tagged_usernames` on `POST /media/upload` and `POST /posts`, or `@mentions` in post/comment bodies) |
| Profile | `GET /dashboard`, `GET /user/my-uploads`, `PUT /user/profile/edit`, `GET /user/<id>/profile` |
| Admin | `GET /admin/users`, `PUT /admin/user/<id>/status`, `PUT /admin/media/<id>/feature` |

Guests can browse and preview Movies/Music (byte-limited) but must log in
to read Ebooks or get full playback.
