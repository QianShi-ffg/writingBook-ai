import { defineStore } from 'pinia';
import apiClient from '../api/client';
import type { Book, Character, Chapter, Settings, Realm, Reference } from '../types';

export const useMainStore = defineStore('main', {
  state: () => ({
    books: [] as Book[],
    currentBook: null as Book | null,
    characters: [] as Character[],
    chapters: [] as Chapter[],
    realms: [] as Realm[],
    references: [] as Reference[],
    settings: {} as Settings,
    loading: false,
    error: '' as string,
    activeRequestController: null as AbortController | null,
  }),
  getters: {
    // ...
  },
  actions: {
    abortCurrentGeneration() {
      if (this.activeRequestController) {
        this.activeRequestController.abort();
        this.activeRequestController = null;
      }
    },
    async fetchBooks() {
      this.loading = true;
      try {
        const { data } = await apiClient.get('/books');
        this.books = data;
      } catch (e: any) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },
    async createBook(book: Partial<Book>) {
      const { data } = await apiClient.post('/books', book);
      this.books.push(data);
      return data;
    },
    async fetchBook(id: string) {
      const { data } = await apiClient.get(`/books/${id}`);
      this.currentBook = data;
    },
    async updateBook(id: string, updates: Partial<Book>) {
      const { data } = await apiClient.put(`/books/${id}`, updates);
      if (this.currentBook?.id === id) {
        this.currentBook = { ...this.currentBook, ...data };
      }
      const index = this.books.findIndex(b => b.id === id);
      if (index !== -1) {
        this.books[index] = { ...this.books[index], ...data };
      }
    },
    async fetchCharacters(bookId: string) {
      const { data } = await apiClient.get(`/characters?bookId=${bookId}`);
      this.characters = data;
    },
    async createCharacter(character: Partial<Character>) {
      const { data } = await apiClient.post('/characters', character);
      this.characters.push(data);
    },
    async updateCharacter(id: string, updates: Partial<Character>) {
      const { data } = await apiClient.put(`/characters/${id}`, updates);
      const index = this.characters.findIndex(c => c.id === id);
      if (index !== -1) {
        this.characters[index] = { ...this.characters[index], ...data };
      }
    },
    async deleteCharacter(id: string) {
      await apiClient.delete(`/characters/${id}`);
      this.characters = this.characters.filter(c => c.id !== id);
    },
    async fetchChapters(bookId: string) {
      const { data } = await apiClient.get(`/chapters?bookId=${bookId}`);
      this.chapters = data;
    },
    async createChapter(chapter: Partial<Chapter>) {
      const { data } = await apiClient.post('/chapters', chapter);
      this.chapters.push(data);
      return data;
    },
    async updateChapter(id: string, updates: Partial<Chapter>) {
      const { data } = await apiClient.put(`/chapters/${id}`, updates);
      const index = this.chapters.findIndex(c => c.id === id);
      if (index !== -1) {
        this.chapters[index] = { ...this.chapters[index], ...data };
      }
    },
    async deleteChapter(id: string) {
      await apiClient.delete(`/chapters/${id}`);
      this.chapters = this.chapters.filter(c => c.id !== id);
    },
    async fetchRealms(bookId: string) {
      const { data } = await apiClient.get(`/realms?bookId=${bookId}`);
      this.realms = data;
    },
    async createRealm(realm: Partial<Realm>) {
      const { data } = await apiClient.post('/realms', realm);
      if (!this.realms) this.realms = [];
      this.realms.push(data);
      return data;
    },
    async updateRealm(id: string, updates: Partial<Realm>) {
      const { data } = await apiClient.put(`/realms/${id}`, updates);
      if (!this.realms) this.realms = [];
      const index = this.realms.findIndex(r => r.id === id);
      if (index !== -1) {
        this.realms[index] = { ...this.realms[index], ...data };
      }
    },
    async deleteRealm(id: string) {
      await apiClient.delete(`/realms/${id}`);
      if (!this.realms) this.realms = [];
      this.realms = this.realms.filter(r => r.id !== id);
    },
    async fetchReferences(bookId: string) {
      const { data } = await apiClient.get(`/references?bookId=${bookId}`);
      this.references = data;
    },
    async createReference(reference: Partial<Reference>) {
      const { data } = await apiClient.post('/references', reference);
      if (!this.references) this.references = [];
      this.references.push(data);
      return data;
    },
    async updateReference(id: string, updates: Partial<Reference>) {
      const { data } = await apiClient.put(`/references/${id}`, updates);
      if (!this.references) this.references = [];
      const index = this.references.findIndex(r => r.id === id);
      if (index !== -1) {
        this.references[index] = { ...this.references[index], ...data };
      }
    },
    async deleteReference(id: string) {
      await apiClient.delete(`/references/${id}`);
      if (!this.references) this.references = [];
      this.references = this.references.filter(r => r.id !== id);
    },
    async fetchSettings() {
      const { data } = await apiClient.get('/settings');
      this.settings = data;
    },
    async updateSettings(settings: Settings) {
      const { data } = await apiClient.put('/settings', settings);
      this.settings = data;
    },
    async generateContent(prompt: string, systemPrompt?: string, maxTokens?: number) {
      const { data } = await apiClient.post('/writing/generate', { prompt, systemPrompt, maxTokens });
      return data.text;
    },
    async generateContentStream(
      prompt: string, 
      systemPrompt: string | undefined, 
      maxTokens: number | undefined, 
      onChunk: (text: string) => void
    ) {
      return new Promise<void>(async (resolve, reject) => {
        const controller = new AbortController();
        this.activeRequestController = controller;
        // 设置 10 分钟超长超时，适配代理和缓慢的大模型
        const timeoutId = setTimeout(() => controller.abort(), 600000);
        
        try {
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002/api';
          const response = await fetch(`${apiBaseUrl}/writing/generate-stream`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt, systemPrompt, maxTokens }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const reader = response.body?.getReader();
          if (!reader) throw new Error('No reader available');
          const decoder = new TextDecoder('utf-8');

          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6);
                if (dataStr === '[DONE]') {
                  resolve();
                  return;
                }
                try {
                  const data = JSON.parse(dataStr);
                  if (data.error) {
                    reject(new Error(data.error));
                    return;
                  }
                  onChunk(data.text);
                } catch (e) {
                  // ignore invalid JSON for incomplete chunks
                }
              }
            }
          }
          resolve();
        } catch (e: any) {
          clearTimeout(timeoutId);
          if (e.name === 'AbortError') {
            reject(new Error('请求超时，请检查大模型 API 接口网络连通性'));
          } else {
            reject(e);
          }
        }
      });
    }
  }
});
