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
            <div class="form-row">
              <label for="roomNumber">Room number</label>
              <input
                  id="roomNumber"
                  v-model="form.roomNumber"
                  required
                  autocomplete="off"
                  ref="firstInputRef"
              />
            </div>

            <div class="form-row">
              <label for="name">Guest name</label>
              <input id="name" v-model="form.name" required autocomplete="off" />
            </div>

            <div class="double">
              <div class="form-row">
                <label for="check_in">Check In</label>
                <input
                    id="check_in"
                    type="date"
                    :value="toInputDate(form.check_in)"
                    @input="onDateInput($event, 'check_in')"
                    required
                />
              </div>
              <div class="form-row">
                <label for="check_out">Check Out</label>
                <input
                    id="check_out"
                    type="date"
                    :value="toInputDate(form.check_out)"
                    @input="onDateInput($event, 'check_out')"
                    required
                />
              </div>
            </div>

            <div class="form-row">
              <label for="price">Price</label>
              <input id="price" v-model="form.price" inputmode="numeric" @blur="digitsOrEmpty('price')" />
            </div>

            <div class="form-row">
              <label for="phone">Phone / Telegram</label>
              <input id="phone" v-model="form.phone" @blur="validatePhoneField" />
              <p v-if="errors.phone" class="err">{{ errors.phone }}</p>
            </div>

            <div class="double">
              <div class="form-row">
                <label for="cleaning_price">Cleaning price</label>
                <input id="cleaning_price" v-model="form.cleaning_price" inputmode="numeric" @blur="digitsOrEmpty('cleaning_price')" />
              </div>
              <div class="form-row">
                <label for="electricity_and_water_payment">Electricity/Water</label>
                <input id="electricity_and_water_payment" v-model="form.electricity_and_water_payment" />
              </div>
            </div>

            <div class="double">
              <div class="form-row">
                <label for="adult">Adult</label>
                <input id="adult" v-model="form.adult" inputmode="numeric" @blur="digitsOrEmpty('adult')" />
              </div>
              <div class="form-row">
                <label for="children">Children</label>
                <input id="children" v-model="form.children" inputmode="numeric" @blur="digitsOrEmpty('children')" />
              </div>
            </div>

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
                Даты хранятся как DayPilot.Date. Ввод через native date input → конвертация в DayPilot.Date.
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
import { DayPilot } from 'daypilot-pro-vue';
import { reactive, watch, onMounted, onBeforeUnmount, nextTick, ref } from 'vue';

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  value: { type: Object, required: true },
  isEdit: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'submit', 'cancel']);

const form = reactive({
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

const errors = reactive({ phone: '' });

// БЫЛО: const submitting = reactive({ value: false });
// СТАЛО: обычный ref(boolean)
const submitting = ref(false);

const firstInputRef = ref(null);
const panelRef = ref(null);

watch(
    () => props.value,
    (v) => {
      if (!v) return;
      form.roomNumber = v.roomNumber ?? '';
      form.name = v.name ?? '';
      form.check_in = v.check_in instanceof DayPilot.Date ? v.check_in : new DayPilot.Date(v.check_in);
      form.check_out = v.check_out instanceof DayPilot.Date ? v.check_out : new DayPilot.Date(v.check_out);
      form.price = v.price ?? '';
      form.phone = v.phone ?? '';
      form.cleaning_price = v.cleaning_price ?? '';
      form.electricity_and_water_payment = v.electricity_and_water_payment ?? '';
      form.adult = v.adult ?? '';
      form.children = v.children ?? '';
      form.reservationDescription = v.reservationDescription ?? '';
      errors.phone = '';
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

function digitsOrEmpty(field) {
  const v = form[field];
  if (v === '') return;
  if (!/^\d+$/.test(v)) {
    form[field] = '';
  }
}

function validatePhoneField() {
  errors.phone = '';
  if (!form.phone) return;
  const phoneRegex = /^\+{1}\d{10,15}$/;
  const tgRegex = /^@?[A-Za-z0-9_]{5,32}$/;
  if (!phoneRegex.test(form.phone) && !tgRegex.test(form.phone)) {
    errors.phone = 'Телефон (+ и 10–15 цифр) или Telegram (5–32 символа)';
  }
}

function validateAll() {
  validatePhoneField();
  if (!form.roomNumber || !form.name || !form.check_in || !form.check_out) return false;
  if (errors.phone) return false;
  return true;
}

async function submit() {
  if (!validateAll()) return;
  submitting.value = true;
  try {
    emit('submit', {
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
/* (стили оставлены без изменений) */
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