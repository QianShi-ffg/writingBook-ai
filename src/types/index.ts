export interface Book {
  id: string;
  title: string;
  type: string;
  outline?: string;
  outlineTree?: string;
  worldview?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutlineNode {
  id: string;
  startChapter: number;
  endChapter: number;
  title: string;
  description: string;
  wovenPlot?: string;
}

export interface Character {
  id: string;
  bookId: string;
  name: string;
  role: string;
  personality?: string;
  abilities?: string;
  status: string;
  createdAt: string;
}

export interface Chapter {
  id: string;
  bookId: string;
  volume: number;
  chapter: number;
  title: string;
  content: string;
  summary?: string;
  wordCount: number;
  status: 'draft' | 'reviewing' | 'completed'; // 新增状态字段
  reviewFeedback?: string; // 新增审核意见字段
  createdAt: string;
}

export interface Realm {
  id: string;
  bookId: string;
  level: number;
  name: string;
  description?: string;
  createdAt: string;
}

export interface Reference {
  id: string;
  bookId: string;
  sourceName: string;
  content: string;
}

export interface Settings {
  llmProvider?: string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}