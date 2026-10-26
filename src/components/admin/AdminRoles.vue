<template>
  <div class="adm-card">
    <div class="adm-toolbar">
      <div class="adm-spacer"></div>
      <button type="button" class="adm-btn primary" @click="openCreate">+ Роль</button>
    </div>
    <p class="adm-hint">
      Права роли действуют сразу, без повторного входа. Какие апартаменты видит роль, настраивается
      на вкладке «Апартаменты».
    </p>

    <div v-if="loadError" class="adm-error">{{ loadError }}</div>
    <div v-if="loading && !roles.length" class="adm-empty">Загрузка…</div>

    <div class="adm-list">
      <div class="adm-row adm-head" :style="gridStyle">
        <span>Роль</span><span>Описание</span><span>Пользователей</span><span>Права</span><span></span>
      </div>
      <div v-for="r in roles" :key="r.name" class="adm-row" :style="gridStyle">
        <span class="adm-cell-main">
          {{ r.name }}
          <span v-if="r.name === me?.role" class="adm-chip muted">ваша</span>
        </span>
        <span class="adm-cell-muted">{{ r.description }}</span>
        <span class="adm-cell-muted">{{ r.user_count }}</span>
        <span class="adm-cell-muted">{{ permissionSummary(r) }}</span>
        <span class="adm-actions">
          <button type="button" class="adm-btn" @click="openEdit(r)">Изменить</button>
          <button type="button" class="adm-btn danger" :disabled="r.user_count > 0 || r.name === me?.role"
                  :title="deleteHint(r)" @click="openDelete(r)">Удалить</button>
        </span>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="form" class="adm-overlay" @click.self="form = null">
        <form class="adm-modal wide" @submit.prevent="submit">
          <div class="adm-modal-header">
            <h3>{{ form.isNew ? 'Новая роль' : 'Роль ' + form.name }}</h3>
            <button type="button" class="adm-modal-close" @click="form = null">&times;</button>
          </div>
          <div class="adm-modal-body">
            <div v-if="form.isNew" class="adm-field">
              <label>Имя роли</label>
              <input v-model="form.name" class="adm-input" required pattern="[A-Za-z][A-Za-z0-9_]{1,49}"
                     placeholder="например, cleaner" />
              <small>Латиница, цифры и _, начинается с буквы. Потом не меняется.</small>
            </div>
            <div class="adm-field">
              <label>Описание</label>
              <input v-model="form.description" class="adm-input" />
            </div>

            <div v-for="group in groups" :key="group.name">
              <div class="adm-group-title">{{ group.name }}</div>
              <div class="adm-check-grid">
                <label v-for="p in group.items" :key="p.name" class="adm-checkbox">
                  <input v-model="form.permissions" type="checkbox" :value="p.name" :disabled="isLocked(p.name)" />
                  <span>
                    {{ p.description }}
                    <span class="adm-cell-muted">{{ p.name }}</span>
                  </span>
                </label>
              </div>
              <small v-if="group.name === 'Поля брони' && form.permissions.includes(ALL_FIELDS)" class="adm-cell-muted">
                Отмечено «Все поля брони» — отдельные поля не нужны.
              </small>
            </div>

            <div v-if="form.legacy.length" class="adm-error">
              Устаревшие права {{ form.legacy.join(', ') }} больше не используются и будут удалены при сохранении.
            </div>
            <div v-if="form.name === me?.role" class="adm-cell-muted">
              Право «Админка: роли и права» со своей роли снять нельзя.
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

      <div v-if="deleteTarget" class="adm-overlay" @click.self="deleteTarget = null">
        <div class="adm-modal">
          <div class="adm-modal-header">
            <h3>Удалить роль {{ deleteTarget.name }}?</h3>
            <button type="button" class="adm-modal-close" @click="deleteTarget = null">&times;</button>
          </div>
          <div class="adm-modal-body">
            <p style="margin:0">Права роли и выданный ей доступ к апартаментам тоже будут удалены.</p>
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
import { useCurrentUser, PERMISSIONS } from "../../composables/useCurrentUser";
import { apiError } from "./apiError";

const emit = defineEmits(["toast"]);
const { user: me } = useCurrentUser();

const ALL_FIELDS = PERMISSIONS.bookingFieldAll;
const FIELD_PREFIX = "booking.field.";

const gridStyle = { gridTemplateColumns: "1fr 1.6fr 110px 1.6fr 190px" };

const roles = ref([]);
const catalog = ref([]);
const loading = ref(false);
const loadError = ref("");

// Каталог прав, сгруппированный по разделам в порядке, заданном бэкендом
const groups = computed(() => {
  const result = [];
  for (const p of catalog.value) {
    let group = result.find(g => g.name === p.group);
    if (!group) result.push(group = { name: p.group, items: [] });
    group.items.push(p);
  }
  return result;
});

const known = computed(() => new Set(catalog.value.map(p => p.name)));

function permissionSummary(role) {
  const fields = role.permissions.filter(p => p.startsWith(FIELD_PREFIX) && p !== ALL_FIELDS).length;
  const other = role.permissions.filter(p => !p.startsWith(FIELD_PREFIX));
  const parts = [...other];
  if (role.permissions.includes(ALL_FIELDS)) parts.push("все поля брони");
  else if (fields) parts.push(`полей брони: ${fields}`);
  return parts.join(", ") || "нет прав";
}

function deleteHint(role) {
  if (role.name === me.value?.role) return "Свою роль удалить нельзя";
  if (role.user_count > 0) return "Сначала смените роль её пользователям";
  return "";
}

async function load() {
  loading.value = true;
  loadError.value = "";
  try {
    const [rolesRes, catalogRes] = await Promise.all([
      api.get("/calendar/admin/roles"),
      api.get("/calendar/admin/permissions"),
    ]);
    roles.value = rolesRes.data;
    catalog.value = catalogRes.data;
  } catch (err) {
    loadError.value = apiError(err);
  } finally {
    loading.value = false;
  }
}

// ─── Форма ───
const form = ref(null);

// Со своей роли нельзя снять управление ролями (иначе потеряете доступ к этой вкладке)
function isLocked(permission) {
  return form.value?.name === me.value?.role && permission === PERMISSIONS.rolesManage;
}

function openCreate() {
  form.value = { isNew: true, name: "", description: "", permissions: [PERMISSIONS.calendarRead], legacy: [], error: "", saving: false };
}

function openEdit(role) {
  form.value = {
    isNew: false, name: role.name, description: role.description,
    permissions: role.permissions.filter(p => known.value.has(p)),
    legacy: role.permissions.filter(p => !known.value.has(p)),
    error: "", saving: false,
  };
}

async function submit() {
  const f = form.value;
  f.error = "";
  f.saving = true;
  try {
    if (f.isNew) {
      await api.post("/calendar/admin/roles", { name: f.name, description: f.description, permissions: f.permissions });
      emit("toast", "Роль создана");
    } else {
      await api.patch(`/calendar/admin/roles/${encodeURIComponent(f.name)}`, {
        description: f.description, permissions: f.permissions,
      });
      emit("toast", "Роль сохранена");
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

function openDelete(role) {
  deleteError.value = "";
  deleteTarget.value = role;
}

async function confirmDelete() {
  deleting.value = true;
  deleteError.value = "";
  try {
    await api.delete(`/calendar/admin/roles/${encodeURIComponent(deleteTarget.value.name)}`);
    deleteTarget.value = null;
    emit("toast", "Роль удалена");
    await load();
  } catch (err) {
    deleteError.value = apiError(err);
  } finally {
    deleting.value = false;
  }
}

onMounted(load);
</script>
