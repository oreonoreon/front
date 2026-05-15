<template>
  <div class="today-view">
    <!-- Навигация -->
    <div class="calendar-nav">
      <button class="nav-btn" @click="shiftDays(-1)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <button class="nav-btn today-btn" @click="goToToday">Сегодня</button>
      <button class="nav-btn" @click="shiftDays(1)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <input
        type="date"
        class="nav-date-input"
        :value="startDate"
        @change="jumpToDate($event.target.value)"
      />
    </div>

    <!-- Колонки дней -->
    <div class="days-container">
      <div
        v-for="date in visibleDates"
        :key="date"
        class="day-column"
        :class="{ 'is-today': isToday(date) }"
      >
        <!-- Заголовок дня -->
        <div class="day-header">
          <span class="day-weekday">{{ formatWeekday(date) }}</span>
          <span class="day-date">{{ formatDate(date) }}</span>
        </div>

        <!-- Тело дня -->
        <div class="day-body">
          <!-- Загрузка -->
          <div v-if="loadingDates[date]" class="day-placeholder">
            <span class="spinner"></span>
          </div>

          <template v-else>
            <!-- Check-in -->
            <template v-if="checkInsByDate[date]?.length">
              <div class="section-label section-checkin">▶ Check-in</div>
              <div
                v-for="b in checkInsByDate[date]"
                :key="'ci-' + b.id"
                class="booking-card checkin"
                style="cursor:pointer"
                @click="openEditReservationInfo(b, 'checkin', date)"
              >
                <div class="card-badge-row">
                  <span class="card-badge badge-checkin">CHECK-IN</span>
                </div>
                <div class="card-top">
                  <span class="card-room">{{ b.roomNumber }}</span>
                  <span class="card-time">{{ formatTimeFromDate(b.reservation_info.actual_check_in) }}</span>
                </div>
                <div class="card-guest">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  {{ b.name }}
                </div>
                <div v-if="b.phone" class="card-phone">📞 {{ b.phone }}</div>
                <div class="card-stay">
                  {{ formatDateShort(b.check_in) }} → {{ formatDateShort(b.check_out) }}
                  <span class="stay-days">({{ b.days }} н.)</span>
                </div>
                <div v-if="b.adult || b.children" class="card-guests-count">
                  <span v-if="b.adult">👤 {{ b.adult }}</span>
                  <span v-if="b.children">👶 {{ b.children }}</span>
                </div>
                <div v-if="b.reservationDescription" class="card-desc">{{ b.reservationDescription }}</div>
                <div v-if="b.electricity_and_water_payment" class="card-electricity">⚡ {{ b.electricity_and_water_payment }}</div>
                <div class="card-bottom">
                  <span class="price-tag booking-price">{{ b.reservation_info?.payment_on_checkin ?? 0 }}฿</span>
                  <span class="price-deposit">Депозит: {{ b.reservation_info?.deposit ?? 0 }} {{ b.reservation_info?.deposit_currency || 'USD' }}</span>
                </div>
              </div>
            </template>

            <!-- Check-out -->
            <template v-if="checkOutsByDate[date]?.length">
              <div class="section-label section-checkout">◀ Check-out</div>
              <div
                v-for="b in checkOutsByDate[date]"
                :key="'co-' + b.id"
                class="booking-card checkout"
                style="cursor:pointer"
                @click="openEditReservationInfo(b, 'checkout', date)"
              >
                <div class="card-badge-row">
                  <span class="card-badge badge-checkout">CHECK-OUT</span>
                </div>
                <div class="card-top">
                  <span class="card-room">{{ b.roomNumber }}</span>
                  <span class="card-time">{{ formatTimeFromDate(b.reservation_info.actual_check_out) }}</span>
                </div>
                <div class="card-guest">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  {{ b.name }}
                </div>
                <div v-if="b.phone" class="card-phone">📞 {{ b.phone }}</div>
                <div class="card-stay">
                  {{ formatDateShort(b.check_in) }} → {{ formatDateShort(b.check_out) }}
                  <span class="stay-days">({{ b.days }} н.)</span>
                </div>
                <div v-if="b.reservationDescription" class="card-desc">{{ b.reservationDescription }}</div>
                <div v-if="b.electricity_and_water_payment" class="card-electricity">⚡ {{ b.electricity_and_water_payment }}</div>
                <div class="card-bottom">
                  <span class="price-deposit">Депозит: {{ b.reservation_info?.deposit ?? 0 }} {{ b.reservation_info?.deposit_currency || 'USD' }}</span>
                </div>
              </div>
            </template>

            <!-- Уборки -->
            <template v-if="cleaningsByDate[date]?.length">
              <div class="section-label section-cleaning">🧹 Уборки</div>
              <div
                v-for="c in cleaningsByDate[date]"
                :key="'cl-' + c.id"
                class="cleaning-card"
                :class="{ paid: c.paid }"
                @click="openEditCleaning(c)"
              >
                <div class="card-badge-row">
                  <span class="card-badge badge-cleaning">CLEANING</span>
                </div>
                <div class="card-top">
                  <span class="card-room">{{ c.room }}</span>
                  <span class="card-time">{{ formatTime(c.cleaning_time) }}</span>
                </div>

                <div v-if="c.agent_name" class="card-agent">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  {{ c.agent_name }}
                </div>

                <div v-if="c.description" class="card-desc">
                  {{ c.description }}
                </div>

                <div class="card-bottom">
                  <div class="card-prices">
                    <span v-if="c.cleaning_price" class="price-tag cleaning-price">
                      🧹 {{ c.cleaning_price }}฿
                    </span>
                    <span v-if="c.laundry_price" class="price-tag laundry-price">
                      👕 {{ c.laundry_price }}฿
                    </span>
                  </div>
                  <span class="card-status" :class="c.paid ? 'status-paid' : 'status-unpaid'">
                    {{ c.paid ? '✓ Оплачено' : 'Не оплачено' }}
                  </span>
                </div>
              </div>
            </template>

            <!-- Всё пусто -->
            <div
              v-if="!checkInsByDate[date]?.length && !checkOutsByDate[date]?.length && !cleaningsByDate[date]?.length"
              class="day-placeholder"
            >
              <span class="empty-text">Нет событий</span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Модалка редактирования уборки -->
    <Teleport to="body">
      <div v-if="editModal.visible" class="modal-overlay" @click.self="closeEditModal">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Редактирование уборки</h3>
            <button class="modal-close" @click="closeEditModal">&times;</button>
          </div>

          <form class="modal-body" @submit.prevent="submitEdit">
            <div class="form-group">
              <label>Комната</label>
              <input v-model="editForm.room" type="text" class="form-input" />
            </div>

            <div class="form-group">
              <label>Дата</label>
              <input v-model="editForm.cleaning_date" type="date" class="form-input" />
            </div>

            <div class="form-group">
              <label>Время</label>
              <vue-timepicker
                v-model="editForm.cleaning_time_obj"
                format="HH:mm"
                :hour-range="[[0,23]]"
                :minute-interval="1"
                close-on-complete
                input-class="time-picker-input"
              />
            </div>

            <div class="form-group">
              <label>Агент</label>
              <input v-model="editForm.agent_name" type="text" class="form-input" />
            </div>

            <div class="form-group">
              <label>Описание</label>
              <textarea v-model="editForm.description" class="form-input form-textarea" rows="3"></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Цена уборки (฿)</label>
                <input v-model.number="editForm.cleaning_price" type="number" min="0" class="form-input" />
              </div>
              <div class="form-group">
                <label>Прачечная (฿)</label>
                <input v-model.number="editForm.laundry_price" type="number" min="0" class="form-input" />
              </div>
            </div>

            <div class="form-group form-checkbox-group">
              <label class="checkbox-label">
                <input v-model="editForm.paid" type="checkbox" />
                Оплачено
              </label>
            </div>

            <div v-if="editModal.error" class="form-error">{{ editModal.error }}</div>

            <div class="modal-footer">
              <button type="button" class="btn btn-cancel" @click="closeEditModal">Отмена</button>
              <button type="submit" class="btn btn-save" :disabled="editModal.saving">
                {{ editModal.saving ? 'Сохранение...' : 'Сохранить' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Модалка редактирования reservation_info (check-in / check-out) -->
    <Teleport to="body">
      <div v-if="riModal.visible" class="modal-overlay" @click.self="closeRiModal">
        <div class="modal-card">
          <div class="modal-header">
            <h3>{{ riModal.type === 'checkin' ? 'Редактирование Check-in' : 'Редактирование Check-out' }}</h3>
            <button class="modal-close" @click="closeRiModal">&times;</button>
          </div>
          <form class="modal-body" @submit.prevent="submitRi">

            <!-- Дата -->
            <div class="form-group">
              <label>{{ riModal.type === 'checkin' ? 'Дата заезда (actual)' : 'Дата выезда (actual)' }}</label>
              <input v-model="riForm.date" type="date" class="form-input" />
            </div>

            <!-- Время -->
            <div class="form-group">
              <label>{{ riModal.type === 'checkin' ? 'Время заезда (actual)' : 'Время выезда (actual)' }}</label>
              <vue-timepicker
                v-model="riForm.time_obj"
                format="HH:mm"
                :hour-range="[[0,23]]"
                :minute-interval="1"
                close-on-complete
                input-class="time-picker-input"
              />
            </div>

            <!-- Депозит -->
            <div v-if="riModal.type !== 'checkout'" class="form-row">
              <div class="form-group">
                <label>Депозит</label>
                <input v-model.number="riForm.deposit" type="number" min="0" class="form-input" />
              </div>
              <div class="form-group">
                <label>Валюта депозита</label>
                <input v-model="riForm.deposit_currency" type="text" class="form-input" placeholder="USD" />
              </div>
            </div>

            <div v-if="riModal.error" class="form-error">{{ riModal.error }}</div>

            <div class="modal-footer">
              <button type="button" class="btn btn-cancel" @click="closeRiModal">Отмена</button>
              <button type="submit" class="btn btn-save" :disabled="riModal.saving">
                {{ riModal.saving ? 'Сохранение...' : 'Сохранить' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import api from '../api.js'
import VueTimepicker from 'vue3-timepicker'
import 'vue3-timepicker/dist/VueTimepicker.css'

// ─── Модалка редактирования уборки ───
const editModal = reactive({
  visible: false,
  saving: false,
  error: '',
  originalDate: '',  // дата дня, чтобы обновить список после сохранения
})

const editForm = reactive({
  id: null,
  room: '',
  cleaning_date: '',
  cleaning_time_obj: { HH: '12', mm: '00' },
  agent_name: '',
  description: '',
  cleaning_price: 0,
  laundry_price: 0,
  paid: false,
  reservation_id: null,
})

function openEditCleaning(c) {
  editForm.id = c.id
  editForm.room = c.room

  const m = String(c.cleaning_time).match(/(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/)
  editForm.cleaning_date = m ? m[1] : ''
  editForm.cleaning_time_obj = m ? { HH: m[2], mm: m[3] } : { HH: '12', mm: '00' }

  editForm.agent_name = c.agent_name || ''
  editForm.description = c.description || ''
  editForm.cleaning_price = c.cleaning_price || 0
  editForm.laundry_price = c.laundry_price || 0
  editForm.paid = !!c.paid
  editForm.reservation_id = c.reservation_id ?? null

  // Запоминаем дату, чтобы обновить колонку после сохранения
  editModal.originalDate = editForm.cleaning_date

  editModal.error = ''
  editModal.saving = false
  editModal.visible = true
}

function closeEditModal() {
  editModal.visible = false
}

async function submitEdit() {
  editModal.saving = true
  editModal.error = ''

  try {
    const HH = editForm.cleaning_time_obj?.HH ?? '12'
    const mm = editForm.cleaning_time_obj?.mm ?? '00'
    const isoTime = `${editForm.cleaning_date}T${HH}:${mm}:00Z`

    const payload = {
      room: editForm.room,
      cleaning_time: isoTime,
      agent_name: editForm.agent_name,
      description: editForm.description,
      cleaning_price: editForm.cleaning_price,
      laundry_price: editForm.laundry_price,
      paid: editForm.paid,
    }
    if (editForm.reservation_id != null) {
      payload.reservation_id = editForm.reservation_id
    }

    await api.patch(`/calendar/cleaning/${editForm.id}`, payload)

    closeEditModal()

    // Обновляем данные: перезагружаем старую дату и новую (если дату уборки поменяли)
    const newDate = editForm.cleaning_date
    const datesToRefresh = new Set([editModal.originalDate, newDate].filter(Boolean))

    datesToRefresh.forEach((date) => {
      fetchedDates.delete(date)
      fetchDayData(date)
    })
  } catch (e) {
    editModal.error = e.response?.data || e.message || 'Ошибка сохранения'
  } finally {
    editModal.saving = false
  }
}

// ─── Модалка редактирования reservation_info ───
const riModal = reactive({
  visible: false,
  saving: false,
  error: '',
  type: 'checkin',   // 'checkin' | 'checkout'
  refreshDate: '',   // дата колонки для обновления после сохранения
})

const riForm = reactive({
  ri_id: null,
  full_ri: null,     // исходный объект reservation_info целиком
  date: '',
  time_obj: { HH: '12', mm: '00' },
  deposit: 0,
  deposit_currency: 'USD',
})

function openEditReservationInfo(b, type, columnDate) {
  const ri = b.reservation_info
  if (!ri?.id) return

  riModal.type = type
  riModal.refreshDate = columnDate
  riModal.error = ''
  riModal.saving = false

  riForm.ri_id = ri.id
  riForm.full_ri = { ...ri }
  riForm.deposit = ri.deposit ?? 0
  riForm.deposit_currency = ri.deposit_currency || 'USD'

  const isoStr = type === 'checkin' ? ri.actual_check_in : ri.actual_check_out
  const m = String(isoStr || '').match(/(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/)
  riForm.date = m ? m[1] : ''
  riForm.time_obj = m ? { HH: m[2], mm: m[3] } : { HH: '12', mm: '00' }

  riModal.visible = true
}

function closeRiModal() {
  riModal.visible = false
}

async function submitRi() {
  riModal.saving = true
  riModal.error = ''
  try {
    const HH = riForm.time_obj?.HH ?? '12'
    const mm = riForm.time_obj?.mm ?? '00'
    const isoTime = `${riForm.date}T${HH}:${mm}:00Z`

    const payload = { ...riForm.full_ri }
    payload.deposit = riForm.deposit
    payload.deposit_currency = riForm.deposit_currency
    if (riModal.type === 'checkin') {
      payload.actual_check_in = isoTime
    } else {
      payload.actual_check_out = isoTime
    }

    await api.patch(`/calendar/reservation-info/${riForm.ri_id}`, payload)

    closeRiModal()
    fetchedDates.delete(riModal.refreshDate)
    fetchDayData(riModal.refreshDate)
  } catch (e) {
    riModal.error = e.response?.data || e.message || 'Ошибка сохранения'
  } finally {
    riModal.saving = false
  }
}

const daysToShow = ref(getDaysCount())

function getDaysCount() {
  const w = window.innerWidth
  if (w <= 600) return 1       // мобилка
  if (w <= 900) return 2       // планшет portrait
  if (w <= 1200) return 3      // планшет landscape
  return 5                     // десктоп
}

let resizeTimer = null
function onResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    daysToShow.value = getDaysCount()
  }, 200)
}

onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  clearTimeout(resizeTimer)
})

const startDate = ref(todayString())
const cleaningsByDate = ref({})
const checkInsByDate = ref({})
const checkOutsByDate = ref({})
const loadingDates = ref({})

const visibleDates = computed(() => {
  const dates = []
  const base = new Date(startDate.value + 'T00:00:00')
  for (let i = 0; i < daysToShow.value; i++) {
    const d = new Date(base)
    d.setDate(d.getDate() + i)
    dates.push(toISODate(d))
  }
  return dates
})

// Хранит уже загруженные даты, чтобы не грузить повторно при навигации назад
const fetchedDates = new Set()

watch(
  visibleDates,
  (dates) => {
    dates.forEach((date) => {
      if (!fetchedDates.has(date)) {
        fetchDayData(date)
      }
    })
  },
  { immediate: true }
)

async function fetchDayData(date) {
  fetchedDates.add(date)
  loadingDates.value = { ...loadingDates.value, [date]: true }

  try {
    const [cleaningsRes, checkInsRes, checkOutsRes] = await Promise.allSettled([
      api.get(`/calendar/cleaning/date/${date}`),
      api.get(`/calendar/bookings/check-in/${date}`),
      api.get(`/calendar/bookings/check-out/${date}`),
    ])

    // Уборки
    const cleanings = cleaningsRes.status === 'fulfilled' ? (cleaningsRes.value.data || []) : []
    cleanings.sort((a, b) => new Date(a.cleaning_time) - new Date(b.cleaning_time))
    cleaningsByDate.value = { ...cleaningsByDate.value, [date]: cleanings }

    // Check-in
    const checkIns = checkInsRes.status === 'fulfilled' ? (checkInsRes.value.data || []) : []
    checkInsByDate.value = { ...checkInsByDate.value, [date]: checkIns }

    // Check-out
    const checkOuts = checkOutsRes.status === 'fulfilled' ? (checkOutsRes.value.data || []) : []
    checkOutsByDate.value = { ...checkOutsByDate.value, [date]: checkOuts }
  } catch (e) {
    console.error(`Ошибка загрузки данных за ${date}:`, e)
    cleaningsByDate.value = { ...cleaningsByDate.value, [date]: [] }
    checkInsByDate.value = { ...checkInsByDate.value, [date]: [] }
    checkOutsByDate.value = { ...checkOutsByDate.value, [date]: [] }
  } finally {
    const copy = { ...loadingDates.value }
    delete copy[date]
    loadingDates.value = copy
  }
}

function shiftDays(offset) {
  const d = new Date(startDate.value + 'T00:00:00')
  d.setDate(d.getDate() + offset)
  startDate.value = toISODate(d)
}

function goToToday() {
  startDate.value = todayString()
  // Принудительно перезагружаем видимые дни
  visibleDates.value.forEach((date) => {
    fetchedDates.delete(date)
    fetchDayData(date)
  })
}

function jumpToDate(dateStr) {
  if (!dateStr) return
  startDate.value = dateStr
}

// --- Утилиты ---

function todayString() {
  return toISODate(new Date())
}

function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isToday(dateStr) {
  return dateStr === todayString()
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function formatWeekday(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const name = d.toLocaleDateString('ru-RU', { weekday: 'long' })
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function formatTime(isoTime) {
  // isoTime = "2026-04-11T14:00:00Z" — берём время как есть, без конвертации TZ
  return extractTime(isoTime)
}

function formatDateShort(isoDate) {
  // Парсим без сдвига TZ: берём только дату из строки
  const match = String(isoDate).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return ''
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short'
  })
}

function formatTimeFromDate(isoDate) {
  const time = extractTime(isoDate)
  // Если время 00:00 — значит реальное время не задано
  return time === '00:00' ? '' : time
}

/**
 * Извлекает HH:MM из ISO-строки без конвертации часовых поясов.
 * "2026-04-11T14:00:00Z" → "14:00"
 * "2026-04-11T14:00:00+07:00" → "14:00"
 */
function extractTime(isoStr) {
  const match = String(isoStr).match(/T(\d{2}):(\d{2})/)
  if (!match) return ''
  return `${match[1]}:${match[2]}`
}
</script>

<style scoped>
.today-view {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background: #f0f2f5;
}

/* ─── Навигация ─── */
.calendar-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border: 1px solid #d0d5dd;
  border-radius: 10px;
  background: #fff;
  color: #344054;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
}

.nav-btn:hover {
  background: #f9fafb;
  border-color: #98a2b3;
}

.nav-btn:active {
  background: #f2f4f7;
  transform: scale(0.97);
}

.today-btn {
  background: linear-gradient(90deg, #4f8cff 0%, #6157ff 100%);
  color: #fff;
  border: none;
  padding: 8px 20px;
  font-weight: 600;
}

.today-btn:hover {
  filter: brightness(1.08);
  background: linear-gradient(90deg, #4f8cff 0%, #6157ff 100%);
}

.nav-date-input {
  padding: 7px 12px;
  border: 1px solid #d0d5dd;
  border-radius: 10px;
  background: #fff;
  color: #344054;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s;
}

.nav-date-input:focus {
  border-color: #4f8cff;
  box-shadow: 0 0 0 3px rgba(79, 140, 255, 0.12);
}

/* ─── Контейнер дней ─── */
.days-container {
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 0;
  overflow-x: auto;
}

/* ─── Колонка дня ─── */
.day-column {
  flex: 1;
  min-width: 280px;
  background: #fff;
  border: 1px solid #e4e7ec;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.day-column.is-today {
  border-color: #4f8cff;
  box-shadow: 0 0 0 3px rgba(79, 140, 255, 0.15);
}

.day-header {
  padding: 18px 20px 14px;
  text-align: center;
  border-bottom: 1px solid #f2f4f7;
  background: #fafbfc;
}

.day-weekday {
  display: block;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #98a2b3;
}

.is-today .day-weekday {
  color: #4f8cff;
}

.day-date {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #1d2939;
  margin-top: 4px;
}

.is-today .day-date {
  color: #4f8cff;
}

/* ─── Тело дня ─── */
.day-body {
  flex: 1;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.day-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 80px;
}

.empty-text {
  font-size: 14px;
  color: #b0b8c4;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e4e7ec;
  border-top-color: #4f8cff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* ─── Секции-разделители ─── */
.section-label {
  font-size: 13px;
  font-weight: 700;
  padding: 4px 0;
  margin-top: 4px;
  letter-spacing: 0.3px;
}

.section-checkin {
  color: #027a48;
}

.section-checkout {
  color: #b42318;
}

.section-cleaning {
  color: #667085;
}

/* ─── Карточка бронирования ─── */
.booking-card {
  border: 1px solid #e4e7ec;
  border-radius: 14px;
  padding: 14px;
  background: #fff;
  transition: box-shadow 0.15s, transform 0.15s;
}

.booking-card:hover {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.07);
  transform: translateY(-1px);
}

.booking-card.checkin {
  border-left: 4px solid #32d583;
}

.booking-card.checkout {
  border-left: 4px solid #f97066;
}

.card-badge-row {
  text-align: center;
  margin-bottom: 8px;
}

.card-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge-checkin {
  background: #ecfdf3;
  color: #027a48;
}

.badge-checkout {
  background: #fef3f2;
  color: #b42318;
}

.badge-cleaning {
  background: #eff8ff;
  color: #175cd3;
}

.card-guest {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  font-weight: 600;
  color: #344054;
  margin-bottom: 4px;
}

.card-guest svg {
  flex-shrink: 0;
  color: #98a2b3;
}

.card-phone {
  font-size: 13px;
  color: #667085;
  margin-bottom: 4px;
}

.card-stay {
  font-size: 12.5px;
  color: #667085;
  margin-bottom: 4px;
}

.stay-days {
  color: #98a2b3;
}

.card-guests-count {
  display: flex;
  gap: 10px;
  font-size: 13px;
  color: #667085;
  margin-bottom: 4px;
}

.booking-price {
  background: #f0e6ff;
  color: #6927da;
}

.price-night {
  font-size: 12px;
  color: #98a2b3;
  font-weight: 500;
}

.price-deposit {
  margin-left: auto;
  font-size: 12px;
  color: #344054;
  font-weight: 600;
  background: #f2f4f7;
  border-radius: 6px;
  padding: 2px 8px;
}

/* ─── Карточка уборки ─── */
.cleaning-card {
  border: 1px solid #e4e7ec;
  border-radius: 14px;
  padding: 14px;
  background: #fff;
  cursor: pointer;
  transition: box-shadow 0.15s, transform 0.15s;
  border-left: 4px solid #f97066;
}

.cleaning-card:hover {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.07);
  transform: translateY(-1px);
}

.cleaning-card.paid {
  border-left-color: #32d583;
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.card-room {
  font-size: 16px;
  font-weight: 700;
  color: #1d2939;
}

.card-time {
  font-size: 13px;
  font-weight: 600;
  color: #667085;
  background: #f2f4f7;
  padding: 3px 10px;
  border-radius: 8px;
}

.card-agent {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: #667085;
  margin-bottom: 4px;
}

.card-agent svg {
  flex-shrink: 0;
  color: #98a2b3;
}

.card-desc {
  font-size: 12.5px;
  color: #98a2b3;
  line-height: 1.4;
  margin-bottom: 4px;
}

.card-electricity {
  font-size: 12.5px;
  color: #667085;
  margin-bottom: 4px;
}

.card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f2f4f7;
}

.card-prices {
  display: flex;
  gap: 8px;
}

.price-tag {
  font-size: 12.5px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
}

.cleaning-price {
  background: #eff8ff;
  color: #175cd3;
}

.laundry-price {
  background: #fef3f2;
  color: #b42318;
}

.card-status {
  font-size: 12px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
}

.status-paid {
  background: #ecfdf3;
  color: #027a48;
}

.status-unpaid {
  background: #fef3f2;
  color: #b42318;
}

/* ─── Адаптивность ─── */
@media (max-width: 820px) {
  .today-view {
    padding: 12px;
  }

  .days-container {
    gap: 10px;
  }

  .day-column {
    min-width: unset;
  }
}

@media (max-width: 480px) {
  .today-view {
    padding: 8px;
  }

  .cleaning-card {
    padding: 12px;
  }
}

/* ─── Модалка ─── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-card {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow: visible;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid #f2f4f7;
}

.modal-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #1d2939;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #98a2b3;
  line-height: 1;
  padding: 0;
}

.modal-close:hover {
  color: #344054;
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: 13px;
  font-weight: 600;
  color: #344054;
}

.form-input {
  padding: 8px 12px;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  font-size: 14px;
  color: #1d2939;
  outline: none;
  transition: border-color 0.15s;
}

.form-input:focus {
  border-color: #4f8cff;
  box-shadow: 0 0 0 3px rgba(79, 140, 255, 0.12);
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row .form-group {
  flex: 1;
}

.form-checkbox-group {
  flex-direction: row;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #344054;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #4f8cff;
  cursor: pointer;
}

.form-error {
  font-size: 13px;
  color: #b42318;
  background: #fef3f2;
  padding: 8px 12px;
  border-radius: 8px;
}

.modal-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding-top: 8px;
}

.btn {
  padding: 8px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
}

.btn-cancel {
  background: #f2f4f7;
  color: #344054;
}

.btn-cancel:hover {
  background: #e4e7ec;
}

.btn-save {
  background: linear-gradient(90deg, #4f8cff 0%, #6157ff 100%);
  color: #fff;
}

.btn-save:hover {
  filter: brightness(1.08);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── vue3-timepicker styling ── */
:deep(.vue__time-picker) {
  width: 100%;
}
:deep(.vue__time-picker input.time-picker-input) {
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  outline: none;
  background: #f9fafb;
  transition: border-color .15s, background .15s;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
  cursor: pointer;
  height: auto;
}
:deep(.vue__time-picker input.time-picker-input:focus) {
  border-color: #4f8cff;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(79, 140, 255, 0.12);
}
:deep(.vue__time-picker .dropdown) {
  z-index: 9999;
}
</style>
