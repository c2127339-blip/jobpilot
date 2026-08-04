/**
 * 构建 LLM 提示词（system + user）。
 * 约束 LLM 只基于简历/JD 中真实出现的内容出题，避免编造。
 */
import type { Category, GeneratedQuestions, Question } from './types.js';

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
