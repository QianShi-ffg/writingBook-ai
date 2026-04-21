<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMainStore } from '../store/main';
import { Save, ArrowLeft } from 'lucide-vue-next';
import type { Settings } from '../types';

const store = useMainStore();
const router = useRouter();
const localSettings = ref<Settings>({ llmProvider: 'openai', apiKey: '', model: 'gpt-3.5-turbo', baseUrl: 'https://api.openai.com/v1' });
const isSaving = ref(false);

onMounted(async () => {
  await store.fetchSettings();
  if (store.settings.llmProvider) {
    localSettings.value = { ...localSettings.value, ...store.settings };
  }
});

const saveSettings = async () => {
  isSaving.value = true;
  await store.updateSettings(localSettings.value);
  isSaving.value = false;
  alert('Settings Saved');
};
</script>

<template>
  <div class="settings-container">
    <div class="settings-header">
      <button @click="router.back()" class="btn-icon back-btn">
        <ArrowLeft class="icon-lg" />
      </button>
      <h1 class="page-title">系统设置</h1>
    </div>

    <div class="settings-card card">
      <h2 class="section-title">AI大模型配置</h2>
      
      <div class="form-group">
        <label>模型提供商</label>
        <select v-model="localSettings.llmProvider" class="form-control">
          <option value="openai">OpenAI (兼容格式)</option>
        </select>
      </div>

      <div class="form-group">
        <label>API 基础地址 (Base URL)</label>
        <input v-model="localSettings.baseUrl" type="text" class="form-control" placeholder="https://api.openai.com/v1" />
        <p class="help-text">支持任何兼容 OpenAI 接口格式的代理或本地服务</p>
      </div>

      <div class="form-group">
        <label>API 密钥 (API Key)</label>
        <input v-model="localSettings.apiKey" type="password" class="form-control" placeholder="sk-..." />
      </div>

      <div class="form-group">
        <label>默认模型 (Model)</label>
        <input v-model="localSettings.model" type="text" class="form-control" placeholder="gpt-4" />
      </div>

      <div class="form-actions">
        <button @click="saveSettings" :disabled="isSaving" class="btn-primary">
          <Save class="icon" />
          {{ isSaving ? '保存中...' : '保存设置' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-container {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--spacing-2xl) var(--spacing-lg);
}

.settings-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-2xl);
}

.page-title {
  font-family: var(--font-mono);
  font-size: 1.5rem;
  color: var(--color-text);
  letter-spacing: -0.02em;
}

.back-btn {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
}

.icon-lg {
  width: 24px;
  height: 24px;
}

.icon {
  width: 18px;
  height: 18px;
}

.settings-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.section-title {
  font-size: 1.25rem;
  font-family: var(--font-mono);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-group label {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  font-weight: 500;
}

.form-control {
  width: 100%;
}

.help-text {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: var(--spacing-xs);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
}
</style>