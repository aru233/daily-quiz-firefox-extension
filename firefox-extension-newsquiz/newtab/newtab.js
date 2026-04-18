const CACHE_TTL_MS = 60 * 60 * 1000;

const LOADING_STEPS = [
  "Fetching latest headlines…",
  "Picking the most important stories…",
  "Generating your quiz…",
];

const screens = {
  loading: document.getElementById("screen-loading"),
  noKey:   document.getElementById("screen-no-key"),
  error:   document.getElementById("screen-error"),
  quiz:    document.getElementById("screen-quiz"),
  results: document.getElementById("screen-results"),
  review:  document.getElementById("screen-review"),
};

const els = {
  loadingText:      document.getElementById("loading-text"),
  errorMessage:     document.getElementById("error-message"),
  btnRetry:         document.getElementById("btn-retry"),
  scoreDisplay:     document.getElementById("score-display"),
  btnRefresh:       document.getElementById("btn-refresh"),
  progressBar:      document.getElementById("progress-bar"),
  questionCounter:  document.getElementById("question-counter"),
  questionText:     document.getElementById("question-text"),
  optionsList:      document.getElementById("options-list"),
  feedback:         document.getElementById("feedback"),
  feedbackText:     document.getElementById("feedback-text"),
  explanationText:  document.getElementById("explanation-text"),
  sourceLink:       document.getElementById("source-link"),
  btnNext:          document.getElementById("btn-next"),
  resultEmoji:      document.getElementById("result-emoji"),
  finalScore:       document.getElementById("final-score"),
  resultMessage:    document.getElementById("result-message"),
  btnNewQuiz:       document.getElementById("btn-new-quiz"),
  btnReview:        document.getElementById("btn-review"),
  btnBack:          document.getElementById("btn-back"),
  reviewList:       document.getElementById("review-list"),
};

let state = {
  questions: [],
  currentIndex: 0,
  score: 0,
  answers: [], // { selectedIndex, correct }
};

function showScreen(name) {
  for (const [key, el] of Object.entries(screens)) {
    el.classList.toggle("hidden", key !== name);
  }
}

async function init() {
  await generateAndStart(false);
}

let loadingStepTimer = null;

function startLoadingSteps() {
  let i = 0;
  els.loadingText.textContent = LOADING_STEPS[0];
  loadingStepTimer = setInterval(() => {
    i = Math.min(i + 1, LOADING_STEPS.length - 1);
    els.loadingText.textContent = LOADING_STEPS[i];
  }, 2500);
}

function stopLoadingSteps() {
  if (loadingStepTimer) { clearInterval(loadingStepTimer); loadingStepTimer = null; }
}

async function generateAndStart(forceRefresh = false) {
  try {
    const { apiKey, model, quiz, generatedAt } = await browser.storage.local.get([
      "apiKey", "model", "quiz", "generatedAt",
    ]);
    if (!apiKey) { showScreen("noKey"); return; }

    // Serve from cache immediately — no spinner, no Gemini call
    if (!forceRefresh) {
      const isFresh = quiz && generatedAt && (Date.now() - generatedAt) < CACHE_TTL_MS;
      if (isFresh) { startQuiz(quiz); return; }
    }

    // Cache miss or forced refresh — show loading UI then fetch
    showScreen("loading");
    startLoadingSteps();

    const items = await fetchGoogleNewsItems();
    if (items.length < 5) throw new Error("Too few news items fetched from Google News.");

    const questions = await generateQuiz(apiKey, items, model || "gemini-3-flash-preview");

    await browser.storage.local.set({ quiz: questions, generatedAt: Date.now() });
    stopLoadingSteps();
    startQuiz(questions);
  } catch (err) {
    stopLoadingSteps();
    showError(err.message);
  }
}

function showError(message) {
  els.errorMessage.textContent = message;
  showScreen("error");
}

function startQuiz(questions) {
  state = { questions, currentIndex: 0, score: 0, answers: [] };
  showScreen("quiz");
  renderQuestion();
}

function renderQuestion() {
  const { questions, currentIndex, score } = state;
  const q = questions[currentIndex];

  els.scoreDisplay.textContent = `${score} / ${currentIndex}`;
  els.progressBar.style.width = `${(currentIndex / questions.length) * 100}%`;
  els.questionCounter.textContent = `Question ${currentIndex + 1} of ${questions.length}`;
  els.questionText.textContent = q.q;

  els.optionsList.innerHTML = "";
  const letters = ["A", "B", "C", "D"];
  q.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.innerHTML = `<span class="option-label">${letters[idx]}</span><span>${escapeHtml(opt)}</span>`;
    btn.addEventListener("click", () => handleAnswer(idx));
    els.optionsList.appendChild(btn);
  });

  els.feedback.classList.add("hidden");
}

function handleAnswer(selectedIndex) {
  const q = state.questions[state.currentIndex];
  const correct = selectedIndex === q.correctIndex;

  state.answers.push({ selectedIndex, correct });
  if (correct) state.score++;

  // Lock options, highlight correct/wrong
  const buttons = els.optionsList.querySelectorAll(".option-btn");
  buttons.forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === q.correctIndex) btn.classList.add("correct");
    else if (idx === selectedIndex) btn.classList.add("wrong");
  });

  els.feedbackText.textContent = correct ? "Correct!" : "Not quite.";
  els.feedbackText.className = `feedback-text ${correct ? "correct" : "wrong"}`;
  els.explanationText.textContent = q.explanation || "";

  if (q.sourceUrl) {
    els.sourceLink.href = q.sourceUrl;
    els.sourceLink.textContent = q.sourceTitle
      ? `Read: ${q.sourceTitle} ↗`
      : "Read source ↗";
    els.sourceLink.classList.remove("hidden");
  } else {
    els.sourceLink.classList.add("hidden");
  }

  els.feedback.classList.remove("hidden");
  els.scoreDisplay.textContent = `${state.score} / ${state.currentIndex + 1}`;
}

function nextQuestion() {
  state.currentIndex++;
  if (state.currentIndex >= state.questions.length) {
    showResults();
  } else {
    renderQuestion();
  }
}

function showResults() {
  const { score, questions } = state;
  const total = questions.length;
  const pct = score / total;

  let emoji, message;
  if (pct === 1)      { emoji = "🏆"; message = "Flawless! You're fully caught up on the news."; }
  else if (pct >= 0.8){ emoji = "🎉"; message = "Great job — you're well informed."; }
  else if (pct >= 0.5){ emoji = "👍"; message = "Not bad. A few more headlines to catch up on."; }
  else                { emoji = "📰"; message = "Time to skim today's headlines."; }

  els.resultEmoji.textContent = emoji;
  els.finalScore.textContent = `${score} / ${total}`;
  els.resultMessage.textContent = message;
  showScreen("results");
}

function renderReview() {
  els.reviewList.innerHTML = "";
  state.questions.forEach((q, i) => {
    const answer = state.answers[i];
    const correct = answer?.correct;
    const item = document.createElement("div");
    item.className = `review-item ${correct ? "correct" : "wrong"}`;

    const letters = ["A", "B", "C", "D"];
    const selectedText = answer ? q.options[answer.selectedIndex] : "—";
    const correctText = q.options[q.correctIndex];

    item.innerHTML = `
      <div class="review-q">${i + 1}. ${escapeHtml(q.q)}</div>
      <div class="review-answer">
        <span class="${correct ? "label-correct" : "label-wrong"}">
          ${correct ? "✓ Correct" : "✗ Incorrect"}
        </span>
        — Your answer: ${escapeHtml(selectedText)}
        ${correct ? "" : `<br>Correct answer: <strong>${letters[q.correctIndex]}. ${escapeHtml(correctText)}</strong>`}
      </div>
      <div class="review-explanation">${escapeHtml(q.explanation || "")}</div>
      ${q.sourceUrl ? `<a class="review-source" href="${q.sourceUrl}" target="_blank" rel="noopener">${escapeHtml(q.sourceTitle || "Source")} ↗</a>` : ""}
    `;
    els.reviewList.appendChild(item);
  });
  showScreen("review");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Event wiring ─────────────────────────────────────────────────
els.btnNext.addEventListener("click", nextQuestion);
els.btnRefresh.addEventListener("click", () => generateAndStart(true));
els.btnRetry.addEventListener("click", () => generateAndStart(true));
els.btnNewQuiz.addEventListener("click", () => generateAndStart(true));
els.btnReview.addEventListener("click", renderReview);
els.btnBack.addEventListener("click", () => showScreen("results"));

init();
