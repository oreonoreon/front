<template>
  <div
    class="app-root"
    @touchstart.passive="onTouchStart"
    @touchmove.passive="onTouchMove"
    @touchend.passive="onTouchEnd"
  >
    <!-- Pull-to-refresh индикатор -->
    <div class="ptr-indicator" :style="ptrStyle">
      <svg
        class="ptr-icon"
        :class="{ 'ptr-spinning': ptrRefreshing }"
        :style="{ transform: `rotate(${ptrRotation}deg)` }"
        viewBox="0 0 24 24" width="22" height="22" fill="none"
        stroke="#4f8cff" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round"
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
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from './components/Navbar.vue'

const route = useRoute()
const showNavbar = computed(() => !route.meta.hideNavbar)

// ─── Pull-to-refresh ───
const PTR_THRESHOLD = 80

const ptrStartY = ref(0)
const ptrDelta = ref(0)
const ptrRefreshing = ref(false)

const ptrStyle = computed(() => ({
  height: `${Math.min(ptrDelta.value, PTR_THRESHOLD)}px`,
  opacity: Math.min(ptrDelta.value / PTR_THRESHOLD, 1),
  transition: ptrDelta.value === 0 ? 'height 0.3s ease, opacity 0.3s ease' : 'none',
}))

const ptrRotation = computed(() =>
  ptrRefreshing.value ? 0 : Math.min((ptrDelta.value / PTR_THRESHOLD) * 360, 360)
)

function onTouchStart(e) {
  ptrStartY.value = e.touches[0].clientY
}

function onTouchMove(e) {
  if (ptrRefreshing.value) return
  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
  if (scrollTop > 0) return
  const delta = e.touches[0].clientY - ptrStartY.value
  if (delta > 0) ptrDelta.value = delta
}

async function onTouchEnd() {
  if (ptrDelta.value >= PTR_THRESHOLD && !ptrRefreshing.value) {
    ptrRefreshing.value = true
    ptrDelta.value = PTR_THRESHOLD
    await new Promise(r => setTimeout(r, 800))
    window.location.reload()
  }
  ptrDelta.value = 0
  ptrRefreshing.value = false
}
</script>

<style>
.app-root {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.app-content {
  height: calc(100dvh - 56px);
  width: 100vw;
  min-width: 0;
  overflow-x: auto;
}

/* ─── Pull-to-refresh ─── */
.ptr-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  height: 0;
  opacity: 0;
  flex-shrink: 0;
  background: #f0f2f5;
}

.ptr-icon {
  color: #4f8cff;
}

.ptr-spinning {
  animation: ptr-spin 0.7s linear infinite;
  transform: none !important;
}

@keyframes ptr-spin {
  to { transform: rotate(360deg); }
}
</style>