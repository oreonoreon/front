<template>
  <nav class="navbar" :class="{ 'menu-open': mobileMenuOpen }">
    <div class="navbar-left">
      <div class="navbar-logo">CondoManager</div>
    </div>

    <!-- Desktop navigation -->
    <div class="navbar-links desktop-only">
      <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          active-class="active-link"
          @click="closeMobile"
      >
        {{ item.label }}
      </router-link>

      <button
          class="logout-btn"
          :disabled="loading"
          @click="onLogout"
      >
        {{ t('logout') }}
      </button>
    </div>

    <!-- Mobile hamburger -->
    <button
        class="hamburger mobile-only"
        :aria-label="t('menuToggleAria')"
        :aria-expanded="mobileMenuOpen.toString()"
        @click="toggleMobile"
    >
      <span class="bar" />
      <span class="bar" />
      <span class="bar" />
    </button>

    <!-- Mobile slide panel -->
    <transition name="slide">
      <div
          v-if="mobileMenuOpen"
          class="mobile-panel"
          ref="panelRef"
      >
        <div class="panel-header">
          <div class="panel-title">{{ t('menu') }}</div>
          <button
              class="close-mobile"
              :aria-label="t('closeMenuAria')"
              @click="closeMobile"
          >×</button>
        </div>
        <div class="panel-content">
          <router-link
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="panel-link"
              active-class="panel-link-active"
              @click="closeMobile"
          >
            {{ item.label }}
          </router-link>

          <button
              class="panel-logout"
              :disabled="loading"
              @click="onLogout"
          >
            <span v-if="!loading">{{ t('logout') }}</span>
            <span v-else class="mini-loader"></span>
          </button>
        </div>
      </div>
    </transition>

    <!-- Backdrop -->
    <transition name="fade">
      <div
          v-if="mobileMenuOpen"
          class="backdrop"
          @click="closeMobile"
      />
    </transition>
  </nav>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import api from "../api.js";
import { useRouter, useRoute } from "vue-router";

/* Simple i18n (можно расширить/вынести) */
const translations = {
  ru: {
    today: "Сегодня",
    calendar: "Календарь",
    logout: "Выйти",
    menu: "Меню",
    menuToggleAria: "Открыть или закрыть меню",
    closeMenuAria: "Закрыть меню"
  },
  en: {
    today: "Today",
    calendar: "Calendar",
    logout: "Logout",
    menu: "Menu",
    menuToggleAria: "Toggle menu",
    closeMenuAria: "Close menu"
  }
};
const lang = ref(localStorage.getItem("lang") === "en" ? "en" : "ru");
function t(key) {
  return translations[lang.value][key] || key;
}

const router = useRouter();
const route = useRoute();

const loading = ref(false);
const error = ref("");
const mobileMenuOpen = ref(false);
const panelRef = ref(null);

const navItems = [
  { to: "/today", label: t("today") },
  { to: "/", label: t("calendar") }
];

/* Close menu on route change */
watch(
    () => route.fullPath,
    () => {
      closeMobile();
    }
);

/* Keyboard handling (Esc) */
function onKeydown(e) {
  if (e.key === "Escape" && mobileMenuOpen.value) {
    closeMobile();
  }
}

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
});
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
});

function toggleMobile() {
  mobileMenuOpen.value = !mobileMenuOpen.value;
  lockBody(mobileMenuOpen.value);
}

function closeMobile() {
  if (!mobileMenuOpen.value) return;
  mobileMenuOpen.value = false;
  lockBody(false);
}

function lockBody(lock) {
  if (lock) {
    document.body.dataset.prevOverflow = document.body.style.overflow || "";
    document.body.style.overflow = "hidden";
  } else {
    if (document.body.dataset.prevOverflow !== undefined) {
      document.body.style.overflow = document.body.dataset.prevOverflow;
      delete document.body.dataset.prevOverflow;
    }
  }
}

async function onLogout() {
  error.value = "";
  loading.value = true;
  try {
    await api.post("/calendar/logout");
    router.push("/login");
  } catch (e) {
    error.value = e.response?.data || "Ошибка выхода";
    router.push("/login");
  } finally {
    loading.value = false;
    closeMobile();
  }
}
</script>

<style scoped>
/* Breakpoints */
:root {
  --bp-mobile: 820px;
}

.navbar {
  position: sticky;
  top: 0;
  left: 0;
  width: 100%;
  max-width: 100vw;
  background: linear-gradient(90deg, #4f8cff 0%, #6157ff 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 22px;
  height: 56px;
  box-shadow: 0 3px 14px rgba(80,110,180,0.13);
  z-index: 50;
  box-sizing: border-box;
}

.navbar-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.navbar-logo {
  font-weight: 700;
  font-size: 22px;
  color: #fff;
  letter-spacing: 1px;
  user-select: none;
}

.navbar-links {
  display: flex;
  gap: 22px;
  align-items: center;
}

.nav-link {
  color: #f5f7fa;
  font-size: 15.5px;
  font-weight: 500;
  text-decoration: none;
  padding: 6px 12px;
  border-radius: 8px;
  transition: background .18s, color .18s;
  line-height: 1.1;
  white-space: nowrap;
}
.nav-link:hover {
  background: rgba(255,255,255,0.18);
  color: #fff;
}
.active-link {
  background: #fff;
  color: #4f8cff;
}

.logout-btn {
  font-size: 15.5px;
  font-weight: 500;
  color: #f5f7fa;
  background: rgba(255,255,255,0.08);
  border: none;
  border-radius: 8px;
  padding: 6px 16px;
  cursor: pointer;
  transition: background .18s, color .18s;
  outline: none;
  display: inline-flex;
  align-items: center;
  line-height: 1.1;
}
.logout-btn:hover {
  background: rgba(255,255,255,0.22);
  color: #fff;
}
.logout-btn:active {
  background: #fff;
  color: #4f8cff;
}
.logout-btn:disabled {
  color: #bbb;
  background: #eee;
  cursor: not-allowed;
}

/* Hamburger */
.hamburger {
  background: transparent;
  border: none;
  width: 46px;
  height: 40px;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  padding: 4px 10px;
  transition: background .18s;
}
.hamburger:hover {
  background: rgba(255,255,255,0.15);
}
.hamburger:active {
  background: rgba(255,255,255,0.32);
}
.hamburger .bar {
  width: 100%;
  height: 3px;
  background: #fff;
  border-radius: 3px;
  transition: transform .25s, opacity .25s;
}

.menu-open .hamburger .bar:nth-child(1) {
  transform: translateY(8px) rotate(45deg);
}
.menu-open .hamburger .bar:nth-child(2) {
  opacity: 0;
}
.menu-open .hamburger .bar:nth-child(3) {
  transform: translateY(-8px) rotate(-45deg);
}

/* Mobile panel */
.mobile-panel {
  position: fixed;
  top: 56px;
  right: 0;
  width: min(270px, 80%);
  height: calc(100vh - 56px);
  background: #ffffff;
  box-shadow: -4px 0 20px -6px rgba(0,0,0,.25);
  display: flex;
  flex-direction: column;
  z-index: 140;
  border-top-left-radius: 14px;
  border-bottom-left-radius: 14px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid #eef1f5;
}
.panel-title {
  font-weight: 600;
  font-size: 16px;
  color: #1e2430;
  letter-spacing: .3px;
}
.close-mobile {
  background: #f1f4f8;
  border: none;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4a4f5f;
  transition: background .15s;
}
.close-mobile:hover {
  background: #e6ebf2;
}

.panel-content {
  padding: 14px 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  flex: 1;
}

.panel-link {
  text-decoration: none;
  font-size: 15px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f2f5f9;
  color: #374151;
  display: block;
  transition: background .16s, color .16s;
  font-weight: 500;
}
.panel-link:hover {
  background: #e4e9f1;
  color: #25324d;
}
.panel-link-active {
  background: linear-gradient(90deg,#4f8cff,#6157ff);
  color: #fff;
}

.panel-logout {
  margin-top: 6px;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  background: linear-gradient(90deg,#ff6060,#ff884d);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: filter .16s, box-shadow .16s;
  position: relative;
}
.panel-logout:hover {
  filter: brightness(1.07);
  box-shadow: 0 4px 12px -4px rgba(255,110,70,0.5);
}
.panel-logout:disabled {
  opacity: .65;
  cursor: not-allowed;
  filter: grayscale(.4);
}

.mini-loader {
  width: 18px;
  height: 18px;
  border: 3px solid rgba(255,255,255,.6);
  border-right-color: #fff;
  border-radius: 50%;
  animation: spin .65s linear infinite;
}

.backdrop {
  position: fixed;
  inset: 0;
  top: 56px;
  background: rgba(20,28,45,0.45);
  backdrop-filter: blur(2px);
  z-index: 120;
}

/* Animations */
.slide-enter-from {
  transform: translateX(100%);
  opacity: 0;
}
.slide-enter-active {
  transition: transform .28s cubic-bezier(.4,.1,.2,1), opacity .25s;
}
.slide-enter-to {
  transform: translateX(0);
  opacity: 1;
}
.slide-leave-from {
  transform: translateX(0);
  opacity: 1;
}
.slide-leave-active {
  transition: transform .28s cubic-bezier(.55,.05,.4,.9), opacity .25s;
}
.slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity .25s;
}

/* Responsive visibility */
.desktop-only {
  display: flex;
}
.mobile-only {
  display: none;
}

@media (max-width: 820px) {
  .desktop-only {
    display: none;
  }
  .mobile-only {
    display: flex;
  }
  .navbar {
    padding: 0 12px 0 18px;
  }
}

/* Reduce motion preference */
@media (prefers-reduced-motion: reduce) {
  .slide-enter-active,
  .slide-leave-active,
  .fade-enter-active,
  .fade-leave-active {
    transition: none;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>