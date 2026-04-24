<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useMainStore } from '../store/main';
import { BookPlus, Settings, FileText, Layers, Clock } from 'lucide-vue-next';

const store = useMainStore();
const router = useRouter();
const showNewBookModal = ref(false);
const newBook = ref({ title: '', type: '修炼', description: '' });
const isSubmitting = ref(false);

onMounted(() => {
  store.fetchBooks();
});

const createBook = async () => {
  if (!newBook.value.title) return;
  isSubmitting.value = true;
  try {
    const book = await store.createBook(newBook.value);
    showNewBookModal.value = false;
    router.push(`/book/${book.id}`);
  } finally {
    isSubmitting.value = false;
  }
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const formatNumber = (num: number) => {
  return num ? num.toLocaleString() : '0';
};
</script>

<template>
  <div class="home-container">
    <header class="home-header">
      <div>
        <h1 class="page-title">小说创作工作台</h1>
        <p class="page-subtitle">管理您的所有小说项目，开启创作之旅</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" size="large" @click="showNewBookModal = true" class="create-btn">
          <el-icon class="el-icon--left"><BookPlus /></el-icon>
          创建新书
        </el-button>
        <el-button size="large" @click="router.push('/settings')">
          <el-icon class="el-icon--left"><Settings /></el-icon>
          系统设置
        </el-button>
      </div>
    </header>

    <div v-if="store.loading" class="loading-state">
      <el-skeleton :rows="5" animated />
    </div>
    
    <div v-else-if="store.books.length === 0" class="empty-state">
      <el-empty description="暂无小说项目，快来创建第一本吧！">
        <el-button type="primary" @click="showNewBookModal = true">创建新书</el-button>
      </el-empty>
    </div>
    
    <div v-else class="book-grid">
      <el-card 
        v-for="book in store.books" 
        :key="book.id" 
        class="book-card" 
        shadow="hover"
        @click="router.push(`/book/${book.id}`)"
      >
        <div class="card-content">
          <div class="card-header">
            <h3 class="book-title">{{ book.title }}</h3>
            <el-tag size="small" effect="light" class="type-tag">{{ book.type }}</el-tag>
          </div>
          
          <div class="book-desc">
            {{ book.description || '暂无简介' }}
          </div>

          <div class="book-stats">
            <div class="stat-item">
              <el-icon><Layers /></el-icon>
              <span>{{ formatNumber(book.chapterCount || 0) }} 章</span>
            </div>
            <div class="stat-item">
              <el-icon><FileText /></el-icon>
              <span>{{ formatNumber(book.wordCount || 0) }} 字</span>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="card-footer">
            <div class="timestamp">
              <el-icon><Clock /></el-icon>
              <span>最后更新: {{ formatDate(book.updatedAt) }}</span>
            </div>
            <el-button type="primary" link>进入创作 &rarr;</el-button>
          </div>
        </template>
      </el-card>
    </div>

    <!-- 创建新书弹窗 -->
    <el-dialog
      v-model="showNewBookModal"
      title="创建新书"
      width="500px"
      destroy-on-close
      class="custom-dialog"
    >
      <el-form :model="newBook" label-position="top" @submit.prevent>
        <el-form-item label="书名" required>
          <el-input 
            v-model="newBook.title" 
            placeholder="请输入小说名称" 
            maxlength="50" 
            show-word-limit 
          />
        </el-form-item>
        
        <el-form-item label="类型" required>
          <el-select v-model="newBook.type" placeholder="请选择小说类型" style="width: 100%">
            <el-option label="修炼（仙侠/玄幻）" value="修炼" />
            <el-option label="都市" value="都市" />
            <el-option label="科幻" value="科幻" />
            <el-option label="奇幻" value="奇幻" />
          </el-select>
        </el-form-item>

        <el-form-item label="简介 (选填)">
          <el-input 
            v-model="newBook.description" 
            type="textarea" 
            :rows="4" 
            placeholder="简单描述一下这本小说的核心设定或故事梗概..." 
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showNewBookModal = false">取消</el-button>
          <el-button type="primary" @click="createBook" :loading="isSubmitting" :disabled="!newBook.title">
            确认创建
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.home-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px;
}

.home-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 40px;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 8px 0;
  letter-spacing: -0.5px;
}

.page-subtitle {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 16px;
}

.create-btn {
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}

.loading-state {
  padding: 40px;
  background: var(--el-fill-color-light);
  border-radius: 12px;
}

.empty-state {
  padding: 60px 0;
  background: var(--el-fill-color-light);
  border-radius: 12px;
  border: 1px dashed var(--el-border-color);
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
}

.book-card {
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--el-border-color-light);
  height: 100%;
}

.book-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
  border-color: var(--el-color-primary-light-5);
}

/* 覆盖 el-card 的默认 padding */
:deep(.el-card__body) {
  padding: 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

:deep(.el-card__footer) {
  padding: 16px 24px;
  background-color: var(--el-fill-color-blank);
  border-top: 1px solid var(--el-border-color-lighter);
}

.card-content {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 12px;
}

.book-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.type-tag {
  border-radius: 6px;
  font-weight: 500;
}

.book-desc {
  font-size: 14px;
  color: var(--el-text-color-regular);
  line-height: 1.6;
  margin-bottom: 24px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.book-stats {
  display: flex;
  gap: 20px;
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px dashed var(--el-border-color-lighter);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

.stat-item .el-icon {
  font-size: 16px;
  color: var(--el-text-color-placeholder);
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.timestamp {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.custom-dialog :deep(.el-dialog__header) {
  margin-bottom: 0;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.custom-dialog :deep(.el-dialog__body) {
  padding: 24px 20px;
}
</style>