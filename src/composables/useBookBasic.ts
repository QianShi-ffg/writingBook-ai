import { ref, computed } from 'vue';
import { useMainStore } from '../store/main';

export function useBookBasic(bookId: any, generating: any, showMessage?: any) {
  const store = useMainStore();
  const book = computed(() => store.currentBook);
  const editingTitle = ref(false);
  const newTitle = ref('');

  const newWorldviewIdea = ref('');

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

  const generateWorldview = async () => {
    if (!book.value?.outline) {
      if (showMessage) showMessage('请先在大纲页面生成或填写大纲内容', 'warning');
      else alert('请先在大纲页面生成或填写大纲内容');
      return;
    }
    
    if (book.value.worldview && book.value.worldview.trim().length > 0) {
      const confirm = window.confirm('检测到已有世界观数据，重新提取将会清空旧的世界观内容。是否继续？');
      if (!confirm) return;
    }

    generating.value = true;
    try {
      const prompt = `基于以下大纲，为这部${book.value.type}类型的小说生成世界观设定。
大纲：${book.value.outline}

请严格按照以下要求提取并生成：
1. 必须在开头先生成一小段故事的背景简介（控制在150字以内）。
2. 然后再详细输出完整的地理环境、势力分布和核心冲突。
3. 你的语言和设定必须严格遵守当前世界观。例如，在修仙/古风/玄幻背景下，绝对不要出现如“洗衣机”、“网络”、“火车”等现代科技物品的描述和比喻。`;
      if (book.value) book.value.worldview = '';
      let fullText = '';
      await store.generateContentStream(prompt, '你是一个专业的小说设定师。', 8000, (chunk) => {
        fullText += chunk;
        if (book.value) book.value.worldview = fullText;
      });
      await store.updateBook(bookId.value, { worldview: fullText });
    } catch (e: any) {
      if (e.message && e.message.includes('User aborted')) {
        if (showMessage) showMessage('已停止生成设定', 'info');
      } else {
        if (showMessage) showMessage('生成失败: ' + e.message, 'error');
        else alert('生成失败: ' + e.message);
      }
    } finally {
      generating.value = false;
    }
  };

  const saveWorldview = async () => {
    if (!book.value) return;
    const text = book.value.worldview || '';
    await store.updateBook(bookId.value, { worldview: text });
  };

  const saveDescription = async () => {
    if (!book.value) return;
    const text = book.value.description || '';
    await store.updateBook(bookId.value, { description: text });
  };

  const saveSupplementarySetting = async () => {
    if (!book.value) return;
    const text = book.value.supplementarySetting || '';
    await store.updateBook(bookId.value, { supplementarySetting: text });
    if (showMessage) {
      showMessage('补充设定已保存', 'success');
    }
  };

  return { book, editingTitle, newTitle, startEditTitle, saveTitle, cancelEditTitle, newWorldviewIdea, generateWorldview, saveWorldview, saveDescription, saveSupplementarySetting };
}
