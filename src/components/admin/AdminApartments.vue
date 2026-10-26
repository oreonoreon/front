<template>
  <div class="adm-card">
    <div class="adm-toolbar">
      <input v-model="search" class="adm-input adm-search" type="search" placeholder="Поиск по номеру или описанию" />
      <label class="adm-checkbox">
        <input v-model="showInactive" type="checkbox" />
        Показывать неактивные ({{ inactiveCount }})
      </label>
      <div class="adm-spacer"></div>
      <button type="button" class="adm-btn primary" @click="openCreate">+ Апартамент</button>
    </div>
    <p class="adm-hint">
      Апартамент видят роли и пользователи, которым выдан доступ. Неактивные скрыты из календаря
      у всех, кроме ролей с правом «видеть неактивные».
      <template v-if="allSeeingRoles.length">
        Роли {{ allSeeingRoles.join(', ') }} видят все апартаменты без выдачи доступа.
      </template>
      <template v-if="assignedOnlyRoles.length">
        Роли {{ assignedOnlyRoles.join(', ') }} получают апартаменты только лично — отмечайте конкретных пользователей.
      </template>
    </p>

    <div v-if="loadError" class="adm-error">{{ loadError }}</div>
    <div v-if="loading && !apartments.length" class="adm-empty">Загрузка…</div>

    <div class="adm-list">
      <div class="adm-row adm-head" :style="gridStyle">
        <span>Активен</span><span>Номер</span><span>Описание</span><span>Доступ</span><span></span>
      </div>
      <div v-for="a in filteredApartments" :key="a.oid" class="adm-row" :class="{ inactive: !a.is_active }" :style="gridStyle">
        <span>
          <label class="adm-switch" :title="a.is_active ? 'Активен' : 'Неактивен'">
            <input type="checkbox" :checked="a.is_active" :disabled="toggling.has(a.oid)" @change="toggleActive(a)" />
            <span></span>
          </label>
        </span>
        <span class="adm-cell-main">{{ a.room_number }}</span>
        <span class="adm-cell-muted">{{ a.description }}</span>
        <span class="adm-chips">
          <span v-for="r in a.roles" :key="r" class="adm-chip">{{ r }}</span>
          <span v-for="u in a.users" :key="u.id" class="adm-chip user" :title="u.role">👤 {{ u.name }}</span>
          <span v-if="!a.roles.length && !a.users.length" class="adm-chip warn">никому не выдан</span>
        </span>
        <span class="adm-actions">
          <button type="button" class="adm-btn" @click="openEdit(a)">Изменить</button>
        </span>
      </div>
      <div v-if="!loading && !filteredApartments.length" class="adm-empty">Апартаментов не найдено</div>
    </div>

    <Teleport to="body">
      <div v-if="form" class="adm-overlay" @click.self="form = null">
        <form class="adm-modal wide" @submit.prevent="submit">
          <div class="adm-modal-header">
            <h3>{{ form.oid ? 'Апартамент ' + form.room_number : 'Новый апартамент' }}</h3>
            <button type="button" class="adm-modal-close" @click="form = null">&times;</button>
          </div>
          <div class="adm-modal-body">
            <div class="adm-field">
              <label>Номер</label>
              <input v-model="form.room_number" class="adm-input" required :disabled="!!form.oid" />
              <small v-if="form.oid">Номер не меняется: на него ссылаются брони</small>
            </div>
            <div class="adm-field">
              <label>Описание</label>
              <textarea v-model="form.description" class="adm-input" rows="2"></textarea>
            </div>
            <div class="adm-field">
              <label>Календарь Airbnb (iCal)</label>
              <input v-model="form.airbnbCalendar" class="adm-input" placeholder="https://…" />
            </div>
            <label class="adm-checkbox">
              <input v-model="form.is_active" type="checkbox" />
              Активен (показывается в календаре)
            </label>

            <div class="adm-field">
              <span class="adm-field-label">Доступ ролям</span>
              <div class="adm-check-grid">
                <label v-for="r in roles" :key="r.name" class="adm-checkbox"
                       :title="assignedOnly(r) ? 'Этой роли апартаменты выдаются только лично — ниже, в списке пользователей' : ''">
                  <input v-model="form.roles" type="checkbox" :value="r.name" :disabled="assignedOnly(r)" />
                  <span>
                    {{ r.name }}
                    <span v-if="seesAll(r)" class="adm-cell-muted">видит все апартаменты</span>
                    <span v-else-if="assignedOnly(r)" class="adm-cell-muted">только лично, отметьте пользователя ниже</span>
                  </span>
                </label>
              </div>
            </div>

            <div class="adm-field">
              <span class="adm-field-label">Доступ отдельным пользователям</span>
              <small>Например, владельцу апартамента (роль apartmentOwner).</small>
              <input v-model="userSearch" class="adm-input" type="search" placeholder="Поиск пользователя" />
              <div class="adm-check-scroll">
                <label v-for="u in filteredUsers" :key="u.id" class="adm-checkbox">
                  <input v-model="form.user_ids" type="checkbox" :value="u.id" />
                  <span>{{ u.name }} <span class="adm-cell-muted">{{ u.role }} · {{ u.phone }}</span></span>
                </label>
                <div v-if="!filteredUsers.length" class="adm-cell-muted">Никого не найдено</div>
              </div>
            </div>

            <div v-if="form.error" class="adm-error">{{ form.error }}</div>
          </div>
          <div class="adm-modal-footer">
            <button type="button" class="adm-btn" @click="form = null">Отмена</button>
            <button type="submit" class="adm-btn primary" :disabled="form.saving">
              {{ form.saving ? 'Сохранение…' : 'Сохранить' }}
            </button>
          </div>
        </form>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import api from "../../api.js";
import { apiError } from "./apiError";

const emit = defineEmits(["toast"]);

const gridStyle = { gridTemplateColumns: "70px 1fr 2fr 2fr 100px" };

const apartments = ref([]);
const roles = ref([]);
const users = ref([]);
const loading = ref(false);
const loadError = ref("");
const search = ref("");
const showInactive = ref(true);

const inactiveCount = computed(() => apartments.value.filter(a => !a.is_active).length);

const filteredApartments = computed(() => {
  const q = search.value.trim().toLowerCase();
  return apartments.value.filter(a =>
      (showInactive.value || a.is_active) &&
      (!q || a.room_number.toLowerCase().includes(q) || (a.description || "").toLowerCase().includes(q)));
});

function seesAll(role) {
  return role.permissions.includes("apartments.all");
}

const allSeeingRoles = computed(() => roles.value.filter(seesAll).map(r => r.name));

// Роли с apartments.assigned_only (например, владельцы) получают апартаменты только лично:
// выдать такой роли апартамент целиком нельзя, бэкенд такое отклонит.
function assignedOnly(role) {
  return role.permissions.includes("apartments.assigned_only");
}

const assignedOnlyRoles = computed(() => roles.value.filter(assignedOnly).map(r => r.name));
const isAssignedOnlyRole = (name) => assignedOnlyRoles.value.includes(name);

async function load() {
  loading.value = true;
  loadError.value = "";
  try {
    const [aptRes, rolesRes, usersRes] = await Promise.all([
      api.get("/calendar/admin/apartments"),
      api.get("/calendar/admin/roles"),
      api.get("/calendar/admin/users"),
    ]);
    apartments.value = aptRes.data;
    roles.value = rolesRes.data;
    users.value = usersRes.data;
  } catch (err) {
    loadError.value = apiError(err);
  } finally {
    loading.value = false;
  }
}

function replaceApartment(updated) {
  const i = apartments.value.findIndex(a => a.oid === updated.oid);
  if (i >= 0) apartments.value[i] = updated;
}

// ─── Переключатель активности в строке ───
const toggling = reactive(new Set());

async function toggleActive(a) {
  toggling.add(a.oid);
  try {
    const { data } = await api.patch(`/calendar/admin/apartments/${a.oid}`, { is_active: !a.is_active });
    replaceApartment(data);
    emit("toast", `${data.room_number}: ${data.is_active ? "активен" : "неактивен"}`);
  } catch (err) {
    emit("toast", apiError(err));
  } finally {
    toggling.delete(a.oid);
  }
}

// ─── Форма ───
const form = ref(null);
const userSearch = ref("");

const filteredUsers = computed(() => {
  const q = userSearch.value.trim().toLowerCase();
  if (!q) return users.value;
  return users.value.filter(u => u.name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q));
});

function openCreate() {
  userSearch.value = "";
  form.value = {
    oid: null, room_number: "", description: "", airbnbCalendar: "", is_active: true,
    // по умолчанию — те же роли, что выданы большинству апартаментов
    roles: roles.value.filter(r => !seesAll(r) && ["manager", "agent"].includes(r.name)).map(r => r.name),
    user_ids: [], error: "", saving: false,
  };
}

function openEdit(a) {
  userSearch.value = "";
  form.value = {
    oid: a.oid, original: a, room_number: a.room_number, description: a.description,
    airbnbCalendar: a.airbnbCalendar, is_active: a.is_active,
    // старая выдача ролям «только лично» не действует — при сохранении она уберётся
    roles: a.roles.filter(r => !isAssignedOnlyRole(r)), user_ids: a.users.map(u => u.id), error: "", saving: false,
  };
}

const sameSet = (x, y) => x.length === y.length && x.every(v => y.includes(v));

async function submit() {
  const f = form.value;
  f.error = "";
  f.saving = true;
  try {
    if (!f.oid) {
      const { data } = await api.post("/calendar/admin/apartments", {
        room_number: f.room_number, description: f.description, airbnbCalendar: f.airbnbCalendar,
        is_active: f.is_active, roles: f.roles, user_ids: f.user_ids,
      });
      apartments.value.push(data);
      apartments.value.sort((x, y) => x.room_number.localeCompare(y.room_number));
      emit("toast", "Апартамент создан");
    } else {
      const o = f.original;
      const changes = {};
      if (f.description !== o.description) changes.description = f.description;
      if (f.airbnbCalendar !== o.airbnbCalendar) changes.airbnbCalendar = f.airbnbCalendar;
      if (f.is_active !== o.is_active) changes.is_active = f.is_active;
      let updated = o;
      if (Object.keys(changes).length) {
        updated = (await api.patch(`/calendar/admin/apartments/${f.oid}`, changes)).data;
      }
      if (!sameSet(f.roles, o.roles) || !sameSet(f.user_ids, o.users.map(u => u.id))) {
        updated = (await api.put(`/calendar/admin/apartments/${f.oid}/access`, { roles: f.roles, user_ids: f.user_ids })).data;
      }
      replaceApartment(updated);
      emit("toast", "Апартамент сохранён");
    }
    form.value = null;
  } catch (err) {
    f.error = apiError(err);
  } finally {
    f.saving = false;
  }
}

onMounted(load);
</script>
