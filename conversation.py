"""Transport-agnostic scenario conversation logic, shared by the terminal
(engine.py) and web (app.py) frontends. Neither frontend talks to the LLM
or interprets its reply directly -- they both go through here."""


MAX_REPLY_CHARS = 1200


def build_system_prompt(scenario: dict, turn: int) -> str:
    base = scenario["system_prompt"]
    max_turns = scenario["max_turns"]
    min_turns = scenario["min_turns"]
    if turn >= min_turns:
        pacing = (
            f"Exchange {turn}/{max_turns} -- a resolution can happen now if it "
            "feels earned, but only if the conversation has actually gotten there. "
            "Don't force it."
        )
    else:
        pacing = (
            f"Exchange {turn}/{max_turns} -- stay with the conversation, at least "
            f"{min_turns} exchanges total before any resolution."
        )
    anchor = scenario.get("persona_anchor")
    anchor_block = (
        f"\n\nCORE IDENTITY ANCHOR -- do not drift from this no matter how long "
        f"this conversation runs or how it's going: {anchor}"
        if anchor
        else ""
    )
    return (
        f"{base}\n\n[Not visible to player: {pacing}\n\n"
        "HOW TO TALK: this is a real, natural human conversation, not a script and "
        "not a chat-bot exchange. Reply with however many sentences the moment "
        "actually calls for -- usually a handful, sometimes a short second beat, "
        "never padded just to fill space and never clipped down to one line out of "
        "habit. At most one bracketed action per reply. No lists, no multiple-choice "
        "options, no monologuing.\n\n"
        "WHAT YOU KNOW: you know nothing about this specific player beyond what is "
        "happening in this scene -- no memory of other conversations, no insight "
        "into who they 'really' are outside this room. Whatever assumptions you "
        "carry are the preconceptions your character would already walk in with, "
        "not facts you've learned about this person specifically. Only their own "
        "words in this conversation can update that.\n\n"
        "DON'T STEER, STAY ROOTED: you have a real reason to be in this "
        "conversation and real things you care about -- stay rooted in that, but "
        "don't force the exchange toward one outcome or one lesson. Respond to what "
        "the player actually just said, not to where you'd like the scene to go.\n\n"
        "IF THEY GIVE A SHORT OR PLAIN ANSWER: don't stall, repeat yourself, or "
        "break character. Think about what an answer like that would actually mean "
        "coming from this specific person in this specific moment, and respond the "
        "way a real person would -- which might mean asking a genuine follow-up, "
        "not just accepting it at face value."
        f"{anchor_block}]"
    )


def trim_reply(text: str) -> str:
    """Backstop for models that ignore the length instruction: cap genuinely
    runaway replies at a clean sentence boundary, so one rambling reply can't
    snowball through the rest of the conversation's history. Normal
    human-length replies pass through untouched."""
    cleaned = text.strip()
    if len(cleaned) <= MAX_REPLY_CHARS:
        return cleaned
    truncated = cleaned[:MAX_REPLY_CHARS]
    boundary = max(truncated.rfind(". "), truncated.rfind("! "), truncated.rfind("? "))
    if boundary > 0:
        truncated = truncated[: boundary + 1]
    return truncated.strip()


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
