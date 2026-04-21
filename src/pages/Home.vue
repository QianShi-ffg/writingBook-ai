<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMainStore } from '../store/main';
import { BookPlus, Settings } from 'lucide-vue-next';

const store = useMainStore();
const router = useRouter();
const showNewBookModal = ref(false);
const newBook = ref({ title: '', type: '修炼' });

onMounted(() => {
  store.fetchBooks();
});

const createBook = async () => {
  if (!newBook.value.title) return;
  const book = await store.createBook(newBook.value);
  showNewBookModal.value = false;
  router.push(`/book/${book.id}`);
};
</script>

<template>
  <div class="home-container">
    <header class="home-header">
      <h1 class="page-title">小说创作工作台</h1>
      <div class="header-actions">
        <button @click="showNewBookModal = true" class="btn-primary">
          <BookPlus class="icon" />
          创建新书
        </button>
        <button @click="router.push('/settings')" class="btn-secondary">
          <Settings class="icon" />
          系统设置
        </button>
      </div>
    </header>

    <div v-if="store.loading" class="loading-state">
      <p>正在加载数据...</p>
    </div>
    
    <div v-else-if="store.books.length === 0" class="empty-state">
      <p>暂无小说项目，快来创建第一本吧！</p>
    </div>
    
    <div v-else class="book-grid">
      <div v-for="book in store.books" :key="book.id" @click="router.push(`/book/${book.id}`)" class="book-card card">
        <div class="card-header">
          <h3 class="book-title">{{ book.title }}</h3>
          <span class="badge badge-info">{{ book.type }}</span>
        </div>
        <div class="card-footer">
          <span class="timestamp">最后更新: {{ new Date(book.updatedAt).toLocaleString() }}</span>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showNewBookModal" class="modal-overlay">
      <div class="modal-content">
        <h2 class="modal-title">创建新书</h2>
        <div class="form-group">
          <label>书名</label>
          <input v-model="newBook.title" type="text" placeholder="输入书名..." />
        </div>
        <div class="form-group">
          <label>类型</label>
          <select v-model="newBook.type">
            <option value="修炼">修炼（仙侠/玄幻）</option>
            <option value="都市">都市</option>
            <option value="科幻">科幻</option>
            <option value="奇幻">奇幻</option>
          </select>
        </div>
        <div class="modal-actions">
          <button @click="showNewBookModal = false" class="btn-secondary">取消</button>
          <button @click="createBook" class="btn-primary" :disabled="!newBook.title">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-2xl) var(--spacing-lg);
}

.home-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-2xl);
  padding-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}

.page-title {
  font-family: var(--font-mono);
  font-size: 1.5rem;
  color: var(--color-text);
  letter-spacing: -0.02em;
}

.header-actions {
  display: flex;
  gap: var(--spacing-md);
}

.icon {
  width: 18px;
  height: 18px;
}

.loading-state, .empty-state {
  text-align: center;
  padding: var(--spacing-2xl);
  color: var(--color-text-muted);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}

.book-card {
  cursor: pointer;
  transition: transform var(--transition-fast), border-color var(--transition-fast);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 140px;
}

.book-card:hover {
  transform: translateY(-2px);
  border-color: var(--color-cta);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-md);
}

.book-title {
  font-size: 1.125rem;
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
}

.card-footer {
  margin-top: auto;
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.timestamp {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}

.modal-title {
  font-size: 1.25rem;
  margin-bottom: var(--spacing-lg);
  font-family: var(--font-mono);
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-bottom: var(--spacing-xs);
}

.form-group input, .form-group select {
  width: 100%;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
}
</style>