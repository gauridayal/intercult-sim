"""Web frontend for the intercultural communication simulator.

Local dev:  python app.py
Reuses the same scenarios/ data and llm.py backend as the terminal
version (main.py) -- only the transport (HTTP instead of a terminal
loop) differs. See conversation.py for the shared turn-processing logic.
"""

import json
import os
from datetime import datetime, timezone

from flask import Flask, jsonify, render_template, request

from analysis import record_and_save
from conversation import build_system_prompt, process_reply
from llm import generate_reply, get_client, get_model
from scenarios.loader import load_scenarios

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = Flask(__name__)

_client = get_client()
_model = get_model()


def public_scenario(scenario: dict) -> dict:
    """Strip fields the browser has no business seeing -- the system prompt
    and persona anchor that govern the AI character, and the token that
    ends the scene."""
    return {
        k: v
        for k, v in scenario.items()
        if k not in ("system_prompt", "end_signal", "persona_anchor")
    }


def get_scenario_or_none(scenario_id: str) -> dict | None:
    for s in load_scenarios():
        if s["id"] == scenario_id:
            return s
    return None


@app.route("/")
def index():
    scenarios = [public_scenario(s) for s in load_scenarios()]
    return render_template("index.html", scenarios_json=json.dumps(scenarios))


@app.route("/api/chat", methods=["POST"])
def chat():
    body = request.get_json(silent=True) or {}
    scenario_id = body.get("scenarioId")
    history = body.get("history")

    if not scenario_id or not isinstance(history, list):
        return jsonify({"error": "scenarioId and history are required"}), 400

    scenario = get_scenario_or_none(scenario_id)
    if scenario is None:
        return jsonify({"error": "Unknown scenario"}), 404

    turn = sum(1 for m in history if m.get("role") == "user")
    if turn < 1:
        return jsonify({"error": "History must include at least one user message"}), 400

    system_prompt = build_system_prompt(scenario, turn)
    clean_history = [{"role": m["role"], "content": m["content"]} for m in history]

    try:
        raw_reply = generate_reply(_client, _model, system_prompt, clean_history)
    except Exception as exc:  # noqa: BLE001 -- surface any backend error to the client
        return jsonify({"error": str(exc)}), 502

    reply, ended, limit_reached = process_reply(scenario, turn, raw_reply)

    if ended or limit_reached:
        full_history = clean_history + [{"role": "assistant", "content": reply}]
        record_and_save(
            _client,
            _model,
            scenario,
            full_history,
            ended_reason="resolved" if ended else "turn_limit",
            started_at=body.get("startedAt") or datetime.now(timezone.utc).isoformat(),
            participant=body.get("participant"),
        )

    return jsonify(
        {
            "reply": reply,
            "ended": ended,
            "limitReached": limit_reached,
            "turn": turn,
            "maxTurns": scenario["max_turns"],
        }
    )


@app.route("/api/end", methods=["POST"])
def end_conversation():
    """Lets the player end a scene on their own terms instead of only via the
    model's own end signal or the turn limit. Still produces the same
    post-conversation analysis record as a natural ending."""
    body = request.get_json(silent=True) or {}
    scenario_id = body.get("scenarioId")
    history = body.get("history")

    if not scenario_id or not isinstance(history, list):
        return jsonify({"error": "scenarioId and history are required"}), 400

    scenario = get_scenario_or_none(scenario_id)
    if scenario is None:
        return jsonify({"error": "Unknown scenario"}), 404

    clean_history = [{"role": m["role"], "content": m["content"]} for m in history]
    if not any(m["role"] == "user" for m in clean_history):
        return jsonify({"error": "History must include at least one user message"}), 400

    record_and_save(
        _client,
        _model,
        scenario,
        clean_history,
        ended_reason="user_ended",
        started_at=body.get("startedAt") or datetime.now(timezone.utc).isoformat(),
        participant=body.get("participant"),
    )

    return jsonify({"ok": True})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, port=port)
