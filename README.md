# Photography site — starter

A minimal, dependency-free static site: `index.html`, `style.css`, `script.js`.
No build step. What you push is what's live.

## 1. Put this on GitHub

```bash
# inside this folder
git init
git add .
git commit -m "Initial site"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_USERNAME.github.io.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username in both the URL
and the repo name — the repo **must** be named exactly
`YOUR_USERNAME.github.io` for GitHub Pages to auto-publish it at
`https://YOUR_USERNAME.github.io`.

If the repo doesn't exist yet, create it first on github.com (empty, no
README/license — otherwise the push above will conflict), then run the
commands.

Pages is usually on by default for a repo with this name. If the site
doesn't load after a minute or two, check **Settings → Pages** and make
sure the source is set to the `main` branch.

## 2. Add your own photos

Right now `script.js` points at files like `images/urban-01.jpg` that
don't exist — so the gallery shows colored placeholder blocks instead,
just so you can see the layout working.

To swap in real photos:

1. Drop compressed images into the `images/` folder (aim under ~500KB
   each — [squoosh.app](https://squoosh.app) is a fast way to do this
   from a phone or browser, no install needed)
2. Edit the `PHOTOS` array at the top of `script.js` — update the
   filenames, write real `alt` text, and set `category` to `"urban"`,
   `"landscape"`, or `"portrait"`
3. Add/remove entries freely — the gallery and filters rebuild
   automatically from that array

## 3. Later: switching to a Jekyll theme

Since this all lives in one git repo, replacing it is just... replacing
the files:

```bash
# from scratch, in a new local folder
git clone https://github.com/SOME-THEME-AUTHOR/their-jekyll-theme.git temp-theme
rm -rf temp-theme/.git
rm -rf * # careful — deletes everything in your current site folder
cp -r temp-theme/* .
git add -A
git commit -m "Switch to Jekyll theme"
git push
```

Nothing about the repo name or GitHub Pages setup changes — it's the
same mechanism (push to `main`, GitHub serves it), just different
content. You can also just delete the whole repo on GitHub and start
over if you'd rather not carry any history.

## Notes on the current design

- Layout is CSS-columns masonry, collapses to 1 column on mobile
- Each photo gets a frame number (`N°001`, `N°002`...) and category tag,
  styled like contact-sheet/EXIF metadata — purely cosmetic, no actual
  EXIF data is read
- Category filter buttons show/hide via a `data-category` attribute —
  no dependencies, ~15 lines of JS
- Strip location EXIF data from portrait photos before uploading if
  privacy matters to you or the people in them
