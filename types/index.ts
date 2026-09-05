export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type Status = 'Draft' | 'Published';

export interface Category { id: string; name: string; slug: string; description: string; topicCount: number; moduleCount: number; icon: string; }
export interface Topic { id: string; categoryId: string; title: string; slug: string; difficulty: Difficulty; estimatedMinutes: number; summary: string; concept: string; explanation: string; mentalModel?: string; realExample?: string; codeExample?: string; codeLanguage?: string; output?: string; commonMistakes?: string[]; practiceTask?: string; interviewQuestions?: string[]; published: boolean; order: number; }
export interface DsaProblem { id:string; topicId?:string; title:string; slug:string; difficulty:'Easy'|'Medium'|'Hard'; pattern:string; summary:string; problem:string; examples:string; constraints:string; hint:string; bruteForce:string; optimized:string; timeComplexity:string; spaceComplexity:string; starterCode:string; solution:string; testCases:string; solved?:boolean; }
