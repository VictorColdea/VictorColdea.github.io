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

const PHOTOS = [
  { src: "Photos/100_1312.jpg",     alt: "an urban shot",                                tags: ["urban","Barcelona"] },
  { src: "Photos/landscape-01.jpg", alt: "Placeholder — replace with a landscape shot",  tags: ["landscape"] },
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
      card.innerHTML = "";
      img.alt = photo.alt;
      card.appendChild(img);
      card.appendChild(caption(i, photo.tags));
    };
    img.onerror = () => {
      const ph = document.createElement("div");
      ph.className = "placeholder";
      ph.style.setProperty("--ar", PLACEHOLDER_RATIOS[i % PLACEHOLDER_RATIOS.length]);
      ph.style.background = hashColor(photo.tags[0] || "misc");
      card.appendChild(ph);
      card.appendChild(caption(i, photo.tags));
    };
    img.src = photo.src;

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

buildFilterButtons();
render();