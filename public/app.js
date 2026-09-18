import { APP_VERSION, ITEM_LIST, ITEM_TEXTS, LIKERT_LABELS, calculatePps } from "./scoring.js";

const screens = [...document.querySelectorAll(".screen")];
const answers = {};
let currentIndex = 0;

const colors = {
  Authoritarian: "#cf664f",
  Authoritative: "#155f52",
  Permissive: "#d5a633",
};

function showScreen(id) {
  screens.forEach((screen) => screen.classList.toggle("hidden", screen.id !== id));
  window.scrollTo({ top: 0, behavior: "smooth" });
  document.getElementById(id).focus({ preventScroll: true });
}

function renderQuestion() {
  const item = ITEM_LIST[currentIndex];
  document.getElementById("progress-copy").textContent = `Question ${currentIndex + 1} of ${ITEM_LIST.length}`;
  document.getElementById("answered-copy").textContent = `${Object.keys(answers).length} answered`;
  document.getElementById("progress-bar").style.width = `${((currentIndex + 1) / ITEM_LIST.length) * 100}%`;
  document.getElementById("question-code").textContent = `Item ${currentIndex + 1}`;
  document.getElementById("question-title").textContent = ITEM_TEXTS[item];
  document.getElementById("back-button").disabled = currentIndex === 0;
  document.getElementById("next-button").textContent = currentIndex === ITEM_LIST.length - 1 ? "Continue →" : "Next →";
  document.getElementById("question-error").classList.add("hidden");

  const options = document.getElementById("answer-options");
  options.replaceChildren();
  LIKERT_LABELS.forEach((label, index) => {
    const value = index + 1;
    const row = document.createElement("label");
    row.innerHTML = `<input type="radio" name="answer" value="${value}" ${answers[item] === value ? "checked" : ""}><span>${label}</span><span class="option-number">${value}</span>`;
    options.append(row);
  });
  options.querySelector("input:checked")?.focus();
}

function createBarChart(targetId, values, max, suffix, decimals = 0) {
  const target = document.getElementById(targetId);
  target.replaceChildren();
  ["Authoritarian", "Authoritative", "Permissive"].forEach((style) => {
    const value = values[style];
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `<span>${style}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(0, Math.min(100, value / max * 100))}%;background:${colors[style]}"></div></div><span class="bar-value">${value.toFixed(decimals)}${suffix}</span>`;
    target.append(row);
  });
}

function renderResults(result) {
  document.getElementById("result-style").textContent = result.finalStyle;
  createBarChart("means-chart", result.means, 5, "", 2);
  createBarChart("percentile-chart", result.percentiles, 100, "%", 0);

  const order = ["Authoritarian", "Authoritative", "Permissive"];
  let angle = 0;
  const stops = order.map((style) => {
    const start = angle;
    angle += result.similarities[style] * 360;
    return `${colors[style]} ${start}deg ${angle}deg`;
  });
  const donut = document.getElementById("similarity-donut");
  donut.style.background = `conic-gradient(${stops.join(",")})`;
  donut.setAttribute("aria-label", order.map((style) => `${style}: ${(result.similarities[style] * 100).toFixed(0)} percent`).join(", "));

  document.getElementById("similarity-legend").innerHTML = order.map((style) => `
    <div class="legend-item"><span class="legend-swatch" style="background:${colors[style]}"></span><span>${style}: ${(result.similarities[style] * 100).toFixed(0)}%</span></div>
  `).join("");

  document.getElementById("stat-details").innerHTML = `<table><thead><tr><th>Dimension</th><th>Mean</th><th>z-score</th><th>Percentile</th></tr></thead><tbody>${order.map((style) => `<tr><td>${style}</td><td>${result.means[style].toFixed(2)}</td><td>${result.zScores[style].toFixed(2)}</td><td>${result.percentiles[style].toFixed(0)}th</td></tr>`).join("")}</tbody></table>`;
}

async function saveAnswers(result) {
  const status = document.getElementById("save-status");
  status.className = "status";
  status.textContent = "Saving the answers you agreed to share…";
  try {
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: crypto.randomUUID(),
        appVersion: APP_VERSION,
        consent: true,
        answers,
      }),
    });
    if (!response.ok) throw new Error("save failed");
    const saved = await response.json();
    if (saved.result.finalStyle !== result.finalStyle) throw new Error("calculation mismatch");
    status.textContent = "Thank you—your questionnaire answers were saved for research.";
  } catch {
    status.classList.add("warning");
    status.textContent = "Your profile was calculated, but the research copy could not be saved. No action is required from you.";
  }
}

document.getElementById("start-button").addEventListener("click", () => {
  currentIndex = 0;
  renderQuestion();
  showScreen("question-screen");
});

document.getElementById("question-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const selected = new FormData(event.currentTarget).get("answer");
  if (!selected) {
    document.getElementById("question-error").classList.remove("hidden");
    return;
  }
  answers[ITEM_LIST[currentIndex]] = Number(selected);
  if (currentIndex < ITEM_LIST.length - 1) {
    currentIndex += 1;
    renderQuestion();
  } else {
    showScreen("consent-screen");
  }
});

document.getElementById("back-button").addEventListener("click", () => {
  if (currentIndex > 0) {
    currentIndex -= 1;
    renderQuestion();
  }
});

document.getElementById("consent-back").addEventListener("click", () => {
  currentIndex = ITEM_LIST.length - 1;
  renderQuestion();
  showScreen("question-screen");
});

document.getElementById("show-results").addEventListener("click", async () => {
  const consent = document.querySelector('input[name="consent"]:checked')?.value;
  if (!consent) {
    document.getElementById("consent-error").classList.remove("hidden");
    return;
  }
  const result = calculatePps(answers);
  renderResults(result);
  document.getElementById("save-status").classList.add("hidden");
  showScreen("result-screen");
  if (consent === "yes") await saveAnswers(result);
});

document.getElementById("restart-button").addEventListener("click", () => {
  Object.keys(answers).forEach((key) => delete answers[key]);
  document.querySelectorAll('input[name="consent"]').forEach((input) => { input.checked = false; });
  showScreen("intro-screen");
});
