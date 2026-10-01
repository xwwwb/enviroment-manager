import { createRouter, createWebHashHistory } from 'vue-router';
import BlocksPage from '../views/BlocksPage.vue';

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'blocks', component: BlocksPage },
    { path: '/preview', name: 'preview', component: () => import('../views/PreviewPage.vue') },
    { path: '/settings', name: 'settings', component: () => import('../views/SettingsPage.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});
