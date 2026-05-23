"""Password hashing utilities for Kuteera Kitchen backend.

Uses bcrypt via the ``bcrypt`` package. Call :func:`hash_password` when
storing a new password and :func:`verify_password` when checking one.
"""

import bcrypt


def hash_password(plain: str) -> str:
    """Hash a plain-text password with bcrypt.

    Args:
        plain: The plain-text password to hash.

    Returns:
        The bcrypt hash string, suitable for storage in the database.
    """
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain.encode(), salt).decode()


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain-text password against a stored bcrypt hash.

    Args:
        plain: The plain-text password supplied by the user.
        hashed: The bcrypt hash retrieved from the database.

    Returns:
        True if the password matches, False otherwise.
    """
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False
