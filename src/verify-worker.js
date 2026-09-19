const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function parseCode(value) {
  const code = typeof value === "string" ? value.trim().toUpperCase() : "";
  const match = /^(PPS|DSLQ)-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.exec(code);
  if (!match) return null;
  return { code, survey: match[1] };
}

async function readDashboard(request, env) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 2_000) return json({ error: "Request is too large." }, 413);
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  if (!env.DASHBOARD_KEY || payload?.key !== env.DASHBOARD_KEY) {
    return json({ error: "Invalid access key." }, 401);
  }

  try {
    const [pps, dslq] = await Promise.all([
      env.PPS_DB.prepare(`
        SELECT c.completion_code AS code, c.created_at AS submitted_at,
          CASE WHEN s.session_id IS NULL THEN 0 ELSE 1 END AS research_consent,
          s.final_style, s.permissive_mean, s.authoritative_mean, s.authoritarian_mean,
          f.enjoyment AS overall_experience, f.clarity, f.result_usefulness
        FROM completion_codes c
        JOIN class_feedback f ON f.participant_code = c.completion_code
        LEFT JOIN pps_sessions s ON s.participant_code = c.completion_code
        WHERE c.class_key = 'drudell'
        ORDER BY c.created_at DESC
      `).all(),
      env.DSLQ_DB.prepare(`
        SELECT c.completion_code AS code, c.created_at AS submitted_at,
          CASE WHEN s.session_id IS NULL THEN 0 ELSE 1 END AS research_consent,
          s.dslq_chronic_score,
          f.enjoyment AS overall_experience, f.clarity, f.result_usefulness
        FROM completion_codes c
        JOIN class_feedback f ON f.participant_code = c.completion_code
        LEFT JOIN dslq_sessions s ON s.participant_code = c.completion_code
        WHERE c.class_key = 'drudell'
        ORDER BY c.created_at DESC
      `).all(),
    ]);
    const ppsRows = (pps.results || []).map((row) => ({ survey: "PPS", ...row }));
    const dslqRows = (dslq.results || []).map((row) => ({ survey: "DSLQ", ...row }));
    const rows = [...ppsRows, ...dslqRows]
      .sort((a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at)));
    return json({ rows });
  } catch {
    return json({ error: "The class pilot data could not be loaded." }, 503);
  }
}

export { parseCode };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/dashboard" && request.method === "POST") {
      return readDashboard(request, env);
    }
    if (url.pathname.startsWith("/api/")) return json({ error: "Not found." }, 404);
    return env.ASSETS.fetch(request);
  },
};
