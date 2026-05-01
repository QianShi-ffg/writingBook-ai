import { ref, type Ref } from 'vue';
import { useMainStore } from '../store/main';

export function usePolish(
  currentChapterContent: Ref<string>,
  saveChapter: () => Promise<void>,
  writingStyle: Ref<string>,
  mainEditorRef: Ref<HTMLTextAreaElement | null>
) {
  const store = useMainStore();
  const showPolishModal = ref(false);
  const polishAction = ref('润色');
  const selectedText = ref('');
  const polishResult = ref('');
  const polishGenerating = ref(false);

  const openPolishModal = () => {
    if (!mainEditorRef.value) return;
    const textarea = mainEditorRef.value;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start === end) {
      alert('请先在正文输入框中用鼠标高亮选中一段想要处理的文字。');
      return;
    }
    selectedText.value = currentChapterContent.value.substring(start, end);
    polishResult.value = '';
    showPolishModal.value = true;
  };

  const applyPolishResult = async () => {
    if (!mainEditorRef.value) return;
    const textarea = mainEditorRef.value;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const originalText = currentChapterContent.value;
    currentChapterContent.value = originalText.substring(0, start) + polishResult.value + originalText.substring(end);
    showPolishModal.value = false;
    await saveChapter();
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
      const worldviewRules = `1. 你的语言和设定必须严格遵守当前世界观。例如，在修仙/古风/玄幻背景下，绝对不要出现如“洗衣机”、“核弹”、“火车”等现代科技物品的描述和比喻。
2. 绝对不要使用破折号（——），这会造成阅读的割裂感。请使用其他标点符号（如逗号、句号或省略号）来代替转折或语气停顿。`;
      const prompt = `你是一位顶级的网文作者。请对以下选中的小说片段进行【${polishAction.value}】。
任务：${actionDesc}${stylePrompt}
世界观约束：${worldviewRules}

【选中的片段】
${selectedText.value}

请直接输出处理后的文本，不要输出任何解释性的话语，也不要输出多余的格式。`;

      const systemPrompt = '你是一位资深的小说网文作家，可以驾驭各种风格的内容写作，文笔一绝，请对文本进行处理，并输出处理后的正文文本。';
      await store.generateContentStream(prompt, systemPrompt, 4000, (chunk) => {
        polishResult.value += chunk;
      });
    } catch (e: any) {
      if (!e.message?.includes('User aborted')) {
        alert('处理失败: ' + e.message);
      }
    } finally {
      polishGenerating.value = false;
    }
  };

  return {
    showPolishModal, polishAction, selectedText, polishResult, polishGenerating,
    openPolishModal, applyPolishResult, runPolish
  };
}