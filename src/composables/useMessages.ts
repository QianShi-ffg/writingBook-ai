import { ref } from 'vue';

export function useMessages() {
  const messages = ref<{id: string, text: string, type: string}[]>([]);
  const showMessage = (text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', duration = 3000) => {
    const id = Date.now().toString() + Math.random().toString();
    messages.value.push({ id, text, type });
    setTimeout(() => {
      messages.value = messages.value.filter(m => m.id !== id);
    }, duration);
  };
  return { messages, showMessage };
}
