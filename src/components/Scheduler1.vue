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

  <!-- Наш новый оверлей -->
  <BookingFormOverlay
      :model-value="showBookingForm"
      :value="bookingDraft"
      @update:modelValue="v => showBookingForm = v"
      @submit="handleBookingSubmit"
      @cancel="handleBookingCancel"
  />
</template>

<script setup>
import { DayPilot, DayPilotScheduler } from 'daypilot-pro-vue';
import { ref, reactive, onMounted } from 'vue';
import api from "../api.js";
import BookingFormOverlay from './BookingFormOverlay.vue';


const schedulerRef = ref(null);
const selectedGuest = ref(null);

const showBookingForm = ref(false);
const bookingDraft = ref(null);


const start = new DayPilot.Date("2023-11-01");
const end = new DayPilot.Date("2026-12-31");
const msPerDay = 24 * 60 * 60 * 1000;
const days = Math.round((new Date(end.value) - new Date(start.value)) / msPerDay) + 1;

/* ===================== ВЫДЕЛЕНИЕ КОЛОНОК (ВСЁ ЧЕРЕЗ cssClass) ===================== */
const selectedColumnDates = new Set();   // строки формата yyyy-MM-dd
let headerAnchor = null;                 // якорная дата (первый клик для диапазона Shift)

function dateKey(dpDate) {
  return dpDate.toString("yyyy-MM-dd");
}
function selectSingle(date) {
  selectedColumnDates.clear();
  selectedColumnDates.add(dateKey(date));
  headerAnchor = date;
}
function toggleDate(date) {
  const k = dateKey(date);
  if (selectedColumnDates.has(k)) selectedColumnDates.delete(k);
  else selectedColumnDates.add(k);
  if (!headerAnchor) headerAnchor = date;
}
function selectRange(toDate) {
  if (!headerAnchor) {
    selectSingle(toDate);
    return;
  }
  selectedColumnDates.clear();
  const startDate = headerAnchor.getTime() <= toDate.getTime() ? headerAnchor : toDate;
  const endDate   = headerAnchor.getTime() >  toDate.getTime() ? headerAnchor : toDate;
  let cur = startDate;
  while (cur.getTime() <= endDate.getTime()) {
    selectedColumnDates.add(dateKey(cur));
    cur = cur.addDays(1);
  }
}
function clearColumnSelection() {
  selectedColumnDates.clear();
  headerAnchor = null;
}
/* ============================================================================= */

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
  onEventClick: args => {
    const clicked = args.e.data;
    if (selectedGuest.value?.id === clicked.id) {
      selectedGuest.value = null;
    } else {
      selectedGuest.value = clicked;
    }
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
  eventDeleteHandling: "Update",

//для кликов по заголовку
  timeHeaderClickHandling: "JavaScript",
});

//----------функционал выделения облости календаря по кликам на дни-----------------------------------

/* --- Заголовки (дни) --- */
config.onBeforeTimeHeaderRender= args => {
  if (args.header.level === 2) { // Day уровень
    const k = dateKey(args.header.start);
    if (selectedColumnDates.has(k)) {
      args.header.cssClass = (args.header.cssClass || "") + " dp-header-selected";
    }
    if (headerAnchor && k === dateKey(headerAnchor)) {
      args.header.cssClass = (args.header.cssClass || "") + " dp-header-anchor";
      // можно дополнительно подчеркнуть цифру:
      // args.header.html = `<span style="text-decoration:underline;">${args.header.start.toString("d")}</span>`;
    }
  }
};

    /* --- Ячейки (колонки под выбранными датами) --- */
    config.onBeforeCellRender= args => {
  const k = dateKey(args.cell.start);
  if (selectedColumnDates.has(k)) {
    args.cell.cssClass = (args.cell.cssClass || "") + " dp-col-selected";
  }
};

    /* --- Клики по заголовку --- */

config.onTimeHeaderClick= args => {
  if (args.header.level !== 2) return;
  const ev = args.originalEvent || window.event || {};
  const clickedDate = args.header.start;
  if (ev.shiftKey) {
    selectRange(clickedDate);
  } else if (ev.ctrlKey || ev.metaKey) {
    toggleDate(clickedDate);
  } else {
    const k = dateKey(clickedDate);
    if (selectedColumnDates.size === 1 && selectedColumnDates.has(k)) {
      clearColumnSelection();
    } else {
      selectSingle(clickedDate);
    }
  }
  schedulerRef.value?.control.update();
};


//--------------------------------------------------------------------------------------------------

// Удаление
config.onEventDelete = async function(args) {
  args.async = true;
  const modal= await DayPilot.Modal.confirm(
      `
     <p>Are you sure you want to delete this booking?</p>
     <p>id: ${ args.e.data.id }</p>
     <p>Name: ${args.e.data.text}</p>
     `,
      { html: true }
  );

  if (modal.canceled) {
    args.preventDefault();
    args.loaded();
    return;
  }

  try {
    await deleteBooking(args.e.data.id);
  } catch {
    args.preventDefault();
  }
  args.loaded();
};

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


// Игнорируем выделение облости менее половины дня — воспринимаем как простой клик
function noLessThenHalfDay(args) {
  const msPerDay = 24 * 60 * 60 * 1000/2;
  const lengthMs = args.end.getTime() - args.start.getTime();

  if (lengthMs < msPerDay) {
    return false;
  }
  return true;
}
// ПЕРЕХОД НА КАСТОМНУЮ ФОРМУ
config.onTimeRangeSelected = async (args) => {
  if (!noLessThenHalfDay(args)) {
    args.control.clearSelection();
    return
  }

  args.control.clearSelection();

  bookingDraft.value = {
    roomNumber: args.resource,
    name: '',
    check_in: args.start, // DayPilot.Date
    check_out: args.end,  // DayPilot.Date
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
  return new DayPilot.Date(iso).addHours(11);
}

async function handleBookingSubmit(result) {
  // result.check_in, result.check_out — DayPilot.Date
  const payload = {
    roomNumber: result.roomNumber,
    name: result.name,
    check_in: result.check_in.toString() + 'Z',    // RFC3339
    check_out: result.check_out.toString() + 'Z',
    price: parseInt(result.price || 0),
    cleaning_price: parseInt(result.cleaning_price || 0),
    electricity_and_water_payment: result.electricity_and_water_payment,
    adult: parseInt(result.adult || 0),
    children: parseInt(result.children || 0),
    phone: result.phone,
    reservationDescription: result.reservationDescription,
  };

  const d = await createBooking(payload);

  // d.check_in / d.check_out приходят с сервера (ISO) — добавим 11 часов как раньше
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
      check_in: checkIn,
      check_out: checkOut,
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
}

// Создание (оставляем как было, только адаптируем)
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

// Ресурсы
const loadResources = async () => {
  const { data } = await api.get('/calendar/r');
  config.resources = data.apartments.map(apt => ({
    name: apt.room_number,
    id: apt.room_number,
  }));
};

// События
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
          check_in: checkIn,
          check_out: checkOut,
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

onMounted(async () => {
  await loadResources();
  await loadEvents();
  schedulerRef.value?.control.message("Календарь бронирований загружен!");
  schedulerRef.value?.control.scrollTo(DayPilot.Date.today().addDays(-1));
});
</script>

<style scoped>
/* (оставь свои стили, ниже только напоминание поправить вложенность .close-btn) */
.scheduler-container {
  display: flex;
  height: calc(100vh - 56px);
  width: 100vw;
  min-width: 0;
  overflow: hidden;
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

/* ---------- Выделенные заголовки ---------- */
/* dp-header-selected вешается на внешний контейнер заголовка дня */
:deep(.dp-header-selected) {
  background: linear-gradient(90deg, #4f8cff, #6157ff);
  color: #fff;
  font-weight: 600;
  border-radius: 6px;
}

/* Якорь (первый клик для диапазона) добавляет рамку */
:deep(.dp-header-anchor) {
  box-shadow: 0 0 0 2px #ffb347 inset;
}

/* Если хочешь сделать anchor визуально особенным при одновременном selected:
:deep(.dp-header-selected.dp-header-anchor) {
  box-shadow: 0 0 0 2px #ffd58c inset;
}
*/

/* ---------- Выделенные колонки (ячейки) ---------- */
/* dp-col-selected добавляется к элементу ячейки */
:deep(.dp-col-selected) {
  background: rgba(79, 140, 255, 0.12) !important;
  /* Можно усилить:
  box-shadow: inset 0 0 0 2px rgba(79,140,255,0.25);
  */
  transition: background .15s;
}

/* Если у темы фон задаётся на внутренний _inner, можно продублировать: */
:deep(.dp-col-selected .scheduler_default_cell_inner),
:deep(.dp-col-selected .scheduler_default_cell_inner:not(.something)) {
  background: transparent; /* оставляем прозрачным, внешний уже подсвечен */
}
</style>