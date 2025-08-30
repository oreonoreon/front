<template>
  <nav class="navbar">
    <div class="navbar-logo">CondoManager</div>
    <div class="navbar-links">
      <router-link to="/today" class="nav-link" active-class="active-link">Today</router-link>
      <router-link to="/" class="nav-link" active-class="active-link">Calendar</router-link>
      <button
          class="logout-btn"
          :disabled="loading"
          @click="onLogout"
      >
        Logout
      </button>
    </div>
  </nav>
</template>

<script setup>
import { ref } from "vue";
import api from "../api.js";
import { useRouter } from "vue-router";

const loading = ref(false);
const error = ref("");
const router = useRouter();

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
  }
}
</script>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  width: 100vw;
  max-width: 100vw;
  min-width: 0;
  box-sizing: border-box;
  background: linear-gradient(90deg, #4f8cff 0%, #6157ff 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  height: 56px;
  box-shadow: 0 3px 14px rgba(80,110,180,0.07);
  z-index: 10;
}
.navbar-logo {
  font-weight: 700;
  font-size: 22px;
  color: #fff;
  letter-spacing: 1px;
}
.navbar-links {
  display: flex;
  gap: 26px;
}
.nav-link {
  color: #f5f7fa;
  font-size: 17px;
  font-weight: 500;
  text-decoration: none;
  padding: 5px 10px;
  border-radius: 7px;
  transition: background 0.18s, color 0.18s;
}
.nav-link:hover {
  background: rgba(255,255,255,0.14);
  color: #fff;
}
.active-link {
  background: #fff;
  color: #4f8cff;
}
.logout-btn {
  font-size: 17px;
  font-weight: 500;
  color: #f5f7fa;
  background: transparent;
  border: none;
  border-radius: 7px;
  padding: 5px 18px;
  cursor: pointer;
  transition: background 0.18s, color 0.18s;
  outline: none;
  margin-left: 10px;
}
.logout-btn:hover {
  background: rgba(255,255,255,0.14);
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
</style>