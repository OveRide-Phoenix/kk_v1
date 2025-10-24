from __future__ import annotations

from textwrap import dedent


# ---------- READ WHITELIST (safe superset) ----------

ALLOWED_TABLE_COLUMNS = {
    "bld": [
        "bld_id",
        "bld_type",
    ],
    "categories": [
        "category_id",
        "category_name",
    ],
    "items": [
        "item_id",
        "name",
        "alias",
        "category_id",
        "bld_id",
        "breakfast_price",
        "lunch_price",
        "dinner_price",
        "condiments_price",
        "description",
        "hsn_code",
        "uom",
        "weight_factor",
        "weight_uom",
        "item_type",
        "factor",
        "quantity_portion",
        "buffer_percentage",
        "picture_url",
        "cgst",
        "sgst",
        "igst",
        "net_price",
    ],
    "menu": [
        "menu_id",
        "date",
        "bld_id",
        "is_festival",
        "is_released",
        "period_type",
        "is_production_generated",
    ],
    "menu_items": [
        "menu_item_id",
        "menu_id",
        "item_id",
        "category_id",
        "planned_qty",
        "rate",
        "is_default",
        "sort_order",
        "available_qty",
        "buffer_qty",
        "final_qty",
    ],
    "orders": [
        "order_id",
        "customer_id",
        "address_id",
        "total_price",
        "status",
        "payment_method",
        "discount",
        "created_at",
        "order_type",
        "paid",
    ],
    "order_items": [
        "order_item_id",
        "order_id",
        "item_id",
        "quantity",
        "price",
    ],
    "customers": [
        "customer_id",
        "name",
        "primary_mobile",
        "email",
        "created_at",
    ],
    "addresses": [
        "address_id",
        "customer_id",
        "written_address",
        "city",
        "pin_code",
        "latitude",
        "longitude",
        "address_type",
        "route_assignment",
        "is_default",
    ],
    "admin_logs": [
        "log_id",
        "admin_id",
        "action_type",
        "entity_type",
        "entity_id",
        "description",
        "timestamp",
    ],
}


# ---------- WRITE POLICY (natural-key, no IDs from the user) ----------

# Each rule explains:
# - which table can be UPDATED,
# - which columns are allowed to change,
# - how the row MUST be identified without using an ID in the WHERE clause,
#   typically via a subquery that resolves the ID from natural fields (name/phone/date/meal).
ALLOWED_UPDATE_RULES = {
    # Menu-day row values, identified by (date, meal via bld_type, item name)
    "menu_items": {
        "can_update": [
            "buffer_qty",       # kitchen override
            "planned_qty",      # planning
            "available_qty",    # stock
            "final_qty",        # production decision
            "rate",             # menu-level pricing if you use it
            "is_default",
            "sort_order",
        ],
        "identify_by": dedent(
            """
            Identify the single row via the menu for a given date and meal, and the item by name (or alias):
              - Resolve bld_id from bld.bld_type ('Breakfast'/'Lunch'/'Dinner'/'Condiments').
              - Find menu.menu_id by m.date = <date> and m.bld_id = b.bld_id.
              - Resolve items.item_id by LOWER(items.name) = LOWER('<name>') OR LOWER(items.alias) = LOWER('<name>').
              - Then pick the single menu_items row for that (menu_id, item_id).
            If multiple rows match (e.g., same item across meals), prefer exact name match; otherwise return a SELECT of candidates instead of updating.
            The WHERE must not depend on a literal menu_item_id from the user.
            """
        ).strip(),
    },

    # Customer master updates, identified by phone (preferred) or exact name
    "customers": {
        "can_update": [
            "name",
            "primary_mobile",
            "email",
        ],
        "identify_by": dedent(
            """
            Identify the customer naturally:
              - Prefer customers.primary_mobile = '<phone>'
              - Else exact name: LOWER(customers.name) = LOWER('<name>')
            Do not require the user to provide customer_id.
            If multiple names match, return a SELECT of candidates instead of UPDATE.
            """
        ).strip(),
    },

    # Menu-day flags, identified by (date, meal via bld_type)
    "menu": {
        "can_update": [
            "is_festival",
            "is_released",
            "period_type",
            "is_production_generated",
        ],
        "identify_by": dedent(
            """
            Identify the menu row for a specific day and meal:
              - Resolve bld_id from bld.bld_type
              - WHERE date = <date> AND bld_id = <resolved>
            Do not require the user to provide menu_id.
            """
        ).strip(),
    },

    # Addresses updates, identified by customer phone/name + address fields (no address_id from user)
    "addresses": {
        "can_update": [
            "written_address",
            "city",
            "pin_code",
            "latitude",
            "longitude",
            "address_type",
            "route_assignment",
            "is_default",
        ],
        "identify_by": dedent(
            """
            Identify address belonging to a customer (by phone or exact name). Prefer a precise locator:
              - customer via customers.primary_mobile = '<phone>' OR exact name match
              - then a specific address match, e.g., LOWER(written_address) = LOWER('<text>')
            If ambiguous, return a SELECT of matching addresses for disambiguation.
            """
        ).strip(),
    },

    # Item master updates by item name/alias (no item_id from user)
    "items": {
        "can_update": [
            "alias",
            "description",
            "category_id",          # if using category name, resolve via categories.category_name
            "breakfast_price",
            "lunch_price",
            "dinner_price",
            "condiments_price",
            "cgst",
            "sgst",
            "igst",
            "net_price",
            "uom",
            "weight_factor",
            "weight_uom",
            "item_type",
            "factor",
            "quantity_portion",
            "buffer_percentage",
            "picture_url",
            "hsn_code",
        ],
        "identify_by": dedent(
            """
            Identify items by LOWER(name) = LOWER('<name>') OR LOWER(alias) = LOWER('<name>').
            If updating category_id by category name, resolve it as:
              category_id = (SELECT category_id FROM categories WHERE LOWER(category_name)=LOWER('<cat>') LIMIT 1)
            If multiple items match the name, return a SELECT listing candidates instead of UPDATE.
            """
        ).strip(),
    },
}


def _format_update_policy() -> str:
    parts: list[str] = []
    for tbl, rule in ALLOWED_UPDATE_RULES.items():
        cols = ", ".join(rule["can_update"])
        parts.append(
            dedent(
                f"""
                Table: {tbl}
                - Allowed columns to UPDATE: {cols}
                - Identification (no user-provided IDs): {rule["identify_by"]}
                """
            ).strip()
        )
    return "\n\n".join(parts)


# ---------- SYSTEM PROMPT BUILDER ----------

def build_system_prompt(*, today: str, allow_update: bool) -> str:
    """
    Returns a strict system prompt to send as the model's system message.

    `today` must be ISO date string for Asia/Kolkata baseline.
    `allow_update`:
      - True  -> permit only the UPDATEs defined in ALLOWED_UPDATE_RULES
      - False -> enforce SELECT-only (no UPDATE at all)
    """
    if allow_update:
        update_clause = dedent(
            f"""
            * You may return UPDATE statements ONLY if they comply with the Write Policy below.
              - NEVER require the user to provide any numeric ID in the prompt. Resolve rows via natural fields
                (e.g., date + meal for a menu; item name; customer phone; etc.), using subqueries to derive IDs.
              - UPDATE must target exactly one row. If ambiguity exists, DO NOT UPDATE; instead return a SELECT that helps disambiguate.
              - No multiple statements. No semicolons. Only one SQL statement.
              - Allowed update targets and how to identify rows are described in the Write Policy section.
            """
        ).strip()
        write_policy = _format_update_policy()
    else:
        update_clause = "* Queries must be SELECT-only. Never propose UPDATE/DELETE/INSERT.\n"
        write_policy = "Updates are disabled for this request."

    whitelist_lines = "\n".join(
        f"-- {table}({', '.join(columns)})"
        for table, columns in ALLOWED_TABLE_COLUMNS.items()
    )

    examples = dedent(
        r"""
        Examples (patterns; adapt values as needed, never require user-provided IDs):

        1) Today's full menu:
        ```sql
        SELECT mi.menu_item_id, m.date, b.bld_type, i.item_id, i.name AS item_name, mi.rate, mi.buffer_qty
        FROM menu m
        JOIN bld b ON b.bld_id = m.bld_id
        JOIN menu_items mi ON mi.menu_id = m.menu_id
        JOIN items i ON i.item_id = mi.item_id
        WHERE m.date = CURDATE()
        ORDER BY b.bld_type, i.name
        ```

        2) Tomorrow's dinner menu:
        ```sql
        SELECT mi.menu_item_id, m.date, b.bld_type, i.item_id, i.name AS item_name, mi.rate, mi.buffer_qty
        FROM menu m
        JOIN bld b ON b.bld_id = m.bld_id
        JOIN menu_items mi ON mi.menu_id = m.menu_id
        JOIN items i ON i.item_id = mi.item_id
        WHERE m.date = DATE_ADD(CURDATE(), INTERVAL 1 DAY)
          AND b.bld_type = 'Dinner'
        ORDER BY i.name
        ```

        3) Order count this week:
        ```sql
        SELECT COUNT(*) AS order_count
        FROM orders o
        WHERE YEARWEEK(o.created_at, 1) = YEARWEEK(CURDATE(), 1)
        ```

        4) Total sales this month:
        ```sql
        SELECT COALESCE(SUM(o.total_price),0) AS total_sales, COUNT(*) AS total_orders
        FROM orders o
        WHERE YEAR(o.created_at) = YEAR(CURDATE()) AND MONTH(o.created_at) = MONTH(CURDATE())
        ```

        5) Top 5 items this month:
        ```sql
        SELECT i.item_id, i.name, SUM(oi.quantity) AS qty_sold, SUM(oi.quantity * oi.price) AS revenue
        FROM order_items oi
        JOIN orders o ON o.order_id = oi.order_id
        JOIN items i ON i.item_id = oi.item_id
        WHERE YEAR(o.created_at) = YEAR(CURDATE()) AND MONTH(o.created_at) = MONTH(CURDATE())
        GROUP BY i.item_id, i.name
        ORDER BY revenue DESC, qty_sold DESC
        LIMIT 5
        ```

        6) Customer orders this month by phone:
        ```sql
        SELECT o.order_id, o.created_at, o.status, o.total_price
        FROM orders o
        JOIN customers c ON c.customer_id = o.customer_id
        WHERE c.primary_mobile = '9876543210'
          AND YEAR(o.created_at) = YEAR(CURDATE()) AND MONTH(o.created_at) = MONTH(CURDATE())
        ORDER BY o.created_at DESC
        ```

        7) Addresses for customer by name:
        ```sql
        SELECT a.address_id, a.written_address, a.city, a.pin_code, a.is_default
        FROM customers c
        JOIN addresses a ON a.customer_id = c.customer_id
        WHERE LOWER(c.name) LIKE LOWER('%shashank%')
        ORDER BY a.is_default DESC, a.address_id
        ```

        8) Show buffer for today's dinner:
        ```sql
        SELECT mi.menu_item_id, i.name, b.bld_type, mi.buffer_qty, mi.final_qty, mi.planned_qty, mi.available_qty
        FROM menu m
        JOIN bld b ON b.bld_id = m.bld_id
        JOIN menu_items mi ON mi.menu_id = m.menu_id
        JOIN items i ON i.item_id = mi.item_id
        WHERE m.date = CURDATE()
          AND b.bld_type = 'Dinner'
        ORDER BY i.name
        ```

        9) UPDATE menu buffer by item name (natural keys; no user-provided IDs). If ambiguous, prefer returning a SELECT of candidates instead of UPDATE:
        ```sql
        UPDATE menu_items
        SET buffer_qty = 20
        WHERE menu_id = (
          SELECT m.menu_id
          FROM menu m
          JOIN bld b ON b.bld_id = m.bld_id
          WHERE m.date = CURDATE()
            AND b.bld_type = 'Lunch'
          LIMIT 1
        )
          AND item_id = (
            SELECT i.item_id
            FROM items i
            WHERE LOWER(i.name) = LOWER('rasam') OR LOWER(i.alias) = LOWER('rasam')
            LIMIT 1
          )
        ```

        10) UPDATE customer email by phone (no customer_id in prompt):
        ```sql
        UPDATE customers
        SET email = 'new@email.com'
        WHERE primary_mobile = '9876543210'
        ```

        11) UPDATE item price by item name (e.g., dinner_price):
        ```sql
        UPDATE items
        SET dinner_price = 150.00
        WHERE LOWER(name) = LOWER('paneer butter masala') OR LOWER(alias) = LOWER('paneer butter masala')
        ```

        12) UPDATE menu flags by date+meal:
        ```sql
        UPDATE menu
        SET is_released = 1
        WHERE date = CURDATE()
          AND bld_id = (
            SELECT bld_id FROM bld WHERE bld_type = 'Breakfast' LIMIT 1
          )
        ```

        13) UPDATE address is_default for a customer's specific address (by phone + written_address match):
        ```sql
        UPDATE addresses
        SET is_default = 1
        WHERE customer_id = (
          SELECT customer_id FROM customers WHERE primary_mobile = '9876543210' LIMIT 1
        )
          AND LOWER(written_address) = LOWER('some address text')
        ```
        """
    ).strip()

    prompt = f"""
You are a senior MySQL query builder.

Return ONLY one SQL statement wrapped in a fenced code block:

```sql
SELECT ...
```

No prose, no comments, no extra backticks outside the fence.

Global Constraints:

* Use ONLY these tables and columns (whitelist below).
* Default timezone: Asia/Kolkata. Interpret relative dates ("today", "tomorrow", "yesterday", "this week", "this month") in this timezone.
* Today's date (server): {today}
* Meal mapping: {{breakfast→'Breakfast', lunch→'Lunch', dinner→'Dinner', condiments→'Condiments'}} against bld.bld_type.
* Joins must follow actual FKs in this schema.
* NEVER use DDL (CREATE/ALTER/DROP).
* NEVER use DELETE or INSERT.
* NEVER use multiple statements, semicolons, or session changes.
* Prefer indexed joins and simple WHERE clauses.
* If a value is ambiguous (e.g., multiple meals or duplicate names), do NOT guess:

  * For SELECT, return rows that help disambiguate.
  * For UPDATE, do NOT update; instead return a SELECT listing candidates for disambiguation.

Write Policy:
{update_clause}

Write Policy Details (allowed UPDATE targets, columns, and natural identification):
{write_policy}

Schema (MySQL 8). Use ONLY these tables/columns:
{whitelist_lines}

Helpful Examples:
{examples}
""".strip()

    # We deliberately keep this as a long system prompt to keep the model grounded.
    return prompt


def all_allowed_columns() -> set[str]:
    columns: set[str] = set()
    for column_list in ALLOWED_TABLE_COLUMNS.values():
        columns.update(column_list)
    return columns
