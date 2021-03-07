import fetch from 'node-fetch';
import { parse, HTMLElement } from 'node-html-parser';

export async function women(): Promise<void> {
  const page: HTMLElement = await fetchSomeListPage();
  cleanPage(page);
  const names = firstFullList(page).filter(okName);
  console.log(names.length, 'names', names.map(n => `"${n}"`));
}

async function fetchSomeListPage(): Promise<HTMLElement> {
  // const path = '/wiki/List_of_consorts_of_Bremen-Verden'; // listItemAnchor
  // const path = '/wiki/List_of_Norwegian_consorts'; // tableDataAnchor
  const path = '/wiki/List_of_Lebanese_women_writers';
  // const path = await fetchRandomPath();
  const html = await fetchWikiPathHtml(path);
  // console.log(html);

  return parse(html);
}

/** Return the first non-empty list resulting from applying one of the `functions` to `args` else [] */

function firstFullList(page: HTMLElement): string[] {
  for (let f of [listItemAnchor, tableDataAnchor]) {
    const result = f.call(0, page);
    // console.log(f.name, '-->', result.length);
    if (result.length) return result;
  }
  return [];
}

async function fetchRandomPath(): Promise<string> {
  const rootHtml = await fetchWikiPathHtml('/wiki/Lists_of_women');
  const root = parse(rootHtml);
  const paths = root.querySelectorAll('a')
    .map(el => el.attributes.href)
    .filter(isListUrl)
    .filter(okPage);

    return any(paths);
}

async function fetchWikiPathHtml(path: string): Promise<string> {
  const url = `https://en.wikipedia.org${path}`;
  console.log(url);
  const response = await fetch(url);
  return response.text();
}

function isListUrl(url: string) { return /\/wiki\/List_of_[^"]+/.test(url) }

// "Lists of women" that aren't

const badPages = new Set([
  '/wiki/List_of_incidents_of_violence_against_women',
  '/wiki/List_of_women%27s_association_football_clubs_in_England',
  '/wiki/List_of_women%27s_conferences',
  '/wiki/List_of_women%27s_organizations',
  '/wiki/List_of_women%27s_wrestling_promotions_in_the_United_States',
]);

function okPage(page: string): boolean { return ! badPages.has(page) }

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

function tableDataAnchor(page: HTMLElement): string[] {
  return page.querySelectorAll('table').map(namesFromTable).flat();
}

/** ul li <a>NAME</a>
 * Remove "(...)" after name
 * https://en.wikipedia.org/wiki/List_of_Chinese_women_artists
 * https://en.wikipedia.org/wiki/List_of_classic_female_blues_singers
 * https://en.wikipedia.org/wiki/List_of_female_composers_by_birth_date
 * https://en.wikipedia.org/wiki/List_of_Filipino_women_artists
 * https://en.wikipedia.org/wiki/List_of_Tunisian_women_writers
 */

function listItemAnchor(content: HTMLElement): string[] {
  return content
    .querySelectorAll('li a:first-of-type')
    .map(cleanElementText);
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
    // console.log('Remove', el.text);
    el.remove();
    el = next;
  }
}

function isFooter(element: HTMLElement): boolean {
  return !! element.querySelector('span#See_also, span#Notes');
}

function namesFromTable(table: HTMLElement): string[] {
  const headers = table.querySelectorAll('th').map(h => h.text.replace('\n', ''));
  const columnNumber = nameIndex(headers) + 1;
  if (columnNumber === 0) throw new Error(`No name in ${headers}`);
  const cells = table.querySelectorAll(`td:nth-child(${columnNumber})`);
  const names = cells.map(cleanElementText);
  // console.log('from table', names);
  return names;
}

// Return the index of the first of `headers` that is a name column header or -1

const nameHeaders = ['Name', 'Player', 'Actress'];

function nameIndex(headers: string[]): number {
  return headers.findIndex(h => nameHeaders.includes(h));
}

function any<T>(array: Array<T>):T { return array[Math.floor(array.length * Math.random())] };

/** Return the text of `element` minus end space and any trailing "(...)" or title ", Duchess of ..." */

function cleanElementText(element: HTMLElement): string {
  return element.text
    .replace(/^\s+/, '')
    .replace(/\n/, '')
    .replace(/\s*[([,].*/, '');
}

function okName(name: string) { return name.length > 3 }

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

women();
