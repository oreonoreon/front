import { createRouter, createWebHistory } from "vue-router";
import Login from "../components/Login.vue";
import Home from "../components/Scheduler.vue"; // ваш главный компонент
import TodayView from "../components/TodayView.vue";

const routes = [
    { path: "/login", component: Login, meta: { hideNavbar: true } },
    { path: "/", component: Home },
    { path: "/today", component: TodayView },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;