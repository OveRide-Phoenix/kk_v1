from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import date, timedelta
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional, Tuple

import yaml
from sqlalchemy import text
from sqlalchemy.orm import Session


class SlotExtractionError(Exception):
    pass


class SlotValidationError(Exception):
    pass


@dataclass
class NormalizedUtterance:
    original: str
    text: str
    tokens: List[str]
    token_set: set[str]
    numbers: List[int]


@dataclass
class IntentPattern:
    kind: str
    all_terms: List[str] = field(default_factory=list)
    any_terms: List[str] = field(default_factory=list)
    none_terms: List[str] = field(default_factory=list)
    regex: Optional[re.Pattern[str]] = None

    def matches(self, utterance: NormalizedUtterance) -> bool:
        if self.kind == "regex":
            if not self.regex:
                return False
            return bool(self.regex.search(utterance.text))
        return self._match_keywords(utterance)

    def _match_keywords(self, utterance: NormalizedUtterance) -> bool:
        if self.all_terms and not all(
            _term_present(term, utterance) for term in self.all_terms
        ):
            return False
        if self.any_terms:
            if not any(_term_present(term, utterance) for term in self.any_terms):
                return False
        if self.none_terms and any(
            _term_present(term, utterance) for term in self.none_terms
        ):
            return False
        return True


@dataclass
class SlotSpec:
    name: str
    type: str
    default: Any = None
    required: bool = False
    validators: List[str] = field(default_factory=list)
    meta: Dict[str, Any] = field(default_factory=dict)
    extractor: Optional[str] = None


@dataclass
class IntentDefinition:
    id: str
    patterns: List[IntentPattern]
    slots: List[SlotSpec]
    sql: Dict[str, Any]
    projection: Optional[List[Any]]
    responses: Dict[str, Any]
    examples: List[str]

    def extract_slots(
        self,
        utterance: NormalizedUtterance,
        shared: SharedResources,
    ) -> Dict[str, Any]:
        values: Dict[str, Any] = {}
        for slot in self.slots:
            extractor_key = slot.extractor or slot.type
            extractor = SLOT_EXTRACTORS.get(extractor_key)
            if extractor is None:
                raise SlotExtractionError(f"No extractor for slot {slot.name}")
            value = extractor(slot, utterance, shared, values)
            if value is None and slot.default is not None:
                value = _resolve_default(slot, shared)
            _validate_slot(slot, value)
            values[slot.name] = value
        return values


@dataclass
class IntentMatch:
    intent: IntentDefinition
    slots: Dict[str, Any]
    utterance: NormalizedUtterance


class SharedResources:
    def __init__(self, base_dir: Path):
        shared_dir = base_dir / "shared"
        self.meal_map = self._load_yaml(shared_dir / "meal_map.yaml")
        self.date_rules = self._load_yaml(shared_dir / "date_rules.yaml")
        self.synonyms = self._load_yaml(shared_dir / "synonyms.yaml", default={})
        self.meal_lookup = self._build_meal_lookup(self.meal_map)
        self.range_lookup, self.default_range = self._build_range_lookup(self.date_rules)
        self.synonym_lookup = self._build_synonym_lookup(self.synonyms)

    @staticmethod
    def _load_yaml(path: Path, default: Any | None = None) -> Any:
        if not path.exists():
            if default is not None:
                return default
            raise FileNotFoundError(f"Missing shared configuration: {path}")
        with path.open("r", encoding="utf-8") as handle:
            return yaml.safe_load(handle)

    @staticmethod
    def _build_meal_lookup(config: Mapping[str, Any]) -> Dict[str, str]:
        lookup: Dict[str, str] = {}
        for canonical, entry in config.get("meals", {}).items():
            lookup[canonical.lower()] = canonical
            for alias in entry.get("aliases", []):
                lookup[alias.lower()] = canonical
        return lookup

    @staticmethod
    def _build_range_lookup(
        config: Mapping[str, Any]
    ) -> Tuple[Dict[str, str], str]:
        lookup: Dict[str, str] = {}
        default_range = "today"
        for key, entry in config.get("ranges", {}).items():
            if entry.get("default", False):
                default_range = key
            lookup[key.lower()] = key
            for alias in entry.get("aliases", []):
                lookup[alias.lower()] = key
        return lookup, default_range

    @staticmethod
    def _build_synonym_lookup(config: Mapping[str, Any]) -> Dict[str, str]:
        lookup: Dict[str, str] = {}
        for canonical, entry in config.get("synonyms", {}).items():
            lookup[canonical.lower()] = canonical.lower()
            for alias in entry.get("aliases", []):
                lookup[alias.lower()] = canonical.lower()
        return lookup

    def normalize_token(self, token: str) -> str:
        return self.synonym_lookup.get(token, token)

    def meal_from_token(self, token: str) -> Optional[str]:
        return self.meal_lookup.get(token)

    def range_from_text(self, text: str) -> Optional[str]:
        key = text.strip().lower()
        return self.range_lookup.get(key)


class IntentRegistry:
    def __init__(self, base_dir: Path, shared: SharedResources):
        self.base_dir = base_dir
        self.shared = shared
        self.index_path = base_dir / "intents" / "index.json"
        self.intents: List[IntentDefinition] = []
        self.examples: List[str] = []
        self._load()

    def _load(self) -> None:
        with self.index_path.open("r", encoding="utf-8") as handle:
            index = json.load(handle)
        entries = index.get("intents", [])
        loaded: List[IntentDefinition] = []
        examples: List[str] = []
        for entry in sorted(entries, key=lambda e: (e.get("priority", 100), e.get("id", ""))):
            if not entry.get("enabled", True):
                continue
            intent_cfg = self._load_intent_file(entry["path"])
            intent = self._build_intent(intent_cfg)
            loaded.append(intent)
            examples.extend(entry.get("examples", [])[:3])
        self.intents = loaded
        self.examples = examples

    def _load_intent_file(self, relative_path: str) -> Mapping[str, Any]:
        intent_path = self.base_dir / "intents" / relative_path
        with intent_path.open("r", encoding="utf-8") as handle:
            return yaml.safe_load(handle)

    def _build_intent(self, config: Mapping[str, Any]) -> IntentDefinition:
        patterns_cfg = config.get("patterns", [])
        patterns = [self._build_pattern(entry) for entry in patterns_cfg]

        slots_cfg = config.get("slots", [])
        slots = [self._build_slot(entry) for entry in slots_cfg]

        sql_cfg = config.get("sql", {})
        projection = config.get("projection")
        responses = config.get("responses", {})
        examples = config.get("examples", [])

        return IntentDefinition(
            id=config["id"],
            patterns=patterns,
            slots=slots,
            sql=sql_cfg,
            projection=projection,
            responses=responses,
            examples=examples,
        )

    @staticmethod
    def _build_pattern(config: Mapping[str, Any]) -> IntentPattern:
        if "regex" in config:
            return IntentPattern(
                kind="regex",
                regex=re.compile(config["regex"]),
            )
        keywords_cfg = config.get("keywords", {})
        return IntentPattern(
            kind="keywords",
            all_terms=[term.lower() for term in keywords_cfg.get("all", [])],
            any_terms=[term.lower() for term in keywords_cfg.get("any", [])],
            none_terms=[term.lower() for term in keywords_cfg.get("none", [])],
        )

    @staticmethod
    def _build_slot(config: Mapping[str, Any]) -> SlotSpec:
        return SlotSpec(
            name=config["name"],
            type=config.get("type", "string"),
            default=config.get("default"),
            required=config.get("required", False),
            validators=list(config.get("validators", [])),
            meta=dict(config.get("meta", {})),
            extractor=config.get("extractor"),
        )

    def match(self, query: str) -> Optional[IntentMatch]:
        utterance = normalize(query, self.shared)
        for intent in self.intents:
            if not intent.patterns:
                continue
            if not any(pattern.matches(utterance) for pattern in intent.patterns):
                continue
            try:
                slots = intent.extract_slots(utterance, self.shared)
            except (SlotExtractionError, SlotValidationError):
                continue
            return IntentMatch(intent=intent, slots=slots, utterance=utterance)
        return None


class NLService:
    def __init__(self, base_dir: Path):
        self.base_dir = base_dir
        self.shared = SharedResources(base_dir)
        self.registry = IntentRegistry(base_dir, self.shared)

    def interpret(self, query: str, db: Session) -> Dict[str, Any]:
        match = self.registry.match(query)
        if match is None:
            return self._unknown_response()
        executor = EXECUTORS.get(match.intent.id)
        if executor is None:
            return self._unsupported(match.intent.id)
        result = executor(match, db)
        result.setdefault("intent", match.intent.id)
        result.setdefault("slots", sanitize_slots(match.slots))
        return result

    def help_examples(self) -> List[str]:
        return self.registry.examples[:5]

    def _unknown_response(self) -> Dict[str, Any]:
        examples = self.help_examples()
        message = "Try: " + ", ".join(f"'{sample}'" for sample in examples) if examples else "No matching intent"
        return {
            "intent": "UNKNOWN",
            "message": message,
            "examples": examples,
        }

    @staticmethod
    def _unsupported(intent_id: str) -> Dict[str, Any]:
        return {
            "intent": intent_id,
            "message": "Intent configured but no executor available",
        }


def normalize(query: str, shared: SharedResources) -> NormalizedUtterance:
    lowered = query.lower()
    normalized = re.sub(r"[^a-z0-9\s/:-]", " ", lowered)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    tokens = re.findall(r"[a-z0-9/:-]+", normalized)
    token_set: set[str] = set()
    for token in tokens:
        token_set.add(token)
        token_set.add(shared.normalize_token(token))
    numbers = [int(match) for match in re.findall(r"\d+", normalized)]
    return NormalizedUtterance(
        original=query,
        text=normalized,
        tokens=tokens,
        token_set=token_set,
        numbers=numbers,
    )


def _term_present(term: str, utterance: NormalizedUtterance) -> bool:
    term = term.lower()
    if " " in term or "/" in term:
        return term in utterance.text
    return term in utterance.token_set


def _resolve_default(slot: SlotSpec, shared: SharedResources) -> Any:
    if slot.type == "date":
        return _default_date(slot.default)
    if slot.type == "range":
        return _default_range(slot.default, shared)
    return slot.default


def _default_date(default: Any) -> date:
    today = date.today()
    if isinstance(default, str):
        label = default.lower()
        if label == "today":
            return today
        if label == "yesterday":
            return today - timedelta(days=1)
    if isinstance(default, date):
        return default
    return today


def _default_range(default: Any, shared: SharedResources) -> Dict[str, Any]:
    label = default or shared.default_range
    if isinstance(label, dict):
        return label
    return build_range_value(label)


def _validate_slot(slot: SlotSpec, value: Any) -> None:
    if value is None:
        if slot.required:
            raise SlotValidationError(f"{slot.name} required")
        return
    for validator in slot.validators:
        if validator == "required":
            if _is_empty(value):
                raise SlotValidationError(f"{slot.name} required")
        elif validator.startswith("gte:"):
            threshold = float(validator.split(":", 1)[1])
            numeric = _as_float(value)
            if numeric < threshold:
                raise SlotValidationError(f"{slot.name} must be >= {threshold}")
        elif validator.startswith("enum:"):
            options = [item.strip() for item in validator.split(":", 1)[1].split(",")]
            if value not in options:
                raise SlotValidationError(f"{slot.name} invalid value")


def _is_empty(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    if isinstance(value, (list, tuple, set, dict)):
        return len(value) == 0
    return False


def _as_float(value: Any) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    if hasattr(value, "__float__"):
        return float(value)  # type: ignore[arg-type]
    raise SlotValidationError("Unable to convert value to float")


def extract_date(
    slot: SlotSpec,
    utterance: NormalizedUtterance,
    _shared: SharedResources,
    _values: Dict[str, Any],
) -> Optional[date]:
    candidate = _find_explicit_date(utterance.text)
    if candidate:
        return candidate
    weekday = _find_weekday(utterance.text)
    if weekday is not None:
        return _resolve_weekday(weekday)
    if slot.default is not None:
        return _default_date(slot.default)
    return None


def _find_explicit_date(text: str) -> Optional[date]:
    iso_match = re.search(r"\b(20\d{2})-(\d{1,2})-(\d{1,2})\b", text)
    if iso_match:
        year, month, day = map(int, iso_match.groups())
        return _safe_date(year, month, day)
    slash_match = re.search(r"\b(\d{1,2})/(\d{1,2})/(20\d{2})\b", text)
    if slash_match:
        day, month, year = map(int, slash_match.groups())
        return _safe_date(year, month, day)
    dash_match = re.search(r"\b(\d{1,2})-(\d{1,2})-(20\d{2})\b", text)
    if dash_match:
        day, month, year = map(int, dash_match.groups())
        return _safe_date(year, month, day)
    month_match = re.search(
        r"\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:,\s*(\d{4}))?\b",
        text,
    )
    if month_match:
        month_str = month_match.group(0).split()[0][:3]
        month_index = MONTH_LOOKUP.get(month_str)
        day = int(month_match.group(1))
        year = int(month_match.group(2) or date.today().year)
        if month_index:
            return _safe_date(year, month_index, day)
    reverse_match = re.search(
        r"\b(\d{1,2})\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*(?:\s+(\d{4}))?\b",
        text,
    )
    if reverse_match:
        day = int(reverse_match.group(1))
        month_part = reverse_match.group(0).split()[1][:3]
        month_index = MONTH_LOOKUP.get(month_part)
        year = int(reverse_match.group(2) or date.today().year)
        if month_index:
            return _safe_date(year, month_index, day)
    return None


def _safe_date(year: int, month: int, day: int) -> Optional[date]:
    try:
        return date(year, month, day)
    except ValueError:
        return None


def _find_weekday(text: str) -> Optional[int]:
    for name, index in WEEKDAY_LOOKUP.items():
        if name in text:
            return index
    return None


def _resolve_weekday(target_weekday: int) -> date:
    today = date.today()
    delta = (target_weekday - today.weekday()) % 7
    return today + timedelta(days=delta)


def extract_enum(
    slot: SlotSpec,
    utterance: NormalizedUtterance,
    shared: SharedResources,
    _values: Dict[str, Any],
) -> Optional[str]:
    if slot.meta.get("enum") == "meal":
        for token in utterance.tokens:
            meal = shared.meal_from_token(token)
            if meal:
                return meal
    if slot.default is not None:
        return slot.default
    return None


def extract_range(
    slot: SlotSpec,
    utterance: NormalizedUtterance,
    shared: SharedResources,
    _values: Dict[str, Any],
) -> Dict[str, Any]:
    text = utterance.text
    for phrase, range_key in _range_phrases(shared).items():
        if phrase in text:
            return build_range_value(range_key)
    if slot.default:
        return build_range_value(slot.default)
    return build_range_value(shared.default_range)


def _range_phrases(shared: SharedResources) -> Dict[str, str]:
    phrases: Dict[str, str] = {}
    for alias, range_key in shared.range_lookup.items():
        phrases[alias] = range_key
    sorted_items = dict(sorted(phrases.items(), key=lambda item: -len(item[0])))
    return sorted_items


def build_range_value(range_key: str) -> Dict[str, Any]:
    today = date.today()
    if range_key == "today":
        start = end = today
    elif range_key == "yesterday":
        start = end = today - timedelta(days=1)
    elif range_key == "this_week":
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6)
    elif range_key == "this_month":
        start = today.replace(day=1)
        next_month = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
        end = next_month - timedelta(days=1)
    else:
        start = end = today
    return {
        "label": range_key,
        "start_date": start,
        "end_date": end,
    }


def extract_int(
    slot: SlotSpec,
    utterance: NormalizedUtterance,
    _shared: SharedResources,
    values: Dict[str, Any],
) -> Optional[int]:
    if slot.extractor == "buffer_qty":
        return extract_buffer_qty(slot, utterance, _shared, values)
    if slot.extractor == "menu_item_id":
        return extract_menu_item_id(slot, utterance, _shared, values)
    if not utterance.numbers:
        return slot.default
    return utterance.numbers[0]


def extract_buffer_qty(
    _slot: SlotSpec,
    utterance: NormalizedUtterance,
    _shared: SharedResources,
    _values: Dict[str, Any],
) -> Optional[int]:
    if not utterance.numbers:
        return None
    return utterance.numbers[-1]


def extract_menu_item_id(
    _slot: SlotSpec,
    utterance: NormalizedUtterance,
    _shared: SharedResources,
    _values: Dict[str, Any],
) -> Optional[int]:
    match = re.search(r"\b(?:id|item)\s*(\d+)\b", utterance.text)
    if match:
        return int(match.group(1))
    if len(utterance.numbers) >= 2:
        return utterance.numbers[0]
    if utterance.numbers:
        return utterance.numbers[0]
    return None


def extract_limit(
    slot: SlotSpec,
    utterance: NormalizedUtterance,
    _shared: SharedResources,
    _values: Dict[str, Any],
) -> int:
    numbers = utterance.numbers
    if numbers:
        return numbers[-1]
    return int(slot.default or 10)


def extract_customer_query(
    slot: SlotSpec,
    utterance: NormalizedUtterance,
    shared: SharedResources,
    values: Dict[str, Any],
) -> Optional[str]:
    digits = re.search(r"\b\d{9,}\b", utterance.text)
    if digits:
        return digits.group(0)
    stopwords = {"customer", "customers", "orders", "order", "for", "this", "month", "week", "address", "addresses", "show"}
    remaining = [
        token
        for token in utterance.tokens
        if token not in stopwords
        and shared.meal_from_token(token) is None
        and token not in WEEKDAY_LOOKUP
        and not re.fullmatch(r"\d+", token)
    ]
    if remaining:
        return " ".join(remaining).strip()
    return slot.default


def extract_item_name(
    slot: SlotSpec,
    utterance: NormalizedUtterance,
    shared: SharedResources,
    values: Dict[str, Any],
) -> Optional[str]:
    stopwords = {"update", "set", "buffer", "for", "to", "show", "today", "this", "week", "month", "dinner", "lunch", "breakfast", "condiments", "breakfast", "dinner", "lunch"}
    stopwords.update(WEEKDAY_LOOKUP.keys())
    stopwords.update(shared.range_lookup.keys())
    filtered = [
        token
        for token in utterance.tokens
        if token not in stopwords
        and shared.meal_from_token(token) is None
        and not re.fullmatch(r"\d+", token)
    ]
    if filtered:
        return " ".join(filtered)
    return slot.default


def extract_string(
    slot: SlotSpec,
    utterance: NormalizedUtterance,
    _shared: SharedResources,
    _values: Dict[str, Any],
) -> Optional[str]:
    return slot.default


SLOT_EXTRACTORS: Dict[str, Any] = {
    "date": extract_date,
    "enum": extract_enum,
    "range": extract_range,
    "int": extract_int,
    "limit": extract_limit,
    "buffer_qty": extract_buffer_qty,
    "menu_item_id": extract_menu_item_id,
    "customer_query": extract_customer_query,
    "item_name": extract_item_name,
    "string": extract_string,
}


MONTH_LOOKUP = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "sept": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}

WEEKDAY_LOOKUP = {
    "monday": 0,
    "mon": 0,
    "tuesday": 1,
    "tue": 1,
    "wednesday": 2,
    "wed": 2,
    "thursday": 3,
    "thu": 3,
    "thurs": 3,
    "friday": 4,
    "fri": 4,
    "saturday": 5,
    "sat": 5,
    "sunday": 6,
    "sun": 6,
}


def sanitize_slots(slots: Mapping[str, Any]) -> Dict[str, Any]:
    sanitized: Dict[str, Any] = {}
    for key, value in slots.items():
        sanitized[key] = _sanitize_slot_value(value)
    return sanitized


def _sanitize_slot_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: _sanitize_slot_value(inner)
            for key, inner in value.items()
        }
    if isinstance(value, date):
        return value.isoformat()
    return value


def _range_params(slots: Mapping[str, Any]) -> Dict[str, Any]:
    window = slots.get("range")
    if isinstance(window, dict):
        return {
            "start_date": window.get("start_date"),
            "end_date": window.get("end_date"),
        }
    return {}


def execute_get_menu(match: IntentMatch, db: Session) -> Dict[str, Any]:
    params = {
        "date": match.slots.get("date"),
        "bld_type": match.slots.get("bld_type"),
    }
    query = match.intent.sql["query"]
    result = db.execute(text(query), params)
    rows = [dict(row) for row in result.mappings().all()]
    if not rows:
        return {
            "intent": match.intent.id,
            "slots": sanitize_slots(match.slots),
            "data": [],
            "message": match.intent.responses.get("not_found_message"),
        }
    return {
        "intent": match.intent.id,
        "slots": sanitize_slots(match.slots),
        "data": rows,
        "note": match.intent.responses.get("success_note"),
    }


def execute_get_menu_buffer(match: IntentMatch, db: Session) -> Dict[str, Any]:
    return execute_get_menu(match, db)


def execute_count_orders(match: IntentMatch, db: Session) -> Dict[str, Any]:
    params = _range_params(match.slots)
    query = match.intent.sql["query"]
    result = db.execute(text(query), params)
    row = result.mappings().first()
    data = dict(row) if row else {"order_count": 0}
    return {
        "intent": match.intent.id,
        "slots": sanitize_slots(match.slots),
        "data": data,
        "note": match.intent.responses.get("success_note"),
    }


def execute_order_totals(match: IntentMatch, db: Session) -> Dict[str, Any]:
    params = _range_params(match.slots)
    query = match.intent.sql["query"]
    result = db.execute(text(query), params)
    row = result.mappings().first()
    data = dict(row) if row else {"total_sales": 0, "total_orders": 0}
    return {
        "intent": match.intent.id,
        "slots": sanitize_slots(match.slots),
        "data": data,
    }


def execute_top_items(match: IntentMatch, db: Session) -> Dict[str, Any]:
    params = _range_params(match.slots)
    params["limit"] = match.slots.get("limit") or match.intent.sql.get("default_limit", 10)
    query = match.intent.sql["query"]
    result = db.execute(text(query), params)
    rows = [dict(row) for row in result.mappings().all()]
    return {
        "intent": match.intent.id,
        "slots": sanitize_slots(match.slots),
        "data": rows,
    }


def execute_customer_orders(match: IntentMatch, db: Session) -> Dict[str, Any]:
    query_text = match.slots.get("customer_query")
    customer = resolve_customer(db, query_text)
    if customer is None:
        return {
            "intent": match.intent.id,
            "slots": sanitize_slots(match.slots),
            "data": [],
            "message": match.intent.responses.get("not_found_message") or "Customer not found",
        }
    params = _range_params(match.slots)
    params["customer_id"] = customer["customer_id"]
    query = match.intent.sql["query"]
    result = db.execute(text(query), params)
    rows = [dict(row) for row in result.mappings().all()]
    slots = dict(match.slots)
    slots["customer"] = {
        "customer_id": customer["customer_id"],
        "name": customer["name"],
        "primary_mobile": customer.get("primary_mobile"),
    }
    return {
        "intent": match.intent.id,
        "slots": sanitize_slots(slots),
        "data": rows,
    }


def execute_customer_addresses(match: IntentMatch, db: Session) -> Dict[str, Any]:
    query_text = match.slots.get("customer_query")
    customer = resolve_customer(db, query_text)
    if customer is None:
        return {
            "intent": match.intent.id,
            "slots": sanitize_slots(match.slots),
            "data": [],
            "message": match.intent.responses.get("not_found_message") or "Customer not found",
        }
    params = {"customer_id": customer["customer_id"]}
    query = match.intent.sql["query"]
    result = db.execute(text(query), params)
    rows = [dict(row) for row in result.mappings().all()]
    slots = dict(match.slots)
    slots["customer"] = {
        "customer_id": customer["customer_id"],
        "name": customer["name"],
        "primary_mobile": customer.get("primary_mobile"),
    }
    return {
        "intent": match.intent.id,
        "slots": sanitize_slots(slots),
        "data": rows,
    }


def resolve_customer(db: Session, query_text: Optional[str]) -> Optional[Dict[str, Any]]:
    if not query_text:
        return None
    if query_text.isdigit():
        result = db.execute(
            text(
                """
                SELECT customer_id, name, primary_mobile
                FROM customers
                WHERE primary_mobile = :phone
                LIMIT 1
                """
            ),
            {"phone": query_text},
        )
        row = result.mappings().first()
        if row:
            return dict(row)
    like_value = f"%{query_text.strip()}%"
    result = db.execute(
        text(
            """
            SELECT customer_id, name, primary_mobile
            FROM customers
            WHERE name LIKE :name_like
            ORDER BY
                CASE WHEN LOWER(name) = LOWER(:exact) THEN 0 ELSE 1 END,
                name
            LIMIT 1
            """
        ),
        {"name_like": like_value, "exact": query_text.strip()},
    )
    row = result.mappings().first()
    return dict(row) if row else None


def execute_set_buffer_by_id(match: IntentMatch, db: Session) -> Dict[str, Any]:
    params = {
        "buffer_qty": match.slots.get("buffer_qty"),
        "menu_item_id": match.slots.get("menu_item_id"),
    }
    update_query = match.intent.sql["query"]
    db.execute(text(update_query), params)
    db.commit()
    select_query = match.intent.sql.get("follow_up")
    data: List[Dict[str, Any]] = []
    if select_query:
        result = db.execute(text(select_query), {"menu_item_id": params["menu_item_id"]})
        data = [dict(row) for row in result.mappings().all()]
    return {
        "intent": match.intent.id,
        "slots": sanitize_slots(match.slots),
        "data": data,
        "note": match.intent.responses.get("success_note"),
    }


def execute_set_buffer_by_name(match: IntentMatch, db: Session) -> Dict[str, Any]:
    item_name = (match.slots.get("item_name") or "").strip()
    buffer_qty = match.slots.get("buffer_qty")
    target_date = match.slots.get("date")
    meal = match.slots.get("bld_type")
    if not item_name:
        return {
            "intent": match.intent.id,
            "slots": sanitize_slots(match.slots),
            "data": [],
            "message": match.intent.responses.get("not_found_message"),
        }
    rows = find_menu_items_by_name(db, item_name, target_date, meal)
    if not rows:
        return {
            "intent": match.intent.id,
            "slots": sanitize_slots(match.slots),
            "data": [],
            "message": match.intent.responses.get("not_found_message"),
        }
    if len(rows) > 1:
        return {
            "intent": match.intent.id,
            "slots": sanitize_slots(match.slots),
            "data": rows,
            "message": match.intent.responses.get("disambiguation_message", "Multiple matches found"),
        }
    menu_item_id = rows[0]["menu_item_id"]
    db.execute(
        text(
            """
            UPDATE menu_items
            SET buffer_qty = :buffer_qty
            WHERE menu_item_id = :menu_item_id
            """
        ),
        {"buffer_qty": buffer_qty, "menu_item_id": menu_item_id},
    )
    db.commit()
    refreshed = fetch_menu_item(db, menu_item_id)
    return {
        "intent": match.intent.id,
        "slots": sanitize_slots({**match.slots, "resolved_menu_item_id": menu_item_id}),
        "data": refreshed,
        "note": match.intent.responses.get("success_note"),
    }


def find_menu_items_by_name(
    db: Session,
    name: str,
    target_date: Optional[date],
    meal: Optional[str],
) -> List[Dict[str, Any]]:
    base_params: Dict[str, Any] = {
        "target_date": target_date,
        "meal": meal,
        "exact": name.lower(),
        "prefix": f"{name.lower()}%",
        "contains": f"%{name.lower()}%",
    }
    conditions = [
        "LOWER(i.name) = :exact",
        "LOWER(i.alias) = :exact",
        "LOWER(i.name) LIKE :prefix",
        "LOWER(i.name) LIKE :contains",
    ]
    for condition in conditions:
        query = f"""
        SELECT
            mi.menu_item_id,
            i.item_id,
            i.name AS item_name,
            b.bld_type,
            mi.buffer_qty,
            mi.final_qty,
            mi.planned_qty,
            mi.available_qty
        FROM menu m
        JOIN bld b ON b.bld_id = m.bld_id
        JOIN menu_items mi ON mi.menu_id = m.menu_id
        JOIN items i ON i.item_id = mi.item_id
        WHERE m.date = :target_date
          AND (:meal IS NULL OR b.bld_type = :meal)
          AND {condition}
        ORDER BY b.bld_type, i.name
        LIMIT 5
        """
        result = db.execute(text(query), base_params)
        rows = [dict(row) for row in result.mappings().all()]
        if rows:
            return rows
    return []


def fetch_menu_item(db: Session, menu_item_id: int) -> List[Dict[str, Any]]:
    result = db.execute(
        text(
            """
            SELECT
                mi.menu_item_id,
                m.date,
                b.bld_type,
                i.item_id,
                i.name AS item_name,
                mi.buffer_qty,
                mi.final_qty,
                mi.planned_qty,
                mi.available_qty
            FROM menu_items mi
            JOIN menu m ON m.menu_id = mi.menu_id
            JOIN bld b ON b.bld_id = m.bld_id
            JOIN items i ON i.item_id = mi.item_id
            WHERE mi.menu_item_id = :menu_item_id
            """
        ),
        {"menu_item_id": menu_item_id},
    )
    return [dict(row) for row in result.mappings().all()]


def execute_admin_logs(match: IntentMatch, db: Session) -> Dict[str, Any]:
    params = {"limit": match.slots.get("limit") or match.intent.sql.get("default_limit", 10)}
    query = match.intent.sql["query"]
    result = db.execute(text(query), params)
    rows = [dict(row) for row in result.mappings().all()]
    return {
        "intent": match.intent.id,
        "slots": sanitize_slots(match.slots),
        "data": rows,
    }


EXECUTORS: Dict[str, Any] = {
    "GET_MENU": execute_get_menu,
    "GET_MENU_BUFFER": execute_get_menu_buffer,
    "GET_ORDER_COUNT": execute_count_orders,
    "GET_ORDER_TOTALS": execute_order_totals,
    "GET_TOP_ITEMS": execute_top_items,
    "GET_CUSTOMER_ORDERS": execute_customer_orders,
    "GET_CUSTOMER_ADDRESSES": execute_customer_addresses,
    "SET_MENU_BUFFER_BY_ID": execute_set_buffer_by_id,
    "SET_MENU_BUFFER_BY_NAME": execute_set_buffer_by_name,
    "GET_ADMIN_LOGS_RECENT": execute_admin_logs,
}
