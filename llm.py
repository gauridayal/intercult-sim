"""Thin wrapper around an OpenAI-compatible chat completions endpoint.

Works against the real OpenAI API or any self-hosted OpenAI-compatible
server (vLLM, Ollama, LM Studio, etc.) -- configure via environment
variables, see .env / README.md.
"""

import os

from openai import OpenAI


def get_client() -> OpenAI:
    return OpenAI(
        api_key=os.environ.get("OPENAI_API_KEY", "not-required"),
        base_url=os.environ.get("OPENAI_API_BASE_URL") or None,
    )


def get_model() -> str:
    return os.environ.get("OPENAI_MODEL", "gpt-4o-mini")


def generate_reply(
    client: OpenAI,
    model: str,
    system_prompt: str,
    history: list[dict],
    max_tokens: int = 320,
    temperature: float = 0.8,
) -> str:
    """history is a list of {"role": "user"|"assistant", "content": str}."""
    messages = [{"role": "system", "content": system_prompt}] + history
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return (response.choices[0].message.content or "").strip()
