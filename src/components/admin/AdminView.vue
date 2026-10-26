<template>
  <div class="adm-page">
    <div class="adm-tabs">
      <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="adm-tab"
          :class="{ active: tab.id === activeTab }"
          @click="selectTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>

    <AdminUsers v-if="activeTab === 'users'" @toast="showToast" />
    <AdminApartments v-else-if="activeTab === 'apartments'" @toast="showToast" />
    <AdminRoles v-else-if="activeTab === 'roles'" @toast="showToast" />

    <transition name="adm-fade">
      <div v-if="toast" class="adm-toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useCurrentUser, PERMISSIONS } from "../../composables/useCurrentUser";
import AdminUsers from "./AdminUsers.vue";
import AdminApartments from "./AdminApartments.vue";
import AdminRoles from "./AdminRoles.vue";
import "../../styles/admin.css";

const route = useRoute();
const router = useRouter();
const { can } = useCurrentUser();

// Вкладки показываются только при наличии соответствующего права
const tabs = [
  { id: "users", label: "Пользователи", permission: PERMISSIONS.usersManage },
  { id: "apartments", label: "Апартаменты", permission: PERMISSIONS.apartmentsManage },
  { id: "roles", label: "Роли и права", permission: PERMISSIONS.rolesManage },
].filter(tab => can(tab.permission));

// Активная вкладка хранится в ?tab=, чтобы переживать перезагрузку страницы
const activeTab = computed(() =>
    tabs.some(tab => tab.id === route.query.tab) ? route.query.tab : tabs[0]?.id);

function selectTab(id) {
  router.replace({ query: { ...route.query, tab: id } });
}

const toast = ref("");
let toastTimer = null;

function showToast(text) {
  toast.value = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.value = ""; }, 2000);
}
</script>

<style>
.adm-fade-enter-active, .adm-fade-leave-active {
  transition: opacity 0.2s;
}
.adm-fade-enter-from, .adm-fade-leave-to {
  opacity: 0;
}
</style>
