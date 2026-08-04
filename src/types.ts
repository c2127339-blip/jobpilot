/**
 * 共享类型定义：面试问题、分类、生成结果。
 * LLM 返回的 JSON 与此结构对应（见 src/prompt.ts）。
 */

/** 问题分类 */
export type Category = 'project' | 'tech' | 'behavior' | 'fit';

/** 单个面试问题 */
export interface Question {
  /** 问题正文 */
  text: string;
  /** 为什么面试官会这样问 */
  why: string;
  /** 参考答案思路 */
  answerIdea: string;
  /** 难度：easy / medium / hard */
  difficulty: 'easy' | 'medium' | 'hard';
}

/** 一个问题分类（含若干问题） */
export interface QuestionCategory {
  /** 分类 key（project / tech / behavior / fit） */
  category: Category;
  /** 分类中文标题 */
  name: string;
  questions: Question[];
}

/** 完整生成结果 */
export interface GeneratedQuestions {
  /** 标题，如「前端开发实习 · 模拟面试问题」 */
  title: string;
  categories: QuestionCategory[];
  /** 简历与 JD 的差距提示 */
  gapSuggestions: string[];
}

/** 简历的一个章节（如「项目经历」） */
export interface ResumeSection {
  /** 章节标题 */
  heading: string;
  /** 章节内容要点 / 段落 */
  content: string[];
}

/** 生成的简历 */
export interface GeneratedResume {
  /** 标题，如「前端开发实习生 · 匹配简历」 */
  title: string;
  /** 顶部联系方式块（姓名 / 电话 / 邮箱，可留占位符） */
  header: string;
  /** 自我评价 */
  summary: string;
  /** 简历各章节 */
  sections: ResumeSection[];
  /** 与 JD 的匹配度说明 / 待补充项 */
  gapNotes: string[];
}

/** 面试问题的详细答案 */
export interface AnswerResult {
  /** 完整参考回答（1-2 段中文） */
  answer: string;
}
