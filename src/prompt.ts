/**
 * 构建 LLM 提示词（system + user）。
 * 约束 LLM 只基于简历/JD 中真实出现的内容出题，避免编造。
 */
import type { AnswerResult, Category, GeneratedQuestions, GeneratedResume, Question } from './types.js';

/** 合法的分类 key */
const CATEGORY_KEYS: Category[] = ['project', 'tech', 'behavior', 'fit'];

/** 合法的难度值 */
const DIFFICULTY_KEYS: Question['difficulty'][] = ['easy', 'medium', 'hard'];

/** system 提示词：定义角色与输出要求 */
export function buildSystemPrompt(): string {
  return `你是一名资深的前端技术面试官，负责帮求职者做面试模拟。
你需要根据求职者的【简历】和目标岗位的【职位描述(J)】生成一份个性化的模拟面试问题。

要求：
1. 只依据简历和 JD 中真实出现的信息出题，不要编造简历里没有的经历或技能。
2. 所有问题的关键知识点必须能从简历或 JD 中找到出处（除非是通用软素质问题）。
3. 问题要贴合"前端开发实习"或简历所体现的岗位方向。
4. 问题要具体、有挑战性，能检验真实掌握程度，避免"你用过哪些框架"这类泛泛之问。

输出要求：
- 严格输出一个 JSON 对象（不要输出任何 markdown 代码块包裹，不要额外说明文字）。
- JSON 结构如下：
{
  "title": "字符串，如『前端开发实习 · 模拟面试问题』",
  "categories": [
    {
      "category": "project" | "tech" | "behavior" | "fit",
      "name": "分类中文名",
      "questions": [
        {
          "text": "问题正文",
          "why": "为什么面试官这样问（一两句话）",
          "answerIdea": "参考答案思路（一两句话，给出答题框架即可）",
          "difficulty": "easy" | "medium" | "hard"
        }
      ]
    }
  ],
  "gapSuggestions": ["简历与 JD 之间的差距提示，2-4 条"]
}

分类说明：
- project：围绕简历中的项目经历提问，深挖你负责的部分
- tech：考察前端/核心技术基础（源自 JD 要求与简历技能）
- behavior：行为面试题，考察沟通、协作、抗压
- fit：岗位匹配度，考察为什么想来、职业规划等

每个分类出 3-4 题，总共 12-15 题。请用中文输出。`;
}

/** user 提示词：注入简历与 JD 内容 */
export function buildUserPrompt(resume: string, jd: string): string {
  return `请根据下面的简历和 JD 生成模拟面试问题。

【简历】
${resume}

【职位描述(J)】
${jd}

请按 system 提示的要求输出 JSON。`;
}

/** 从 LLM 文本响应中提取 JSON（容错：去除可能的 markdown 代码块包裹） */
export function extractJson(text: string): string {
  const trimmed = text.trim();
  // 去除 ```json ... ``` 或 ``` ... ``` 包裹
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) return fenceMatch[1].trim();

  // 寻找第一个 { 到最后一个 } 之间的内容
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

/**
 * 校验并解析 LLM 返回的 JSON 是否符合 GeneratedQuestions 结构。
 * @throws Error 解析或结构校验失败时
 */
export function parseQuestionsJson(raw: string): GeneratedQuestions {
  const json = extractJson(raw);
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (err) {
    throw new Error(
      `LLM 返回内容不是合法 JSON，无法解析。原始内容片段：\n${json.slice(0, 300)}`,
    );
  }

  if (!isRecord(data)) {
    throw new Error('LLM 返回的 JSON 不是对象');
  }
  if (typeof data.title !== 'string') {
    throw new Error('JSON 缺少字符串字段 title');
  }
  if (!Array.isArray(data.categories) || data.categories.length === 0) {
    throw new Error('JSON 缺少非空数组字段 categories');
  }

  const categories = data.categories.map((cat, i) => {
    if (!isRecord(cat)) throw new Error(`categories[${i}] 不是对象`);
    if (typeof cat.category !== 'string' || typeof cat.name !== 'string') {
      throw new Error(`categories[${i}] 缺少 category/name`);
    }
    if (!CATEGORY_KEYS.includes(cat.category as Category)) {
      throw new Error(
        `categories[${i}].category 不合法：${cat.category}（应为 ${CATEGORY_KEYS.join(' / ')}）`,
      );
    }
    if (!Array.isArray(cat.questions) || cat.questions.length === 0) {
      throw new Error(`categories[${i}] 缺少非空 questions 数组`);
    }
    const questions = cat.questions.map((q, j) => {
      if (!isRecord(q)) throw new Error(`categories[${i}].questions[${j}] 不是对象`);
      for (const field of ['text', 'why', 'answerIdea', 'difficulty'] as const) {
        if (typeof q[field] !== 'string') {
          throw new Error(
            `categories[${i}].questions[${j}] 缺少字符串字段 ${field}`,
          );
        }
      }
      if (!DIFFICULTY_KEYS.includes(q.difficulty as Question['difficulty'])) {
        throw new Error(
          `categories[${i}].questions[${j}].difficulty 不合法：${q.difficulty}（应为 ${DIFFICULTY_KEYS.join(' / ')}）`,
        );
      }
      return {
        text: q.text,
        why: q.why,
        answerIdea: q.answerIdea,
        difficulty: q.difficulty as Question['difficulty'],
      };
    });
    return {
      category: cat.category as Category,
      name: cat.name,
      questions,
    };
  });

  let gapSuggestions: string[] = [];
  if (data.gapSuggestions !== undefined) {
    if (!Array.isArray(data.gapSuggestions)) {
      throw new Error('JSON 的 gapSuggestions 不是数组');
    }
    gapSuggestions = data.gapSuggestions.filter(
      (s): s is string => typeof s === 'string',
    );
  }

  return { title: data.title, categories, gapSuggestions };
}

function isRecord(v: unknown): v is Record<string, any> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * 简历生成的 system 提示词。
 * @param isMerge true=基于已有简历合并改写；false=从 JD 生成理想候选人模板
 */
export function buildResumeSystemPrompt(isMerge: boolean): string {
  if (isMerge) {
    return `你是一名资深的前端技术面试官，同时也是专业的简历优化顾问。
你的任务：根据目标岗位的【职位描述(J)】和求职者已有的【现有简历】，将现有简历改写成一份与 JD 高度匹配的简历。

要求：
1. 【重要】只改写结构、措辞、强调重点，绝对不要虚构求职者没有的经历、技能、项目或成果。
2. 从 JD 中提取关键词（如技术栈、能力点、职责），在已有简历中把匹配项前置、用更精准的措辞表达。
3. 对于 JD 要求但现有简历明显缺失的关键点，不要硬写进简历正文，而是放到 gapNotes 里说明「待补充」。
4. 保留求职者的真实教育背景、技能、项目事实，仅优化表达。
5. 用中文输出。

输出要求：
- 严格输出一个 JSON 对象（不要 markdown 代码块包裹，不要额外说明文字）。
- JSON 结构如下：
{
  "title": "字符串，如『前端开发实习生 · 匹配简历』",
  "header": "联系方式块，含姓名占位（如【姓名】）、电话、邮箱等",
  "summary": "自我评价（2-4 句，突出与 JD 的匹配点）",
  "sections": [
    { "heading": "章节标题（如『教育背景』『技能栈』『项目经历』）", "content": ["要点1", "要点2"] }
  ],
  "gapNotes": ["JD 要求但简历缺失的关键点，2-4 条，如：简历未提及 XX，建议补充"]
}`;
  }

  return `你是一名资深的前端技术面试官，也是专业的简历撰写顾问。
你的任务：根据目标岗位的【职位描述(J)】和【职位要求】，从零生成一份「理想候选人简历模板」，供求职者参考、填空、改编。

要求：
1. 这是一份模板，内容应是「理想候选人」应具备的教育背景 / 技能栈 / 项目经历 / 自我评价，覆盖 JD 的要求。
2. 项目经历可以写得像一份真实的参考案例，但字段值（公司、时间、具体数字）用占位符如 【公司名】【时间段】【成果数字】。
3. header 中姓名、电话、邮箱等联系方式一律用占位符，如【姓名】【电话】【邮箱】。
4. 结构清晰、可直接作为简历骨架使用，用中文输出。

输出要求：
- 严格输出一个 JSON 对象（不要 markdown 代码块包裹，不要额外说明文字）。
- JSON 结构如下：
{
  "title": "字符串，如『前端开发实习生 · 理想候选人简历模板』",
  "header": "联系方式块，全部用占位符，如【姓名】【电话】【邮箱】",
  "summary": "自我评价（2-4 句，体现理想候选人对该岗位的匹配）",
  "sections": [
    { "heading": "章节标题（如『教育背景』『技能栈』『项目经历』）", "content": ["要点1（含占位符）", "要点2"] }
  ],
  "gapNotes": ["该岗位需要但求职者可能需自行补充的能力，2-3 条"]
}`;
}

/** 简历生成的 user 提示词 */
export function buildResumeUserPrompt(jd: string, existingResume?: string): string {
  if (existingResume) {
    return `请根据下面的职位描述(J)和现有简历，生成一份与 JD 高度匹配的合并改写简历。

【职位描述(J)】
${jd}

【现有简历】
${existingResume}

请按 system 提示的要求输出 JSON。`;
  }

  return `请根据下面的职位描述(J)和职位要求，生成一份理想候选人简历模板。

【职位描述(J)】
${jd}

请按 system 提示的要求输出 JSON。`;
}

/**
 * 校验并解析 LLM 返回的简历 JSON（GeneratedResume 结构）。
 * @throws Error 解析或结构校验失败时
 */
export function parseResumeJson(raw: string): GeneratedResume {
  const json = extractJson(raw);
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (err) {
    throw new Error(
      `LLM 返回内容不是合法 JSON，无法解析。原始内容片段：\n${json.slice(0, 300)}`,
    );
  }

  if (!isRecord(data)) throw new Error('LLM 返回的 JSON 不是对象');
  for (const field of ['title', 'header', 'summary'] as const) {
    if (typeof data[field] !== 'string') {
      throw new Error(`JSON 缺少字符串字段 ${field}`);
    }
  }
  if (!Array.isArray(data.sections) || data.sections.length === 0) {
    throw new Error('JSON 缺少非空数组字段 sections');
  }

  const sections = data.sections.map((sec, i) => {
    if (!isRecord(sec)) throw new Error(`sections[${i}] 不是对象`);
    if (typeof sec.heading !== 'string') {
      throw new Error(`sections[${i}] 缺少字符串字段 heading`);
    }
    if (!Array.isArray(sec.content) || sec.content.length === 0) {
      throw new Error(`sections[${i}] 缺少非空 content 数组`);
    }
    const content = sec.content.filter(
      (s): s is string => typeof s === 'string',
    );
    if (content.length === 0) {
      throw new Error(`sections[${i}].content 不是字符串数组`);
    }
    return { heading: sec.heading, content };
  });

  let gapNotes: string[] = [];
  if (data.gapNotes !== undefined) {
    if (!Array.isArray(data.gapNotes)) {
      throw new Error('JSON 的 gapNotes 不是数组');
    }
    gapNotes = data.gapNotes.filter((s): s is string => typeof s === 'string');
  }

  return { title: data.title, header: data.header, summary: data.summary, sections, gapNotes };
}

/* ==================== 面试问题详细答案 ==================== */

/** 答案生成的 system 提示词 */
export function buildAnswerSystemPrompt(): string {
  return `你是一名资深的前端技术面试官。
你的任务：针对求职者的【面试问题】，结合【职位描述(J)】给出一个**完整、专业的中文参考回答**。

要求：
1. 回答要有条理，可分点（1. 2. 3.）论述。
2. 结合 JD 中的技术栈和岗位要求，让回答显得贴合岗位。
3. 回答要具体、可执行，像一位有经验的候选人当场作答，不要泛泛而谈。
4. 长度控制在 150-300 字，重点突出。

输出要求：
- 严格输出一个 JSON 对象（不要 markdown 代码块包裹）。
- JSON 结构如下：
{
  "answer": "完整的参考回答（纯文本，可含换行和编号）"
}`;
}

/** 答案生成的 user 提示词 */
export function buildAnswerUserPrompt(question: string, jd: string): string {
  return `请为下面的面试问题生成参考回答。

【面试问题】
${question}

【职位描述(J)】
${jd}

请按 system 提示的要求输出 JSON。`;
}

/**
 * 校验并解析 LLM 返回的答案 JSON。
 * @throws Error 解析或结构校验失败时
 */
export function parseAnswerJson(raw: string): AnswerResult {
  const json = extractJson(raw);
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (err) {
    throw new Error(
      `LLM 返回内容不是合法 JSON，无法解析。原始内容片段：\n${json.slice(0, 300)}`,
    );
  }
  if (!isRecord(data) || typeof data.answer !== 'string' || !data.answer.trim()) {
    throw new Error('JSON 缺少字符串字段 answer');
  }
  return { answer: data.answer };
}
