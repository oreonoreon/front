// Composable для выделения колонок (дней) в DayPilot Scheduler
// Использование:
//   import { useSchedulerColumnSelection } from "@/composables/useSchedulerColumnSelection";
//   const { selectionApi, attach } = useSchedulerColumnSelection({ config, schedulerRef });
//   attach(); // навешивает обработчики на config
//
// Параметры:
//   config        (обяз.) - реактивный объект конфигурации Scheduler
//   schedulerRef  (обяз.) - ref на компонент <DayPilotScheduler>
//   options.dayHeaderLevel (по умолч. 2) - уровень заголовка, где дни
//
// Публичный API (selectionApi):
//   clear()
//   getSelectedDates()            -> массив строк yyyy-MM-dd
//   setSelectedDates(array)
//   isSelected(yyyyMmDd)
//   selectSingle(DayPilot.Date)
//   toggleDate(DayPilot.Date)
//   selectRange(toDate)
//   getAnchor()
//   setAnchor(DayPilot.Date | null)
//
// Можно расширять без правки компонента.

import { ref } from "vue";
import { DayPilot } from "daypilot-pro-vue";

export function useSchedulerColumnSelection({ config, schedulerRef, options = {} }) {
  const dayHeaderLevel = options.dayHeaderLevel ?? 2;

  // Set выбранных дат (yyyy-MM-dd)
  const selectedColumnDates = ref(new Set());
  // Якорь для Shift
  const headerAnchor = ref(null);

  function dateKey(dpDate) {
    return dpDate.toString("yyyy-MM-dd");
  }

  function selectSingle(date) {
    const s = new Set();
    s.add(dateKey(date));
    selectedColumnDates.value = s;
    headerAnchor.value = date;
  }

  function toggleDate(date) {
    const k = dateKey(date);
    const s = new Set(selectedColumnDates.value);
    if (s.has(k)) s.delete(k); else s.add(k);
    selectedColumnDates.value = s;
    if (!headerAnchor.value) headerAnchor.value = date;
  }

  function selectRange(toDate) {
    if (!headerAnchor.value) {
      selectSingle(toDate);
      return;
    }
    const startDate = headerAnchor.value.getTime() <= toDate.getTime() ? headerAnchor.value : toDate;
    const endDate   = headerAnchor.value.getTime() >  toDate.getTime() ? headerAnchor.value : toDate;
    const s = new Set();
    let cur = startDate;
    while (cur.getTime() <= endDate.getTime()) {
      s.add(dateKey(cur));
      cur = cur.addDays(1);
    }
    selectedColumnDates.value = s;
  }

  function clear() {
    selectedColumnDates.value = new Set();
    headerAnchor.value = null;
  }

  function getSelectedDates() {
    return Array.from(selectedColumnDates.value).sort();
  }

  function setSelectedDates(arr) {
    const s = new Set();
    (arr || []).forEach(d => s.add(d));
    selectedColumnDates.value = s;
    headerAnchor.value = null;
    forceUpdate();
  }

  function isSelected(key) {
    return selectedColumnDates.value.has(key);
  }

  function getAnchor() {
    return headerAnchor.value;
  }

  function setAnchor(date) {
    headerAnchor.value = date;
  }

  function forceUpdate() {
    schedulerRef.value?.control.update();
  }

  // ---- Обработчики для config ----

  function onBeforeTimeHeaderRender(args) {
    if (args.header.level !== dayHeaderLevel) return;
    const k = dateKey(args.header.start);
    if (selectedColumnDates.value.has(k)) {
      args.header.cssClass = (args.header.cssClass || "") + " dp-header-selected";
    }
    if (headerAnchor.value && k === dateKey(headerAnchor.value)) {
      args.header.cssClass = (args.header.cssClass || "") + " dp-header-anchor";
      // Можно добавить кастомный текст/подчёркивание:
      // args.header.html = `<span style="text-decoration:underline;">${args.header.start.toString("d")}</span>`;
    }
  }

  function onBeforeCellRender(args) {
    const k = dateKey(args.cell.start);
    if (selectedColumnDates.value.has(k)) {
      args.cell.cssClass = (args.cell.cssClass || "") + " dp-col-selected";
    }
  }

  function onTimeHeaderClick(args) {
    if (args.header.level !== dayHeaderLevel) return;
    const ev = args.originalEvent || window.event || {};
    const clickedDate = args.header.start;
    if (ev.shiftKey) {
      selectRange(clickedDate);
    } else if (ev.ctrlKey || ev.metaKey) {
      toggleDate(clickedDate);
    } else {
      const k = dateKey(clickedDate);
      if (selectedColumnDates.value.size === 1 && selectedColumnDates.value.has(k)) {
        clear();
      } else {
        selectSingle(clickedDate);
      }
    }
    forceUpdate();
  }

  // Универсальная функция оборачивания, чтобы не потерять уже существующие обработчики
  function chainHandler(target, name, fn) {
    const existing = target[name];
    if (!existing) {
      target[name] = fn;
      return;
    }
    target[name] = function(args) {
      // если у старого обработчика есть async логика — она отрабатывает
      existing.call(this, args);
      fn.call(this, args);
    };
  }

  // Подключает обработчики в config (не сразу, чтобы дать контролируемое управление)
  function attach() {
    // Включаем обработку кликов по заголовку
    if (!config.timeHeaderClickHandling || config.timeHeaderClickHandling === "Disabled") {
      config.timeHeaderClickHandling = "JavaScript";
    }

    chainHandler(config, "onBeforeTimeHeaderRender", onBeforeTimeHeaderRender);
    chainHandler(config, "onBeforeCellRender", onBeforeCellRender);
    chainHandler(config, "onTimeHeaderClick", onTimeHeaderClick);
  }

  const selectionApi = {
    clear,
    getSelectedDates,
    setSelectedDates,
    isSelected,
    selectSingle,
    toggleDate,
    selectRange,
    getAnchor,
    setAnchor,
    forceUpdate,
  };

  return {
    selectionApi,
    attach,
    // Вдруг понадобится снаружи для реактивного отслеживания
    _selectedColumnDates: selectedColumnDates,
    _headerAnchor: headerAnchor,
  };
}