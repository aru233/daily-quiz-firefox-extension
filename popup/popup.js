const inputApiKey  = document.getElementById("input-api-key");
const selectModel  = document.getElementById("select-model");
const btnSaveKey   = document.getElementById("btn-save-key");
const btnRefresh   = document.getElementById("btn-refresh-now");
const statusEl     = document.getElementById("status");

function showStatus(msg, type = "ok") {
  statusEl.textContent = msg;
  statusEl.className = `status hint ${type}`;
  if (type === "ok") {
    setTimeout(() => { statusEl.textContent = ""; statusEl.className = "status hint"; }, 3000);
  }
}

// Load saved values
browser.storage.local.get(["apiKey", "model"]).then(({ apiKey, model }) => {
  if (apiKey) inputApiKey.value = apiKey;
  if (model) {
    const opt = selectModel.querySelector(`option[value="${model}"]`);
    if (opt) opt.selected = true;
  }
});

btnSaveKey.addEventListener("click", async () => {
  const key = inputApiKey.value.trim();
  const model = selectModel.value;
  if (!key) { showStatus("Please enter a key.", "err"); return; }
  await browser.storage.local.set({ apiKey: key, model });
  showStatus("Saved!", "ok");
});

btnRefresh.addEventListener("click", async () => {
  btnRefresh.disabled = true;
  btnRefresh.textContent = "Refreshing…";
  try {
    const { apiKey, model } = await browser.storage.local.get(["apiKey", "model"]);
    if (!apiKey) { showStatus("Save an API key first.", "err"); return; }

    const items = await fetchGoogleNewsItems();
    const questions = await generateQuiz(apiKey, items, model || "gemini-3-flash-preview");
    await browser.storage.local.set({ quiz: questions, generatedAt: Date.now() });
    showStatus("Quiz refreshed!", "ok");
  } catch (err) {
    showStatus(err.message, "err");
  } finally {
    btnRefresh.disabled = false;
    btnRefresh.textContent = "Refresh quiz now";
  }
});
