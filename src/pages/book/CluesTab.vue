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
const clues = computed(() => store.clues || []);
const activeClues = computed(() => clues.value.filter(c => c.status === 'active'));
const resolvedClues = computed(() => clues.value.filter(c => c.status === 'resolved'));

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
    await store.createClue({ ...newClue.value, bookId: props.bookId });
  }
  showClueModal.value = false;
};

const deleteClue = async (id: string) => {
  emit('confirm', '确认删除此伏笔/暗线吗？', async () => {
    await store.deleteClue(id);
  });
};

const toggleClueStatus = async (clue: any) => {
  const newStatus = clue.status === 'active' ? 'resolved' : 'active';
  await store.updateClue(clue.id, { status: newStatus });
};
</script>

<template>
  <div class="tab-pane scrollable">
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

    <!-- Clue Modal -->
    <div v-if="showClueModal" class="modal-overlay">
      <div class="modal-content">
        <h2 class="modal-title">{{ editingClueId ? '编辑伏笔' : '添加伏笔' }}</h2>
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
  </div>
</template>
