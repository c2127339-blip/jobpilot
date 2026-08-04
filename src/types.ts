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
