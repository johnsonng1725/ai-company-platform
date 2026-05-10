"""
Social OAuth login — Google & Facebook.
Flow: browser → /api/auth/{provider} → provider consent → /api/auth/{provider}/callback
      → create/find user → JWT → redirect to frontend /auth/callback?token=...
"""
import os
import urllib.parse
import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from backend.database import get_db
from backend import models
from backend.core.auth import create_access_token

router = APIRouter(prefix="/api/auth", tags=["oauth"])

FRONTEND_URL   = os.getenv("FRONTEND_URL", "https://1nexio.com")
_CALLBACK_BASE = os.getenv("API_BASE_URL",  "https://1nexio.com")


# ── helpers ──────────────────────────────────────────────────────────────────


def _finish(user: models.User) -> RedirectResponse:
    token = create_access_token({"sub": str(user.id)})
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?token={token}")


# ── Google ────────────────────────────────────────────────────────────────────

GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI  = f"{_CALLBACK_BASE}/api/auth/google/callback"


@router.get("/google")
def google_login():
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth is not configured.")
    params = urllib.parse.urlencode({
        "client_id":     GOOGLE_CLIENT_ID,
        "redirect_uri":  GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope":         "openid email profile",
        "access_type":   "offline",
        "prompt":        "select_account",
    })
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


@router.get("/google/callback")
async def google_callback(code: str = "", error: str = "", db: Session = Depends(get_db)):
    if error or not code:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=google_cancelled")
    async with httpx.AsyncClient() as client:
        # Exchange code for tokens
        tok = await client.post("https://oauth2.googleapis.com/token", data={
            "code":          code,
            "client_id":     GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri":  GOOGLE_REDIRECT_URI,
            "grant_type":    "authorization_code",
        })
        tok.raise_for_status()
        access_token = tok.json()["access_token"]

        # Fetch user profile
        profile = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        profile.raise_for_status()
        info = profile.json()

    google_id = info["sub"]
    email     = info.get("email", "")
    name      = info.get("name", "")
    avatar    = info.get("picture", "")

    # Find existing user by google_id or email
    user = db.query(models.User).filter(models.User.google_id == google_id).first()
    if not user and email:
        user = db.query(models.User).filter(models.User.email == email).first()
    is_new = user is None

    if is_new:
        user = models.User(email=email, full_name=name, avatar_url=avatar, google_id=google_id)
        db.add(user)
        db.flush()
    else:
        user.google_id = google_id
        if avatar:
            user.avatar_url = avatar

    db.commit()
    db.refresh(user)
    return _finish(user)


# ── Facebook ──────────────────────────────────────────────────────────────────

FACEBOOK_APP_ID     = os.getenv("FACEBOOK_APP_ID", "")
FACEBOOK_APP_SECRET = os.getenv("FACEBOOK_APP_SECRET", "")
FACEBOOK_REDIRECT_URI = f"{_CALLBACK_BASE}/api/auth/facebook/callback"


@router.get("/facebook")
def facebook_login():
    if not FACEBOOK_APP_ID:
        raise HTTPException(status_code=501, detail="Facebook OAuth is not configured.")
    params = urllib.parse.urlencode({
        "client_id":     FACEBOOK_APP_ID,
        "redirect_uri":  FACEBOOK_REDIRECT_URI,
        "scope":         "email,public_profile",
        "response_type": "code",
    })
    return RedirectResponse(f"https://www.facebook.com/v19.0/dialog/oauth?{params}")


@router.get("/facebook/callback")
async def facebook_callback(code: str = "", error: str = "", db: Session = Depends(get_db)):
    if error or not code:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=facebook_cancelled")
    async with httpx.AsyncClient() as client:
        # Exchange code for access token
        tok = await client.get("https://graph.facebook.com/v19.0/oauth/access_token", params={
            "client_id":     FACEBOOK_APP_ID,
            "client_secret": FACEBOOK_APP_SECRET,
            "redirect_uri":  FACEBOOK_REDIRECT_URI,
            "code":          code,
        })
        tok.raise_for_status()
        access_token = tok.json()["access_token"]

        # Fetch user profile
        profile = await client.get("https://graph.facebook.com/me", params={
            "fields":       "id,name,email,picture.type(large)",
            "access_token": access_token,
        })
        profile.raise_for_status()
        info = profile.json()

    fb_id  = info["id"]
    email  = info.get("email", f"{fb_id}@facebook.invalid")
    name   = info.get("name", "")
    avatar = info.get("picture", {}).get("data", {}).get("url", "")

    user = db.query(models.User).filter(models.User.facebook_id == fb_id).first()
    if not user and email and not email.endswith("@facebook.invalid"):
        user = db.query(models.User).filter(models.User.email == email).first()
    is_new = user is None

    if is_new:
        user = models.User(email=email, full_name=name, avatar_url=avatar, facebook_id=fb_id)
        db.add(user)
        db.flush()
    else:
        user.facebook_id = fb_id
        if avatar:
            user.avatar_url = avatar

    db.commit()
    db.refresh(user)
    return _finish(user)
