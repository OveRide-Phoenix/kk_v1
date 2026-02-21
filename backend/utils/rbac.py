from __future__ import annotations

import json
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

DEFAULT_ROLES: Tuple[Dict[str, Any], ...] = (
    {
        "code": "admin",
        "name": "Administrator",
        "description": "Full platform administrator with all permissions.",
        "is_system": 1,
    },
    {
        "code": "developer",
        "name": "Developer",
        "description": "Technical role for developer tooling and diagnostics.",
        "is_system": 1,
    },
)


def ensure_default_roles(cursor) -> None:
    """
    Guarantee that core system roles exist. Safe to call repeatedly.
    """
    inserted = False
    for role in DEFAULT_ROLES:
        cursor.execute(
            """
            INSERT INTO roles (code, name, description, is_system)
            SELECT %s, %s, %s, %s
            WHERE NOT EXISTS (
                SELECT 1 FROM roles WHERE code = %s
            )
            """,
            (
                role["code"],
                role["name"],
                role["description"],
                role["is_system"],
                role["code"],
            ),
        )
        if getattr(cursor, "rowcount", 0):
            inserted = True
    if inserted:
        connection = getattr(cursor, "connection", None)
        if connection is not None:
            try:
                connection.commit()
            except Exception:
                pass


def parse_role_ids(raw: Any) -> List[int]:
    """
    Normalise roles JSON/iterable into a list[int].
    Invalid entries are ignored.
    """
    if raw is None:
        return []
    data: List[Any]
    if isinstance(raw, (list, tuple)):
        data = list(raw)
    else:
        try:
            if isinstance(raw, (bytes, bytearray)):
                raw = raw.decode("utf-8")
            data = json.loads(raw)
            if not isinstance(data, list):
                return []
        except (TypeError, json.JSONDecodeError):
            return []
    result: List[int] = []
    for item in data:
        try:
            result.append(int(item))
        except (TypeError, ValueError):
            continue
    return result


def roles_to_json(role_ids: Sequence[int]) -> str:
    """
    Serialise a sequence of role ids into JSON ready for storage.
    """
    unique_sorted = sorted({int(r) for r in role_ids if isinstance(r, (int, str))})
    return json.dumps(unique_sorted)


def fetch_role_map(
    cursor, role_ids: Optional[Iterable[int]] = None
) -> Dict[int, Dict[str, Any]]:
    """
    Return metadata for roles keyed by id. If role_ids is provided the query is scoped.
    """
    params: Tuple[Any, ...] = ()
    where = ""
    if role_ids is not None:
        role_ids = tuple({int(r) for r in role_ids})
        if not role_ids:
            return {}
        placeholders = ",".join(["%s"] * len(role_ids))
        params = tuple(role_ids)
        where = f"WHERE role_id IN ({placeholders})"

    cursor.execute(
        f"""
        SELECT role_id, code, name, description, is_system
        FROM roles
        {where}
        ORDER BY name ASC
        """,
        params,
    )
    result: Dict[int, Dict[str, Any]] = {}
    for row in cursor.fetchall():
        (
            role_id,
            code,
            name,
            description,
            is_system,
        ) = row
        result[int(role_id)] = {
            "role_id": int(role_id),
            "code": code,
            "name": name,
            "description": description,
            "is_system": bool(is_system),
        }
    return result


def fetch_role_ids_by_codes(
    cursor, codes: Sequence[str]
) -> Dict[str, Optional[int]]:
    """
    Resolve role ids by their codes. Returns mapping code -> role_id (or None if missing).
    """
    if not codes:
        return {}
    unique_codes = tuple({code for code in codes if code})
    if not unique_codes:
        return {}
    placeholders = ",".join(["%s"] * len(unique_codes))

    cursor.execute(
        f"""
        SELECT code, role_id
        FROM roles
        WHERE code IN ({placeholders})
        """,
        unique_codes,
    )
    mapping: Dict[str, Optional[int]] = {code: None for code in unique_codes}
    for code, role_id in cursor.fetchall():
        mapping[code] = int(role_id)
    return mapping


def get_role_id(cursor, code: str) -> Optional[int]:
    """
    Convenience accessor for a single role id by code. Ensures defaults exist first.
    """
    if not code:
        return None
    ensure_default_roles(cursor)
    cursor.execute(
        """
        SELECT role_id
        FROM roles
        WHERE code = %s
        LIMIT 1
        """,
        (code,),
    )
    row = cursor.fetchone()
    if not row:
        return None
    if isinstance(row, Mapping):
        value = row.get("role_id")
    elif isinstance(row, (list, tuple)):
        value = row[0]
    else:
        value = row
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def make_role_summary(
    role_ids: Sequence[int], role_map: Mapping[int, Mapping[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Build a list of role summaries preserving the input order (deduplicated).
    """
    seen: set[int] = set()
    summary: List[Dict[str, Any]] = []
    for role_id in role_ids:
        rid = int(role_id)
        if rid in seen:
            continue
        seen.add(rid)
        details = role_map.get(rid)
        if details:
            summary.append(dict(details))
    return summary
