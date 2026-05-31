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
html, body {
  overscroll-behavior-y: auto;
  height: 100%;
  margin: 0;
}

.app-content {
  height: calc(100dvh - 56px);
  width: 100vw;
  min-width: 0;
  overflow-x: auto;
}
</style>