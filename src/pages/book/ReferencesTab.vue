<script setup lang="ts">
import { ref, computed } from 'vue';
import { useMainStore } from '../../store/main';
import { Plus } from 'lucide-vue-next';

const props = defineProps<{
  bookId: string;
}>();

const emit = defineEmits<{
  (e: 'confirm', message: string, onConfirm: () => void, onCancel?: () => void): void
}>();

const store = useMainStore();
const references = computed(() => store.references || []);

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
    await store.createReference({ ...newRef.value, bookId: props.bookId });
  }
  showRefModal.value = false;
  newRef.value = { sourceName: '', content: '' };
};

const deleteReference = async (id: string) => {
  emit('confirm', '确认删除此条资料吗？', async () => {
    await store.deleteReference(id);
  });
};
</script>

<template>
  <div class="tab-pane scrollable">
    <div class="pane-header">
      <h2 class="pane-title">资料室</h2>
      <el-button type="primary" @click="openRefModal()">
        <Plus class="icon-sm" style="margin-right: 4px;" /> 添加资料
      </el-button>
    </div>

    <div class="data-grid" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));">
      <div v-for="ref in references" :key="ref.id" class="data-card card" style="display: flex; flex-direction: column;">
        <div class="card-header" style="margin-bottom: var(--spacing-sm);">
          <h3 class="item-title" style="font-size: 1rem; color: var(--color-cta);">《{{ ref.sourceName }}》</h3>
        </div>
        <div class="card-body" style="flex: 1; margin-bottom: var(--spacing-md);">
          <p style="font-size: 0.875rem; color: var(--color-text); line-height: 1.6; white-space: pre-wrap;">{{ ref.content }}</p>
        </div>
        <div class="card-footer" style="margin-top: auto; padding-top: var(--spacing-sm); border-top: 1px solid var(--color-border);">
          <el-button size="small" @click="openRefModal(ref)">编辑</el-button>
          <el-button size="small" type="danger" @click="deleteReference(ref.id)">删除</el-button>
        </div>
      </div>
      <div v-if="references.length === 0" class="empty-state" style="grid-column: 1 / -1;">
        <p>暂无资料，您可以手动添加，或在“写作编辑”区点击【AI提取资料】自动从正文抽取古籍、设定等内容。</p>
      </div>
    </div>

    <!-- Ref Modal -->
    <div v-if="showRefModal" class="modal-overlay">
      <div class="modal-content">
        <h2 class="modal-title">{{ editingRefId ? '编辑资料' : '添加资料' }}</h2>
        <div class="form-layout">
          <div class="form-group">
            <label>资料/文献名称</label>
            <input v-model="newRef.sourceName" type="text" class="form-control" placeholder="例如：山海经·大荒西经" />
          </div>
          <div class="form-group">
            <label>具体内容/设定</label>
            <textarea v-model="newRef.content" class="form-control h-24" placeholder="大荒之中，有山名曰丰沮..."></textarea>
          </div>
        </div>
        <div class="modal-actions">
          <el-button @click="showRefModal = false">取消</el-button>
          <el-button type="primary" @click="createReference">保存</el-button>
        </div>
      </div>
    </div>
  </div>
</template>
