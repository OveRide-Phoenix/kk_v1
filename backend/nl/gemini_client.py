from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from zoneinfo import ZoneInfo

import google.generativeai as genai

from .sql_prompt import build_system_prompt


class GeminiClientError(Exception):
    """Raised when the Gemini API call fails or returns an unexpected payload."""


@dataclass
class GeminiConfig:
    api_key: str
    model: str = "gemini-2.0-flash-lite"


class GeminiSQLClient:
    def __init__(self, *, config: Optional[GeminiConfig] = None):
        api_key = (config.api_key if config else None) or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise GeminiClientError(
                "GEMINI_API_KEY is not configured. Set the environment variable to enable NL→SQL."
            )
        self.config = config or GeminiConfig(api_key=api_key)
        genai.configure(api_key=self.config.api_key)

    def generate_sql(self, *, query: str, allow_update: bool) -> str:
        system_prompt = build_system_prompt(
            today=self._today_label(),
            allow_update=allow_update,
        )
        model = genai.GenerativeModel(
            model_name=self.config.model,
            system_instruction=system_prompt,
        )
        try:
            response = model.generate_content(
                [{"role": "user", "parts": [query]}],
                generation_config={
                    "temperature": 0.1,
                    "max_output_tokens": 512,
                },
            )
        except Exception as exc:  # pragma: no cover - external API
            raise GeminiClientError(f"Gemini API call failed: {exc}") from exc

        if not response or not getattr(response, "text", None):
            raise GeminiClientError("Gemini API returned an empty response.")

        return response.text

    @staticmethod
    def _today_label() -> str:
        ist_today = datetime.now(ZoneInfo("Asia/Kolkata")).date()
        return ist_today.isoformat()
