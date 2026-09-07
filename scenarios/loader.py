"""Discovers scenario definitions from *.json files in this folder.

To add a new scenario: drop a new JSON file in this directory following
the same schema as the existing ones. No code changes needed -- it will
show up in the main menu automatically.
"""

import json
from pathlib import Path

SCENARIOS_DIR = Path(__file__).parent

REQUIRED_FIELDS = [
    "id", "title", "tagline", "location", "player", "ai_character",
    "briefing", "system_prompt", "opening_line", "end_signal",
    "min_turns", "max_turns",
]


def load_scenarios() -> list[dict]:
    scenarios = []
    for path in sorted(SCENARIOS_DIR.glob("*.json")):
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        missing = [field for field in REQUIRED_FIELDS if field not in data]
        if missing:
            raise ValueError(f"{path.name} is missing required fields: {missing}")
        scenarios.append(data)
    scenarios.sort(key=lambda s: s.get("order", 999))
    return scenarios
