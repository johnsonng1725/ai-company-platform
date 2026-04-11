"""
Symmetric encryption for sensitive values stored in the DB (API keys).
Uses Fernet (AES-128-CBC + HMAC) with a key derived from SECRET_KEY.
"""
import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from backend.core.config import settings

# Derive a 32-byte key from SECRET_KEY → base64url-encode it for Fernet
_raw = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
_fernet = Fernet(base64.urlsafe_b64encode(_raw))

_PREFIX = "enc:"


def encrypt_value(plaintext: str) -> str:
    """Encrypt a string. Returns an 'enc:…' prefixed ciphertext."""
    if not plaintext:
        return plaintext
    if plaintext.startswith(_PREFIX):
        return plaintext  # already encrypted
    token = _fernet.encrypt(plaintext.encode()).decode()
    return f"{_PREFIX}{token}"


def decrypt_value(stored: str) -> str:
    """Decrypt a stored value. Falls back to returning the value as-is
    for keys that were stored in plaintext before encryption was added."""
    if not stored:
        return stored
    if stored.startswith(_PREFIX):
        try:
            return _fernet.decrypt(stored[len(_PREFIX):].encode()).decode()
        except InvalidToken:
            return stored  # corrupt / wrong key — return raw rather than crash
    # Legacy plaintext value — return as-is
    return stored
