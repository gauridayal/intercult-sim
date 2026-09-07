# Intercultural Communication Simulator

You're given a character and a short situation brief, then you talk
freely (no menus, no multiple choice) to an AI-controlled character
until the scene reaches a natural resolution or the turn budget runs
out. Two frontends -- a terminal version and a web app -- share the
same scenario data and conversation logic.

## Setup

```
pip install -r requirements.txt
```

Model/endpoint config lives in `.env` (already set up to point at the
local Qwen3-Coder server: `OPENAI_API_KEY`, `OPENAI_API_BASE_URL`,
`OPENAI_MODEL`). Point those at a different OpenAI-compatible endpoint
(including regular OpenAI) any time by editing `.env`. Both frontends
read the same file.

### Terminal

```
python main.py
```

### Web app

```
python app.py
```

Then open **http://127.0.0.1:5000**. Same scenarios, same engine, a
browser UI instead of a terminal -- pastel-themed, no build step
(plain HTML/CSS/vanilla JS, served by Flask).

## Architecture

- `scenarios/*.json` -- one file per scenario. Each defines the player's
  character, the AI character, a briefing shown before the chat starts,
  a system prompt that fully governs how the AI character behaves, an
  opening line, and a turn budget (`min_turns`/`max_turns`). Add a new
  scenario by dropping in a new JSON file -- `scenarios/loader.py`
  discovers and validates it automatically; no code changes needed in
  either frontend.
- `llm.py` -- thin wrapper around the OpenAI-compatible chat completions
  API. Swappable backend in one place, shared by both frontends.
- `conversation.py` -- transport-agnostic turn logic shared by both
  frontends: builds the per-turn pacing note, trims overly long replies
  down to one paragraph, and decides when a scene has ended or hit its
  turn limit. Neither frontend talks to the model or interprets its
  reply directly -- they both go through here.
- `engine.py` / `main.py` -- the terminal frontend: prints the briefing
  and opening line, then alternates player input / model reply in a
  loop.
- `app.py` -- the web frontend: a small Flask app. `GET /` renders the
  scenario menu (public scenario fields only -- system prompts and end
  tokens never reach the browser); `POST /api/chat` takes the running
  message history and returns the next reply, mirroring `engine.py`'s
  turn loop over HTTP instead of stdin/stdout.
- `templates/index.html`, `static/styles.css`, `static/app.js` -- the
  browser UI. Plain HTML/CSS/vanilla JS, no framework or build step --
  chosen because Node.js isn't usable in this environment.

## Scenarios included

1. **Secondary Inspection** -- an undeclared family heirloom at
   Australian biosecurity, based on the airport scenario. Two-phase and
   deliberately hard to navigate quickly: even a clean explanation of
   the biosecurity issue only closes phase one, and Officer Mitchell
   carries real, subtly-coded bias (never slurs, never overt) that has
   to be handled with care, not just argued with. min 14 / max 22 turns.
2. **The Silent Meeting** -- deciding whether to speak up about an
   unrealistic deadline in a virtual team meeting, based on the "Silent
   Meeting" scenario. Unlike the original A/B/C/D framing, this one
   plays out however you actually respond in the moment.
3. **A Seat at the Table** -- dinner with a colleague at a traditional
   Ethiopian restaurant in Addis Ababa, starting with ordering food and
   opening into something more personal (the *gursha* hand-feeding
   tradition, and why tonight matters to your host). Includes a
   misunderstanding/repair beat -- Selam doesn't assume good intent if
   your wording could read as dismissive, and the scene's warmth depends
   on whether you notice and repair it. Original scenario.
4. **The Redemption Arc** -- a live TV interview where the host has
   already decided your immigrant-chef story is about escaping poverty
   in India, and keeps circling back to that assumption no matter how
   plainly you correct her. Loosely inspired by a real exchange chef
   Vikas Khanna had with a BBC interviewer (his own sense of hunger
   came from working his way up in New York, not from Amritsar, where
   community kitchens mean people don't go hungry) -- built around an
   original character rather than scripting dialogue for a real person.
   Original scenario.
5. **Rough Cut** -- a five-person senior thesis film team at USC's
   School of Cinematic Arts, hours before their screening, after a
   teammate quietly re-cut the ending alone rather than raise his
   disagreement directly in group crits. Can resolve as a genuine blend
   of both creative visions or as a harder line, depending on how the
   conversation goes. Original scenario.

## Reply length

AI-character replies are deliberately kept short (roughly 2-3
sentences, single paragraph) so they don't overwhelm or steer your own
response -- enforced via the system prompt, a capped `max_tokens`, and a
code-level backstop in `conversation.py` (`trim_reply`) that keeps only
the first paragraph if a model ignores the instruction. The
conversation still has direction: each turn tells the model how many
exchanges are left so it paces toward a resolution instead of rambling
or stalling.

## Deploying the web app

Your Qwen server is on a private LAN address, so it's only reachable
from something running on the same network -- that's why local
(`python app.py`) is the tested path. To actually deploy:

- **Vercel** -- `api/index.py` and `vercel.json` are already set up
  (Vercel's Python runtime, routed so the one Flask app serves
  everything). Push this repo to GitHub and import it in the Vercel
  dashboard -- their cloud does the build, no local Node or Vercel CLI
  needed. You'll need to either point `OPENAI_API_BASE_URL` (set as a
  Vercel project env var) at something the internet can reach -- a
  tunnel to the LAN server, or a real hosted API -- since Vercel's
  servers can't reach a private LAN IP either. This deployment path is
  untested from here (no Vercel account access) -- double check against
  Vercel's current Python docs if something doesn't line up.
- **A Python-native host** (Render, Railway, Fly.io, etc.) would run
  `app.py` closer to how Flask actually works (a persistent process
  rather than a serverless function per request) -- generally less
  configuration friction if Vercel's Python setup gives you trouble.

### Note on changes from the source material

- Scenario 2 didn't name the player's character in the original brief,
  so a placeholder name (**Rohan Verma**) was added for consistency with
  scenario 1. Change it in `scenarios/silent_meeting.json`
  (`player.name`) if you'd rather use something else -- nothing else
  needs to change.
- In scenario 2, the Indian colleague who privately raises concerns is
  handled as background/narration by Anna rather than as a second live
  chat partner, to keep the interface to one conversation at a time
  (matching scenario 1's single-officer format). Anna will reference
  what the colleague said if it comes up.
- Scenario 1 (Secondary Inspection) was substantially reworked: it now
  has two phases instead of one, and Officer Mitchell carries real,
  deliberately subtle bias -- generalizing comments framed as
  professional caution, extra suspicion that isn't quite proportionate,
  slower to give benefit of the doubt. It's written to never use slurs
  or overt hate speech, and to visibly (if only partially) respond if
  you name what's happening calmly and clearly. Turn budget went from
  9/16 to 14/22 so it can't be resolved in a handful of messages.
- Scenario 4 (The Redemption Arc) is inspired by a real 2020 exchange
  between chef Vikas Khanna and a BBC interviewer, researched for this
  scenario: asked whether his "sense of hunger" came from a poor
  upbringing in India, he corrected that his real struggle was working
  up from dishwasher in New York, not Amritsar, where Sikh community
  kitchens (langars) mean people don't go hungry. Rather than script
  dialogue for Khanna himself, the scenario uses an original character
  (Chef Devika Rao) built around the same dynamic.
