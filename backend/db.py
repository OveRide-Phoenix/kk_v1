"""Shared raw mysql.connector helper for Kuteera Kitchen backend."""

import mysql.connector

# Guard against mysql-connector native C-extension segfaults seen on macOS.
_mysql_connect_original = mysql.connector.connect


def _mysql_connect_force_pure(*args, **kwargs):
    """Wrap mysql.connector.connect to always use the pure-Python implementation.

    Args:
        *args: Positional arguments forwarded to the real connect().
        **kwargs: Keyword arguments forwarded to the real connect().

    Returns:
        A mysql.connector connection object using the pure-Python implementation.
    """
    kwargs.setdefault("use_pure", True)
    return _mysql_connect_original(*args, **kwargs)


mysql.connector.connect = _mysql_connect_force_pure


def get_raw_db():
    """Get a raw mysql.connector connection to the kk_v1 database.

    Returns:
        A mysql.connector connection object.
    """
    return mysql.connector.connect(
        host="localhost",
        user="fastapi_user",
        password="password",
        database="kk_v1",
        use_pure=True,
    )
