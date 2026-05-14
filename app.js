const STORAGE_KEY = "harbour-stamp-trail-hk";
const SAVED_AT_KEY = `${STORAGE_KEY}-saved-at`;

const form = document.querySelector("#stamp-form");
const formTitle = document.querySelector("#form-title");
const deleteButton = document.querySelector("#delete-button");
const resetButton = document.querySelector("#reset-button");
const seedButton = document.querySelector("#seed-button");
const exportButton = document.querySelector("#export-button");
const importFile = document.querySelector("#import-file");
const grid = document.querySelector("#stamp-grid");
const wishlistBar = document.querySelector("#wishlist-bar");
const statsGrid = document.querySelector("#stats-grid");
const headlineStat = document.querySelector("#headline-stat");
const headlineNote = document.querySelector("#headline-note");
const profileBio = document.querySelector("#profile-bio");
const template = document.querySelector("#stamp-tile-template");
const photoInput = document.querySelector("#photo");
const photoPreview = document.querySelector("#photo-preview");
const saveStatus = document.querySelector("#save-status");

const filters = {
  search: document.querySelector("#search"),
  district: document.querySelector("#filter-district"),
  type: document.querySelector("#filter-type"),
};

let collection = loadCollection().map(normalizeStamp);
let pendingPhoto = "";

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

const exampleCollection = [
  {
    id: crypto.randomUUID(),
    name: "Former Central Police Station Stamp",
    place: "Tai Kwun",
    district: "Central and Western",
    status: "collected",
    collectedDate: "2026-04-18",
    stampType: "Museum stamp",
    photo: "",
    notes: "Stamp desk near the visitor centre. Good stop after PMQ.",
    createdAt: Date.now(),
  },
  {
    id: crypto.randomUUID(),
    name: "Star Ferry Pier Memory Stamp",
    place: "Tsim Sha Tsui Star Ferry Pier",
    district: "Yau Tsim Mong",
    status: "collected",
    collectedDate: "2026-04-26",
    stampType: "Tourist checkpoint",
    photo: "",
    notes: "Small stamp table beside the harbour souvenir corner.",
    createdAt: Date.now() + 1,
  },
  {
    id: crypto.randomUUID(),
    name: "HKMoA Gallery Stamp",
    place: "Hong Kong Museum of Art",
    district: "Yau Tsim Mong",
    status: "collected",
    collectedDate: "2026-05-02",
    stampType: "Museum stamp",
    photo: "",
    notes: "Clean red ink. Ask at the front desk.",
    createdAt: Date.now() + 2,
  },
  {
    id: crypto.randomUUID(),
    name: "Blue House Stamp",
    place: "Blue House, Wan Chai",
    district: "Wan Chai",
    status: "wishlist",
    collectedDate: "",
    stampType: "Tourist checkpoint",
    photo: "",
    notes: "Check weekend opening hours before going.",
    createdAt: Date.now() + 3,
  },
];

function loadCollection() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function normalizeStamp(stamp) {
  return {
    id: stamp.id || crypto.randomUUID(),
    name: stamp.name || "",
    place: stamp.place || "",
    district: stamp.district || "",
    status: stamp.status === "wishlist" || stamp.wanted ? "wishlist" : "collected",
    collectedDate: stamp.collectedDate || "",
    stampType: stamp.stampType || "Other",
    photo: stamp.photo || "",
    notes: stamp.notes || "",
    createdAt: stamp.createdAt || Date.now(),
  };
}

function saveCollection() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
  localStorage.setItem(SAVED_AT_KEY, new Date().toISOString());
  renderSaveStatus();
}

function getField(id) {
  return document.getElementById(id);
}

function formatDate(value) {
  if (!value) return "No date yet";
  return new Intl.DateTimeFormat("en-HK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatSavedAt(value) {
  if (!value) return "Saved locally in this browser";

  return `Saved locally at ${new Intl.DateTimeFormat("en-HK", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  }).format(new Date(value))}`;
}

function renderSaveStatus() {
  saveStatus.textContent = formatSavedAt(localStorage.getItem(SAVED_AT_KEY));
}

function readForm() {
  return normalizeStamp({
    id: getField("stamp-id").value || crypto.randomUUID(),
    name: getField("name").value.trim(),
    place: getField("place").value.trim(),
    district: getField("district").value,
    status: getField("status").value,
    collectedDate: getField("collectedDate").value,
    stampType: getField("stampType").value,
    photo: pendingPhoto,
    notes: getField("notes").value.trim(),
    createdAt: Date.now(),
  });
}

function fillForm(stamp) {
  getField("stamp-id").value = stamp.id;
  getField("name").value = stamp.name;
  getField("place").value = stamp.place;
  getField("district").value = stamp.district;
  getField("status").value = stamp.status;
  getField("collectedDate").value = stamp.collectedDate;
  getField("stampType").value = stamp.stampType;
  getField("notes").value = stamp.notes || "";
  pendingPhoto = stamp.photo || "";
  renderPhotoPreview();

  formTitle.textContent = "Edit Stamp";
  deleteButton.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  form.reset();
  getField("stamp-id").value = "";
  getField("status").value = "collected";
  getField("stampType").value = "Shop stamp";
  getField("collectedDate").value = new Date().toISOString().slice(0, 10);
  pendingPhoto = "";
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

function filteredCollected() {
  const active = currentFilters();

  return collection
    .filter((stamp) => stamp.status === "collected")
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
    .sort((a, b) => new Date(b.collectedDate || 0) - new Date(a.collectedDate || 0));
}

function wishlistItems() {
  return collection
    .filter((stamp) => stamp.status === "wishlist")
    .sort((a, b) => b.createdAt - a.createdAt);
}

function renderStats(items) {
  const collected = collection.filter((stamp) => stamp.status === "collected");
  const wishlist = wishlistItems();
  const districts = new Set(collected.map((stamp) => stamp.district).filter(Boolean));
  const latest = collected
    .filter((stamp) => stamp.collectedDate)
    .sort((a, b) => new Date(b.collectedDate) - new Date(a.collectedDate))[0];

  const cards = [
    { label: "Posts", value: collected.length },
    { label: "Districts", value: districts.size },
    { label: "Wishlist", value: wishlist.length },
    { label: "Showing", value: items.length },
  ];

  statsGrid.innerHTML = "";
  cards.forEach((card) => {
    const article = document.createElement("article");
    article.className = "stat-card";
    article.innerHTML = `
      <h3>${escapeHtml(card.label)}</h3>
      <p class="stat-value">${escapeHtml(String(card.value))}</p>
    `;
    statsGrid.append(article);
  });

  headlineStat.textContent = `${collected.length} stamp${collected.length === 1 ? "" : "s"} collected`;
  headlineNote.textContent =
    wishlist.length === 0
      ? "Wishlist clear. Suspiciously powerful behaviour."
      : `${wishlist.length} stamp${wishlist.length === 1 ? "" : "s"} waiting on the wishlist.`;

  profileBio.textContent = latest
    ? `Latest stamp: ${latest.name} at ${latest.place}.`
    : "Your Hong Kong stamp page is ready for the first post.";
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

function renderWishlist() {
  const items = wishlistItems();
  wishlistBar.innerHTML = "";

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "wishlist-empty";
    empty.textContent = "No wishlist stamps yet.";
    wishlistBar.append(empty);
    return;
  }

  items.forEach((stamp) => {
    const item = document.createElement("article");
    item.className = "wishlist-item";
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(stamp.name)}</strong>
        <span>${escapeHtml(stamp.place)} / ${escapeHtml(stamp.district)}</span>
      </div>
      <div class="wishlist-actions">
        <button class="text-button mark-collected" type="button">Collected</button>
        <button class="text-button edit-wishlist" type="button">Edit</button>
      </div>
    `;

    item.querySelector(".mark-collected").addEventListener("click", () => {
      upsertStamp({
        ...stamp,
        status: "collected",
        collectedDate: stamp.collectedDate || new Date().toISOString().slice(0, 10),
      });
    });
    item.querySelector(".edit-wishlist").addEventListener("click", () => fillForm(stamp));
    wishlistBar.append(item);
  });
}

function renderGrid(items) {
  grid.innerHTML = "";

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <h3>No collected stamps here yet</h3>
      <p>Add a collected stamp, or loosen the filters to bring posts back into the grid.</p>
    `;
    grid.append(empty);
    return;
  }

  items.forEach((stamp) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const imageSlot = node.querySelector(".tile-image");

    if (stamp.photo) {
      const image = document.createElement("img");
      image.src = stamp.photo;
      image.alt = `${stamp.name} stamp`;
      imageSlot.append(image);
    } else {
      imageSlot.classList.add("no-photo");
      imageSlot.textContent = stamp.name.slice(0, 2).toUpperCase();
    }

    node.querySelector(".tile-name").textContent = stamp.name;
    node.querySelector(".tile-place").textContent = `${stamp.place} / ${formatDate(stamp.collectedDate)}`;
    node.setAttribute(
      "aria-label",
      `Edit ${stamp.name}, collected at ${stamp.place}`
    );
    node.addEventListener("click", () => fillForm(stamp));
    grid.append(node);
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

function render() {
  collection = collection.map(normalizeStamp);
  const items = filteredCollected();
  renderStats(items);
  renderWishlist();
  renderGrid(items);
}

function exportCollection() {
  const blob = new Blob([JSON.stringify(collection, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "hong-kong-stamp-journal.json";
  link.click();
  URL.revokeObjectURL(url);
  saveStatus.textContent = "Backup downloaded. Local copy still saved here.";
}

function importCollection(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed)) throw new Error("Invalid journal format.");

      collection = parsed.map(normalizeStamp);
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
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const stamp = readForm();
  if (!stamp.name || !stamp.place || !stamp.district) return;

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
importFile.addEventListener("change", (event) => {
  const [file] = event.target.files || [];
  if (file) importCollection(file);
  event.target.value = "";
});

Object.values(filters).forEach((element) => element.addEventListener("input", render));

initDistrictFilter();
saveCollection();
resetForm();
render();
renderSaveStatus();
