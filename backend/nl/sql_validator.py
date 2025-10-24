from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, Optional

import sqlparse

from .sql_prompt import ALLOWED_TABLE_COLUMNS, all_allowed_columns


class SQLValidationError(Exception):
    """Raised when the generated SQL violates safety rules."""


CODE_BLOCK_REGEX = re.compile(
    r"```sql\s*(?P<sql>.+?)\s*```",
    re.IGNORECASE | re.DOTALL,
)

UNSAFE_PATTERNS = [
    r"\bCREATE\b",
    r"\bALTER\b",
    r"\bDROP\b",
    r"\bDELETE\b",
    r"\bINSERT\b",
    r"\bTRUNCATE\b",
    r"\bMERGE\b",
    r"\bREPLACE\b",
    r"\bUPSERT\b",
    r"\bGRANT\b",
    r"\bREVOKE\b",
]


@dataclass
class SQLValidationResult:
    sql: str
    is_update: bool


def extract_sql(text: str) -> str:
    """Pull the SQL from a ```sql fenced block."""
    match = CODE_BLOCK_REGEX.search(text)
    if not match:
        raise SQLValidationError("Model response missing ```sql fenced block.")
    sql = match.group("sql").strip()
    if not sql:
        raise SQLValidationError("Model returned an empty SQL block.")
    return sql


def validate_sql(sql: str, *, allow_update: bool) -> SQLValidationResult:
    sql = sql.strip()
    if sql.endswith(";"):
        sql = sql[:-1].strip()
    if ";" in sql:
        raise SQLValidationError("Multiple statements or semicolons are not allowed.")
    upper_sql = sql.upper()
    for pattern in UNSAFE_PATTERNS:
        if re.search(pattern, upper_sql):
            raise SQLValidationError("SQL contains a forbidden operation.")
    is_update = upper_sql.startswith("UPDATE")
    if is_update:
        if not allow_update:
            raise SQLValidationError("Updates are not permitted for this query.")
        _validate_buffer_update(sql)
    else:
        if not upper_sql.startswith("SELECT"):
            raise SQLValidationError("Only SELECT queries are permitted.")
    _validate_tables_and_columns(sql)
    return SQLValidationResult(sql=sql, is_update=is_update)


def _validate_buffer_update(sql: str) -> None:
    pattern = re.compile(
        r"^\s*UPDATE\s+menu_items\s+SET\s+buffer_qty\s*=\s*([0-9]+(\.[0-9]+)?)",
        re.IGNORECASE | re.DOTALL,
    )
    if not pattern.search(sql):
        raise SQLValidationError(
            "Only menu_items.buffer_qty updates are permitted."
        )
    forbidden_columns = re.findall(
        r"SET\s+([^=]+)=",
        sql,
        flags=re.IGNORECASE,
    )
    for clause in forbidden_columns:
        parts = [segment.strip().lower() for segment in clause.split(",")]
        for part in parts:
            if part and not part.startswith("buffer_qty"):
                raise SQLValidationError(
                    "UPDATE statement attempts to modify disallowed columns."
                )


def _validate_tables_and_columns(sql: str) -> None:
    parsed = sqlparse.parse(sql)
    if not parsed:
        raise SQLValidationError("Unable to parse SQL for validation.")

    table_aliases: Dict[str, str] = {}
    for statement in parsed:
        for token in statement.tokens:
            if token.ttype is None and token.is_group:
                # recursively inspect sub-groups (e.g., parenthesis)
                _extract_aliases_from_group(token, table_aliases)
            elif token.ttype is None:
                _extract_aliases(token, table_aliases)

    allowed_tables = set(ALLOWED_TABLE_COLUMNS.keys())
    if table_aliases:
        for table in table_aliases.values():
            if table not in allowed_tables:
                raise SQLValidationError(f"Table '{table}' is not allowed.")
    else:
        # fallback: ensure raw table names exist inside SQL
        found_tables = set(
            re.findall(r"\bFROM\s+([a-zA-Z_][\w]*)", sql, flags=re.IGNORECASE)
        )
        found_tables.update(
            re.findall(r"\bJOIN\s+([a-zA-Z_][\w]*)", sql, flags=re.IGNORECASE)
        )
        if not found_tables.issubset(allowed_tables):
            raise SQLValidationError("SQL references non-whitelisted tables.")

    allowed_columns = all_allowed_columns()
    for alias, column in re.findall(
        r"\b([A-Za-z_][\w]*)\.([A-Za-z_][\w]*)\b",
        sql,
    ):
        if column.lower() not in {col.lower() for col in allowed_columns}:
            raise SQLValidationError(f"Column '{column}' is not allowed.")


def _extract_aliases(token, alias_map: Dict[str, str]) -> None:
    identifiers = getattr(token, "get_identifiers", lambda: [])()
    for identifier in identifiers:
        _record_alias(identifier, alias_map)


def _extract_aliases_from_group(group, alias_map: Dict[str, str]) -> None:
    for token in group.tokens:
        if token.ttype is None and token.is_group:
            _extract_aliases_from_group(token, alias_map)
        else:
            _extract_aliases(token, alias_map)


def _record_alias(identifier, alias_map: Dict[str, str]) -> None:
    real_name = None
    alias = None
    tokens = list(identifier.flatten())
    for idx, token in enumerate(tokens):
        if token.ttype in sqlparse.tokens.Name:
            if real_name is None:
                real_name = token.value
            elif alias is None:
                alias = token.value
        if token.ttype is sqlparse.tokens.Keyword and token.value.upper() == "AS":
            # expect alias after AS
            if idx + 1 < len(tokens):
                next_token = tokens[idx + 1]
                if next_token.ttype in sqlparse.tokens.Name:
                    alias = next_token.value
                    break
    if real_name:
        alias_map[(alias or real_name).lower()] = real_name.lower()
