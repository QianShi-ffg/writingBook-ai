<script setup lang="ts">
import { ref, computed } from 'vue';
import { useMainStore } from '../../store/main';
import { Plus, Wand2 } from 'lucide-vue-next';
import { MdEditor, MdPreview } from 'md-editor-v3';

const props = defineProps<{
  bookId: string;
}>();

const emit = defineEmits<{
  (e: 'confirm', message: string, onConfirm: () => void, onCancel?: () => void): void
}>();

const store = useMainStore();
const book = computed(() => store.currentBook);
const realms = computed(() => (store.realms || []).slice().sort((a, b) => (a?.level || 0) - (b?.level || 0)));

const showRealmModal = ref(false);
const editingRealmId = ref<string | null>(null);
const newRealm = ref({ level: 1, name: '', description: '' });

const activeSubTab = ref<'tree' | 'setting'>('tree');
const realmSettingMode = ref<'edit' | 'read'>('read');
const isGeneratingTree = ref(false);

const saveRealmSetting = async () => {
  if (!book.value) return;
  const text = book.value.realmSetting || '';
  await store.updateBook(props.bookId, { realmSetting: text });
};

const generateRealmTreeFromSetting = async () => {
  if (!book.value) return;
  if (realms.value.length > 0) {
    emit('confirm', '检测到已有境界树数据，重新生成将会清空旧的境界树内容。是否继续？', async () => {
      await doGenerateRealmTree();
    });
  } else {
    await doGenerateRealmTree();
  }
};

const doGenerateRealmTree = async () => {
  if (!book.value) return;
  isGeneratingTree.value = true;
  try {
    // Delete existing realms
    for (const r of realms.value) {
      await store.deleteRealm(r.id);
    }
    
    const baseContext = book.value.realmSetting ? `以下是详细境界设定：\n${book.value.realmSetting}` : `以下是大纲：\n${book.value.outline}`;
    const prompt = `基于以下设定，提取或设计一套完整的修炼境界体系。
要求：
1. 如果设定中已经有明确的境界划分，请严格按照设定提取。如果没有，请自行设计至少6个大境界。
2. 你的语言和描述必须严格遵守修仙/玄幻的世界观背景。
3. 请严格使用以下格式输出，不要输出任何 JSON，不要有前言后语，每行一个境界，用三个竖线分隔：
境界名称|||境界描述
例如：
炼气期|||吸纳天地灵气入体，改善体质...

${baseContext}`;

    let result = '';
    await store.generateContentStream(prompt, '你是一个设定师。只输出规定格式的文本。', 8000, (chunk) => {
      result += chunk;
    });

    const realmTasks: Promise<any>[] = [];
    const cleanResult = result.replace(/```[a-zA-Z]*\n/g, '').replace(/```/g, '');
    const lines = cleanResult.split('\n').filter(l => l.includes('|||'));
    for (let i = 0; i < lines.length; i++) {
      const [name, desc] = lines[i].split('|||').map(s => s.trim());
      if (name && name !== '境界名称') {
        realmTasks.push(store.createRealm({ bookId: props.bookId, level: i + 1, name, description: desc || '' }));
      }
    }
    await Promise.all(realmTasks);
    
    // Switch back to tree view after generation
    activeSubTab.value = 'tree';
  } catch (e: any) {
    if (!e.message?.includes('User aborted')) {
      alert('生成失败: ' + e.message);
    }
  } finally {
    isGeneratingTree.value = false;
  }
};

const openRealmModal = (realm?: any) => {
  if (realm) {
    editingRealmId.value = realm.id;
    newRealm.value = { level: realm.level, name: realm.name, description: realm.description };
  } else {
    editingRealmId.value = null;
    const maxLevel = realms.value.reduce((max, r) => Math.max(max, r.level || 0), 0);
    newRealm.value = { level: maxLevel + 1, name: '', description: '' };
  }
  showRealmModal.value = true;
};

const createRealm = async () => {
  if (editingRealmId.value) {
    await store.updateRealm(editingRealmId.value, { ...newRealm.value });
  } else {
    const insertLevel = Number(newRealm.value.level) || 1;
    
    // 查找所有大于等于插入层级的境界，将它们的层级 +1
    const realmsToUpdate = realms.value.filter(r => (r.level || 0) >= insertLevel);
    // 从大到小更新，避免潜在冲突
    for (const r of [...realmsToUpdate].sort((a, b) => (b.level || 0) - (a.level || 0))) {
      await store.updateRealm(r.id, { level: (r.level || 0) + 1 });
    }
  
    await store.createRealm({ ...newRealm.value, bookId: props.bookId });
  }
  showRealmModal.value = false;
  
  const maxLevel = store.realms.reduce((max, r) => Math.max(max, r.level || 0), 0);
  newRealm.value = { level: maxLevel + 1, name: '', description: '' };
};

const deleteRealm = async (id: string) => {
  emit('confirm', '确认删除此境界吗？', async () => {
    await store.deleteRealm(id);
  });
};
</script>

<template>
  <div class="tab-pane" style="display: flex; flex-direction: column; height: 100%;">
    <div class="pane-header" style="margin-bottom: var(--spacing-md);">
      <h2 class="pane-title">境界体系</h2>
      <div style="display: flex; gap: var(--spacing-sm);">
        <el-button-group>
          <el-button :type="activeSubTab === 'tree' ? 'primary' : 'default'" @click="activeSubTab = 'tree'">境界树</el-button>
          <el-button :type="activeSubTab === 'setting' ? 'primary' : 'default'" @click="activeSubTab = 'setting'">详细设定</el-button>
        </el-button-group>
      </div>
    </div>
    
    <div v-if="book?.type !== '修炼'" class="alert-box warning" style="margin-bottom: var(--spacing-md); flex-shrink: 0;">
      当前小说类型为“{{ book?.type }}”，境界模块通常适用于“修炼”类型小说。
    </div>

    <!-- Tree Tab -->
    <div v-if="activeSubTab === 'tree'" class="scrollable" style="flex: 1; padding-right: var(--spacing-sm); min-height: 0; overflow-y: auto;">
      <div style="display: flex; justify-content: flex-end; margin-bottom: var(--spacing-md); gap: var(--spacing-sm);">
        <el-button type="default" @click="generateRealmTreeFromSetting" :disabled="isGeneratingTree">
          <Wand2 class="icon-sm" style="margin-right: 4px; color: var(--color-info);" /> 提取生成境界树
        </el-button>
        <span v-if="isGeneratingTree" style="align-self: center; font-size: 0.875rem; color: var(--color-cta);">正在生成中...</span>
        <el-button type="primary" @click="openRealmModal()" :disabled="isGeneratingTree">
          <Plus class="icon-sm" style="margin-right: 4px;" /> 添加境界
        </el-button>
      </div>

      <div class="timeline">
        <div class="timeline-line"></div>
        
        <div v-for="(realm, index) in realms" :key="realm.id" class="timeline-item">
          <div class="timeline-marker">
            {{ realm.level }}
          </div>
          <div class="timeline-content card">
            <div class="float-right" style="display: flex; gap: 8px;">
              <el-button size="small" @click="openRealmModal(realm)">编辑</el-button>
              <el-button size="small" type="danger" @click="deleteRealm(realm.id)">删除</el-button>
            </div>
            <h3 class="item-title">{{ realm.name }}</h3>
            <p class="item-desc">{{ realm.description || '暂无描述' }}</p>
          </div>
        </div>
        
        <div v-if="realms.length === 0" class="empty-state">
          <p>暂无境界数据，请点击上方按钮添加，或通过大纲自动生成。</p>
        </div>
      </div>
    </div>

    <!-- Setting Tab -->
    <div v-if="activeSubTab === 'setting'" class="editor-widget card" style="flex: 1; display: flex; flex-direction: column; min-height: 0;">
      <div class="widget-header">
        <h2 class="widget-title">详细境界设定</h2>
        <div style="display: flex; align-items: center; gap: var(--spacing-sm);">
          <button @click="realmSettingMode = realmSettingMode === 'read' ? 'edit' : 'read'" class="btn-secondary btn-sm">
            {{ realmSettingMode === 'read' ? '📝 切换到编辑模式' : '📖 切换到阅读模式' }}
          </button>
          <span class="status-text" v-if="realmSettingMode === 'edit'">自动保存</span>
        </div>
      </div>
      
      <div v-if="realmSettingMode === 'read'" class="markdown-body" style="flex: 1; overflow-y: auto;">
        <MdPreview :modelValue="book?.realmSetting || '暂无详细境界设定'" />
      </div>
      
      <div v-else style="flex: 1; min-height: 0;">
        <MdEditor 
          v-if="book"
          :modelValue="book.realmSetting || ''" 
          @update:modelValue="(val: string) => { if(book) book.realmSetting = val; }"
          @onSave="saveRealmSetting" 
          style="height: 100%;"
          placeholder="在此处编写详细的境界设定、特殊规则或修炼法门..." 
        />
      </div>
    </div>

    <!-- Realm Modal -->
    <div v-if="showRealmModal" class="modal-overlay">
      <div class="modal-content">
        <h2 class="modal-title">添加境界</h2>
        <div class="form-layout">
          <div class="form-row">
            <div class="form-group flex-1">
              <label>层级/阶段</label>
              <input v-model="newRealm.level" type="number" min="1" class="form-control" />
            </div>
            <div class="form-group flex-2">
              <label>境界名称</label>
              <input v-model="newRealm.name" type="text" class="form-control" placeholder="例如：炼气期" />
            </div>
          </div>
          <div class="form-group">
            <label>境界描述/特点</label>
            <textarea v-model="newRealm.description" class="form-control h-24" placeholder="吸纳天地灵气入体，改善体质..."></textarea>
          </div>
        </div>
        <div class="modal-actions">
          <el-button @click="showRealmModal = false">取消</el-button>
          <el-button type="primary" @click="createRealm">保存</el-button>
        </div>
      </div>
    </div>
  </div>
</template>
