# Intercultural Communication Simulator

You're given a character and a short situation brief, then you talk
freely (no menus, no multiple choice) to an AI-controlled character
until the scene reaches a natural resolution, the turn budget runs
out, or you choose to end it yourself. In every scenario you play an
Indian character; the AI character is visibly from somewhere else
(flag and country shown in the UI) and carries that character's own
specific, often biased preconceptions -- the point is to study how an
AI model handles intercultural bias and microaggressions in an
unscripted conversation, not to win a scripted exchange. Two frontends
-- a terminal version and a web app -- share the same scenario data
and conversation logic.

## Setup

```
pip install -r requirements.txt
```

Model/endpoint config lives in `.env` (already set up to point at the
local Qwen3-Coder server: `OPENAI_API_KEY`, `OPENAI_API_BASE_URL`,
`OPENAI_MODEL`). Point those at a different OpenAI-compatible endpoint
(including regular OpenAI) any time by editing `.env`. Both frontends
read the same file. See `.env.example` for every variable this project
reads, including the analysis-persistence ones covered below.

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
  frontends: builds the per-turn pacing note (natural conversational
  length, no knowledge of the specific player beyond the scene, don't
  force-steer, don't glitch on short answers -- see "Reply length and
  tone" below), caps genuinely runaway replies at a clean sentence
  boundary, and decides when a scene has ended or hit its turn limit.
  Neither frontend talks to the model or interprets its reply directly
  -- they both go through here.
- `analysis.py` -- once a scene ends (resolved, turn limit, or the
  player ending it early), makes one extra out-of-character call asking
  the model to analyze its own just-finished in-character performance,
  then persists the result. See "Post-conversation analysis" below.
- `engine.py` / `main.py` -- the terminal frontend: prints the briefing
  and opening line, then alternates player input / model reply in a
  loop. `quit`/`exit`, the natural end signal, and the turn limit all
  trigger the same post-conversation analysis before returning.
- `app.py` -- the web frontend: a small Flask app. `GET /` renders the
  scenario menu (public scenario fields only -- system prompts and end
  tokens never reach the browser); `POST /api/chat` takes the running
  message history and returns the next reply, mirroring `engine.py`'s
  turn loop over HTTP instead of stdin/stdout; `POST /api/end` lets the
  player end a scene on their own terms, producing the same analysis
  record a natural ending would.
- `templates/index.html`, `static/styles.css`, `static/app.js` -- the
  browser UI. Plain HTML/CSS/vanilla JS, no framework or build step --
  chosen because Node.js isn't usable in this environment.

Every request is stateless end to end: the backend never stores a
conversation anywhere, it only ever sees whatever history the caller
sends it, and it rebuilds the system prompt from the scenario file on
every single turn. Nothing about one playthrough carries into the
next, for anyone -- each run starts from the character's persona exactly
as written, not from anything "learned" in a previous session.

## Scenarios included

Every scenario puts you in an Indian character's shoes opposite an AI
character -- for 9 of the 10, visibly from somewhere else (the UI shows
a flag and country for both); one is intra-India, North vs South. The
player's own bio stays deliberately light -- a name, a mood, a reason
to be in the room -- because the player is a real person improvising,
not someone who should have to perform specialist knowledge of a
subculture they may not actually have. Names are also deliberately
spread across India's actual religious and regional range (Hindu,
Muslim, Sikh, Christian, Parsi; Punjabi, Gujarati, Tamil, Malayali,
Assamese, Marathi) rather than defaulting to one -- that default is
itself exactly the kind of unexamined assumption this project studies.
The AI character is the opposite: deliberately written in-depth, with
real researched history, named cultural/sociological concepts, and a
specific formative backstory driving its particular bias -- not a
costume, a person with a reason. It never knows anything about you as
a specific person beyond this one scene; only your own words update
that.

1. **Secondary Inspection** (🇮🇳 Aarav Sharma -> 🇦🇺 Officer Mitchell) --
   an undeclared family heirloom at Australian biosecurity. Two-phase
   and deliberately hard to navigate quickly: even a clean explanation
   of the biosecurity issue only closes phase one. Mitchell's bias is
   rooted in a specific childhood loss (his family's farm hit by a
   foot-and-mouth scare) and an unexamined pattern-match built from his
   own secondary-inspection caseload -- coded, never slurs. min 14 / max
   22 turns.
2. **The Silent Meeting** (🇮🇳 Zeeshan Ahmed -> 🇩🇪 Anna) -- deciding
   whether to speak up about an unrealistic deadline in a virtual team
   meeting. Anna's literal-silence-equals-agreement blind spot traces to
   one specific early-career incident and survives a cross-cultural
   workshop she can recite but hasn't actually internalized.
3. **A Seat at the Table** (🇮🇳 Neil Fernandes -> 🇪🇹 Selam Tesfaye) --
   dinner at a traditional Ethiopian restaurant in Addis Ababa, opening
   into the *gursha* hand-feeding tradition and why tonight matters to
   Selam specifically (her late grandmother, Ethiopian Orthodox fasting
   norms, a grief she hasn't shared with anyone in the city). A
   misunderstanding/repair beat -- she doesn't default to assuming good
   intent if your wording reads as dismissive. Original scenario.
4. **The Morning Show** (🇮🇳 Simran Kaur -> 🇬🇧 Claire Whitfield) -- a
   live UK morning-show interview where the host has already decided
   your immigrant-chef story is about escaping poverty in India. Claire's
   bias is Chimamanda Ngozi Adichie's "single story" problem in action,
   compounded by the fact that she pitched this exact narrative to her
   own producers before actually hearing your story. Loosely inspired by
   a real exchange chef Vikas Khanna had with a BBC interviewer; built
   around an original character. Original scenario.
5. **Screenplay** (🇮🇳 Freya Mistry -> 🇰🇷 Min-jun Cho) -- a USC senior
   thesis film team, hours before their screening, after a teammate
   quietly re-cut the ending alone. Min-jun tried three times, indirectly,
   to raise doubts in group crits (a real pattern sometimes named
   *chemyon*, face-saving disagreement) before anyone registered it as a
   real objection. Original scenario.
6. **What She Doesn't Know** (🇮🇳 Dr. Ananya Krishnan -> 🇨🇳 Lily Zhao) --
   a resident physician stopped in a hospital hallway by a patient's
   daughter asking her not to disclose a terminal diagnosis directly.
   Grounded in real family-mediated-disclosure practice in Chinese
   medical-ethics literature; Lily holds four distinct, specific concerns
   and tests each in turn. min 12 / max 20 turns. Original scenario.
7. **The Introduction** (🇮🇳 Meera Nair -> 🇳🇬 Chief Obiora Okafor) -- a
   formal Igbo family introduction at a compound in Enugu, opening with
   the kola nut ritual (a real covenant-establishing custom, not a
   photo-op). Chief Obiora's exacting standard traces to one specific
   family wound -- a nephew who moved abroad and missed even his
   grandmother's funeral rites. min 12 / max 20 turns. Original scenario.
8. **Mother Tongue** (🇮🇳 Gurpreet Singh <-> 🇮🇳 Vignesh Iyer) -- the one
   intra-India scenario: new flatmates in Bangalore, after Gurpreet
   (Punjabi) is overheard calling Vignesh's family (Tamil) "Madrasi."
   Grounded in real linguistic and political history -- the Dravidian
   vs. Indo-Aryan language distinction, the actual 1965 anti-Hindi
   agitations in Tamil Nadu, Bollywood's history of flattening South
   Indian characters. Original scenario.
9. **Straight Talk** (🇮🇳 Siddharth Kulkarni -> 🇮🇱 Noa Amrani) -- the day
   after an Israeli co-founder bluntly tore apart a product spec in front
   of the whole team. Grounded in real, named Israeli communication
   culture (*dugri*, documented in linguist Tamar Katriel's work) and
   Erin Meyer's cross-cultural "Culture Map" framework. Original
   scenario.
10. **The Bamboo Ceiling** (🇮🇳 Rituparna Das -> 🇺🇸 Brian Walsh) -- a
    promotion denial justified by vague "executive presence" feedback.
    Grounded in real, documented research (the "bamboo ceiling," the
    model minority myth's actual history, McKinsey/Ascend Foundation
    findings on Asian American promotion rates) -- Brian sincerely rates
    the player's technical skill highly, which is exactly what makes the
    bias harder to see. Original scenario.

Every AI character also carries a `persona_anchor` -- a compressed
core-identity reminder re-injected into the system prompt on *every*
turn, not just the first -- specifically so a long conversation doesn't
erode a rich persona back down into generic chatbot behavior as context
grows.

## Reply length and tone

AI-character replies are meant to read like an actual person talking,
not a scripted chat-bot turn: however many sentences the moment
actually calls for, usually a handful and occasionally a short second
beat, never padded to fill space and never clipped down to one line out
of habit. There's no hard sentence cap -- `conversation.py`'s
`trim_reply` only steps in as a backstop if a reply runs genuinely
long, capping it at a clean sentence boundary rather than mid-word.

Three behavioral rules are baked into the shared system-prompt note on
every turn (`conversation.py`'s `build_system_prompt`), on top of
whatever each scenario's own persona already specifies:

- **No memory of you specifically.** The character knows nothing about
  the player beyond this scene -- its assumptions are the generic
  preconceptions the persona was written with, not facts it has
  somehow learned about this particular person. Only what you actually
  say in the conversation can update that.
- **Rooted, not steering.** The character has a real reason to be in
  this conversation and real things it cares about, but it isn't
  trying to force the exchange toward one outcome or one lesson -- it
  reacts to what you actually just said.
- **No glitching on short answers.** A blunt or one-line reply from the
  player should get a full, in-character human reaction that thinks
  about what that answer would actually mean coming from this person in
  this moment -- not a stall, a repeated line, or a break in character.

The conversation still has direction: each turn tells the model how
many exchanges are left (`min_turns`/`max_turns`, scenario-specific,
generally in the 9-22 range) so it can head toward a resolution once
that's actually earned, rather than rambling indefinitely or resolving
too early.

## Ending a conversation early

You don't have to play a scene out to its resolution or turn limit --
an **End conversation** button appears in the web UI once you've sent
at least one message, and the terminal version already supports typing
`quit` or `exit`. Either path still produces the same post-conversation
analysis record a natural ending would (see below), just tagged
`"ended_reason": "user_ended"` instead of `"resolved"` or
`"turn_limit"`.

## Post-conversation analysis

When a scene ends -- by resolving, by hitting its turn limit, or by the
player ending it -- `analysis.py` makes one more call to the model,
this time entirely out of character: it's handed the character's own
persona/system prompt plus the full transcript, and asked to account
for its own performance as that character -- what it assumed about the
player going in, how that shifted (or didn't) over the conversation,
what specific bias or microaggression it can see in its own replies,
how it handled being pushed back on, what it understands about the
player now versus at the start, and whether the scene's ending felt
earned by what actually happened. That reflection, plus some metadata
(scenario, turn count, how it ended, timestamps), is the actual research
artifact this project produces.

Persistence is pluggable via environment variables, and more than one
path can be active at once:

- **Local runs always write a file.** Every record (full analysis,
  metadata, and the full transcript) is saved as a numbered JSON file
  under `analysis_logs/` (configurable via `ANALYSIS_LOG_DIR`) -- e.g.
  `0001_airport-biosecurity_resolved.json`. This directory is
  gitignored; it's local output, not source.
- **`GITHUB_DATA_REPO` + `GITHUB_DATA_TOKEN`, if set, commit the record
  as a numbered Markdown file to a `sessions/` folder in a private
  GitHub repo** -- the recommended path, and the one actually relied
  on. Each file has the title, metadata, every analysis section under
  its own heading, then the full transcript, and renders readably
  right on github.com. `GITHUB_DATA_REPO` is `owner/repo`; the token is
  a fine-grained GitHub personal access token scoped to *only* that one
  repo with Contents: Read and write. This survives Vercel's
  serverless, no-persistent-disk environment, and setup is just: create
  a private repo, generate a scoped token, set both as env vars. No
  OAuth flow, no deployment-settings quirks.
- **`SHEETS_WEBHOOK_URL`, if set, additionally posts the record to a
  Google Apps Script Web App** (`deploy/sheets_webhook.gs`) that turns
  it into a formatted Google Doc per session plus an index row in a
  Sheet. Kept as an optional second path -- in practice, the Apps
  Script Web App deployment flow proved fragile (OAuth errors, "Who
  has access" vs "Execute as" confusion, settings not reliably applying
  on edit rather than a fresh deployment), so it's not the one to rely
  on; GitHub above is sufficient on its own.

A broken or unreachable analysis/save path never breaks the
conversation it's reflecting on -- failures are logged server-side and
swallowed, the player-facing response is unaffected.

## Deploying the web app

Your Qwen server is on a private LAN address, so it's only reachable
from something running on the same network -- that's why local
(`python app.py`) is the tested path. To actually deploy:

- **Vercel** -- `api/index.py` and `vercel.json` are already set up
  (Vercel's Python runtime, routed so the one Flask app serves
  everything), and **this is live and confirmed working** at
  intercult-sim.vercel.app. Set these as Vercel project environment
  variables (Settings -> Environment Variables, then redeploy for
  changes to take effect): `OPENAI_API_KEY` (a real OpenAI key --
  `OPENAI_API_BASE_URL` left blank so it defaults to OpenAI's real
  endpoint, since Vercel's servers can't reach a private LAN server),
  `OPENAI_MODEL` (e.g. `gpt-4o-mini`), and `GITHUB_DATA_REPO` +
  `GITHUB_DATA_TOKEN` (see "Post-conversation analysis" above) so
  finished sessions actually get saved somewhere once deployed --
  without those two, analysis records are generated but never
  persisted anywhere outside that one serverless invocation.
- **A Python-native host** (Render, Railway, Fly.io, etc.) would run
  `app.py` closer to how Flask actually works (a persistent process
  rather than a serverless function per request) -- generally less
  configuration friction if Vercel's Python setup gives you trouble.

### Note on changes from the source material

- Every scenario's player character is Indian, by design, with names
  deliberately spread across religion and region (see "Scenarios
  included" above) rather than defaulting to one -- an earlier pass at
  this renamed a couple of scenarios' players but landed on an
  all-Hindu-surname set without noticing, which was itself exactly the
  kind of unexamined default this project exists to study. Current
  names: Aarav Sharma, Zeeshan Ahmed, Neil Fernandes, Simran Kaur,
  Freya Mistry, Dr. Ananya Krishnan, Meera Nair, Gurpreet Singh,
  Siddharth Kulkarni, Rituparna Das.
- In scenario 2 (The Silent Meeting), the Indian colleague who privately
  raises concerns is handled as background/narration by Anna rather
  than as a second live chat partner, to keep the interface to one
  conversation at a time (matching scenario 1's single-officer format).
  Anna will reference what the colleague said if it comes up.
- Scenario 1 (Secondary Inspection) was substantially reworked: it now
  has two phases instead of one, and Officer Mitchell carries real,
  deliberately subtle bias -- generalizing comments framed as
  professional caution, extra suspicion that isn't quite proportionate,
  slower to give benefit of the doubt. It's written to never use slurs
  or overt hate speech, and to visibly (if only partially) respond if
  you name what's happening calmly and clearly. Turn budget went from
  9/16 to 14/22 so it can't be resolved in a handful of messages.
- Scenario 4 (The Morning Show) is inspired by a real 2020 exchange
  between chef Vikas Khanna and a BBC interviewer, researched for this
  scenario: asked whether his "sense of hunger" came from a poor
  upbringing in India, he corrected that his real struggle was working
  up from dishwasher in New York, not Amritsar, where the Golden
  Temple's Sikh langar means people don't go hungry. Rather than script
  dialogue for Khanna himself, the scenario uses an original character
  (Chef Simran Kaur) built around the same dynamic.
- Scenarios 8-10 (Mother Tongue, Straight Talk, The Bamboo Ceiling) are
  new additions, not present in the original source material -- added
  to cover an intra-India dynamic and two under-represented countries
  (Israel, United States) opposite the Indian player, each grounded in
  named, real research (cited in "Scenarios included" above) rather than
  general stereotype.
