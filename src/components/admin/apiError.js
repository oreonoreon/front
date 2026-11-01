// Текст ошибки ответа бэкенда для показа в админке (бэкенд кладёт его в message).
export function apiError(err) {
    const data = err?.response?.data;
    if (typeof data === "string" && data) return data;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    if (err?.response?.status === 403) return "Недостаточно прав";
    return err?.message || "Ошибка запроса";
}
