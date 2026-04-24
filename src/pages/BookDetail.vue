<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMainStore } from '../store/main';
import { ArrowLeft, BookOpen, Globe, Users, Edit3, BarChart2, Wand2, Plus, Save, Layers, UserPlus, StopCircle, Trash2, Library, Sparkles, Feather, Compass, GitMerge, FileText, Activity, Link } from 'lucide-vue-next';
import { MdEditor, MdPreview } from 'md-editor-v3';
import 'md-editor-v3/lib/style.css';
import 'md-editor-v3/lib/preview.css';

import type { OutlineNode } from '../types';

const route = useRoute();
const router = useRouter();
const store = useMainStore();
const activeTab = ref((route.query.tab as string) || 'stats');
const bookId = computed(() => route.params.id as string);

const generating = ref(false);
const cascadeGenerating = ref(false);
const cascadeTitle = ref('AI 一键衍生设定生成中...');
const cascadeProgress = ref('');
const newOutlineIdea = ref('');
const newWorldviewIdea = ref('');

// Data
const book = computed(() => store.currentBook);
const parsedOutlineTree = computed<OutlineNode[]>(() => {
  if (!book.value?.outlineTree) return [];
  try {
    return JSON.parse(book.value.outlineTree);
  } catch (e) {
    return [];
  }
});
const characters = computed(() => store.characters);
const mainCharacters = computed(() => store.characters.filter(c => c.role === '主角团'));
const supportCharacters = computed(() => store.characters.filter(c => c.role === '配角'));
const villainCharacters = computed(() => store.characters.filter(c => c.role === '反派'));
const extraCharacters = computed(() => store.characters.filter(c => c.role === '路人'));
const chapters = computed(() => store.chapters);
const realms = computed(() => (store.realms || []).slice().sort((a, b) => (a?.level || 0) - (b?.level || 0)));
const references = computed(() => store.references || []);
const clues = computed(() => store.clues || []);
const activeClues = computed(() => clues.value.filter(c => c.status === 'active'));
const resolvedClues = computed(() => clues.value.filter(c => c.status === 'resolved'));

// References form
const showRefModal = ref(false);
const editingRefId = ref<string | null>(null);
const newRef = ref({ sourceName: '', content: '' });

const openRefModal = (reference?: any) => {
  if (reference) {
    editingRefId.value = reference.id;
    newRef.value = { ...reference };
  } else {
    editingRefId.value = null;
    newRef.value = { sourceName: '', content: '' };
  }
  showRefModal.value = true;
};

const createReference = async () => {
  if (editingRefId.value) {
    await store.updateReference(editingRefId.value, { ...newRef.value });
  } else {
    await store.createReference({ ...newRef.value, bookId: bookId.value });
  }
  showRefModal.value = false;
  newRef.value = { sourceName: '', content: '' };
};

const deleteReference = async (id: string) => {
  confirmAction('确认删除此条资料吗？', async () => {
    await store.deleteReference(id);
  });
};

// Messages
const messages = ref<{id: string, text: string, type: string}[]>([]);
const showMessage = (text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', duration = 3000) => {
  const id = Date.now().toString() + Math.random().toString();
  messages.value.push({ id, text, type });
  setTimeout(() => {
    messages.value = messages.value.filter(m => m.id !== id);
  }, duration);
};

// UI State for confirmation modal
const showConfirmModal = ref(false);
const confirmMessage = ref('');
const confirmCallback = ref<(() => void) | null>(null);
const cancelCallback = ref<(() => void) | null>(null);

const confirmAction = (message: string, onConfirm: () => void, onCancel?: () => void) => {
  confirmMessage.value = message;
  confirmCallback.value = onConfirm;
  cancelCallback.value = onCancel || null;
  showConfirmModal.value = true;
};

const handleConfirm = () => {
  if (confirmCallback.value) {
    confirmCallback.value();
  }
  showConfirmModal.value = false;
  confirmCallback.value = null;
  cancelCallback.value = null;
};

const handleCancelConfirm = () => {
  if (cancelCallback.value) {
    cancelCallback.value();
  }
  showConfirmModal.value = false;
  confirmCallback.value = null;
  cancelCallback.value = null;
};
const showRealmModal = ref(false);
const editingRealmId = ref<string | null>(null);
const newRealm = ref({ level: 1, name: '', description: '' });

const openRealmModal = (realm?: any) => {
  if (realm) {
    editingRealmId.value = realm.id;
    newRealm.value = { level: realm.level, name: realm.name, description: realm.description };
  } else {
    editingRealmId.value = null;
    const maxLevel = realms.value.reduce((max, r) => Math.max(max, r.level || 0), 0);
    newRealm.value = { level: maxLevel + 1, name: '', description: '' };
  }
  showRealmModal.value = true;
};

const deleteCharacter = async (id: string) => {
  confirmAction('确认删除此人物吗？', async () => {
    await store.deleteCharacter(id);
  });
};

const createRealm = async () => {
  if (editingRealmId.value) {
    await store.updateRealm(editingRealmId.value, { ...newRealm.value });
  } else {
    const insertLevel = Number(newRealm.value.level) || 1;
    
    // 查找所有大于等于插入层级的境界，将它们的层级 +1
    const realmsToUpdate = realms.value.filter(r => (r.level || 0) >= insertLevel);
    // 从大到小更新，避免潜在冲突
    for (const r of [...realmsToUpdate].sort((a, b) => (b.level || 0) - (a.level || 0))) {
      await store.updateRealm(r.id, { level: (r.level || 0) + 1 });
    }
  
    await store.createRealm({ ...newRealm.value, bookId: bookId.value });
  }
  showRealmModal.value = false;
  
  const maxLevel = store.realms.reduce((max, r) => Math.max(max, r.level || 0), 0);
  newRealm.value = { level: maxLevel + 1, name: '', description: '' };
};

// Characters form
const showCharModal = ref(false);
const editingCharId = ref<string | null>(null);
const newChar = ref({ name: '', role: '配角', personality: '', abilities: '', status: '未出场' });

const openCharModal = (char?: any) => {
  if (char) {
    editingCharId.value = char.id;
    newChar.value = { ...char };
  } else {
    editingCharId.value = null;
    newChar.value = { name: '', role: '配角', personality: '', abilities: '', status: '未出场' };
  }
  showCharModal.value = true;
};

const createCharacter = async () => {
  if (editingCharId.value) {
    await store.updateCharacter(editingCharId.value, { ...newChar.value });
  } else {
    await store.createCharacter({ ...newChar.value, bookId: bookId.value });
  }
  showCharModal.value = false;
};
const showClueModal = ref(false);
const editingClueId = ref<string | null>(null);
const newClue = ref({ title: '', content: '', status: 'active' as 'active'|'resolved' });

const openClueModal = (clue?: any) => {
  if (clue) {
    editingClueId.value = clue.id;
    newClue.value = { title: clue.title, content: clue.content, status: clue.status };
  } else {
    editingClueId.value = null;
    newClue.value = { title: '', content: '', status: 'active' };
  }
  showClueModal.value = true;
};

const createClue = async () => {
  if (editingClueId.value) {
    await store.updateClue(editingClueId.value, { ...newClue.value });
  } else {
    await store.createClue({ ...newClue.value, bookId: bookId.value });
  }
  showClueModal.value = false;
};

const deleteClue = async (id: string) => {
  confirmAction('确认删除此伏笔/暗线吗？', async () => {
    await store.deleteClue(id);
  });
};

const toggleClueStatus = async (clue: any) => {
  const newStatus = clue.status === 'active' ? 'resolved' : 'active';
  await store.updateClue(clue.id, { status: newStatus });
};

// Chapters
const activeChapterId = ref<string | null>(null);
const currentChapter = computed(() => chapters.value.find(c => c.id === activeChapterId.value));
const currentChapterContent = ref('');
const currentChapterSummary = ref('');
const currentChapterFeedback = ref('');
const writingStyle = ref('默认风格');
const writingStyleOptions = ['默认风格', '金庸风 (武侠)', '古龙风 (写意)', '辰东风 (玄幻)', '烽火戏诸侯风 (细腻)', '诡秘之主风 (克苏鲁)', '轻松搞笑风', '沉重黑暗风'];

// Plot Weaver Modal
const showPlotModal = ref(false);
const plotOptions = ref<string[]>([]);
const plotGenerating = ref(false);
const plotWeaverTarget = ref<'editor' | string>('editor');

const generatePlotOptions = async () => {
  if (plotWeaverTarget.value === 'editor' && !activeChapterId.value) return;
  
  plotGenerating.value = true;
  plotOptions.value = [];
  try {
    let contextStr = '';
    if (plotWeaverTarget.value === 'editor') {
      contextStr = currentChapterContent.value ? currentChapterContent.value.substring(Math.max(0, currentChapterContent.value.length - 1000)) : (currentChapterSummary.value || '暂无');
    } else {
      const node = parsedOutlineTree.value.find(n => n.id === plotWeaverTarget.value);
      contextStr = `当前阶段：${node?.title}\n内容简述：${node?.description}`;
    }

    const prompt = `你是一个顶级小说家。请根据当前小说大纲和以下本章上下文，为接下来的剧情发展生成 3 个不同走向的曲折情节（例如：神转折、遇强敌、得奇遇、深挖阴谋等）。
要求：严格使用以下格式输出，不要输出 JSON，不要有前言后语，每行一个情节走向，用三个竖线分隔：
情节走向标题|||情节具体描述

【已有上下文/大纲节点】
${contextStr}
`;
    let plotResult = '';
    await store.generateContentStream(prompt, '你是一个情节设计师。只输出规定格式的文本。', 2000, (chunk) => {
      plotResult += chunk;
    });
    
    const cleanResult = plotResult.replace(/```[a-zA-Z]*\n/g, '').replace(/```/g, '');
    const lines = cleanResult.split('\n').filter(l => l.includes('|||'));
    for (const line of lines) {
      const [title, desc] = line.split('|||').map(s => s.trim());
      if (title && title !== '情节走向标题') {
        plotOptions.value.push(`【${title}】\n${desc}`);
      }
    }
  } catch (e: any) {
    alert('生成情节走向失败: ' + e.message);
  } finally {
    plotGenerating.value = false;
  }
};

const applyPlotOption = async (plotDesc: string) => {
  if (plotWeaverTarget.value === 'editor') {
    if (currentChapterContent.value && !currentChapterContent.value.endsWith('\n\n')) {
      currentChapterContent.value += '\n\n';
    }
    currentChapterContent.value += `[AI情节推演：${plotDesc}]\n\n`;
    await saveChapter();
  } else {
    const newTree = [...parsedOutlineTree.value];
    const nodeIndex = newTree.findIndex(n => n.id === plotWeaverTarget.value);
    if (nodeIndex !== -1) {
      newTree[nodeIndex].wovenPlot = plotDesc;
      await store.updateBook(bookId.value, { outlineTree: JSON.stringify(newTree) });
    }
  }
  showPlotModal.value = false;
};

// Polish Feature
const showPolishModal = ref(false);
const polishAction = ref('润色');
const selectedText = ref('');
const polishResult = ref('');
const polishGenerating = ref(false);
const mainEditorRef = ref<HTMLTextAreaElement | null>(null);
const userHasScrolledMainEditor = ref(false);

const summaryEditorRef = ref<HTMLTextAreaElement | null>(null);
const userHasScrolledSummary = ref(false);

const feedbackEditorRef = ref<HTMLTextAreaElement | null>(null);
const userHasScrolledFeedback = ref(false);

const handleMainEditorScroll = () => {
  if (!mainEditorRef.value) return;
  const { scrollTop, scrollHeight, clientHeight } = mainEditorRef.value;
  userHasScrolledMainEditor.value = scrollHeight - scrollTop - clientHeight > 10;
};

const handleSummaryScroll = () => {
  if (!summaryEditorRef.value) return;
  const { scrollTop, scrollHeight, clientHeight } = summaryEditorRef.value;
  userHasScrolledSummary.value = scrollHeight - scrollTop - clientHeight > 10;
};

const handleFeedbackScroll = () => {
  if (!feedbackEditorRef.value) return;
  const { scrollTop, scrollHeight, clientHeight } = feedbackEditorRef.value;
  userHasScrolledFeedback.value = scrollHeight - scrollTop - clientHeight > 10;
};

const openPolishModal = () => {
  if (!mainEditorRef.value) return;
  const start = mainEditorRef.value.selectionStart;
  const end = mainEditorRef.value.selectionEnd;
  const text = mainEditorRef.value.value.substring(start, end);
  if (!text || text.trim() === '') {
    alert('请先在左侧正文中选中需要处理的文本内容');
    return;
  }
  selectedText.value = text;
  polishResult.value = '';
  showPolishModal.value = true;
};

const applyPolishResult = async () => {
  if (!mainEditorRef.value || !polishResult.value) return;
  const start = mainEditorRef.value.selectionStart;
  const end = mainEditorRef.value.selectionEnd;
  
  const content = currentChapterContent.value;
  currentChapterContent.value = content.substring(0, start) + polishResult.value + content.substring(end);
  
  await saveChapter();
  showPolishModal.value = false;
};

const runPolish = async () => {
  if (!selectedText.value) return;
  polishGenerating.value = true;
  polishResult.value = '';
  
  try {
    let actionDesc = '润色并优化这段文字，使其更加生动、流畅、符合网文风格';
    if (polishAction.value === '扩写') {
      actionDesc = '扩写这段文字，加入更多的细节描写、环境渲染和人物心理活动，增加字数';
    } else if (polishAction.value === '续写') {
      actionDesc = '根据这段文字的结尾，合理地顺延和续写接下来的情节';
    }
    
    const stylePrompt = writingStyle.value !== '默认风格' ? `\n要求严格模仿“${writingStyle.value}”的风格。` : '';
    const worldviewRules = `你的语言和设定必须严格遵守当前世界观。例如，在修仙/古风/玄幻背景下，绝对不要出现如“洗衣机”、“核弹”、“火车”等现代科技物品的描述和比喻。`;
    const prompt = `你是一位顶级的网文作者。请对以下选中的小说片段进行【${polishAction.value}】。
任务：${actionDesc}${stylePrompt}
世界观约束：${worldviewRules}

【选中的片段】
${selectedText.value}

请直接输出处理后的文本，不要输出任何解释性的话语，也不要输出多余的格式。`;

    await store.generateContentStream(prompt, '你是一个文字处理大师。只输出处理后的正文文本。', 4000, (chunk) => {
      polishResult.value += chunk;
    });
  } catch (e: any) {
    alert('处理失败: ' + e.message);
  } finally {
    polishGenerating.value = false;
  }
};

onMounted(async () => {
  await store.fetchBook(bookId.value);
  await store.fetchCharacters(bookId.value);
  await store.fetchChapters(bookId.value);
  await store.fetchRealms(bookId.value);
  await store.fetchReferences(bookId.value);
  await store.fetchClues(bookId.value);
  if (chapters.value.length > 0) {
    const latestChapter = chapters.value[chapters.value.length - 1];
    activeChapterId.value = latestChapter.id;
    currentChapterContent.value = latestChapter.content;
    currentChapterSummary.value = latestChapter.summary || '';
    currentChapterFeedback.value = latestChapter.reviewFeedback || '';
  }
});

watch(activeTab, (newTab) => {
  router.replace({ query: { ...route.query, tab: newTab } });
  
  if (newTab === 'editor' && chapters.value.length > 0 && !generating.value) {
    // 切换到写作编辑页签时，默认选中最新章节
    const latestChapter = chapters.value[chapters.value.length - 1];
    if (activeChapterId.value !== latestChapter.id) {
      selectChapter(latestChapter.id);
    }
  }
});

const editingTitle = ref(false);
const newTitle = ref('');

const startEditTitle = () => {
  if (book.value) {
    newTitle.value = book.value.title;
    editingTitle.value = true;
  }
};

const saveTitle = async () => {
  if (newTitle.value.trim() && book.value && newTitle.value !== book.value.title) {
    await store.updateBook(bookId.value, { title: newTitle.value.trim() });
  }
  editingTitle.value = false;
};

const cancelEditTitle = () => {
  editingTitle.value = false;
};

const generateOutline = async () => {
  if (!newOutlineIdea.value || !book.value) return;
  generating.value = true;
  try {
    const prompt = `为小说《${book.value.title}》（类型：${book.value.type}）生成大纲。核心点：${newOutlineIdea.value}`;
    if (book.value) book.value.outline = '';
    let fullText = '';
    await store.generateContentStream(prompt, '你是一个专业的小说大纲设计师，请输出结构清晰、包含起承转合的详细大纲。', 8000, (chunk) => {
      fullText += chunk;
      if (book.value) book.value.outline = fullText;
    });
    await store.updateBook(bookId.value, { outline: fullText });
    
    // 生成完成后提示是否进行衍生设定
    const hasExistingData = (book.value?.worldview && book.value.worldview.trim().length > 0) || realms.value.length > 0 || characters.value.length > 0;
    let msg = '大纲生成完成！是否根据当前大纲自动生成衍生设定？';
    if (hasExistingData) {
      msg = '大纲生成完成！检测到已有世界观/人物/境界数据。\n是否要根据新大纲覆盖并重新生成衍生设定？\n\n【确认】覆盖并重新生成旧数据\n【取消】稍后手动生成';
    }
    confirmAction(msg, async () => {
      await runCascadeGeneration(hasExistingData);
    });
  } catch (e: any) {
    alert('生成失败: ' + e.message);
  } finally {
    generating.value = false;
  }
};

// Outline Tree Generation & Management
const showTreeConfigModal = ref(false);
const treeTargetChapterCount = ref(100);

const openTreeConfigModal = () => {
  if (!book.value?.outline) {
    alert('请先生成大纲内容');
    return;
  }
  if (parsedOutlineTree.value.length > 0) {
    confirmAction('已有大纲树存在，重新生成将覆盖当前的大纲树。是否继续？', () => {
      showTreeConfigModal.value = true;
    });
  } else {
    showTreeConfigModal.value = true;
  }
};

// Timeline Ref
const outlineTreeContainer = ref<HTMLElement | null>(null);
const userHasScrolledUp = ref(false);

const handleOutlineTreeScroll = () => {
  if (!outlineTreeContainer.value) return;
  const { scrollTop, scrollHeight, clientHeight } = outlineTreeContainer.value;
  // 容差 10px：如果距离底部超过 10px，说明用户手动往上滑了
  const isAtBottom = scrollHeight - scrollTop - clientHeight <= 10;
  userHasScrolledUp.value = !isAtBottom;
};

const scrollToOutlineTreeBottom = () => {
  if (outlineTreeContainer.value && !userHasScrolledUp.value) {
    outlineTreeContainer.value.scrollTop = outlineTreeContainer.value.scrollHeight;
  }
};

const generateOutlineTree = async () => {
  showTreeConfigModal.value = false;
  userHasScrolledUp.value = false; // 每次重新生成时重置滚动状态
  generating.value = true;
  try {
    const stylePrompt = writingStyle.value !== '默认风格' ? `\n【文风要求】\n请严格模仿“${writingStyle.value}”的风格进行拆解。` : '';
    const prompt = `请根据以下大纲，将其拆解为一个细化的剧情大纲树。
核心要求：
1. 目标总章节数大约为 ${treeTargetChapterCount.value} 章。
2. 必须严格按照每 5 章为一个节点进行拆解和细化（例如：1-5章、6-10章、11-15章，以此类推，直到大约 ${treeTargetChapterCount.value} 章结束）。
3. 每个阶段必须有具体的剧情发展任务和冲突。
4. 你的语言和描述必须严格遵守小说的大纲和世界观背景。绝不能出现与背景不符的现代物品、比喻或词汇（例如修仙/古风下不能有“洗衣机”、“网络”等）。
5. 请严格使用以下格式输出，不要输出JSON，不要有前言后语，每行一个阶段，用三个竖线分隔：
起始章序号|||结束章序号|||阶段标题|||阶段剧情描述
例如：
1|||5|||初入宗门|||主角拜入玄天宗，在外门受到打压...
6|||10|||宗门大比|||主角在宗门大比中一鸣惊人...

小说大纲：
${book.value?.outline}
${stylePrompt}`;
    let treeResult = '';
    await store.generateContentStream(prompt, '你是一个专业的大纲架构师。只输出规定格式的文本。', 8000, (chunk) => {
      treeResult += chunk;
      // 流式解析大纲树并立即显示
      try {
        const tempClean = treeResult.replace(/```[a-zA-Z]*\n/g, '').replace(/```/g, '');
        const tempLines = tempClean.split('\n').filter(l => l.includes('|||'));
        const tempNodes: OutlineNode[] = [];
        for (let i = 0; i < tempLines.length; i++) {
          let parts = tempLines[i].split('|||').map(s => s.trim());
          if (parts[0].match(/^\d+\.\s*\d+/)) {
            parts[0] = parts[0].replace(/^\d+\.\s*/, '');
          }
          if (parts.length >= 4 && !parts[0].includes('起始章序号') && !isNaN(parseInt(parts[0]))) {
            tempNodes.push({
              id: `node-${Date.now()}-${i}`,
              startChapter: parseInt(parts[0]) || 0,
              endChapter: parseInt(parts[1]) || 0,
              title: parts[2],
              description: parts[3],
            });
          }
        }
        if (tempNodes.length > 0 && book.value) {
          book.value.outlineTree = JSON.stringify(tempNodes);
          nextTick(() => {
            scrollToOutlineTreeBottom();
          });
        }
      } catch(e) {
        // ignore parse error during streaming
      }
    });

    if (!treeResult) throw new Error('AI 返回内容为空');

    const cleanResult = treeResult.replace(/```[a-zA-Z]*\n/g, '').replace(/```/g, '');
    const lines = cleanResult.split('\n').filter(l => l.includes('|||'));
    const nodes: OutlineNode[] = [];
    for (let i = 0; i < lines.length; i++) {
      let parts = lines[i].split('|||').map(s => s.trim());
      // 容错：有些AI可能会加上序号，如 "1. 1|||5|||xxx"
      if (parts[0].match(/^\d+\.\s*\d+/)) {
        parts[0] = parts[0].replace(/^\d+\.\s*/, '');
      }
      
      if (parts.length >= 4 && !parts[0].includes('起始章序号') && !isNaN(parseInt(parts[0]))) {
        nodes.push({
          id: `node-${Date.now()}-${i}`,
          startChapter: parseInt(parts[0]) || 0,
          endChapter: parseInt(parts[1]) || 0,
          title: parts[2],
          description: parts[3],
        });
      }
    }
    
    if (nodes.length === 0) {
      throw new Error('未能从 AI 回复中解析出有效节点，请重试');
    }
    await store.updateBook(bookId.value, { outlineTree: JSON.stringify(nodes) });
  } catch (e: any) {
    alert('生成大纲树失败: ' + e.message);
  } finally {
    generating.value = false;
  }
};

// Node Manual Management
const addOutlineNode = async () => {
  const currentNodes = [...parsedOutlineTree.value];
  const lastNode = currentNodes.length > 0 ? currentNodes[currentNodes.length - 1] : null;
  const startChapter = lastNode ? lastNode.endChapter + 1 : 1;
  const endChapter = startChapter + 4;
  
  currentNodes.push({
    id: `node-${Date.now()}-manual`,
    startChapter,
    endChapter,
    title: '新增阶段剧情',
    description: '请点击编辑填写此阶段的剧情描述...',
  });
  
  await store.updateBook(bookId.value, { outlineTree: JSON.stringify(currentNodes) });
};

const deleteOutlineNode = async (id: string) => {
  confirmAction('确认删除这个大纲节点吗？', async () => {
    const currentNodes = parsedOutlineTree.value.filter(n => n.id !== id);
    await store.updateBook(bookId.value, { outlineTree: JSON.stringify(currentNodes) });
  });
};

const showEditNodeModal = ref(false);
const editingNode = ref<OutlineNode | null>(null);

const openEditNodeModal = (node: OutlineNode) => {
  editingNode.value = { ...node };
  showEditNodeModal.value = true;
};

const saveEditedNode = async () => {
  if (!editingNode.value) return;
  const currentNodes = [...parsedOutlineTree.value];
  const index = currentNodes.findIndex(n => n.id === editingNode.value!.id);
  if (index !== -1) {
    currentNodes[index] = { ...editingNode.value };
    await store.updateBook(bookId.value, { outlineTree: JSON.stringify(currentNodes) });
  }
  showEditNodeModal.value = false;
};

const runCascadeGeneration = async (clearExisting: boolean) => {
  if (!book.value?.outline) {
    alert('请先输入或生成大纲内容');
    return;
  }

  outlineMode.value = 'read';
  generating.value = true;
  cascadeGenerating.value = true;
  try {
    if (clearExisting) {
      cascadeProgress.value = '正在清理旧数据...';
      const cleanupTasks = [
        store.updateBook(bookId.value, { worldview: '' })
      ];
      realms.value.forEach(r => cleanupTasks.push(store.deleteRealm(r.id)));
      characters.value.forEach(c => cleanupTasks.push(store.deleteCharacter(c.id)));
      clues.value.forEach(c => cleanupTasks.push(store.deleteClue(c.id)));
      await Promise.all(cleanupTasks);
    }

    cascadeProgress.value = '正在生成世界观与境界体系生成...';
    const stylePrompt = writingStyle.value !== '默认风格' ? `\n【文风要求】\n请严格模仿“${writingStyle.value}”的风格进行描述。` : '';
    const worldviewRules = `你的语言和设定必须严格遵守当前世界观。例如，在修仙/古风/玄幻背景下，绝对不要出现如“洗衣机”、“网络”、“火车”等现代科技物品的描述和比喻。`;
    const wvPrompt = `基于以下大纲生成世界观和背景设定：\n${book.value.outline}\n\n注意：${worldviewRules}${stylePrompt}`;
    
    // Task 1 & 2: Generate Worldview and Realms in parallel
    const worldviewTask = (async () => {
      let wvResult = '';
      if (book.value) book.value.worldview = '';
      await store.generateContentStream(wvPrompt, '你是一个设定师。输出详细的地理环境、势力分布和核心冲突。', 8000, (chunk) => {
        wvResult += chunk;
        if (book.value) book.value.worldview = wvResult;
      });
      await store.updateBook(bookId.value, { worldview: wvResult });
      return wvResult;
    })();

    const realmTask = (async () => {
      let realmsResultText = '无';
      if (book.value?.type === '修炼') {
        const realmPrompt = `基于以下大纲，设计一套完整的修炼境界体系。
要求：
1. 至少包含6个大境界。
2. 你的语言和描述必须严格遵守修仙/玄幻的世界观背景，绝对不要出现任何现代科技物品的描述和比喻。
3. 请严格使用以下格式输出，不要输出任何 JSON，不要有前言后语，每行一个境界，用三个竖线分隔：
境界名称|||境界描述
例如：
炼气期|||吸纳天地灵气入体，改善体质...
筑基期|||体内真气液化...

大纲：${book.value.outline}`;
        let realmResult = '';
        await store.generateContentStream(realmPrompt, '你是一个设定师。只输出规定格式的文本。', 8000, (chunk) => {
          realmResult += chunk;
        });
        
        const realmTasks: Promise<any>[] = [];
        try {
          const cleanRealmResult = realmResult.replace(/```[a-zA-Z]*\n/g, '').replace(/```/g, '');
          realmsResultText = cleanRealmResult; // pass to clue generation
          const lines = cleanRealmResult.split('\n').filter(l => l.includes('|||'));
          for (let i = 0; i < lines.length; i++) {
            const [name, desc] = lines[i].split('|||').map(s => s.trim());
            if (name && name !== '境界名称') {
              realmTasks.push(store.createRealm({ bookId: bookId.value, level: i + 1, name, description: desc || '' }));
            }
          }
          await Promise.all(realmTasks);
        } catch (e) {
          console.error("解析境界失败:", e, realmResult);
        }
      }
      return realmsResultText;
    })();
    
    // Wait for worldview and realms to finish
    const [wvResult, realmsResultText] = await Promise.all([worldviewTask, realmTask]);
    
    // Task 3: Generate Characters (Depends on worldview and realms)
    cascadeProgress.value = '主要衍生内容及境界已生成，正在为您生成人物卡片...';
    const charPrompt = `基于大纲提取核心人物，不仅要包含主角团，还要生成若干有血有肉的重要配角或反派（总共至少5个人物）。
要求：请严格使用以下格式输出，不要输出任何 JSON，不要有前言后语，每行一个人物，用三个竖线分隔：
人物名称|||角色定位|||性格特点|||能力境界|||当前状态
例如：
萧炎|||主角团|||坚韧不拔，重情重义|||斗之气三段，精通炼药|||未出场
药老|||主要配角|||神秘莫测，亦师亦友|||灵魂状态，深不可测|||未出场
魂灭生|||反派角色|||阴险毒辣，实力强大|||魂殿殿主，斗尊|||未出场
纳兰嫣然|||路人|||高傲任性，但本质不坏|||云岚宗少宗主，斗者三星|||未出场

角色定位请严格只填写以下四种之一：主角团、配角、反派、路人。当前状态只能填写：出场/未出场/死亡。并且只有在已写的章节中出现的主角团、配角、反派或路人，状态才为出场，否则初始生成时状态请统一写为：未出场。
能力境界请参考已生成的境界体系进行合理设定。

注意：${worldviewRules}

大纲：${book.value.outline}
世界观：${wvResult}
境界体系：
${realmsResultText}`;
    
    const charsResult = await (async () => {
      let charResult = '';
      await store.generateContentStream(charPrompt, '你是一个设定师。只输出规定格式的文本。', 8000, (chunk) => {
        charResult += chunk;
      });
      
      const charTasks: Promise<any>[] = [];
      const extractedChars: any[] = [];
      try {
        const cleanCharResult = charResult.replace(/```[a-zA-Z]*\n/g, '').replace(/```/g, '');
        const lines = cleanCharResult.split('\n').filter(l => l.includes('|||'));
        for (const line of lines) {
          const [name, role, personality, abilities, status] = line.split('|||').map(s => s.trim());
          if (name && name !== '人物名称') {
            const mappedRole = role.includes('配角') ? '配角' : (role.includes('反派') ? '反派' : (role.includes('主角') ? '主角团' : '路人'));
            const charObj = {
              bookId: bookId.value,
              name,
              role: mappedRole,
              personality: personality || '',
              abilities: abilities || '',
              status: (status as any) || '未出场'
            };
            extractedChars.push(charObj);
            charTasks.push(store.createCharacter(charObj));
          }
        }
        await Promise.all(charTasks);
        return extractedChars;
      } catch (e) {
        console.error("解析人物失败:", e, charResult);
        return [];
      }
    })();

    // Task 4: Generate initial Clues/Foreshadowing (Depends on worldview, characters, and realms)
    cascadeProgress.value = '主要人物已生成，正在为您自动埋设初始伏笔暗线...';
    const charsInfoStr = charsResult.map((c: any) => `${c.name}(${c.role}): ${c.personality}`).join('\n');
    const cluePrompt = `基于以下大纲、世界观、人物和境界体系，为这本小说设计 3 到 5 个贯穿前中后期的伏笔或暗线。
要求：
1. 伏笔必须符合小说大纲走向、世界观设定，并可以牵扯到上述的主角或配角。
2. 你的语言和描述必须严格遵守当前世界观背景，绝对不要出现任何现代科技物品的描述和比喻。
3. 请严格使用以下格式输出，不要输出任何 JSON，不要有前言后语，每行一个伏笔，用三个竖线分隔：
伏笔名称|||伏笔详细描述(埋在哪，以后怎么收)
例如：
祖传残破戒指|||主角在开局获得的残破戒指，实则是上古大能的寄魂之所，前期帮助主角修炼，后期牵扯出上古秘辛。

大纲：${book.value.outline}
世界观：${wvResult}
主要人物：
${charsInfoStr}
境界体系：
${realmsResultText}`;
    
    let clueResult = '';
    await store.generateContentStream(cluePrompt, '你是一个专业设定师。只输出规定格式的文本。', 4000, (chunk) => {
      clueResult += chunk;
    });

    const clueTasks: Promise<any>[] = [];
    try {
      const cleanClueResult = clueResult.replace(/```[a-zA-Z]*\n/g, '').replace(/```/g, '');
      const clueLines = cleanClueResult.split('\n').filter(l => l.includes('|||'));
      for (const line of clueLines) {
        const [title, content] = line.split('|||').map(s => s.trim());
        if (title && title !== '伏笔名称') {
          clueTasks.push(store.createClue({
            bookId: bookId.value,
            title,
            content: content || '',
            status: 'active'
          }));
        }
      }
      await Promise.all(clueTasks);
    } catch (e) {
      console.error("解析初始伏笔失败:", e, clueResult);
    }

    cascadeProgress.value = '生成完毕！';
    setTimeout(() => {
      showMessage('衍生设定已全部自动生成并保存成功！', 'success');
    }, 500);
  } catch (e: any) {
    showMessage('自动化生成部分失败: ' + e.message, 'error');
  } finally {
    cascadeGenerating.value = false;
    generating.value = false;
  }
};

const autoGenerateCascade = async () => {
  if (!book.value?.outline) {
    alert('请先输入或生成大纲内容');
    return;
  }
  
  const hasExistingData = (book.value.worldview && book.value.worldview.trim().length > 0) || realms.value.length > 0 || characters.value.length > 0 || clues.value.length > 0;
  
  let confirmMsg = '这将会根据当前大纲自动生成世界观设定、主要人物卡片、初始伏笔暗线，若是修仙类型还会生成境界体系。是否继续？';
  if (hasExistingData) {
    confirmMsg = '检测到您已有生成的设定数据（世界观、人物、境界或伏笔）。是否要覆盖它们重新生成？\n\n【确认】将清空旧数据并重新生成\n【取消】仅保留当前大纲，不覆盖旧数据';
  }

  confirmAction(confirmMsg, async () => {
    await runCascadeGeneration(hasExistingData);
  });
};

const saveOutline = async () => {
  if (!book.value) return;
  const text = book.value.outline || '';
  await store.updateBook(bookId.value, { outline: text });
  
  if (text.trim().length > 0) {
    const hasExistingData = (book.value?.worldview && book.value.worldview.trim().length > 0) || realms.value.length > 0 || characters.value.length > 0 || clues.value.length > 0;
    let msg = '大纲已更新。是否根据新大纲重新生成衍生设定？';
    if (hasExistingData) {
      msg = '大纲已更新。是否要根据新大纲重新生成衍生设定（包含伏笔）？\n\n【确认】覆盖并重新生成旧数据\n【取消】仅更新大纲，不改动其他内容';
    }
    confirmAction(msg, async () => {
      await runCascadeGeneration(hasExistingData);
    });
  }
};

const generateWorldview = async () => {
  if (!newWorldviewIdea.value || !book.value) return;
  generating.value = true;
  try {
    const prompt = `为小说《${book.value.title}》（类型：${book.value.type}）生成世界观和故事概要。要求：${newWorldviewIdea.value}`;
    if (book.value) book.value.worldview = '';
    let fullText = '';
    await store.generateContentStream(prompt, '你是一个专业的小说设定师，请输出完整的力量体系（如适用）、地理环境和故事核心冲突。', 8000, (chunk) => {
      fullText += chunk;
      if (book.value) book.value.worldview = fullText;
    });
    await store.updateBook(bookId.value, { worldview: fullText });
  } catch (e: any) {
    alert('生成失败: ' + e.message);
  } finally {
    generating.value = false;
  }
};

const saveWorldview = async () => {
  if (!book.value) return;
  const text = book.value.worldview || '';
  await store.updateBook(bookId.value, { worldview: text });
};



const deleteRealm = async (id: string) => {
  confirmAction('确认删除此境界吗？', async () => {
    const realmToDelete = realms.value.find(r => r.id === id);
    const deleteLevel = realmToDelete?.level || 0;
    
    await store.deleteRealm(id);
    
    // 查找所有大于删除层级的境界，将它们的层级 -1
    const realmsToUpdate = realms.value.filter(r => (r.level || 0) > deleteLevel && r.id !== id);
    // 从小到大更新
    for (const r of [...realmsToUpdate].sort((a, b) => (a.level || 0) - (b.level || 0))) {
      await store.updateRealm(r.id, { level: (r.level || 0) - 1 });
    }
  });
};

const createNewChapter = async () => {
  // 检查最后一章的状态是否为已定稿
  if (chapters.value.length > 0) {
    const lastChapter = chapters.value[chapters.value.length - 1];
    if (lastChapter.status !== 'completed') {
      showMessage(`【${lastChapter.title}】还未定稿，请先将其标记为“✅ 已定稿”再创建新章节。`, 'warning');
      return;
    }
  }

  const nextChapNum = chapters.value.length + 1;
  const newChap = await store.createChapter({
    bookId: bookId.value,
    volume: 1,
    chapter: nextChapNum,
    title: `第${nextChapNum}章`,
    content: '',
    wordCount: 0,
    status: 'draft'
  });
  activeChapterId.value = newChap.id;
  currentChapterContent.value = '';
  currentChapterSummary.value = '';
  currentChapterFeedback.value = '';
};

const selectChapter = (id: string) => {
  if (generating.value) {
    confirmAction('当前有正在进行的 AI 生成任务，切换章节将终止生成。是否确认切换？', () => {
      store.abortCurrentGeneration();
      generating.value = false;
      const ch = chapters.value.find(c => c.id === id);
      if (ch) {
        activeChapterId.value = id;
        currentChapterContent.value = ch.content;
        currentChapterSummary.value = ch.summary || '';
        currentChapterFeedback.value = ch.reviewFeedback || '';
      }
    });
    return;
  }
  const ch = chapters.value.find(c => c.id === id);
  if (ch) {
    activeChapterId.value = id;
    currentChapterContent.value = ch.content;
    currentChapterSummary.value = ch.summary || '';
    currentChapterFeedback.value = ch.reviewFeedback || '';
  }
};

const deleteChapter = async (id: string, e: Event) => {
  e.stopPropagation();
  confirmAction('确认删除此章节吗？此操作不可恢复。', async () => {
    await store.deleteChapter(id);
    if (activeChapterId.value === id) {
      if (chapters.value.length > 0) {
        selectChapter(chapters.value[0].id);
      } else {
        activeChapterId.value = null;
        currentChapterContent.value = '';
        currentChapterSummary.value = '';
        currentChapterFeedback.value = '';
      }
    }
  });
};

const saveChapter = async () => {
  if (!activeChapterId.value) return;
  await store.updateChapter(activeChapterId.value, {
    content: currentChapterContent.value,
    summary: currentChapterSummary.value,
    reviewFeedback: currentChapterFeedback.value,
    wordCount: currentChapterContent.value.length
  });
};

const manualSaveChapter = async () => {
  await saveChapter();
  showMessage('内容已更新保存，正在为您重新梳理剧情...', 'success');
  await summarizeChapter();
};

const changeChapterStatus = async (status: 'draft' | 'reviewing' | 'completed', preventAuto = false) => {
  if (!activeChapterId.value) return;
  await store.updateChapter(activeChapterId.value, { status });
  
  // 切换到已定稿时：只更新人物卡片和伏笔暗线
  if (status === 'completed' && !preventAuto) {
    cascadeTitle.value = '正在更新设定...';
    cascadeProgress.value = '正文已定稿，正在自动更新人物卡片和伏笔暗线...';
    cascadeGenerating.value = true;
    await updateCharactersFromChapter();
    await updateCluesFromChapter();
    cascadeGenerating.value = false;
    showMessage('设定更新完成！', 'success');
  }

  // 切换到审核修改状态时：触发主编审核并自动弹出修改
  if (status === 'reviewing' && !preventAuto) {
    await agentReviewChapter(true);
    if (currentChapterFeedback.value) {
      await reviseChapter();
    }
  }
};

const updateCharactersFromChapter = async () => {
  if (!activeChapterId.value || !currentChapterContent.value) return;
  showMessage('正在根据本章内容实时更新人物卡片...', 'info');
  try {
    const prompt = `请分析以下小说正文，提取所有出现的角色（包括已有主角、配角、反派或新出现的路人）。
要求：严格使用以下格式输出，不要输出 JSON，不要有前言后语，每行一个人物，用三个竖线分隔：
人物名称|||角色定位(主角团/配角/反派/路人)|||最新能力/境界(如有)|||当前状态(出场/死亡)

说明：
1. 角色定位只能是“主角团”、“配角”、“反派”或“路人”。对于正文中新出现的人物，请一律判定为“路人”或“反派”。
2. 因为这些角色出现在了本章正文中，所以当前状态请统一判定为“出场”（除非在文中明确死亡）。
3. 如果文中没有提及某个角色的最新能力/境界，请直接留空或写“无”。

小说正文：
${currentChapterContent.value}`;

    let charResult = '';
    await store.generateContentStream(prompt, '你是一个专业的设定师。只输出规定格式的文本。', 8000, (chunk) => {
      charResult += chunk;
    });
    
    const cleanCharResult = charResult.replace(/```[a-zA-Z]*\n/g, '').replace(/```/g, '');
    const lines = cleanCharResult.split('\n').filter(l => l.includes('|||'));
    
    let updatedCount = 0;
    let newCount = 0;
    
    for (const line of lines) {
      const parts = line.split('|||').map(s => s.trim());
      if (parts.length >= 4) {
        const [name, role, abilities, status] = parts;
        if (name && name !== '人物名称') {
          const existingChar = characters.value.find(c => c.name === name);
          if (existingChar) {
            const updates: any = {};
            if (abilities && abilities !== '无') updates.abilities = abilities;
            if (status) updates.status = status;
            
            if (Object.keys(updates).length > 0) {
              await store.updateCharacter(existingChar.id, updates);
              updatedCount++;
            }
          } else {
            const mappedRole = role.includes('配角') ? '配角' : (role.includes('反派') ? '反派' : (role.includes('主角') ? '主角团' : '路人'));
            await store.createCharacter({
              bookId: bookId.value,
              name,
              role: mappedRole,
              personality: '', // 仅做记录，不分析性格
              abilities: abilities === '无' ? '' : abilities,
              status: (status as any) || '出场'
            });
            newCount++;
          }
        }
      }
    }
    showMessage(`人物卡片更新完成！新增 ${newCount} 人，更新 ${updatedCount} 人。`, 'success');
  } catch (e: any) {
    showMessage('更新人物卡片失败: ' + e.message, 'error');
  }
};

const updateCluesFromChapter = async () => {
  if (!activeChapterId.value || !currentChapterContent.value) return;
  showMessage('正在分析本章伏笔暗线...', 'info');
  try {
    const activeCluesInfo = activeClues.value.length > 0 ? activeClues.value.map(c => `[ID:${c.id}] ${c.title}:${c.content}`).join('\n') : '无';
    const prompt = `请分析以下小说正文，提取其中新埋设的【伏笔/暗线】，并检查是否回收了以下已有的未回收伏笔。
【当前未回收伏笔】
${activeCluesInfo}

【小说正文】
${currentChapterContent.value}

【任务】
严格使用以下格式输出，不要输出 JSON，不要有前言后语，每行一条记录，用三个竖线分隔：
1. 对于【新埋设】的伏笔，格式为：
NEW|||伏笔名称(简短)|||详细描述(解释埋了什么线索)

2. 对于【已回收】的已有伏笔，格式为：
RESOLVED|||已有伏笔的ID|||回收说明(正文中是如何填坑的)

如果没有新伏笔且没有回收旧伏笔，请输出"无"`;

    let result = '';
    await store.generateContentStream(prompt, '你是一个专业的设定师。只输出规定格式的文本。', 2000, (chunk) => {
      result += chunk;
    });
    
    const cleanResult = result.replace(/```[a-zA-Z]*\n/g, '').replace(/```/g, '');
    const lines = cleanResult.split('\n').filter(l => l.includes('|||'));
    
    let newCount = 0;
    let resolvedCount = 0;
    
    for (const line of lines) {
      const parts = line.split('|||').map(s => s.trim());
      if (parts[0] === 'NEW' && parts.length >= 3) {
        await store.createClue({
          bookId: bookId.value,
          title: parts[1],
          content: parts[2],
          status: 'active'
        });
        newCount++;
      } else if (parts[0] === 'RESOLVED' && parts.length >= 3) {
        const clueId = parts[1];
        const existingClue = activeClues.value.find(c => c.id === clueId);
        if (existingClue) {
          await store.updateClue(clueId, { 
            status: 'resolved',
            content: existingClue.content + '\n【回收说明】' + parts[2]
          });
          resolvedCount++;
        }
      }
    }
    if (newCount > 0 || resolvedCount > 0) {
      showMessage(`伏笔分析完成！新增 ${newCount} 条伏笔，回收 ${resolvedCount} 条伏笔。`, 'success');
    }
  } catch (e: any) {
    showMessage('伏笔分析失败: ' + e.message, 'error');
  }
};



const extractReferences = async () => {
  if (!activeChapterId.value || !currentChapterContent.value) return;
  generating.value = true;
  try {
    const prompt = `请从以下小说正文中提取出提及的资料、古籍、功法秘籍、特殊传说等内容。
要求：严格使用以下格式输出，不要输出 JSON，不要有前言后语，每行一条资料，用三个竖线分隔：
资料名称|||内容/摘录(简述)
例如：
山海经|||记载了上古异兽蛊雕，鸣声如婴儿。
太虚剑法|||主角修炼的基础剑法，以虚化实。

注意：只提取新的或者重要的资料设定。如果文中没有明显资料引用，请输出“无”。
小说正文：
${currentChapterContent.value}`;
    let refResult = '';
    await store.generateContentStream(prompt, '你是一个设定师。只输出规定格式的文本。', 2000, (chunk) => {
      refResult += chunk;
    });
    
    if (refResult.trim() === '无') {
      alert('本章没有检测到可提取的资料内容。');
      return;
    }

    const cleanRefResult = refResult.replace(/```[a-zA-Z]*\n/g, '').replace(/```/g, '');
    const lines = cleanRefResult.split('\n').filter(l => l.includes('|||'));
    let count = 0;
    for (const line of lines) {
      const [sourceName, content] = line.split('|||').map(s => s.trim());
      if (sourceName && sourceName !== '资料名称' && !references.value.find(r => r.sourceName === sourceName)) {
        await store.createReference({
          bookId: bookId.value,
          sourceName,
          content: content || ''
        });
        count++;
      }
    }
    alert(`成功提取并添加了 ${count} 条资料！请在资料室中查看。`);
  } catch (e: any) {
    alert('提取资料失败: ' + e.message);
  } finally {
    generating.value = false;
  }
};

const scrollToBottom = () => {
  nextTick(() => {
    if (mainEditorRef.value && !userHasScrolledMainEditor.value) {
      mainEditorRef.value.scrollTop = mainEditorRef.value.scrollHeight;
    }
  });
};

const scrollToSummaryBottom = () => {
  nextTick(() => {
    if (summaryEditorRef.value && !userHasScrolledSummary.value) {
      summaryEditorRef.value.scrollTop = summaryEditorRef.value.scrollHeight;
    }
  });
};

const scrollToFeedbackBottom = () => {
  nextTick(() => {
    if (feedbackEditorRef.value && !userHasScrolledFeedback.value) {
      feedbackEditorRef.value.scrollTop = feedbackEditorRef.value.scrollHeight;
    }
  });
};

const generateNextContent = async () => {
  if (!activeChapterId.value || !book.value) return;
  generating.value = true;
  try {
    const activeChars = characters.value.filter(c => c.status === '出场').map(c => `${c.name}(${c.role}): ${c.personality}, 能力:${c.abilities}`).join('\n');
      const realmsInfo = book.value.type === '修炼' ? realms.value.map(r => `${r.level}.${r.name}:${r.description}`).join('\n') : '无';
      const referencesInfo = references.value.length > 0 ? references.value.map(r => `${r.sourceName}:${r.content}`).join('\n') : '无';
      const activeCluesInfo = activeClues.value.length > 0 ? activeClues.value.map(c => `${c.title}:${c.content}`).join('\n') : '无';
      const stylePrompt = writingStyle.value !== '默认风格' ? `\n【文风要求】\n请严格模仿“${writingStyle.value}”的写作风格进行行文。` : '';
      
      const currentChapterNum = currentChapter.value?.chapter || 1;
      const currentNode = parsedOutlineTree.value.find(n => currentChapterNum >= n.startChapter && currentChapterNum <= n.endChapter);
      const nodePlot = currentNode?.wovenPlot ? `\n【当前阶段核心情节走向】\n本章需围绕以下情节推进：\n${currentNode.wovenPlot}` : '';

      // 获取上一章的内容作为衔接上下文
      let previousChapterContext = '暂无（这是第一章）';
      let previousChapterSummary = '暂无';
      if (currentChapterNum > 1) {
        const prevChapter = chapters.value.find(c => c.chapter === currentChapterNum - 1);
        if (prevChapter) {
          if (prevChapter.content) {
            // 取上一章的最后 1000 字作为衔接
            const prevContent = prevChapter.content;
            previousChapterContext = prevContent.length > 1000 ? prevContent.substring(prevContent.length - 1000) : prevContent;
          }
          if (prevChapter.summary) {
            previousChapterSummary = prevChapter.summary;
          }
        }
      }

      const prompt = `
你是一个顶级的${book.value.type}小说家。请为我的小说生成/续写当前章节的内容。

【全局上下文】
- 小说大纲：${book.value.outline || '暂无'}
- 世界观设定：${book.value.worldview || '暂无'}
- 境界体系：${realmsInfo}
- 出场人物：${activeChars || '暂无'}
- 参考资料库：${referencesInfo}
- 未回收伏笔暗线：${activeCluesInfo}
${stylePrompt}

【当前大纲节点】
- 阶段标题：${currentNode?.title || '暂无'}
- 阶段简介：${currentNode?.description || '暂无'}${nodePlot}

【当前章节信息】
- 章节名称：${currentChapter.value?.title}
- 本章前文摘要：${currentChapterSummary.value || '暂无'}

【上一章剧情梳理（重要！请参考此处的剧情点、时间、地点、人物动向）】
${previousChapterSummary}

【上一章结尾内容（重要！请务必无缝衔接此处的剧情）】
${previousChapterContext}

【本章已写内容（如有，请在此基础上续写）】
${currentChapterContent.value ? currentChapterContent.value : '(暂无，请直接承接上一章的结尾开始写本章)'}

【任务】
请严格根据上一章的结尾情节进行无缝衔接，同时结合当前大纲阶段的走向、人物性格和世界观设定，直接输出小说正文。
如果已有“本章已写内容”，请紧接着续写约800字；如果暂无内容，请紧接着“上一章结尾内容”作为本章的开头撰写约800字。要求文风符合${book.value.type}小说，情节紧凑，对话生动。
特别注意：
1. 如果上下文合适，你可以自然地埋下新的伏笔暗线，或者回收前面提到的【未回收伏笔暗线】。
2. 你的语言和描述必须严格遵守当前世界观。例如，在修仙/古风/玄幻背景下，绝对不要出现如“洗衣机”、“核弹”、“火车”等现代科技物品的描述和比喻。
`;
    if (currentChapterContent.value) {
      currentChapterContent.value += '\n\n';
    }
    userHasScrolledMainEditor.value = false;
    await store.generateContentStream(prompt, '你是专业的小说家，请只输出小说正文，不要输出多余的解释。', 8000, (chunk) => {
      currentChapterContent.value += chunk;
      scrollToBottom();
    });
    await saveChapter();
    
    // 自动进行本章剧情梳理
    if (currentChapterContent.value) {
      summaryGenerating.value = true;
      showMessage('正文已生成，正在自动梳理本章剧情...', 'info');
      currentChapterSummary.value = '正在自动梳理本章剧情...';
      const summaryPrompt = `请对以下章节内容进行剧情梳理，提取重要信息。
要求包含：
1. 本章核心剧情点
2. 发生的时间与地点
3. 出场人物动向
特别注意：梳理内容请务必精简，字数严格限制在 600 字以内。

小说正文：
${currentChapterContent.value}`;
      currentChapterSummary.value = '';
      userHasScrolledSummary.value = false;
      try {
        await store.generateContentStream(summaryPrompt, '你是一个专业的编辑，请提取小说的关键剧情点、时间地点和人物动向。', 1000, (chunk) => {
          currentChapterSummary.value += chunk;
          scrollToSummaryBottom();
        });
        await saveChapter();
        showMessage('自动剧情梳理完成！', 'success');
      } catch (err: any) {
        showMessage('自动剧情梳理失败: ' + err.message, 'error');
      } finally {
        summaryGenerating.value = false;
      }
    }
  } catch (e: any) {
    alert('续写失败: ' + e.message);
  } finally {
    generating.value = false;
  }
};

const agentReviewChapter = async (auto = false) => {
  if (!activeChapterId.value || !currentChapterContent.value) {
    if (!auto) showMessage('当前章节内容为空，无法审核', 'warning');
    return;
  }
  generating.value = true;
  try {
    const activeCluesInfo = activeClues.value.length > 0 ? activeClues.value.map(c => `${c.title}:${c.content}`).join('\n') : '无';
    const prompt = `
你是一个严苛的网文主编（Agent）。请审核以下这篇小说章节，并给出修改建议。

【大纲与世界观参考】
大纲：${book.value?.outline || '无'}
世界观：${book.value?.worldview || '无'}
未回收的伏笔：${activeCluesInfo}

【待审核正文】
${currentChapterContent.value}

【审核要求】
1. 逻辑漏洞：是否偏离了大纲设定？是否存在前后矛盾？
2. 人物OOC：人物行为是否符合其性格设定？
3. 节奏与爽点：行文是否拖沓？是否缺乏期待感或情绪波动？
4. 伏笔暗线：检查新埋设的伏笔是否突兀，已有的伏笔是否有合适的回收时机但被忽略了？
5. 错别字/语病：列出明显的语病或错别字。

请分点列出你的审核意见。如果认为写得很好，也可以给出肯定。
`;
    currentChapterFeedback.value = '';
    userHasScrolledFeedback.value = false;
    await store.generateContentStream(prompt, '你是一个专业的网文主编Agent，请给出犀利、专业、有建设性的修改意见。', 8000, (chunk) => {
      currentChapterFeedback.value += chunk;
      scrollToFeedbackBottom();
    });
    await saveChapter();
    if (!auto) {
      showMessage('AI 主编审核完成！请查看右侧的审核意见。', 'success');
    }
  } catch (e: any) {
    if (!auto) showMessage('审核失败: ' + e.message, 'error');
    await changeChapterStatus('draft', true);
  } finally {
    generating.value = false;
  }
};

const showReviseModal = ref(false);
const reviseResult = ref('');
const reviseGenerating = ref(false);
const reviseEditorRef = ref<HTMLTextAreaElement | null>(null);
const userHasScrolledReviseEditor = ref(false);

const handleReviseEditorScroll = () => {
  if (!reviseEditorRef.value) return;
  const { scrollTop, scrollHeight, clientHeight } = reviseEditorRef.value;
  userHasScrolledReviseEditor.value = scrollHeight - scrollTop - clientHeight > 10;
};

const scrollToReviseBottom = () => {
  nextTick(() => {
    if (reviseEditorRef.value && !userHasScrolledReviseEditor.value) {
      reviseEditorRef.value.scrollTop = reviseEditorRef.value.scrollHeight;
    }
  });
};

const reviseChapter = async () => {
  if (!activeChapterId.value || !currentChapterContent.value || !currentChapterFeedback.value) {
    alert('缺少原文或审核意见，无法进行一键修改');
    return;
  }
  
  reviseResult.value = '';
  showReviseModal.value = true;
  reviseGenerating.value = true;
  userHasScrolledReviseEditor.value = false;
  
  try {
    const activeChars = characters.value.filter(c => c.status === '出场').map(c => `${c.name}(${c.role}): ${c.personality}, 能力:${c.abilities}`).join('\n');
    const realmsInfo = book.value?.type === '修炼' ? realms.value.map(r => `${r.level}.${r.name}:${r.description}`).join('\n') : '无';
    const referencesInfo = references.value.length > 0 ? references.value.map(r => `${r.sourceName}:${r.content}`).join('\n') : '无';
    const activeCluesInfo = activeClues.value.length > 0 ? activeClues.value.map(c => `${c.title}:${c.content}`).join('\n') : '无';
    const stylePrompt = writingStyle.value !== '默认风格' ? `\n【文风要求】\n请严格模仿“${writingStyle.value}”的写作风格进行行文。` : '';
    
    const prompt = `
你是一位顶级的网文作者。现在有一篇小说章节因为存在一些问题，被主编打回并给出了修改意见。
请你根据主编的修改意见，对原本的章节内容进行全面修改和重写。

【全局设定参考】
- 小说大纲：${book.value?.outline || '无'}
- 世界观：${book.value?.worldview || '无'}
- 境界体系：${realmsInfo}
- 出场人物：${activeChars || '无'}
- 参考资料库：${referencesInfo}
- 未回收的伏笔/暗线：${activeCluesInfo}
${stylePrompt}

【原章节正文】
${currentChapterContent.value}

【主编审核修改意见】
${currentChapterFeedback.value}

【任务】
请吸收主编的意见，修正逻辑漏洞、人物OOC、语病错别字等问题，并优化节奏。
重写后的内容必须保持连贯，修改后的内容限制不超过4000字。
特别注意：你的语言和描述必须严格遵守当前世界观。例如，在修仙/古风/玄幻背景下，绝对不要出现如“洗衣机”、“核弹”、“火车”等现代科技物品的描述和比喻。
请直接输出修改后的完整小说正文，不要输出任何解释性的话语，也不要输出诸如“修改后正文如下”之类的前言。
`;
    
    await store.generateContentStream(prompt, '你是专业的小说家，请只输出小说正文，不要输出多余的解释。', 8000, (chunk) => {
      reviseResult.value += chunk;
      scrollToReviseBottom();
    });
    
  } catch (e: any) {
    alert('修改失败: ' + e.message);
  } finally {
    reviseGenerating.value = false;
  }
};

const applyReviseResult = async () => {
  if (!reviseResult.value) return;
  currentChapterContent.value = reviseResult.value;
  showReviseModal.value = false;
  
  // 询问是否定稿
  confirmAction('原文已替换成功，是否直接将该章节定稿？\n（选“否”可保留在审核修改状态继续手动修改，选“是”将定稿且后续无法再编辑）', async () => {
    // 点击是：定稿
    await changeChapterStatus('completed', true);
    await saveChapter();
    triggerPostReviseSummary(true);
  }, async () => {
    // 点击否：保持在 review 状态并保存当前内容
    await saveChapter();
    triggerPostReviseSummary(false);
  });
};

const triggerPostReviseSummary = async (isCompleted: boolean) => {
  // 一键修改完成后自动重新进行本章梳理
  if (currentChapterContent.value) {
    summaryGenerating.value = true;
    showMessage('正文已修改，正在自动重新梳理剧情...', 'info');
    currentChapterSummary.value = '正在根据修改后的内容自动梳理剧情...';
    const summaryPrompt = `请对以下章节内容进行剧情梳理，提取重要信息。
要求包含：
1. 本章核心剧情点
2. 发生的时间与地点
3. 出场人物动向
特别注意：梳理内容请务必精简，字数严格限制在 600 字以内。

小说正文：
${currentChapterContent.value}`;
    currentChapterSummary.value = '';
    userHasScrolledSummary.value = false;
    try {
      await store.generateContentStream(summaryPrompt, '你是一个专业的编辑，请提取小说的关键剧情点、时间地点和人物动向。', 1000, (chunk) => {
        currentChapterSummary.value += chunk;
        scrollToSummaryBottom();
      });
      await saveChapter();
      
      if (isCompleted) {
        cascadeTitle.value = '正在更新设定...';
        cascadeProgress.value = '一键修改完成！正文已重写，正在更新人物卡片和伏笔暗线...';
        cascadeGenerating.value = true;
        await updateCharactersFromChapter();
        await updateCluesFromChapter();
        cascadeGenerating.value = false;
        showMessage('设定更新完成！', 'success');
      } else {
        showMessage('剧情梳理完成！请继续手动修改。', 'success');
      }
    } catch (err: any) {
      showMessage('自动剧情梳理失败: ' + err.message, 'error');
    } finally {
      summaryGenerating.value = false;
      cascadeGenerating.value = false;
    }
  } else {
    if (isCompleted) {
      cascadeTitle.value = '正在更新设定...';
      cascadeProgress.value = '正文已更新，正在更新人物卡片和伏笔暗线...';
      cascadeGenerating.value = true;
      await updateCharactersFromChapter();
      await updateCluesFromChapter();
      cascadeGenerating.value = false;
      showMessage('设定更新完成！', 'success');
    } else {
      showMessage('一键修改完成！正文已重写，请继续手动修改。', 'success');
    }
  }
};

const summaryGenerating = ref(false);

const summarizeChapter = async () => {
  if (!activeChapterId.value || !currentChapterContent.value) return;
  summaryGenerating.value = true;
  showMessage('正在为您梳理本章剧情，请稍候...', 'info');
  try {
    const prompt = `请对以下章节内容进行剧情梳理，提取重要信息。
要求包含：
1. 本章核心剧情点
2. 发生的时间与地点
3. 出场人物动向
特别注意：梳理内容请务必精简，字数严格限制在 600 字以内。

小说正文：
${currentChapterContent.value}`;
    currentChapterSummary.value = '';
    userHasScrolledSummary.value = false;
    await store.generateContentStream(prompt, '你是一个专业的编辑，请提取小说的关键剧情点、时间地点和人物动向。', 1000, (chunk) => {
      currentChapterSummary.value += chunk;
      scrollToSummaryBottom();
    });
    await saveChapter();
    showMessage('剧情梳理完成！', 'success');
  } catch (e: any) {
    showMessage('梳理失败: ' + e.message, 'error');
  } finally {
    summaryGenerating.value = false;
  }
};

const stats = computed(() => {
  const totalWords = chapters.value.reduce((acc, c) => acc + (c.content?.length || 0), 0);
  const totalChars = characters.value.length;
  const activeChars = characters.value.filter(c => ['出场', '已出场'].includes(c.status)).length;
  const deadChars = characters.value.filter(c => c.status === '死亡').length;
  const unappearedChars = characters.value.filter(c => !['出场', '已出场', '死亡'].includes(c.status)).length;
  const totalClues = clues.value.length;
  const resolvedCluesCount = clues.value.filter(c => c.status === 'resolved').length;
  return { totalWords, totalChars, activeChars, deadChars, unappearedChars, totalChapters: chapters.value.length, totalClues, resolvedCluesCount };
});

const getTimelineFillHeight = () => {
  if (!parsedOutlineTree.value.length || !chapters.value.length) return '0%';
  // 始终根据所有已存在的章节计算进度，而不是当前选中的章节
  const latestChapterNum = chapters.value.length;
  
  let currentIndex = -1;
  for (let i = 0; i < parsedOutlineTree.value.length; i++) {
    if (latestChapterNum >= parsedOutlineTree.value[i].startChapter && latestChapterNum <= parsedOutlineTree.value[i].endChapter) {
      currentIndex = i;
      break;
    } else if (latestChapterNum > parsedOutlineTree.value[i].endChapter) {
      currentIndex = i + 1; // It has passed this node, so at least fill up to here
    }
  }

  if (currentIndex === -1) return '0%';
  if (currentIndex >= parsedOutlineTree.value.length) return '100%';
  
  // Calculate percentage roughly based on nodes
  const percentage = (currentIndex / (parsedOutlineTree.value.length - 1)) * 100;
  return `calc(${Math.min(100, Math.max(0, percentage))}% + 14px)`; // +14px to align with center of marker
};

const worldviewMode = ref<'edit' | 'read'>('read');
const outlineMode = ref<'edit' | 'read'>('read');

const tabs = [
  { id: 'stats', name: '统计看板', icon: BarChart2 },
  { id: 'outline', name: '大纲内容', icon: BookOpen },
  { id: 'outline-tree', name: '剧情大纲树', icon: GitMerge },
  { id: 'worldview', name: '世界观', icon: Globe },
  { id: 'realms', name: '境界体系', icon: Layers },
  { id: 'characters', name: '人物卡片', icon: Users },
  { id: 'references', name: '资料室', icon: Library },
  { id: 'clues', name: '伏笔暗线', icon: Link },
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
        <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
          :class="['nav-tab', activeTab === tab.id ? 'active' : '']">
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
        <div style="display: flex; flex-direction: column; gap: var(--spacing-lg); height: 100%;">
          <!-- Top: AI Generator -->
          <div class="ai-widget card">
            <div class="widget-header" style="border-bottom: 1px solid var(--color-border); padding-bottom: var(--spacing-sm); margin-bottom: var(--spacing-md);">
              <h2 class="widget-title"><Wand2 class="icon-sm color-cta" /> AI一句话生成大纲</h2>
            </div>
            <div class="widget-body" style="display: flex; flex-direction: column;">
              <textarea v-model="newOutlineIdea" class="form-control" style="min-height: 80px; margin-bottom: var(--spacing-md); resize: vertical;" placeholder="例如：一个废柴少年意外获得上古神器..." :disabled="generating"></textarea>
              <div style="display: flex; justify-content: flex-end;">
                <button v-if="!generating" @click="generateOutline" class="btn-primary" style="width: auto; padding: 8px 24px;">
                  <Wand2 class="icon-sm" /> 生成大纲
                </button>
                <button v-else @click="store.abortCurrentGeneration()" class="btn-danger" style="width: auto; padding: 8px 24px;">
                  <StopCircle class="icon-sm" /> 停止生成
                </button>
              </div>
            </div>
          </div>
          
          <div v-if="cascadeGenerating" class="card" style="padding: var(--spacing-md); background: rgba(37, 99, 235, 0.05); border: 1px solid var(--color-cta);">
            <div style="display: flex; align-items: center; gap: var(--spacing-sm); color: var(--color-cta); font-weight: bold; margin-bottom: var(--spacing-sm);">
              <div class="loader" style="width: 16px; height: 16px; border: 2px solid rgba(37, 99, 235, 0.2); border-top-color: var(--color-cta); border-radius: 50%; animation: spin 1s linear infinite;"></div>
              衍生设定生成中...
            </div>
            <p style="font-size: 0.875rem; color: var(--color-text-muted);">{{ cascadeProgress }}</p>
          </div>

          <!-- Bottom: Outline Content -->
          <div class="editor-widget card flex-1">
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
            
            <div v-if="outlineMode === 'read'" class="markdown-body" style="height: calc(100% - 60px); overflow-y: auto;">
              <MdPreview :modelValue="book?.outline || '暂无大纲内容'" />
            </div>
            
            <div v-else style="height: calc(100% - 60px);">
              <MdEditor 
                v-model="book.outline" 
                @onSave="saveOutline" 
                style="height: 100%;"
                placeholder="在此处编写或生成大纲..." 
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Outline Tree Tab -->
      <div v-if="activeTab === 'outline-tree'" class="tab-pane scrollable" ref="outlineTreeContainer" @scroll="handleOutlineTreeScroll">
        <div class="pane-header">
          <h2 class="pane-title">剧情大纲树</h2>
          <div style="display: flex; gap: var(--spacing-sm);">
            <button @click="addOutlineNode" class="btn-secondary btn-sm" title="在结尾手动增加一个节点">
              <Plus class="icon-sm" /> 扩充节点
            </button>
            <button @click="openTreeConfigModal" :disabled="generating" class="btn-secondary btn-sm" title="将大纲文字拆解为树状节点">
              <Layers class="icon-sm" /> 重新提取大纲树
            </button>
          </div>
        </div>
        
        <div style="max-width: 800px; margin: 0 auto; padding: var(--spacing-lg) 0;">
          <div v-if="generating" class="card" style="padding: var(--spacing-md); margin-bottom: var(--spacing-md); background: rgba(37, 99, 235, 0.06); border: 1px solid var(--color-cta);">
            <div style="display: flex; align-items: center; gap: var(--spacing-sm); color: var(--color-cta); font-weight: bold;">
              <div class="loader" style="width: 16px; height: 16px; border: 2px solid rgba(37, 99, 235, 0.2); border-top-color: var(--color-cta); border-radius: 50%; animation: spin 1s linear infinite;"></div>
              正在生成剧情大纲树，请稍候...
            </div>
          </div>
          <div v-if="parsedOutlineTree.length === 0" class="empty-state">
            <p>暂无大纲树，点击上方按钮根据大纲自动拆解生成。</p>
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
                    <button @click="() => { plotWeaverTarget = node.id; plotOptions = []; showPlotModal = true; }" class="btn-secondary btn-sm" style="padding: 2px 8px; font-size: 0.75rem;">
                      <Compass class="icon-sm color-cta" /> 编织情节
                    </button>
                    <button @click="deleteOutlineNode(node.id)" class="btn-icon" style="padding: 2px; color: var(--color-danger);" title="删除此节点">
                      <Trash2 class="icon-sm" />
                    </button>
                  </div>
                </div>
                <p class="item-desc">{{ node.description }}</p>
                <div v-if="node.wovenPlot" style="margin-top: var(--spacing-sm); padding: var(--spacing-sm); background: rgba(37, 99, 235, 0.05); border-radius: 4px; font-size: 0.875rem;">
                  <strong style="color: var(--color-cta);">[已编织的主线情节]</strong>
                  <p style="margin-top: 4px; color: var(--color-text-muted); white-space: pre-wrap;">{{ node.wovenPlot }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Worldview Tab -->
      <div v-if="activeTab === 'worldview'" class="tab-pane">
        <div style="display: flex; flex-direction: column; gap: var(--spacing-lg); height: 100%;">
          <div class="ai-widget card">
            <div class="widget-header" style="border-bottom: 1px solid var(--color-border); padding-bottom: var(--spacing-sm); margin-bottom: var(--spacing-md);">
              <h2 class="widget-title"><Wand2 class="icon-sm color-cta" /> AI生成设定</h2>
            </div>
            <div class="widget-body" style="display: flex; flex-direction: column;">
              <textarea v-model="newWorldviewIdea" class="form-control" style="min-height: 80px; margin-bottom: var(--spacing-md); resize: vertical;" placeholder="例如：分为凡界、灵界、仙界..." :disabled="generating"></textarea>
              <div style="display: flex; justify-content: flex-end;">
                <button v-if="!generating" @click="generateWorldview" class="btn-primary" style="width: auto; padding: 8px 24px;">
                  <Wand2 class="icon-sm" /> 生成设定
                </button>
                <button v-else @click="store.abortCurrentGeneration()" class="btn-danger" style="width: auto; padding: 8px 24px;">
                  <StopCircle class="icon-sm" /> 停止生成
                </button>
              </div>
            </div>
          </div>
          
          <div class="editor-widget card flex-1">
            <div class="widget-header">
              <h2 class="widget-title">世界观与故事概要</h2>
              <div style="display: flex; align-items: center; gap: var(--spacing-sm);">
                <button @click="worldviewMode = worldviewMode === 'read' ? 'edit' : 'read'" class="btn-secondary btn-sm">
                  {{ worldviewMode === 'read' ? '📝 切换到编辑模式' : '📖 切换到阅读模式(Markdown)' }}
                </button>
                <span class="status-text" v-if="worldviewMode === 'edit'">自动保存</span>
              </div>
            </div>
            
            <div v-if="worldviewMode === 'read'" class="markdown-body" style="height: calc(100% - 60px); overflow-y: auto;">
              <MdPreview :modelValue="book?.worldview || '暂无世界观内容'" />
            </div>
            
            <div v-else style="height: calc(100% - 60px);">
              <MdEditor 
                v-model="book.worldview" 
                @onSave="saveWorldview" 
                style="height: 100%;"
                placeholder="在此处编写或生成世界观..." 
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Realms Tab -->
      <div v-if="activeTab === 'realms'" class="tab-pane scrollable">
        <div class="pane-header">
          <h2 class="pane-title">境界体系 (修炼等级)</h2>
          <el-button type="primary" @click="openRealmModal">
            <Plus class="icon-sm" style="margin-right: 4px;" /> 添加境界
          </el-button>
        </div>
        
        <div v-if="book?.type !== '修炼'" class="alert-box warning">
          当前小说类型为“{{ book?.type }}”，境界模块通常适用于“修炼”类型小说。
        </div>

        <div class="timeline">
          <div class="timeline-line"></div>
          
          <div v-for="(realm, index) in realms" :key="realm.id" class="timeline-item">
            <div class="timeline-marker">
              {{ realm.level }}
            </div>
            <div class="timeline-content card">
              <div class="float-right" style="display: flex; gap: 8px;">
                <el-button size="small" @click="openRealmModal(realm)">编辑</el-button>
                <el-button size="small" type="danger" @click="deleteRealm(realm.id)">删除</el-button>
              </div>
              <h3 class="item-title">{{ realm.name }}</h3>
              <p class="item-desc">{{ realm.description || '暂无描述' }}</p>
            </div>
          </div>
          
          <div v-if="realms.length === 0" class="empty-state">
            <p>暂无境界数据，请点击上方按钮添加，或通过大纲自动生成。</p>
          </div>
        </div>
      </div>

      <!-- Characters Tab -->
      <div v-if="activeTab === 'characters'" class="tab-pane scrollable">
        <div class="pane-header">
          <h2 class="pane-title">人物管理</h2>
          <button @click="showCharModal = true" class="btn-primary">
            <Plus class="icon-sm" /> 添加人物
          </button>
        </div>

        <h3 style="margin-bottom: var(--spacing-md); color: var(--color-text); font-size: 1.125rem;">主角团卡片</h3>
        <div class="data-grid" style="margin-bottom: var(--spacing-2xl);">
          <div v-for="char in mainCharacters" :key="char.id" class="data-card card">
            <div class="card-header" style="margin-bottom: var(--spacing-lg);">
              <h3 class="item-title">{{ char.name }}</h3>
              <div style="display: flex; gap: 8px;">
                <el-tag size="small" type="info">{{ char.role }}</el-tag>
                <el-tag size="small" :type="['出场', '已出场'].includes(char.status) ? 'success' : 'info'">
                  {{ ['出场', '已出场'].includes(char.status) ? '出场' : '未出场' }}
                </el-tag>
              </div>
            </div>
            <div class="card-body">
              <div class="data-row">
                <span class="data-label">性格特点</span>
                <span class="data-value">{{ char.personality || '暂无' }}</span>
              </div>
              <div class="data-row" style="margin-bottom: 0;">
                <span class="data-label">能力/境界</span>
                <span class="data-value">{{ char.abilities || '暂无' }}</span>
              </div>
            </div>
            <div class="card-footer">
              <el-button size="small" @click="openCharModal(char)">编辑</el-button>
              <el-button size="small" type="danger" @click="deleteCharacter(char.id)">删除</el-button>
            </div>
          </div>
          <div v-if="mainCharacters.length === 0" class="empty-state" style="grid-column: 1 / -1;">
            <p>暂无主角团卡片，请点击上方按钮添加，或通过大纲一键衍生生成。</p>
          </div>
        </div>

        <h3 style="margin-bottom: var(--spacing-md); color: var(--color-text); font-size: 1.125rem;">主要配角卡片</h3>
        <div class="data-grid" style="margin-bottom: var(--spacing-2xl);">
          <div v-for="char in supportCharacters" :key="char.id" class="data-card card">
            <div class="card-header" style="margin-bottom: var(--spacing-lg);">
              <h3 class="item-title">{{ char.name }}</h3>
              <div style="display: flex; gap: 8px;">
                <el-tag size="small" type="info">{{ char.role }}</el-tag>
                <el-tag size="small" :type="['出场', '已出场'].includes(char.status) ? 'success' : 'info'">
                  {{ ['出场', '已出场'].includes(char.status) ? '出场' : '未出场' }}
                </el-tag>
              </div>
            </div>
            <div class="card-body">
              <div class="data-row">
                <span class="data-label">性格特点</span>
                <span class="data-value">{{ char.personality || '暂无' }}</span>
              </div>
              <div class="data-row" style="margin-bottom: 0;">
                <span class="data-label">能力/境界</span>
                <span class="data-value">{{ char.abilities || '暂无' }}</span>
              </div>
            </div>
            <div class="card-footer">
              <el-button size="small" @click="openCharModal(char)">编辑</el-button>
              <el-button size="small" type="danger" @click="deleteCharacter(char.id)">删除</el-button>
            </div>
          </div>
          <div v-if="supportCharacters.length === 0" class="empty-state" style="grid-column: 1 / -1;">
            <p>暂无配角卡片，您可以在此添加或通过AI自动提取。</p>
          </div>
        </div>

        <h3 style="margin-bottom: var(--spacing-md); color: var(--color-text); font-size: 1.125rem;">反派角色卡片</h3>
        <div class="data-grid" style="margin-bottom: var(--spacing-2xl);">
          <div v-for="char in villainCharacters" :key="char.id" class="data-card card">
            <div class="card-header" style="margin-bottom: var(--spacing-lg);">
              <h3 class="item-title">{{ char.name }}</h3>
              <div style="display: flex; gap: 8px;">
                <el-tag size="small" type="info">{{ char.role }}</el-tag>
                <el-tag size="small" :type="['出场', '已出场'].includes(char.status) ? 'success' : 'info'">
                  {{ ['出场', '已出场'].includes(char.status) ? '出场' : '未出场' }}
                </el-tag>
              </div>
            </div>
            <div class="card-body">
              <div class="data-row">
                <span class="data-label">性格特点</span>
                <span class="data-value">{{ char.personality || '暂无' }}</span>
              </div>
              <div class="data-row" style="margin-bottom: 0;">
                <span class="data-label">能力/境界</span>
                <span class="data-value">{{ char.abilities || '暂无' }}</span>
              </div>
            </div>
            <div class="card-footer">
              <el-button size="small" @click="openCharModal(char)">编辑</el-button>
              <el-button size="small" type="danger" @click="deleteCharacter(char.id)">删除</el-button>
            </div>
          </div>
          <div v-if="villainCharacters.length === 0" class="empty-state" style="grid-column: 1 / -1;">
            <p>暂无反派卡片，您可以在此添加或通过AI自动提取。</p>
          </div>
        </div>

        <h3 style="margin-bottom: var(--spacing-md); color: var(--color-text); font-size: 1.125rem;">路人卡片</h3>
        <div class="data-grid">
          <div v-for="char in extraCharacters" :key="char.id" class="data-card card">
            <div class="card-header" style="margin-bottom: var(--spacing-lg);">
              <h3 class="item-title">{{ char.name }}</h3>
              <div style="display: flex; gap: 8px;">
                <el-tag size="small" type="info">{{ char.role }}</el-tag>
                <el-tag size="small" :type="['出场', '已出场'].includes(char.status) ? 'success' : 'info'">
                  {{ ['出场', '已出场'].includes(char.status) ? '出场' : '未出场' }}
                </el-tag>
              </div>
            </div>
            <div class="card-body">
              <div class="data-row">
                <span class="data-label">性格特点</span>
                <span class="data-value">{{ char.personality || '暂无' }}</span>
              </div>
              <div class="data-row" style="margin-bottom: 0;">
                <span class="data-label">能力/境界</span>
                <span class="data-value">{{ char.abilities || '暂无' }}</span>
              </div>
            </div>
            <div class="card-footer">
              <el-button size="small" @click="openCharModal(char)">编辑</el-button>
              <el-button size="small" type="danger" @click="deleteCharacter(char.id)">删除</el-button>
            </div>
          </div>
          <div v-if="extraCharacters.length === 0" class="empty-state" style="grid-column: 1 / -1;">
            <p>暂无路人卡片，当章节定稿时，系统会自动从正文提取加入。</p>
          </div>
        </div>
      </div>

      <!-- References Tab -->
      <div v-if="activeTab === 'references'" class="tab-pane scrollable">
        <div class="pane-header">
          <h2 class="pane-title">资料室</h2>
          <el-button type="primary" @click="openRefModal()">
            <Plus class="icon-sm" style="margin-right: 4px;" /> 添加资料
          </el-button>
        </div>

        <div class="data-grid">
          <div v-for="ref in references" :key="ref.id" class="data-card card">
            <div class="card-header">
              <h3 class="item-title">{{ ref.sourceName }}</h3>
            </div>
            <div class="card-body">
              <p style="color: var(--color-text-muted); font-size: 0.875rem; line-height: 1.5; white-space: pre-wrap; margin-bottom: 0;">{{ ref.content }}</p>
            </div>
            <div class="card-footer">
              <el-button size="small" @click="openRefModal(ref)">编辑</el-button>
              <el-button size="small" type="danger" @click="deleteReference(ref.id)">删除</el-button>
            </div>
          </div>
          <div v-if="references.length === 0" class="empty-state" style="grid-column: 1 / -1;">
            <p>暂无资料，您可以手动添加，或在“写作编辑”区点击【AI提取资料】自动从正文抽取古籍、设定等内容。</p>
          </div>
        </div>
      </div>

      <!-- Clues Tab -->
      <div v-if="activeTab === 'clues'" class="tab-pane scrollable">
        <div class="pane-header">
          <h2 class="pane-title">伏笔暗线</h2>
          <el-button type="primary" @click="openClueModal()">
            <Plus class="icon-sm" style="margin-right: 4px;" /> 添加伏笔/暗线
          </el-button>
        </div>

        <h3 style="margin-bottom: var(--spacing-md); color: var(--color-text); font-size: 1.125rem;">未回收的伏笔</h3>
        <div class="data-grid" style="margin-bottom: var(--spacing-2xl);">
          <div v-for="clue in activeClues" :key="clue.id" class="data-card card">
            <div class="card-header">
              <h3 class="item-title" style="display: flex; align-items: flex-start; gap: 8px;">
                <el-tag size="small" type="warning" style="margin-top: 2px;">未回收</el-tag>
                <span style="flex: 1; word-break: break-all;">{{ clue.title }}</span>
              </h3>
            </div>
            <div class="card-body">
              <p style="color: var(--color-text-muted); font-size: 0.875rem; line-height: 1.5; white-space: pre-wrap;">{{ clue.content }}</p>
            </div>
            <div class="card-footer">
              <el-button size="small" @click="toggleClueStatus(clue)">标记回收</el-button>
              <el-button size="small" @click="openClueModal(clue)">编辑</el-button>
              <el-button size="small" type="danger" @click="deleteClue(clue.id)">删除</el-button>
            </div>
          </div>
          <div v-if="activeClues.length === 0" class="empty-state" style="grid-column: 1 / -1;">
            <p>暂无未回收的伏笔。</p>
          </div>
        </div>

        <h3 style="margin-bottom: var(--spacing-md); color: var(--color-text); font-size: 1.125rem;">已回收的伏笔</h3>
        <div class="data-grid">
          <div v-for="clue in resolvedClues" :key="clue.id" class="data-card card" style="opacity: 0.7;">
            <div class="card-header">
              <h3 class="item-title" style="display: flex; align-items: flex-start; gap: 8px;">
                <el-tag size="small" type="success" style="margin-top: 2px;">已回收</el-tag>
                <span style="flex: 1; word-break: break-all;">{{ clue.title }}</span>
              </h3>
            </div>
            <div class="card-body">
              <p style="color: var(--color-text-muted); font-size: 0.875rem; line-height: 1.5; white-space: pre-wrap;">{{ clue.content }}</p>
            </div>
            <div class="card-footer">
              <el-button size="small" @click="toggleClueStatus(clue)">标记未回收</el-button>
              <el-button size="small" @click="openClueModal(clue)">编辑</el-button>
              <el-button size="small" type="danger" @click="deleteClue(clue.id)">删除</el-button>
            </div>
          </div>
          <div v-if="resolvedClues.length === 0" class="empty-state" style="grid-column: 1 / -1;">
            <p>暂无已回收的伏笔，在“写作编辑”区进行章节定稿时，AI可自动回收相关伏笔。</p>
          </div>
        </div>
      </div>

      <!-- Editor Tab -->
      <div v-if="activeTab === 'editor'" class="editor-layout">
        <!-- Sidebar: Chapters -->
        <aside class="sidebar">
          <div class="sidebar-header">
            <h3 class="sidebar-title">章节目录</h3>
            <button @click="createNewChapter" class="btn-icon" title="新增章节（需前一章定稿）"><Plus class="icon-sm"/></button>
          </div>
            <div class="sidebar-list">
              <div v-for="ch in chapters" :key="ch.id" @click="selectChapter(ch.id)"
                   :class="['list-item', activeChapterId === ch.id ? 'active' : '']">
                <div class="chapter-item-header">
                  <span class="chapter-title">{{ ch.title }}</span>
                  <div style="display: flex; align-items: center; gap: 4px;">
                    <span :class="['status-dot', ch.status]"></span>
                    <button @click="(e) => deleteChapter(ch.id, e)" class="btn-icon" style="padding: 2px; color: var(--color-text-muted);" title="删除章节">
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
                  <el-select v-model="writingStyle" size="small" style="width: 130px;" title="风格模仿大师">
                    <el-option v-for="style in writingStyleOptions" :key="style" :label="style" :value="style" />
                  </el-select>
                  <el-button v-if="!generating" @click="generateNextContent" :disabled="currentChapter?.status === 'completed'" size="small">
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
                  <el-button @click="() => { plotOptions = []; showPlotModal = true; }" :disabled="generating || currentChapter?.status === 'completed'" size="small" title="生成曲折故事主线">
                    <Compass class="icon-sm color-cta" style="margin-right: 4px;" /> 情节编织器
                  </el-button>
                  <el-button @click="() => agentReviewChapter(false)" :disabled="generating || currentChapter?.status === 'completed'" type="primary" size="small">
                    <Edit3 class="icon-sm" style="margin-right: 4px;" /> Agent主编审核
                  </el-button>
                  <el-button @click="reviseChapter" :disabled="generating || !currentChapterFeedback || currentChapter?.status === 'completed'" size="small" title="根据主编审核意见一键修改当前章节">
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
                <textarea ref="mainEditorRef" v-model="currentChapterContent" @input="saveChapter" @scroll="handleMainEditorScroll" class="main-editor" placeholder="开始写作..."></textarea>
                <div v-if="currentChapter?.status === 'reviewing' && generating" class="scan-line"></div>
              </div>
              
              <aside class="summary-panel">
                <div class="panel-header">AI 智能辅助面板</div>
                
                <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                  <!-- Agent Review Result -->
                  <div v-if="currentChapter?.status === 'reviewing' || currentChapterFeedback" class="feedback-section" style="flex: 1; display: flex; flex-direction: column; padding: var(--spacing-md); border-bottom: 1px solid var(--color-border);">
                    <h4 style="font-size: 0.75rem; color: var(--color-cta); margin-bottom: var(--spacing-xs); text-transform: uppercase; font-weight: bold;">主编审核意见</h4>
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
      <div v-if="activeTab === 'stats'" class="tab-pane scrollable">
        <div style="max-width: 1200px; margin: 0 auto; width: 100%;">
          <div class="pane-header" style="margin-bottom: var(--spacing-lg);">
            <h2 class="pane-title" style="display: flex; align-items: center; gap: 8px;">
              <BarChart2 class="color-cta" /> 数据统计看板
            </h2>
            <p style="color: var(--color-text-muted); font-size: 0.875rem; margin-top: 4px;">项目当前数据概览与写作进度统计</p>
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
                <span style="color: var(--color-text-muted); font-size: 0.875rem;">主线核心主角</span>
                <span style="font-weight: 500; color: var(--color-text);">{{ mainCharacters.length }} 人</span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </main>

    <!-- Character Modal -->
    <div v-if="showCharModal" class="modal-overlay">
      <div class="modal-content">
        <h2 class="modal-title">添加人物</h2>
        <div class="form-layout">
          <div class="form-group">
            <label>姓名</label>
            <input v-model="newChar.name" type="text" class="form-control" />
          </div>
          <div class="form-row">
            <div class="form-group flex-1">
              <label>角色</label>
              <el-select v-model="newChar.role">
                <el-option label="主角团" value="主角团" />
                <el-option label="配角" value="配角" />
                <el-option label="反派" value="反派" />
                <el-option label="路人" value="路人" />
              </el-select>
            </div>
            <div class="form-group flex-1">
              <label>状态</label>
              <el-select v-model="newChar.status">
                <el-option label="出场" value="出场" />
                <el-option label="未出场" value="未出场" />
                <el-option label="死亡" value="死亡" />
              </el-select>
            </div>
          </div>
          <div class="form-group">
            <label>性格特点</label>
            <input v-model="newChar.personality" type="text" class="form-control" />
          </div>
          <div class="form-group">
            <label>能力/境界</label>
            <input v-model="newChar.abilities" type="text" class="form-control" placeholder="例如：精通火球术、筑基期" />
          </div>
        </div>
        <div class="modal-actions">
          <el-button @click="showCharModal = false">取消</el-button>
          <el-button type="primary" @click="createCharacter">保存</el-button>
        </div>
      </div>
    </div>

    <!-- Realm Modal -->
    <div v-if="showRealmModal" class="modal-overlay">
      <div class="modal-content">
        <h2 class="modal-title">添加境界</h2>
        <div class="form-layout">
          <div class="form-row">
            <div class="form-group flex-1">
              <label>层级/阶段</label>
              <input v-model="newRealm.level" type="number" min="1" class="form-control" />
            </div>
            <div class="form-group flex-2">
              <label>境界名称</label>
              <input v-model="newRealm.name" type="text" class="form-control" placeholder="例如：炼气期" />
            </div>
          </div>
          <div class="form-group">
            <label>境界描述/特点</label>
            <textarea v-model="newRealm.description" class="form-control h-24" placeholder="吸纳天地灵气入体，改善体质..."></textarea>
          </div>
        </div>
        <div class="modal-actions">
          <el-button @click="showRealmModal = false">取消</el-button>
          <el-button type="primary" @click="createRealm">保存</el-button>
        </div>
      </div>
    </div>
    <!-- Tree Config Modal -->
    <div v-if="showTreeConfigModal" class="modal-overlay">
      <div class="modal-content" style="max-width: 400px;">
        <h2 class="modal-title">提取剧情大纲树</h2>
        <p style="color: var(--color-text-muted); font-size: 0.875rem; margin-bottom: var(--spacing-md);">
          请根据大纲的丰富程度，合理预估小说的总篇幅。AI 将按照每 5 章一个节点为您细化。
        </p>
        <div class="form-group">
          <label>预计总章节数</label>
          <el-input-number v-model="treeTargetChapterCount" :min="10" :step="10" style="width: 100%;" />
        </div>
        <div class="modal-actions">
          <el-button @click="showTreeConfigModal = false">取消</el-button>
          <el-button type="primary" @click="generateOutlineTree">开始拆解</el-button>
        </div>
      </div>
    </div>

    <!-- Edit Node Modal -->
    <div v-if="showEditNodeModal && editingNode" class="modal-overlay">
      <div class="modal-content">
        <h2 class="modal-title">编辑大纲节点</h2>
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
        <h2 class="modal-title">AI情节编织器</h2>
        <p style="color: var(--color-text-muted); font-size: 0.875rem; margin-bottom: var(--spacing-md);">
          让AI根据已有剧情，为您提供接下来不同走向的情节选项，打破写作瓶颈。
        </p>
        
        <div v-if="plotOptions.length > 0" style="display: flex; flex-direction: column; gap: var(--spacing-sm); margin-bottom: var(--spacing-md); max-height: 400px; overflow-y: auto;">
          <div v-for="(opt, idx) in plotOptions" :key="idx" class="card" style="padding: var(--spacing-md); cursor: pointer; border: 1px solid var(--color-border); transition: all 0.2s;" @click="applyPlotOption(opt)" onmouseover="this.style.borderColor='var(--color-cta)';" onmouseout="this.style.borderColor='var(--color-border)';">
            <p style="font-size: 0.875rem; line-height: 1.5; white-space: pre-wrap;">{{ opt }}</p>
            <div style="text-align: right; margin-top: var(--spacing-sm);">
              <span style="font-size: 0.75rem; color: var(--color-cta); font-weight: bold;">点击采用此情节走向</span>
            </div>
          </div>
        </div>
        <div v-else-if="plotGenerating" style="padding: var(--spacing-xl) 0; text-align: center; color: var(--color-text-muted);">
          <div class="loader" style="margin: 0 auto var(--spacing-md); width: 24px; height: 24px; border: 3px solid var(--color-border); border-top-color: var(--color-cta); border-radius: 50%; animation: spin 1s linear infinite;"></div>
          正在为您编织曲折剧情走向...
        </div>

        <div class="modal-actions" style="margin-top: var(--spacing-lg);">
          <el-button @click="showPlotModal = false">取消</el-button>
          <el-button type="primary" @click="generatePlotOptions" :disabled="plotGenerating">
            <Compass class="icon-sm" style="margin-right: 4px;" /> 生成剧情走向
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

    <!-- Revise Modal -->
    <div v-if="showReviseModal" class="modal-overlay">
      <div class="modal-content" style="max-width: 1000px; width: 90%; max-height: 90vh; display: flex; flex-direction: column;">
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md);">
          <h2 class="modal-title" style="margin: 0;">一键修改（结果对比）</h2>
        </div>
        
        <div style="flex: 1; display: flex; gap: var(--spacing-md); min-height: 400px; overflow: hidden;">
          <div style="flex: 1; display: flex; flex-direction: column;">
            <label style="font-size: 0.875rem; color: var(--color-text-muted); margin-bottom: var(--spacing-xs);">原章节正文</label>
            <textarea v-model="currentChapterContent" class="form-control" style="flex: 1; resize: none; background: rgba(0,0,0,0.02);" readonly></textarea>
          </div>
          <div style="flex: 1; display: flex; flex-direction: column;">
            <label style="font-size: 0.875rem; color: var(--color-cta); font-weight: bold; margin-bottom: var(--spacing-xs);">修改后正文</label>
            <div style="flex: 1; position: relative;">
              <textarea ref="reviseEditorRef" v-model="reviseResult" @scroll="handleReviseEditorScroll" class="form-control" style="width: 100%; height: 100%; resize: none; border-color: var(--color-cta);"></textarea>
              <div v-if="reviseGenerating && !reviseResult" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.8); display: flex; align-items: center; justify-content: center; flex-direction: column; color: var(--color-cta);">
                <div class="loader" style="width: 32px; height: 32px; border: 3px solid rgba(37, 99, 235, 0.2); border-top-color: var(--color-cta); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 8px;"></div>
                AI 正在全力重写中...
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions" style="margin-top: var(--spacing-lg);">
          <el-button @click="() => { showReviseModal = false; store.abortCurrentGeneration(); }">取消修改</el-button>
          <el-button v-if="reviseGenerating" @click="store.abortCurrentGeneration()" type="danger">
            <StopCircle class="icon-sm" style="margin-right: 4px;" /> 停止生成
          </el-button>
          <el-button type="primary" @click="applyReviseResult" :disabled="reviseGenerating || !reviseResult">
            <Save class="icon-sm" style="margin-right: 4px;" /> 确认替换原正文
          </el-button>
        </div>
      </div>
    </div>

    <div v-if="showRefModal" class="modal-overlay">
      <div class="modal-content">
        <h2 class="modal-title">{{ editingRefId ? '编辑资料' : '添加资料' }}</h2>
        <div class="form-layout">
          <div class="form-group">
            <label>资料来源/名称</label>
            <input v-model="newRef.sourceName" type="text" class="form-control" placeholder="例如：《山海经》、九阴真经" />
          </div>
          <div class="form-group">
            <label>内容/摘录</label>
            <textarea v-model="newRef.content" class="form-control h-24" placeholder="在此输入引用的内容或设定的详细说明..."></textarea>
          </div>
        </div>
        <div class="modal-actions">
          <el-button @click="showRefModal = false">取消</el-button>
          <el-button type="primary" @click="createReference">保存</el-button>
        </div>
      </div>
    </div>
    <div v-if="showClueModal" class="modal-overlay">
      <div class="modal-content">
        <h2 class="modal-title">{{ editingClueId ? '编辑伏笔暗线' : '添加伏笔暗线' }}</h2>
        <div class="form-layout">
          <div class="form-group">
            <label>名称 / 摘要</label>
            <input v-model="newClue.title" type="text" class="form-control" placeholder="例如：神秘的老爷爷、祖传戒指" />
          </div>
          <div class="form-group">
            <label>详细描述</label>
            <textarea v-model="newClue.content" class="form-control h-24" placeholder="在此输入伏笔的具体设定或暗线细节..."></textarea>
          </div>
          <div class="form-group">
            <label>状态</label>
            <el-select v-model="newClue.status">
              <el-option label="未回收" value="active" />
              <el-option label="已回收" value="resolved" />
            </el-select>
          </div>
        </div>
        <div class="modal-actions">
          <el-button @click="showClueModal = false">取消</el-button>
          <el-button type="primary" @click="createClue">保存</el-button>
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

<style scoped>
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
  max-width: 1200px;
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
  left: 23px;
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
