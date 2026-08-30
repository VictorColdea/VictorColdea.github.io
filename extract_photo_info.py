#!/usr/bin/env python3
"""
extract_photo_info.py

Run this LOCALLY on your own machine — it is not part of the website
and never gets deployed. It reads the EXIF data still embedded in your
photos (shot date, GPS location, and camera/shot settings), converts
GPS to a city + country entirely offline, and prints ready-to-paste
PHOTOS entries for script.js — with `date`, `location`, and `camera`
fields added to whichever entries it could read.

SETUP (once):
    pip install exifread reverse_geocoder pycountry

USAGE:
    Run it from the same folder as script.js and Photos/:
    python3 extract_photo_info.py

    It then asks how to find your photos:
      1) Read the PHOTOS array already in script.js — keeps each
         entry's existing `alt` and `tags`, adds date/location/camera.
         Written to photos_array_output_js.txt.
      2) Scan the Photos/ folder directly — picks up every image file
         in there, whether or not it's in script.js yet. Since the
         folder doesn't know `alt` or `tags`, those are left out; add
         them by hand afterwards. Written to photos_array_output.txt.

    Either way, the output file has one `{ src: ..., ... },` line per
    photo (no surrounding `const PHOTOS = [...]`), so you can open it
    and paste in just the rows you want, wherever you want them.

NOTES:
- This only works on photos that still have their original EXIF data.
  If you've already compressed a photo (Squoosh and similar strip
  metadata by default), its date/location/camera will come back blank —
  fill those in by hand, or re-export from Google Photos first.
- In script.js mode, entries with no matching file in Photos/ yet
  (still placeholders) are left untouched.
- Location lookups resolve to the nearest major city (15,000+ people,
  and never a city district/borough on its own — e.g. a photo shot in
  Berlin-Mitte comes back as "Berlin", not "Mitte") rather than the
  nearest populated place of any size, so results stay recognizable.
  The city list itself (geonames_major_cities.csv) is downloaded from
  GeoNames once and cached locally — that one-time download needs an
  internet connection; every run after that is fully offline.
- This script reads exact GPS coordinates locally on your machine —
  it never sends them anywhere. Nothing here touches the live site.
"""

import os
import re
import sys
from datetime import datetime

try:
    import exifread
except ImportError:
    sys.exit("Missing dependency. Run: pip install exifread reverse_geocoder pycountry")

try:
    import reverse_geocoder as rg
except ImportError:
    sys.exit("Missing dependency. Run: pip install exifread reverse_geocoder pycountry")

try:
    import pycountry
except ImportError:
    sys.exit("Missing dependency. Run: pip install exifread reverse_geocoder pycountry")


SCRIPT_JS = "script.js"
PHOTOS_DIR = "Photos"
OUTPUT_FILE_JS = "photos_array_output_js.txt"
OUTPUT_FILE_FOLDER = "photos_array_output.txt"

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".heic", ".heif", ".tif", ".tiff"}

# GeoNames' "cities15000" dump — every populated place with 15,000+ people —
# used instead of reverse_geocoder's bundled dataset so that GPS coordinates
# resolve to a real, recognizable city rather than whatever tiny place (or
# city district) happens to have the nearest lat/lon.
GEONAMES_CITIES_URL = "https://download.geonames.org/export/dump/cities15000.zip"
GEONAMES_CITIES_TXT = "cities15000.txt"
GEOCODER_CACHE_FILE = "geonames_major_cities.csv"

# GeoNames feature code for "a section of a populated place" — e.g. Berlin's
# "Mitte" district — as opposed to a city in its own right. Excluded so a
# photo shot in a borough resolves to its parent city instead.
EXCLUDED_FEATURE_CODES = {"PPLX"}

ENTRY_RE = re.compile(
    r'\{\s*src:\s*"([^"]*)"\s*,\s*alt:\s*"((?:[^"\\]|\\.)*)"\s*,\s*tags:\s*(\[[^\]]*\])\s*\}'
)


def convert_to_degrees(value):
    d = float(value.values[0].num) / float(value.values[0].den)
    m = float(value.values[1].num) / float(value.values[1].den)
    s = float(value.values[2].num) / float(value.values[2].den)
    return d + (m / 60.0) + (s / 3600.0)


def extract_date(tags):
    date_tag = tags.get("EXIF DateTimeOriginal") or tags.get("Image DateTime")
    if not date_tag:
        return None
    try:
        dt = datetime.strptime(str(date_tag), "%Y:%m:%d %H:%M:%S")
    except ValueError:
        return None
    # Day only, no time — written out portably (no platform-specific
    # strftime flags, since %-d / %#d differ between Mac/Linux/Windows)
    return f"{dt.strftime('%B')} {dt.day}, {dt.year}"


def _ratio_to_float(ratio):
    try:
        return float(ratio.num) / float(ratio.den)
    except (ZeroDivisionError, AttributeError):
        return None


def extract_camera(tags):
    make = str(tags.get("Image Make", "")).strip()
    model = str(tags.get("Image Model", "")).strip()
    if model and make and not model.lower().startswith(make.lower()):
        name = f"{make} {model}"
    else:
        name = model or make or None

    specs = []

    fnumber = tags.get("EXIF FNumber")
    if fnumber:
        f_val = _ratio_to_float(fnumber.values[0])
        if f_val:
            specs.append(f"f/{f_val:g}")

    exposure = tags.get("EXIF ExposureTime")
    if exposure:
        secs = _ratio_to_float(exposure.values[0])
        if secs:
            specs.append(f"1/{round(1 / secs)}" if secs < 1 else f"{secs:g}s")

    focal = tags.get("EXIF FocalLengthIn35mmFilm") or tags.get("EXIF FocalLength")
    if focal:
        raw = focal.values[0]
        mm = _ratio_to_float(raw) if hasattr(raw, "num") else float(raw)
        if mm:
            specs.append(f"{round(mm)}mm")

    iso = tags.get("EXIF ISOSpeedRatings") or tags.get("EXIF PhotographicSensitivity")
    if iso and iso.values:
        specs.append(f"ISO{iso.values[0]}")

    if name and specs:
        return f"{name}  " + " ".join(specs)
    return name or (" ".join(specs) if specs else None)


_geocoder = None  # lazily built, then reused for every photo in the run


def _build_geocoder_cache():
    import csv
    import io
    import urllib.request
    import zipfile

    print(f"Downloading a list of major world cities from GeoNames (one-time, ~3MB)...")
    data = urllib.request.urlopen(GEONAMES_CITIES_URL, timeout=30).read()
    raw = zipfile.ZipFile(io.BytesIO(data)).read(GEONAMES_CITIES_TXT).decode("utf-8")

    with open(GEOCODER_CACHE_FILE, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["lat", "lon", "name", "admin1", "admin2", "cc"])
        for line in raw.splitlines():
            cols = line.split("\t")
            if len(cols) < 9 or cols[7] in EXCLUDED_FEATURE_CODES:
                continue
            name, lat, lon, cc = cols[2], cols[4], cols[5], cols[8]
            writer.writerow([lat, lon, name, "", "", cc])


def _get_geocoder():
    global _geocoder
    if _geocoder is None:
        if not os.path.exists(GEOCODER_CACHE_FILE):
            _build_geocoder_cache()
        with open(GEOCODER_CACHE_FILE, "r", encoding="utf-8") as f:
            _geocoder = rg.RGeocoder(mode=2, verbose=True, stream=f)
    return _geocoder


def extract_location(tags):
    lat_tag = tags.get("GPS GPSLatitude")
    lat_ref = tags.get("GPS GPSLatitudeRef")
    lon_tag = tags.get("GPS GPSLongitude")
    lon_ref = tags.get("GPS GPSLongitudeRef")
    if not (lat_tag and lon_tag):
        return None

    lat = convert_to_degrees(lat_tag)
    if lat_ref and str(lat_ref) != "N":
        lat = -lat
    lon = convert_to_degrees(lon_tag)
    if lon_ref and str(lon_ref) != "E":
        lon = -lon

    results = _get_geocoder().query([(lat, lon)])
    if not results:
        return None
    city = results[0]["name"]  # nearest major city, e.g. "Cambridge"
    cc = results[0]["cc"]  # ISO country code, e.g. "JP"
    country = pycountry.countries.get(alpha_2=cc)
    country_name = country.name if country else cc
    return f"{city}, {country_name}" if city else country_name


def read_photo_info(path):
    with open(path, "rb") as f:
        tags = exifread.process_file(f, details=False)
    return extract_date(tags), extract_location(tags), extract_camera(tags)


def escape_js_string(s):
    return s.replace("\\", "\\\\").replace('"', '\\"')


def scan_script_js():
    if not os.path.exists(SCRIPT_JS):
        sys.exit(f"Couldn't find {SCRIPT_JS} — run this from your site's project folder.")

    with open(SCRIPT_JS, "r", encoding="utf-8") as f:
        content = f.read()

    entries = ENTRY_RE.findall(content)
    if not entries:
        sys.exit(f"Couldn't find any PHOTOS entries in {SCRIPT_JS} — is the format still `{{ src: ..., alt: ..., tags: [...] }}`?")
    print(f"Found {len(entries)} photo entries in {SCRIPT_JS}: \n{[entries[i][0] for i in range(len(entries))]}")

    lines = []
    found, missing_file, missing_exif = 0, 0, 0

    for src, alt, tags_literal in entries:
        date_str, location_str, camera_str = None, None, None

        if os.path.exists(src):
            try:
                date_str, location_str, camera_str = read_photo_info(src)
            except Exception as e:
                print(f"  ! Couldn't read EXIF from {src}: {e}")
            if date_str or location_str or camera_str:
                found += 1
                print(f"  + Found EXIF in {src}: date={date_str}, location={location_str}, camera={camera_str}")
            else:
                missing_exif += 1
                print(f"  ! No EXIF date/GPS/camera found in {src} (metadata may have been stripped)")
        else:
            missing_file += 1

        line = f'  {{ src: "{src}", alt: "{alt}", tags: {tags_literal}'
        if date_str:
            line += f', date: "{escape_js_string(date_str)}"'
        if location_str:
            line += f', location: "{escape_js_string(location_str)}"'
        if camera_str:
            line += f', camera: "{escape_js_string(camera_str)}"'
        line += " },"
        lines.append(line)

    with open(OUTPUT_FILE_JS, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print()
    print(f"Done — {found} photo(s) got date/location/camera, {missing_exif} had no EXIF to read, "
          f"{missing_file} are still placeholders with no file on disk.")
    print(f"Result written to {OUTPUT_FILE_JS} — open it and paste in whichever rows you want")
    print(f"into the `const PHOTOS = [...]` block in {SCRIPT_JS}.")


def scan_photos_folder():
    if not os.path.isdir(PHOTOS_DIR):
        sys.exit(f"Couldn't find a '{PHOTOS_DIR}' folder — run this from your site's project folder.")

    files = sorted(
        fname for fname in os.listdir(PHOTOS_DIR)
        if os.path.splitext(fname)[1].lower() in IMAGE_EXTENSIONS
    )
    if not files:
        sys.exit(f"No image files found in {PHOTOS_DIR}/.")
    print(f"Found {len(files)} image file(s) in {PHOTOS_DIR}/: \n{files}")

    lines = []
    found, missing_exif = 0, 0

    for fname in files:
        src = f"{PHOTOS_DIR}/{fname}"
        date_str, location_str, camera_str = None, None, None

        try:
            date_str, location_str, camera_str = read_photo_info(src)
        except Exception as e:
            print(f"  ! Couldn't read EXIF from {src}: {e}")
        if date_str or location_str or camera_str:
            found += 1
        else:
            missing_exif += 1
            print(f"  ! No EXIF date/GPS/camera found in {src} (metadata may have been stripped)")

        fields = [f'src: "{src}"']
        if date_str:
            fields.append(f'date: "{escape_js_string(date_str)}"')
        if location_str:
            fields.append(f'location: "{escape_js_string(location_str)}"')
        if camera_str:
            fields.append(f'camera: "{escape_js_string(camera_str)}"')
        lines.append("  { " + ", ".join(fields) + " },")

    with open(OUTPUT_FILE_FOLDER, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print()
    print(f"Done — {found} photo(s) got date/location/camera, {missing_exif} had no EXIF to read.")
    print(f"Result written to {OUTPUT_FILE_FOLDER} — these entries only have `src` (plus")
    print(f"date/location/camera where found). Add `alt` and `tags` by hand, then paste")
    print(f"whichever rows you want into script.js.")


def main():
    choice = None
    while choice not in ("1", "2"):
        choice = input(
            "How should photos be found?\n"
            "  1) Read the PHOTOS array in script.js (keeps existing alt/tags)\n"
            "  2) Scan the Photos/ folder directly (no alt/tags — add those by hand)\n"
            "Choice [1/2]: "
        ).strip()

    if choice == "1":
        scan_script_js()
    else:
        scan_photos_folder()


if __name__ == "__main__":
    main()