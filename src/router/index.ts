import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/p2p',
      name: 'p2p',
      component: () => import('@/views/P2PView.vue'),
    },
  ],
})

export default router
