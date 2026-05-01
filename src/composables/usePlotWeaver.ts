import { ref } from 'vue';
import { useMainStore } from '../store/main';
import type { OutlineNode } from '../types';

export function usePlotWeaver(
  bookId: import('vue').Ref<string>, 
  parsedOutlineTree: import('vue').Ref<OutlineNode[]>, 
  activeChapterId: import('vue').Ref<string | null>, 
  currentChapterContent: import('vue').Ref<string>, 
  currentChapterSummary: import('vue').Ref<string>, 
  saveChapter: Function
) {
  const store = useMainStore();
  const showPlotModal = ref(false);
  const plotOptions = ref<string[]>([]);
  const plotGenerating = ref(false);
  const plotWeaverTarget = ref<'editor' | string>('editor');
  const plotRequirement = ref('');

  const generatePlotOptions = async () => {
    if (plotWeaverTarget.value === 'editor' && !activeChapterId.value) return;
    
    plotGenerating.value = true;
    plotOptions.value = [];
    try {
      let contextStr = '';
      if (plotWeaverTarget.value === 'editor') {
        contextStr = currentChapterContent.value ? currentChapterContent.value.substring(Math.max(0, currentChapterContent.value.length - 1000)) : (currentChapterSummary.value || '暂无');
      } else {
        const node = parsedOutlineTree.value.find((n: OutlineNode) => n.id === plotWeaverTarget.value);
        contextStr = `当前阶段：${node?.title}\n内容简述：${node?.description}`;
      }

      let prompt = '';
      
      if (plotWeaverTarget.value === 'editor') {
        const reqPrompt = plotRequirement.value.trim() ? `\n【用户对情节的具体要求】\n${plotRequirement.value.trim()}\n` : '';
        prompt = `你是一个顶级小说家。请根据当前小说大纲和以下本章上下文，为接下来的剧情发展生成 3 个不同走向的曲折情节（例如：神转折、遇强敌、得奇遇、深挖阴谋等）。
要求：严格使用以下格式输出，不要输出 JSON，不要有前言后语，每行一个情节走向，用三个竖线分隔：
情节走向标题|||情节具体描述
${reqPrompt}
【已有上下文/大纲节点】
${contextStr}
`;
      } else {
        const reqPrompt = plotRequirement.value.trim() ? `\n【用户对当前节点的具体描述要求】\n${plotRequirement.value.trim()}\n` : '';
        prompt = `你是一个顶级小说家。请根据以下大纲节点信息，结合用户的具体描述要求，为该节点重新编织并扩写出 1 个详细、连贯的阶段剧情描述。
要求：严格使用以下格式输出，不要输出 JSON，不要有前言后语，只输出一行，用三个竖线分隔：
情节走向标题|||情节具体描述
${reqPrompt}
【当前大纲节点】
${contextStr}
`;
      }
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
      const nodeIndex = newTree.findIndex((n: OutlineNode) => n.id === plotWeaverTarget.value);
      if (nodeIndex !== -1) {
        // Remove the title prefix like "【神转折】\n" and only save the description
        const cleanDesc = plotDesc.replace(/^【.*?】\n/, '');
        // Keep the original description in wovenPlot just for backup/reference if needed
        if (!newTree[nodeIndex].wovenPlot) {
          newTree[nodeIndex].wovenPlot = newTree[nodeIndex].description;
        }
        newTree[nodeIndex].description = cleanDesc;
        await store.updateBook(bookId.value, { outlineTree: JSON.stringify(newTree) });
      }
    }
    showPlotModal.value = false;
  };

  return {
    showPlotModal, plotOptions, plotGenerating, plotWeaverTarget, plotRequirement,
    generatePlotOptions, applyPlotOption
  };
}
