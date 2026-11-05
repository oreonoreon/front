<template>
  <div class="adm-card">
    <div class="adm-toolbar">
      <div class="adm-spacer"></div>
      <button type="button" class="adm-btn primary" @click="openCreateCondo">+ Кондо</button>
    </div>
    <p class="adm-hint">
      В календаре апартаменты идут деревом: кондо, внутри него группы, в группах апартаменты.
      Кондо идут в календаре в том же порядке, что здесь — меняйте его стрелками.
      Отнести апартаменты к кондо и группе можно на вкладке «Апартаменты».
    </p>

    <div v-if="loadError" class="adm-error">{{ loadError }}</div>
    <div v-if="loading && !condos.length" class="adm-empty">Загрузка…</div>

    <div class="adm-list">
      <div class="adm-row adm-head" :style="gridStyle">
        <span>Название</span><span>Апартаментов</span><span></span>
      </div>
      <template v-for="(c, i) in condos" :key="c.id">
        <div class="adm-row" :style="gridStyle">
          <span class="adm-cell-main">{{ c.name }}</span>
          <span class="adm-cell-muted">{{ c.apartment_count }}</span>
          <span class="adm-actions">
            <button type="button" class="adm-btn" title="Выше в календаре" aria-label="Выше в календаре"
                    :disabled="i === 0 || reordering" @click="move(i, -1)">↑</button>
            <button type="button" class="adm-btn" title="Ниже в календаре" aria-label="Ниже в календаре"
                    :disabled="i === condos.length - 1 || reordering" @click="move(i, 1)">↓</button>
            <button type="button" class="adm-btn" @click="openCreateGroup(c)">+ Группа</button>
            <button type="button" class="adm-btn" @click="openRename('condo', c)">Изменить</button>
            <button type="button" class="adm-btn danger" :disabled="c.apartment_count > 0"
                    :title="c.apartment_count > 0 ? 'Сначала перенесите апартаменты' : ''"
                    @click="openDelete('condo', c)">Удалить</button>
          </span>
        </div>
        <div v-for="g in c.groups" :key="g.id" class="adm-row adm-subrow" :style="gridStyle">
          <span>{{ g.name }}</span>
          <span class="adm-cell-muted">{{ g.apartment_count }}</span>
          <span class="adm-actions">
            <button type="button" class="adm-btn" @click="openRename('group', g)">Изменить</button>
            <button type="button" class="adm-btn danger" :disabled="g.apartment_count > 0"
                    :title="g.apartment_count > 0 ? 'Сначала перенесите апартаменты' : ''"
                    @click="openDelete('group', g)">Удалить</button>
          </span>
        </div>
      </template>
      <div v-if="!loading && !condos.length" class="adm-empty">Кондо пока нет</div>
    </div>

    <Teleport to="body">
      <div v-if="form" class="adm-overlay" @click.self="form = null">
        <form class="adm-modal" @submit.prevent="submit">
          <div class="adm-modal-header">
            <h3>{{ form.title }}</h3>
            <button type="button" class="adm-modal-close" @click="form = null">&times;</button>
          </div>
          <div class="adm-modal-body">
            <div class="adm-field">
              <label>Название</label>
              <input v-model="form.name" class="adm-input" required maxlength="100" />
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
            <h3>Удалить {{ deleteTarget.kind === 'condo' ? 'кондо' : 'группу' }} {{ deleteTarget.item.name }}?</h3>
            <button type="button" class="adm-modal-close" @click="deleteTarget = null">&times;</button>
          </div>
          <div class="adm-modal-body">
            <p v-if="deleteTarget.kind === 'condo' && deleteTarget.item.groups.length" style="margin:0">
              Группы этого кондо тоже будут удалены.
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
import { onMounted, ref } from "vue";
import api from "../../api.js";
import { apiError } from "./apiError";

const emit = defineEmits(["toast"]);

const gridStyle = { gridTemplateColumns: "2fr 1fr 370px" };

const condos = ref([]);
const loading = ref(false);
const loadError = ref("");

async function load() {
  loading.value = true;
  loadError.value = "";
  try {
    condos.value = (await api.get("/calendar/admin/condos")).data;
  } catch (err) {
    loadError.value = apiError(err);
  } finally {
    loading.value = false;
  }
}

// ─── Порядок кондо в календаре ───
const reordering = ref(false);

async function move(index, step) {
  const order = condos.value.map(c => c.id);
  [order[index], order[index + step]] = [order[index + step], order[index]];
  reordering.value = true;
  try {
    await api.put("/calendar/admin/condos/order", { condo_ids: order });
    await load();
  } catch (err) {
    emit("toast", apiError(err));
  } finally {
    reordering.value = false;
  }
}

// ─── Форма названия: новое кондо, новая группа, переименование ───
const form = ref(null);

function openForm(title, name, save) {
  form.value = { title, name, save, error: "", saving: false };
}

function openCreateCondo() {
  openForm("Новое кондо", "", (name) => api.post("/calendar/admin/condos", { name }));
}

function openCreateGroup(condo) {
  openForm(`Новая группа в ${condo.name}`, "", (name) => api.post(`/calendar/admin/condos/${condo.id}/groups`, { name }));
}

function openRename(kind, item) {
  const path = kind === "condo" ? "condos" : "groups";
  openForm(kind === "condo" ? "Кондо" : "Группа", item.name, (name) => api.patch(`/calendar/admin/${path}/${item.id}`, { name }));
}

async function submit() {
  const f = form.value;
  f.error = "";
  f.saving = true;
  try {
    await f.save(f.name);
    form.value = null;
    emit("toast", "Сохранено");
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

function openDelete(kind, item) {
  deleteError.value = "";
  deleteTarget.value = { kind, item };
}

async function confirmDelete() {
  const { kind, item } = deleteTarget.value;
  deleting.value = true;
  deleteError.value = "";
  try {
    await api.delete(`/calendar/admin/${kind === "condo" ? "condos" : "groups"}/${item.id}`);
    deleteTarget.value = null;
    emit("toast", kind === "condo" ? "Кондо удалено" : "Группа удалена");
    await load();
  } catch (err) {
    deleteError.value = apiError(err);
  } finally {
    deleting.value = false;
  }
}

onMounted(load);
</script>
