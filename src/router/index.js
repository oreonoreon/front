import { createRouter, createWebHistory } from "vue-router";
import Login from "../components/Login.vue";
import Home from "../components/Scheduler.vue"; // ваш главный компонент
import TodayView from "../components/TodayView.vue";
import { loadCurrentUser, useCurrentUser, PERMISSIONS } from "../composables/useCurrentUser";

const routes = [
    { path: "/login", component: Login, meta: { hideNavbar: true } },
    { path: "/", component: Home },
    { path: "/today", component: TodayView, meta: { permission: PERMISSIONS.todayRead } },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

// Перед любой страницей, кроме входа, загружаем права пользователя;
// страницы с meta.permission без нужного права уводят на календарь.
router.beforeEach(async (to) => {
    if (to.path === "/login") return true;

    try {
        await loadCurrentUser();
    } catch (error) {
        if (error.response?.status === 401) return "/login";
        return true; // права не загрузились — бэкенд всё равно проверит доступ сам
    }

    const { can } = useCurrentUser();
    if (to.meta.permission && !can(to.meta.permission)) {
        return "/";
    }
    return true;
});

export default router;
