"""Entry point for the intercultural communication simulator.

Run with: python main.py
"""

import os
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except AttributeError:
    pass

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from engine import run_scenario
from llm import get_client, get_model
from scenarios.loader import load_scenarios


def print_menu(scenarios: list[dict]) -> None:
    print("\n" + "=" * 60)
    print("  Intercultural Communication Simulator")
    print("=" * 60)
    print("\nChoose a scenario:\n")
    for i, s in enumerate(scenarios, start=1):
        print(f"  {i}. {s['title']}")
        print(f"     {s['tagline']}")
    print("\n  q. Quit")


def choose_scenario(scenarios: list[dict]) -> dict | None:
    print_menu(scenarios)
    choice = input("\n> ").strip().lower()
    if choice in ("q", "quit", "exit"):
        return None
    if choice.isdigit() and 1 <= int(choice) <= len(scenarios):
        return scenarios[int(choice) - 1]
    print("Not a valid choice.")
    return choose_scenario(scenarios)


def main() -> None:
    scenarios = load_scenarios()
    if not scenarios:
        print("No scenarios found in scenarios/.")
        sys.exit(1)

    client = get_client()
    model = get_model()

    while True:
        scenario = choose_scenario(scenarios)
        if scenario is None:
            print("\nGoodbye.\n")
            return
        run_scenario(client, model, scenario)


if __name__ == "__main__":
    main()
