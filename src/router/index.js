import { createRouter, createWebHistory } from "vue-router";
import Login from "../components/Login.vue";
import Home from "../components/Scheduler1.vue"; // ваш главный компонент

const routes = [
    { path: "/login", component: Login },
    { path: "/", component: Home },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;