import { createRouter, createWebHistory } from "vue-router";
import Login from "../components/Login.vue";
import Home from "../components/Scheduler.vue"; // ваш главный компонент
import TodayView from "../components/TodayView.vue";
import AdminView from "../components/admin/AdminView.vue";
import { loadCurrentUser, useCurrentUser, PERMISSIONS, ADMIN_PERMISSIONS } from "../composables/useCurrentUser";

const routes = [
    { path: "/login", component: Login, meta: { hideNavbar: true } },
    { path: "/", component: Home },
    { path: "/today", component: TodayView, meta: { permission: PERMISSIONS.todayRead } },
    { path: "/admin", component: AdminView, meta: { anyPermission: ADMIN_PERMISSIONS } },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

// Перед любой страницей, кроме входа, загружаем права пользователя;
// страницы без нужного права (meta.permission или хотя бы одного из meta.anyPermission)
// уводят на календарь.
router.beforeEach(async (to) => {
    if (to.path === "/login") return true;

    try {
        await loadCurrentUser();
    } catch (error) {
        if (error.response?.status === 401) return "/login";
        return true; // права не загрузились — бэкенд всё равно проверит доступ сам
    }

    const { can, canAny } = useCurrentUser();
    if (to.meta.permission && !can(to.meta.permission)) {
        return "/";
    }
    if (to.meta.anyPermission && !canAny(to.meta.anyPermission)) {
        return "/";
    }
    return true;
});

export default router;
