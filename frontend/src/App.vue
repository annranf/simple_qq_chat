// src/App.vue
<template>
  <router-view />
</template>

<script setup lang="ts">
// (可选) 如果需要在应用加载时做一些全局操作，比如检查认证状态
// import { onMounted } from 'vue';
// import { useAuthStore } from './store/auth';
// const authStore = useAuthStore();
// onMounted(() => {
//   authStore.checkAuthStatus(); // 这个需要 router 实例，或者在 store 内部处理
// });
</script>

<style>
/* 全局样式可以放在这里或 src/assets/main.css */
body, html, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', '\\5FAE软雅黑', Arial, sans-serif;
}
</style>