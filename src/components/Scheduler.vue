<template>
  <div class="scheduler-container">
    <div class="scheduler-wrapper">
      <DayPilotScheduler :config="config" ref="schedulerRef" />
    </div>
    <div class="info-panel" v-if="selectedGuest">
      <button class="close-btn" @click="selectedGuest = null">×</button>
      <ul class="list">
        <li class="list-item" v-for="(value,key) in selectedGuest.tag" :key="key">
          {{key}} : {{value}}
        </li>
      </ul>
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
import {ref, reactive, onMounted, watch} from "vue";
import api from "../api.js";
import BookingFormOverlay from "./BookingFormOverlay.vue";
import { useSchedulerColumnSelection } from "../composables/useSchedulerColumnSelection";

import "../styles/schedulerColumnSelection.css";

const schedulerRef = ref(null);
const selectedGuest = ref(null);

const showBookingForm = ref(false);
const bookingDraft = ref(null);

// Управление показом колонки Description
const showDescription = ref(true);

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
         viewBox="0 0 24 24" width="18" height="18" fill="none"
         stroke="#4f8cff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"
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
const end = new DayPilot.Date("2026-12-31");
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
    },
    { text: "Description", display: "description",  maxAutoWidth: 200 }
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
  };

  if (isEditMode.value && editingEvent.value) {
    const id = result.id || editingEvent.value.data.id;
    try {
      const updated = await updateBooking(id, payload);

      //старая версия добавления 11 часов, теперь вынесенная в функцию для переиспользования
      // const newStart = new DayPilot.Date(updated.check_in).addHours(11);
      // const newEnd   = new DayPilot.Date(updated.check_out).addHours(11);

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
    config.resources = data.apartments.map(apt => ({
      name: apt.room_number,
      id: apt.room_number,
      description: apt.description || "",
    }));
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

  const { data } = await api.post('/calendar/rall', {room_numbers: rooms});
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
  padding: 8px;
}

/* Когда колонка скрыта — повернуть шеврон */
:deep(.desc-hidden .rowheader-chevron) {
  transform: rotate(-90deg);
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
.list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}
.list-item {
  padding: 4px 0;
  border-bottom: 1px solid #ececec;
  line-height: 1.28;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.list-item:last-child {
  border-bottom: none;
}
:deep(.scheduler_default_event_inner) {
  background: linear-gradient(to bottom, rgb(255, 255, 255) 0%, rgb(52, 221, 221) 100%) !important;
}
</style>