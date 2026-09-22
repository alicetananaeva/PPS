const loginCard = document.getElementById("login-card");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const dashboard = document.getElementById("dashboard");
const dashboardMessage = document.getElementById("dashboard-message");
const rowsTarget = document.getElementById("pilot-rows");
const summaryTarget = document.getElementById("summary");
let rows = [];

function valueOrDash(value, digits = null) {
  if (value === null || value === undefined || value === "") return "—";
  return digits === null ? String(value) : Number(value).toFixed(digits);
}

function showDashboard(data) {
  rows = data.rows || [];
  loginCard.classList.add("hidden");
  dashboard.classList.remove("hidden");
  const pps = rows.filter((row) => row.survey === "PPS").length;
  const dslq = rows.filter((row) => row.survey === "DSLQ").length;
  const students = new Set(rows.filter((row) => !row.legacy).map((row) => row.student_name.trim().toLocaleLowerCase())).size;
  summaryTarget.innerHTML = `
    <div><strong>${rows.length}</strong><span>Total records</span></div>
    <div><strong>${students}</strong><span>Student names</span></div>
    <div><strong>${pps}</strong><span>PPS</span></div>
    <div><strong>${dslq}</strong><span>DSLQ</span></div>`;
  rowsTarget.replaceChildren();
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    [
      row.student_name, valueOrDash(row.dog_name), row.survey, row.submitted_at,
      valueOrDash(row.final_style), valueOrDash(row.permissive_mean, 2),
      valueOrDash(row.authoritative_mean, 2), valueOrDash(row.authoritarian_mean, 2),
      valueOrDash(row.dslq_chronic_score, 2), row.overall_experience,
      row.clarity, row.result_usefulness,
    ].forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.append(td);
    });
    rowsTarget.append(tr);
  });
  dashboardMessage.classList.toggle("hidden", rows.length > 0);
  dashboardMessage.textContent = rows.length ? "" : "No class pilot records yet.";
}

async function loadDashboard(key) {
  const response = await fetch("/api/dashboard", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Unable to load dashboard.");
  sessionStorage.setItem("pilotDashboardKey", key);
  showDashboard(data);
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.classList.add("hidden");
  const key = document.getElementById("access-key").value;
  const button = loginForm.querySelector("button");
  button.disabled = true;
  try {
    await loadDashboard(key);
  } catch (error) {
    loginError.textContent = error.message;
    loginError.classList.remove("hidden");
  } finally {
    button.disabled = false;
  }
});

document.getElementById("refresh-button").addEventListener("click", async () => {
  dashboardMessage.className = "message";
  dashboardMessage.textContent = "Refreshing…";
  try {
    await loadDashboard(sessionStorage.getItem("pilotDashboardKey") || "");
  } catch (error) {
    dashboardMessage.className = "message error";
    dashboardMessage.textContent = error.message;
  }
});

document.getElementById("logout-button").addEventListener("click", () => {
  sessionStorage.removeItem("pilotDashboardKey");
  window.location.reload();
});

function downloadCsv(columns, data, filename) {
  // Prefix spreadsheet formula characters so student-entered names cannot execute on open.
  const escape = (value) => {
    const raw = String(value ?? "");
    const safe = /^[\s]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const csv = [
    columns.map(([, label]) => escape(label)).join(","),
    ...data.map((row) => columns.map(([key]) => escape(row[key])).join(",")),
  ].join("\r\n");
  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  link.href = objectUrl;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

document.getElementById("download-button").addEventListener("click", () => {
  const columns = [
    ["student_name", "Student"], ["dog_name", "Dog"], ["survey", "Survey"], ["submitted_at", "Submitted"],
    ["final_style", "PPS style"],
    ["permissive_mean", "PPS permissive mean"], ["authoritative_mean", "PPS authoritative mean"],
    ["authoritarian_mean", "PPS authoritarian mean"], ["dslq_chronic_score", "DSLQ score"],
    ["overall_experience", "Overall experience"], ["clarity", "Clarity"],
    ["result_usefulness", "Result usefulness"],
  ];
  downloadCsv(columns, rows, `drudell-class-summary-${new Date().toISOString().slice(0, 10)}.csv`);
});

function flatten(prefix, value, target) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    Object.entries(value).forEach(([key, child]) => flatten(`${prefix}.${key}`, child, target));
  } else target[prefix] = Array.isArray(value) ? JSON.stringify(value) : value;
}

document.getElementById("download-answers-button").addEventListener("click", () => {
  const data = rows.map((row) => {
    const output = {
      student_name: row.student_name, dog_name: row.dog_name, survey: row.survey,
      submitted_at: row.submitted_at, submission_id: row.submission_id,
      result: row.survey === "PPS" ? row.final_style : row.dslq_chronic_score,
      overall_experience: row.overall_experience, clarity: row.clarity,
      result_usefulness: row.result_usefulness,
    };
    if (row.survey === "PPS" && row.answers_json) flatten("answer", JSON.parse(row.answers_json), output);
    else {
      output.dog_sex = row.dog_sex;
      if (row.behavior_answers_json) flatten("behavior", JSON.parse(row.behavior_answers_json), output);
      if (row.health_durations_json) flatten("health", JSON.parse(row.health_durations_json), output);
      if (row.dog_demographics_json) flatten("dog_info", JSON.parse(row.dog_demographics_json), output);
    }
    return output;
  });
  const keys = [...new Set(data.flatMap((row) => Object.keys(row)))];
  downloadCsv(keys.map((key) => [key, key]), data,
    `drudell-class-full-answers-${new Date().toISOString().slice(0, 10)}.csv`);
});

const savedKey = sessionStorage.getItem("pilotDashboardKey");
if (savedKey) loadDashboard(savedKey).catch(() => sessionStorage.removeItem("pilotDashboardKey"));
