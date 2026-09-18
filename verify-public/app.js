const form = document.getElementById("verification-form");
const input = document.getElementById("completion-code");
const result = document.getElementById("verification-result");
const button = form.querySelector("button");

input.addEventListener("input", () => {
  input.value = input.value.toUpperCase().replace(/\s+/g, "");
  result.classList.add("hidden");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  button.disabled = true;
  result.className = "result checking";
  result.textContent = "Checking code…";

  try {
    const response = await fetch("/api/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: input.value }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error("verification unavailable");

    if (data.valid) {
      result.className = "result valid";
      result.innerHTML = `<strong>Valid completion code</strong><span>${data.survey}</span>`;
    } else {
      result.className = "result invalid";
      result.innerHTML = "<strong>Code not found</strong><span>Check the spelling and ask the student to resend the code if necessary.</span>";
    }
  } catch {
    result.className = "result invalid";
    result.innerHTML = "<strong>Unable to verify right now</strong><span>Please try again in a moment.</span>";
  } finally {
    button.disabled = false;
  }
});
