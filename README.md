# armghanahmad.com

A static site. No build step and no dependencies. It is hosted on Netlify: zip this folder and
upload the zip on the project's Deploys page. Any other static host works too.

## Files

- index.html, work.html, pictures.html, 404.html: the pages
- css/tokens.css: the three site colors. Change them here.
- css/home.css, css/work.css, css/pictures.css: one stylesheet per page
- js/site.js: reveals, sliding rows, scroll motion fallback
- img/home, img/pictures: photographs. img/og.jpg is the share image.

## Photographs

- img/pictures holds every photograph, named series-number.webp. Opening rows are 900 pixels high, the other rows 700.
- To add a photograph: save it as WebP at 700 pixels high in img/pictures, then add an img line to its
  series in pictures.html with the width, height and a short description.
- A new series is a new section in pictures.html plus one link in the list under the headline.

## Parts to keep up to date

- Writing section: the shelf of volumes (class "vol") and their passages (class "pas") in index.html. Each word of a passage sits in its own span so it can ink in. Add a volume by hand for each new issue. Vol. xi has no passage yet.
- Work page: the five questions (class "q") in work.html show one at a time. Client logos are in img/clients and are drawn in the text color through a CSS mask.

## Notes

- Links between pages use index.html, work.html and pictures.html so the site also opens from a folder.
  Hosts with clean URLs serve the same pages at /, /work and /pictures.
- The home loader plays once per browser session.
- Fonts load from Google Fonts: Geist, Instrument Serif, Noto Nastaliq Urdu.
