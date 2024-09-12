import { createRouter, createWebHistory } from 'vue-router'
import MainView from '@/views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/home',
      name: 'home',
      component: MainView
    }
  ]
})

export default router
