"""Terminal conversation loop that plays out any scenario dict against the LLM."""

import textwrap

from conversation import build_system_prompt, process_reply
from llm import generate_reply

WRAP_WIDTH = 88


def _print_wrapped(speaker: str, text: str) -> None:
    prefix = f"{speaker}: "
    wrapped = textwrap.fill(
        text,
        width=WRAP_WIDTH,
        initial_indent=prefix,
        subsequent_indent=" " * len(prefix),
    )
    print(f"\n{wrapped}\n")


def show_briefing(scenario: dict) -> None:
    print("\n" + "=" * WRAP_WIDTH)
    print(f"  {scenario['title']}")
    print(f"  {scenario['location']}")
    print("=" * WRAP_WIDTH)
    for para in scenario["briefing"]:
        print("\n" + textwrap.fill(para, width=WRAP_WIDTH))
    print(f"\n--- You are: {scenario['player']['name']} ---")
    print(textwrap.fill(scenario["player"]["bio"], width=WRAP_WIDTH))
    print(f"\n--- Talking to: {scenario['ai_character']['name']} ---")
    print(textwrap.fill(scenario["ai_character"]["bio"], width=WRAP_WIDTH))
    print("\n(Type 'quit' at any point to leave the scenario early.)")
    input("\nPress Enter when you're ready to begin...")


def run_scenario(client, model: str, scenario: dict) -> None:
    show_briefing(scenario)

    player_name = scenario["player"]["name"]
    ai_name = scenario["ai_character"]["name"]
    max_turns = scenario["max_turns"]

    history: list[dict] = []

    opening = scenario["opening_line"]
    _print_wrapped(ai_name, opening)
    history.append({"role": "assistant", "content": opening})

    for turn in range(1, max_turns + 1):
        try:
            user_input = input(f"{player_name} (you): ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n\nEnding scenario early.\n")
            return

        if not user_input:
            continue
        if user_input.lower() in ("quit", "exit"):
            print("\nEnding scenario early.\n")
            return

        history.append({"role": "user", "content": user_input})
        system_prompt = build_system_prompt(scenario, turn)

        try:
            raw_reply = generate_reply(client, model, system_prompt, history)
        except Exception as exc:  # noqa: BLE001 -- surface any backend error to the user
            print(f"\n[Error talking to the model: {exc}]")
            print("Try again, or type 'quit' to leave the scenario.\n")
            history.pop()
            continue

        reply, ended, limit_reached = process_reply(scenario, turn, raw_reply)

        _print_wrapped(ai_name, reply)
        history.append({"role": "assistant", "content": reply})

        if ended:
            print("--- Scene complete ---\n")
            return
        if limit_reached:
            print("--- Scene reached its turn limit ---\n")
            return
