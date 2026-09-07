"""Transport-agnostic scenario conversation logic, shared by the terminal
(engine.py) and web (app.py) frontends. Neither frontend talks to the LLM
or interprets its reply directly -- they both go through here."""


def build_system_prompt(scenario: dict, turn: int) -> str:
    base = scenario["system_prompt"]
    max_turns = scenario["max_turns"]
    min_turns = scenario["min_turns"]
    if turn >= min_turns:
        pacing = f"Exchange {turn}/{max_turns} -- start steering toward a resolution."
    else:
        pacing = (
            f"Exchange {turn}/{max_turns} -- don't resolve yet, at least "
            f"{min_turns} exchanges total."
        )
    return (
        f"{base}\n\n[Not visible to player: {pacing} LENGTH LIMIT: at most 3 "
        "sentences of dialogue, ONE paragraph, at most ONE bracketed action total. "
        "Do not stack multiple actions or blank-line breaks in one reply.]"
    )


def trim_reply(text: str) -> str:
    """Backstop for models that ignore the length instruction: keep only the
    first paragraph, so one long-winded reply can't snowball through the
    rest of the conversation's history."""
    first_paragraph = text.strip().split("\n\n")[0].strip()
    return first_paragraph or text.strip()


def process_reply(scenario: dict, turn: int, raw_reply: str) -> tuple[str, bool, bool]:
    """Clean up a raw model reply and decide how the turn ends.

    Returns (cleaned_reply, ended, limit_reached). `ended` never fires
    before scenario['min_turns'], regardless of what the model emits --
    it's asked to pace itself, but that's not trusted on its own.
    """
    end_signal = scenario["end_signal"]
    ended = end_signal in raw_reply and turn >= scenario["min_turns"]
    cleaned = trim_reply(raw_reply.replace(end_signal, "").strip())
    limit_reached = not ended and turn >= scenario["max_turns"]
    return cleaned, ended, limit_reached
