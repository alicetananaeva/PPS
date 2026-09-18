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

async function verifyCompletion(request, env) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 1_000) return json({ error: "Request is too large." }, 413);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const parsed = parseCode(payload?.code);
  if (!parsed) return json({ valid: false });

  const database = parsed.survey === "PPS" ? env.PPS_DB : env.DSLQ_DB;
  try {
    const row = await database.prepare(
      "SELECT 1 AS found FROM completion_codes WHERE completion_code = ? AND class_key = 'drudell' LIMIT 1",
    ).bind(parsed.code).first();
    return json({
      valid: Boolean(row),
      survey: parsed.survey === "PPS" ? "Pet Parenting Style" : "Dog Stress Level Questionnaire",
    });
  } catch {
    return json({ error: "The verification service is temporarily unavailable." }, 503);
  }
}

export { parseCode };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/verify" && request.method === "POST") {
      return verifyCompletion(request, env);
    }
    if (url.pathname.startsWith("/api/")) return json({ error: "Not found." }, 404);
    return env.ASSETS.fetch(request);
  },
};
