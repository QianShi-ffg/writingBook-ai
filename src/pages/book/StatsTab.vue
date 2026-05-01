<script setup lang="ts">
import { computed } from 'vue';
import { useMainStore } from '../../store/main';
import { FileText, BookOpen, Link, Users, Activity, Library } from 'lucide-vue-next';

const props = defineProps<{
  bookId: string;
}>();

const store = useMainStore();
const book = computed(() => store.currentBook);
const characters = computed(() => store.characters);
const chapters = computed(() => store.chapters);
const realms = computed(() => store.realms || []);
const clues = computed(() => store.clues || []);
const references = computed(() => store.references || []);

const stats = computed(() => {
  return {
    totalWords: chapters.value.reduce((acc, c) => acc + (c.content?.length || 0), 0),
    totalChapters: chapters.value.length,
    activeChars: characters.value.filter(c => ['出场', '已出场'].includes(c.status || '')).length,
    unappearedChars: characters.value.filter(c => !['出场', '已出场', '死亡'].includes(c.status || '')).length,
    deadChars: characters.value.filter(c => c.status === '死亡').length,
    totalClues: clues.value.length,
    resolvedCluesCount: clues.value.filter(c => c.status === 'resolved').length
  };
});
</script>

<template>
  <div class="tab-pane scrollable">
    <div class="pane-header">
      <h2 class="pane-title">数据看板</h2>
    </div>

    <div class="kpi-grid">
      <!-- 总字数 -->
      <div class="kpi-card card gradient-blue">
        <div class="kpi-icon-wrapper">
          <FileText class="kpi-icon" />
        </div>
        <div class="kpi-content">
          <span class="kpi-label">累计创作字数</span>
          <div class="kpi-value-row">
            <span class="kpi-value">{{ stats.totalWords ? stats.totalWords.toLocaleString() : '0' }}</span>
            <span class="kpi-unit">字</span>
          </div>
        </div>
      </div>
      
      <!-- 总章节 -->
      <div class="kpi-card card gradient-purple">
        <div class="kpi-icon-wrapper">
          <BookOpen class="kpi-icon" />
        </div>
        <div class="kpi-content">
          <span class="kpi-label">已生成章节数</span>
          <div class="kpi-value-row">
            <span class="kpi-value">{{ stats.totalChapters || 0 }}</span>
            <span class="kpi-unit">章</span>
          </div>
        </div>
      </div>
      
      <!-- 伏笔回收率 -->
      <div class="kpi-card card gradient-green">
        <div class="kpi-icon-wrapper">
          <Link class="kpi-icon" />
        </div>
        <div class="kpi-content">
          <span class="kpi-label">伏笔回收进度</span>
          <div class="kpi-value-row" style="align-items: baseline; flex-wrap: nowrap; white-space: nowrap;">
            <span class="kpi-value" style="font-size: 1.5rem;">{{ stats.resolvedCluesCount || 0 }}</span>
            <span class="kpi-unit">已回收</span>
            <span style="color: rgba(255,255,255,1); margin: 0 4px; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);">/</span>
            <span class="kpi-value" style="font-size: 1rem; opacity: 1;">{{ stats.totalClues || 0 }}</span>
            <span class="kpi-unit" style="opacity: 1;">总计</span>
          </div>
        </div>
      </div>
      
      <!-- 人物统计 -->
      <div class="kpi-card card gradient-orange">
        <div class="kpi-icon-wrapper">
          <Users class="kpi-icon" />
        </div>
        <div class="kpi-content">
          <span class="kpi-label">人物角色分布</span>
          <div class="kpi-value-row" style="align-items: baseline; flex-wrap: nowrap; white-space: nowrap;">
            <span class="kpi-value" style="font-size: 1.5rem;">{{ stats.activeChars || 0 }}</span>
            <span class="kpi-unit">出场</span>
            <span style="color: rgba(255,255,255,1); margin: 0 4px; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);">/</span>
            <span class="kpi-value" style="font-size: 1rem; opacity: 1;">{{ stats.unappearedChars || 0 }}</span>
            <span class="kpi-unit" style="opacity: 1;">未出场</span>
            <span style="color: rgba(255,255,255,1); margin: 0 4px; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);">/</span>
            <span class="kpi-value" style="font-size: 1rem; opacity: 1;">{{ stats.deadChars || 0 }}</span>
            <span class="kpi-unit" style="opacity: 1;">死亡</span>
          </div>
        </div>
      </div>
    </div>

    <div style="margin-top: var(--spacing-xl); display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-lg);">
      <!-- 最近章节动态 -->
      <div class="card" style="padding: var(--spacing-lg);">
        <h3 style="font-size: 1rem; margin-bottom: var(--spacing-md); display: flex; align-items: center; gap: 8px;">
          <Activity class="icon-sm color-info" /> 最近更新章节
        </h3>
        <div v-if="chapters.length > 0" style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
          <div v-for="ch in chapters.slice().reverse().slice(0, 5)" :key="ch.id" style="display: flex; justify-content: space-between; padding: var(--spacing-sm) 0; border-bottom: 1px solid var(--color-border);">
            <span style="font-weight: 500; font-size: 0.875rem;">{{ ch.title }}</span>
            <div style="display: flex; gap: 12px; font-size: 0.75rem; color: var(--color-text-muted);">
              <span>{{ ch.wordCount }} 字</span>
              <span :class="['badge', ch.status === 'completed' ? 'badge-success' : 'badge-info']" style="font-size: 0.65rem; padding: 2px 6px;">{{ ch.status === 'completed' ? '已定稿' : (ch.status === 'reviewing' ? '审核中' : '草稿') }}</span>
            </div>
          </div>
        </div>
        <div v-else class="empty-state" style="padding: var(--spacing-md); border: none;">
          暂无章节数据
        </div>
      </div>
      
      <!-- 项目信息 -->
      <div class="card" style="padding: var(--spacing-lg);">
        <h3 style="font-size: 1rem; margin-bottom: var(--spacing-md); display: flex; align-items: center; gap: 8px;">
          <Library class="icon-sm color-success" /> 资料室与设定统计
        </h3>
        <div style="display: flex; flex-direction: column; gap: var(--spacing-md);">
          <div style="display: flex; justify-content: space-between; padding: var(--spacing-sm); background: var(--color-surface-hover); border-radius: var(--radius-md);">
            <span style="color: var(--color-text-muted); font-size: 0.875rem;">类型</span>
            <span style="font-weight: 500; color: var(--color-text);">{{ book?.type || '暂无' }}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: var(--spacing-sm); background: var(--color-surface-hover); border-radius: var(--radius-md);">
            <span style="color: var(--color-text-muted); font-size: 0.875rem;">已提取资料文献</span>
            <span style="font-weight: 500; color: var(--color-text);">{{ references.length }} 条</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: var(--spacing-sm); background: var(--color-surface-hover); border-radius: var(--radius-md);">
            <span style="color: var(--color-text-muted); font-size: 0.875rem;">境界层级数量</span>
            <span style="font-weight: 500; color: var(--color-text);">{{ realms.length }} 级</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: var(--spacing-sm); background: var(--color-surface-hover); border-radius: var(--radius-md);">
            <span style="color: var(--color-text-muted); font-size: 0.875rem;">已收录核心人物</span>
            <span style="font-weight: 500; color: var(--color-text);">{{ characters.length }} 人</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
