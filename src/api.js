import axios from "axios";



const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE,
    withCredentials: true,
});

//Пример перехватчика ошибок
// api.interceptors.response.use(
//     (response) => response,
//     (error) => {
//         console.error("API error:", error.response?.data || error.message);
//         return Promise.reject(error);
//     }
// );

let isRedirecting401 = false;

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;

        if (status === 401) {
            if (!isRedirecting401) {
                isRedirecting401 = true;
                // Если уже на /login — просто пробрасываем ошибку
                if (window.location.pathname !== "/login") {
                    window.location.href = "/login";
                } else {
                    isRedirecting401 = false;
                }
            }
        } else {
            console.error("API error:", error.response?.data || error.message);
        }

        return Promise.reject(error);
    }
);


export default api;
