# Setup checklist -- what's needed from you, and when

This tracks the remaining setup work on your end to get the
post-conversation analysis reports flowing, both locally and once this
is deployed to Vercel. I'll keep this file updated as the underlying
code changes; check back here rather than relying on memory of an
earlier chat message.

## 1. Local development -- nothing needed from you right now

`python app.py` already works against your local Qwen3-Coder server
via the existing `.env`. Analysis records already get written locally
to `analysis_logs/` (gitignored) with no further setup. You can run
and test everything, including full conversations and their generated
reports, without touching Google or Vercel at all.

## 2. Report storage -- Google Doc per session + Sheet index

**Ready for you to set up now** -- the code side is done
(`deploy/sheets_webhook.gs`, built to match this exact design). Each
finished conversation becomes one formatted Google Doc (title,
metadata, each analysis section under its own heading, then the full
transcript), and a Google Sheet keeps one row per session as an index
(scenario, player, AI character, how it ended, turn count, a link to
that session's Doc). Steps:

1. Create a Google Sheet (any name) -- this becomes the index.
2. Create a Google Drive folder (any name) -- this is where the Docs
   get created. Grab its folder ID from the URL
   (`drive.google.com/drive/folders/<THIS_PART>`).
3. On the Sheet: Extensions -> Apps Script, delete the placeholder
   code, paste in the full contents of `deploy/sheets_webhook.gs` from
   this repo.
4. Project Settings (gear icon) -> Script Properties -> add two
   properties: `WEBHOOK_SECRET` (any random string you make up -- this
   stops a stranger from spamming your Drive/Sheet if the URL ever
   leaks) and `DRIVE_FOLDER_ID` (from step 2).
5. Deploy -> New deployment -> type **Web app** -> Execute as **Me** ->
   Who has access **Anyone** -> Deploy. Google will ask you to review
   and authorize permissions the first time (it needs to create Docs
   and Sheet rows on your behalf) -- that's expected, approve it.
   Copy the Web app URL it gives you.
6. Send me that URL + the `WEBHOOK_SECRET` value you made up in step 4.
   Both are fine to share here -- they're specific to this one
   integration (not your Google account password or any OAuth token),
   and knowing them only lets something POST a new analysis Doc into
   the one folder you chose, nothing else.

Once I have those two values, I'll put them in `.env` locally and tell
you the exact two values to set as Vercel environment variables for
production (step 3 below).

## 3. The actual model backend -- decided: real OpenAI API

Locally, `.env` still points at your LAN Qwen3-Coder server -- leave
that alone, it's not reachable from Vercel anyway and doesn't need to
be for local dev. For the deployed version at intercult-sim.vercel.app,
on Vercel's dashboard -> Settings -> Environment Variables, set:

| Variable              | Value                                                                 |
|------------------------|------------------------------------------------------------------------|
| `OPENAI_API_KEY`      | your real OpenAI secret key (starts `sk-...`) -- **never paste this in chat, including to me** |
| `OPENAI_API_BASE_URL` | leave unset / blank -- the code falls back to OpenAI's real endpoint automatically when this is empty |
| `OPENAI_MODEL`        | a real OpenAI model name -- `gpt-4o-mini` is the sensible default (cheap, fast, good enough for this); check OpenAI's current pricing/model page before picking, since names and prices change over time |

Get the key at platform.openai.com (Dashboard -> API keys) on your own
account -- that's the only thing you need to do here. I don't need to
see the key's value at all, only confirmation that you've set it.
**One real cost to know about**: these are long conversations (up to
22 exchanges) plus one extra analysis call per session, so token usage
per completed session is non-trivial -- not expensive per session with
a `mini`-class model, but not free either, and it adds up with volume.
Worth keeping an eye on usage on platform.openai.com, especially early
on.

If you ever do paste a real key into a chat message by accident,
rotate/revoke it on platform.openai.com afterward rather than trusting
it's fine because it's "just Claude."

## 4. Pushing to Vercel

Once 2 and 3 are settled: push this repo to GitHub (if not already),
import it in the Vercel dashboard, set the environment variables from
step 3 (and 2, once ready), redeploy. I don't have Vercel account
access, so I can't click through this myself -- but I can walk you
through anything that doesn't line up with Vercel's current Python
docs if you hit an error.

## Where things stand right now

- [x] Local `.env` / Qwen server -- working
- [x] Local `analysis_logs/` JSON files -- working
- [x] Doc-per-session + Sheet-index Apps Script written (`deploy/sheets_webhook.gs`)
- [x] Production model backend decided: real OpenAI API
- [ ] You: create the Sheet + Drive folder, deploy the Apps Script, send me the Web app URL + secret
- [ ] You: set `OPENAI_API_KEY`, `OPENAI_API_BASE_URL` (blank), `OPENAI_MODEL` on Vercel
- [ ] You: set `SHEETS_WEBHOOK_URL` + `SHEETS_WEBHOOK_SECRET` on Vercel once I have them from you
- [ ] Push this repo's changes to GitHub (triggers Vercel's auto-deploy)
- [ ] Verify on intercult-sim.vercel.app
