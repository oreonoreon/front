<template>
  <div class="scheduler-container">
    <div class="scheduler-wrapper">
      <DayPilotScheduler :config="config" ref="schedulerRef" />
    </div>
    <div class="info-panel" v-if="selectedGuest">
      <button class="close-btn" @click="selectedGuest = null">×</button>
      <button class="copy-btn" type="button" @click="copyGuestInfo">
        {{ copyLabel }}
      </button>

      <div class="guest-card">
        <div class="guest-header">
          <div class="guest-name">{{ selectedGuest.tag?.name }}</div>
          <span v-if="selectedGuest.tag?.phone" class="guest-phone">
            📞 {{ selectedGuest.tag.phone }}
          </span>
        </div>

        <div class="info-section">
          <div class="info-section-title">Проживание:</div>
          <div class="info-row">
            <span class="info-label">Апартаменты</span>
            <span class="info-value">{{ selectedGuest.tag?.roomNumber }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Заезд</span>
            <span class="info-value">{{ selectedGuest.tag?.check_in }} {{ selectedGuest.tag?.check_in_time }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Выезд</span>
            <span class="info-value">{{ selectedGuest.tag?.check_out }} {{ selectedGuest.tag?.check_out_time }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Ночей</span>
            <span class="info-value">{{ selectedGuest.tag?.days }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Взрослые / Дети</span>
            <span class="info-value">{{ selectedGuest.tag?.adult }} / {{ selectedGuest.tag?.children }}</span>
          </div>
        </div>

        <div class="info-section">
          <div class="info-section-title">Оплата:</div>
          <div class="info-row">
            <span class="info-label">Цена</span>
            <span class="info-value">{{ selectedGuest.tag?.price }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Уборка</span>
            <span class="info-value">{{ selectedGuest.tag?.cleaning_price }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Электро/вода</span>
            <span class="info-value">{{ selectedGuest.tag?.electricity_and_water_payment }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Цена за ночь</span>
            <span class="info-value">{{ selectedGuest.tag?.priceForOneNight }}</span>
          </div>
        </div>

        <div class="info-section" v-if="selectedGuest.tag?.reservation_info">
          <div class="info-section-title">Депозит и предоплата:</div>
          <div class="info-row">
            <span class="info-label">Депозит</span>
            <span class="info-value">
              {{ selectedGuest.tag.reservation_info.deposit }} {{ selectedGuest.tag.reservation_info.deposit_currency }}
            </span>
          </div>
          <div class="info-row" >
            <span class="info-label">Предоплата</span>
            <span class="info-value">{{ selectedGuest.tag.reservation_info.prepayment }}</span>
          </div>
          <div class="info-row" >
            <span class="info-label">Оплата при заезде</span>
            <span class="info-value">{{ selectedGuest.tag.reservation_info.payment_on_checkin }}</span>
          </div>
          <div class="info-row" v-if="selectedGuest.tag.reservation_info.actual_check_in">
            <span class="info-label">Фактический заезд</span>
            <span class="info-value">{{ selectedGuest.tag.reservation_info.actual_check_in }}</span>
          </div>
          <div class="info-row" v-if="selectedGuest.tag.reservation_info.actual_check_out">
            <span class="info-label">Фактический выезд</span>
            <span class="info-value">{{ selectedGuest.tag.reservation_info.actual_check_out }}</span>
          </div>
        </div>

        <div class="info-section" >
          <div class="info-section-title">Описание:</div>
          <p class="info-description">{{ selectedGuest.tag.reservationDescription }}</p>
        </div>
      </div>

      <div class="statuses-section" v-if="statusTypes.length">
        <div class="statuses-title">Statuses</div>
        <div class="statuses-row">
          <button
              v-for="st in statusTypes"
              :key="st.id"
              type="button"
              class="status-btn"
              :class="{ active: activeStatusTypeIds.has(st.id), loading: statusLoading }"
              :disabled="statusLoading"
              @click="toggleGuestStatus(st.id)"
          >
            {{ st.name }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <BookingFormOverlay
      :model-value="showBookingForm"
      :value="bookingDraft"
      :is-edit="isEditMode"
      @update:modelValue="v => showBookingForm = v"
      @submit="handleBookingSubmit"
      @cancel="handleBookingCancel"
  />
</template>

<script setup>
import { useRouter } from "vue-router";
const router = useRouter();

import { DayPilot, DayPilotScheduler } from "@oreonoreon/calendar";
import {ref, reactive, onMounted, watch, computed} from "vue";
import api from "../api.js";
import BookingFormOverlay from "./BookingFormOverlay.vue";
import { useSchedulerColumnSelection } from "../composables/useSchedulerColumnSelection";

import "../styles/schedulerColumnSelection.css";

const schedulerRef = ref(null);
const selectedGuest = ref(null);

// Справочник типов статусов и состояние загрузки для кнопок в info-panel
const statusTypes = ref([]);
const statusLoading = ref(false);
const activeStatusTypeIds = computed(() => {
  const statuses = selectedGuest.value?.tag?.statuses || [];
  return new Set(statuses.map(s => s.status_type_id));
});

async function loadStatusTypes() {
  try {
    const { data } = await api.get('/calendar/status-types');
    statusTypes.value = data || [];
  } catch (err) {
    console.error('Failed to load status types:', err);
  }
}

// Копирование краткой информации о госте в буфер обмена
const copyLabel = ref('Копировать');
async function copyGuestInfo() {
  const t = selectedGuest.value?.tag;
  if (!t) return;

  const text =
      `name : ${t.name ?? ''}\n` +
      `phone : ${t.phone ?? ''}\n` +
      `roomNumber : ${t.roomNumber ?? ''}\n` +
      `check_in : ${t.check_in ?? ''}\n` +
      `check_out : ${t.check_out ?? ''}\n` +
      `price : ${t.price ?? ''}\n` +
      `adult : ${t.adult ?? ''}\n` +
      `children : ${t.children ?? ''}`;

  try {
    await navigator.clipboard.writeText(text);
    copyLabel.value = 'Скопировано!';
  } catch (err) {
    console.error('Failed to copy guest info:', err);
    copyLabel.value = 'Ошибка копирования';
  } finally {
    setTimeout(() => { copyLabel.value = 'Копировать'; }, 1500);
  }
}


const showBookingForm = ref(false);
const bookingDraft = ref(null);

// Управление показом колонки Description
const showDescription = ref(false);

// Мгновенно скрываем/показываем колонку через класс на корневом элементе,
// а полный перерасчёт ширины откладываем.
function toggleDescription() {
  showDescription.value = !showDescription.value;

  const host = schedulerRef.value?.$el;
  if (host) {
    host.classList.toggle('desc-hidden', !showDescription.value); // мгновенно прячем/показываем
  }

  // Отложенный «настоящий» апдейт колонок (пересчёт ширины левой панели)
  deferRowHeaderUpdate();
}


const chevronSvg = `
    <svg xmlns="http://www.w3.org/2000/svg"
         viewBox="0 0 24 24" width="20" height="20" fill="none"
         stroke="#4f8cff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
         class="rowheader-chevron" data-chevron="1">
         
      <polyline points="6 8 12 16 18 8"/>
    </svg>
  `;



// Строим набор колонок (1 или 2) без инлайновых transform у шеврона
function buildRowHeaderColumns(show) {

  const cols = [
    {
      text: "Room number",
      display: "name",
      html: `<span style="display:flex;align-items:center;gap:6px;">
        <span>Room number</span>${chevronSvg}
      </span>`,
    }
  ];
  if (show) {
    cols.push({ text: "Description", display: "description",  maxAutoWidth: 200 });
  }
  return cols;
}

// Отложить апдейт, чтобы не блокировать клик
function deferRowHeaderUpdate() {
  const run = () => {
    const cols = buildRowHeaderColumns(showDescription.value);
    schedulerRef.value?.control.update({ rowHeaderColumns: cols });
  };
  if ('requestIdleCallback' in window) {
    requestIdleCallback(run, { timeout: 200 });
  } else {
    setTimeout(run, 30);
  }
}


// Флаги редактирования
const isEditMode = ref(false);
const editingEvent = ref(null);

const start = new DayPilot.Date("2023-11-01");
const end = new DayPilot.Date("2027-12-31");
const msPerDay = 24 * 60 * 60 * 1000;
const days = Math.round((new Date(end.value) - new Date(start.value)) / msPerDay) + 1;

// Глобальное меню для событий
let openMenuEventId = null;
let menuOpen = false;

const eventMenu = new DayPilot.Menu({
  items: [
    {
      text: "Редактировать",
      onClick: (menuArgs) => {
        const e = menuArgs.source;
        openEditForm(e);
      }
    },
    {
      text: "Удалить",
      onClick: async (menuArgs) => {
        const event = menuArgs.source;
        const res = await deleteBookingWithConfirm(event);
        if (res === "ok") {
          schedulerRef.value?.control.events.remove(event);
          schedulerRef.value?.control.message("Удалено");
        } else if (res === "error") {
          schedulerRef.value?.control.message("Ошибка удаления");
        }
      }
    }
  ],
  onClosed: () => {
    openMenuEventId = null;
    menuOpen = false;
  }
});

const headerMenu = new DayPilot.Menu({
  items: [
    {
      text: "Report",
      onClick: async (args) => {
        const form = [
          {name: "Apartment", id: "room_number", type: "text"},
          {name: "Start date", id: "start", type: "date", dateFormat: "yyyy-MM-dd"},
          {name: "End Date", id: "end", type: "date", dateFormat: "yyyy-MM-dd"}
        ];
        const data = {room_number: args.source.id};
        const modal = await DayPilot.Modal.form(form, data);

        if (modal.canceled) {
          return;
        }

        // Преобразуем DayPilot.Date в строку формата YYYY-MM-DD
        const startDate = new DayPilot.Date(modal.result.start).toString("yyyy-MM-dd");
        const endDate = new DayPilot.Date(modal.result.end).toString("yyyy-MM-dd");

        await generateReport(
            modal.result.room_number,
            startDate,
            endDate
        );
      }
    },
    {
      text: "ReportAll",
      onClick: async (args) => {

        await generateReportAll(

        );
      }
    }
  ]
});



const config = reactive({
  heightSpec: "Parent100Pct",
  timeHeaders: [{ groupBy: "Year" }, { groupBy: "Month" }, { groupBy: "Day", format: "d" }],
  scale: "Day",
  days: days,
  startDate: start,
  allowEventOverlap: false,
  eventBorderRadius: "15px",
  rowMinHeight: 50,
  useEventBoxes: "Never",
  snapToGrid: false,
  eventMoveHandling: "Disabled",
  eventClickHandling: "CallBack",
  onEventClick: (args) => {
    const oe = args.originalEvent;
    if (oe?.target && oe.target.closest && oe.target.closest('.dp-event-chevron')) {
      return;
    }
    const clicked = args.e.data;
    selectedGuest.value =
        selectedGuest.value?.id === clicked.id ? null : clicked;
  },
  eventHoverHandling: "Bubble",
  bubble: new DayPilot.Bubble({
    onLoad: args => {
      const t = args.source.data.tag;
      args.html = t
          ? `<b>${args.source.data.text}</b><br/>📞 ${t.phone}<br/>🏠 ${t.roomNumber}`
          : "Информация отсутствует";
    }
  }),

  onBeforeEventRender: (args) => {
    const areas = args.data.areas || [];

    const chevronSvg = `
    <svg xmlns="http://www.w3.org/2000/svg"
         viewBox="0 0 24 24"
         width="14" height="14" fill="none"
         stroke="currentColor" stroke-width="4"
         stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 8 12 16 18 8"/>
    </svg>
  `;

    areas.push({
      right: 4,
      top: 4,
      width: 18,
      height: 18,
      visibility: "Visible",
      cssClass: "dp-event-chevron",
      html: chevronSvg,
      toolTip: "Действия",
      action: "ContextMenu",
      contextMenu: eventMenu,
      onClick: (areaArgs) => {
        const event = areaArgs.source;
        if (menuOpen && openMenuEventId === event.data.id) {
          eventMenu.hide();
          if (areaArgs.preventDefault) {
            areaArgs.preventDefault();
          }
          openMenuEventId = null;
          menuOpen = false;
          return;
        }
        openMenuEventId = event.data.id;
        menuOpen = true;
      }
    });

    // Цвет тела и полосы бронирования в зависимости от статусов брони:
    // guest_checked_in -> зелёное тело карточки, paid_to_owner -> зелёная/красная полоса.
    const statuses = args.data.tag?.statuses || [];
    const isCheckedIn = statuses.some(s => s.status_code === 'guest_checked_in');
    const isPaidToOwner = statuses.some(s => s.status_code === 'paid_to_owner');

    const statusClasses = [
      isCheckedIn ? 'evt-checked-in' : '',
      isPaidToOwner ? 'evt-paid-to-owner' : 'evt-not-paid-to-owner',
    ].filter(Boolean).join(' ');
    args.data.cssClass = statusClasses;

    args.data.areas = areas;
  },

  timeHeaderClickHandling: "JavaScript",

  // Колонки заголовков строк (инициализируются функцией ниже)
  rowHeaderColumns: [
    {
      text: "Room number",
      display: "name",
      // width: 120,
      html: `<span style="display:flex;align-items:center;gap:6px;">
        <span>Room number</span>${chevronSvg}
      </span>`,
    }
  ],

  crosshairType: "Full",

  contextMenuResource: headerMenu,
});


// Функция генерации и скачивания отчёта
const generateReport = async (room_number, start, end) => {
  try {
    const response = await api.post('/calendar/report', {
      room_number,
      start,
      end
    }, {
      responseType: 'blob'
    });

    // ВАЖНО: явно указываем MIME-тип из заголовков ответа
    const contentType = response.headers['content-type'] ||
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const blob = new Blob([response.data], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const contentDisposition = response.headers['content-disposition'];
    const fileName = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `report_${room_number}.xlsx`;

    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    schedulerRef.value?.control.message("Отчёт успешно загружен");
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const msg = error.response.data?.message || error.response.data || error.message;
      await DayPilot.Modal.alert(`Ошибка ${status}: ${msg}`);
    } else {
      await DayPilot.Modal.alert(`Ошибка: ${error.message}`);
    }
    throw error;
  }
};

const generateReportAll = async () => {
  try {
    const response = await api.post('/calendar/totalpriceReportXlsx', {}, {
      responseType: 'blob'
    });

    // ВАЖНО: явно указываем MIME-тип из заголовков ответа
    const contentType = response.headers['content-type'] ||
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const blob = new Blob([response.data], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const contentDisposition = response.headers['content-disposition'];
    const fileName = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `report_TotalPrice.xlsx`;

    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    schedulerRef.value?.control.message("Отчёт успешно загружен");
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const msg = error.response.data?.message || error.response.data || error.message;
      await DayPilot.Modal.alert(`Ошибка ${status}: ${msg}`);
    } else {
      await DayPilot.Modal.alert(`Ошибка: ${error.message}`);
    }
    throw error;
  }
};



/* ===== Выделение колонок через composable ===== */
const { selectionApi, attach } = useSchedulerColumnSelection({ config, schedulerRef });
attach();

/* ====== Редактирование ====== */
function extractTime(dpDate) {
  if (!dpDate) return null;
  const d = dpDate instanceof DayPilot.Date ? dpDate : new DayPilot.Date(dpDate);
  return d.toString('HH:mm:ss');
}

function extractDate(dpDate) {
  if (!dpDate) return null;
  const d = dpDate instanceof DayPilot.Date ? dpDate : new DayPilot.Date(dpDate);
  return d.toString('yyyy-MM-dd');
}

function openEditForm(event) {
  editingEvent.value = event;
  isEditMode.value = true;

  const t = event.data.tag || {};
  bookingDraft.value = {
    id: event.data.id,
    roomNumber: t.roomNumber ?? event.data.resource,
    name: t.name ?? event.data.text,
    check_in: event.data.start,
    check_out: event.data.end,
    check_in_time: t.check_in_time ?? extractTime(event.data.start) ?? '13:00:00',
    check_out_time: t.check_out_time ?? extractTime(event.data.end) ?? '11:00:00',
    price: t.price ?? '',
    phone: t.phone ?? '',
    cleaning_price: t.cleaning_price ?? '',
    electricity_and_water_payment: t.electricity_and_water_payment ?? '',
    adult: t.adult ?? '',
    children: t.children ?? '',
    reservationDescription: t.reservationDescription ?? '',
    reservation_info: {
      deposit:          t.reservation_info?.deposit          ?? '',
      deposit_currency: t.reservation_info?.deposit_currency ?? 'USD',
      prepayment:       t.reservation_info?.prepayment       ?? '',
      actual_check_in:      t.reservation_info?.actual_check_in  ? new DayPilot.Date(t.reservation_info.actual_check_in)  : null,
      actual_check_in_time: t.reservation_info?.actual_check_in  ? (extractTime(new DayPilot.Date(t.reservation_info.actual_check_in)) ?? '13:00:00') : '13:00:00',
      actual_check_out:     t.reservation_info?.actual_check_out ? new DayPilot.Date(t.reservation_info.actual_check_out) : null,
      actual_check_out_time: t.reservation_info?.actual_check_out ? (extractTime(new DayPilot.Date(t.reservation_info.actual_check_out)) ?? '11:00:00') : '11:00:00',
    },
    statuses: t.statuses ?? [],
  };
  showBookingForm.value = true;
}

/* ===== Удаление ===== */
async function deleteBookingWithConfirm(event) {
  const modal = await DayPilot.Modal.confirm(
      `
      <p>Are you sure you want to delete this booking?</p>
      <p>id: ${event.data.id}</p>
      <p>Name: ${event.data.text}</p>
    `,
      { html: true }
  );
  if (modal.canceled) return "canceled";
  try {
    await deleteBooking(event.data.id);
    return "ok";
  } catch (e) {
    return "error";
  }
}

const deleteBooking = async(id) => {
  try {
    const {data}= await api.delete(`/calendar/deleteBooking/${id}`);
    return data;
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const msg = error.response.data?.message || error.response.data || error.message;
      await DayPilot.Modal.alert(`Ошибка ${status}: ${msg}`, { html: true });
    } else {
      await DayPilot.Modal.alert(`Ошибка: ${error.message}`, { html: true });
    }
    throw error;
  }
};

/* ===== Создание / Выбор диапазона ===== */
function noLessThenHalfDay(args) {
  const msPerDay = 24 * 60 * 60 * 1000/2;
  const lengthMs = args.end.getTime() - args.start.getTime();
  return lengthMs >= msPerDay;
}

config.onTimeRangeSelected = async (args) => {
  if (!noLessThenHalfDay(args)) {
    args.control.clearSelection();
    return;
  }

  args.control.clearSelection();

  // Сброс режима редактирования при создании новой
  isEditMode.value = false;
  editingEvent.value = null;

  bookingDraft.value = {
    id: null,
    roomNumber: args.resource,
    name: '',
    check_in: args.start,
    check_out: args.end,
    check_in_time: '13:00:00',
    check_out_time: '11:00:00',
    price: '',
    phone: '',
    cleaning_price: 1500,
    electricity_and_water_payment: 'счётчики',
    adult: '1',
    children: '0',
    reservationDescription: '',
    reservation_info: {
      deposit: '',
      deposit_currency: 'USD',
      prepayment: '',
      actual_check_in: args.start,
      actual_check_in_time: '13:00:00',
      actual_check_out: args.end,
      actual_check_out_time: '11:00:00',
    },
    statuses: [],
  };
  showBookingForm.value = true;
};

function addElevenHoursDP(iso) {
  //return new DayPilot.Date(iso).addHours(11);
  return new DayPilot.Date(iso);
}

// Применяет строку времени "HH:mm:ss" к DayPilot.Date и возвращает новый DayPilot.Date
function applyTime(dpDate, timeStr) {
  if (!dpDate || !timeStr) return dpDate;
  const d = dpDate instanceof DayPilot.Date ? dpDate : new DayPilot.Date(dpDate);
  const datePart = d.toString('yyyy-MM-dd');
  return new DayPilot.Date(datePart + 'T' + timeStr);
}

async function handleBookingSubmit(result) {
  const checkInWithTime  = applyTime(result.check_in,  result.check_in_time);
  const checkOutWithTime = applyTime(result.check_out, result.check_out_time);

  const ri = result.reservation_info ?? {};

  const actualCheckInWithTime  = ri.actual_check_in
      ? applyTime(ri.actual_check_in,  ri.actual_check_in_time  || '13:00:00')
      : null;
  const actualCheckOutWithTime = ri.actual_check_out
      ? applyTime(ri.actual_check_out, ri.actual_check_out_time || '11:00:00')
      : null;

  const payload = {
    roomNumber: result.roomNumber,
    name: result.name,
    check_in: checkInWithTime.toString() + 'Z',
    check_out: checkOutWithTime.toString() + 'Z',
    price: parseInt(result.price || 0),
    cleaning_price: parseInt(result.cleaning_price || 0),
    electricity_and_water_payment: result.electricity_and_water_payment,
    adult: parseInt(result.adult || 0),
    children: parseInt(result.children || 0),
    phone: result.phone,
    reservationDescription: result.reservationDescription,
    reservation_info: {
      deposit:          parseInt(ri.deposit || 0),
      deposit_currency: ri.deposit_currency ?? '',
      prepayment:       parseInt(ri.prepayment || 0),
      actual_check_in:  actualCheckInWithTime  ? actualCheckInWithTime.toString()  + 'Z' : null,
      actual_check_out: actualCheckOutWithTime ? actualCheckOutWithTime.toString() + 'Z' : null,
    },
  };

  if (isEditMode.value && editingEvent.value) {
    const id = result.id || editingEvent.value.data.id;
    try {
      const updated = await updateBooking(id, payload);


      // Новая версия с функцией addElevenHoursDP для добавления 11 часов
      const newStart = addElevenHoursDP(updated.check_in);
      const newEnd   = addElevenHoursDP(updated.check_out);

      const ev = editingEvent.value;
      ev.data.start = newStart;
      ev.data.end = newEnd;
      ev.data.text = updated.name;
      ev.data.resource = updated.roomNumber;
      ev.data.tag = {
        name: updated.name,
        phone: updated.phone,
        roomNumber: updated.roomNumber,
        check_in: extractDate(newStart),
        check_out: extractDate(newEnd),
        check_in_time: extractTime(newStart) ?? '13:00:00',
        check_out_time: extractTime(newEnd) ?? '11:00:00',
        price: updated.price,
        cleaning_price: updated.cleaning_price,
        electricity_and_water_payment: updated.electricity_and_water_payment,
        adult: updated.adult,
        children: updated.children,
        days: updated.days,
        priceForOneNight: updated.price_for_night,
        reservationDescription: updated.reservationDescription,
        reservation_info: updated.reservation_info ?? null,
        statuses: ev.data.tag?.statuses ?? [],
      };
      schedulerRef.value?.control.events.update(ev);
      schedulerRef.value?.control.message("Изменения сохранены");
    } catch {
      schedulerRef.value?.control.message("Ошибка обновления");
    } finally {
      editingEvent.value = null;
      isEditMode.value = false;
      bookingDraft.value = null;
      showBookingForm.value = false;
    }
    return;
  }

  // Создание (как раньше)
  const d = await createBooking(payload);
  const checkIn = addElevenHoursDP(d.check_in);
  const checkOut = addElevenHoursDP(d.check_out);

  schedulerRef.value?.control.events.add({
    start: checkIn,
    end: checkOut,
    id: d.id,
    resource: d.roomNumber,
    text: d.name,
    tag: {
      name: d.name,
      phone: d.phone,
      roomNumber: d.roomNumber,
      check_in: extractDate(checkIn),
      check_out: extractDate(checkOut),
      check_in_time: extractTime(checkIn) ?? '13:00:00',
      check_out_time: extractTime(checkOut) ?? '11:00:00',
      price: d.price,
      cleaning_price: d.cleaning_price,
      electricity_and_water_payment: d.electricity_and_water_payment,
      adult: d.adult,
      children: d.children,
      days: d.days,
      priceForOneNight: d.price_for_night,
      reservationDescription: d.reservationDescription,
      reservation_info: d.reservation_info ?? null,
      statuses: d.statuses ?? [],
    }
  });

  showBookingForm.value = false;
  bookingDraft.value = null;
}

function handleBookingCancel() {
  bookingDraft.value = null;
  if (isEditMode.value) {
    isEditMode.value = false;
    editingEvent.value = null;
  }
}

// Обрабатывает переключение статуса брони прямо из info-panel: обновляет tag события
// на календаре и данные выбранного гостя, чтобы бейджи статусов сразу отобразили актуальное состояние.
function applyStatusesToReservation(reservationId, statuses) {
  const ev = schedulerRef.value?.control.events.find(reservationId);
  if (ev) {
    ev.data.tag = { ...ev.data.tag, statuses };
    schedulerRef.value?.control.events.update(ev);
  }
  if (selectedGuest.value?.id === reservationId) {
    selectedGuest.value = { ...selectedGuest.value, tag: { ...selectedGuest.value.tag, statuses } };
  }
}

async function toggleGuestStatus(statusTypeId) {
  const reservationId = selectedGuest.value?.id;
  if (!reservationId || statusLoading.value) return;
  statusLoading.value = true;
  try {
    await api.post(`/calendar/reservations/${reservationId}/statuses/${statusTypeId}`);
    const { data } = await api.get(`/calendar/reservations/${reservationId}/statuses`);
    applyStatusesToReservation(reservationId, data || []);
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data || err.message;
    await DayPilot.Modal.alert(`Ошибка изменения статуса: ${msg}`);
  } finally {
    statusLoading.value = false;
  }
}

const createBooking = async (booking) => {
  try {
    const { data } = await api.post('/calendar/createBooking', booking);
    return data;
  } catch (err) {
    if (err.response) {
      const status = err.response.status;
      const msg = err.response.data?.message || err.response.data || err.message;
      DayPilot.Modal.alert(`Ошибка ${status}: ${msg}`);
    } else if (err.request) {
      DayPilot.Modal.alert('Сервер не отвечает. Проверьте соединение.');
    } else {
      DayPilot.Modal.alert(`Неожиданная ошибка: ${err.message}`);
    }
    throw err;
  }
};

const updateBooking = async (id,booking) => {
  try {
    const { data } = await api.patch('/calendar/updateBooking', { id, ...booking });
    return data;
  } catch (err) {
    if (err.response) {
      const status = err.response.status;
      const msg = err.response.data?.message || err.response.data || err.message;
      DayPilot.Modal.alert(`Ошибка ${status}: ${msg}`);
    } else if (err.request) {
      DayPilot.Modal.alert('Сервер не отвечает. Проверьте соединение.');
    } else {
      DayPilot.Modal.alert(`Неожиданная ошибка: ${err.message}`);
    }
    throw err;
  }
};

/* ===== Загрузка ресурсов с description ===== */
const loadResources = async () => {
  try {
    const { data } = await api.get('/calendar/r');
    const mapped = data.apartments.map(apt => ({
      name: apt.room_number,
      id: apt.room_number,
      description: apt.description || "",
    }));
    // Апартаменты с номером, начинающимся на "Serenity", должны идти последними
    const isSerenity = (r) => String(r.name ?? '').startsWith('Serenity');
    config.resources = [
      ...mapped.filter(r => !isSerenity(r)),
      ...mapped.filter(isSerenity),
    ];
  } catch (error) {
    if (error.response && error.response.status === 401) {
      router.push("/login");
      return;
    }
    if (error.response) {
      const status = error.response.status;
      const msg = error.response.data?.message || error.response.data || error.message;
      DayPilot.Modal.alert(`Ошибка ${status}: ${msg}`);
    } else {
      DayPilot.Modal.alert(`Ошибка: ${error.message}`);
    }
    throw error;
  }
};

const loadEvents = async () => {
  let events = [];
  for (const res of config.resources) {
    const { data } = await api.post('/calendar/r', { room_number: res.id });
    const bookings = data.bookings || data;
    bookings.forEach(b => {
      const checkIn = addElevenHoursDP(b.check_in);
      const checkOut = addElevenHoursDP(b.check_out);
      events.push({
        id: b.id,
        start: checkIn,
        end: checkOut,
        text: b.name,
        resource: b.roomNumber,
        tag: {
          name: b.name,
          phone: b.phone,
          roomNumber: b.roomNumber,
          check_in: extractDate(checkIn),
          check_out: extractDate(checkOut),
          check_in_time: extractTime(checkIn) ?? '13:00:00',
          check_out_time: extractTime(checkOut) ?? '11:00:00',
          price: b.price,
          cleaning_price: b.cleaning_price,
          electricity_and_water_payment: b.electricity_and_water_payment,
          adult: b.adult,
          children: b.children,
          days: b.days,
          priceForOneNight: b.price_for_night,
          reservationDescription: b.reservationDescription,
          reservation_info: b.reservation_info ?? null,
          statuses: b.statuses ?? [],
        }
      });
    });
  }
  config.events = events;
};

const loadEventsAll = async () => {
  let events = [];
  let rooms = [];
  for (const res of config.resources) {
    rooms.push(
        res.id,
    )
  }

  let data;
  try {
    const response = await api.post('/calendar/rall', { room_numbers: rooms });
    data = response.data;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      router.push('/login');
      return;
    }
    if (error.response) {
      const status = error.response.status;
      const msg = error.response.data?.message || error.response.data || error.message;
      DayPilot.Modal.alert(`Ошибка ${status}: ${msg}`);
    } else {
      DayPilot.Modal.alert(`Ошибка: ${error.message}`);
    }
    return;
  }
  const bookings = data.bookings || data;
  bookings.forEach(b => {
    const checkIn = addElevenHoursDP(b.check_in);
    const checkOut = addElevenHoursDP(b.check_out);
    events.push({
      id: b.id,
      start: checkIn,
      end: checkOut,
      text: b.name,
      resource: b.roomNumber,
      tag: {
        name: b.name,
        phone: b.phone,
        roomNumber: b.roomNumber,
        check_in: extractDate(checkIn),
        check_out: extractDate(checkOut),
        check_in_time: extractTime(checkIn),
        check_out_time: extractTime(checkOut),
        price: b.price,
        cleaning_price: b.cleaning_price,
        electricity_and_water_payment: b.electricity_and_water_payment,
        adult: b.adult,
        children: b.children,
        days: b.days,
        priceForOneNight: b.price_for_night,
        reservationDescription: b.reservationDescription,
        reservation_info: b.reservation_info ?? null,
        statuses: b.statuses ?? [],
      }
    });
  });

  config.events = events;
};

onMounted(async () => {
// Класс для мгновенного состояния
  schedulerRef.value?.$el?.classList.toggle('desc-hidden', !showDescription.value);

  await loadResources();
  await loadEventsAll();
  await loadStatusTypes();

  // Делегируем клик по шеврону
  schedulerRef.value?.$el?.addEventListener("click", (e) => {
    if (e.target.closest('.rowheader-chevron')) {
      toggleDescription();
    }
  });

  schedulerRef.value?.control.message("Календарь бронирований загружен!");
  schedulerRef.value?.control.scrollTo(DayPilot.Date.today().addDays(-1));
  schedulerRef.value?.control.update({ separators: [{color:"red", location: DayPilot.Date.now()}] });


  setInterval(async () => {
    await loadEventsAll();
    schedulerRef.value?.control.update();
  }, 600000);
});
</script>

<style scoped>
/* Цвет шеврона уже задан через stroke, добавим плавное вращение */
:deep(.rowheader-chevron) {
  transition: transform .15s ease;
  transform: rotate(90deg);
  cursor: pointer;
  padding: 4px;
  min-width: 20px;
  min-height: 20px;
  box-sizing: content-box;
  border-radius: 4px;
  position: relative;
  display: inline-block;
  vertical-align: middle;
}

/* Расширяем кликабельную область вокруг шеврона */
:deep(.rowheader-chevron::after) {
  content: '';
  position: absolute;
  top: -10px;
  left: -10px;
  right: -10px;
  bottom: -10px;
}

:deep(.rowheader-chevron:hover) {
  background: rgba(79, 140, 255, 0.12);
}

/* Когда колонка скрыта — повернуть шеврон */
:deep(.desc-hidden .rowheader-chevron) {
  transform: rotate(-90deg);
}

/* Первая колонка заголовка — не обрезать шеврон */
:deep(.scheduler_default_rowheadercolheader:first-child) {
  overflow: visible !important;
}
:deep(.scheduler_default_rowheadercol:first-child) {
  overflow: visible !important;
}

/* Мгновенное скрытие второй колонки заголовков строк и её хедера */
:deep(.desc-hidden .scheduler_default_rowheadercol:nth-child(2)) {
  width: 0 !important;
  min-width: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  overflow: hidden !important;
}
:deep(.desc-hidden .scheduler_default_rowheadercolheader:nth-child(2)) {
  width: 0 !important;
  min-width: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  overflow: hidden !important;
}

/* Контент ячеек колонки Description — перенос и ограничение ширины */
:deep(.dp-desc-cell) {
  max-width: 260px;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
  line-height: 1.25;
}

.scheduler-container {
  /*
  display: flex;
  height: calc(100vh - 56px);
  width: 100vw;
  min-width: 0;
  overflow: hidden;
   */
  display: flex;
  height: calc(100dvh - 56px); /* Вычитаем высоту navbar */
  width: 100vw;
  min-width: 0;
  overflow: hidden;
  box-sizing: border-box;
}
.scheduler-wrapper {
  flex: 1;
  position: relative;
  min-width: 0;
  overflow: hidden;
  overflow-x: auto;
}
.info-panel {
  position: relative;
  width: 300px;
  background: #fff;
  border-left: 1px solid #ccc;
  padding: 16px;
  overflow-y: auto;
}
.close-btn {
  position: absolute;
  top: 10px;
  right: 12px;
  background: transparent;
  border: none;
  font-size: 20px;
  cursor: pointer;
}
.copy-btn {
  position: absolute;
  top: 10px;
  right: 44px;
  background: #eef1f6;
  color: #374151;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 10px;
  cursor: pointer;
  transition: background .15s;
}
.copy-btn:hover {
  background: #e2e7ef;
}
.guest-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.guest-header {
  padding-bottom: 12px;
  border-bottom: 1px solid #e4e7ed;
}
.guest-name {
  font-size: 17px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
  word-break: break-word;
}
.guest-phone {
  font-size: 13px;
  color: #4f8cff;
}
.info-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.info-section-title {
  font-size: 11px;
  font-weight: 700;
  color: #9aa3b2;
  text-transform: uppercase;
  letter-spacing: .5px;
  margin-bottom: 2px;
}
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  font-size: 13px;
  padding: 3px 0;
  border-bottom: 1px dashed #ececec;
}
.info-row:last-child {
  border-bottom: none;
}
.info-label {
  color: #6b7280;
  flex-shrink: 0;
}
.info-value {
  color: #1f2937;
  font-weight: 600;
  text-align: right;
  word-break: break-word;
}
.info-description {
  font-size: 13px;
  color: #374151;
  line-height: 1.4;
  margin: 0;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.statuses-section {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #e4e7ed;
}
.statuses-title {
  font-size: 13px;
  font-weight: 700;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: .5px;
  margin-bottom: 10px;
}
.statuses-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.status-btn {
  border: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 20px;
  color: #fff;
  background: #d9343a; /* выключен — красный */
  transition: background .15s, opacity .15s, filter .15s;
  font-family: inherit;
}
.status-btn.active {
  background: #22a06b; /* включён — зелёный */
}
.status-btn:disabled,
.status-btn.loading {
  opacity: .6;
  cursor: not-allowed;
}
.status-btn:not(:disabled):hover {
  filter: brightness(1.08);
}
:deep(.scheduler_default_event_inner) {
  background: linear-gradient(to bottom, rgb(255, 255, 255) 0%, rgb(52, 221, 221) 100%) !important;
}
/* guest_checked_in = true -> зелёное тело карточки бронирования */
:deep(.evt-checked-in .scheduler_default_event_inner) {
  background: linear-gradient(to bottom, rgb(255, 255, 255) 0%, rgb(69, 221, 52) 100%) !important;
}
/* paid_to_owner = true -> зелёная полоса; иначе (false/нет статуса) -> красная */
:deep(.evt-paid-to-owner .scheduler_default_event_bar_inner) {
  background: rgb(69, 221, 52) !important;
}
:deep(.evt-not-paid-to-owner .scheduler_default_event_bar_inner) {
  background: #d9343a !important;
}
</style>