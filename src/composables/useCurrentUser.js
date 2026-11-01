import { ref } from "vue";
import api from "../api.js";

// Права ролей (role_permissions на бэкенде). Бэкенд проверяет их сам,
// здесь они нужны только чтобы не показывать недоступные вкладки, кнопки и поля.
export const PERMISSIONS = {
    calendarRead: "calendar.read",
    calendarWrite: "calendar.write",
    todayRead: "today.read",
    cleaningManage: "cleaning.manage",
    reportsRead: "reports.read",
    bookingFieldAll: "booking.field.all",
    usersManage: "users.manage",
    apartmentsManage: "apartments.manage",
    rolesManage: "roles.manage",
};

// Права, дающие доступ к админке (хотя бы одно из них)
export const ADMIN_PERMISSIONS = [PERMISSIONS.usersManage, PERMISSIONS.apartmentsManage, PERMISSIONS.rolesManage];

// Текущий пользователь из GET /calendar/me. Загружается один раз за сессию,
// сбрасывается при входе и выходе.
const user = ref(null);
let pending = null;

export function loadCurrentUser() {
    if (user.value) return Promise.resolve(user.value);
    if (!pending) {
        pending = api.get("/calendar/me")
            .then(({ data }) => {
                user.value = { ...data, permissions: new Set(data.permissions || []) };
                return user.value;
            })
            .finally(() => { pending = null; });
    }
    return pending;
}

export function resetCurrentUser() {
    user.value = null;
}

function can(permission) {
    return !!user.value?.permissions.has(permission);
}

function canAny(permissions) {
    return permissions.some(can);
}

// canSeeField — отдаёт ли бэкенд роли поле брони (booking.field.<field>).
function canSeeField(field) {
    return can(PERMISSIONS.bookingFieldAll) || can(`booking.field.${field}`);
}

export function useCurrentUser() {
    return { user, can, canAny, canSeeField };
}
