import { APP_VERSION, ITEM_LIST, ITEM_TEXTS, LIKERT_LABELS, calculatePps } from "./scoring.js";

const screens = [...document.querySelectorAll(".screen")];
const answers = {};
let currentIndex = 0;
let feedbackId = crypto.randomUUID();
let sessionId = crypto.randomUUID();
let currentConsent = false;
let studentName = "";
let dogName = "";

const classKey = new URLSearchParams(window.location.search).get("class");

const colors = {
  Authoritarian: "#cf664f",
  Authoritative: "#155f52",
  Permissive: "#d5a633",
};

const STYLE_INTERPRETATIONS = {
  Authoritative: "Your parenting style is closest to the Authoritative classification. This style typically reflects a combination of warmth, attention to the pet's emotional state, and fair, consistent guidance. Caregivers with this style tend to consider their pet's feelings and needs, spend time with their pet, show patience, and at the same time maintain structure in everyday interactions. Pets of authoritative caregivers often benefit from this caregiving style, showing higher rates of secure attachment, sociability, success in problem-solving tasks, and are typically more resilient to stress.",
  Authoritarian: "Your parenting style is closest to the Authoritarian classification. This style often suggests a greater emphasis on control, directiveness, and expectation of obedience. Caregivers with this style are more likely to set strict rules and expect that they be followed. One strength of this approach may be clarity and structure. However, in research, authoritarian parenting has also been associated with higher stress in pets, lower rates of secure attachment, and in some cases suboptimal problem solving and learning outcomes, when compared to authoritative style caregiving. Ways to help your pet reach it's full potential: Paying increased attention to your pet's emotional state and using a more flexible approach when they appear hesitant, frustrated or confused can be helpful; consider if a pet might not be following certain rules due to lack of understanding or other environmental or health related challenges, instead of disobedience. Try focusing on reinforcing small steps towards more desirable behaviors and avoid scolding or physical corrections when possible. These small steps may help improve your pet's welfare, learning, as well as the strength and security of your relationship.",
  Permissive: "Your parenting style is closest to the Permissive classification. This style typically reflects a warm and caring attitude toward the pet, but with comparatively less consistency and structure. Caregivers with this style often try to avoid being harsh and may feel unsure about how best to respond to unwanted behavior. Clearer boundaries and greater predictability, for example, making sure that 'no' always means 'no,' 'yes' always means 'yes,' and keeping routines more consistent, could improve your pet's learning, strengthen your attachment, and help reduce vulnerability to stress.",
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
  document.getElementById("result-interpretation").textContent = STYLE_INTERPRETATIONS[result.finalStyle];
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
        sessionId,
        appVersion: APP_VERSION,
        consent: true,
        answers,
        classKey,
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

async function saveClassFeedback(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const feedback = {
    enjoyment: Number(data.get("enjoyment")),
    clarity: Number(data.get("clarity")),
    resultUsefulness: Number(data.get("resultUsefulness")),
  };
  const error = document.getElementById("feedback-error");
  if (Object.values(feedback).some((value) => !Number.isInteger(value) || value < 1 || value > 5)) {
    error.classList.remove("hidden");
    return;
  }
  error.classList.add("hidden");
  const button = document.getElementById("feedback-submit");
  button.disabled = true;
  button.textContent = "Saving feedback…";
  try {
    const payload = {
      submissionId: feedbackId,
      classKey,
      studentName,
      dogName,
      answers,
      ...feedback,
    };
    const response = await fetch("/api/class-submissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("feedback save failed");
    await response.json();
    form.classList.add("hidden");
    const confirmation = document.getElementById("feedback-confirmation");
    confirmation.textContent = "Thank you—your questionnaire answers and class feedback were saved for the class exercise.";
    confirmation.classList.remove("hidden");
  } catch {
    error.textContent = "The feedback could not be saved. Please try again.";
    error.classList.remove("hidden");
    button.disabled = false;
    button.textContent = "Submit feedback →";
  }
}

document.getElementById("start-button").addEventListener("click", () => {
  if (classKey === "drudell") {
    showScreen("class-info-screen");
    return;
  }
  currentIndex = 0;
  renderQuestion();
  showScreen("question-screen");
});

document.getElementById("class-info-form").addEventListener("submit", (event) => {
  event.preventDefault();
  studentName = document.getElementById("student-name").value.trim();
  dogName = document.getElementById("class-dog-name").value.trim();
  if (!studentName) return;
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
    if (classKey === "drudell") {
      renderResults(calculatePps(answers));
      document.getElementById("save-status").classList.add("hidden");
      document.getElementById("class-feedback").classList.remove("hidden");
      document.getElementById("feedback-confirmation").classList.add("hidden");
      showScreen("result-screen");
    } else showScreen("consent-screen");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
  if (document.getElementById("question-screen").classList.contains("hidden")) return;
  if (!["1", "2", "3", "4", "5"].includes(event.key)) return;
  const selected = document.querySelector(`input[name="answer"][value="${event.key}"]`);
  if (!selected) return;
  selected.checked = true;
  selected.focus();
  document.getElementById("question-error").classList.add("hidden");
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
  currentConsent = consent === "yes";
  renderResults(result);
  document.getElementById("save-status").classList.add("hidden");
  document.getElementById("class-feedback").classList.toggle("hidden", classKey !== "drudell");
  document.getElementById("feedback-confirmation").classList.add("hidden");
  showScreen("result-screen");
  const tasks = [];
  if (classKey !== "drudell" && currentConsent) tasks.push(saveAnswers(result));
  await Promise.allSettled(tasks);
});

document.getElementById("class-feedback").addEventListener("submit", saveClassFeedback);

document.getElementById("restart-button").addEventListener("click", () => {
  Object.keys(answers).forEach((key) => delete answers[key]);
  feedbackId = crypto.randomUUID();
  sessionId = crypto.randomUUID();
  currentConsent = false;
  studentName = "";
  dogName = "";
  document.getElementById("class-info-form").reset();
  document.getElementById("class-feedback").reset();
  document.getElementById("feedback-error").classList.add("hidden");
  const feedbackButton = document.getElementById("feedback-submit");
  feedbackButton.disabled = false;
  feedbackButton.textContent = "Submit feedback →";
  document.querySelectorAll('input[name="consent"]').forEach((input) => { input.checked = false; });
  showScreen("intro-screen");
});
