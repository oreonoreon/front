import { createRouter, createWebHistory } from "vue-router";
import Login from "../components/Login.vue";
import Home from "../components/Scheduler.vue"; // ваш главный компонент
// import Logout from './components/Logout.vue';
// import Today from './components/Today.vue'

const routes = [
    { path: "/login", component: Login, meta: { hideNavbar: true } },
    { path: "/", component: Home },
    //{ path: '/logout', component: Logout },
   //{ path: '/today', component: Today },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;