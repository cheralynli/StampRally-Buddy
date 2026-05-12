const STORAGE_KEY = "harbour-stamp-trail-hk";
const HK_CENTER = [22.3193, 114.1694];
const HK_BOUNDS = [
  [22.137, 113.826],
  [22.57, 114.443],
];

const form = document.querySelector("#stamp-form");
const formTitle = document.querySelector("#form-title");
const deleteButton = document.querySelector("#delete-button");
const resetButton = document.querySelector("#reset-button");
const seedButton = document.querySelector("#seed-button");
const exportButton = document.querySelector("#export-button");
const importFile = document.querySelector("#import-file");
const locateButton = document.querySelector("#locate-button");
const list = document.querySelector("#collection-list");
const statsGrid = document.querySelector("#stats-grid");
const headlineStat = document.querySelector("#headline-stat");
const headlineNote = document.querySelector("#headline-note");
const template = document.querySelector("#stamp-card-template");
const photoInput = document.querySelector("#photo");
const photoPreview = document.querySelector("#photo-preview");
const coordinateLabel = document.querySelector("#coordinate-label");

const filters = {
  search: document.querySelector("#search"),
  district: document.querySelector("#filter-district"),
  type: document.querySelector("#filter-type"),
};

let collection = loadCollection();
let pendingPhoto = "";
let pickerMap;
let pickerMarker;
let collectionMap;
let markerLayer;

const exampleCollection = [
  {
    id: crypto.randomUUID(),
    name: "Former Central Police Station Stamp",
    place: "Tai Kwun",
    district: "Central and Western",
    collectedDate: "2026-04-18",
    stampType: "Museum stamp",
    latitude: 22.2817,
    longitude: 114.1546,
    photo: "",
    notes: "Stamp desk near the visitor centre. Good stop after PMQ.",
    createdAt: Date.now(),
  },
  {
    id: crypto.randomUUID(),
    name: "Star Ferry Pier Memory Stamp",
    place: "Tsim Sha Tsui Star Ferry Pier",
    district: "Yau Tsim Mong",
    collectedDate: "2026-04-26",
    stampType: "Tourist checkpoint",
    latitude: 22.2936,
    longitude: 114.1688,
    photo: "",
    notes: "Small stamp table beside the harbour souvenir corner.",
    createdAt: Date.now() + 1,
  },
  {
    id: crypto.randomUUID(),
    name: "HKMoA Gallery Stamp",
    place: "Hong Kong Museum of Art",
    district: "Yau Tsim Mong",
    collectedDate: "2026-05-02",
    stampType: "Museum stamp",
    latitude: 22.2932,
    longitude: 114.1722,
    photo: "",
    notes: "Clean red ink. Ask at the front desk.",
    createdAt: Date.now() + 2,
  },
];

const districtOptions = [
  "Central and Western",
  "Wan Chai",
  "Eastern",
  "Southern",
  "Yau Tsim Mong",
  "Sham Shui Po",
  "Kowloon City",
  "Wong Tai Sin",
  "Kwun Tong",
  "Tsuen Wan",
  "Tuen Mun",
  "Yuen Long",
  "North",
  "Tai Po",
  "Sha Tin",
  "Sai Kung",
  "Islands",
  "Kwai Tsing",
];

function loadCollection() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCollection() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
}

function getField(id) {
  return document.getElementById(id);
}

function formatDate(value) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-HK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function setCoordinates(latitude, longitude, shouldMoveMap = true) {
  getField("latitude").value = latitude.toFixed(6);
  getField("longitude").value = longitude.toFixed(6);
  coordinateLabel.textContent = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

  if (!window.L || !pickerMap) return;

  const position = [latitude, longitude];
  if (!pickerMarker) {
    pickerMarker = L.marker(position, { icon: createMarkerIcon("picker") }).addTo(pickerMap);
  } else {
    pickerMarker.setLatLng(position);
  }

  if (shouldMoveMap) {
    pickerMap.setView(position, Math.max(pickerMap.getZoom(), 15));
  }
}

function clearCoordinates() {
  getField("latitude").value = "";
  getField("longitude").value = "";
  coordinateLabel.textContent = "Click the map to drop a pin.";
  if (pickerMarker) {
    pickerMarker.remove();
    pickerMarker = null;
  }
}

function readForm() {
  return {
    id: getField("stamp-id").value || crypto.randomUUID(),
    name: getField("name").value.trim(),
    place: getField("place").value.trim(),
    district: getField("district").value,
    collectedDate: getField("collectedDate").value,
    stampType: getField("stampType").value,
    latitude: Number(getField("latitude").value),
    longitude: Number(getField("longitude").value),
    photo: pendingPhoto,
    notes: getField("notes").value.trim(),
    createdAt: Date.now(),
  };
}

function fillForm(stamp) {
  getField("stamp-id").value = stamp.id;
  getField("name").value = stamp.name;
  getField("place").value = stamp.place;
  getField("district").value = stamp.district;
  getField("collectedDate").value = stamp.collectedDate;
  getField("stampType").value = stamp.stampType;
  getField("notes").value = stamp.notes || "";
  pendingPhoto = stamp.photo || "";
  renderPhotoPreview();

  if (Number.isFinite(stamp.latitude) && Number.isFinite(stamp.longitude)) {
    setCoordinates(stamp.latitude, stamp.longitude);
  } else {
    clearCoordinates();
  }

  formTitle.textContent = "Edit Stamp";
  deleteButton.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  form.reset();
  getField("stamp-id").value = "";
  getField("collectedDate").value = new Date().toISOString().slice(0, 10);
  pendingPhoto = "";
  clearCoordinates();
  renderPhotoPreview();
  formTitle.textContent = "Add A Stamp";
  deleteButton.classList.add("hidden");
}

function upsertStamp(nextStamp) {
  const existing = collection.find((stamp) => stamp.id === nextStamp.id);
  const stamp = existing
    ? { ...existing, ...nextStamp, createdAt: existing.createdAt }
    : { ...nextStamp, createdAt: nextStamp.createdAt || Date.now() };

  collection = existing
    ? collection.map((entry) => (entry.id === stamp.id ? stamp : entry))
    : [stamp, ...collection];

  saveCollection();
  render();
}

function deleteCurrentStamp() {
  const id = getField("stamp-id").value;
  if (!id) return;

  collection = collection.filter((stamp) => stamp.id !== id);
  saveCollection();
  resetForm();
  render();
}

function currentFilters() {
  return {
    search: filters.search.value.trim().toLowerCase(),
    district: filters.district.value,
    type: filters.type.value,
  };
}

function filteredCollection() {
  const active = currentFilters();

  return [...collection]
    .filter((stamp) => {
      const searchBlob = [
        stamp.name,
        stamp.place,
        stamp.district,
        stamp.stampType,
        stamp.notes,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !active.search || searchBlob.includes(active.search);
      const matchesDistrict = active.district === "all" || stamp.district === active.district;
      const matchesType = active.type === "all" || stamp.stampType === active.type;

      return matchesSearch && matchesDistrict && matchesType;
    })
    .sort((a, b) => new Date(b.collectedDate) - new Date(a.collectedDate));
}

function statCards(items) {
  const districts = new Set(collection.map((stamp) => stamp.district).filter(Boolean));
  const latest = collection
    .filter((stamp) => stamp.collectedDate)
    .sort((a, b) => new Date(b.collectedDate) - new Date(a.collectedDate))[0];

  return [
    { label: "Stamps Collected", value: collection.length },
    { label: "Districts Visited", value: districts.size },
    { label: "Showing Now", value: items.length },
    { label: "Latest Stop", value: latest ? latest.place : "None yet" },
  ];
}

function renderStats(items) {
  statsGrid.innerHTML = "";

  statCards(items).forEach((card) => {
    const article = document.createElement("article");
    article.className = "stat-card";
    article.innerHTML = `
      <h3>${escapeHtml(card.label)}</h3>
      <p class="stat-value">${escapeHtml(String(card.value))}</p>
    `;
    statsGrid.append(article);
  });

  headlineStat.textContent = `${collection.length} stamp${collection.length === 1 ? "" : "s"} collected`;
  if (collection.length === 0) {
    headlineNote.textContent = "Add your first stop and pin it on the Hong Kong map.";
  } else {
    const districts = new Set(collection.map((stamp) => stamp.district)).size;
    headlineNote.textContent = `${districts} district${districts === 1 ? "" : "s"} visited across your stamp trail.`;
  }
}

function makeChip(text) {
  const chip = document.createElement("span");
  chip.className = "chip";
  chip.textContent = text;
  return chip;
}

function renderPhotoPreview() {
  photoPreview.innerHTML = "";
  photoPreview.classList.toggle("empty-photo", !pendingPhoto);

  if (!pendingPhoto) {
    const empty = document.createElement("span");
    empty.textContent = "No photo selected";
    photoPreview.append(empty);
    return;
  }

  const image = document.createElement("img");
  image.src = pendingPhoto;
  image.alt = "Selected stamp preview";
  photoPreview.append(image);
}

function renderList(items) {
  list.innerHTML = "";

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <h3>No matching stops yet</h3>
      <p>Clear the filters, or add the next stamp stop from your Hong Kong route.</p>
    `;
    list.append(empty);
    return;
  }

  items.forEach((stamp) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const thumb = node.querySelector(".stamp-thumb");

    if (stamp.photo) {
      const image = document.createElement("img");
      image.src = stamp.photo;
      image.alt = `${stamp.name} stamp`;
      thumb.append(image);
    } else {
      thumb.textContent = "Stamp";
      thumb.classList.add("no-photo");
    }

    node.querySelector(".stamp-place").textContent = `${stamp.place} / ${stamp.district}`;
    node.querySelector(".stamp-name").textContent = stamp.name;
    node.querySelector(".stamp-type").textContent = stamp.stampType;

    const meta = node.querySelector(".stamp-meta");
    [stamp.district, stamp.stampType, hasCoordinates(stamp) && "Mapped"]
      .filter(Boolean)
      .forEach((value) => meta.append(makeChip(value)));

    node.querySelector(".stamp-notes").textContent = stamp.notes || "No notes yet.";
    node.querySelector(".stamp-date").textContent = formatDate(stamp.collectedDate);
    node.querySelector(".stamp-edit").addEventListener("click", () => fillForm(stamp));
    list.append(node);
  });
}

function initDistrictFilter() {
  districtOptions.forEach((district) => {
    const option = document.createElement("option");
    option.value = district;
    option.textContent = district;
    filters.district.append(option);
  });
}

function initMaps() {
  if (!window.L) {
    document.querySelectorAll(".map").forEach((map) => {
      map.innerHTML = '<div class="map-unavailable">Map tiles could not load. Your saved stops still appear below.</div>';
    });
    return;
  }

  pickerMap = L.map("picker-map", {
    maxBounds: HK_BOUNDS,
    maxBoundsViscosity: 0.8,
  }).setView(HK_CENTER, 11);

  collectionMap = L.map("collection-map", {
    maxBounds: HK_BOUNDS,
    maxBoundsViscosity: 0.8,
  }).setView(HK_CENTER, 11);

  [pickerMap, collectionMap].forEach((map) => {
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
  });

  markerLayer = L.layerGroup().addTo(collectionMap);

  pickerMap.on("click", (event) => {
    setCoordinates(event.latlng.lat, event.latlng.lng, false);
  });
}

function createMarkerIcon(kind = "default") {
  const className = kind === "picker" ? "stamp-map-marker picker" : "stamp-map-marker";
  return L.divIcon({
    className,
    html: '<span></span>',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

function hasCoordinates(stamp) {
  return Number.isFinite(stamp.latitude) && Number.isFinite(stamp.longitude);
}

function popupHtml(stamp) {
  const photo = stamp.photo
    ? `<img src="${stamp.photo}" alt="${escapeHtml(stamp.name)} stamp" />`
    : '<div class="popup-photo-empty">No photo</div>';

  return `
    <div class="stamp-popup">
      ${photo}
      <strong>${escapeHtml(stamp.name)}</strong>
      <span>${escapeHtml(stamp.place)}</span>
      <small>${escapeHtml(formatDate(stamp.collectedDate))}</small>
    </div>
  `;
}

function renderCollectionMap(items) {
  if (!window.L || !collectionMap || !markerLayer) return;

  markerLayer.clearLayers();
  const mapped = items.filter(hasCoordinates);

  mapped.forEach((stamp) => {
    L.marker([stamp.latitude, stamp.longitude], { icon: createMarkerIcon() })
      .bindPopup(popupHtml(stamp), { maxWidth: 220 })
      .addTo(markerLayer);
  });

  if (mapped.length > 1) {
    collectionMap.fitBounds(
      mapped.map((stamp) => [stamp.latitude, stamp.longitude]),
      { padding: [36, 36], maxZoom: 15 }
    );
  } else if (mapped.length === 1) {
    collectionMap.setView([mapped[0].latitude, mapped[0].longitude], 14);
  } else {
    collectionMap.setView(HK_CENTER, 11);
  }
}

function render() {
  const items = filteredCollection();
  renderStats(items);
  renderList(items);
  renderCollectionMap(items);
}

function exportCollection() {
  const blob = new Blob([JSON.stringify(collection, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "hong-kong-stamp-trail.json";
  link.click();
  URL.revokeObjectURL(url);
}

function importCollection(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed)) throw new Error("Invalid trail format.");

      collection = parsed.map((stamp) => ({
        ...stamp,
        id: stamp.id || crypto.randomUUID(),
        createdAt: stamp.createdAt || Date.now(),
        latitude: Number(stamp.latitude),
        longitude: Number(stamp.longitude),
        photo: stamp.photo || "",
      }));
      saveCollection();
      resetForm();
      render();
    } catch {
      window.alert("That JSON file could not be imported.");
    }
  };
  reader.readAsText(file);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const stamp = readForm();
  if (!stamp.name || !stamp.place || !stamp.district || !stamp.collectedDate) return;
  if (!hasCoordinates(stamp)) {
    window.alert("Please click the map to choose where you collected this stamp.");
    return;
  }

  upsertStamp(stamp);
  resetForm();
});

photoInput.addEventListener("change", (event) => {
  const [file] = event.target.files || [];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    pendingPhoto = String(reader.result);
    renderPhotoPreview();
  };
  reader.readAsDataURL(file);
});

deleteButton.addEventListener("click", deleteCurrentStamp);
resetButton.addEventListener("click", resetForm);
seedButton.addEventListener("click", () => {
  collection = exampleCollection.map((stamp) => ({ ...stamp }));
  saveCollection();
  resetForm();
  render();
});
exportButton.addEventListener("click", exportCollection);
locateButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    window.alert("Location is not available in this browser.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      setCoordinates(position.coords.latitude, position.coords.longitude);
    },
    () => window.alert("Could not get your current location.")
  );
});
importFile.addEventListener("change", (event) => {
  const [file] = event.target.files || [];
  if (file) importCollection(file);
  event.target.value = "";
});

Object.values(filters).forEach((element) => element.addEventListener("input", render));

initDistrictFilter();
initMaps();
resetForm();
render();
