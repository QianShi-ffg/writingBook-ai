import { ref, computed, nextTick } from 'vue';
import { useMainStore } from '../store/main';
import type { OutlineNode } from '../types';

export function useChapter(
  bookId: string,
  showMessage: (text: string, type?: 'info' | 'success' | 'warning' | 'error', duration?: number) => void,
  confirmAction: (msg: string, onConfirm: () => void, onCancel?: () => void) => void,
  generating: { value: boolean },
  cascadeGenerating: { value: boolean },
  cascadeTitle: { value: string },
  cascadeProgress: { value: string },
  parsedOutlineTree: { value: OutlineNode[] },
  characters: { value: any[] },
  realms: { value: any[] },
  references: { value: any[] },
  activeClues: { value: any[] },
  writingStyle: { value: string }
) {
  const store = useMainStore();
  const chapters = computed(() => store.chapters);
  const book = computed(() => store.currentBook);

  const activeChapterId = ref<string | null>(null);
  const currentChapter = computed(() => chapters.value.find(c => c.id === activeChapterId.value));
  const currentChapterContent = ref('');
  const currentChapterSummary = ref('');
  const currentChapterFeedback = ref('');

  const getChapterReviewScore = (feedback: string | null | undefined) => {
    if (!feedback) return null;
    // Match the table format: | 整体 | **A-** | 评价 |
    const match = feedback.match(/\|\s*(?:\*\*)?整体(?:\*\*)?\s*\|\s*(?:\*\*)?(?:\[|【)?([SABCD][+-]?)(?:\]|】)?(?:\*\*)?\s*\|/i);
    if (match) return match[1].toUpperCase();
    
    // Additional table format match for cases where AI might add spaces inside the bold markers or omit them
    const tableMatch = feedback.match(/\|\s*(?:\*\*)?\s*整体\s*(?:\*\*)?\s*\|\s*(?:\*\*)?\s*(?:\[|【)?([SABCD][+-]?)(?:\]|】)?\s*(?:\*\*)?\s*\|/i);
    if (tableMatch) return tableMatch[1].toUpperCase();

    // Fallback match for final line format if the table wasn't strictly followed
    const fallbackMatch = feedback.match(/(?:最终)?评级[:：]\s*(?:\[|【)?\s*([SABCD][+-]?)\s*(?:\]|】)?/i);
    return fallbackMatch ? fallbackMatch[1].toUpperCase() : null;
  };

  const getReviewScoreColor = (score: string | null) => {
    if (!score) return 'var(--color-cta)';
    if (score.startsWith('S') || score.startsWith('A')) return '#67C23A';
    if (score.startsWith('B')) return '#E6A23C';
    return '#F56C6C';
  };

  const reviewScore = computed(() => getChapterReviewScore(currentChapterFeedback.value));
  const reviewScoreColor = computed(() => getReviewScoreColor(reviewScore.value));
  
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

  const isCreatingChapter = ref(false);
  const isBatchDeleteMode = ref(false);
  const selectedChapters = ref<string[]>([]);

  const toggleBatchDeleteMode = () => {
    isBatchDeleteMode.value = !isBatchDeleteMode.value;
    if (!isBatchDeleteMode.value) {
      selectedChapters.value = [];
    }
  };

  const toggleChapterSelection = (id: string) => {
    const index = selectedChapters.value.indexOf(id);
    if (index === -1) {
      selectedChapters.value.push(id);
    } else {
      selectedChapters.value.splice(index, 1);
    }
  };

  const deleteSelectedChapters = async () => {
    if (selectedChapters.value.length === 0) return;
    confirmAction(`确认删除选中的 ${selectedChapters.value.length} 个章节吗？删除后其后的所有章节序号将自动重排，此操作不可恢复。`, async () => {
      // Find all chapters to be deleted, sort them by chapter number descending to avoid index shifting issues
      const chaptersToDelete = chapters.value
        .filter(c => selectedChapters.value.includes(c.id))
        .sort((a, b) => (b.chapter || 0) - (a.chapter || 0));
      
      for (const ch of chaptersToDelete) {
        const deleteChapterNum = ch.chapter || 0;
        await store.deleteChapter(ch.id);
        
        // Re-number chapters after this one
        const chaptersToUpdate = store.chapters.filter(c => (c.chapter || 0) > deleteChapterNum);
        for (const c of [...chaptersToUpdate].sort((a, b) => (a.chapter || 0) - (b.chapter || 0))) {
          const newNum = (c.chapter || 0) - 1;
          await store.updateChapter(c.id, { 
            chapter: newNum,
            title: `第${newNum}章`
          });
        }
      }

      if (activeChapterId.value && selectedChapters.value.includes(activeChapterId.value)) {
        if (store.chapters.length > 0) {
          selectChapter(store.chapters[0].id);
        } else {
          activeChapterId.value = null;
          currentChapterContent.value = '';
          currentChapterSummary.value = '';
          currentChapterFeedback.value = '';
        }
      }
      
      isBatchDeleteMode.value = false;
      selectedChapters.value = [];
      showMessage('批量删除成功', 'success');
    });
  };

  const selectChapter = async (id: string) => {
    if (generating.value) {
      confirmAction('当前有正在进行的 AI 生成任务，切换章节将终止生成。是否确认切换？', async () => {
        store.abortCurrentGeneration();
        generating.value = false;
        await loadAndSetChapter(id);
      });
      return;
    }
    await loadAndSetChapter(id);
  };

  const loadAndSetChapter = async (id: string) => {
    let ch = chapters.value.find(c => c.id === id);
    if (ch && ch.content === undefined) {
      ch = await store.fetchChapterDetail(id);
    }
    if (ch) {
      activeChapterId.value = id;
      currentChapterContent.value = ch.content || '';
      currentChapterSummary.value = ch.summary || '';
      currentChapterFeedback.value = ch.reviewFeedback || '';
    }
  };

  const createNewChapter = async () => {
    if (isCreatingChapter.value) return;
    
    if (chapters.value.length > 0) {
      const lastChapter = chapters.value[chapters.value.length - 1];
      if (lastChapter.status !== 'completed') {
        showMessage(`【${lastChapter.title}】还未定稿，请先将其标记为“✅ 已定稿”再创建新章节。`, 'warning');
        return;
      }
    }
  
    isCreatingChapter.value = true;
    try {
      const nextChapNum = chapters.value.length + 1;
      const newChap = await store.createChapter({
        bookId,
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
    } catch (err: any) {
      showMessage('创建章节失败: ' + err.message, 'error');
    } finally {
      isCreatingChapter.value = false;
    }
  };

  const deleteChapter = async (id: string, e: Event) => {
    e.stopPropagation();
    confirmAction('确认删除此章节吗？删除后其后的所有章节序号将自动重排，此操作不可恢复。', async () => {
      const chapterToDelete = chapters.value.find(c => c.id === id);
      const deleteChapterNum = chapterToDelete?.chapter || 0;
      
      await store.deleteChapter(id);
      
      const chaptersToUpdate = chapters.value.filter(c => (c.chapter || 0) > deleteChapterNum && c.id !== id);
      for (const c of [...chaptersToUpdate].sort((a, b) => (a.chapter || 0) - (b.chapter || 0))) {
        const newNum = (c.chapter || 0) - 1;
        await store.updateChapter(c.id, { 
          chapter: newNum,
          title: `第${newNum}章`
        });
      }
  
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
    showMessage('内容已更新保存！', 'success');
  };

  const changeChapterStatus = async (status: 'draft' | 'reviewing' | 'completed', preventAuto = false) => {
    if (!activeChapterId.value) return;
    await store.updateChapter(activeChapterId.value, { status });
    
    if (status === 'completed' && !preventAuto) {
      cascadeTitle.value = '正在更新设定...';
      cascadeProgress.value = '正文已定稿，正在自动更新设定...';
      cascadeGenerating.value = true;
      
      await summarizeChapter(true);
      await updateCharactersFromChapter();
      await updateCluesFromChapter();
      
      cascadeGenerating.value = false;
      showMessage('本章剧情梳理与设定更新完成！', 'success');
    }
  
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
姓名|||角色定位(主角团/配角/反派/路人)|||出场状态(已出场/未出场)|||性别|||性格|||外貌|||人物简介|||人物关系|||最新能力或技能

说明：
1. 角色定位只能是“主角团”、“配角”、“反派”或“路人”。对于正文中新出现的人物，请一律判定为“路人”或“反派”。
2. 因为这些角色出现在了本章正文中，所以当前状态请统一判定为“已出场”（除非在文中明确死亡）。
3. 如果文中没有提及某个角色的最新信息，请直接留空或写“无”。

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
        if (parts.length >= 9) {
          const [name, role, status, gender, personality, appearance, bio, relationships, abilities] = parts;
          if (name && name !== '姓名') {
            const existingChar = characters.value.find(c => c.name === name);
            if (existingChar) {
              const updates: any = {};
              if (abilities && abilities !== '无') updates.abilities = abilities;
              if (status) updates.status = status;
              if (relationships && relationships !== '无') updates.relationships = relationships;
              if (appearance && appearance !== '无' && !existingChar.appearance) updates.appearance = appearance;
              if (bio && bio !== '无' && !existingChar.bio) updates.bio = bio;
              if (personality && personality !== '无' && !existingChar.personality) updates.personality = personality;
              if (gender && gender !== '无' && !existingChar.gender) updates.gender = gender;
              
              if (Object.keys(updates).length > 0) {
                await store.updateCharacter(existingChar.id, updates);
                updatedCount++;
              }
            } else {
              const mappedRole = role.includes('配角') ? '配角' : (role.includes('反派') ? '反派' : (role.includes('主角') ? '主角团' : '路人'));
              await store.createCharacter({
                bookId,
                name,
                role: mappedRole,
                status: (status as any) || '已出场',
                gender: gender !== '无' ? gender : '',
                personality: personality !== '无' ? personality : '',
                appearance: appearance !== '无' ? appearance : '',
                bio: bio !== '无' ? bio : '',
                relationships: relationships !== '无' ? relationships : '',
                abilities: abilities !== '无' ? abilities : ''
              });
              newCount++;
            }
          }
        }
      }
      showMessage(`实时提取完毕！更新了 ${updatedCount} 个人物，新增了 ${newCount} 个人物。`, 'success');
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
            bookId,
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
            bookId,
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

  const nextContentRequirement = ref('');
  const showGenerateModal = ref(false);

  const startGenerateNextContent = () => {
    if (!activeChapterId.value || !book.value) return;
    nextContentRequirement.value = '';
    showGenerateModal.value = true;
  };

  const confirmGenerateNextContent = async () => {
    showGenerateModal.value = false;
    await generateNextContent(false, nextContentRequirement.value);
  };

  const generateNextContent = async (silent = false, userRequirement = '') => {
    if (!activeChapterId.value || !book.value) return;
    generating.value = true;
    try {
      const activeChars = characters.value.map(c => `${c.name}(${c.role} - ${c.status}): 性别:${c.gender}, 性格:${c.personality}, 外貌:${c.appearance}, 能力:${c.abilities}, 关系:${c.relationships}, 简介:${c.bio}`).join('\n');
        const realmsInfo = book.value.type === '修炼' ? realms.value.map(r => `${r.level}.${r.name}:${r.description}`).join('\n') : '无';
        const referencesInfo = references.value.length > 0 ? references.value.map(r => `${r.sourceName}:${r.content}`).join('\n') : '无';
        const activeCluesInfo = activeClues.value.length > 0 ? activeClues.value.map(c => `${c.title}:${c.content}`).join('\n') : '无';
        const stylePrompt = writingStyle.value !== '默认风格' ? `\n【文风要求】\n请严格模仿“${writingStyle.value}”的写作风格进行行文。` : '';
        const supplementaryInfo = book.value.supplementarySetting ? `\n- 补充设定：${book.value.supplementarySetting}` : '';
        const realmSettingInfo = book.value?.realmSetting ? `\n- 详细境界设定：${book.value.realmSetting}` : '';
        
        const requirementPrompt = userRequirement.trim() ? `\n【用户特殊写作要求（请务必满足）】\n${userRequirement.trim()}` : '';
        
        const currentChapterNum = currentChapter.value?.chapter || 1;
        
        // **修复：不仅通过章节序号查找，还要确保节点有正确的值**
        const currentNode = parsedOutlineTree.value.find(n => currentChapterNum >= n.startChapter && currentChapterNum <= n.endChapter);
        
        // **修复：如果本节点没有 wovenPlot，就使用 description**
        let nodePlotContent = '';
        if (currentNode) {
          nodePlotContent = currentNode.wovenPlot || currentNode.description || '';
        }
        
        const nodePlot = nodePlotContent ? `\n【当前阶段核心情节走向】\n本章需围绕以下情节推进：\n${nodePlotContent}` : '';

        let previousChapterContext = '暂无（这是第一章）';
        let previousChapterSummary = '暂无';
        if (currentChapterNum > 1) {
          const prevChapter = chapters.value.find(c => c.chapter === currentChapterNum - 1);
          const prevPrevChapter = chapters.value.find(c => c.chapter === currentChapterNum - 2);
          
          let summaryParts = [];
          if (prevPrevChapter && prevPrevChapter.summary) {
            summaryParts.push(`【前两章 - ${prevPrevChapter.title}】\n${prevPrevChapter.summary}`);
          }
          
          if (prevChapter) {
            if (prevChapter.content === undefined) {
              await store.fetchChapterDetail(prevChapter.id);
            }
            if (prevChapter.content) {
              const prevContent = prevChapter.content;
              previousChapterContext = prevContent.length > 1000 ? prevContent.substring(prevContent.length - 1000) : prevContent;
            }
            if (prevChapter.summary) {
              summaryParts.push(`【上一章 - ${prevChapter.title}】\n${prevChapter.summary}`);
            }
          }
          
          if (summaryParts.length > 0) {
            previousChapterSummary = summaryParts.join('\n\n');
          }
        }

        const prompt = `
你是一个顶级的${book.value.type}小说家。请为我的小说生成/续写当前章节的内容。

【全局上下文】
- 小说大纲：${book.value.outline || '暂无'}
- 世界观设定：${book.value.worldview || '暂无'}
- 境界层级体系：${realmsInfo}${realmSettingInfo}
- 出场人物：${activeChars || '暂无'}
- 参考资料库：${referencesInfo}
- 未回收伏笔暗线：${activeCluesInfo}${supplementaryInfo}
${stylePrompt}

【当前大纲节点】
- 阶段标题：${currentNode?.title || '暂无'}
- 阶段简介：${currentNode?.description || '暂无'}${nodePlot}

【当前章节信息】
- 章节名称：${currentChapter.value?.title}
- 本章前文摘要：${currentChapterSummary.value || '暂无'}

【前两章剧情梳理（重要！请参考此处的剧情点、时间、地点、人物动向）】
${previousChapterSummary}

【上一章结尾内容（重要！请务必无缝衔接此处的剧情）】
${previousChapterContext}
${requirementPrompt}

【本章已写内容（如有，请在此基础上续写）】
${currentChapterContent.value ? currentChapterContent.value : '(暂无，请直接承接上一章的结尾开始写本章)'}

【任务】
请严格根据上一章的结尾情节进行无缝衔接，同时结合当前大纲阶段的走向、人物性格和世界观设定，直接输出小说正文。
如果已有“本章已写内容”，请紧接着续写约800字；如果暂无内容，请紧接着“上一章结尾内容”作为本章的开头撰写约800字。要求文风符合${book.value.type}小说，情节紧凑，对话生动。
特别注意：
1. 如果上下文合适，你可以自然地埋下新的伏笔暗线，或者回收前面提到的【未回收伏笔暗线】。
2. 你的语言和描述必须严格遵守当前世界观。例如，在修仙/古风/玄幻背景下，绝对不要出现如“洗衣机”、“核弹”、“火车”等现代科技物品的描述和比喻。
3. 写作内容时绝对严禁使用破折号（——），这会造成阅读的割裂感。请使用其他标点符号（如逗号、句号或省略号）来代替转折或语气停顿。
`;
      if (currentChapterContent.value) {
        currentChapterContent.value += '\n\n';
      }
      userHasScrolledMainEditor.value = false;
      const systemPrompt = '你是一位资深的小说网文作家，可以驾驭各种风格的内容写作，文笔一绝，擅长铺垫剧情，吊足胃口，对人的情感描写细腻且丰富，热血的剧情让人热血沸腾，悲伤的剧情让人忍不住落泪。请只输出小说正文，不要输出多余的解释。';
      await store.generateContentStream(prompt, systemPrompt, 8000, (chunk) => {
        currentChapterContent.value += chunk;
        scrollToBottom();
      });
      await saveChapter();
      if (!silent) showMessage('内容生成完毕！', 'success');
    } catch (e: any) {
      if (e.message && e.message.includes('User aborted')) {
        if (!silent) showMessage('已停止生成', 'info');
      } else {
        if (!silent) showMessage('续写失败: ' + e.message, 'error');
        else throw e;
      }
    } finally {
      generating.value = false;
    }
  };

  const agentReviewChapter = async (auto = false) => {
    if (!activeChapterId.value || !currentChapterContent.value) {
      if (!auto) showMessage('当前章节内容为空，无法审核', 'warning');
      return;
    }
    
    if (currentChapter.value?.status === 'draft') {
      await changeChapterStatus('reviewing', true);
    }
    
    generating.value = true;
    try {
      const activeCluesInfo = activeClues.value.length > 0 ? activeClues.value.map(c => `${c.title}:${c.content}`).join('\n') : '无';
      const previousFeedback = currentChapterFeedback.value;
      const previousFeedbackPrompt = previousFeedback ? `\n【上次审核意见参考】\n作者已经根据以下意见对文章进行了修改，请重点检查以下问题是否已被修复：\n${previousFeedback}\n\n如果核心问题已经得到修复，请务必在原有的评分基础上提升评级！不要因为修改后产生的一些无关紧要的微小瑕疵而随意降低整体评分！` : '';
      const activeChars = characters.value.map(c => `${c.name}(${c.role} - ${c.status}): 性别:${c.gender}, 性格:${c.personality}, 外貌:${c.appearance}, 能力:${c.abilities}, 关系:${c.relationships}, 简介:${c.bio}`).join('\n');
      const realmsInfo = book.value?.type === '修炼' ? realms.value.map(r => `${r.level}.${r.name}:${r.description}`).join('\n') : '无';
      const supplementaryInfo = book.value?.supplementarySetting ? `\n补充设定：${book.value.supplementarySetting}` : '';
      const realmSettingInfo = book.value?.realmSetting ? `\n详细境界设定：${book.value.realmSetting}` : '';
      const prompt = `
你是一个严苛但公正的网文主编（Agent）。请审核以下这篇小说章节，并给出修改建议。
如果你注意到这篇文章已经根据某些意见进行过修改（比如这是二次审核），请重点评估修改后的效果，如果修改得好，请不要吝啬你的高分，给予更高的评级！
${previousFeedbackPrompt}

【大纲与世界观参考】
大纲：${book.value?.outline || '无'}
世界观：${book.value?.worldview || '无'}
境界层级体系：${realmsInfo}${realmSettingInfo}
出场人物：${activeChars || '无'}
未回收的伏笔：${activeCluesInfo}${supplementaryInfo}

【待审核正文】
${currentChapterContent.value}

【审核要求】
1. 逻辑漏洞：是否偏离了大纲设定？是否存在前后矛盾？
2. 人物OOC：人物行为是否符合其性格设定？
3. 节奏与爽点：行文是否拖沓？是否缺乏期待感或情绪波动？
4. 伏笔暗线：检查新埋设的伏笔是否突兀，已有的伏笔是否有合适的回收时机但被忽略了？
5. 错别字/语病：列出明显的语病或错别字。
6. 综合评分：结合以上维度，对当前章节的质量进行客观评分（满分100分）。

请分点列出你的具体审核意见。
最后，请务必以“## 总结”为标题，输出一个Markdown格式的评分表格。表格必须严格遵循以下格式和维度：

## 总结
| 维度 | 评分 | 问题严重程度 |
|------|------|------------|
| 逻辑 | ★★★☆☆ | [填写具体评价] |
| 人物 | ★★★★★ | [填写具体评价] |
| 节奏 | ★★☆☆☆ | [填写具体评价] |
| 伏笔 | ★★★☆☆ | [填写具体评价] |
| 语病 | ★★★☆☆ | [填写具体评价] |
| **整体** | **[填写综合评级，如S/A/B+/C-]** | **[填写一句话总评]** |

注意：
1. 评分使用★和☆表示，满分5星。
2. 整体评级请使用 S, A+, A, A-, B+, B, B-, C+, C, D 等级别。
   - S级：惊艳，无可挑剔，情绪拉满。
   - A级：优秀，只有极少瑕疵。
   - B级：合格，有明显的结构或节奏问题，但不影响整体阅读。
   - C/D级：不合格，存在严重逻辑漏洞、人物OOC或节奏崩坏。
3. 表格必须严格使用Markdown语法。

请务必注意：如果这是一次修改后的二次审核，只要解决了【上次审核意见】中的核心问题，整体评级必须提升，绝不能低于上次的评级！
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

  const showReviseInline = ref(false);
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

  const cancelReviseInline = () => {
    showReviseInline.value = false;
    store.abortCurrentGeneration();
  };

  const reviseChapter = async () => {
    if (!activeChapterId.value || !currentChapterContent.value || !currentChapterFeedback.value) {
      alert('缺少原文或审核意见，无法进行一键修改');
      return;
    }
    
    reviseResult.value = '';
    showReviseInline.value = true;
    reviseGenerating.value = true;
    userHasScrolledReviseEditor.value = false;
    
    try {
      const activeChars = characters.value.map(c => `${c.name}(${c.role} - ${c.status}): 性别:${c.gender}, 性格:${c.personality}, 外貌:${c.appearance}, 能力:${c.abilities}, 关系:${c.relationships}, 简介:${c.bio}`).join('\n');
      const realmsInfo = book.value?.type === '修炼' ? realms.value.map(r => `${r.level}.${r.name}:${r.description}`).join('\n') : '无';
      const referencesInfo = references.value.length > 0 ? references.value.map(r => `${r.sourceName}:${r.content}`).join('\n') : '无';
      const activeCluesInfo = activeClues.value.length > 0 ? activeClues.value.map(c => `${c.title}:${c.content}`).join('\n') : '无';
      const stylePrompt = writingStyle.value !== '默认风格' ? `\n【文风要求】\n请严格模仿“${writingStyle.value}”的写作风格进行行文。` : '';
      const supplementaryInfo = book.value?.supplementarySetting ? `\n- 补充设定：${book.value.supplementarySetting}` : '';
      const realmSettingInfo = book.value?.realmSetting ? `\n- 详细境界设定：${book.value.realmSetting}` : '';
      
      const prompt = `
你是一位顶级的网文作者。现在有一篇小说章节因为存在一些问题，被主编打回并给出了修改意见。
请你根据主编的修改意见，对原本的章节内容进行全面修改和重写。

【全局设定参考】
- 小说大纲：${book.value?.outline || '无'}
- 世界观：${book.value?.worldview || '无'}
- 境界层级体系：${realmsInfo}${realmSettingInfo}
- 出场人物：${activeChars || '无'}
- 参考资料库：${referencesInfo}
- 未回收的伏笔/暗线：${activeCluesInfo}${supplementaryInfo}
${stylePrompt}

【原章节正文】
${currentChapterContent.value}

【主编审核修改意见】
${currentChapterFeedback.value}

【任务】
请全面吸收主编的审核意见，进行深度、细致的改写。
不要仅仅只是做微调或字面替换！你需要：
1. 修正逻辑漏洞、人物OOC、语病错别字等问题。
2. 大幅优化节奏与爽点，增加情绪波动力度。
3. 补全或重构不够好的伏笔。
如果原主编给出了很低的分数或严厉的批评，请务必在这次修改中彻底解决这些核心问题，让文章焕然一新，达到能够拿S级高分的标准！

重写后的内容必须保持连贯，修改后的内容限制不超过4000字。
特别注意：
1. 你的语言和描述必须严格遵守当前世界观。例如，在修仙/古风/玄幻背景下，绝对不要出现如“洗衣机”、“核弹”、“火车”等现代科技物品的描述和比喻。
2. 写作内容时绝对严禁使用破折号（——），这会造成阅读的割裂感。请使用其他标点符号（如逗号、句号或省略号）来代替转折或语气停顿。
请直接输出修改后的完整小说正文，不要输出任何解释性的话语，也不要输出诸如“修改后正文如下”之类的前言。
`;
      
      await store.generateContentStream(prompt, '你是专业的小说家，请只输出小说正文，不要输出多余的解释。', 8000, (chunk) => {
        reviseResult.value += chunk;
        scrollToReviseBottom();
      });
      
    } catch (e: any) {
      if (e.message && e.message.includes('User aborted')) {
        showMessage('已停止生成', 'info');
      } else {
        showMessage('修改失败: ' + e.message, 'error');
      }
    } finally {
      reviseGenerating.value = false;
    }
  };

  const applyReviseResult = async () => {
    if (!reviseResult.value) return;
    currentChapterContent.value = reviseResult.value;
    showReviseInline.value = false;
    
    confirmAction('原文已替换成功，是否直接将该章节定稿？\n（选“否”可保留在审核修改状态继续手动修改，选“是”将定稿且后续无法再编辑）', async () => {
      await changeChapterStatus('completed', true);
      await saveChapter();
      triggerPostReviseSummary(true);
    }, async () => {
      await saveChapter();
      triggerPostReviseSummary(false);
    });
  };

  const triggerPostReviseSummary = async (isCompleted: boolean) => {
    if (isCompleted) {
      cascadeTitle.value = '正在更新设定...';
      cascadeProgress.value = '正在自动梳理本章剧情...';
      cascadeGenerating.value = true;
      
      if (currentChapterContent.value) {
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
        } catch (err: any) {
          showMessage('自动剧情梳理失败: ' + err.message, 'error');
        }
      }
      
      cascadeProgress.value = '正在更新人物卡片和伏笔暗线...';
      await updateCharactersFromChapter();
      await updateCluesFromChapter();
      cascadeGenerating.value = false;
      showMessage('章节已定稿，设定更新完成！', 'success');
    } else {
      showMessage('一键修改完成！正文已重写，请继续手动修改。', 'success');
    }
  };

  const summaryGenerating = ref(false);

  const summarizeChapter = async (silent = false) => {
    if (!activeChapterId.value || !currentChapterContent.value) return;
    summaryGenerating.value = true;
    if (!silent) {
      showMessage('正在为您梳理本章剧情，请稍候...', 'info');
    } else {
      cascadeProgress.value = '正在自动梳理本章剧情...';
    }
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
      if (!silent) {
        showMessage('剧情梳理完成！', 'success');
      }
    } catch (e: any) {
      if (!silent) {
        showMessage('梳理失败: ' + e.message, 'error');
      }
    } finally {
      summaryGenerating.value = false;
    }
  };

  const doAutoRevise = async () => {
    const activeChars = characters.value.map(c => `${c.name}(${c.role} - ${c.status}): 性别:${c.gender}, 性格:${c.personality}, 外貌:${c.appearance}, 能力:${c.abilities}, 关系:${c.relationships}, 简介:${c.bio}`).join('\n');
    const realmsInfo = book.value?.type === '修炼' ? realms.value.map(r => `${r.level}.${r.name}:${r.description}`).join('\n') : '无';
    const referencesInfo = references.value.length > 0 ? references.value.map(r => `${r.sourceName}:${r.content}`).join('\n') : '无';
    const activeCluesInfo = activeClues.value.length > 0 ? activeClues.value.map(c => `${c.title}:${c.content}`).join('\n') : '无';
    const stylePrompt = writingStyle.value !== '默认风格' ? `\n【文风要求】\n请严格模仿“${writingStyle.value}”的写作风格进行行文。` : '';
    const supplementaryInfo = book.value?.supplementarySetting ? `\n- 补充设定：${book.value.supplementarySetting}` : '';
    
    const prompt = `
你是一位顶级的网文作者。现在有一篇小说章节因为存在一些问题，被主编打回并给出了修改意见。
请你根据主编的修改意见，对原本的章节内容进行全面修改和重写。

【全局设定参考】
- 小说大纲：${book.value?.outline || '无'}
- 世界观：${book.value?.worldview || '无'}
- 境界体系：${realmsInfo}
- 出场人物：${activeChars || '无'}
- 参考资料库：${referencesInfo}
- 未回收的伏笔/暗线：${activeCluesInfo}${supplementaryInfo}
${stylePrompt}

【原章节正文】
${currentChapterContent.value}

【主编审核修改意见】
${currentChapterFeedback.value}

【任务】
请全面吸收主编的审核意见，进行深度、细致的改写。
不要仅仅只是做微调或字面替换！你需要：
1. 修正逻辑漏洞、人物OOC、语病错别字等问题。
2. 大幅优化节奏与爽点，增加情绪波动力度。
3. 补全或重构不够好的伏笔。
如果原主编给出了很低的分数或严厉的批评，请务必在这次修改中彻底解决这些核心问题，让文章焕然一新，达到能够拿S级高分的标准！

重写后的内容必须保持连贯，修改后的内容限制不超过4000字。
特别注意：
1. 你的语言和描述必须严格遵守当前世界观。例如，在修仙/古风/玄幻背景下，绝对不要出现如“洗衣机”、“核弹”、“火车”等现代科技物品的描述和比喻。
2. 写作内容时绝对不要使用破折号（——），这会造成阅读的割裂感。请使用其他标点符号（如逗号、句号或省略号）来代替转折或语气停顿。
请直接输出修改后的完整小说正文，不要输出任何解释性的话语，也不要输出诸如“修改后正文如下”之类的前言。
`;
    currentChapterContent.value = ''; 
    generating.value = true;
    try {
      const systemPrompt = '你是一位资深的小说网文作家，可以驾驭各种风格的内容写作，文笔一绝，擅长铺垫剧情，吊足胃口，对人的情感描写细腻且丰富，热血的剧情让人热血沸腾，悲伤的剧情让人忍不住落泪。请只输出小说正文，不要输出多余的解释。';
      await store.generateContentStream(prompt, systemPrompt, 8000, (chunk) => {
        currentChapterContent.value += chunk;
        scrollToBottom();
      });
      await saveChapter();
    } finally {
      generating.value = false;
    }
  };

  const isScoreAcceptable = (score: string | null) => {
    if (!score) return false;
    return ['S', 'A+', 'A', 'A-'].includes(score);
  };

  const showAutoWriteModal = ref(false);
  const autoWriteCount = ref(10);
  const autoWriteRequirement = ref('');
  const isAutoWriting = ref(false);
  const autoWriteTotal = ref(0);
  const autoWriteCurrent = ref(0);
  const autoWriteProgress = ref('');

  const stopAutoWrite = () => {
    isAutoWriting.value = false;
    store.abortCurrentGeneration();
  };

  const openAutoWriteModal = () => {
    autoWriteRequirement.value = '';
    showAutoWriteModal.value = true;
  };

  const startAutoWrite = async () => {
    showAutoWriteModal.value = false;
    isAutoWriting.value = true;
    autoWriteTotal.value = autoWriteCount.value;
    autoWriteCurrent.value = 0;
    
    try {
      for (let i = 0; i < autoWriteCount.value; i++) {
        if (!isAutoWriting.value) break;
        autoWriteCurrent.value = i + 1;
        
        autoWriteProgress.value = '准备章节...';
        const lastChapter = chapters.value.length > 0 ? chapters.value[chapters.value.length - 1] : null;
        if (lastChapter && lastChapter.status !== 'completed') {
           if (lastChapter.content === undefined) {
             await store.fetchChapterDetail(lastChapter.id);
           }
           if (lastChapter.content && lastChapter.content.trim().length > 0 && !isScoreAcceptable(getChapterReviewScore(lastChapter.reviewFeedback))) {
              activeChapterId.value = lastChapter.id;
              await selectChapter(lastChapter.id);
           } else if (lastChapter.content && lastChapter.content.trim().length > 0) {
               throw new Error(`请先将最后一章【${lastChapter.title}】定稿，或清空其内容。`);
           } else {
              activeChapterId.value = lastChapter.id;
              await selectChapter(lastChapter.id);
           }
        } else {
           await createNewChapter();
        }
        
        if (!isAutoWriting.value) break;
  
        if (!currentChapterContent.value || !currentChapterContent.value.trim()) {
          autoWriteProgress.value = '正在根据大纲生成正文...';
          await generateNextContent(true, autoWriteRequirement.value);
        }
        
        if (!isAutoWriting.value) break;
  
        let attempts = 0;
        const maxAttempts = 3;
        let acceptable = false;
        
        while (attempts < maxAttempts && isAutoWriting.value) {
          autoWriteProgress.value = `正在进行 AI 主编审核 (第 ${attempts + 1} 次)...`;
          await agentReviewChapter(true);
          
          if (!isAutoWriting.value) break;

          const score = reviewScore.value;
          if (isScoreAcceptable(score)) {
            acceptable = true;
            break;
          }
          
          autoWriteProgress.value = `评级不达标(${score || '无'})，正在深度重写...`;
          await doAutoRevise();
          
          attempts++;
        }
        
        if (isAutoWriting.value && !acceptable) {
          autoWriteProgress.value = `正在进行重写后最终复核...`;
          await agentReviewChapter(true);
        }
        
        if (!isAutoWriting.value) break;
  
        autoWriteProgress.value = '正在定稿并自动梳理更新设定...';
        await changeChapterStatus('completed', false);
      }
      
      if (isAutoWriting.value) {
        showMessage('自动连载任务圆满完成！', 'success');
      }
    } catch (e: any) {
      if (isAutoWriting.value) {
         showMessage('自动连载出错中止: ' + e.message, 'error');
      }
    } finally {
      isAutoWriting.value = false;
    }
  };

  return {
    activeChapterId,
    currentChapter,
    currentChapterContent,
    currentChapterSummary,
    currentChapterFeedback,
    getChapterReviewScore,
    getReviewScoreColor,
    reviewScore,
    reviewScoreColor,
    mainEditorRef,
    userHasScrolledMainEditor,
    summaryEditorRef,
    userHasScrolledSummary,
    feedbackEditorRef,
    userHasScrolledFeedback,
    handleMainEditorScroll,
    handleSummaryScroll,
    handleFeedbackScroll,
    scrollToBottom,
    scrollToSummaryBottom,
    scrollToFeedbackBottom,
    isCreatingChapter,
    selectChapter,
    createNewChapter,
    deleteChapter,
    saveChapter,
    manualSaveChapter,
    changeChapterStatus,
    updateCharactersFromChapter,
    updateCluesFromChapter,
    extractReferences,
    nextContentRequirement,
    showGenerateModal,
    startGenerateNextContent,
    confirmGenerateNextContent,
    generateNextContent,
    agentReviewChapter,
    showReviseInline,
    reviseResult,
    reviseGenerating,
    reviseEditorRef,
    userHasScrolledReviseEditor,
    handleReviseEditorScroll,
    scrollToReviseBottom,
    cancelReviseInline,
    reviseChapter,
    applyReviseResult,
    triggerPostReviseSummary,
    summaryGenerating,
    summarizeChapter,
    doAutoRevise,
    isScoreAcceptable,
    showAutoWriteModal,
    autoWriteCount,
    autoWriteRequirement,
    isAutoWriting,
    autoWriteTotal,
    autoWriteCurrent,
    autoWriteProgress,
    stopAutoWrite,
    openAutoWriteModal,
    startAutoWrite,
    isBatchDeleteMode,
    selectedChapters,
    toggleBatchDeleteMode,
    toggleChapterSelection,
    deleteSelectedChapters
  };
}