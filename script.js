/*
  Add your own photos here. Each entry needs:
    src   — path to the image, e.g. "Photos/urban-02.jpg"
    alt   — short description (for accessibility, also helps SEO)
    tags  — an array of any words you want, e.g. ["urban", "night", "phone"]

  Filter buttons at the top are generated automatically from whatever
  tags show up across all photos below — add a new tag to a photo and
  a new button appears, no need to edit anything else.

  Until a file exists at a given src, this renders a colored placeholder
  block instead, so the layout still looks right.
*/

/*
  How far clicking a lightbox photo zooms in. 3 means the zoomed photo
  is 3x the size it was displayed at, so you see roughly 1/3 of its
  height at a time. Raise it to zoom in further, lower it (e.g. 1.5)
  for a gentler zoom.
*/
const ZOOM_FACTOR = 3;

const PHOTOS = [
  { src: "Photos/100_1312.jpg",     alt: "an urban shot",                                tags: ["urban"] },
  { src: "Photos/moller-to-the-moon.jpeg", alt: "Moller to the Moon.",  tags: ["night"] },
  { src: "Photos/urban-02.jpg",     alt: "an urban shot",                                tags: ["urban"] },
  { src: "Photos/portrait-01.jpg",  alt: "Placeholder — replace with a portrait",        tags: ["portrait"] },
  { src: "Photos/urban-03.jpg",     alt: "Placeholder — replace with an urban shot",     tags: ["urban"] },
  { src: "Photos/landscape-02.jpg", alt: "Placeholder — replace with a landscape shot",  tags: ["landscape"] },
];

const gallery = document.getElementById("gallery");
const filterNav = document.getElementById("filters");

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

function buildFilterButtons() {
  filterNav.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.className = "filter-btn active";
  allBtn.textContent = "All";
  allBtn.addEventListener("click", () => {
    selectedTags.clear();
    updateFilterUI();
    applyFilter();
  });
  filterNav.appendChild(allBtn);

  allTags().forEach((tag) => {
    const btn = document.createElement("button");
    btn.className = "filter-btn";
    btn.textContent = tag;
    btn.dataset.tag = tag;
    btn.addEventListener("click", () => {
      if (selectedTags.has(tag)) {
        selectedTags.delete(tag);
      } else {
        selectedTags.add(tag);
      }
      updateFilterUI();
      applyFilter();
    });
    filterNav.appendChild(btn);
  });
}

function updateFilterUI() {
  const buttons = filterNav.querySelectorAll(".filter-btn");
  buttons.forEach((btn) => {
    if (!btn.dataset.tag) {
      // "All" button — active only when nothing else is selected
      btn.classList.toggle("active", selectedTags.size === 0);
    } else {
      btn.classList.toggle("active", selectedTags.has(btn.dataset.tag));
    }
  });
}

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

buildFilterButtons();
render();