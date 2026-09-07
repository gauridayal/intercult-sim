"""Vercel Python serverless entry point.

Vercel's Python runtime looks for a WSGI `app` in files under /api. This
just re-exports the real Flask app from the project root so app.py stays
the single source of truth (and still runs directly with `python app.py`
locally).
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import app  # noqa: E402
