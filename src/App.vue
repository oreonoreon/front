<template>
  <div class="app-root">
    <!-- Pull-to-refresh индикатор -->
    <div class="ptr-bar" :style="{ height: ptrHeight + 'px' }">
      <svg
        :style="{ opacity: ptrOpacity, transform: `rotate(${ptrAngle}deg)` }"
        :class="{ spinning: ptrLoading }"
        viewBox="0 0 24 24" width="24" height="24" fill="none"
        stroke="#4f8cff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
      >
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
    </div>

    <Navbar v-if="showNavbar" />
    <div class="app-content">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from './components/Navbar.vue'

const route = useRoute()
const showNavbar = computed(() => !route.meta.hideNavbar)

// ─── Pull-to-refresh ───
const THRESHOLD = 80

let startY = 0
let pulling = false
const ptrHeight = ref(0)
const ptrLoading = ref(false)

const ptrOpacity = computed(() => Math.min(ptrHeight.value / THRESHOLD, 1))
const ptrAngle = computed(() =>
  ptrLoading.value ? 0 : (ptrHeight.value / THRESHOLD) * 360
)

function onTouchStart(e) {
  startY = e.touches[0].clientY
  pulling = true
}

function onTouchMove(e) {
  if (!pulling || ptrLoading.value) return
  // Ищем первый прокручиваемый родитель касания
  let el = e.target
  while (el && el !== document.body) {
    if (el.scrollTop > 0) return   // внутри прокрученного контейнера — не триггерим
    el = el.parentElement
  }
  const delta = e.touches[0].clientY - startY
  if (delta > 0) {
    ptrHeight.value = Math.min(delta * 0.5, THRESHOLD)
  }
}

async function onTouchEnd() {
  if (!pulling) return
  pulling = false
  if (ptrHeight.value >= THRESHOLD * 0.9 && !ptrLoading.value) {
    ptrLoading.value = true
    ptrHeight.value = THRESHOLD
    await new Promise(r => setTimeout(r, 600))
    window.location.reload()
  } else {
    ptrHeight.value = 0
  }
}

onMounted(() => {
  document.addEventListener('touchstart', onTouchStart, { passive: true })
  document.addEventListener('touchmove',  onTouchMove,  { passive: true })
  document.addEventListener('touchend',   onTouchEnd,   { passive: true })
})

onUnmounted(() => {
  document.removeEventListener('touchstart', onTouchStart)
  document.removeEventListener('touchmove',  onTouchMove)
  document.removeEventListener('touchend',   onTouchEnd)
})
</script>

<style>
html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
  overscroll-behavior-y: none;
}

.app-root {
  display: flex;
  flex-direction: column;
  height: 100dvh;
}

.app-content {
  height: calc(100dvh - 56px);
  width: 100vw;
  min-width: 0;
  overflow-x: auto;
}

/* ─── PTR индикатор ─── */
.ptr-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  transition: height 0.25s ease;
  background: #f0f2f5;
  height: 0;
}

.ptr-bar svg {
  transition: opacity 0.2s;
}

.ptr-bar svg.spinning {
  animation: ptr-spin 0.7s linear infinite;
  transform: none !important;
}

@keyframes ptr-spin {
  to { transform: rotate(360deg); }
}
</style>