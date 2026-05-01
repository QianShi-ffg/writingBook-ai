import { ref } from 'vue';

export function useConfirm() {
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

  return { showConfirmModal, confirmMessage, confirmAction, handleConfirm, handleCancelConfirm };
}
