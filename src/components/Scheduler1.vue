<template>
  <div class="scheduler-container">
    <div class="scheduler-wrapper">
      <DayPilotScheduler :config="config" ref="schedulerRef" />
    </div>
    <div class="info-panel" v-if="selectedGuest">
      <button class="close-btn" @click="selectedGuest = null">×</button>
<!--      <h3>{{ selectedGuest.tag.name }}</h3>-->
<!--      <p>📞 {{ selectedGuest.tag.phone }}</p>-->
<!--      <p>🏠 {{ selectedGuest.tag.roomNumber }}</p>-->
<!--      <p>⏱ {{ selectedGuest.tag.check_in }} → {{ selectedGuest.tag.check_out }}</p>-->
<!--      <p>💰 {{ selectedGuest.tag.price }} ฿</p>-->
<!--      <p>🧼 Уборка: {{ selectedGuest.tag.cleaning_price }} ฿</p>-->
<!--      <p>💡 Вода/свет: {{ selectedGuest.tag.electricity_and_water_payment }}</p>-->
<!--      <p>👨‍👩‍👧 Взрослых: {{ selectedGuest.tag.adult }}, Детей: {{ selectedGuest.tag.children }}</p>-->
<!--      <p>🛏 Дней: {{ selectedGuest.tag.days }}</p>-->
      <ul class="list">
        <li class="list-item" v-for="(value,key) in selectedGuest.tag">
          <span class="list-key">{{ key }}</span>
          <span class="list-sep"> : </span>
          <span class="list-value">{{ value }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { DayPilot, DayPilotScheduler } from 'daypilot-pro-vue';
import { ref, reactive, onMounted } from 'vue';
import api from "../api.js";

const schedulerRef = ref(null);
const selectedGuest = ref(null);

function validateDigit(args){
  // Только цифры
  if (!/^\d+$/.test(args.value)) {
    args.valid = false;
    args.message = "Введите только цифры";
  }
}
function validatePhone(args) {
  const phoneRegex = /^\+{1}\d{10,15}$/;
  const tgRegex    = /^@?[A-Za-z0-9_]{5,32}$/;

  if (!phoneRegex.test(args.value) && !tgRegex.test(args.value)) {
    args.valid   = false;
    args.message = "Введите телефон\n (10–15 цифр, + опционально) \nили Telegram-никнейм (5–32 символа, опц. @)";
  }
}

const start = new DayPilot.Date("2023-11-01");
const end = new DayPilot.Date("2026-12-31");
const msPerDay = 24 * 60 * 60 * 1000;
const days = Math.round((new Date(end.value) - new Date(start.value)) / msPerDay) + 1;

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
    const clicked = args.e.data;
    if (selectedGuest.value?.id === clicked.id) {
      selectedGuest.value = null;
    } else {
      selectedGuest.value = clicked;
    }
  },

  eventHoverHandling: "Bubble",
  bubble: new DayPilot.Bubble({
    onLoad: (args) => {
      const t = args.source.data.tag;
      args.html = t
          ? `<b>${args.source.data.text}</b><br/>📞 ${t.phone}<br/>🏠 ${t.roomNumber}`
          : "Информация отсутствует";
    }
  }),

  eventDeleteHandling: "Update",

});

config.onEventDelete = async function(args) {
  args.async = true;

 const modal= await DayPilot.Modal.confirm(
     `
     <p>Are you sure you want to delete this booking?</p>
     <p>id: ${ args.e.data.id }</p>
     <p>Name: ${args.e.data.text}</p>
     `,
     { html: true });


  if (modal.canceled) {
    // пользователь передумал — отменяем удаление
    args.preventDefault();
    args.loaded();
    return;
  }

  // попытка удалить на сервере
  try {
    await deleteBooking(args.e.data.id);
  }
  catch (error) {
    // при ошибке на сервере тоже отменяем удаление
    args.preventDefault();
  }

  // снимаем «заморозку»
  args.loaded();
};

const deleteBooking = async(id) => {
  try {
    console.log('deleteBooking', id);
    const {data}= await api.delete(`/calendar/deleteBooking/${id}`)
    return data
  }
  catch (error) {
    // если сервер ответил ошибкой
    if (error.response) {
      const status = error.response.status;
      const msg = error.response.data?.message || error.response.data || error.message;
      // показываем модалку с текстом
      await DayPilot.Modal.alert(`Ошибка ${status}: ${msg}`, { html: true });
    }
    else {
      // сетевые или другие неожиданные
      await DayPilot.Modal.alert(`Ошибка: ${error.message}`, { html: true });
    }
    // пробрасываем, чтобы onEventDelete узнал об ошибке
    throw error;
  }
};

config.onTimeRangeSelected = async (args) => {
  const scheduler = args.control;

  let form=[
    {name: "Room number", id: "roomNumber", type: "text"},
    {name: "Guest name", id: "name"},
    {name: "Check In", id: "check_in", dateFormat: "yyyy/MM/dd", type:  "date"},
    {name: "Check Out", id: "check_out", dateFormat: "yyyy/MM/dd", type:  "date"},
    {name: "Price", id: "price", type: "text", onValidate: validateDigit},
    {name: "Phone", id: "phone", type: "text", onValidate: validatePhone},
    {name: "Cleaning price", id: "cleaning_price", type: "text", onValidate: validateDigit},
    {name: "Electricity and water payment", id: "electricity_and_water_payment", type:"text"},
    {name: "Adult", id: "adult", type: "text",onValidate: validateDigit},
    {name: "Children", id: "children", type: "text",onValidate: validateDigit},
    {name: "Reservation description", id: "reservationDescription", type: "text",},
  ];

  let data={
    roomNumber: args.resource,
    check_in: args.start,
    check_out: args.end,
    cleaning_price: 1500,
    electricity_and_water_payment: "счётчики",
  };
  const modal=await DayPilot.Modal.form(form,data);

  scheduler.clearSelection();
  if (modal.canceled) { return; }

 const d = await createBooking(modal.result)

  scheduler.events.add({
    start: addElevenHoursDP(d.check_in),
    end: addElevenHoursDP(d.check_out),
    id: d.id,
    resource: d.roomNumber,
    text: d.name,
    tag: {
      name: d.name,
      phone: d.phone,
      roomNumber: d.roomNumber,
      check_in: addElevenHoursDP(d.check_in),
      check_out: addElevenHoursDP(d.check_out),
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
};

//создание бронирования
const createBooking = async (args) => {
  const booking = {
    roomNumber: args.roomNumber,
    name: args.name,
    check_in: args.check_in+'Z',//добавим Z для RFC3339 формата
    check_out:  args.check_out+'Z',
    price: parseInt(args.price),
    cleaning_price: parseInt(args.cleaning_price),
    electricity_and_water_payment: args.electricity_and_water_payment,
    adult: parseInt(args.adult),
    children: parseInt(args.children),
    phone: args.phone,
    reservationDescription: args.reservationDescription,
  };

  try {
    const { data } = await api.post('/calendar/createBooking', booking);
    return data;
  }
  catch (err) {
    // если сервер вернул ответ с ошибкой
    if (err.response) {
      // HTTP-код
      const status = err.response.status;
      // тело ответа, где, например, в поле message лежит текст ошибки
      const msg = err.response.data?.message || err.response.data || err.message;
      // выводим модалку DayPilot или console.error
      DayPilot.Modal.alert(`Ошибка ${status}: ${msg}`);
    }
    // если проблема на клиенте / сети
    else if (err.request) {
      DayPilot.Modal.alert('Сервер не отвечает. Проверьте соединение.');
    }
    else {
      DayPilot.Modal.alert(`Неожиданная ошибка: ${err.message}`);
    }

    // пробрасываем дальше, чтобы вызывающий код тоже мог отреагировать
    throw err;
  }
};

//загрузка апартаментов
const loadResources = async () => {
  const { data } = await api.get('/calendar/r');
  config.resources = data.apartments.map(apt => ({
    name: apt.room_number,
    id: apt.room_number,
  }));
};

//добавлении 11 часов так как сервер отдаёт нудевое время
function addElevenHoursDP(iso) {
  const t = new DayPilot.Date(iso)
      .addHours(11)
      //.toString();   // по умолчанию отдаёт ISO-строку без миллисекунд
  return t
}

//загрузка бронирований
const loadEvents = async () => {
  let events = [];
  for (const res of config.resources) {
    const { data } = await api.post('/calendar/r', { room_number: res.id });
    const bookings = data.bookings || data;
    bookings.forEach(b => {
      const checkIn=addElevenHoursDP(b.check_in);
      const checkOut=addElevenHoursDP(b.check_out);

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
  schedulerRef.value?.control.scrollTo(DayPilot.Date.today().firstDayOfMonth());
});
</script>

<style scoped>
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
  overflow-x: auto; /* scroll появляется здесь! */
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

  .list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0;
    transition: .22s all;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }

  .list-key {
    font-weight: 600;
    color: #333;
    flex: 0 0 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .list-value {
    flex: 1;
    color: #444;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .list-sep {
    white-space: pre; /* чтобы не схлопывались пробелы */
  }
}
</style>
