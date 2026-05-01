<script setup lang="ts">
import { ref, computed } from 'vue';
import { useMainStore } from '../../store/main';
import { Plus, Wand2 } from 'lucide-vue-next';

const props = defineProps<{
  bookId: string;
}>();

const emit = defineEmits<{
  (e: 'confirm', message: string, onConfirm: () => void, onCancel?: () => void): void,
  (e: 'message', message: string, type: 'success' | 'error' | 'warning' | 'info'): void
}>();

const store = useMainStore();
const book = computed(() => store.currentBook);

const characters = computed(() => store.characters);

const showCharModal = ref(false);
const editingCharId = ref<string | null>(null);
const newChar = ref({ name: '', role: '配角', status: '未出场', gender: '', personality: '', appearance: '', bio: '', relationships: '', abilities: '' });

const openCharModal = (char?: any) => {
  if (char) {
    editingCharId.value = char.id;
    newChar.value = { ...char };
  } else {
    editingCharId.value = null;
    newChar.value = { name: '', role: '配角', status: '未出场', gender: '', personality: '', appearance: '', bio: '', relationships: '', abilities: '' };
  }
  showCharModal.value = true;
};

const createCharacter = async () => {
  if (editingCharId.value) {
    await store.updateCharacter(editingCharId.value, { ...newChar.value });
  } else {
    await store.createCharacter({ ...newChar.value, bookId: props.bookId });
  }
  showCharModal.value = false;
};

const isGeneratingChars = ref(false);

const extractCharacters = async () => {
  if (!book.value?.outline && !book.value?.worldview) {
    emit('message', '请先在大纲或世界观页面生成内容，再提取人物', 'warning');
    return;
  }
  
  if (characters.value.length > 0) {
    emit('confirm', '检测到已有角色数据，重新提取将会清空旧的角色卡片。是否继续？', async () => {
      await doExtractCharacters();
    });
  } else {
    await doExtractCharacters();
  }
};

const doExtractCharacters = async () => {
  isGeneratingChars.value = true;
  try {
    for (const c of characters.value) {
      await store.deleteCharacter(c.id);
    }
    
    const context = `大纲：${book.value?.outline || '无'}\n世界观：${book.value?.worldview || '无'}`;
    const prompt = `基于以下大纲和世界观，提取或设计小说中的主要人物和重要配角、反派。
要求：
1. 提取所有在大纲中提到的人物。
2. 你的语言和描述必须严格遵守小说的世界观背景。
3. 请严格使用以下格式输出，不要输出任何 JSON，不要有前言后语，每行一个人物，用三个竖线分隔：
姓名|||角色定位(主角团/配角/反派/路人)|||出场状态(已出场/未出场)|||性别|||性格|||外貌|||人物简介|||人物关系|||能力或技能
例如：
林动|||主角团|||已出场|||男|||坚韧不拔，重情重义|||身材修长，眼神坚毅|||青阳镇林家子弟，偶然获得神秘石符...|||林啸之子，林青檀之兄|||淬体境，掌握奇门印

设定参考：
${context}`;

    let result = '';
    await store.generateContentStream(prompt, '你是一个设定师。只输出规定格式的文本。', 8000, (chunk) => {
      result += chunk;
    });

    const charTasks: Promise<any>[] = [];
    const cleanResult = result.replace(/```[a-zA-Z]*\n/g, '').replace(/```/g, '');
    const lines = cleanResult.split('\n').filter(l => l.includes('|||'));
    for (const line of lines) {
      const parts = line.split('|||').map(s => s.trim());
      if (parts.length >= 9 && parts[0] !== '姓名') {
        const [name, role, status, gender, personality, appearance, bio, relationships, abilities] = parts;
        charTasks.push(store.createCharacter({
          bookId: props.bookId,
          name,
          role: ['主角团', '配角', '反派', '路人'].includes(role) ? role : '配角',
          status: ['已出场', '未出场', '死亡'].includes(status) ? status : '未出场',
          gender,
          personality,
          appearance,
          bio,
          relationships,
          abilities
        }));
      }
    }
    await Promise.all(charTasks);
    emit('message', '人物卡片提取成功！', 'success');
  } catch (e: any) {
    if (!e.message?.includes('User aborted')) {
      emit('message', '人物提取失败: ' + e.message, 'error');
    }
  } finally {
    isGeneratingChars.value = false;
  }
};

const deleteCharacter = async (id: string) => {
  emit('confirm', '确认删除此人物吗？', async () => {
    await store.deleteCharacter(id);
  });
};
</script>

<template>
  <div class="tab-pane scrollable">
    <div class="pane-header">
      <h2 class="pane-title">人物管理</h2>
      <div style="display: flex; gap: var(--spacing-sm);">
        <el-button type="default" @click="extractCharacters" :disabled="isGeneratingChars">
          <Wand2 class="icon-sm" style="margin-right: 4px; color: var(--color-info);" /> 提取人物卡片
        </el-button>
        <span v-if="isGeneratingChars" style="align-self: center; font-size: 0.875rem; color: var(--color-cta); margin-right: 8px;">正在提取中...</span>
        <button @click="showCharModal = true" class="btn-primary" :disabled="isGeneratingChars">
          <Plus class="icon-sm" /> 添加人物
        </button>
      </div>
    </div>

    <div class="data-grid" style="margin-bottom: var(--spacing-2xl);">
      <div v-for="char in characters" :key="char.id" class="data-card card">
        <div class="card-header" style="margin-bottom: var(--spacing-lg);">
          <h3 class="item-title">{{ char.name }}</h3>
          <div style="display: flex; gap: 8px;">
            <el-tag size="small" type="info" v-if="char.role">{{ char.role }}</el-tag>
            <el-tag size="small" :type="['出场', '已出场'].includes(char.status || '') ? 'success' : 'info'" v-if="char.status">
              {{ ['出场', '已出场'].includes(char.status || '') ? '出场' : '未出场' }}
            </el-tag>
            <el-tag size="small" type="warning" v-if="char.gender">{{ char.gender }}</el-tag>
          </div>
        </div>
        <div class="card-body">
          <div class="data-row">
            <span class="data-label">性格</span>
            <span class="data-value">{{ char.personality || '暂无' }}</span>
          </div>
          <div class="data-row">
            <span class="data-label">外貌</span>
            <span class="data-value">{{ char.appearance || '暂无' }}</span>
          </div>
          <div class="data-row">
            <span class="data-label">人物关系</span>
            <span class="data-value">{{ char.relationships || '暂无' }}</span>
          </div>
          <div class="data-row" style="margin-bottom: 0;">
            <span class="data-label">能力或技能</span>
            <span class="data-value">{{ char.abilities || '暂无' }}</span>
          </div>
          <div class="data-row" style="margin-top: 10px; margin-bottom: 0;">
            <span class="data-label">简介</span>
            <span class="data-value" style="white-space: pre-wrap; font-size: 0.8rem; line-height: 1.4;">{{ char.bio || '暂无' }}</span>
          </div>
        </div>
        <div class="card-footer">
          <el-button size="small" @click="openCharModal(char)">编辑</el-button>
          <el-button size="small" type="danger" @click="deleteCharacter(char.id)">删除</el-button>
        </div>
      </div>
      <div v-if="characters.length === 0" class="empty-state" style="grid-column: 1 / -1;">
        <p>暂无人物卡片，请点击上方按钮添加，或通过AI自动提取。</p>
      </div>
    </div>

    <!-- Character Modal -->
    <div v-if="showCharModal" class="modal-overlay">
      <div class="modal-content" style="max-width: 600px;">
        <h2 class="modal-title">{{ editingCharId ? '编辑人物' : '添加人物' }}</h2>
        <div class="form-layout">
          <div class="form-row">
            <div class="form-group flex-1">
              <label>姓名</label>
              <input v-model="newChar.name" type="text" class="form-control" />
            </div>
            <div class="form-group flex-1">
              <label>性别</label>
              <input v-model="newChar.gender" type="text" class="form-control" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group flex-1">
              <label>角色定位</label>
              <el-select v-model="newChar.role">
                <el-option label="主角团" value="主角团" />
                <el-option label="配角" value="配角" />
                <el-option label="反派" value="反派" />
                <el-option label="路人" value="路人" />
              </el-select>
            </div>
            <div class="form-group flex-1">
              <label>出场状态</label>
              <el-select v-model="newChar.status">
                <el-option label="已出场" value="已出场" />
                <el-option label="未出场" value="未出场" />
                <el-option label="死亡" value="死亡" />
              </el-select>
            </div>
          </div>
          <div class="form-group">
            <label>性格</label>
            <input v-model="newChar.personality" type="text" class="form-control" />
          </div>
          <div class="form-group">
            <label>外貌</label>
            <textarea v-model="newChar.appearance" class="form-control" style="height: 60px;"></textarea>
          </div>
          <div class="form-group">
            <label>人物关系</label>
            <textarea v-model="newChar.relationships" class="form-control" style="height: 60px;"></textarea>
          </div>
          <div class="form-group">
            <label>能力或技能</label>
            <textarea v-model="newChar.abilities" class="form-control" style="height: 60px;"></textarea>
          </div>
          <div class="form-group">
            <label>人物简介</label>
            <textarea v-model="newChar.bio" class="form-control" style="height: 100px;"></textarea>
          </div>
        </div>
        <div class="modal-actions">
          <el-button @click="showCharModal = false">取消</el-button>
          <el-button type="primary" @click="createCharacter">保存</el-button>
        </div>
      </div>
    </div>
  </div>
</template>
