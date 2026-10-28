import { createRouter, createWebHistory } from 'vue-router';
import Login from './Login.vue';
import Todos from './Todos.vue';
import { isLoggedIn } from './api';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/todos' },
    { path: '/login', component: Login },
    { path: '/todos', component: Todos },
  ],
});

router.beforeEach((to) => {
  if (to.path === '/todos' && !isLoggedIn()) return '/login';
  if (to.path === '/login' && isLoggedIn()) return '/todos';
});

export default router;
