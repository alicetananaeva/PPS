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
  const consented = rows.filter((row) => row.research_consent === 1).length;
  const pps = rows.filter((row) => row.survey === "PPS").length;
  const dslq = rows.filter((row) => row.survey === "DSLQ").length;
  summaryTarget.innerHTML = `
    <div><strong>${rows.length}</strong><span>Total records</span></div>
    <div><strong>${consented}</strong><span>Research consent</span></div>
    <div><strong>${pps}</strong><span>PPS</span></div>
    <div><strong>${dslq}</strong><span>DSLQ</span></div>`;
  rowsTarget.replaceChildren();
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    [
      row.code, row.survey, row.submitted_at,
      row.research_consent === 1 ? "Yes" : "No",
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

document.getElementById("download-button").addEventListener("click", () => {
  const columns = [
    ["code", "Code"], ["survey", "Survey"], ["submitted_at", "Submitted"],
    ["research_consent", "Research consent"], ["final_style", "PPS style"],
    ["permissive_mean", "PPS permissive mean"], ["authoritative_mean", "PPS authoritative mean"],
    ["authoritarian_mean", "PPS authoritarian mean"], ["dslq_chronic_score", "DSLQ score"],
    ["overall_experience", "Overall experience"], ["clarity", "Clarity"],
    ["result_usefulness", "Result usefulness"],
  ];
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [
    columns.map(([, label]) => escape(label)).join(","),
    ...rows.map((row) => columns.map(([key]) => escape(
      key === "research_consent" ? (row[key] === 1 ? "Yes" : "No") : row[key],
    )).join(",")),
  ].join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = `drudell-fall-2026-pilot-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
});

const savedKey = sessionStorage.getItem("pilotDashboardKey");
if (savedKey) loadDashboard(savedKey).catch(() => sessionStorage.removeItem("pilotDashboardKey"));
