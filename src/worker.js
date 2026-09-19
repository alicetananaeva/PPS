import { APP_VERSION, calculatePps, validateAnswers } from "../public/scoring.js";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function isUuid(value) {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function cohortForClassKey(value) {
  return value === "drudell" ? "drudell_fall_2026" : null;
}

function validRating(value) {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

function completionCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = () => Array.from(crypto.getRandomValues(new Uint8Array(4)), (value) => alphabet[value % alphabet.length]).join("");
  return `PPS-${part()}-${part()}`;
}

async function saveCompletion(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }
  if (payload?.classKey !== "drudell") return json({ error: "Unknown class." }, 400);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = completionCode();
    try {
      const saved = await env.DB.prepare(
        "INSERT OR IGNORE INTO completion_codes (completion_code, class_key) VALUES (?, ?)",
      ).bind(code, payload.classKey).run();
      if (saved.meta?.changes === 1) return json({ saved: true, code });
    } catch {
      return json({ error: "The completion code could not be saved." }, 503);
    }
  }
  return json({ error: "The completion code could not be generated." }, 503);
}

async function saveFeedback(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }
  const cohortKey = cohortForClassKey(payload?.classKey);
  if (!cohortKey) return json({ error: "Unknown class." }, 400);
  if (!isUuid(payload.feedbackId)
    || !validRating(payload.enjoyment)
    || !validRating(payload.clarity)
    || !validRating(payload.resultUsefulness)) {
    return json({ error: "Invalid feedback." }, 400);
  }
  try {
    const saved = await env.DB.prepare(`
      INSERT OR IGNORE INTO class_feedback (
        feedback_id, cohort_key, enjoyment, clarity, result_usefulness
      ) VALUES (?, ?, ?, ?, ?)
    `).bind(
      payload.feedbackId,
      cohortKey,
      payload.enjoyment,
      payload.clarity,
      payload.resultUsefulness,
    ).run();
    return json({ saved: true, duplicate: saved.meta?.changes === 0 });
  } catch {
    return json({ error: "The class feedback could not be saved." }, 503);
  }
}

async function savePilot(request, env) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 64_000) return json({ error: "Request is too large." }, 413);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }

  const cohortKey = cohortForClassKey(payload?.classKey);
  if (!cohortKey) return json({ error: "Unknown class." }, 400);
  if (!isUuid(payload.feedbackId)
    || !validRating(payload.enjoyment)
    || !validRating(payload.clarity)
    || !validRating(payload.resultUsefulness)) {
    return json({ error: "Invalid feedback." }, 400);
  }

  const consent = payload.consent === true;
  let result = null;
  if (consent) {
    if (!isUuid(payload.sessionId)) return json({ error: "Invalid session identifier." }, 400);
    if (!validateAnswers(payload.answers)) return json({ error: "Invalid questionnaire answers." }, 400);
    result = calculatePps(payload.answers);
  }

  try {
    const existing = await env.DB.prepare(
      "SELECT participant_code FROM class_feedback WHERE feedback_id = ? AND cohort_key = ? LIMIT 1",
    ).bind(payload.feedbackId, cohortKey).first();
    if (existing?.participant_code) return json({ saved: true, duplicate: true, code: existing.participant_code, result });
  } catch {
    return json({ error: "The class record could not be checked." }, 503);
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = completionCode();
    const statements = [
      env.DB.prepare(
        "INSERT INTO completion_codes (completion_code, class_key) VALUES (?, ?)",
      ).bind(code, payload.classKey),
      env.DB.prepare(`
        INSERT INTO class_feedback (
          feedback_id, cohort_key, enjoyment, clarity, result_usefulness, participant_code
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        payload.feedbackId,
        cohortKey,
        payload.enjoyment,
        payload.clarity,
        payload.resultUsefulness,
        code,
      ),
    ];

    if (consent) {
      statements.push(env.DB.prepare(`
        INSERT INTO pps_sessions (
          session_id, app_version, consented_research, answers_json,
          permissive_mean, authoritative_mean, authoritarian_mean,
          final_style, z_scores_json, percentiles_json, effective_distances_json,
          cohort_key, participant_code
        ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        payload.sessionId,
        APP_VERSION,
        JSON.stringify(payload.answers),
        result.means.Permissive,
        result.means.Authoritative,
        result.means.Authoritarian,
        result.finalStyle,
        JSON.stringify(result.zScores),
        JSON.stringify(result.percentiles),
        JSON.stringify(result.effectiveDistances),
        cohortKey,
        code,
      ));
    }

    try {
      await env.DB.batch(statements);
      return json({ saved: true, duplicate: false, code, result });
    } catch {
      try {
        const existing = await env.DB.prepare(
          "SELECT participant_code FROM class_feedback WHERE feedback_id = ? AND cohort_key = ? LIMIT 1",
        ).bind(payload.feedbackId, cohortKey).first();
        if (existing?.participant_code) return json({ saved: true, duplicate: true, code: existing.participant_code, result });
      } catch {
        return json({ error: "The class record could not be saved." }, 503);
      }
    }
  }
  return json({ error: "The participant code could not be generated." }, 503);
}

async function saveSession(request, env) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 64_000) return json({ error: "Request is too large." }, 413);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }

  if (payload?.consent !== true) return json({ error: "Research consent is required for storage." }, 400);
  if (!isUuid(payload.sessionId)) return json({ error: "Invalid session identifier." }, 400);
  if (!validateAnswers(payload.answers)) return json({ error: "Invalid questionnaire answers." }, 400);

  const result = calculatePps(payload.answers);
  const cohortKey = cohortForClassKey(payload.classKey);
  const query = env.DB.prepare(`
    INSERT OR IGNORE INTO pps_sessions (
      session_id, app_version, consented_research, answers_json,
      permissive_mean, authoritative_mean, authoritarian_mean,
      final_style, z_scores_json, percentiles_json, effective_distances_json,
      cohort_key
    ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    payload.sessionId,
    APP_VERSION,
    JSON.stringify(payload.answers),
    result.means.Permissive,
    result.means.Authoritative,
    result.means.Authoritarian,
    result.finalStyle,
    JSON.stringify(result.zScores),
    JSON.stringify(result.percentiles),
    JSON.stringify(result.effectiveDistances),
    cohortKey,
  );

  try {
    const saved = await query.run();
    return json({ saved: true, duplicate: saved.meta?.changes === 0, result });
  } catch {
    return json({ error: "The research response could not be saved. Your result is still available." }, 503);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health" && request.method === "GET") {
      try {
        await env.DB.prepare("SELECT 1").first();
        return json({ ok: true, database: true, version: APP_VERSION });
      } catch {
        return json({ ok: false, database: false, version: APP_VERSION }, 503);
      }
    }
    if (url.pathname === "/api/sessions" && request.method === "POST") {
      return saveSession(request, env);
    }
    if (url.pathname === "/api/completions" && request.method === "POST") {
      return saveCompletion(request, env);
    }
    if (url.pathname === "/api/feedback" && request.method === "POST") {
      return saveFeedback(request, env);
    }
    if (url.pathname === "/api/pilot" && request.method === "POST") {
      return savePilot(request, env);
    }
    if (url.pathname.startsWith("/api/")) return json({ error: "Not found." }, 404);
    return env.ASSETS.fetch(request);
  },
};
