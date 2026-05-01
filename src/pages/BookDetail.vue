<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMainStore } from '../store/main';
import { ArrowLeft, BookOpen, Globe, Users, Edit3, BarChart2, Wand2, Plus, Save, Layers, StopCircle, Trash2, Library, Sparkles, Compass, GitMerge, Link, PlayCircle, Send } from 'lucide-vue-next';
import { MdEditor, MdPreview } from 'md-editor-v3';
import 'md-editor-v3/lib/style.css';
import 'md-editor-v3/lib/preview.css';

import CharactersTab from './book/CharactersTab.vue';
import ReferencesTab from './book/ReferencesTab.vue';
import CluesTab from './book/CluesTab.vue';
import RealmsTab from './book/RealmsTab.vue';
import StatsTab from './book/StatsTab.vue';

// Hooks
import { useMessages } from '../composables/useMessages';
import { useConfirm } from '../composables/useConfirm';
import { useBookBasic } from '../composables/useBookBasic';
import { useCascadeGeneration } from '../composables/useCascadeGeneration';
import { useOutline } from '../composables/useOutline';
import { useChapter } from '../composables/useChapter';
import { usePlotWeaver } from '../composables/usePlotWeaver';
import { usePolish } from '../composables/usePolish';

const route = useRoute();
const router = useRouter();
const store = useMainStore();

const activeTab = ref((route.query.tab as string) || 'stats');
const bookId = computed(() => route.params.id as string);
const generating = ref(false);
const worldviewMode = ref<'edit' | 'read'>('read');
const descriptionMode = ref<'edit' | 'read'>('read');
const activeWorldviewSubTab = ref<'background' | 'setting'>('background');
const supplementaryMode = ref<'edit' | 'read'>('read');
const outlineMode = ref<'edit' | 'read'>('read');
const writingStyle = ref('默认风格');
const writingStyleOptions = ['默认风格', '金庸风 (武侠)', '古龙风 (写意)', '辰东风 (玄幻)', '烽火戏诸侯风 (细腻)', '诡秘之主风 (克苏鲁)', '轻松搞笑风', '沉重黑暗风'];

// Data from store
const book = computed(() => store.currentBook);
const characters = computed(() => store.characters);
const chapters = computed(() => store.chapters);
const realms = computed(() => (store.realms || []).slice().sort((a, b) => (a?.level || 0) - (b?.level || 0)));
const clues = computed(() => store.clues || []);
const activeClues = computed(() => clues.value.filter(c => c.status === 'active'));
const references = computed(() => store.references || []);

// Hooks integration
const { messages, showMessage } = useMessages();
const { showConfirmModal, confirmMessage, confirmAction, handleConfirm, handleCancelConfirm } = useConfirm();
const { editingTitle, newTitle, startEditTitle, saveTitle, cancelEditTitle, newWorldviewIdea, generateWorldview, saveWorldview, saveDescription, saveSupplementarySetting } = useBookBasic(bookId, generating, showMessage);

const { cascadeGenerating, cascadeTitle, cascadeProgress, runCascadeGeneration, autoGenerateCascade, saveOutline } = useCascadeGeneration(bookId, generating, showMessage, confirmAction, writingStyle, outlineMode);

const { parsedOutlineTree, newOutlineIdea, outlineChatHistory, outlineChatContainer, outlineTreeContainer, userHasScrolledUp, showTreeConfigModal, treeTargetChapterCount, treeNodeChapterCount, treeRequirement, showEditNodeModal, editingNode, showAddNodeModal, addNodeRequirement, isAddingNode, openAddNodeModal, confirmAddOutlineNode, generateOutline, openTreeConfigModal, handleOutlineTreeScroll, scrollToOutlineTreeBottom, generateOutlineTree, deleteOutlineNode, openEditNodeModal, saveEditedNode } = useOutline(bookId, generating, showMessage, confirmAction, runCascadeGeneration, writingStyle);

const {
  activeChapterId, currentChapter, currentChapterContent, currentChapterSummary, currentChapterFeedback,
  getChapterReviewScore, getReviewScoreColor, reviewScore, reviewScoreColor,
  mainEditorRef, summaryEditorRef, feedbackEditorRef,
  userHasScrolledMainEditor, userHasScrolledSummary, userHasScrolledFeedback,
  handleMainEditorScroll, handleSummaryScroll, handleFeedbackScroll,
  isCreatingChapter, selectChapter, createNewChapter, deleteChapter, saveChapter, manualSaveChapter, changeChapterStatus,
  extractReferences, showGenerateModal, nextContentRequirement, startGenerateNextContent, confirmGenerateNextContent, generateNextContent, agentReviewChapter,
  showReviseInline, reviseResult, reviseGenerating, reviseEditorRef, userHasScrolledReviseEditor,
  handleReviseEditorScroll, cancelReviseInline, reviseChapter, applyReviseResult,
  summaryGenerating, summarizeChapter, showAutoWriteModal, autoWriteCount, autoWriteRequirement, openAutoWriteModal, isAutoWriting, autoWriteTotal, autoWriteCurrent, autoWriteProgress, stopAutoWrite, startAutoWrite,
  isBatchDeleteMode, selectedChapters, toggleBatchDeleteMode, toggleChapterSelection, deleteSelectedChapters
} = useChapter(bookId.value, showMessage, confirmAction, generating, cascadeGenerating, cascadeTitle, cascadeProgress, parsedOutlineTree, characters, realms, references, activeClues, writingStyle);

const { showPlotModal, plotOptions, plotGenerating, plotWeaverTarget, plotRequirement, generatePlotOptions, applyPlotOption } = usePlotWeaver(bookId, parsedOutlineTree, activeChapterId, currentChapterContent, currentChapterSummary, saveChapter);

const { showPolishModal, polishAction, selectedText, polishResult, polishGenerating, openPolishModal, applyPolishResult, runPolish } = usePolish(currentChapterContent, saveChapter, writingStyle, mainEditorRef);

onMounted(async () => {
  await store.fetchBook(bookId.value);
  await store.fetchCharacters(bookId.value);
  await store.fetchChapters(bookId.value);
  await store.fetchRealms(bookId.value);
  await store.fetchReferences(bookId.value);
  await store.fetchClues(bookId.value);
  if (chapters.value.length > 0) {
    const latestChapter = chapters.value[chapters.value.length - 1];
    if (latestChapter.content === undefined) {
      await store.fetchChapterDetail(latestChapter.id);
    }
    const fullChapter = chapters.value.find(c => c.id === latestChapter.id) || latestChapter;
    activeChapterId.value = fullChapter.id;
    currentChapterContent.value = fullChapter.content || '';
    currentChapterSummary.value = fullChapter.summary || '';
    currentChapterFeedback.value = fullChapter.reviewFeedback || '';
  }
});

watch(activeTab, async (newTab) => {
  router.replace({ query: { ...route.query, tab: newTab } });
  
  if (newTab === 'editor' && chapters.value.length > 0 && !generating.value) {
    const latestChapter = chapters.value[chapters.value.length - 1];
    if (activeChapterId.value !== latestChapter.id) {
      await selectChapter(latestChapter.id);
    }
  }
});

const getTimelineFillHeight = () => {
  if (!parsedOutlineTree.value.length || !chapters.value.length) return '0%';
  const latestChapterNum = chapters.value.length;
  
  let currentIndex = -1;
  for (let i = 0; i < parsedOutlineTree.value.length; i++) {
    if (latestChapterNum >= parsedOutlineTree.value[i].startChapter && latestChapterNum <= parsedOutlineTree.value[i].endChapter) {
      currentIndex = i;
      break;
    } else if (latestChapterNum > parsedOutlineTree.value[i].endChapter) {
      currentIndex = i + 1;
    }
  }

  if (currentIndex === -1) return '0%';
  if (currentIndex >= parsedOutlineTree.value.length) return '100%';
  
  const percentage = (currentIndex / (parsedOutlineTree.value.length - 1)) * 100;
  return `calc(${Math.min(100, Math.max(0, percentage))}% + 14px)`;
};

const tabs = [
  { id: 'stats', name: '统计看板', icon: BarChart2 },
  { id: 'outline', name: '大纲内容', icon: BookOpen },
  { id: 'worldview', name: '世界观', icon: Globe },
  { id: 'outline-tree', name: '剧情节点', icon: GitMerge },
  { id: 'realms', name: '境界体系', icon: Layers },
  { id: 'characters', name: '人物卡片', icon: Users },
  { id: 'references', name: '资料室', icon: Library },
  { id: 'clues', name: '伏笔暗线', icon: Link },
  { id: 'supplementary', name: '补充设定', icon: Sparkles },
  { id: 'editor', name: '写作编辑', icon: Edit3 },
];

</script>

<template>
  <div class="dashboard-layout">
    <!-- Header -->
    <header class="app-header">
      <div class="header-left">
        <button @click="router.push('/')" class="btn-icon">
          <ArrowLeft class="icon" />
        </button>
        <div v-if="!editingTitle" style="display: flex; align-items: center; gap: 8px;">
          <h1 class="book-title" style="margin: 0;">{{ book?.title || '加载中...' }}</h1>
          <button v-if="book" @click="startEditTitle" class="btn-icon" style="padding: 4px;" title="编辑书名">
            <Edit3 class="icon-sm" />
          </button>
        </div>
        <div v-else style="display: flex; align-items: center; gap: 8px;">
          <input 
            v-model="newTitle" 
            @keyup.enter="saveTitle"
            @keyup.esc="cancelEditTitle"
            autoFocus
            class="form-control" 
            style="font-size: 1.25rem; font-weight: bold; padding: 4px 8px; width: 200px;" 
          />
          <button @click="saveTitle" class="btn-primary" style="padding: 4px 8px; font-size: 0.8rem;">保存</button>
          <button @click="cancelEditTitle" class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;">取消</button>
        </div>
        <span v-if="book && !editingTitle" class="badge badge-info">{{ book.type }}</span>
      </div>
      
      <nav class="nav-tabs">
        <button v-for="tab in tabs" :key="tab.id" @click="(!generating || tab.id === activeTab) && (activeTab = tab.id)"
          :class="['nav-tab', activeTab === tab.id ? 'active' : '', generating && tab.id !== activeTab ? 'disabled' : '']"
          :title="generating && tab.id !== activeTab ? 'AI 正在生成内容中，请稍候...' : ''">
          <component :is="tab.icon" class="icon-sm" />
          {{ tab.name }}
        </button>
      </nav>
    </header>

    <!-- Global Messages -->
    <div class="message-container">
      <div v-for="msg in messages" :key="msg.id" :class="['message-item', msg.type]">
        <div v-if="msg.type === 'info'" class="loader" style="width: 14px; height: 14px; border: 2px solid rgba(37, 99, 235, 0.2); border-top-color: var(--color-cta); border-radius: 50%; animation: spin 1s linear infinite;"></div>
        {{ msg.text }}
      </div>
    </div>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Outline Tab -->
      <div v-if="activeTab === 'outline'" class="tab-pane">
        <div style="display: flex; gap: var(--spacing-lg); height: 100%;">
          <!-- Left: AI Chat -->
          <div class="ai-widget card" style="width: 350px; display: flex; flex-direction: column;">
            <div class="widget-header" style="border-bottom: 1px solid var(--color-border); padding-bottom: var(--spacing-sm);">
              <h2 class="widget-title"><Wand2 class="icon-sm color-cta" /> AI大纲助理</h2>
            </div>
            
            <div class="chat-history" ref="outlineChatContainer" style="flex: 1; overflow-y: auto; padding: var(--spacing-md) 0; display: flex; flex-direction: column; gap: var(--spacing-md);">
              <div v-if="outlineChatHistory.length === 0" style="color: var(--color-text-muted); font-size: 0.875rem; text-align: center; margin-top: 20px;">
                您可以告诉我您的小说核心创意，或者对右侧已有的大纲提出修改意见。
              </div>
              <div v-for="(msg, index) in outlineChatHistory" :key="index" :class="['chat-message', msg.role]" :style="{ display: 'flex', flexDirection: 'column', width: '100%' }">
                <div class="message-bubble" :style="{ 
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '90%',
                  fontSize: '0.875rem',
                  lineHeight: '1.5',
                  wordBreak: 'break-word',
                  textAlign: 'left'
                }">
                  {{ msg.content }}
                </div>
              </div>
            </div>

            <div class="widget-body" style="display: flex; flex-direction: column; padding-top: var(--spacing-sm); border-top: 1px solid var(--color-border);">
              <textarea v-model="newOutlineIdea" class="form-control" style="min-height: 80px; margin-bottom: var(--spacing-md); resize: vertical;" placeholder="例如：给大纲加一个青梅竹马的反派..." :disabled="generating"></textarea>
              <div style="display: flex; justify-content: flex-end;">
                <button v-if="!generating" @click="generateOutline" class="btn-primary" style="width: auto; padding: 8px 24px;" :disabled="!newOutlineIdea.trim()">
                  <Send class="icon-sm" /> 发送
                </button>
                <button v-else @click="store.abortCurrentGeneration()" class="btn-danger" style="width: auto; padding: 8px 24px;">
                  <StopCircle class="icon-sm" /> 停止
                </button>
              </div>
            </div>
          </div>
          
          <!-- Right: Outline Content -->
          <div class="editor-widget card" style="flex: 1; display: flex; flex-direction: column; min-width: 0;">
            <div class="widget-header">
              <div style="display: flex; align-items: center; gap: var(--spacing-md);">
                <h2 class="widget-title">大纲内容</h2>
                <button @click="autoGenerateCascade" :disabled="generating || !book?.outline" class="btn-secondary btn-sm" title="一键生成世界观、境界(若为修炼类型)和人物">
                  <Wand2 class="icon-sm color-info" /> 一键生成衍生设定
                </button>
              </div>
              <div style="display: flex; align-items: center; gap: var(--spacing-sm);">
                <button @click="outlineMode = outlineMode === 'read' ? 'edit' : 'read'" class="btn-secondary btn-sm">
                  {{ outlineMode === 'read' ? '📝 切换到编辑模式' : '📖 切换到阅读模式(Markdown)' }}
                </button>
                <span class="status-text" v-if="outlineMode === 'edit'">自动保存</span>
              </div>
            </div>
            
            <div v-if="cascadeGenerating" class="card" style="padding: var(--spacing-md); background: rgba(37, 99, 235, 0.05); border: 1px solid var(--color-cta); margin-bottom: var(--spacing-sm); flex-shrink: 0;">
              <div style="display: flex; align-items: center; gap: var(--spacing-sm); color: var(--color-cta); font-weight: bold; margin-bottom: var(--spacing-sm);">
                <div class="loader" style="width: 16px; height: 16px; border: 2px solid rgba(37, 99, 235, 0.2); border-top-color: var(--color-cta); border-radius: 50%; animation: spin 1s linear infinite;"></div>
                衍生设定生成中...
              </div>
              <p style="font-size: 0.875rem; color: var(--color-text-muted);">{{ cascadeProgress }}</p>
            </div>

            <div v-if="outlineMode === 'read'" class="markdown-body" style="flex: 1; overflow-y: auto;">
              <MdPreview :modelValue="book?.outline || '暂无大纲内容'" />
            </div>
            
            <div v-else style="flex: 1; min-height: 0;">
              <MdEditor 
                v-if="book"
                :modelValue="book.outline || ''" 
                @update:modelValue="(val: string) => { if(book) book.outline = val; }"
                @onSave="saveOutline" 
                style="height: 100%;"
                placeholder="在此处编写或生成大纲..." 
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Worldview Tab -->
      <div v-if="activeTab === 'worldview'" class="tab-pane" style="display: flex; flex-direction: column; height: 100%;">
        <div class="pane-header" style="margin-bottom: var(--spacing-md);">
          <h2 class="pane-title">世界观设定</h2>
        </div>

        <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
          <div class="editor-widget card" style="flex: 1; display: flex; flex-direction: column;">
            <div class="widget-header">
              <div style="display: flex; align-items: center; gap: var(--spacing-md);">
                <h2 class="widget-title">世界观设定</h2>
                <button @click="generateWorldview" :disabled="generating" class="btn-secondary btn-sm" title="根据当前大纲提取生成世界观设定">
                  <Wand2 class="icon-sm color-info" /> 提取世界观
                </button>
                <span v-if="generating && !cascadeGenerating && activeTab === 'worldview'" style="font-size: 0.875rem; color: var(--color-cta);">正在提取中...</span>
              </div>
              <div style="display: flex; align-items: center; gap: var(--spacing-sm);">
                <button @click="worldviewMode = worldviewMode === 'read' ? 'edit' : 'read'" class="btn-secondary btn-sm">
                  {{ worldviewMode === 'read' ? '📝 切换到编辑模式' : '📖 切换到阅读模式' }}
                </button>
                <span class="status-text" v-if="worldviewMode === 'edit'">自动保存</span>
              </div>
            </div>
            
            <div v-if="worldviewMode === 'read'" class="markdown-body" style="flex: 1; overflow-y: auto;">
              <MdPreview :modelValue="book?.worldview || '暂无世界观内容'" />
            </div>
            
            <div v-else style="flex: 1; min-height: 0;">
              <MdEditor 
                v-if="book"
                :modelValue="book.worldview || ''" 
                @update:modelValue="(val: string) => { if(book) book.worldview = val; }"
                @onSave="saveWorldview" 
                style="height: 100%;"
                placeholder="在此处编写世界观设定..." 
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Outline Tree Tab -->
      <div v-if="activeTab === 'outline-tree'" class="tab-pane scrollable" ref="outlineTreeContainer" @scroll="handleOutlineTreeScroll">
        <div class="pane-header">
          <h2 class="pane-title">剧情节点</h2>
          <div style="display: flex; gap: var(--spacing-sm);">
            <button @click="openAddNodeModal" class="btn-secondary btn-sm" title="让AI为您在结尾扩充一个新的节点">
              <Plus class="icon-sm" /> AI扩充新节点
            </button>
            <button @click="openTreeConfigModal" :disabled="generating" class="btn-secondary btn-sm" title="将大纲文字拆解为树状节点">
              <Layers class="icon-sm" /> 重新提取剧情节点
            </button>
          </div>
        </div>
        
        <div style="max-width: 800px; margin: 0 auto; padding: var(--spacing-lg) 0;">
          <div v-if="generating" class="card" style="padding: var(--spacing-md); margin-bottom: var(--spacing-md); background: rgba(37, 99, 235, 0.06); border: 1px solid var(--color-cta);">
            <div style="display: flex; align-items: center; gap: var(--spacing-sm); color: var(--color-cta); font-weight: bold;">
              <div class="loader" style="width: 16px; height: 16px; border: 2px solid rgba(37, 99, 235, 0.2); border-top-color: var(--color-cta); border-radius: 50%; animation: spin 1s linear infinite;"></div>
              正在生成剧情节点，请稍候...
            </div>
          </div>
          <div v-if="parsedOutlineTree.length === 0" class="empty-state">
            <p>暂无剧情节点，点击上方按钮根据大纲自动拆解生成。</p>
          </div>
          <div v-else class="timeline" ref="timelineContainer">
            <div class="timeline-line"></div>
            <div class="timeline-line-fill" :style="{ height: getTimelineFillHeight() }"></div>
            <div v-for="(node, index) in parsedOutlineTree" :key="node.id" 
                 class="timeline-item" 
                 :class="{ 
                   'is-completed': chapters.length > node.endChapter,
                   'is-current': chapters.length >= node.startChapter && chapters.length <= node.endChapter,
                   'is-future': chapters.length < node.startChapter 
                 }">
              <div class="timeline-marker" title="章节区间">
                {{ node.startChapter }}~{{ node.endChapter }}
              </div>
              <div class="timeline-content card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--spacing-xs);">
                  <h3 class="item-title" style="margin-bottom: 0;">{{ node.title }}</h3>
                  <div style="display: flex; gap: 4px;">
                    <button @click="openEditNodeModal(node)" class="btn-icon" style="padding: 2px; color: var(--color-text-muted);" title="编辑此节点">
                      <Edit3 class="icon-sm" />
                    </button>
                    <button @click="() => { plotWeaverTarget = node.id; plotOptions = []; plotRequirement = ''; showPlotModal = true; }" class="btn-secondary btn-sm" style="padding: 2px 8px; font-size: 0.75rem;">
                      <Compass class="icon-sm color-cta" /> 编织节点
                    </button>
                    <button @click="deleteOutlineNode(node.id)" class="btn-icon" style="padding: 2px; color: var(--color-danger);" title="删除此节点">
                      <Trash2 class="icon-sm" />
                    </button>
                  </div>
                </div>
                <p class="item-desc">{{ node.description }}</p>
                <div v-if="node.wovenPlot" style="margin-top: var(--spacing-sm); padding: var(--spacing-sm); background: rgba(37, 99, 235, 0.05); border-radius: 4px; font-size: 0.875rem;">
                  <strong style="color: var(--color-cta);">[原始未编织前描述]</strong>
                  <p style="margin-top: 4px; color: var(--color-text-muted); white-space: pre-wrap;">{{ node.wovenPlot }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Realms Tab -->
      <RealmsTab v-if="activeTab === 'realms'" :book-id="bookId" @confirm="confirmAction" />

      <!-- Characters Tab -->
      <CharactersTab v-if="activeTab === 'characters'" :book-id="bookId" @confirm="confirmAction" />

      <!-- References Tab -->
      <ReferencesTab v-if="activeTab === 'references'" :book-id="bookId" @confirm="confirmAction" />

      <!-- Clues Tab -->
      <CluesTab v-if="activeTab === 'clues'" :book-id="bookId" @confirm="confirmAction" />

      <!-- Supplementary Settings Tab -->
      <div v-if="activeTab === 'supplementary'" class="tab-pane">
        <div class="editor-widget card" style="height: 100%; display: flex; flex-direction: column;">
          <div class="widget-header">
            <h2 class="widget-title">补充设定</h2>
            <div style="display: flex; align-items: center; gap: var(--spacing-sm);">
              <button v-if="supplementaryMode === 'edit'" @click="saveSupplementarySetting" class="btn-secondary btn-sm" title="保存补充设定" style="color: var(--color-cta);">
                <Save class="icon-sm" style="margin-right: 4px;" /> 手动保存
              </button>
              <button @click="supplementaryMode = supplementaryMode === 'read' ? 'edit' : 'read'" class="btn-secondary btn-sm">
                {{ supplementaryMode === 'read' ? '📝 切换到编辑模式' : '📖 切换到阅读模式' }}
              </button>
              <span class="status-text" v-if="supplementaryMode === 'edit'">自动保存</span>
            </div>
          </div>
          
          <div v-if="supplementaryMode === 'read'" class="markdown-body" style="flex: 1; overflow-y: auto;">
            <MdPreview :modelValue="book?.supplementarySetting || '暂无补充设定'" />
          </div>
          
          <div v-else style="flex: 1; min-height: 0;">
            <MdEditor 
              v-if="book"
              :modelValue="book.supplementarySetting || ''" 
              @update:modelValue="(val: string) => { if(book) book.supplementarySetting = val; }"
              @onSave="saveSupplementarySetting" 
              style="height: 100%;"
              placeholder="在此处编写补充设定（如特殊种族规则、特殊物品、宗门规矩等），生成章节时AI会自动参考..." 
            />
          </div>
        </div>
      </div>

      <!-- Editor Tab -->
      <div v-if="activeTab === 'editor'" class="editor-layout">
        <!-- Sidebar: Chapters -->
        <aside class="sidebar">
          <div class="sidebar-header">
            <h3 class="sidebar-title">章节目录</h3>
            <div style="display: flex; gap: 4px;">
              <button v-if="isBatchDeleteMode" @click="deleteSelectedChapters" :disabled="selectedChapters.length === 0" class="btn-icon" style="color: var(--color-danger);" title="删除选中章节">
                <Trash2 class="icon-sm"/>
              </button>
              <button @click="toggleBatchDeleteMode" :class="['btn-icon', { 'active': isBatchDeleteMode }]" :style="{ color: isBatchDeleteMode ? 'var(--color-cta)' : 'var(--color-text-muted)' }" title="批量删除">
                <Edit3 class="icon-sm"/>
              </button>
              <button @click="createNewChapter" :disabled="isCreatingChapter" class="btn-icon" title="新增章节（需前一章定稿）"><Plus class="icon-sm"/></button>
            </div>
          </div>
            <div class="sidebar-list">
              <div v-for="ch in chapters" :key="ch.id" @click="isBatchDeleteMode ? toggleChapterSelection(ch.id) : selectChapter(ch.id)"
                   :class="['list-item', activeChapterId === ch.id && !isBatchDeleteMode ? 'active' : '', isBatchDeleteMode && selectedChapters.includes(ch.id) ? 'selected-for-delete' : '']">
                <div class="chapter-item-header">
                  <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
                    <input v-if="isBatchDeleteMode" type="checkbox" :checked="selectedChapters.includes(ch.id)" @change.stop="toggleChapterSelection(ch.id)" style="margin: 0; cursor: pointer;" />
                    <span class="chapter-title" :style="{ color: isBatchDeleteMode && selectedChapters.includes(ch.id) ? 'var(--color-danger)' : '' }">{{ ch.title }}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span v-if="ch.status === 'completed' && getChapterReviewScore(ch.reviewFeedback) && !isBatchDeleteMode" 
                          :style="{ fontSize: '11px', fontWeight: 'bold', color: getReviewScoreColor(getChapterReviewScore(ch.reviewFeedback)), width: '25px', display: 'inline-block', textAlign: 'left' }"
                          :title="'最终评级: ' + getChapterReviewScore(ch.reviewFeedback)">
                      {{ getChapterReviewScore(ch.reviewFeedback) }}
                    </span>
                    <span v-if="!isBatchDeleteMode" :class="['status-dot', ch.status]"></span>
                    <button v-if="!isBatchDeleteMode" @click.stop="deleteChapter(ch.id, $event)" class="btn-icon" style="padding: 2px; color: var(--color-text-muted);" title="删除章节">
                      <Trash2 class="icon-sm" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
        </aside>
        
        <!-- Editor Area -->
        <section class="workspace">
          <div v-if="activeChapterId" class="workspace-inner">
            <!-- Toolbar -->
            <div class="toolbar">
                <div class="toolbar-group">
                  <el-button v-if="!generating && !isAutoWriting" @click="openAutoWriteModal" size="small" type="success" title="全自动连载：生成->审核->重写->定稿">
                    <PlayCircle class="icon-sm" style="margin-right: 4px;" /> 自动连载
                  </el-button>
                  <el-select v-model="writingStyle" size="small" style="width: 130px;" title="风格模仿大师">
                    <el-option v-for="style in writingStyleOptions" :key="style" :label="style" :value="style" />
                  </el-select>
                  <el-button v-if="!generating && !isAutoWriting" @click="startGenerateNextContent" :disabled="currentChapter?.status === 'completed'" size="small">
                    <Wand2 class="icon-sm color-info" style="margin-right: 4px;" /> AI生成/续写
                  </el-button>
                  <el-button v-else @click="store.abortCurrentGeneration()" type="danger" size="small">
                    <StopCircle class="icon-sm" style="margin-right: 4px;" /> 停止生成
                  </el-button>

                  <el-button @click="summarizeChapter" :disabled="generating" size="small">
                    <BarChart2 class="icon-sm color-warning" style="margin-right: 4px;" /> AI梳理总结
                  </el-button>
                  <el-button @click="openPolishModal" :disabled="generating || currentChapter?.status === 'completed'" size="small" title="扩写/润色/续写选中的内容">
                    <Sparkles class="icon-sm color-info" style="margin-right: 4px;" /> 一键润色
                  </el-button>
                  <el-button @click="() => { plotOptions = []; plotRequirement = ''; showPlotModal = true; }" :disabled="generating || currentChapter?.status === 'completed'" size="small" title="生成曲折故事主线">
                    <Compass class="icon-sm color-cta" style="margin-right: 4px;" /> 情节编织器
                  </el-button>
                  <el-button @click="() => agentReviewChapter(false)" :disabled="generating || currentChapter?.status === 'completed'" type="primary" size="small">
                    <Edit3 class="icon-sm" style="margin-right: 4px;" /> Agent主编审核
                  </el-button>
                  <el-button @click="reviseChapter" :disabled="generating || !currentChapterFeedback || currentChapter?.status !== 'reviewing'" size="small" title="根据主编审核意见一键修改当前章节">
                    <Wand2 class="icon-sm color-cta" style="margin-right: 4px;" /> 根据审核一键修改
                  </el-button>
                  <el-button @click="extractReferences" :disabled="generating || currentChapter?.status === 'completed'" size="small" title="从正文提取古籍资料">
                    <Library class="icon-sm color-success" style="margin-right: 4px;" /> AI提取资料
                  </el-button>
                </div>
                <div class="toolbar-group status-group">
                  <span class="status-text">{{ currentChapterContent.length }} 字</span>
                  <el-select v-model="currentChapter.status" @change="(val) => changeChapterStatus(val as any)" size="small" style="width: 110px;">
                    <el-option label="📝 草稿中" value="draft" />
                    <el-option label="🔍 审核修改" value="reviewing" />
                    <el-option label="✅ 已定稿" value="completed" />
                  </el-select>
                  <el-button @click="manualSaveChapter" text size="small">
                    <Save class="icon-sm" style="margin-right: 4px;" /> 保存
                  </el-button>
                </div>
            </div>
            
            <div class="editor-split">
              <!-- Text Area -->
              <div class="editor-wrapper" :class="{ 'scanning': currentChapter?.status === 'reviewing' && generating }">
                <div v-if="showReviseInline" style="flex: 1; display: flex; flex-direction: column; border-right: 1px solid var(--color-border); height: 100%;">
                  <div style="padding: 8px 16px; background: rgba(0,0,0,0.02); font-size: 0.875rem; color: var(--color-text-muted); border-bottom: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center;">
                    <span>原章节正文</span>
                  </div>
                  <textarea ref="mainEditorRef" v-model="currentChapterContent" @input="saveChapter" @scroll="handleMainEditorScroll" class="main-editor" placeholder="开始写作..." readonly></textarea>
                </div>
                
                <textarea v-else ref="mainEditorRef" v-model="currentChapterContent" @input="saveChapter" @scroll="handleMainEditorScroll" class="main-editor" placeholder="开始写作..."></textarea>
                
                <div v-if="showReviseInline" style="flex: 1; display: flex; flex-direction: column; position: relative; height: 100%;">
                  <div style="padding: 8px 16px; background: rgba(37, 99, 235, 0.05); font-size: 0.875rem; color: var(--color-cta); font-weight: bold; border-bottom: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center;">
                    <span>修改后正文</span>
                    <div style="display: flex; gap: 8px;">
                      <el-button size="small" @click="cancelReviseInline">取消修改</el-button>
                      <el-button v-if="reviseGenerating" size="small" type="danger" @click="store.abortCurrentGeneration()">停止</el-button>
                      <el-button v-else size="small" type="primary" @click="applyReviseResult">替换原文</el-button>
                    </div>
                  </div>
                  <textarea ref="reviseEditorRef" v-model="reviseResult" @scroll="handleReviseEditorScroll" class="main-editor" style="border-left: none; background: rgba(37, 99, 235, 0.01);" placeholder="AI重写的内容将显示在这里..."></textarea>
                  <div v-if="reviseGenerating && !reviseResult" style="position: absolute; top: 40px; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.8); display: flex; align-items: center; justify-content: center; flex-direction: column; color: var(--color-cta);">
                    <div class="loader" style="width: 32px; height: 32px; border: 3px solid rgba(37, 99, 235, 0.2); border-top-color: var(--color-cta); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 8px;"></div>
                    AI 正在全力重写中...
                  </div>
                </div>

                <div v-if="currentChapter?.status === 'reviewing' && generating && !showReviseInline" class="scan-line"></div>
              </div>
              
              <aside class="summary-panel">
                <div class="panel-header">AI 智能辅助面板</div>
                
                <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                  <!-- Agent Review Result -->
                  <div v-if="currentChapter?.status === 'reviewing' || currentChapterFeedback" class="feedback-section" style="flex: 1; display: flex; flex-direction: column; padding: var(--spacing-md); border-bottom: 1px solid var(--color-border);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-xs);">
                      <h4 style="font-size: 0.75rem; color: var(--color-cta); text-transform: uppercase; font-weight: bold; margin: 0;">主编审核意见</h4>
                      <div v-if="reviewScore !== null" :style="{ color: reviewScoreColor, fontSize: '0.875rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }">
                        <Star class="icon-sm" /> 综合评级: {{ reviewScore }}
                      </div>
                    </div>
                    <textarea ref="feedbackEditorRef" v-model="currentChapterFeedback" @input="saveChapter" @scroll="handleFeedbackScroll" class="summary-editor" style="flex: 1; width: 100%; min-height: 200px; background: rgba(37, 99, 235, 0.05); border-radius: 4px; padding: 8px;" placeholder="AI主编审核意见将显示在这里..."></textarea>
                  </div>
                  
                  <!-- Realtime Summary -->
                  <div class="summary-section" style="flex: 1; overflow-y: auto; padding: var(--spacing-md); display: flex; flex-direction: column; position: relative;">
                    <h4 style="font-size: 0.75rem; color: var(--color-text-muted); margin-bottom: var(--spacing-xs); text-transform: uppercase; font-weight: bold;">本章剧情梳理</h4>
                    <textarea ref="summaryEditorRef" v-model="currentChapterSummary" @input="saveChapter" @scroll="handleSummaryScroll" class="summary-editor" style="flex: 1; width: 100%;" placeholder="点击上方【AI梳理总结】提取本章剧情点和人物动向，方便生成下一章时作为上下文参考..."></textarea>
                    
                    <div v-if="summaryGenerating" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.7); display: flex; align-items: center; justify-content: center; flex-direction: column; color: var(--color-cta); z-index: 10;">
                      <div class="loader" style="width: 24px; height: 24px; border: 3px solid rgba(37, 99, 235, 0.2); border-top-color: var(--color-cta); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 8px;"></div>
                      <span style="font-size: 0.75rem; font-weight: bold;">正在梳理剧情...</span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
          <div v-else class="empty-state">
            <p>请选择或创建章节开始写作。</p>
          </div>
        </section>
      </div>

      <!-- Stats Tab -->
      <StatsTab v-if="activeTab === 'stats'" :book-id="bookId" />
    </main>

    <!-- Add Node Modal -->
    <div v-if="showAddNodeModal" class="modal-overlay">
      <div class="modal-content" style="max-width: 500px;">
        <h2 class="modal-title">AI扩充新节点</h2>
        <p style="color: var(--color-text-muted); font-size: 0.875rem; margin-bottom: var(--spacing-md);">
          让AI根据已有的大纲和上下文，在结尾继续为您推演并扩充一个新的剧情节点。
        </p>
        <div class="form-group" style="margin-bottom: var(--spacing-md);">
          <label>具体要求 (选填)</label>
          <textarea v-model="addNodeRequirement" class="form-control" style="width: 100%; min-height: 80px; resize: vertical;" placeholder="例如：新节点主角要遭遇一次惨败，或者开启一个新的副本地图..."></textarea>
        </div>
        <div class="modal-actions" style="margin-top: var(--spacing-lg);">
          <el-button @click="showAddNodeModal = false">取消</el-button>
          <el-button type="primary" @click="confirmAddOutlineNode" :disabled="isAddingNode">
            <Plus class="icon-sm" style="margin-right: 4px;" /> {{ isAddingNode ? '正在扩充...' : '开始扩充' }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- Tree Config Modal -->
    <div v-if="showTreeConfigModal" class="modal-overlay">
      <div class="modal-content" style="max-width: 400px;">
        <h2 class="modal-title">提取剧情节点</h2>
        <p style="color: var(--color-text-muted); font-size: 0.875rem; margin-bottom: var(--spacing-md);">
          请根据大纲的丰富程度，合理预估小说的总篇幅并配置节点的章节粒度。
        </p>
        <div class="form-group" style="margin-bottom: var(--spacing-md);">
          <label>预计总章节数</label>
          <el-input-number v-model="treeTargetChapterCount" :min="10" :step="10" style="width: 100%;" />
        </div>
        <div class="form-group" style="margin-bottom: var(--spacing-md);">
          <label>多少章为一个节点</label>
          <el-input-number v-model="treeNodeChapterCount" :min="1" :step="1" style="width: 100%;" />
        </div>
        <div class="form-group">
          <label>特殊要求 (选填)</label>
          <textarea v-model="treeRequirement" class="form-control" style="width: 100%; min-height: 80px; resize: vertical;" placeholder="例如：前20章节奏放慢一点，多描写日常..."></textarea>
        </div>
        <div class="modal-actions" style="margin-top: var(--spacing-lg);">
          <el-button @click="showTreeConfigModal = false">取消</el-button>
          <el-button type="primary" @click="generateOutlineTree">开始拆解</el-button>
        </div>
      </div>
    </div>

    <!-- Edit Node Modal -->
    <div v-if="showEditNodeModal && editingNode" class="modal-overlay">
      <div class="modal-content">
        <h2 class="modal-title">编辑剧情节点</h2>
        <div class="form-layout">
          <div style="display: flex; gap: var(--spacing-md);">
            <div class="form-group" style="flex: 1;">
              <label>起始章</label>
              <input v-model="editingNode.startChapter" type="number" class="form-control" />
            </div>
            <div class="form-group" style="flex: 1;">
              <label>结束章</label>
              <input v-model="editingNode.endChapter" type="number" class="form-control" />
            </div>
          </div>
          <div class="form-group">
            <label>阶段标题</label>
            <input v-model="editingNode.title" type="text" class="form-control" />
          </div>
          <div class="form-group">
            <label>剧情描述</label>
            <textarea v-model="editingNode.description" class="form-control h-24"></textarea>
          </div>
          <div class="form-group">
            <label>编织的主线情节 (可选)</label>
            <textarea v-model="editingNode.wovenPlot" class="form-control h-24" placeholder="在此手动修改或添加当前阶段需要着重推进的情节..."></textarea>
          </div>
        </div>
        <div class="modal-actions">
          <el-button @click="showEditNodeModal = false">取消</el-button>
          <el-button type="primary" @click="saveEditedNode">保存修改</el-button>
        </div>
      </div>
    </div>

    <!-- Plot Weaver Modal -->
    <div v-if="showPlotModal" class="modal-overlay">
      <div class="modal-content" style="max-width: 600px;">
        <h2 class="modal-title">{{ plotWeaverTarget === 'editor' ? 'AI情节编织器' : 'AI编织节点' }}</h2>
        <p style="color: var(--color-text-muted); font-size: 0.875rem; margin-bottom: var(--spacing-md);">
          {{ plotWeaverTarget === 'editor' ? '让AI根据已有剧情，为您提供接下来不同走向的情节选项，打破写作瓶颈。' : '请在下方填写属于当前节点的具体描述或要求，点击确定后AI将为您扩写并替换当前的剧情节点。' }}
        </p>

        <div style="margin-bottom: var(--spacing-md);">
          <label style="display: block; font-size: 0.875rem; font-weight: bold; margin-bottom: var(--spacing-xs);">内容概述/特殊要求</label>
          <textarea v-model="plotRequirement" class="form-control" style="width: 100%; min-height: 80px; resize: vertical;" :placeholder="plotWeaverTarget === 'editor' ? '例如：希望接下来主角遇到一个神秘的老爷爷，或者被仇家追杀...' : '例如：希望在这个节点中，主角成功炼制出了一把绝世神兵，并引来了天地异象...'"></textarea>
        </div>
        
        <div v-if="plotOptions.length > 0" style="display: flex; flex-direction: column; gap: var(--spacing-sm); margin-bottom: var(--spacing-md); max-height: 300px; overflow-y: auto;">
          <div v-for="(opt, idx) in plotOptions" :key="idx" class="card" style="padding: var(--spacing-md); cursor: pointer; border: 1px solid var(--color-border); transition: all 0.2s;" @click="applyPlotOption(opt)" onmouseover="this.style.borderColor='var(--color-cta)';" onmouseout="this.style.borderColor='var(--color-border)';">
            <p style="font-size: 0.875rem; line-height: 1.5; white-space: pre-wrap;">{{ opt }}</p>
            <div style="text-align: right; margin-top: var(--spacing-sm);">
              <span style="font-size: 0.75rem; color: var(--color-cta); font-weight: bold;">{{ plotWeaverTarget === 'editor' ? '点击采用此情节走向' : '点击采用并替换此节点的剧情描述' }}</span>
            </div>
          </div>
        </div>
        <div v-else-if="plotGenerating" style="padding: var(--spacing-xl) 0; text-align: center; color: var(--color-text-muted);">
          <div class="loader" style="margin: 0 auto var(--spacing-md); width: 24px; height: 24px; border: 3px solid var(--color-border); border-top-color: var(--color-cta); border-radius: 50%; animation: spin 1s linear infinite;"></div>
          正在为您编织{{ plotWeaverTarget === 'editor' ? '曲折剧情走向' : '节点剧情' }}...
        </div>

        <div class="modal-actions" style="margin-top: var(--spacing-lg);">
          <el-button @click="showPlotModal = false">取消</el-button>
          <el-button type="primary" @click="generatePlotOptions" :disabled="plotGenerating || (plotWeaverTarget !== 'editor' && !plotRequirement.trim())">
            <Compass class="icon-sm" style="margin-right: 4px;" /> 生成{{ plotWeaverTarget === 'editor' ? '剧情走向' : '节点描述' }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- Polish Modal -->
    <div v-if="showPolishModal" class="modal-overlay">
      <div class="modal-content" style="max-width: 800px; max-height: 90vh; display: flex; flex-direction: column;">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md);">
          <h2 class="modal-title" style="margin: 0;">一键润色处理</h2>
          <el-select v-model="polishAction" style="width: 130px;">
            <el-option label="✨ 润色优化" value="润色" />
            <el-option label="📝 丰富扩写" value="扩写" />
            <el-option label="➡️ 顺延续写" value="续写" />
          </el-select>
        </div>
        
        <div style="flex: 1; display: flex; gap: var(--spacing-md); min-height: 300px; overflow: hidden;">
          <div style="flex: 1; display: flex; flex-direction: column;">
            <label style="font-size: 0.875rem; color: var(--color-text-muted); margin-bottom: var(--spacing-xs);">原文本 (选中的部分)</label>
            <textarea v-model="selectedText" class="form-control" style="flex: 1; resize: none; background: rgba(0,0,0,0.02);" readonly></textarea>
          </div>
          <div style="flex: 1; display: flex; flex-direction: column;">
            <label style="font-size: 0.875rem; color: var(--color-cta); font-weight: bold; margin-bottom: var(--spacing-xs);">处理结果</label>
            <div style="flex: 1; position: relative;">
              <textarea v-model="polishResult" class="form-control" style="width: 100%; height: 100%; resize: none; border-color: var(--color-cta);"></textarea>
              <div v-if="polishGenerating" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.8); display: flex; align-items: center; justify-content: center; flex-direction: column; color: var(--color-cta);">
                <div class="loader" style="width: 32px; height: 32px; border: 3px solid rgba(37, 99, 235, 0.2); border-top-color: var(--color-cta); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 8px;"></div>
                正在处理中...
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions" style="margin-top: var(--spacing-lg);">
          <el-button @click="showPolishModal = false">取消</el-button>
          <el-button @click="runPolish" :disabled="polishGenerating" style="color: var(--color-cta); border-color: var(--color-cta);">
            <Sparkles class="icon-sm" style="margin-right: 4px;" /> 重新生成
          </el-button>
          <el-button type="primary" @click="applyPolishResult" :disabled="polishGenerating || !polishResult">
            <Save class="icon-sm" style="margin-right: 4px;" /> 应用到正文
          </el-button>
        </div>
      </div>
    </div>

    <!-- Auto Write Overlay -->
    <div v-if="isAutoWriting" class="auto-write-overlay" style="position: fixed; bottom: 20px; right: 20px; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 9999; width: 300px; border: 2px solid var(--color-cta);">
      <h3 style="margin-top: 0; color: var(--color-cta); display: flex; align-items: center; gap: 8px; font-size: 1rem; margin-bottom: 12px;">
        <PlayCircle class="icon-sm" /> 自动连载模式
      </h3>
      <div style="margin-bottom: 12px; font-weight: bold; font-size: 0.9rem;">
        总进度：正在处理第 {{ autoWriteCurrent }} 章 (共 {{ autoWriteTotal }} 章)
      </div>
      <div style="font-size: 0.875rem; color: var(--color-text-muted); margin-bottom: 16px; background: #f8f9fa; padding: 8px; border-radius: 4px;">
        当前状态：{{ autoWriteProgress }}
      </div>
      <el-button type="danger" @click="stopAutoWrite" style="width: 100%;">
        <StopCircle class="icon-sm" style="margin-right: 4px;" /> 停止自动连载
      </el-button>
    </div>

    <!-- Auto Write Setup Modal -->
    <div v-if="showAutoWriteModal" class="modal-overlay">
      <div class="modal-content" style="width: 500px;">
        <h2 class="modal-title">配置自动连载</h2>
        <div class="form-layout" style="margin-bottom: 20px;">
          <div class="form-group" style="margin-bottom: 10px;">
            <label style="display: block; margin-bottom: 8px; font-weight: bold;">连续生成章节数</label>
            <el-input-number v-model="autoWriteCount" :min="1" :max="50" style="width: 100%;" />
          </div>
          <div class="form-group" style="margin-bottom: 10px;">
            <label style="display: block; margin-bottom: 8px; font-weight: bold;">具体写作要求 (选填)</label>
            <textarea v-model="autoWriteRequirement" class="form-control" style="width: 100%; min-height: 80px; resize: vertical;" placeholder="例如：本阶段注意多描写主角的心理活动，或者加快打斗节奏..."></textarea>
          </div>
          <p style="font-size: 0.8rem; color: var(--color-text-muted); line-height: 1.5; background: #f0f7ff; padding: 10px; border-radius: 4px;">
            <strong style="color: var(--color-cta);">流程说明：</strong><br>
            开启后，AI 将自动进入循环：生成正文 ➔ 主编审核 ➔ 如果评分未达A-及以上则深度重写 ➔ 达标后自动定稿 ➔ 创建并生成下一章。
          </p>
        </div>
        <div class="modal-actions">
          <el-button @click="showAutoWriteModal = false">取消</el-button>
          <el-button type="primary" @click="startAutoWrite">
            <PlayCircle class="icon-sm" style="margin-right: 4px;" /> 开始自动连载
          </el-button>
        </div>
      </div>
    </div>

    <!-- Generate Content Setup Modal -->
    <div v-if="showGenerateModal" class="modal-overlay">
      <div class="modal-content" style="width: 500px;">
        <h2 class="modal-title">AI 生成章节内容</h2>
        <div class="form-layout" style="margin-bottom: 20px;">
          <div class="form-group" style="margin-bottom: 10px;">
            <label style="display: block; margin-bottom: 8px; font-weight: bold;">具体写作要求 (选填)</label>
            <textarea v-model="nextContentRequirement" class="form-control" style="width: 100%; min-height: 100px; resize: vertical;" placeholder="例如：本章重点描写男主和女配的感情戏，加入一段在雨中漫步的对话，注意渲染气氛..."></textarea>
          </div>
          <p style="font-size: 0.8rem; color: var(--color-text-muted); line-height: 1.5; background: #f0f7ff; padding: 10px; border-radius: 4px;">
            <strong style="color: var(--color-cta);">说明：</strong><br>
            您可以在这里对接下来的生成内容提出具体的指导意见。如果您没有特殊要求，直接点击下方按钮开始生成即可。
          </p>
        </div>
        <div class="modal-actions">
          <el-button @click="showGenerateModal = false">取消</el-button>
          <el-button type="primary" @click="confirmGenerateNextContent">
            <Wand2 class="icon-sm" style="margin-right: 4px;" /> 开始生成正文
          </el-button>
        </div>
      </div>
    </div>

    <div v-if="showConfirmModal" class="modal-overlay" style="z-index: 10001;">
      <div class="modal-content" style="max-width: 400px;">
        <h2 class="modal-title">操作确认</h2>
        <p style="color: var(--color-text); margin-bottom: var(--spacing-xl); line-height: 1.5; white-space: pre-wrap;">{{ confirmMessage }}</p>
        <div class="modal-actions">
          <el-button @click="handleCancelConfirm">否</el-button>
          <el-button type="primary" @click="handleConfirm">是</el-button>
        </div>
      </div>
    </div>
    <div v-if="cascadeGenerating" class="modal-overlay" style="z-index: 9999; flex-direction: column; gap: 1.5rem;">
      <div class="spinner"></div>
      <h2 style="color: white; font-size: 1.5rem; font-family: var(--font-mono);">{{ cascadeTitle }}</h2>
      <p style="color: var(--color-text-muted); font-size: 1rem;">{{ cascadeProgress }}</p>
      <el-button v-if="!cascadeTitle.includes('更新设定')" @click="store.abortCurrentGeneration()" type="danger" style="margin-top: 1rem;">
        <StopCircle class="icon-sm" style="margin-right: 4px;" /> 停止生成
      </el-button>
    </div>

  </div>
</template>

<style>
.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  border-top-color: var(--color-cta);
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.dashboard-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg);
}

/* Header */
.app-header {
  background-color: var(--color-primary);
  border-bottom: 1px solid var(--color-border);
  padding: 0 var(--spacing-xl);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  height: 64px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.book-title {
  font-family: var(--font-mono);
  font-size: 1.25rem;
  margin: 0;
}

.nav-tabs {
  display: flex;
  height: 100%;
  gap: var(--spacing-xs);
}

.nav-tab {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  padding: 0 var(--spacing-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: 0.875rem;
  font-weight: 500;
  border-bottom: 2px solid transparent;
  border-radius: 0;
}

.nav-tab:hover {
  color: var(--color-text);
  background-color: var(--color-surface-hover);
}

.nav-tab.active {
  color: var(--color-cta);
  border-bottom-color: var(--color-cta);
  background-color: rgba(34, 197, 94, 0.05);
}

/* Main Content */
.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tab-pane {
  padding: var(--spacing-xl);
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.tab-pane.scrollable {
  overflow-y: auto;
}

/* Widgets */
.ai-widget {
  flex-shrink: 0;
}

.editor-widget {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.widget-title {
  font-size: 1rem;
  font-family: var(--font-mono);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.widget-body {
  display: flex;
  gap: var(--spacing-md);
}

.text-editor {
  flex: 1;
  width: 100%;
  background-color: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  color: var(--color-text);
  resize: none;
  font-family: var(--font-sans);
  line-height: 1.6;
}

.text-editor:focus {
  border-color: var(--color-cta);
  outline: none;
}

/* Timeline / Realms */
.pane-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
}

.pane-title {
  font-size: 1.5rem;
  font-family: var(--font-mono);
}

.timeline {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.timeline-line {
  position: absolute;
  left: 50px;
  top: 20px;
  bottom: 20px;
  width: 2px;
  background-color: var(--color-border);
  z-index: 0;
}

.timeline-item {
  position: relative;
  z-index: 1;
  display: flex;
  gap: var(--spacing-lg);
  align-items: flex-start;
}

.timeline-marker {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: var(--color-surface);
  border: 2px solid var(--color-cta);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--color-cta);
  flex-shrink: 0;
}

.timeline-content {
  flex: 1;
}

.item-title {
  font-size: 1.125rem;
  margin-bottom: var(--spacing-xs);
  color: var(--color-text);
}

.item-desc {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.float-right {
  float: right;
}

/* Data Grid / Characters */
.data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--spacing-xl);
}

.data-card {
  position: relative;
  display: flex;
  flex-direction: column;
}

.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: auto;
  padding-top: var(--spacing-md);
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.data-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: var(--spacing-md);
}

.data-row:last-child {
  margin-bottom: 0;
  margin-top: auto;
}

.data-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: block;
}

.data-value {
  font-size: 0.875rem;
  color: var(--color-text);
  line-height: 1.5;
  display: block;
  min-height: 1.5em; /* 保证即使内容为空也占据一行高度 */
}

/* Editor Layout */
.editor-layout {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.sidebar {
  width: 250px;
  background-color: var(--color-primary);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-title {
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-sm);
}

.list-item {
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-bottom: 2px;
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}

.chapter-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.chapter-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-left: 8px;
}

.status-dot.draft { background-color: var(--color-border); }
.status-dot.reviewing { background-color: var(--color-warning); }
.status-dot.completed { background-color: var(--color-cta); }

.list-item:hover {
  background-color: var(--color-surface-hover);
  color: var(--color-text);
}

.list-item.active {
  background-color: rgba(59, 130, 246, 0.1);
  color: var(--color-info);
  font-weight: 500;
}

.list-item.selected-for-delete {
  background-color: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.workspace {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg);
}

.workspace-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.toolbar {
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-primary);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar-group {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

.editor-split {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.editor-wrapper {
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
}

.editor-wrapper.scanning {
  background-color: rgba(59, 130, 246, 0.02);
}

.scan-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--color-cta);
  box-shadow: 0 0 10px var(--color-cta), 0 0 20px var(--color-cta);
  animation: scan-animation 2s linear infinite;
  pointer-events: none;
  z-index: 10;
}

@keyframes scan-animation {
  0% { top: 0%; opacity: 0; }
  5% { opacity: 1; }
  95% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}

.main-editor {
  flex: 1;
  background-color: transparent;
  border: none;
  padding: var(--spacing-xl);
  color: var(--color-text);
  font-size: 1.125rem;
  line-height: 1.8;
  resize: none;
  outline: none;
}

.summary-panel {
  width: 450px;
  background-color: var(--color-primary);
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border);
}

.summary-editor {
  flex: 1;
  background-color: transparent;
  border: none;
  padding: var(--spacing-md);
  color: var(--color-text-muted);
  font-size: 0.875rem;
  line-height: 1.6;
  resize: none;
  outline: none;
}

/* Stats */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-lg);
}

.kpi-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.kpi-label {
  font-size: 0.90rem;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.kpi-value {
  font-size: 2rem;
  font-family: var(--font-mono);
  font-weight: 700;
}

/* Utilities */
.flex-1 { flex: 1; }
.flex-2 { flex: 2; }
.color-cta { color: var(--color-cta); }
.color-info { color: var(--color-info); }
.color-warning { color: var(--color-warning); }
.color-success { color: var(--color-success); }
.icon { width: 18px; height: 18px; }
.icon-sm { width: 16px; height: 16px; }

.status-text {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.btn-sm {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: 0.875rem;
}

.empty-state {
  text-align: center;
  padding: var(--spacing-2xl);
  color: var(--color-text-muted);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  margin: auto;
}

.alert-box {
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  margin-bottom: var(--spacing-lg);
}
.alert-box.warning {
  background-color: rgba(234, 179, 8, 0.1);
  color: var(--color-warning);
  border: 1px solid rgba(234, 179, 8, 0.2);
}

/* Forms */
.form-layout {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.form-row {
  display: flex;
  gap: var(--spacing-md);
}

.modal-title {
  font-size: 1.25rem;
  font-family: var(--font-mono);
  margin-bottom: var(--spacing-lg);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-group label {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.h-24 {
  height: 6rem;
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
