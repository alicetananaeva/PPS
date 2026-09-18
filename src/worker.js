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
  const query = env.DB.prepare(`
    INSERT OR IGNORE INTO pps_sessions (
      session_id, app_version, consented_research, answers_json,
      permissive_mean, authoritative_mean, authoritarian_mean,
      final_style, z_scores_json, percentiles_json, effective_distances_json
    ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)
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
    if (url.pathname.startsWith("/api/")) return json({ error: "Not found." }, 404);
    return env.ASSETS.fetch(request);
  },
};
