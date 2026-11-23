# armghanahmad.com

A static site. No build step on the host and no dependencies. GitHub Pages serves this repository as it is,
from the main branch. A change to a file here is live in about one minute.

Do not delete or change the CNAME file or the .nojekyll file.

## Files

- index.html, work.html, pictures.html, 404.html: the pages
- css/tokens.css: the three site colors. Change them here.
- css/home.css, css/work.css, css/pictures.css: one stylesheet per page
- js/site.js: reveals, sliding rows, the enlarged photograph, counts of outbound clicks, scroll motion fallback
- img/home, img/pictures: photographs. img/og.jpg is the share image.
- .github: a job that adds new Flowers at Last volumes to the home page. It is not part of the pages.

## Photographs

- img/pictures holds every photograph, named series-number.webp. Opening rows are 900 pixels high, the other rows 700.
- img/pictures/full holds the large copy of each photograph, with the same name. A click or a tap on a photograph
  opens the large copy. Without the script, the photograph is a plain link to that file.
- To add a photograph: save it as WebP at 700 pixels high in img/pictures and at full size in img/pictures/full.
  Then add a line to its series in pictures.html: a link to the large file with its width and height (data-w, data-h),
  and inside it the img with its width, height and a short description.
- A new series is a new section in pictures.html plus one link in the list under the headline.

## Parts to keep up to date

- Writing section: the shelf of volumes (class "vol") and their passages (class "pas") in index.html. Each word of a passage sits in its own span so it can ink in.
- Work page: the five questions (class "q") in work.html show one at a time. Client logos are in img/clients and are drawn in the text color through a CSS mask.

## Notes

- Links between pages use index.html, work.html and pictures.html so the site also opens from a folder.
  The host also serves the same pages at /, /work and /pictures.
- The home loader plays once per browser session.
- Fonts load from Google Fonts: Geist, Instrument Serif, Noto Nastaliq Urdu.
- Visitor counts, when they are on: one script tag for GoatCounter at the end of each page. It sets no cookie.
