"""RBAC management router: roles and team members."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

import mysql.connector
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..db import get_raw_db
from ..utils.auth_deps import ADMIN_ROLE_CODE, DEVELOPER_ROLE_CODE, admin_required, hash_password
from ..utils.rbac import (
    ensure_default_roles,
    fetch_role_map,
    make_role_summary,
    parse_role_ids,
    roles_to_json,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class RoleCreateRequest(BaseModel):
    """Payload for creating a new role."""

    name: str
    code: Optional[str] = None
    description: Optional[str] = None


class RoleUpdateRequest(BaseModel):
    """Payload for updating an existing role."""

    name: Optional[str] = None
    description: Optional[str] = None


class TeamMemberCreateRequest(BaseModel):
    """Payload for assigning roles and credentials to an existing customer."""

    customer_id: int
    role_ids: List[int] = Field(default_factory=list)
    admin_password: Optional[str] = None
    admin_is_active: Optional[bool] = True


class TeamMemberUpdateRequest(BaseModel):
    """Payload for updating an existing team member's roles or credentials."""

    role_ids: Optional[List[int]] = None
    admin_password: Optional[str] = None
    admin_is_active: Optional[bool] = None


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def slugify_role_code(value: str) -> str:
    """Convert a string to a URL-safe lowercase hyphenated role code.

    Args:
        value: Raw role name or code string.

    Returns:
        Slugified code string.
    """
    slug = re.sub(r"[^a-z0-9]+", "-", value.strip().lower())
    return slug.strip("-")


def role_usage_counts(db) -> Dict[int, int]:
    """Count how many customers are currently assigned each role.

    Args:
        db: mysql.connector connection.

    Returns:
        Dict mapping role_id to count.
    """
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT roles FROM customers WHERE roles IS NOT NULL")
        counts: Dict[int, int] = {}
        for row in cursor.fetchall():
            for rid in parse_role_ids(row.get("roles")):
                counts[rid] = counts.get(rid, 0) + 1
        return counts
    finally:
        cursor.close()


def validate_role_ids(db, role_ids: List[int]) -> Dict[int, Dict[str, Any]]:
    """Validate that all given role_ids exist, raising 400 on unknown values.

    Args:
        db: mysql.connector connection.
        role_ids: List of role IDs to validate.

    Returns:
        Dict mapping role_id to role details.
    """
    normalised = sorted({int(rid) for rid in role_ids})
    if not normalised:
        return {}
    cursor = db.cursor()
    try:
        ensure_default_roles(cursor)
        role_map = fetch_role_map(cursor, normalised)
    finally:
        cursor.close()
    missing = [rid for rid in normalised if rid not in role_map]
    if missing:
        raise HTTPException(status_code=400, detail=f"Unknown role ids: {missing}")
    return role_map


def build_role_context(db, role_ids: Optional[List[int]] = None):
    """Fetch and build role context (map, codes list, details list).

    Args:
        db: mysql.connector connection.
        role_ids: Optional list of role IDs to scope. If None, returns all roles.

    Returns:
        Tuple of (role_map, role_codes, role_details).
    """
    cursor = db.cursor()
    try:
        ensure_default_roles(cursor)
        role_map = fetch_role_map(cursor, role_ids)
    finally:
        cursor.close()
    effective_roles = role_ids[:] if role_ids else list(role_map.keys())
    code_seen: set[str] = set()
    role_codes: List[str] = []
    for rid in effective_roles:
        details = role_map.get(rid)
        if not details:
            continue
        code = details.get("code")
        if not code or code in code_seen:
            continue
        code_seen.add(code)
        role_codes.append(code)
    role_details = make_role_summary(effective_roles, role_map)
    return role_map, role_codes, role_details


def hydrate_team_members(db, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Expand raw customer rows with full role detail information.

    Args:
        db: mysql.connector connection.
        rows: List of customer rows from the database.

    Returns:
        List of enriched team member dicts.
    """
    parsed_roles: List[List[int]] = []
    role_ids: set[int] = set()
    for row in rows:
        roles = parse_role_ids(row.get("roles"))
        parsed_roles.append(roles)
        role_ids.update(roles)
    if not role_ids:
        return []
    role_map, _, _ = build_role_context(db, sorted(role_ids))
    members: List[Dict[str, Any]] = []
    for row, roles in zip(rows, parsed_roles):
        if not roles:
            continue
        role_details = make_role_summary(roles, role_map)
        role_codes = [detail.get("code") for detail in role_details if detail.get("code")]
        members.append(
            {
                "customer_id": row["customer_id"],
                "name": row.get("name"),
                "phone": row.get("primary_mobile"),
                "email": row.get("email"),
                "roles": roles,
                "role_codes": role_codes,
                "role_details": role_details,
                "admin_is_active": bool(row.get("admin_is_active", True)),
                "has_admin_password": bool(row.get("admin_password_hash")),
                "created_at": row.get("created_at"),
            }
        )
    return members


def apply_team_member_update(
    db,
    customer_id: int,
    role_ids: Optional[List[int]],
    admin_password: Optional[str],
    admin_is_active: Optional[bool],
    *,
    require_role_ids: bool = False,
):
    """Apply role/password/active-status updates to a team member.

    Args:
        db: mysql.connector connection.
        customer_id: Customer to update.
        role_ids: New list of role IDs (or None to leave unchanged).
        admin_password: New admin password (or None to leave unchanged).
        admin_is_active: New active status (or None to leave unchanged).
        require_role_ids: When True, raises 400 if role_ids is missing or empty.

    Returns:
        Hydrated team member dict or None.
    """
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT customer_id, roles, admin_is_active
            FROM customers
            WHERE customer_id=%s
            LIMIT 1
            """,
            (customer_id,),
        )
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Customer not found")

        updates: List[str] = []
        params: List[Any] = []

        if role_ids is not None:
            normalised_roles = sorted({int(rid) for rid in role_ids})
            if require_role_ids and not normalised_roles:
                raise HTTPException(status_code=400, detail="At least one role is required")
            validate_role_ids(db, normalised_roles)
            if normalised_roles:
                updates.append("roles=%s")
                params.append(roles_to_json(normalised_roles))
            else:
                updates.append("roles=NULL")
        elif require_role_ids:
            raise HTTPException(status_code=400, detail="Role ids are required")

        if admin_is_active is not None:
            updates.append("admin_is_active=%s")
            params.append(int(bool(admin_is_active)))

        if admin_password is not None:
            password = admin_password.strip()
            if password:
                if len(password) < 8:
                    raise HTTPException(
                        status_code=400,
                        detail="Admin password must be at least 8 characters",
                    )
                has_letter = any(c.isalpha() for c in password)
                has_digit = any(c.isdigit() for c in password)
                if not has_letter or not has_digit:
                    raise HTTPException(
                        status_code=400,
                        detail="Admin password must contain at least one letter and one number",
                    )
                updates.append("admin_password_hash=%s")
                params.append(hash_password(password))
            else:
                updates.append("admin_password_hash=NULL")

        if updates:
            cursor.execute(
                f"UPDATE customers SET {', '.join(updates)} WHERE customer_id=%s",
                (*params, customer_id),
            )
            db.commit()

        cursor.execute(
            """
            SELECT customer_id, name, primary_mobile, email, roles, admin_is_active, admin_password_hash, created_at
            FROM customers
            WHERE customer_id=%s
            """,
            (customer_id,),
        )
        updated_row = cursor.fetchone()
    finally:
        cursor.close()

    if not updated_row:
        raise HTTPException(status_code=404, detail="Customer not found")

    members = hydrate_team_members(db, [updated_row])
    return members[0] if members else None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/api/rbac/roles")
def list_roles(user: Dict[str, Any] = Depends(admin_required)):
    """Return all roles with assigned-count metadata.

    Args:
        user: Current admin user (injected).

    Returns:
        Dict with roles list.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        ensure_default_roles(cursor)
        cursor.execute("""
            SELECT role_id, code, name, description, is_system, created_at
            FROM roles
            ORDER BY name ASC
            """)
        roles = cursor.fetchall()
        usage = role_usage_counts(db)
        for role in roles:
            rid = int(role["role_id"])
            role["is_system"] = bool(role["is_system"])
            role["assigned_count"] = usage.get(rid, 0)
        return {"roles": roles}
    finally:
        cursor.close()
        db.close()


@router.post("/api/rbac/roles")
def create_role(payload: RoleCreateRequest, user: Dict[str, Any] = Depends(admin_required)):
    """Create a new custom role.

    Args:
        payload: Role name, optional code, and optional description.
        user: Current admin user (injected).

    Returns:
        Dict with created role object.
    """
    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Role name is required")
    code_source = payload.code or name
    code = slugify_role_code(code_source)
    if not code:
        raise HTTPException(status_code=400, detail="Invalid role code")

    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        ensure_default_roles(cursor)
        cursor.execute("SELECT role_id FROM roles WHERE code=%s LIMIT 1", (code,))
        if cursor.fetchone():
            raise HTTPException(status_code=409, detail="Role code already exists")
        cursor.execute(
            """
            INSERT INTO roles (code, name, description, is_system)
            VALUES (%s, %s, %s, 0)
            """,
            (code, name, payload.description),
        )
        db.commit()
        role_id = cursor.lastrowid
        cursor.execute(
            """
            SELECT role_id, code, name, description, is_system, created_at
            FROM roles
            WHERE role_id=%s
            """,
            (role_id,),
        )
        role = cursor.fetchone()
        role["is_system"] = bool(role["is_system"])
        role["assigned_count"] = 0
        return {"role": role}
    finally:
        cursor.close()
        db.close()


@router.put("/api/rbac/roles/{role_id}")
def update_role(
    role_id: int, payload: RoleUpdateRequest, user: Dict[str, Any] = Depends(admin_required)
):
    """Update an existing role's name or description.

    Args:
        role_id: ID of the role to update.
        payload: Fields to update.
        user: Current admin user (injected).

    Returns:
        Dict with updated role object.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT role_id, code, name, description, is_system FROM roles WHERE role_id=%s",
            (role_id,),
        )
        role = cursor.fetchone()
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")

        updates: List[str] = []
        params: List[Any] = []

        if payload.name is not None:
            new_name = payload.name.strip()
            if not new_name:
                raise HTTPException(status_code=400, detail="Role name is required")
            if role["is_system"] and new_name != role["name"]:
                raise HTTPException(status_code=400, detail="System roles cannot be renamed")
            updates.append("name=%s")
            params.append(new_name)

        if payload.description is not None:
            updates.append("description=%s")
            params.append(payload.description)

        if updates:
            cursor.execute(
                f"UPDATE roles SET {', '.join(updates)} WHERE role_id=%s",
                (*params, role_id),
            )
            db.commit()

        cursor.execute(
            """
            SELECT role_id, code, name, description, is_system, created_at
            FROM roles
            WHERE role_id=%s
            """,
            (role_id,),
        )
        updated = cursor.fetchone()
        updated["is_system"] = bool(updated["is_system"])
        usage = role_usage_counts(db)
        updated["assigned_count"] = usage.get(role_id, 0)
        return {"role": updated}
    finally:
        cursor.close()
        db.close()


@router.delete("/api/rbac/roles/{role_id}")
def delete_role(role_id: int, user: Dict[str, Any] = Depends(admin_required)):
    """Delete a non-system, unassigned role.

    Args:
        role_id: ID of the role to delete.
        user: Current admin user (injected).

    Returns:
        Dict with deleted flag.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT role_id, code, is_system FROM roles WHERE role_id=%s", (role_id,))
        role = cursor.fetchone()
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        if role["is_system"] or role["code"] in {ADMIN_ROLE_CODE, DEVELOPER_ROLE_CODE}:
            raise HTTPException(status_code=400, detail="Protected roles cannot be deleted")

        usage = role_usage_counts(db)
        if usage.get(role_id, 0) > 0:
            raise HTTPException(status_code=400, detail="Role is assigned to team members")

        cursor.execute("DELETE FROM roles WHERE role_id=%s", (role_id,))
        db.commit()
        return {"deleted": True}
    finally:
        cursor.close()
        db.close()


@router.get("/api/rbac/team-members")
def list_team_members(user: Dict[str, Any] = Depends(admin_required)):
    """Return all customers with at least one role assigned.

    Args:
        user: Current admin user (injected).

    Returns:
        Dict with team_members list.
    """
    db = get_raw_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT customer_id, name, primary_mobile, email, roles, admin_is_active, admin_password_hash, created_at
            FROM customers
            WHERE roles IS NOT NULL
            ORDER BY name ASC
            """)
        rows = cursor.fetchall()
        members = hydrate_team_members(db, rows)
        return {"team_members": members}
    finally:
        cursor.close()
        db.close()


@router.post("/api/rbac/team-members")
def create_team_member(
    payload: TeamMemberCreateRequest, user: Dict[str, Any] = Depends(admin_required)
):
    """Assign roles and credentials to an existing customer, making them a team member.

    Args:
        payload: customer_id, role_ids, and optional admin_password/admin_is_active.
        user: Current admin user (injected).

    Returns:
        Dict with created team_member object.
    """
    if payload.customer_id <= 0:
        raise HTTPException(status_code=400, detail="Valid customer_id is required")
    db = get_raw_db()
    try:
        member = apply_team_member_update(
            db,
            payload.customer_id,
            payload.role_ids,
            payload.admin_password,
            payload.admin_is_active,
            require_role_ids=True,
        )
        return {"team_member": member}
    finally:
        db.close()


@router.put("/api/rbac/team-members/{customer_id}")
def update_team_member(
    customer_id: int,
    payload: TeamMemberUpdateRequest,
    user: Dict[str, Any] = Depends(admin_required),
):
    """Update an existing team member's roles or credentials.

    Args:
        customer_id: Customer ID to update.
        payload: Fields to update (role_ids, admin_password, admin_is_active).
        user: Current admin user (injected).

    Returns:
        Dict with updated team_member object.
    """
    db = get_raw_db()
    try:
        member = apply_team_member_update(
            db,
            customer_id,
            payload.role_ids,
            payload.admin_password,
            payload.admin_is_active,
        )
        return {"team_member": member}
    finally:
        db.close()
