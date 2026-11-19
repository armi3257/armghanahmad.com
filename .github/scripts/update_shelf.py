#!/usr/bin/env python3
"""Add new Flowers at Last volumes to the Writing shelf on the home page.

The script reads the public Substack feed. For each volume that is newer than the newest volume
on the shelf, it adds the numeral, the title, the link and the opening paragraph, word for word,
to index.html. It changes nothing else. The workflow .github/workflows/shelf.yml runs it.

A post counts as a volume when its title reads "vol. <numeral> - <title>".
To use a different passage for a volume, edit index.html by hand or build from the source package.
"""
import html
import os
import re
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

SUB = 'https://flowersatlast.substack.com'
FEED = SUB + '/feed'
PAGE = 'index.html'
MIN_CHARS = 150   # keep adding paragraphs until the passage is at least this long
MAX_CHARS = 430   # and never longer than this
ARROW = ('<svg class="ar" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 8 L8 2 M3.4 2 H8 V6.6" '
         'fill="none" stroke="currentColor" stroke-width="1.3"></path></svg>')
SHELF_OPEN = '<div class="shelf-wrap"><div class="shelf">\n'
READ_OPEN = '<div class="read">\n'
VOL_ON = '<button type="button" class="vol on" aria-pressed="true">'
VOL_OFF = '<button type="button" class="vol" aria-pressed="false">'
PAS_ON = '<div class="pas on">'
PAS_OFF = '<div class="pas">'
ROMAN = [(1000, 'm'), (900, 'cm'), (500, 'd'), (400, 'cd'), (100, 'c'), (90, 'xc'), (50, 'l'),
         (40, 'xl'), (10, 'x'), (9, 'ix'), (5, 'v'), (4, 'iv'), (1, 'i')]
TITLE = re.compile(r'^\s*vol\.?\s*([ivxlcdm]+|\d+)\s*[-\u2013\u2014:]\s*(.+?)\s*$', re.I)
SKIP_TAGS = {'blockquote', 'figure', 'figcaption', 'pre', 'table', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'}
LIST_TAGS = {'ul', 'ol'}
SKIP_CLASS = ('footnote', 'subscription', 'pullquote', 'embed', 'button', 'cta', 'poll', 'captioned', 'preformatted',
              'tweet', 'image')
VOID = {'br', 'img', 'hr', 'input', 'meta', 'link', 'source', 'wbr'}


def to_roman(n):
    out = ''
    for value, sym in ROMAN:
        while n >= value:
            out += sym
            n -= value
    return out


def from_roman(s):
    total, i, s = 0, 0, s.lower()
    for value, sym in ROMAN:
        while s[i:i + len(sym)] == sym:
            total += value
            i += len(sym)
    return total if i == len(s) and s else 0


class Paragraphs(HTMLParser):
    """Collect the plain paragraphs of a post, in order, and leave out quotes, captions and embeds."""

    def __init__(self, lists=False):
        super().__init__(convert_charrefs=True)
        self.lists = lists     # True: also read the paragraphs of a list
        self.stack = []        # (tag, is_skip) for each open element
        self.paras = []        # (lines, all_italic)
        self.cur = None        # lines of the paragraph that is open
        self.italic = 0
        self.plain_seen = False

    def skipping(self):
        return any(skip for _, skip in self.stack)

    def handle_starttag(self, tag, attrs):
        if tag == 'br':
            if self.cur is not None:
                self.cur.append('')
            return
        if tag in VOID:
            return
        cls = dict(attrs).get('class') or ''
        skip = (tag in SKIP_TAGS or (tag in LIST_TAGS and not self.lists)
                or any(k in cls for k in SKIP_CLASS))
        self.stack.append((tag, skip))
        if tag == 'p' and not self.skipping():
            self.cur, self.plain_seen = [''], False
        if tag in ('em', 'i'):
            self.italic += 1

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if tag in ('em', 'i') and self.italic:
            self.italic -= 1
        if tag == 'p' and self.cur is not None:
            lines = [re.sub(r'\s+', ' ', x.replace('\xa0', ' ')).strip() for x in self.cur]
            lines = [x for x in lines if x]
            if lines:
                self.paras.append((lines, not self.plain_seen))
            self.cur = None
        for k in range(len(self.stack) - 1, -1, -1):
            if self.stack[k][0] == tag:
                del self.stack[k:]
                break

    def handle_data(self, data):
        if self.cur is None or self.skipping():     # skipping: a footnote mark inside a paragraph
            return
        self.cur[-1] += data
        if data.strip() and not self.italic:
            self.plain_seen = True


def cut(text, limit=MAX_CHARS, first=True):
    """Shorten a long paragraph to the limit, at the end of a sentence.

    When no sentence ends inside the limit, the first paragraph is cut at a word and gets an ellipsis.
    A later paragraph is left out ('').
    """
    if len(text) <= limit:
        return text
    head = text[:limit + 1]
    ends = [m.end() for m in re.finditer(r'[.!?][\u201d\u2019"\')]*(?=\s)', head)]
    ends = [e for e in ends if e >= (120 if first else 40)]
    if ends:
        return head[:ends[-1]]
    if not first:
        return ''
    return (head[:head.rindex(' ')] if ' ' in head else head[:limit]).rstrip(',;:') + '\u2026'


def passage_units(content):
    """Return (units, is_verse): the opening of the post as a list of paragraphs or lines."""
    for lists in (False, True):               # a post that is only a list: read the list
        p = Paragraphs(lists)
        p.feed(content or '')
        p.close()
        paras = p.paras
        start = next((k for k, (_, italic) in enumerate(paras) if not italic), None)
        if start is not None:
            break
    else:
        return [], False
    first = paras[start][0]
    if len(first) >= 3:                       # line breaks inside the paragraph: verse
        units, total = [], 0
        for line in first:
            if units and total + len(line) > MAX_CHARS:
                break
            units.append(line)
            total += len(line)
        return units, True
    units, total = [], 0
    for lines, italic in paras[start:]:
        text = ' '.join(lines)
        if units and (italic or total >= MIN_CHARS):
            break
        text = cut(text, MAX_CHARS - total, first=not units)   # a long paragraph stops at a sentence end
        if not text:
            break
        units.append(text)
        total += len(text)
    return units, False


def passage_html(units):
    out, i = [], 0
    for u in units:
        words = []
        for w in u.split(' '):
            words.append(f'<span class="pw" style="--i: {i}">{html.escape(w, quote=False)}</span>')
            i += 1
        out.append('<span class="u">' + ' '.join(words) + '</span>')
    return '\n'.join(out)


def vol_html(numeral, title):
    return f'{VOL_ON}<b>{numeral}</b><span>{html.escape(title, quote=False)}</span></button>\n'


def pas_html(numeral, title, slug, units, verse):
    t = html.escape(title, quote=False)
    body = f'<p class="pas-t{" verse" if verse else ""}">{passage_html(units)}</p>' if units else ''
    more = 'Keep reading' if units else 'Read on Substack'
    return (f'{PAS_ON}<p class="lab pas-v">vol. {numeral} / {t}</p><div class="pas-b">{body}'
            f'<a class="lab more" href="{SUB}/p/{slug}" target="_blank" rel="noopener">{more}{ARROW}</a></div></div>\n')


def fetch(url):
    last = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'armghanahmad.com shelf updater (+https://armghanahmad.com)'})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except Exception as e:  # network errors and HTTP errors
            last = e
            time.sleep(20 * (attempt + 1))
    raise SystemExit(f'Could not read the Substack feed: {last}')


def feed_volumes(xml_bytes):
    ns = {'content': 'http://purl.org/rss/1.0/modules/content/'}
    vols = []
    for item in ET.fromstring(xml_bytes).iter('item'):
        title = (item.findtext('title') or '').strip()
        link = (item.findtext('link') or '').strip()
        m, s = TITLE.match(title), re.search(r'/p/([A-Za-z0-9-]+)', link)
        if not (m and s):
            print(f'skip (not a volume): {title!r}')
            continue
        num = int(m.group(1)) if m.group(1).isdigit() else from_roman(m.group(1))
        if num:
            vols.append((num, m.group(2), s.group(1), item.findtext('content:encoded', default='', namespaces=ns)))
    return vols


def update(page, vols):
    """Return (new page text, list of numerals added)."""
    for anchor in (SHELF_OPEN, READ_OPEN, VOL_ON, PAS_ON):
        if page.count(anchor) != 1:
            raise SystemExit(f'index.html does not have exactly one {anchor!r}. Nothing changed.')
    on_shelf = [from_roman(x) for x in re.findall(r'<button type="button" class="vol[^"]*"[^>]*><b>([^<]+)</b>', page)]
    slugs = set(re.findall(re.escape(SUB) + r'/p/([A-Za-z0-9-]+)"', page))
    newest = max(on_shelf)
    added = []
    for num, title, slug, content in sorted(vols):
        if num <= newest or slug in slugs or num in on_shelf:
            continue
        numeral = to_roman(num)
        units, verse = passage_units(content)
        page = page.replace(VOL_ON, VOL_OFF).replace(PAS_ON, PAS_OFF)
        page = page.replace(SHELF_OPEN, SHELF_OPEN + vol_html(numeral, title))
        page = page.replace(READ_OPEN, READ_OPEN + pas_html(numeral, title, slug, units, verse))
        on_shelf.append(num)
        slugs.add(slug)
        added.append(numeral)
        print(f'added vol. {numeral} / {title} ({sum(len(u) for u in units)} characters{", verse" if verse else ""})')
    n_vol = len(re.findall(r'<button type="button" class="vol[ "]', page))
    n_pas = len(re.findall(r'<div class="pas[ "]', page))
    if n_vol != n_pas or page.count(VOL_ON) != 1 or page.count(PAS_ON) != 1:
        raise SystemExit(f'Check failed after the change ({n_vol} volumes, {n_pas} passages). Nothing written.')
    return page, added


def main():
    feed_path = sys.argv[1] if len(sys.argv) > 1 else None      # a saved feed, for tests
    xml_bytes = open(feed_path, 'rb').read() if feed_path else fetch(FEED)
    page = open(PAGE, encoding='utf-8').read()
    new_page, added = update(page, feed_volumes(xml_bytes))
    if added:
        open(PAGE, 'w', encoding='utf-8', newline='').write(new_page)
    else:
        print('no new volumes')
    out = os.environ.get('GITHUB_OUTPUT')
    if out:
        with open(out, 'a', encoding='utf-8') as f:
            f.write(f'changed={"true" if added else "false"}\n')
            f.write('added=' + ', '.join('vol. ' + a for a in added) + '\n')


if __name__ == '__main__':
    main()
