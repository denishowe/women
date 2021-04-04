import * as child_process from 'child_process'; import fetch from 'node-fetch';
import { parse, HTMLElement } from 'node-html-parser';

// "Lists of women" that aren't

const badPages = new Set([
  'all-female_bands',
  'incidents_of_violence_against_women',
  'montes_on_Venus',
  'the_verified_oldest_people#100_verified_oldest_women',
  'women%27s_association_football_clubs_in_England',
  'women%27s_conferences',
  'women%27s_organizations',
  'women%27s_wrestling_promotions_in_the_United_States',
]);

const googleImageUrl = 'https://www.google.com/search?tbm=isch&tbs=isz:l&q=';

export async function women(): Promise<void> {
  const listPath = await randomPath();
  console.log(listPath);
  const listUrl: string = wikiPath2Url(listPath);
  open(listUrl);
  const page: HTMLElement = await listPage(listPath);
  cleanPage(page);
  let names = firstFullList(page);
  console.log(names.length, 'names');
  // names.map(n => console.log(n));
  const name = any(names);
  console.log(name);
  const quotedName = `%22${name}%22`;
  const url = googleImageUrl + quotedName;
  console.log(url);
  open(url);
}

async function listPage(path: string): Promise<HTMLElement> {
  const url = wikiPath2Url(path);
  const html = await wikiUrlHtml(url);

  return parse(html);
}

/** Return the first non-empty list resulting from applying one of the `functions` to `args` else [] */

function firstFullList(page: HTMLElement): string[] {
  for (let f of [listItemAnchor, tableDataAnchor]) {
    const raw = f.call(0, page);
    console.log(f.name, '--> raw', raw.length);
    const clean = raw.map(cleanElementText)
      .map(n => splitAtAnd(n)).flat()
      .filter(okName);
    console.log(f.name, '--> clean', clean.length);
    if (clean.length) return clean;
  }
  throw new Error(`No names in ${page.text}`);
}

async function randomPath(): Promise<string> {
  // const path = '/wiki/List_of_Norwegian_consorts'; // tableDataAnchor - 1 column
  // const path = '/wiki/List_of_Lebanese_women_writers'; // listItemAnchor
  // const path = '/wiki/List_of_Playboy_Playmates_of_the_Month'; // table - years x months
  // const path = '/wiki/List_of_Playboy_Playmates_of_2017'; // infoboxes
  const url = wikiPath2Url('/wiki/Lists_of_women');
  const rootHtml = await wikiUrlHtml(url);
  const root = parse(rootHtml);
  const paths = root.querySelectorAll('a')
    .map(el => el.attributes.href)
    .filter(isListUrl)
    .filter(okPage);

    return any(paths);
}

function wikiPath2Url(path: string): string { return `https://en.wikipedia.org${path}` }

async function wikiUrlHtml(url: string): Promise<string> {
  console.log(url);
  const response = await fetch(url);
  return response.text();
}

function isListUrl(url: string) { return /\/wiki\/List_of_[^"]+/.test(url) }

function page2List(page: string): string { return page.replace('/wiki/List_of_', '') }

function okPage(page: string): boolean { return ! badPages.has(page2List(page)) }

// Extract Names ///////////////////////////////////////////////////////////////////////////////////////////////////////

/** td(th = Name/Actress/Player) <a>NAME</a>
 * https://en.wikipedia.org/wiki/List_of_Aquitanian_consorts
 * https://en.wikipedia.org/wiki/List_of_Best_Actress_winners_by_age
 * https://en.wikipedia.org/wiki/List_of_female_archivists
 * https://en.wikipedia.org/wiki/List_of_female_boxers
 * https://en.wikipedia.org/wiki/List_of_Polish_consorts
 * https://en.wikipedia.org/wiki/List_of_royal_consorts_of_Transylvania
 * https://en.wikipedia.org/wiki/List_of_Women%27s_National_Basketball_Association_season_rebounding_leaders
 */

function tableDataAnchor(page: HTMLElement): HTMLElement[] {
  return page.querySelectorAll('table')
    .map(namesFromTable).flat();
}

/** ul li <a>NAME</a>
 * Remove "(...)" after name
 * https://en.wikipedia.org/wiki/List_of_Chinese_women_artists
 * https://en.wikipedia.org/wiki/List_of_classic_female_blues_singers
 * https://en.wikipedia.org/wiki/List_of_female_composers_by_birth_date
 * https://en.wikipedia.org/wiki/List_of_Filipino_women_artists
 * https://en.wikipedia.org/wiki/List_of_Tunisian_women_writers
 */

function listItemAnchor(content: HTMLElement): HTMLElement[] {
  return content.querySelectorAll('li a:first-of-type');
}

// p <b>NAME</b> (born
// also
// table(class="infobox vcard") <th>NAME</th>
//  https://en.wikipedia.org/wiki/List_of_Playboy_Playmates_of_1961
//  https://en.wikipedia.org/wiki/List_of_Playboy_Playmates_of_2006

// table <td>NAME<br> all except 1st (year) column
// https://en.wikipedia.org/wiki/List_of_Miss_International_runners-up_and_finalists

// Miscellaneous ///////////////////////////////////////////////////////////////////////////////////////////////////////

/** Remove unwanted elements and everything from See_also on */

function cleanPage(content: HTMLElement) {
  [
    '.catlinks',
    '.mw-footer',
    '.navbox',
    '.toc',
    '.vector-menu-content-list',
    // '.tocright',
  ]
    .forEach(selector => removeAll(content, selector));
  removeFromSeeAlsoOn(content);
}

function removeAll(content: HTMLElement, selector: string): void {
  const els = content.querySelectorAll(selector);
  // console.log(els.length, 'matches for', selector);
  els ?. map(el => el.remove());
}

// Given an element, remove an h2 with child span#See_also and all later siblings of the h2

function removeFromSeeAlsoOn(page: HTMLElement): void {
  const h2s = page.querySelectorAll('h2');
  let el: HTMLElement = h2s.filter(isFooter)?.[0];
  while (el) {
    const next = el.nextElementSibling;
    el.remove();
    el = next;
  }
}

function isFooter(element: HTMLElement): boolean {
  return !! element.querySelector('span#See_also, span#Notes, span#References');
}

function namesFromTable(table: HTMLElement): HTMLElement[] {
  const selector = getSelector(table);
  return table.querySelectorAll(selector);
}

function getSelector(table: HTMLElement): string {
  if (table.classNames.includes('infobox')) return 'tr:nth-child(1) th';

  const headers = table.querySelectorAll('th').map(h => h.text.replace('\n', ''));

  // /List_of_Playboy_Playmates_of_the_Month has tables of year vs month/season with names in all <td>s
  if (headers.includes('January') || headers.includes('Winter'))
    return 'td';

  const columnNumber = nameIndex(headers) + 1;
  if (columnNumber) return `td:nth-child(${columnNumber})`;

  throw new Error(`No names in ${table}`);
}

// Return the index of the first of `headers` that is a name column header, else -1

const nameHeaders = ['Name', 'Player', 'Actress'];

function nameIndex(headers: string[]): number {
  return headers.findIndex(h => nameHeaders.includes(h));
}

function any<T>(array: Array<T>):T { return array[Math.floor(array.length * Math.random())] };

/** Return the text of `element` minus end space and any trailing "(...)" or title ", Duchess of ..." */

function cleanElementText(element: HTMLElement): string {
  return element.text
    .replace(/\n/g, '')
    .replace(/^\s+/, '')
    .replace(/\s*[([,].*/, '');
}

// Split text like "Mara Corday and Pat Sheehan" at the
// "and" if the strings on either side both contain spaces

function splitAtAnd(s: string): string[] {
  const m = s.match(/(\S+\s.+)\s+(?:and|&)\s+(\S+\s.+)/);
  return m ? m.slice(1) : [s];
}

function okName(name: string) {
  return name.length > 3 && name !== 'magazine was not published'
}

function open(url: string): void {
  child_process.spawn('start', ['""', `"${url}"`], { shell: true })
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

women();
