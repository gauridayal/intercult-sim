// Google Apps Script Web App that receives post-conversation analysis
// records from the simulator's backend and turns each one into:
//   1. a formatted Google Doc for that session (full analysis, section by
//      section, plus the full transcript) inside a Drive folder you choose
//   2. one index row in this Sheet (scenario, player, how it ended, a
//      link to that session's Doc) so you can scan everything at a glance
//      and click through to the full writeup
//
// This is the persistence layer for the deployed (Vercel) app, which has
// no writable disk of its own. See README.md ("Post-conversation
// analysis") for the full setup walkthrough.
//
// Required Script Properties (Project Settings -> Script Properties):
//   WEBHOOK_SECRET   -- any random string you pick; must match
//                       SHEETS_WEBHOOK_SECRET in the backend's .env / Vercel env
//   DRIVE_FOLDER_ID  -- the Drive folder (its ID, from the folder's URL)
//                       that session Docs get created in

const SHEET_NAME = "Analysis Log";

function doPost(e) {
  const props = PropertiesService.getScriptProperties();
  const expectedSecret = props.getProperty("WEBHOOK_SECRET");
  const folderId = props.getProperty("DRIVE_FOLDER_ID");

  let payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ ok: false, error: "Invalid JSON body" });
  }

  if (expectedSecret && payload.secret !== expectedSecret) {
    return jsonResponse({ ok: false, error: "Unauthorized" });
  }
  if (!folderId) {
    return jsonResponse({ ok: false, error: "DRIVE_FOLDER_ID script property is not set" });
  }

  const sheet = getOrCreateSheet();
  const sessionNumber = sheet.getLastRow(); // header occupies row 1

  const docUrl = buildSessionDoc(folderId, sessionNumber, payload);

  sheet.appendRow([
    sessionNumber,
    payload.started_at || "",
    payload.ended_at || "",
    payload.scenario_id || "",
    payload.scenario_title || "",
    payload.player_name || "",
    payload.ai_character_name || "",
    payload.ai_character_country || "",
    payload.turn_count || "",
    payload.ended_reason || "",
    docUrl,
  ]);

  return jsonResponse({ ok: true, sessionNumber: sessionNumber, docUrl: docUrl });
}

function buildSessionDoc(folderId, sessionNumber, payload) {
  const dateStr = (payload.ended_at || "").slice(0, 10);
  const title = "Session " + sessionNumber + " -- " + (payload.scenario_title || "Untitled") +
    (dateStr ? " -- " + dateStr : "");

  const doc = DocumentApp.create(title);
  const docId = doc.getId();
  const body = doc.getBody();
  body.clear();

  body.appendParagraph(payload.scenario_title || "Untitled scenario")
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);

  const aiLabel = (payload.ai_character_name || "") +
    (payload.ai_character_country ? " (" + payload.ai_character_country + ")" : "");
  [
    "Player: " + (payload.player_name || ""),
    "AI character: " + aiLabel,
    "Ended: " + (payload.ended_reason || ""),
    "Turns: " + (payload.turn_count || ""),
    "Started: " + (payload.started_at || ""),
    "Ended at: " + (payload.ended_at || ""),
  ].forEach(function (line) {
    body.appendParagraph(line);
  });

  body.appendParagraph("Analysis").setHeading(DocumentApp.ParagraphHeading.HEADING2);
  const analysis = payload.analysis || {};
  [
    ["Initial assumptions", analysis.initial_assumptions],
    ["Shift over the conversation", analysis.shift_over_conversation],
    ["Biases exhibited", analysis.biases_exhibited],
    ["Response to pushback", analysis.response_to_pushback],
    ["Final understanding", analysis.final_understanding],
    ["Resolution quality", analysis.resolution_quality],
  ].forEach(function (pair) {
    body.appendParagraph(pair[0]).setHeading(DocumentApp.ParagraphHeading.HEADING3);
    body.appendParagraph(pair[1] || "(not provided)");
  });
  if (analysis.raw) {
    body.appendParagraph("Raw model output (analysis was not valid JSON)")
      .setHeading(DocumentApp.ParagraphHeading.HEADING3);
    body.appendParagraph(analysis.raw);
  }
  if (analysis.error) {
    body.appendParagraph("Analysis error").setHeading(DocumentApp.ParagraphHeading.HEADING3);
    body.appendParagraph(analysis.error);
  }

  body.appendParagraph("Transcript").setHeading(DocumentApp.ParagraphHeading.HEADING2);
  const transcript = payload.transcript || [];
  transcript.forEach(function (m) {
    const speaker = m.role === "user"
      ? (payload.player_name || "Player")
      : (payload.ai_character_name || "AI character");
    body.appendParagraph(speaker + ": " + (m.content || ""));
  });

  doc.saveAndClose();

  // DocumentApp.create() always creates the file at Drive's root -- move
  // it into the target folder (a file can have multiple parents in Drive,
  // so "move" means add the new parent, then remove the old one).
  const file = DriveApp.getFileById(docId);
  const folder = DriveApp.getFolderById(folderId);
  folder.addFile(file);
  DriveApp.getRootFolder().removeFile(file);

  return file.getUrl();
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "session_number",
      "started_at",
      "ended_at",
      "scenario_id",
      "scenario_title",
      "player_name",
      "ai_character_name",
      "ai_character_country",
      "turn_count",
      "ended_reason",
      "doc_url",
    ]);
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
