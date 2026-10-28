<template>
  <div class="page">
    <div class="top">
      <h1>我的待办</h1>
      <div class="top-right">
        <span>{{ user.username }}</span>
        <button type="button" @click="logout">退出登录</button>
      </div>
    </div>

    <!-- 新增 / 编辑共用一个表单 -->
    <form class="add" @submit.prevent="submit">
      <input v-model="form.title" type="text" placeholder="要做什么？" />
      <input v-model="form.dueAt" type="datetime-local" />
      <button class="primary" type="submit">{{ editingId ? '保存' : '添加' }}</button>
      <button v-if="editingId" class="plain" type="button" @click="resetForm">取消</button>
    </form>

    <p v-if="error" class="error">{{ error }}</p>

    <div class="filters">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        :class="{ active: filter === tab.value }"
        @click="filter = tab.value"
      >
        {{ tab.label }}
      </button>
      <span class="tip">未完成在上，时间近的在上</span>
    </div>

    <ul v-if="shown.length" class="list">
      <li v-for="todo in shown" :key="todo.id" :class="{ done: todo.completed }">
        <input type="checkbox" :checked="todo.completed" @change="toggle(todo)" />
        <div class="text">
          <p class="title">{{ todo.title }}</p>
          <p class="due" :class="{ overdue: isOverdue(todo) }">{{ formatDate(todo.due_at) }}</p>
        </div>
        <button type="button" @click="startEdit(todo)">编辑</button>
        <button class="danger" type="button" @click="remove(todo)">删除</button>
      </li>
    </ul>

    <p v-else class="empty">还没有待办，先添加一条吧</p>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { clearLogin, getUser, request } from './api';

const router = useRouter();
const user = getUser() || {};

const list = ref([]);
const filter = ref('all');
const error = ref('');
const editingId = ref(null);
const form = reactive({ title: '', dueAt: '' });

const tabs = [
  { label: '全部', value: 'all' },
  { label: '未完成', value: 'active' },
  { label: '已完成', value: 'done' },
];

// 前端过滤：后端已经按「未完成 + 时间近」排好序
const shown = computed(() => {
  if (filter.value === 'active') return list.value.filter((item) => !item.completed);
  if (filter.value === 'done') return list.value.filter((item) => item.completed);
  return list.value;
});

async function load() {
  try {
    const rows = await request('/todos');
    list.value = rows.map((row) => ({ ...row, completed: Boolean(row.completed) }));
  } catch (e) {
    error.value = e.message;
  }
}

// ISO 时间 → 页面展示（本地时区）
function formatDate(iso) {
  if (!iso) return '无截止时间';
  const date = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isOverdue(todo) {
  return !todo.completed && todo.due_at && new Date(todo.due_at).getTime() < Date.now();
}

// datetime-local 的值（本地时间）→ ISO 字符串
function toISO(value) {
  return value ? new Date(value).toISOString() : null;
}

// ISO 字符串 → datetime-local 需要的本地时间格式
function toInput(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

async function submit() {
  error.value = '';
  if (!form.title.trim()) {
    error.value = '请输入待办内容';
    return;
  }

  const body = { title: form.title.trim(), dueAt: toISO(form.dueAt) };

  try {
    if (editingId.value) {
      await request('/todos/' + editingId.value, { method: 'PUT', body });
    } else {
      await request('/todos', { method: 'POST', body });
    }
    resetForm();
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

function startEdit(todo) {
  editingId.value = todo.id;
  form.title = todo.title;
  form.dueAt = toInput(todo.due_at);
  error.value = '';
}

function resetForm() {
  editingId.value = null;
  form.title = '';
  form.dueAt = '';
}

async function toggle(todo) {
  try {
    await request('/todos/' + todo.id, { method: 'PUT', body: { completed: !todo.completed } });
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

async function remove(todo) {
  if (!confirm('确定删除「' + todo.title + '」吗？')) return;
  try {
    await request('/todos/' + todo.id, { method: 'DELETE' });
    await load();
  } catch (e) {
    error.value = e.message;
  }
}

function logout() {
  clearLogin();
  router.replace('/login');
}

onMounted(load);
</script>
