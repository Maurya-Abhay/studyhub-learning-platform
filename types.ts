export type Difficulty = 'Beginner' | 'Easy' | 'Medium' | 'Hard' | string;

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  moduleCount: number;
  topicCount: number;
};

export type Topic = {
  id: string;
  categoryId: string;
  title: string;
  slug: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  summary: string;
  concept: string;
  explanation: string;
  mentalModel?: string;
  realExample?: string;
  codeExample?: string;
  codeLanguage?: string;
  output?: string;
  commonMistakes: string[];
  practiceTask?: string;
  interviewQuestions?: string[];
  published: boolean;
  order: number;
};

export type DsaProblem = {
  id: string;
  topicId?: string;
  title: string;
  slug: string;
  difficulty: Difficulty;
  pattern: string;
  summary: string;
  problem: string;
  examples: string;
  constraints: string;
  hint: string;
  bruteForce: string;
  optimized: string;
  timeComplexity: string;
  spaceComplexity: string;
  starterCode: string;
  solution: string;
  testCases: string;
};
