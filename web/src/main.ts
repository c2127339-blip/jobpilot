/**
 * JobPilot 前端入口：表单逻辑、文件读取、LLM 调用、结果渲染。
 */
import {
  generateResume,
  generateQuestions,
  generateAnswer,
} from './llm-client.js';
import type { GeneratedQuestions, GeneratedResume } from '../../src/types.js';

// ---------- DOM 引用 ----------
const jdInput = document.getElementById('jd') as HTMLTextAreaElement;
const resumeInput = document.getElementById('resume') as HTMLTextAreaElement;
const keyInput = document.getElementById('api-key') as HTMLInputElement;
const jdFile = document.getElementById('jd-file') as HTMLInputElement;
const resumeFile = document.getElementById('resume-file') as HTMLInputElement;
const btnResume = document.getElementById('btn-resume') as HTMLButtonElement;
const btnQuestions = document.getElementById('btn-questions') as HTMLButtonElement;
const loading = document.getElementById('loading') as HTMLSpanElement;
const resultPanel = document.getElementById('result-panel') as HTMLElement;
const resumeTab = document.getElementById('resume-tab') as HTMLElement;
const questionsTab = document.getElementById('questions-tab') as HTMLElement;

// ---------- 当前状态 ----------
let currentJd = '';
let currentResume = '';
let lastQuestions: GeneratedQuestions | null = null;

// ---------- 文件上传：读取为文本 ----------
function bindFileInput(input: HTMLInputElement, textarea: HTMLTextAreaElement) {
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      textarea.value = String(reader.result ?? '');
    };
    reader.readAsText(file, 'utf-8');
  });
}
bindFileInput(jdFile, jdInput);
bindFileInput(resumeFile, resumeInput);

// ---------- 工具函数 ----------
function getApiKey(): string {
  const key = keyInput.value.trim();
  if (!key) {
    throw new Error('请先填写 DeepSeek API Key（网页右侧输入框）');
  }
  return key;
}

function syncInputs() {
  currentJd = jdInput.value.trim();
  currentResume = resumeInput.value.trim();
}

function setBusy(busy: boolean) {
  loading.hidden = !busy;
  btnResume.disabled = busy;
  btnQuestions.disabled = busy;
}

function showPanel() {
  resultPanel.hidden = false;
}

function showError(container: HTMLElement, message: string) {
  const div = document.createElement('div');
  div.className = 'error-box';
  div.textContent = `❌ ${message}`;
  container.prepend(div);
}

function switchTab(name: string) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach((t) => t.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${name}"]`)?.classList.add('active');
  document.getElementById(name)?.classList.add('active');
}
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    switchTab((tab as HTMLElement).dataset.tab ?? 'resume-tab');
  });
});

// ---------- 渲染：简历 ----------
function renderResume(resume: GeneratedResume) {
  resumeTab.innerHTML = '';
  const h = document.createElement('h2');
  h.className = 'result-title';
  h.textContent = resume.title;
  resumeTab.appendChild(h);

  const header = document.createElement('div');
  header.className = 'resume-header';
  header.textContent = resume.header;
  resumeTab.appendChild(header);

  // 自我评价
  const summarySec = document.createElement('div');
  summarySec.className = 'resume-section';
  const sh = document.createElement('h3');
  sh.textContent = '自我评价';
  const sp = document.createElement('p');
  sp.textContent = resume.summary;
  summarySec.append(sh, sp);
  resumeTab.appendChild(summarySec);

  for (const sec of resume.sections) {
    const secEl = document.createElement('div');
    secEl.className = 'resume-section';
    const h3 = document.createElement('h3');
    h3.textContent = sec.heading;
    secEl.appendChild(h3);
    for (const line of sec.content) {
      const p = document.createElement('p');
      p.textContent = line;
      secEl.appendChild(p);
    }
    resumeTab.appendChild(secEl);
  }

  if (resume.gapNotes.length > 0) {
    const gap = document.createElement('div');
    gap.className = 'gap-notes';
    const gh = document.createElement('strong');
    gh.textContent = '📌 待补充 / 匹配度说明';
    gap.appendChild(gh);
    const ul = document.createElement('ul');
    for (const note of resume.gapNotes) {
      const li = document.createElement('li');
      li.textContent = note;
      ul.appendChild(li);
    }
    gap.appendChild(ul);
    resumeTab.appendChild(gap);
  }
}

// ---------- 渲染：面试问题 ----------
function renderQuestions(questions: GeneratedQuestions) {
  lastQuestions = questions;
  questionsTab.innerHTML = '';
  const h = document.createElement('h2');
  h.className = 'result-title';
  h.textContent = questions.title;
  questionsTab.appendChild(h);

  for (const cat of questions.categories) {
    const catEl = document.createElement('div');
    catEl.className = 'q-category';
    const h3 = document.createElement('h3');
    h3.textContent = cat.name;
    catEl.appendChild(h3);

    for (const q of cat.questions) {
      const item = document.createElement('div');
      item.className = 'q-item';

      const qText = document.createElement('div');
      qText.className = 'q-text';
      qText.textContent = q.text;
      const badge = document.createElement('span');
      badge.className = `badge badge-${q.difficulty}`;
      badge.textContent = diffLabel(q.difficulty);
      qText.appendChild(badge);
      item.appendChild(qText);

      const why = document.createElement('div');
      why.className = 'q-meta';
      why.textContent = `为什么问：${q.why}`;
      item.appendChild(why);

      const idea = document.createElement('div');
      idea.className = 'q-meta';
      idea.textContent = `参考答案思路：${q.answerIdea}`;
      item.appendChild(idea);

      // 「生成详细答案」按钮
      const answerBtn = document.createElement('button');
      answerBtn.className = 'q-answer-btn';
      answerBtn.textContent = '💡 生成详细答案';
      answerBtn.addEventListener('click', () => onAnswerClick(q.text, answerBtn));
      item.appendChild(answerBtn);

      catEl.appendChild(item);
    }
    questionsTab.appendChild(catEl);
  }

  if (questions.gapSuggestions.length > 0) {
    const gap = document.createElement('div');
    gap.className = 'gap-notes';
    const gh = document.createElement('strong');
    gh.textContent = '📌 简历 vs JD 差距提示';
    gap.appendChild(gh);
    const ul = document.createElement('ul');
    for (const s of questions.gapSuggestions) {
      const li = document.createElement('li');
      li.textContent = s;
      ul.appendChild(li);
    }
    gap.appendChild(ul);
    questionsTab.appendChild(gap);
  }
}

function diffLabel(d: string): string {
  return { easy: '简单', medium: '中等', hard: '困难' }[d] ?? d;
}

// ---------- 「生成详细答案」 ----------
async function onAnswerClick(questionText: string, btn: HTMLButtonElement) {
  const existing = btn.parentElement?.querySelector('.q-answer');
  if (existing) {
    existing.remove();
    return;
  }
  btn.textContent = '⏳ 生成中…';
  btn.disabled = true;
  try {
    const key = getApiKey();
    const result = await generateAnswer(questionText, currentJd || '未提供 JD', {
      apiKey: key,
    });
    const div = document.createElement('div');
    div.className = 'q-answer';
    div.textContent = result.answer;
    btn.parentElement?.appendChild(div);
    btn.textContent = '💡 收起答案';
  } catch (err) {
    btn.textContent = '💡 生成详细答案';
    const msg = err instanceof Error ? err.message : String(err);
    showError(questionsTab, msg);
  } finally {
    btn.disabled = false;
  }
}

// ---------- 主操作 ----------
async function onGenerateResume() {
  syncInputs();
  if (!currentJd) {
    showError(resumeTab, '请先填写岗位 JD / 职位要求');
    return;
  }
  setBusy(true);
  try {
    const key = getApiKey();
    const result = await generateResume(currentJd, currentResume, { apiKey: key });
    renderResume(result);
    showPanel();
    switchTab('resume-tab');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    showError(resumeTab, msg);
  } finally {
    setBusy(false);
  }
}

async function onGenerateQuestions() {
  syncInputs();
  if (!currentJd) {
    showError(questionsTab, '请先填写岗位 JD / 职位要求');
    return;
  }
  if (!currentResume) {
    showError(questionsTab, '请先填写简历信息（面试问题需要基于简历生成）');
    return;
  }
  setBusy(true);
  try {
    const key = getApiKey();
    const result = await generateQuestions(currentResume, currentJd, { apiKey: key });
    renderQuestions(result);
    showPanel();
    switchTab('questions-tab');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    showError(questionsTab, msg);
  } finally {
    setBusy(false);
  }
}

btnResume.addEventListener('click', onGenerateResume);
btnQuestions.addEventListener('click', onGenerateQuestions);
