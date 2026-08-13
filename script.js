/*
  Add your own photos here. Each entry needs:
    src      — path to the image, e.g. "images/street-01.jpg"
    alt      — short description (for accessibility, also helps SEO)
    category — "urban", "landscape", or "portrait"

  Until you add real files to /images, this renders colored placeholder
  blocks so you can see the layout working. Once you drop photos into
  /images and point src at them, the placeholders are replaced automatically.
*/

const PHOTOS = [
  { src: "images/urban-01.jpg",     alt: "Placeholder — replace with an urban shot",     category: "urban" },
  { src: "images/landscape-01.jpg", alt: "Placeholder — replace with a landscape shot",  category: "landscape" },
  { src: "images/urban-02.jpg",     alt: "Placeholder — replace with an urban shot",     category: "urban" },
  { src: "images/portrait-01.jpg",  alt: "Placeholder — replace with a portrait",        category: "portrait" },
  { src: "images/urban-03.jpg",     alt: "Placeholder — replace with an urban shot",     category: "urban" },
  { src: "images/landscape-02.jpg", alt: "Placeholder — replace with a landscape shot",  category: "landscape" },
];

const gallery = document.getElementById("gallery");
const filterButtons = document.querySelectorAll(".filter-btn");

// Rough aspect ratios so placeholder blocks aren't all identical squares
const PLACEHOLDER_RATIOS = ["3/4", "4/5", "1/1", "5/4", "3/5"];

function render() {
  gallery.innerHTML = "";
  PHOTOS.forEach((photo, i) => {
    const card = document.createElement("div");
    card.className = "photo-card";
    card.dataset.category = photo.category;

    const img = new Image();
    img.onload = () => {
      // Real image found — use it
      card.innerHTML = "";
      img.alt = photo.alt;
      card.appendChild(img);
      card.appendChild(caption(i, photo.category));
    };
    img.onerror = () => {
      // No image at that path yet — show a placeholder block instead
      const ph = document.createElement("div");
      ph.className = "placeholder";
      ph.style.setProperty("--ar", PLACEHOLDER_RATIOS[i % PLACEHOLDER_RATIOS.length]);
      ph.style.background = placeholderGradient(photo.category);
      card.appendChild(ph);
      card.appendChild(caption(i, photo.category));
    };
    img.src = photo.src;

    gallery.appendChild(card);
  });
}

function caption(index, category) {
  const cap = document.createElement("div");
  cap.className = "photo-caption";
  const frameNo = document.createElement("span");
  frameNo.className = "frame-no";
  frameNo.textContent = "N\u00B0" + String(index + 1).padStart(3, "0");
  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = category;
  cap.appendChild(frameNo);
  cap.appendChild(tag);
  return cap;
}

function placeholderGradient(category) {
  const gradients = {
    urban:     "linear-gradient(135deg, #2F6F6B, #16181A)",
    landscape: "linear-gradient(135deg, #55574F, #16181A)",
    portrait:  "linear-gradient(135deg, #B5602E, #16181A)",
  };
  return gradients[category] || "linear-gradient(135deg, #444, #16181A)";
}

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const filter = btn.dataset.filter;
    document.querySelectorAll(".photo-card").forEach((card) => {
      const match = filter === "all" || card.dataset.category === filter;
      card.classList.toggle("hidden", !match);
    });
  });
});

document.getElementById("year").textContent = new Date().getFullYear();

render();
