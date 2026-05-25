/**
 * 驾考刷题网页 - 主逻辑
 * 包含: Fisher-Yates 洗牌算法、答题状态管理、时间轴回溯、回放功能
 *
 * 时间轴设计原则:
 *   - state.elapsed  永远是「相对考试开始的毫秒数」，范围 [0, EXAM_DURATION_MS]
 *   - state.startTime  永远是「考试开始的绝对时间戳」
 *   - 快照引擎 SnapshotEngine 内部存储绝对时间戳
 *   - 时间轴滑块百分比 → 相对毫秒数: pct * EXAM_DURATION_MS
 *   - 查快照时: absTime = startTime + relativeMs
 *   - 任何时候都不允许把绝对时间戳写入 state.elapsed
 */

(function () {
  const EXAM_DURATION_MS = 30 * 60 * 1000;
  const QUESTIONS_PER_EXAM = 100;

  const state = {
    allQuestions: [],
    examQuestions: [],
    currentIndex: 0,
    answers: {},
    startTime: 0,
    elapsed: 0,
    timerId: null,
    timeTravelMode: false,
    isPlaying: false,
    playIntervalId: null,
    playTargetTime: 0,
    originalAnswers: null,
    originalCurrentIndex: 0
  };

  const engine = new SnapshotEngine({ maxSnapshots: 600, minInterval: 100 });

  const el = {
    qNumber: document.getElementById('q-number'),
    qType: document.getElementById('q-type'),
    qCategory: document.getElementById('q-category'),
    questionText: document.getElementById('question-text'),
    optionsContainer: document.getElementById('options-container'),
    feedback: document.getElementById('feedback'),
    answeredCount: document.getElementById('answered-count'),
    totalCount: document.getElementById('total-count'),
    correctCount: document.getElementById('correct-count'),
    elapsedTime: document.getElementById('elapsed-time'),
    questionGrid: document.getElementById('question-grid'),
    restartBtn: document.getElementById('restart-btn'),
    timelineTrack: document.getElementById('timeline-track'),
    timelineFill: document.getElementById('timeline-fill'),
    timelineThumb: document.getElementById('timeline-thumb'),
    timelineStart: document.getElementById('timeline-start'),
    timelineCurrent: document.getElementById('timeline-current'),
    timelineEnd: document.getElementById('timeline-end'),
    timelineInfo: document.getElementById('timeline-info'),
    timeTravelMode: document.getElementById('time-travel-mode'),
    playBtn: document.getElementById('play-btn'),
    pauseBtn: document.getElementById('pause-btn'),
    resetTimelineBtn: document.getElementById('reset-timeline-btn')
  };

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function clampElapsed(ms) {
    return Math.max(0, Math.min(EXAM_DURATION_MS, ms));
  }

  async function loadQuestions() {
    const res = await fetch('/api/questions');
    const data = await res.json();
    state.allQuestions = data.questions;
    startExam();
  }

  function startExam() {
    state.examQuestions = shuffle(state.allQuestions).slice(0, QUESTIONS_PER_EXAM);
    state.currentIndex = 0;
    state.answers = {};
    state.startTime = Date.now();
    state.elapsed = 0;
    state.timeTravelMode = false;
    state.isPlaying = false;
    state.originalAnswers = null;
    state.originalCurrentIndex = 0;

    engine.clear();
    engine.record(state.startTime, { answers: {}, currentIndex: 0 });

    stopPlayback();
    startTimer();
    renderAll();
  }

  function startTimer() {
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = setInterval(() => {
      if (!state.timeTravelMode) {
        state.elapsed = clampElapsed(Date.now() - state.startTime);
        updateTimelineUI();
        renderStats();
      }
    }, 250);
  }

  function stopTimer() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function renderAll() {
    renderQuestion();
    renderGrid();
    renderStats();
    updateTimelineUI();
  }

  function renderQuestion() {
    const q = state.examQuestions[state.currentIndex];
    if (!q) return;

    el.qNumber.textContent = state.currentIndex + 1;
    el.qType.textContent = q.type === 'judgment' ? '判断题' : '单选题';
    el.qCategory.textContent = q.category;
    el.questionText.textContent = q.question;

    el.optionsContainer.innerHTML = '';
    const answer = state.answers[q.id];
    const showResult = answer && answer.submitted;

    q.options.forEach((opt, i) => {
      const div = document.createElement('div');
      div.className = 'option-item';

      if (showResult) {
        if (i === q.answer) div.classList.add('correct');
        if (answer.selected === i && !answer.isCorrect) div.classList.add('wrong');
        div.classList.add('disabled');
      } else if (answer && answer.selected === i) {
        div.classList.add('selected');
      }

      const label = document.createElement('span');
      label.className = 'option-label';
      label.textContent = q.type === 'judgment'
        ? (i === 0 ? 'A' : 'B')
        : String.fromCharCode(65 + i);

      const text = document.createElement('span');
      text.textContent = opt;

      div.appendChild(label);
      div.appendChild(text);

      if (!state.timeTravelMode && !showResult) {
        div.addEventListener('click', () => selectOption(i));
      }

      el.optionsContainer.appendChild(div);
    });

    renderFeedback(answer);
  }

  function renderFeedback(answer) {
    if (!answer) {
      el.feedback.className = 'feedback';
      el.feedback.textContent = '';
      return;
    }

    if (!answer.submitted) {
      el.feedback.className = 'feedback';
      el.feedback.textContent = '';
      return;
    }

    if (answer.isCorrect) {
      el.feedback.className = 'feedback show correct';
      el.feedback.textContent = '✓ 回答正确！';
    } else {
      const q = state.examQuestions[state.currentIndex];
      const correctLabel = q.type === 'judgment'
        ? (q.answer === 0 ? '正确' : '错误')
        : String.fromCharCode(65 + q.answer);
      el.feedback.className = 'feedback show wrong';
      el.feedback.textContent = `✗ 回答错误！正确答案: ${correctLabel}`;
    }
  }

  function selectOption(optionIndex) {
    const q = state.examQuestions[state.currentIndex];
    const existing = state.answers[q.id];

    if (existing && existing.submitted) return;

    if (existing && existing.selected === optionIndex) {
      existing.selected = -1;
      existing.submitted = true;
      existing.isCorrect = false;
      existing.timestamp = Date.now();
    } else {
      state.answers[q.id] = {
        selected: optionIndex,
        submitted: true,
        isCorrect: optionIndex === q.answer,
        timestamp: Date.now()
      };
    }

    const now = Date.now();
    engine.record(now, {
      answers: snapshotAnswers(state.answers),
      currentIndex: state.currentIndex
    });

    renderQuestion();
    renderGrid();
    renderStats();
    updateTimelineUI();

    setTimeout(() => {
      if (state.currentIndex < state.examQuestions.length - 1) {
        state.currentIndex++;
        renderQuestion();
        renderGrid();
      }
    }, 800);
  }

  function snapshotAnswers(answers) {
    const snap = {};
    for (const id in answers) {
      snap[id] = { ...answers[id] };
    }
    return snap;
  }

  function renderGrid() {
    el.questionGrid.innerHTML = '';
    state.examQuestions.forEach((q, idx) => {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.textContent = idx + 1;

      const a = state.answers[q.id];
      if (a && a.submitted) {
        cell.classList.add(a.isCorrect ? 'correct' : 'wrong');
      } else if (a && a.selected >= 0) {
        cell.classList.add('answered');
      }

      if (idx === state.currentIndex) {
        cell.classList.add('current');
      }

      cell.addEventListener('click', () => {
        if (!state.timeTravelMode) {
          state.currentIndex = idx;
          renderQuestion();
          renderGrid();
        }
      });

      el.questionGrid.appendChild(cell);
    });
  }

  function renderStats() {
    el.totalCount.textContent = QUESTIONS_PER_EXAM;
    const answered = Object.values(state.answers).filter(a => a.submitted);
    el.answeredCount.textContent = answered.length;
    const correctCount = answered.filter(a => a.isCorrect).length;
    el.correctCount.textContent = correctCount;
    el.elapsedTime.textContent = formatTime(clampElapsed(state.elapsed));
  }

  function updateTimelineUI() {
    const safeElapsed = clampElapsed(state.elapsed);
    const pct = (safeElapsed / EXAM_DURATION_MS) * 100;
    el.timelineFill.style.width = pct + '%';
    el.timelineThumb.style.left = pct + '%';
    el.timelineCurrent.textContent = formatTime(safeElapsed);
    el.timelineEnd.textContent = formatTime(EXAM_DURATION_MS);
  }

  function enterTimeTravelMode() {
    state.timeTravelMode = true;
    el.timelineTrack.classList.add('time-travel-active');
    el.timelineInfo.classList.add('traveling');
    el.timelineInfo.textContent =
      '🔮 时光回溯模式已开启。点击时间条上的任意位置，试卷将回放到该时刻的答题状态。';

    if (state.playIntervalId) {
      stopPlayback();
    }
  }

  function exitTimeTravelMode() {
    if (state.timeTravelMode && state.originalAnswers) {
      state.answers = { ...state.originalAnswers };
      state.currentIndex = state.originalCurrentIndex;
    }
    state.timeTravelMode = false;
    el.timelineTrack.classList.remove('time-travel-active');
    el.timelineInfo.classList.remove('traveling');
    el.timelineInfo.textContent =
      '点击时间条上的任意位置，可让整张卷子回放到那个时刻的答题状态。';
    stopPlayback();
    state.elapsed = clampElapsed(Date.now() - state.startTime);
    renderAll();
  }

  function timeTravelTo(relativeMs) {
    const clampedRelative = clampElapsed(relativeMs);
    const absTime = state.startTime + clampedRelative;

    const snap = engine.snapshotAt(absTime);
    if (!snap) return;

    const restored = engine.restore(snap);
    if (!restored) return;

    if (!state.originalAnswers) {
      state.originalAnswers = { ...state.answers };
      state.originalCurrentIndex = state.currentIndex;
    }

    state.answers = {};
    for (const id in restored.answers) {
      state.answers[id] = { ...restored.answers[id] };
    }
    state.currentIndex = restored.currentIndex;
    state.elapsed = clampedRelative;
    renderAll();
  }

  function startPlayback() {
    if (state.isPlaying) return;

    if (!state.timeTravelMode) {
      enterTimeTravelMode();
      if (!state.originalAnswers) {
        state.originalAnswers = { ...state.answers };
        state.originalCurrentIndex = state.currentIndex;
      }
    }

    state.isPlaying = true;
    el.playBtn.disabled = true;
    el.pauseBtn.disabled = false;

    const realElapsed = clampElapsed(Date.now() - state.startTime);
    state.playTargetTime = realElapsed;

    if (state.elapsed >= realElapsed) {
      state.elapsed = 0;
    }

    state.playIntervalId = setInterval(() => {
      state.elapsed += 300;

      if (state.elapsed >= state.playTargetTime) {
        state.elapsed = state.playTargetTime;
        const wasPlaying = state.isPlaying;
        stopPlayback();
        exitTimeTravelMode();
        if (wasPlaying) {
          state.elapsed = realElapsed;
        }
        return;
      }

      const absTime = state.startTime + state.elapsed;
      const snap = engine.snapshotAt(absTime);
      if (snap) {
        const restored = engine.restore(snap);
        if (restored) {
          state.answers = {};
          for (const id in restored.answers) {
            state.answers[id] = { ...restored.answers[id] };
          }
          state.currentIndex = restored.currentIndex;
        }
      }
      renderAll();
    }, 150);
  }

  function stopPlayback() {
    state.isPlaying = false;
    el.playBtn.disabled = false;
    el.pauseBtn.disabled = true;
    if (state.playIntervalId) {
      clearInterval(state.playIntervalId);
      state.playIntervalId = null;
    }
  }

  function bindEvents() {
    el.restartBtn.addEventListener('click', () => {
      if (confirm('确定要重新抽题并开始新的考试吗？')) {
        startExam();
      }
    });

    el.timeTravelMode.addEventListener('change', (e) => {
      if (e.target.checked) {
        state.originalAnswers = { ...state.answers };
        state.originalCurrentIndex = state.currentIndex;
        enterTimeTravelMode();
      } else {
        exitTimeTravelMode();
        state.originalAnswers = null;
      }
    });

    el.timelineTrack.addEventListener('click', (e) => {
      const rect = el.timelineTrack.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));

      if (state.timeTravelMode || el.timeTravelMode.checked) {
        if (!el.timeTravelMode.checked) {
          el.timeTravelMode.checked = true;
          state.originalAnswers = { ...state.answers };
          state.originalCurrentIndex = state.currentIndex;
          enterTimeTravelMode();
        }
        const relativeMs = pct * EXAM_DURATION_MS;
        timeTravelTo(relativeMs);
      }
    });

    let isDragging = false;
    el.timelineThumb.addEventListener('mousedown', (e) => {
      if (!state.timeTravelMode && !el.timeTravelMode.checked) return;
      e.preventDefault();
      isDragging = true;
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const rect = el.timelineTrack.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      if (!state.timeTravelMode) {
        el.timeTravelMode.checked = true;
        state.originalAnswers = { ...state.answers };
        state.originalCurrentIndex = state.currentIndex;
        enterTimeTravelMode();
      }
      const relativeMs = pct * EXAM_DURATION_MS;
      timeTravelTo(relativeMs);
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });

    el.playBtn.addEventListener('click', startPlayback);
    el.pauseBtn.addEventListener('click', stopPlayback);

    el.resetTimelineBtn.addEventListener('click', () => {
      el.timeTravelMode.checked = false;
      exitTimeTravelMode();
      state.originalAnswers = null;
    });
  }

  function init() {
    bindEvents();
    loadQuestions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.SnapshotEngine = SnapshotEngine;
})();
