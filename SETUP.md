# Setup checklist -- what's needed from you, and when

This tracks the remaining setup work on your end. I'll keep this file
updated as the underlying code changes; check back here rather than
relying on memory of an earlier chat message.

## Where things actually stand right now

- [x] Live site (intercult-sim.vercel.app) -- running on real OpenAI, confirmed working
- [x] Local `.env` -- has a real OpenAI key, `gpt-4o-mini`
- [x] Local `analysis_logs/` JSON files -- always written automatically, every finished conversation
- [x] **GitHub data repo persistence -- built, tested end-to-end, confirmed working** (this is the one that matters)
- [ ] You: set `GITHUB_DATA_REPO` + `GITHUB_DATA_TOKEN` on Vercel so the *live* site's sessions get saved too (not just local ones)
- [ ] (Optional, not blocking) Google Sheet/Doc path -- built but the Apps Script deployment has been unreliable; low priority now that GitHub works

## 1. Report storage -- a private GitHub repo, one Markdown file per session

This is the one that's actually working. Each finished conversation
(resolved, hit its turn limit, or you ended it early) gets committed
as a numbered, readable Markdown file to a `sessions/` folder in a
**private** repo (`gauridayal/intercult-sim-data`) -- title, metadata,
all six analysis sections, then the full transcript. Verified with a
real test commit; you can see the format by looking at any file under
`sessions/` in that repo on github.com.

**What's needed to make this work on the live site, not just locally:**

On Vercel's dashboard -> Settings -> Environment Variables, add:

| Variable | Value |
|---|---|
| `GITHUB_DATA_REPO` | `gauridayal/intercult-sim-data` |
| `GITHUB_DATA_TOKEN` | the fine-grained personal access token you generated, scoped to only that one repo with Contents: Read and write |

Then **Deployments -> latest -> "..." -> Redeploy** so the new env vars
actually take effect.

That token only ever touches that one data repo -- it can't see or
change anything else in your GitHub account. Still, same rule as the
OpenAI key: it's already been shared in this chat once, which is fine
for local `.env` use, but if you ever want to tighten things up later,
regenerating it costs nothing.

## 2. The model backend -- done, real OpenAI API, already live

`OPENAI_API_KEY`, `OPENAI_API_BASE_URL` (blank), `OPENAI_MODEL=gpt-4o-mini`
are already set on Vercel and confirmed working -- this is why the
simulator itself runs. Nothing further needed here unless you swap to
a different key later, in which case same process: new key in `.env`
locally first so I can confirm it has credits, then you set it
directly on Vercel yourself.

## 3. The Google Sheet/Doc path -- optional, deprioritized

Code for this still exists (`deploy/sheets_webhook.gs`,
`SHEETS_WEBHOOK_URL`/`SHEETS_WEBHOOK_SECRET` in `.env`) and *can* run
alongside the GitHub path if you ever get the Apps Script deployment
stable -- but given how fragile that deployment flow turned out to be
(OAuth errors, "Who has access" vs "Execute as" confusion, settings
not reliably propagating on edit), it's no longer the thing to spend
time on. GitHub alone is sufficient. Revisit only if you specifically
want the Google Doc reading experience later.

## How to actually look at the data

Go to `github.com/gauridayal/intercult-sim-data` -> `sessions/` folder.
Each file is named `<number>_<scenario-id>_<how-it-ended>.md` and
renders readably right there on GitHub -- click one to read it, no
extra tooling needed.
