import fs from 'fs';
import * as child_process from 'child_process'; import fetch from 'node-fetch';
import { parse, HTMLElement } from 'node-html-parser';

export async function women(): Promise<void> {
  while (true) await woman();
}

const badPageREs = [
  /bands/,
  /conferences/,
  /football_clubs/,
  /football_teams/,
  /incidents/,
  /montes_on_Venus/,
  /oldest_people/,
  /organizations/,
  /promotions/,
];

async function woman(): Promise<void> {
  const listPath = await randomPath();
  // const listPath = '/wiki/List_of_France_women%27s_international_footballers';
  const listUrl: string = wikiPath2Url(listPath);
  open(listUrl);
  const page: HTMLElement = await pathPage(listPath);
  cleanPage(page);
  let names = firstFullList(page);
  const name = any(names);
  console.log(name);
  const url = nameUrl(name);
  console.log(url);
  open(url);
  await pause();
}

async function pathPage(path: string): Promise<HTMLElement> {
  const url = wikiPath2Url(path);
  console.log(url);
  const response = await fetch(url);
  const html = await response.text();

  return parse(html);
}

const wikiUrl = 'https://en.wikipedia.org';

function wikiPath2Url(path: string): string { return wikiUrl + path }

const googleImageUrl = 'https://www.google.com/search?tbm=isch&tbs=isz:l&q=';

function nameUrl(name: string): string {
  const quotedName = `%22${name}%22`;
  return googleImageUrl + quotedName;
}

/** Return the first non-empty list resulting from applying one of the `functions` to `args` else [] */

function firstFullList(page: HTMLElement): string[] {
  for (let f of [listItemAnchor, tableDataAnchor]) {
    const rawElements: HTMLElement[] = f.call(0, page);
    const names: string[] = rawElements.map(cleanElementText)
      .map(n => splitAtAnd(n)).flat()
      .filter(okName);
    if (names.length) return names;
  }
  return []; // todo throw new Error(`No names in ${page.text}`);
}

async function randomPath(): Promise<string> {
  const root = await pathPage('/wiki/Lists_of_women');
  const paths = root.querySelectorAll('a')
    .map(el => el.attributes.href)
    .filter(isListOfWomenPath);

    return any(paths);
}

// Some "Lists of women" are actaully lists of clubs, etc.

function isListOfWomenPath(path: string): boolean { return ! badPageREs.some(re => re.test(path)) }

// Extract Names ///////////////////////////////////////////////////////////////////////////////////////////////////////

// td(th = Name/Actress/Player) <a>NAME</a>

function tableDataAnchor(page: HTMLElement): HTMLElement[] {
  const tables = page.querySelectorAll('table');

  return tables.map(namesFromTable).flat();
}

// ul li <a>NAME</a>

function listItemAnchor(content: HTMLElement): HTMLElement[] {
  return content.querySelectorAll('li a:first-of-type');
}

// Miscellaneous ///////////////////////////////////////////////////////////////////////////////////////////////////////

/** Remove unwanted elements and everything from See_also on */

function cleanPage(content: HTMLElement) {
  [
    '.catlinks',
    '.external',
    '.mw-footer',
    '.navbox',
    '.sidebar',
    '.toc',
    '.vector-menu-content-list',
    // '.tocright',
  ]
    .forEach(selector => removeAll(content, selector));
  removeFromSeeAlsoOn(content);
}

function removeAll(content: HTMLElement, selector: string): void {
  const els = content.querySelectorAll(selector);
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

// Return any elements in `table` that are names

function namesFromTable(table: HTMLElement): HTMLElement[] {
  const selector = getSelectorForTable(table);

  return selector ? table.querySelectorAll(selector) : [];
}

// Return a CSS selector to extract name elements from `table` or undefined

function getSelectorForTable(table: HTMLElement): string | undefined {
  if (table.classNames.includes('infobox')) return 'tr:nth-child(1) th';

  const headers = table.querySelectorAll('th').map(h => h.text.replace('\n', ''));

  // /List_of_Playboy_Playmates_of_the_Month has tables
  // of year vs month/season with names in all <td>s

  if (headers.includes('January') || headers.includes('Winter'))
    return 'td';

  // List_of_France_women's_international_footballers
  // has names in <th><span><span><span><a>

  const cellTag = table.querySelector('tr:nth-child(2) th') ? 'th' : 'td';

  const columnIndex = nameIndex(headers);
  if (columnIndex < 0) return undefined;

  // :nth-child(n) counts from n = 1
  return `${cellTag}:nth-child(${columnIndex + 1})`;
}

const nameHeaders = ['Name', 'Player', 'Actress'];

// Return the index of the first of `headers` that is a name column header, else -1

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

async function pause() {
  process.stdout.write('Hit Enter to continue: ');
  const buffer = Buffer.alloc(1024);
  fs.readSync(process.stdin.fd, buffer);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

women();
