import { ref, computed, nextTick } from 'vue';
import { useMainStore } from '../store/main';
import type { OutlineNode } from '../types';

export function useOutline(bookId: import('vue').Ref<string>, generating: import('vue').Ref<boolean>, showMessage: Function, confirmAction: Function, runCascadeGeneration: Function, writingStyle: import('vue').Ref<string>) {
  const store = useMainStore();
  const book = computed(() => store.currentBook);
  
  const parsedOutlineTree = computed<OutlineNode[]>(() => {
    if (!book.value?.outlineTree) return [];
    try {
      return JSON.parse(book.value.outlineTree);
    } catch (e) {
      return [];
    }
  });

  const newOutlineIdea = ref('');
  const outlineChatHistory = ref<{role: 'user' | 'assistant', content: string}[]>([]);
  const outlineChatContainer = ref<HTMLElement | null>(null);
  
  const scrollToChatBottom = () => {
    nextTick(() => {
      if (outlineChatContainer.value) {
        outlineChatContainer.value.scrollTop = outlineChatContainer.value.scrollHeight;
      }
    });
  };

  const outlineTreeContainer = ref<HTMLElement | null>(null);
  const userHasScrolledUp = ref(false);
  const showTreeConfigModal = ref(false);
  const treeTargetChapterCount = ref(100);
  const treeNodeChapterCount = ref(10);
  const treeRequirement = ref('');
  const showEditNodeModal = ref(false);
  const editingNode = ref<OutlineNode | null>(null);

  const generateOutline = async () => {
    if (!newOutlineIdea.value || !book.value) return;
    generating.value = true;
    const userMessage = newOutlineIdea.value;
    outlineChatHistory.value.push({ role: 'user', content: userMessage });    
    newOutlineIdea.value = '';
    scrollToChatBottom();

    try {
      const currentOutlineContext = book.value.outline ? `\n【当前已有大纲内容（请在此基础上修改）】\n${book.value.outline}` : '';
      
      const prompt = `为一部${book.value.type}类型的小说生成一份完整、详细的剧情大纲。

用户核心创意与最新要求：
${userMessage}
${currentOutlineContext}

【生成要求】
1. 请输出结构精简、包含起承转合的大纲，字数不要过长，确保能在一次生成中写完。
2. 包含：故事背景设定、核心力量体系、主要人物小传。
3. 包含：完整的主线剧情走向（起因、发展、高潮、结局）。
4. 语言尽量精炼，千万不要长篇大论，务必一次性完整输出到大结局，绝不断尾。
5. 请直接输出大纲正文，不要输出诸如“好的，这是为您修改的大纲”等任何多余的寒暄和解释性话语。`;
      
      let fullText = '';
      let isFirstChunk = true;
      
      outlineChatHistory.value.push({ role: 'assistant', content: '正在为您思考并生成大纲内容，请稍候...' });
      scrollToChatBottom();

      const messagesForLLM = outlineChatHistory.value.slice(0, -2).map(m => ({ role: m.role, content: m.content }));
      
      await store.generateContentStream(prompt, '你是一个专业的小说大纲设计师，请输出结构清晰、包含起承转合的详细大纲，绝不断尾。', 8192, (chunk) => {
        if (isFirstChunk) {
          if (book.value) book.value.outline = '';
          isFirstChunk = false;
        }
        fullText += chunk;
        if (book.value) book.value.outline = fullText;
      }, messagesForLLM);
      
      await store.updateBook(bookId.value, { outline: fullText });
      outlineChatHistory.value[outlineChatHistory.value.length - 1].content = '已根据您的要求完成大纲的生成与优化。';
      scrollToChatBottom();
      
      const hasExistingData = (book.value?.worldview && book.value.worldview.trim().length > 0) || (store.realms || []).length > 0 || (store.characters || []).length > 0;
      let msg = '大纲生成完成！是否根据当前大纲自动生成衍生设定？';
      if (hasExistingData) {
        msg = '大纲生成完成！检测到已有世界观/人物/境界数据。\n是否要根据新大纲覆盖并重新生成衍生设定？\n\n【确认】覆盖并重新生成旧数据\n【取消】稍后手动生成';
      }
      
      const onConfirmAction = async () => {
        const outlineMode = { value: 'read' }; // To make it compatible with the logic flow if needed, though useOutline does not control outlineMode
        await runCascadeGeneration(hasExistingData);
      };

      const onCancelAction = () => {
        // Nothing special to do here, but allows catching cancel
      };
      
      confirmAction(msg, onConfirmAction, onCancelAction);
    } catch (e: any) {
      if (e.message && e.message.includes('User aborted')) {
        outlineChatHistory.value[outlineChatHistory.value.length - 1].content = '已停止生成大纲。您可以继续补充要求。';
        showMessage('已停止生成大纲', 'info');
      } else {
        outlineChatHistory.value[outlineChatHistory.value.length - 1].content = '生成失败: ' + e.message;
        alert('生成失败: ' + e.message);
      }
    } finally {
      generating.value = false;
      scrollToChatBottom();
    }
  };

  const openTreeConfigModal = () => {
    if (!book.value?.outline) {
      alert('请先生成大纲内容');
      return;
    }
    treeRequirement.value = '';
    if (parsedOutlineTree.value.length > 0) {
      confirmAction('已有大纲树存在，重新生成将覆盖当前的大纲树。是否继续？', () => {
        showTreeConfigModal.value = true;
      });
    } else {
      showTreeConfigModal.value = true;
    }
  };

  const handleOutlineTreeScroll = () => {
    if (!outlineTreeContainer.value) return;
    const { scrollTop, scrollHeight, clientHeight } = outlineTreeContainer.value;
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
    userHasScrolledUp.value = false;
    generating.value = true;
    try {
      const stylePrompt = writingStyle.value !== '默认风格' ? `\n【文风要求】\n请严格模仿“${writingStyle.value}”的风格进行拆解。` : '';
      const reqPrompt = treeRequirement.value.trim() ? `\n【用户特殊要求】\n${treeRequirement.value.trim()}\n` : '';
      
      const prompt = `请根据以下大纲和世界观设定，将其拆解为一个细化的剧情节点树。
核心要求：
1. 目标总章节数大约为 ${treeTargetChapterCount.value} 章。
2. 必须严格按照每 ${treeNodeChapterCount.value} 章为一个节点进行拆解和细化（例如：1-${treeNodeChapterCount.value}章、${treeNodeChapterCount.value + 1}-${treeNodeChapterCount.value * 2}章，以此类推，直到大约 ${treeTargetChapterCount.value} 章结束）。
3. 每个阶段必须有具体的剧情发展任务和冲突。
4. 你的语言和描述必须严格遵守小说的大纲和世界观背景。绝不能出现与背景不符的现代物品、比喻或词汇（例如修仙/古风下不能有“洗衣机”、“网络”等）。
5. 请务必一直拆解到 ${treeTargetChapterCount.value} 章的大结局阶段为止，绝对不要中途停止或断尾！
6. 请严格使用以下格式输出，不要输出JSON，不要有前言后语，每行一个阶段，用三个竖线分隔：
起始章序号|||结束章序号|||阶段标题|||阶段剧情描述
例如：
1|||${treeNodeChapterCount.value}|||初入宗门|||主角拜入玄天宗，在外门受到打压...
${treeNodeChapterCount.value + 1}|||${treeNodeChapterCount.value * 2}|||宗门大比|||主角在宗门大比中一鸣惊人...
${reqPrompt}
小说大纲：
${book.value?.outline}
世界观设定：
${book.value?.worldview || '无'}
${stylePrompt}`;
      let treeResult = '';
      await store.generateContentStream(prompt, '你是一位专业的小说作家，非常擅长通过大纲拆解主线并为主线的每个阶段生成详细的剧情描述。需保证开头与结尾与大纲保持一致。只输出规定格式的文本。', 8000, (chunk) => {
        treeResult += chunk;
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
                id: `node-stream-${i}`,
                startChapter: parseInt(parts[0]) || 0,
                endChapter: parseInt(parts[1]) || 0,
                title: parts[2],
                description: parts[3] || '',
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
      const timestamp = Date.now();
      for (let i = 0; i < lines.length; i++) {
        let parts = lines[i].split('|||').map(s => s.trim());
        if (parts[0].match(/^\d+\.\s*\d+/)) {
          parts[0] = parts[0].replace(/^\d+\.\s*/, '');
        }
        if (parts.length >= 4 && !parts[0].includes('起始章序号') && !isNaN(parseInt(parts[0]))) {
          nodes.push({
            id: `node-${timestamp}-${i}`,
            startChapter: parseInt(parts[0]) || 0,
            endChapter: parseInt(parts[1]) || 0,
            title: parts[2],
            description: parts[3] || '',
          });
        }
      }
      
      if (nodes.length === 0) {
        throw new Error('未能从 AI 回复中解析出有效节点，请重试');
      }
      await store.updateBook(bookId.value, { outlineTree: JSON.stringify(nodes) });
    } catch (e: any) {
      if (e.message && e.message.includes('User aborted')) {
        showMessage('已停止剧情节点拆解', 'info');
      } else {
        alert('生成剧情节点失败: ' + e.message);
      }
    } finally {
      generating.value = false;
    }
  };

  const showAddNodeModal = ref(false);
  const addNodeRequirement = ref('');
  const isAddingNode = ref(false);

  const openAddNodeModal = () => {
    addNodeRequirement.value = '';
    showAddNodeModal.value = true;
  };

  const confirmAddOutlineNode = async () => {
    if (!book.value?.outline) {
      alert('请先生成大纲内容');
      return;
    }
    showAddNodeModal.value = false;
    isAddingNode.value = true;
    try {
      const currentNodes = [...parsedOutlineTree.value];
      const lastNode = currentNodes.length > 0 ? currentNodes[currentNodes.length - 1] : null;
      const startChapter = lastNode ? lastNode.endChapter + 1 : 1;
      const endChapter = startChapter + treeNodeChapterCount.value - 1;

      const stylePrompt = writingStyle.value !== '默认风格' ? `\n【文风要求】\n请严格模仿“${writingStyle.value}”的风格进行描述。` : '';
      const reqPrompt = addNodeRequirement.value.trim() ? `\n【用户对新增节点的特殊要求】\n${addNodeRequirement.value.trim()}\n` : '';
      const lastNodeContext = lastNode ? `\n【上一个节点】\n标题：${lastNode.title}\n描述：${lastNode.description}\n` : '';

      const prompt = `请根据以下小说大纲和上下文，为剧情节点续写生成【1个】新的剧情节点。
核心要求：
1. 阶段必须有具体的剧情发展任务和冲突，承接上一个节点的剧情。
2. 你的语言和描述必须严格遵守小说的大纲和世界观背景。绝不能出现与背景不符的现代物品、比喻或词汇。
3. 请严格使用以下格式输出，不要输出JSON，不要有前言后语，只输出一行，用三个竖线分隔：
起始章序号|||结束章序号|||阶段标题|||阶段剧情描述
例如：
${startChapter}|||${endChapter}|||宗门大比|||主角在宗门大比中一鸣惊人...
${lastNodeContext}${reqPrompt}
小说大纲：
${book.value?.outline}
${stylePrompt}`;

      let resultText = '';
      await store.generateContentStream(prompt, '你是一位专业的小说作家，非常擅长拆解主线并生成剧情描述。只输出规定格式的文本。', 2000, (chunk) => {
        resultText += chunk;
      });

      const cleanResult = resultText.replace(/```[a-zA-Z]*\n/g, '').replace(/```/g, '');
      const lines = cleanResult.split('\n').filter(l => l.includes('|||'));
      if (lines.length > 0) {
        let parts = lines[0].split('|||').map(s => s.trim());
        if (parts[0].match(/^\d+\.\s*\d+/)) {
          parts[0] = parts[0].replace(/^\d+\.\s*/, '');
        }
        if (parts.length >= 4 && !isNaN(parseInt(parts[0]))) {
          currentNodes.push({
            id: `node-${Date.now()}-ai`,
            startChapter: parseInt(parts[0]) || startChapter,
            endChapter: parseInt(parts[1]) || endChapter,
            title: parts[2] || '新增阶段剧情',
            description: parts[3] || '无',
          });
          await store.updateBook(bookId.value, { outlineTree: JSON.stringify(currentNodes) });
          nextTick(() => {
            scrollToOutlineTreeBottom();
          });
          return;
        }
      }
      throw new Error('未能从 AI 回复中解析出有效的节点格式');
    } catch (e: any) {
      if (e.message && e.message.includes('User aborted')) {
        showMessage('已停止生成新节点', 'info');
      } else {
        alert('扩充节点失败: ' + e.message);
      }
    } finally {
      isAddingNode.value = false;
    }
  };

  const deleteOutlineNode = async (id: string) => {
    confirmAction('确认删除这个大纲节点吗？', async () => {
      const currentNodes = parsedOutlineTree.value.filter(n => n.id !== id);
      await store.updateBook(bookId.value, { outlineTree: JSON.stringify(currentNodes) });
    });
  };

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

  return {
    parsedOutlineTree, newOutlineIdea, outlineChatHistory, outlineChatContainer, outlineTreeContainer, userHasScrolledUp,
    showTreeConfigModal, treeTargetChapterCount, treeNodeChapterCount, treeRequirement, showEditNodeModal, editingNode,
    showAddNodeModal, addNodeRequirement, isAddingNode, openAddNodeModal, confirmAddOutlineNode,
    generateOutline, openTreeConfigModal, handleOutlineTreeScroll, scrollToOutlineTreeBottom,
    generateOutlineTree, deleteOutlineNode, openEditNodeModal, saveEditedNode
  };
}
