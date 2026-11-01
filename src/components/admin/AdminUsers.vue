<template>
  <div class="adm-card">
    <div class="adm-toolbar">
      <input v-model="search" class="adm-input adm-search" type="search" placeholder="Поиск по имени или телефону" />
      <div class="adm-spacer"></div>
      <button type="button" class="adm-btn primary" @click="openCreate">+ Пользователь</button>
    </div>

    <div v-if="loadError" class="adm-error">{{ loadError }}</div>
    <div v-if="loading && !users.length" class="adm-empty">Загрузка…</div>

    <div class="adm-list">
      <div class="adm-row adm-head" :style="gridStyle">
        <span>Имя</span><span>Телефон</span><span>Роль</span><span></span>
      </div>
      <div v-for="u in filteredUsers" :key="u.id" class="adm-row" :style="gridStyle">
        <span class="adm-cell-main">
          {{ u.name }}
          <span v-if="u.id === me?.id" class="adm-chip muted">это вы</span>
        </span>
        <span class="adm-cell-muted">{{ u.phone }}</span>
        <span><span class="adm-chip">{{ u.role }}</span></span>
        <span class="adm-actions">
          <button type="button" class="adm-btn" @click="openEdit(u)">Изменить</button>
          <button v-if="u.id !== me?.id" type="button" class="adm-btn danger" @click="openDelete(u)">Удалить</button>
        </span>
      </div>
      <div v-if="!loading && !filteredUsers.length" class="adm-empty">Пользователей не найдено</div>
    </div>

    <!-- Создание / изменение -->
    <Teleport to="body">
      <div v-if="form" class="adm-overlay" @click.self="form = null">
        <form class="adm-modal" @submit.prevent="submit">
          <div class="adm-modal-header">
            <h3>{{ form.id ? 'Пользователь ' + form.original.name : 'Новый пользователь' }}</h3>
            <button type="button" class="adm-modal-close" @click="form = null">&times;</button>
          </div>
          <div class="adm-modal-body">
            <div class="adm-field">
              <label>Имя (логин)</label>
              <input v-model="form.name" class="adm-input" required autocomplete="off" />
            </div>
            <div class="adm-field">
              <label>Телефон</label>
              <input v-model="form.phone" class="adm-input" required autocomplete="off" />
            </div>
            <div class="adm-field">
              <label>Роль</label>
              <select v-model="form.role" class="adm-input" :disabled="form.id === me?.id">
                <option v-for="r in roles" :key="r.name" :value="r.name">
                  {{ r.name }}{{ r.description ? ' — ' + r.description : '' }}
                </option>
              </select>
              <small v-if="form.id === me?.id">Свою роль сменить нельзя</small>
            </div>
            <div class="adm-field">
              <label>{{ form.id ? 'Новый пароль' : 'Пароль' }}</label>
              <input v-model="form.password" class="adm-input" type="password" :required="!form.id"
                     minlength="6" autocomplete="new-password" />
              <small>{{ form.id ? 'Оставьте пустым, чтобы не менять. ' : '' }}Не короче 6 символов.</small>
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

      <!-- Подтверждение удаления -->
      <div v-if="deleteTarget" class="adm-overlay" @click.self="deleteTarget = null">
        <div class="adm-modal">
          <div class="adm-modal-header">
            <h3>Удалить пользователя?</h3>
            <button type="button" class="adm-modal-close" @click="deleteTarget = null">&times;</button>
          </div>
          <div class="adm-modal-body">
            <p style="margin:0">
              <b>{{ deleteTarget.name }}</b> ({{ deleteTarget.role }}) потеряет доступ сразу.
              Выданный ему лично доступ к апартаментам тоже будет удалён.
            </p>
            <div v-if="deleteError" class="adm-error">{{ deleteError }}</div>
          </div>
          <div class="adm-modal-footer">
            <button type="button" class="adm-btn" @click="deleteTarget = null">Отмена</button>
            <button type="button" class="adm-btn danger" :disabled="deleting" @click="confirmDelete">
              {{ deleting ? 'Удаление…' : 'Удалить' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import api from "../../api.js";
import { useCurrentUser } from "../../composables/useCurrentUser";
import { apiError } from "./apiError";

const emit = defineEmits(["toast"]);
const { user: me } = useCurrentUser();

const gridStyle = { gridTemplateColumns: "1.4fr 1fr 1fr 190px" };

const users = ref([]);
const roles = ref([]);
const loading = ref(false);
const loadError = ref("");
const search = ref("");

const filteredUsers = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return users.value;
  return users.value.filter(u => u.name.toLowerCase().includes(q) || u.phone.toLowerCase().includes(q));
});

async function load() {
  loading.value = true;
  loadError.value = "";
  try {
    const [usersRes, rolesRes] = await Promise.all([
      api.get("/calendar/admin/users"),
      api.get("/calendar/admin/roles"),
    ]);
    users.value = usersRes.data;
    roles.value = rolesRes.data;
  } catch (err) {
    loadError.value = apiError(err);
  } finally {
    loading.value = false;
  }
}

// ─── Форма ───
const form = ref(null);

function openCreate() {
  form.value = { id: null, name: "", phone: "", role: "manager", password: "", error: "", saving: false };
}

function openEdit(u) {
  form.value = { id: u.id, original: u, name: u.name, phone: u.phone, role: u.role, password: "", error: "", saving: false };
}

async function submit() {
  const f = form.value;
  f.error = "";
  f.saving = true;
  try {
    if (f.id) {
      // отправляем только изменённые поля
      const changes = {};
      if (f.name !== f.original.name) changes.name = f.name;
      if (f.phone !== f.original.phone) changes.phone = f.phone;
      if (f.role !== f.original.role) changes.role = f.role;
      if (f.password) changes.password = f.password;
      await api.patch(`/calendar/admin/users/${f.id}`, changes);
      emit("toast", "Пользователь сохранён");
    } else {
      await api.post("/calendar/admin/users", { name: f.name, phone: f.phone, role: f.role, password: f.password });
      emit("toast", "Пользователь создан");
    }
    form.value = null;
    await load();
  } catch (err) {
    f.error = apiError(err);
  } finally {
    f.saving = false;
  }
}

// ─── Удаление ───
const deleteTarget = ref(null);
const deleting = ref(false);
const deleteError = ref("");

function openDelete(u) {
  deleteError.value = "";
  deleteTarget.value = u;
}

async function confirmDelete() {
  deleting.value = true;
  deleteError.value = "";
  try {
    await api.delete(`/calendar/admin/users/${deleteTarget.value.id}`);
    deleteTarget.value = null;
    emit("toast", "Пользователь удалён");
    await load();
  } catch (err) {
    deleteError.value = apiError(err);
  } finally {
    deleting.value = false;
  }
}

onMounted(load);
</script>
