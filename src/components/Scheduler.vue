<!--<template>-->
<!--  <DayPilotScheduler :config="config" ref="schedulerRef" />-->
<!--</template>-->
<template>
  <div class="scheduler-wrapper">
    <DayPilotScheduler :config="config" ref="schedulerRef" />
  </div>
</template>

<style>
.scheduler-wrapper {
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  bottom: 0px;
  border-top: 1px solid #ccc;
}
</style>


<script setup>
import {BubblePropsAndEvents, DayPilot, DayPilotScheduler} from 'daypilot-pro-vue';
import { ref, reactive, onMounted } from 'vue';
import axios from 'axios';

const start = new DayPilot.Date("2023-11-01");
const end = new DayPilot.Date("2025-12-31");

// Разница в миллисекундах
const msPerDay = 24 * 60 * 60 * 1000;
const days = Math.round((new Date(end.value) - new Date(start.value)) / msPerDay) + 1;

const config = reactive({
  //theme: "theme",
  eventBorderRadius: "15px",
  heightSpec: "Parent100Pct",
  timeHeaders: [{"groupBy":"Year"},{"groupBy":"Month"},{"groupBy":"Day","format":"d"}],
  scale: "Day",
  days: days,
  startDate: start,
  allowEventOverlap: false,
  timeRangeSelectedHandling: "Enabled",
  onTimeRangeSelected: async (args) => {
    const scheduler = args.control;
    const modal = await DayPilot.Modal.prompt("Create a new event:", "Event 1");
    scheduler.clearSelection();
    if (modal.canceled) { return; }
    scheduler.events.add({
      start: args.start,
      end: args.end,
      id: DayPilot.guid(),
      resource: args.resource,
      text: modal.result
    });
  },
  eventMoveHandling: "Update",
  onEventMoved: (args) => {
    args.control.message("Event moved: " + args.e.text());
  },
  eventResizeHandling: "Update",
  onEventResized: (args) => {
    args.control.message("Event resized: " + args.e.text());
  },
  eventDeleteHandling: "Update",
  onEventDeleted: (args) => {
    args.control.message("Event deleted: " + args.e.text());
  },
  eventHoverHandling: "Bubble",
  bubble: new DayPilot.Bubble({
    onLoad: (args) => {
      const t = args.source.data.tag;
      if (!t) {
        args.html = "Информация отсутствует";
        return;
      }

      args.html = `
      <b>${args.source.data.text}</b><br/>
      📞 ${t.phone}<br/>
      🏠 ${t.roomNumber}<br/>
      ⏱ ${t.check_in} → ${t.check_out}<br/>
      💰 ${t.price} ฿<br/>
      🧼 Уборка: ${t.cleaning_price} ฿<br/>
      💡 Вода/свет: ${t.electricity_and_water_payment}<br/>
      👨‍👩‍👧 Взрослых: ${t.adult}, Детей: ${t.children}<br/>
      🛏 Дней: ${t.days}
    `.trim();
    }
  }),
  treeEnabled: true,
  rowMinHeight: 50,
  EventClickHandling: "CallBack",
  onEventClick: (args) => {
    args.control.message("Event clicked: " + args.e.text());
  },
});
const schedulerRef = ref(null);

// ресурсы
const loadResources = async () => {
  const { data } = await axios.get('/api');
  config.resources = data.apartments.map(apt => ({
    name: apt.room_number,
    id: apt.room_number
  }));
};

// события
const loadEvents = async () => {
  let events = [];
  for (const resource of config.resources) {
    const { data } = await axios.post('/api', { room_number: resource.id });
    const bookings = data.bookings || data;
    bookings.forEach(booking => {
      events.push({
        id: booking.id,
        start: booking.check_in.substring(0,19),
        end: booking.check_out.substring(0,19),
        text: booking.name,
        resource: booking.roomNumber,
        tag: {
          phone: booking.phone,
          roomNumber: booking.roomNumber,
          check_in: booking.check_in,
          check_out: booking.check_out,
          price: booking.price,
          cleaning_price: booking.cleaning_price,
          electricity_and_water_payment: booking.electricity_and_water_payment,
          adult: booking.adult,
          children: booking.children,
          days: booking.days
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
<style>
@import '/src/components/theme.css';
</style>
