import { ref, computed } from 'vue';
import { useMainStore } from '../store/main';

export function useCascadeGeneration(
  bookId: import('vue').Ref<string>, 
  generating: import('vue').Ref<boolean>, 
  showMessage: Function, 
  confirmAction: Function, 
  writingStyle: import('vue').Ref<string>,
  outlineMode: import('vue').Ref<string>
) {
  const store = useMainStore();
  const book = computed(() => store.currentBook);
  const realms = computed(() => store.realms || []);
  const characters = computed(() => store.characters);
  const clues = computed(() => store.clues || []);
  
  const cascadeGenerating = ref(false);
  const cascadeTitle = ref('AI 一键衍生设定生成中...');
  const cascadeProgress = ref('');

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
      const wvPrompt = `基于以下大纲生成世界观和背景设定：\n${book.value.outline}

要求：
1. 必须在开头生成一小段故事的背景简介。
2. 然后再详细输出完整的地理环境、势力分布和核心冲突。
注意：${worldviewRules}${stylePrompt}`;
      
      const worldviewTask = (async () => {
        let wvResult = '';
        if (book.value) book.value.worldview = '';
        await store.generateContentStream(wvPrompt, '你是一个设定师。', 8000, (chunk) => {
          wvResult += chunk;
          if (book.value) book.value.worldview = wvResult;
        });
        await store.updateBook(bookId.value, { worldview: wvResult });
        return wvResult;
      })();

      const realmTask = (async () => {
        let realmsResultText = '无';
        if (book.value?.type === '修炼') {
          // 清空旧境界
          const oldRealms = store.realms || [];
          for (const r of oldRealms) {
            await store.deleteRealm(r.id);
          }
          
          const realmPrompt = `基于以下大纲，提取或设计一套完整的修炼境界体系。
要求：
1. 如果大纲中已经明确提及了某些境界的名称或划分（如练气、筑基，或者大魔法师、魔导师等），请务必严格按照大纲中的设定来提取，并根据大纲的描述补全缺失的设定。
2. 如果大纲中没有明确提及境界划分，请自行设计至少6个大境界。
3. 你的语言和描述必须严格遵守修仙/玄幻的世界观背景，绝对不要出现任何现代科技物品的描述和比喻。
4. 请严格使用以下格式输出，不要输出任何 JSON，不要有前言后语，每行一个境界，用三个竖线分隔：
境界名称|||境界描述
例如：
炼气期|||吸纳天地灵气入体，改善体质...
筑基期|||体内真气液化...

大纲：${book.value?.outline}`;
          let realmResult = '';
          await store.generateContentStream(realmPrompt, '你是一个设定师。只输出规定格式的文本。', 8000, (chunk) => {
            realmResult += chunk;
          });
          
          const realmTasks: Promise<any>[] = [];
          try {
            const cleanRealmResult = realmResult.replace(/```[a-zA-Z]*\n/g, '').replace(/```/g, '');
            realmsResultText = cleanRealmResult; 
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

      const charTask = (async (wvRes: string, realmsRes: string) => {
        cascadeProgress.value = '世界观和境界体系已生成，正在分析生成核心人物卡片...';
        
        // 清空旧人物
        const oldChars = store.characters || [];
        for (const c of oldChars) {
          await store.deleteCharacter(c.id);
        }
        
        const charPrompt = `基于以下大纲和世界观（以及境界体系），提取或设计小说中的主要人物和重要配角、反派（总共至少5个人物）。
要求：
1. 提取所有在大纲中提到的人物。
2. 你的语言和描述必须严格遵守小说的世界观背景。
3. 请严格使用以下格式输出，不要输出任何 JSON，不要有前言后语，每行一个人物，用三个竖线分隔：
姓名|||性别|||性格|||外貌|||人物简介|||人物关系|||能力或技能
例如：
林动|||男|||坚韧不拔，重情重义|||身材修长，眼神坚毅|||青阳镇林家子弟，偶然获得神秘石符...|||林啸之子，林青檀之兄|||淬体境，掌握奇门印

注意：${worldviewRules}

大纲：${book.value?.outline}
世界观：${wvRes}
境界体系：${realmsRes}`;
        
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
            const parts = line.split('|||').map(s => s.trim());
            if (parts.length >= 7 && parts[0] !== '姓名' && parts[0] !== '人物名称') {
              const [name, gender, personality, appearance, bio, relationships, abilities] = parts;
              const charObj = {
                bookId: bookId.value,
                name,
                gender,
                personality,
                appearance,
                bio,
                relationships,
                abilities
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
      });
      
      // 世界观和境界不互相依赖，可以并行生成
      const [wvResult, realmsResultText] = await Promise.all([worldviewTask, realmTask]);
      // 人物卡片依赖世界观和境界，必须等前两者生成完再串行生成
      const charsResult = await charTask(wvResult, realmsResultText);

      cascadeProgress.value = '主要人物已生成，正在为您自动埋设初始伏笔暗线...';
      const charsInfoStr = charsResult.map((c: any) => `${c.name}(${c.gender}): ${c.personality}，简介：${c.bio}`).join('\n');
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
      if (e.message && e.message.includes('User aborted')) {
        showMessage('已停止一键衍生设定生成', 'info');
      } else {
        showMessage('自动化生成部分失败: ' + e.message, 'error');
      }
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
    showMessage('大纲保存成功！', 'success');
    
    if (text.trim().length > 0) {
      const hasExistingData = (book.value?.worldview && book.value.worldview.trim().length > 0) || realms.value.length > 0 || characters.value.length > 0 || clues.value.length > 0;
      let msg = '是否根据新大纲自动生成衍生设定？';
      if (hasExistingData) {
        msg = '是否要根据新大纲重新生成衍生设定（包含伏笔）？\n\n【确认】覆盖并重新生成旧数据\n【取消】仅更新大纲，不改动其他内容';
      }
      
      confirmAction(
        msg,
        async () => {
          outlineMode.value = 'read';
          await runCascadeGeneration(hasExistingData);
        },
        () => {
          outlineMode.value = 'read';
        }
      );
    } else {
      outlineMode.value = 'read';
    }
  };

  return {
    cascadeGenerating, cascadeTitle, cascadeProgress,
    runCascadeGeneration, autoGenerateCascade, saveOutline
  };
}
