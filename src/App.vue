<template>
  <Navbar v-if="showNavbar" />
  <div class="app-content">
    <router-view />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from './components/Navbar.vue'

const route = useRoute()
const showNavbar = computed(() => !route.meta.hideNavbar)
</script>

<style>
*, *::before, *::after {
  box-sizing: border-box;
}

html {
  height: 100%;
  overscroll-behavior-y: auto; /* разрешаем нативный PTR */
}

body {
  height: 100%;
  margin: 0;
  padding: 0;
}

#app {
  height: 100%;
  margin: 0;
  padding: 0;
}

.app-content {
  height: calc(100dvh - 56px);
  width: 100vw;
  min-width: 0;
  overflow-x: auto;
  overscroll-behavior-y: contain; /* внутренний скролл не мешает PTR */
}
</style>