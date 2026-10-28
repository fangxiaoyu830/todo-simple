<template>
  <div class="login-page">
    <div class="login-box">
      <h1>{{ isRegister ? '注册账号' : '登录' }}</h1>
      <p class="sub">个人待办事项管理系统</p>

      <form @submit.prevent="submit">
        <input v-model.trim="form.username" type="text" placeholder="用户名" />
        <input v-model="form.password" type="password" :placeholder="isRegister ? '密码（至少 6 位）' : '密码'" />

        <p v-if="error" class="error">{{ error }}</p>

        <button class="btn" type="submit" :disabled="loading">
          {{ loading ? '请稍候…' : isRegister ? '注册并登录' : '登录' }}
        </button>
      </form>

      <div class="login-links">
        <button type="button" @click="switchMode">{{ isRegister ? '返回登录' : '注册新账号' }}</button>
        <button type="button" @click="fillDemo">使用演示账号</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { request, saveLogin } from './api';

const router = useRouter();
const form = reactive({ username: '', password: '' });
const isRegister = ref(false);
const error = ref('');
const loading = ref(false);

function switchMode() {
  isRegister.value = !isRegister.value;
  error.value = '';
  form.password = '';
}

function fillDemo() {
  isRegister.value = false;
  form.username = 'demo';
  form.password = 'demo1234';
}

async function submit() {
  error.value = '';

  if (!form.username || !form.password) {
    error.value = '请输入用户名和密码';
    return;
  }

  loading.value = true;
  try {
    const data = await request(isRegister.value ? '/register' : '/login', {
      method: 'POST',
      body: form,
    });
    saveLogin(data);
    router.replace('/todos');
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>
