// Строки календаря: кондо → группа → апартамент (дерево ресурсов DayPilot).

const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true });

function apartmentRow(apartment) {
  return {
    name: apartment.room_number,
    id: apartment.room_number,
    description: apartment.description || "",
    isActive: apartment.is_active !== false,
  };
}

function parentRow(id, name, cssClass) {
  return {
    id,
    name,
    cssClass,
    isParent: true,
    expanded: true,
    minHeight: 28, // уточняет layoutRowHeaders
    children: [],
  };
}

// Апартаменты без кондо идут первыми, в кондо сначала апартаменты без группы.
// Кондо — в порядке apartments (бэкенд отдаёт их по порядку из админки), апартаменты внутри — тоже.
export function buildResourceTree(apartments) {
  const loose = [];
  const condos = new Map();
  const groups = new Map();

  for (const apartment of apartments) {
    if (apartment.condo_id == null) {
      loose.push(apartmentRow(apartment));
      continue;
    }
    let condo = condos.get(apartment.condo_id);
    if (!condo) {
      condo = { row: parentRow(`condo:${apartment.condo_id}`, apartment.condo_name, "dp-row-condo"), loose: [], groups: [] };
      condos.set(apartment.condo_id, condo);
    }
    if (apartment.group_id == null) {
      condo.loose.push(apartmentRow(apartment));
      continue;
    }
    let group = groups.get(apartment.group_id);
    if (!group) {
      group = parentRow(`group:${apartment.group_id}`, apartment.group_name, "dp-row-group");
      groups.set(apartment.group_id, group);
      condo.groups.push(group);
    }
    group.children.push(apartmentRow(apartment));
  }

  const condoRows = [...condos.values()].map(condo => {
    condo.row.children = [...condo.loose, ...condo.groups.sort(byName)];
    return condo.row;
  });
  return [...loose, ...condoRows];
}

// Отступ текста от начала уровня в заголовке строки: у кондо и групп DayPilot оставляет место
// под значок дерева, у апартаментов — сколько задано в Scheduler.vue (.scheduler_default_tree_image_no_children).
const PARENT_TEXT_MARGIN = 15;
const APARTMENT_TEXT_MARGIN = 5;

// layoutRowHeaders подбирает ширину колонки Room number по самому длинному номеру апартамента
// и высоту строк кондо и групп, чтобы их названия целиком переносились по этой ширине:
// автоподбор DayPilot учитывает и названия кондо и групп, а высоту строки под текст не меняет.
// Меряет текст во временном невидимом заголовке внутри root, с теми же стилями, что у календаря.
// Возвращает ширину колонки или null, если апартаментов нет.
export function layoutRowHeaders(resources, root, treeIndent) {
  const header = document.createElement("div");
  const inner = document.createElement("div");
  const text = document.createElement("div");
  header.style.cssText = "position:absolute; visibility:hidden; left:-10000px; top:0; width:auto; height:auto";
  inner.className = "scheduler_default_rowheader_inner";
  inner.style.cssText = "position:static; display:block";
  text.className = "scheduler_default_rowheader_inner_text";
  inner.appendChild(text);
  header.appendChild(inner);
  root.appendChild(header);

  try {
    const padding = parseFloat(getComputedStyle(inner).paddingLeft) || 0;
    const rows = [];
    const walk = (list, level) => list.forEach(row => {
      rows.push({ row, level });
      if (row.isParent) walk(row.children, level + 1);
    });
    walk(resources, 0);

    // ширина: номер апартамента в одну строку плюс отступ его уровня
    header.className = "scheduler_default_rowheader";
    text.style.cssText = "display:inline-block; white-space:nowrap";
    let width = 0;
    for (const { row, level } of rows.filter(r => !r.row.isParent)) {
      text.textContent = row.name;
      width = Math.max(width, 2 * padding + level * treeIndent + APARTMENT_TEXT_MARGIN + text.offsetWidth);
    }
    if (!width) return null;
    width = Math.ceil(width) + 4; // граница ячейки и запас на округление

    // высота: название кондо или группы, перенесённое по этой ширине
    text.style.cssText = "display:block";
    for (const { row, level } of rows.filter(r => r.row.isParent)) {
      header.className = `scheduler_default_rowheader ${row.cssClass}`;
      text.style.width = `${width - 4 - 2 * padding - level * treeIndent - PARENT_TEXT_MARGIN}px`;
      text.textContent = row.name;
      row.minHeight = Math.max(28, Math.ceil(text.offsetHeight + 2 * padding));
    }
    return width;
  } finally {
    header.remove();
  }
}

// Номера всех апартаментов дерева (строки кондо и групп — не апартаменты).
export function roomNumbers(resources) {
  return resources.flatMap(row => row.isParent ? roomNumbers(row.children) : [row.id]);
}
