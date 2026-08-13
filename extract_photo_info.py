#!/usr/bin/env python3
"""
extract_photo_info.py

Run this LOCALLY on your own machine — it is not part of the website
and never gets deployed. It reads the EXIF data still embedded in your
photos (shot date + GPS location), converts GPS to a country name
entirely offline, and prints a ready-to-paste replacement for the
PHOTOS array in script.js — with `date` and `location` fields added
to whichever entries it could read.

SETUP (once):
    pip install exifread reverse_geocoder pycountry

USAGE:
    Run it from the same folder as script.js and Photos/:
    python3 extract_photo_info.py

    It writes the result to photos_array_output.txt — open that file,
    copy the whole PHOTOS array block, and paste it over the existing
    one in script.js.

NOTES:
- This only works on photos that still have their original EXIF data.
  If you've already compressed a photo (Squoosh and similar strip
  metadata by default), its date/location will come back blank —
  fill those in by hand, or re-export from Google Photos first.
- Entries with no matching file in Photos/ yet (still placeholders)
  are left untouched.
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
OUTPUT_FILE = "photos_array_output.txt"

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

    results = rg.search((lat, lon))
    if not results:
        return None
    cc = results[0]["cc"]  # ISO country code, e.g. "JP"
    country = pycountry.countries.get(alpha_2=cc)
    return country.name if country else cc


def read_photo_info(path):
    with open(path, "rb") as f:
        tags = exifread.process_file(f, details=False)
    return extract_date(tags), extract_location(tags)


def escape_js_string(s):
    return s.replace("\\", "\\\\").replace('"', '\\"')


def main():
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
        date_str, location_str = None, None

        if os.path.exists(src):
            try:
                date_str, location_str = read_photo_info(src)
            except Exception as e:
                print(f"  ! Couldn't read EXIF from {src}: {e}")
            if date_str or location_str:
                found += 1
            else:
                missing_exif += 1
                print(f"  ! No EXIF date/GPS found in {src} (metadata may have been stripped)")
        else:
            missing_file += 1

        line = f'  {{ src: "{src}", alt: "{alt}", tags: {tags_literal}'
        if date_str:
            line += f', date: "{escape_js_string(date_str)}"'
        if location_str:
            line += f', location: "{escape_js_string(location_str)}"'
        line += " },"
        lines.append(line)

    block = "const PHOTOS = [\n" + "\n".join(lines) + "\n];"

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(block + "\n")

    print()
    print(f"Done — {found} photo(s) got date/location, {missing_exif} had no EXIF to read, "
          f"{missing_file} are still placeholders with no file on disk.")
    print(f"Result written to {OUTPUT_FILE} — open it, copy the whole block, and paste it")
    print(f"over the existing `const PHOTOS = [...]` block in {SCRIPT_JS}.")


if __name__ == "__main__":
    main()