<template>
  <teleport to="body">
    <div
        v-if="modelValue"
        class="booking-overlay"
        @keydown.esc.stop.prevent="cancel"
    >
      <div class="backdrop" @click="cancel"></div>

      <div
          class="booking-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bookingDialogTitle"
          ref="panelRef"
      >
        <div class="booking-header">
          <h3 class="booking-title" id="bookingDialogTitle">
            {{ isEdit ? 'Редактирование бронирования' : 'Новое бронирование' }}
          </h3>
          <button class="close-btn" type="button" @click="cancel" aria-label="Закрыть">×</button>
        </div>

        <form class="booking-form" @submit.prevent="submit">
          <div class="form-scroll">
            <!-- roomNumber -->
            <div class="form-row">
              <label for="roomNumber">Room number</label>
              <input
                  id="roomNumber"
                  v-model="form.roomNumber"
                  :class="{ invalid: !!errors.roomNumber }"
                  required
                  autocomplete="off"
                  ref="firstInputRef"
              />
              <p v-if="errors.roomNumber" class="err">{{ errors.roomNumber }}</p>
            </div>

            <!-- name -->
            <div class="form-row">
              <label for="name">Guest name</label>
              <input
                  id="name"
                  v-model="form.name"
                  :class="{ invalid: !!errors.name }"
                  required
                  autocomplete="off"
              />
              <p v-if="errors.name" class="err">{{ errors.name }}</p>
            </div>

            <!-- dates -->
            <div class="double">
              <div class="form-row">
                <label for="check_in">Check In</label>
                <input
                    id="check_in"
                    type="date"
                    :value="toInputDate(form.check_in)"
                    @input="onDateInput($event, 'check_in')"
                    :class="{ invalid: !!errors.check_in }"
                    required
                />
                <p v-if="errors.check_in" class="err">{{ errors.check_in }}</p>
              </div>
              <div class="form-row">
                <label for="check_out">Check Out</label>
                <input
                    id="check_out"
                    type="date"
                    :value="toInputDate(form.check_out)"
                    @input="onDateInput($event, 'check_out')"
                    :class="{ invalid: !!errors.check_out }"
                    required
                />
                <p v-if="errors.check_out" class="err">{{ errors.check_out }}</p>
              </div>
            </div>

            <!-- price -->
            <div class="form-row">
              <label for="price">Price</label>
              <input
                  id="price"
                  v-model="form.price"
                  inputmode="numeric"
                  @blur="digitsOrEmpty('price')"
                  :class="{ invalid: !!errors.price }"
              />
              <p v-if="errors.price" class="err">{{ errors.price }}</p>
            </div>

            <!-- phone -->
            <div class="form-row">
              <label for="phone">Phone / Telegram</label>
              <input
                  id="phone"
                  v-model="form.phone"
                  @blur="validatePhoneField"
                  :class="{ invalid: !!errors.phone }"
              />
              <p v-if="errors.phone" class="err">{{ errors.phone }}</p>
            </div>

            <!-- cleaning_price / electricity_and_water_payment -->
            <div class="double">
              <div class="form-row">
                <label for="cleaning_price">Cleaning price</label>
                <input
                    id="cleaning_price"
                    v-model="form.cleaning_price"
                    inputmode="numeric"
                    @blur="digitsOrEmpty('cleaning_price')"
                    :class="{ invalid: !!errors.cleaning_price }"
                />
                <p v-if="errors.cleaning_price" class="err">{{ errors.cleaning_price }}</p>
              </div>
              <div class="form-row">
                <label for="electricity_and_water_payment">Electricity/Water</label>
                <input
                    id="electricity_and_water_payment"
                    v-model="form.electricity_and_water_payment"
                    :class="{ invalid: !!errors.electricity_and_water_payment }"
                />
                <p v-if="errors.electricity_and_water_payment" class="err">
                  {{ errors.electricity_and_water_payment }}
                </p>
              </div>
            </div>

            <!-- adult / children -->
            <div class="double">
              <div class="form-row">
                <label for="adult">Adult</label>
                <input
                    id="adult"
                    v-model="form.adult"
                    inputmode="numeric"
                    @blur="digitsOrEmpty('adult')"
                    :class="{ invalid: !!errors.adult }"
                />
                <p v-if="errors.adult" class="err">{{ errors.adult }}</p>
              </div>
              <div class="form-row">
                <label for="children">Children</label>
                <input
                    id="children"
                    v-model="form.children"
                    inputmode="numeric"
                    @blur="digitsOrEmpty('children')"
                    :class="{ invalid: !!errors.children }"
                />
                <p v-if="errors.children" class="err">{{ errors.children }}</p>
              </div>
            </div>

            <!-- reservationDescription (необязательное) -->
            <div class="form-row">
              <label for="reservationDescription">Reservation description</label>
              <textarea
                  id="reservationDescription"
                  v-model="form.reservationDescription"
                  rows="2"
              ></textarea>
            </div>

            <div class="form-info">
              <p class="hint">
                В "Description" описывем всё что небходимо знать для заселения: предоплата 00000 бат оплачено, комиссия агента, имя агента, оплата при заезде, гость от собственника, депозит 300$ или 30000 руб переводом, гость от собственника, HomeExchange гость должен оплатить 2000 бат, имена гостей собственников если собственник не дал их контакты, возраст детей если есть, переезд в другие квартиры, детская кроватка или стульчик, оплачено через Букинг, оплачено через Аренби.
              </p>
            </div>
          </div>

          <div class="buttons">
            <button type="button" class="btn secondary" @click="cancel">Cancel</button>
            <button type="submit" class="btn primary" :disabled="submitting">
              <span v-if="submitting" class="spinner"></span>
              <span v-else>OK</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { DayPilot } from '@oreonoreon/calendar';
import { reactive, watch, onMounted, onBeforeUnmount, nextTick, ref } from 'vue';

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  value: { type: Object, required: true },
  isEdit: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'submit', 'cancel']);

const form = reactive({
  id: null,
  roomNumber: '',
  name: '',
  check_in: null,
  check_out: null,
  price: '',
  phone: '',
  cleaning_price: '',
  electricity_and_water_payment: '',
  adult: '',
  children: '',
  reservationDescription: '',
});

// Расширенные ошибки по каждому полю
const errors = reactive({
  id: '',
  roomNumber: '',
  name: '',
  check_in: '',
  check_out: '',
  price: '',
  phone: '',
  cleaning_price: '',
  electricity_and_water_payment: '',
  adult: '',
  children: '',
});

const submitting = ref(false);
const firstInputRef = ref(null);
const panelRef = ref(null);

watch(
    () => props.value,
    (v) => {
      if (!v) return;
      form.id = v.id ?? null;
      form.roomNumber = v.roomNumber ?? '';
      form.name = v.name ?? '';
      form.check_in = v.check_in instanceof DayPilot.Date ? v.check_in : (v.check_in ? new DayPilot.Date(v.check_in) : null);
      form.check_out = v.check_out instanceof DayPilot.Date ? v.check_out : (v.check_out ? new DayPilot.Date(v.check_out) : null);
      form.price = v.price === undefined || v.price === null ? '' : String(v.price);
      form.phone = v.phone ?? '';
      form.cleaning_price = v.cleaning_price === undefined || v.cleaning_price === null ? '' : String(v.cleaning_price);
      form.electricity_and_water_payment = v.electricity_and_water_payment ?? '';
      form.adult = v.adult === undefined || v.adult === null ? '' : String(v.adult);
      form.children = v.children === undefined || v.children === null ? '' : String(v.children);
      form.reservationDescription = v.reservationDescription ?? '';
      clearErrors();
      nextTick(() => firstInputRef.value?.focus());
    },
    { immediate: true }
);

watch(
    () => props.modelValue,
    (open) => {
      if (open) {
        lockBodyScroll();
        nextTick(() => firstInputRef.value?.focus());
      } else {
        unlockBodyScroll();
      }
    }
);

onMounted(() => {
  if (props.modelValue) lockBodyScroll();
});
onBeforeUnmount(() => {
  unlockBodyScroll();
});

function lockBodyScroll() {
  document.documentElement.style.scrollBehavior = 'auto';
  document.body.dataset.prevOverflow = document.body.style.overflow || '';
  document.body.style.overflow = 'hidden';
}
function unlockBodyScroll() {
  if (document.body.dataset.prevOverflow !== undefined) {
    document.body.style.overflow = document.body.dataset.prevOverflow;
    delete document.body.dataset.prevOverflow;
  }
}

function close() {
  emit('update:modelValue', false);
}
function cancel() {
  close();
  emit('cancel');
}

function toInputDate(dpDate) {
  if (!dpDate) return '';
  return dpDate.toString('yyyy-MM-dd');
}
function onDateInput(e, field) {
  const value = e.target.value;
  form[field] = value ? new DayPilot.Date(value + 'T00:00:00') : null;
}

// Очищает всё сообщения об ошибках
function clearErrors() {
  Object.keys(errors).forEach(k => { errors[k] = ''; });
}

// Оставляет только цифры, иначе очищает поле
function digitsOrEmpty(field) {
  const v = form[field];
  if (v === '') return;
  if (!/^\d+$/.test(v)) {
    form[field] = '';
  }
}

// Телефон обязателен и должен быть либо +цифры(10–15), либо Telegram username
function validatePhoneField() {
  errors.phone = '';
  if (form.phone === '') {
    errors.phone = 'Обязательное поле';
    return;
  }
  const phoneRegex = /^\+\d{10,15}$/;
  const tgRegex = /^@?[A-Za-z0-9_]{5,32}$/;
  if (!phoneRegex.test(form.phone) && !tgRegex.test(form.phone)) {
    errors.phone = 'Телефон (+ и 10–15 цифр) или Telegram (5–32 символа)';
  }
}

// Общая валидация всех полей кроме reservationDescription
function validateAll() {
  clearErrors();

  // id обязателен только в режиме редактирования
  if (props.isEdit && (form.id === null || form.id === undefined || form.id === '')) {
    errors.id = 'ID обязателен в режиме редактирования';
  }

  // Обязательные строковые поля (не пустые строки)
  const requiredStringFields = [
    'roomNumber',
    'name',
    'price',
    'phone',
    'cleaning_price',
    'electricity_and_water_payment',
    'adult',
    'children',
  ];
  for (const f of requiredStringFields) {
    if (form[f] === '') {
      errors[f] = 'Обязательное поле';
    }
  }

  // Числовые поля: только цифры
  const digitOnly = ['price', 'cleaning_price', 'adult', 'children'];
  for (const f of digitOnly) {
    if (form[f] !== '' && !/^\d+$/.test(form[f])) {
      errors[f] = 'Только цифры';
    }
  }

  // Даты обязательны
  if (!form.check_in) errors.check_in = 'Обязательное поле';
  if (!form.check_out) errors.check_out = 'Обязательное поле';

  // Дополнительно можно запретить check_out раньше check_in
  if (form.check_in && form.check_out && form.check_out.getTime() < form.check_in.getTime()) {
    errors.check_out = 'Check Out не может быть раньше Check In';
  }

  // Телефон: обязательность и формат
  validatePhoneField();

  // Есть ли хоть одна ошибка?
  return !Object.values(errors).some(Boolean);
}

async function submit() {
  if (!validateAll()) return;
  submitting.value = true;
  try {
    emit('submit', {
      id: form.id,
      roomNumber: form.roomNumber,
      name: form.name,
      check_in: form.check_in,
      check_out: form.check_out,
      price: form.price,
      phone: form.phone,
      cleaning_price: form.cleaning_price,
      electricity_and_water_payment: form.electricity_and_water_payment,
      adult: form.adult,
      children: form.children,
      reservationDescription: form.reservationDescription,
    });
    close();
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
/* стили без изменений + подсветка невалидных полей */
.booking-overlay {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  font-family: inherit;
}
.backdrop {
  position: absolute;
  inset: 0;
  background: rgba(30, 40, 60, 0.45);
  backdrop-filter: blur(2px);
}
.booking-panel {
  position: relative;
  width: 100%;
  max-width: 560px;
  height: 100%;
  max-height: 100vh;
  background: #fff;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 24px -6px rgba(0,0,0,0.25);
  display: flex;
  flex-direction: column;
  animation: slideUp .28s ease;
  z-index: 1;
}
@media (min-width: 680px) {
  .booking-panel {
    border-radius: 16px;
    height: auto;
    max-height: 92vh;
    margin-bottom: 28px;
    align-self: center;
  }
}
@keyframes slideUp {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.booking-header {
  display: flex;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid #e4e7ed;
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 2;
}
.booking-title {
  flex: 1;
  font-size: 18px;
  margin: 0;
  font-weight: 600;
  color: #1f2937;
}
.close-btn {
  background: transparent;
  border: none;
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
  color: #444;
}
.booking-form {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.form-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 14px 18px 110px;
  -webkit-overflow-scrolling: touch;
}
.form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 14px;
}
.double {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}
.double .form-row {
  flex: 1 1 160px;
  margin-bottom: 14px;
}
label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  letter-spacing: .2px;
}
input, textarea {
  border: 1px solid #d7dce5;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 14px;
  outline: none;
  background: #f9fafb;
  transition: border-color .15s, background .15s;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
}
input:focus, textarea:focus {
  border-color: #7a8bff;
  background: #fff;
}
input.invalid, textarea.invalid {
  border-color: #d9343a;
  background: #fff;
}
textarea {
  resize: vertical;
  min-height: 60px;
}
.hint {
  font-size: 11px;
  color: #6b7280;
  margin: 4px 0 0;
}
.err {
  color: #d9343a;
  font-size: 12px;
  margin: 2px 0 0;
}
.buttons {
  position: sticky;
  bottom: 0;
  padding: 12px 18px calc(env(safe-area-inset-bottom, 0) + 12px);
  background: #ffffff;
  border-top: 1px solid #e4e7ed;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  z-index: 3;
}
@media (max-width: 679px) {
  .buttons {
    position: fixed;
    left: 0;
    right: 0;
    max-width: 560px;
    margin: 0 auto;
  }
}
.btn {
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: background .18s, filter .18s, color .18s;
  font-family: inherit;
}
.btn.primary {
  background: linear-gradient(90deg, #4f8cff, #6157ff);
  color: #fff;
}
.btn.primary:disabled {
  opacity: .7;
  cursor: not-allowed;
  filter: grayscale(.3);
}
.btn.secondary {
  background: #eef1f6;
  color: #374151;
}
.btn.secondary:hover {
  background: #e2e7ef;
}
.spinner {
  width: 18px;
  height: 18px;
  border: 3px solid #fff;
  border-right-color: rgba(255,255,255,0.3);
  border-radius: 50%;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>