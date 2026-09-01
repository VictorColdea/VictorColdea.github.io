/*
  Add your own photos here. Each entry needs:
    src   — path to the image, e.g. "Photos/urban-02.jpg"
    alt   — short description (for accessibility, also helps SEO)
    tags  — an array of any words you want, e.g. ["urban", "night", "phone"]

  A few more fields are optional and show up in the lightbox side panel
  if present:
    date     — e.g. "August 15, 2024"
    location — e.g. "Tokyo, Japan"
    camera   — e.g. "Google Pixel 6 Pro  f/3.5 1/168 19mm ISO34"
  Fill these in by hand, or run extract_photo_info.py to pull them
  from each photo's EXIF data automatically (see that file for how).

  The tag search dropdown at the top is generated automatically from
  whatever tags show up across all photos below — add a new tag to a
  photo and a new option appears, no need to edit anything else.

  Until a file exists at a given src, this renders a colored placeholder
  block instead, so the layout still looks right.
*/

/*
  How far clicking a lightbox photo zooms in. 3 means the zoomed photo is 3x the size it was displayed at.
*/
const ZOOM_FACTOR = 2;

const PHOTOS = [
  { src: "Photos/moller-to-the-moon.jpg", alt: "Moller to the Moon.", tags: ["night"], date: "June 8, 2024", location: "Cambridge, United Kingdom", camera: "Google Pixel 6 Pro  f/1.85 1/38 24mm ISO550" },
  { src: "Photos/windmills_austria.jpg", alt: "Wind turbines just outside Bratislava.", tags: ['wind turbine'], date: "June 25, 2026", location: "Karlova Ves, Slovakia", camera: "Google Pixel 6 Pro  f/1.85 1/268 24mm ISO62" },
  { src: "Photos/pathway_perspective_DAMTP.jpg", alt: "Pathway outside DAMTP in Cambridge.", tags: ["perspective"], date: "October 13, 2025", location: "Cambridge, United Kingdom", camera: "Google Pixel 6 Pro  f/3.5 1/133 106mm ISO161" },
  { src: "Photos/plane_view_windmills.jpg", alt: "View from a plane.", tags: ['wind turbine'], date: "September 8, 2025", camera: "Google Pixel 6 Pro  f/3.5 1/90 106mm ISO44" },
  { src: "Photos/venice_reflection_buildings.jpg", tags: ['urban'], date: "August 10, 2025", location: "Venice, Italy", camera: "Google Pixel 6 Pro  f/1.85 1/2137 24mm ISO47" },
  { src: "Photos/berliner_dom_angle_streetlights.jpg", alt: "Berliner Dom", tags: ["night", "urban"], date: "March 21, 2024", location: "Berlin, Germany", camera: "Google Pixel 6 Pro  f/1.85 1/47 24mm ISO334" },
  { src: "Photos/ducklings_cavendish_pond.jpg", alt: "Ducklings next to the Cavendish pond.", tags: ["wildlife"], date: "July 29, 2024", location: "Cambridge, United Kingdom", camera: "Google Pixel 6 Pro  f/3.5 1/168 106mm ISO34" },
  { src: "Photos/yellow_windows_oxford_physics.jpg", alt: "Oxford Physics. They ought to fill those potholes...", tags: ['night'], date: "December 18, 2025", location: "Oxford, United Kingdom", camera: "Google Pixel 6 Pro  f/3.5 1/25 106mm ISO470" },
  { src: "Photos/sunset_krakow.jpg", tags: ["sunset"], date: "September 19, 2025", location: "Krakow, Poland", camera: "Google Pixel 6 Pro  f/3.5 1/662 106mm ISO17" },
  { src: "Photos/ucsb_ocean_sunrise.jpg", alt: "Sunrise near Santa Barbara.", date: "September 4, 2023", tags: ['sunrise'], camera: "Sony XQ-AD51  f/2 1/4329 4mm ISO121" },
  { src: "Photos/beecroft_building.jpg", alt: "Beecroft Building in the Physics Department.", tags: ["indoors", "perspective"], date: "October 1, 2025", location: "Oxford, United Kingdom", camera: "Google Pixel 6 Pro  f/1.85 1/82 24mm ISO85" },
  { src: "Photos/churchill_tree_backlit.jpg", tags: ["sunlight"], date: "May 17, 2026", location: "Cambridge, United Kingdom", camera: "Google Pixel 6 Pro  f/1.85 1/643 24mm ISO43" },
  { src: "Photos/berlin_bridge_park_reflection_cropped.jpg", date: "March 19, 2024", location: "Berlin, Germany", camera: "Google Pixel 6 Pro  f/1.85 1/369 24mm ISO39" },
  { src: "Photos/moon_crescent_oxford.jpg", tags: ["night"],date: "January 2, 2025", location: "Oxford, United Kingdom", camera: "Google Pixel 6 Pro  f/3.5 1/15 106mm ISO2090" },
  { src: "Photos/hepworth_fog_light.jpg", tags: ["night"], date: "November 1, 2024", camera: "Google Pixel 6 Pro  f/1.85 1/6 24mm ISO1113" },
];









// Guard against entries missing a tags array
PHOTOS.forEach((p) => { if (!p.tags) p.tags = []; });

const gallery = document.getElementById("gallery");
const filterSearch = document.getElementById("filterSearch");
const filterInput = document.getElementById("filterInput");
const filterDropdown = document.getElementById("filterDropdown");
const filterOptions = document.getElementById("filterOptions");
const filterClear = document.getElementById("filterClear");

// Rough aspect ratios so placeholder blocks aren't all identical squares
const PLACEHOLDER_RATIOS = ["3/4", "4/5", "1/1", "5/4", "3/5"];

// Fixed palette so placeholder colors stay consistent across reloads,
// assigned to tags by simple hash rather than a hardcoded list
const PALETTE = [
  "linear-gradient(135deg, #2F6F6B, #16181A)",
  "linear-gradient(135deg, #B5602E, #16181A)",
  "linear-gradient(135deg, #55574F, #16181A)",
  "linear-gradient(135deg, #3A5A78, #16181A)",
  "linear-gradient(135deg, #7A4E6D, #16181A)",
];

const selectedTags = new Set();
const loadedSrc = {}; // index -> true (real image loaded) | false (using placeholder)

function allTags() {
  const set = new Set();
  PHOTOS.forEach((p) => p.tags.forEach((t) => set.add(t)));
  return [...set].sort();
}

function hashColor(tag) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function tagCounts() {
  const counts = {};
  PHOTOS.forEach((p) => p.tags.forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
  return counts;
}

function renderFilterOptions() {
  const query = filterInput.value.trim().toLowerCase();
  const counts = tagCounts();
  const tags = allTags().filter((t) => t.toLowerCase().includes(query));

  filterOptions.innerHTML = "";

  if (tags.length === 0) {
    const empty = document.createElement("div");
    empty.className = "filter-empty";
    empty.textContent = "No matching tags";
    filterOptions.appendChild(empty);
    return;
  }

  tags.forEach((tag) => {
    const label = document.createElement("label");
    label.className = "filter-option";
    label.classList.toggle("checked", selectedTags.has(tag));

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selectedTags.has(tag);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) selectedTags.add(tag);
      else selectedTags.delete(tag);
      label.classList.toggle("checked", checkbox.checked);
      updateFilterUI();
      applyFilter();
    });

    const text = document.createElement("span");
    text.textContent = tag;

    const count = document.createElement("span");
    count.className = "count";
    count.textContent = "(" + counts[tag] + ")";

    label.appendChild(checkbox);
    label.appendChild(text);
    label.appendChild(count);
    filterOptions.appendChild(label);
  });
}

function updateFilterUI() {
  filterClear.disabled = selectedTags.size === 0;
  filterInput.placeholder = selectedTags.size === 0
    ? "Filter by tag…"
    : [...selectedTags].join(", ");
}

function openFilterDropdown() {
  renderFilterOptions();
  filterDropdown.hidden = false;
}

function closeFilterDropdown() {
  filterDropdown.hidden = true;
}

filterInput.addEventListener("focus", openFilterDropdown);
filterInput.addEventListener("click", openFilterDropdown);
filterInput.addEventListener("input", renderFilterOptions);

filterClear.addEventListener("click", () => {
  selectedTags.clear();
  updateFilterUI();
  applyFilter();
  renderFilterOptions();
  filterInput.focus();
});

document.addEventListener("click", (e) => {
  if (!filterSearch.contains(e.target)) closeFilterDropdown();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !filterDropdown.hidden) {
    closeFilterDropdown();
    filterInput.blur();
  }
});

function applyFilter() {
  document.querySelectorAll(".photo-card").forEach((card) => {
    const cardTags = card.dataset.tags.split(",").filter(Boolean);
    const match = selectedTags.size === 0 || cardTags.some((t) => selectedTags.has(t));
    card.classList.toggle("hidden", !match);
  });
}

function render() {
  gallery.innerHTML = "";
  PHOTOS.forEach((photo, i) => {
    const card = document.createElement("div");
    card.className = "photo-card";
    card.dataset.tags = photo.tags.join(",");

    const img = new Image();
    img.onload = () => {
      loadedSrc[i] = true;
      card.innerHTML = "";
      img.alt = photo.alt;
      card.appendChild(img);
      card.appendChild(caption(i, photo.tags));
    };
    img.onerror = () => {
      loadedSrc[i] = false;
      const ph = document.createElement("div");
      ph.className = "placeholder";
      ph.style.setProperty("--ar", PLACEHOLDER_RATIOS[i % PLACEHOLDER_RATIOS.length]);
      ph.style.background = hashColor(photo.tags[0] || "misc");
      card.appendChild(ph);
      card.appendChild(caption(i, photo.tags));
    };
    img.src = photo.src;

    card.addEventListener("click", () => openLightbox(i));

    gallery.appendChild(card);
  });
}

function caption(index, tags) {
  const cap = document.createElement("div");
  cap.className = "photo-caption";
  const frameNo = document.createElement("span");
  frameNo.className = "frame-no";
  frameNo.textContent = "N\u00B0" + String(index + 1).padStart(3, "0");
  const tagEl = document.createElement("span");
  tagEl.className = "tag";
  tagEl.textContent = tags.join(" \u00B7 ");
  cap.appendChild(frameNo);
  cap.appendChild(tagEl);
  return cap;
}

document.getElementById("year").textContent = new Date().getFullYear();

// ---------- Lightbox ----------

const lightbox = document.getElementById("lightbox");
const lightboxImageWrap = document.getElementById("lightboxImageWrap");
const lightboxFrame = document.getElementById("lightboxFrame");
const lightboxMeta = document.getElementById("lightboxMeta");
const lightboxCamera = document.getElementById("lightboxCamera");
const lightboxDesc = document.getElementById("lightboxDesc");
const lightboxTags = document.getElementById("lightboxTags");
const lightboxClose = document.getElementById("lightboxClose");
const lightboxPrev = document.getElementById("lightboxPrev");
const lightboxNext = document.getElementById("lightboxNext");

let lastFocused = null;
let currentIndex = null;
let isZoomed = false;
let isPanning = false;
let panStart = { x: 0, y: 0, scrollLeft: 0, scrollTop: 0, moved: false };

// Indices into PHOTOS that match the currently active tag filter —
// this is what prev/next cycle through, not the full PHOTOS array
function visibleIndices() {
  return PHOTOS
    .map((p, i) => i)
    .filter((i) => selectedTags.size === 0 || PHOTOS[i].tags.some((t) => selectedTags.has(t)));
}

function resetZoom() {
  isZoomed = false;
  lightboxImageWrap.classList.remove("zoomed", "panning");
  const img = lightboxImageWrap.querySelector("img");
  if (img) {
    img.style.width = "";
    img.style.maxWidth = "";
    img.style.maxHeight = "";
  }
}

function openLightbox(index) {
  currentIndex = index;
  const photo = PHOTOS[index];
  lastFocused = document.activeElement;
  resetZoom();

  lightboxImageWrap.innerHTML = "";
  if (loadedSrc[index]) {
    const img = document.createElement("img");
    img.src = photo.src;
    img.alt = photo.alt;
    img.draggable = false;
    lightboxImageWrap.appendChild(img);
    lightboxImageWrap.classList.remove("no-zoom");
  } else {
    const ph = document.createElement("div");
    ph.className = "placeholder";
    ph.style.background = hashColor(photo.tags[0] || "misc");
    lightboxImageWrap.appendChild(ph);
    lightboxImageWrap.classList.add("no-zoom"); // nothing to zoom on a placeholder
  }

  lightboxFrame.textContent = "N\u00B0" + String(index + 1).padStart(3, "0");
  lightboxMeta.textContent = [photo.date, photo.location].filter(Boolean).join(" \u00B7 ");
  lightboxCamera.textContent = photo.camera || "";
  lightboxDesc.textContent = photo.alt;
  lightboxTags.innerHTML = "";
  photo.tags.forEach((t) => {
    const span = document.createElement("span");
    span.textContent = t;
    lightboxTags.appendChild(span);
  });

  const visible = visibleIndices();
  const showNav = visible.length > 1;
  lightboxPrev.classList.toggle("hidden", !showNav);
  lightboxNext.classList.toggle("hidden", !showNav);

  lightbox.hidden = false;
  document.body.style.overflow = "hidden";
  lightboxClose.focus();
}

function closeLightbox() {
  lightbox.hidden = true;
  document.body.style.overflow = "";
  resetZoom();
  if (lastFocused) lastFocused.focus();
}

function navigate(direction) {
  const visible = visibleIndices();
  if (visible.length < 2) return;
  const pos = visible.indexOf(currentIndex);
  const nextPos = (pos + direction + visible.length) % visible.length;
  openLightbox(visible[nextPos]);
}

lightboxClose.addEventListener("click", closeLightbox);
lightboxPrev.addEventListener("click", () => navigate(-1));
lightboxNext.addEventListener("click", () => navigate(1));

lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});

document.addEventListener("keydown", (e) => {
  if (lightbox.hidden) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") navigate(-1);
  if (e.key === "ArrowRight") navigate(1);
});

// Click image to zoom in (centered), click again to zoom back out.
// While zoomed, drag/touch-drag pans around via native scrolling.
lightboxImageWrap.addEventListener("pointerdown", (e) => {
  const img = lightboxImageWrap.querySelector("img");
  if (!img) return;
  e.preventDefault(); // stop the browser's built-in "drag this image" gesture
  isPanning = true;
  panStart = {
    x: e.clientX,
    y: e.clientY,
    scrollLeft: lightboxImageWrap.scrollLeft,
    scrollTop: lightboxImageWrap.scrollTop,
    moved: false,
  };
  lightboxImageWrap.setPointerCapture(e.pointerId);
});

lightboxImageWrap.addEventListener("pointermove", (e) => {
  if (!isPanning || !isZoomed) return;
  const dx = e.clientX - panStart.x;
  const dy = e.clientY - panStart.y;
  if (Math.abs(dx) > 4 || Math.abs(dy) > 4) panStart.moved = true;
  lightboxImageWrap.scrollLeft = panStart.scrollLeft - dx;
  lightboxImageWrap.scrollTop = panStart.scrollTop - dy;
  lightboxImageWrap.classList.add("panning");
});

lightboxImageWrap.addEventListener("pointerup", () => {
  isPanning = false;
  lightboxImageWrap.classList.remove("panning");
  if (!panStart.moved) toggleZoom();
});

lightboxImageWrap.addEventListener("pointercancel", () => {
  isPanning = false;
  lightboxImageWrap.classList.remove("panning");
});

function toggleZoom() {
  const img = lightboxImageWrap.querySelector("img");
  if (!img) return;
  isZoomed = !isZoomed;
  if (isZoomed) {
    // Base the zoom on how large the photo is currently *displayed*,
    // not its raw file resolution — phone photos are often 3000px+,
    // so zooming off that would blow the image up far too much.
    const displayedWidth = img.getBoundingClientRect().width;
    img.style.maxWidth = "none";
    img.style.maxHeight = "none";
    img.style.width = displayedWidth * ZOOM_FACTOR + "px";
    lightboxImageWrap.classList.add("zoomed");
    // Center the zoomed view rather than anchoring to a corner
    lightboxImageWrap.scrollLeft = (lightboxImageWrap.scrollWidth - lightboxImageWrap.clientWidth) / 2;
    lightboxImageWrap.scrollTop = (lightboxImageWrap.scrollHeight - lightboxImageWrap.clientHeight) / 2;
  } else {
    img.style.width = "";
    img.style.maxWidth = "";
    img.style.maxHeight = "";
    lightboxImageWrap.classList.remove("zoomed");
  }
}

updateFilterUI();
render();