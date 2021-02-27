import fetch from 'node-fetch';
import { parse, HTMLElement } from 'node-html-parser';

export async function women(): Promise<void> {
  const page: HTMLElement = await fetchListPage();
  const names = listItemAnchor(page).filter(okName);
  names.forEach(n => console.log(n));
}

async function fetchListPage(): Promise<HTMLElement> {
  const path = '/wiki/List_of_female_composers_by_birth_date';
  // const path = await fetchRandomPath();
  const pathHtml = await fetchWikiPathHtml(path);

  return parse(pathHtml);
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

// .mw-content-ltr ul li <a>NAME</a>
// Ignore .tocright .navbox .catlinks .portlet
// Ignore everything after h2 with span#See_also
// Remove "(...)" after name
//  https://en.wikipedia.org/wiki/List_of_Chinese_women_artists
//  https://en.wikipedia.org/wiki/List_of_classic_female_blues_singers
//  https://en.wikipedia.org/wiki/List_of_female_composers_by_birth_date
//  https://en.wikipedia.org/wiki/List_of_Filipino_women_artists
//  https://en.wikipedia.org/wiki/List_of_Tunisian_women_writers

function listItemAnchor(page: HTMLElement): string[] {
  ['.toc', '.tocright', '.navbox'].forEach(selector => page.querySelector(selector)?.remove());
  removeFromSeeAlsoOn(page);
  const anchors: HTMLElement[] = page.querySelectorAll('.mw-content-ltr li a:first-of-type');

  return anchors.map(anchorText);
}

// table td(2nd=Name) <a>NAME</a>
//  https://en.wikipedia.org/wiki/List_of_Aquitanian_consorts
//  https://en.wikipedia.org/wiki/List_of_Polish_consorts
//  https://en.wikipedia.org/wiki/List_of_royal_consorts_of_Transylvania

// table td(1st=Name) <a>NAME</a>
//   https://en.wikipedia.org/wiki/List_of_female_archivists
//   https://en.wikipedia.org/wiki/List_of_female_boxers

// p <b>NAME</b> (born
// also
// table(class="infobox vcard") <th>NAME</th>
//  https://en.wikipedia.org/wiki/List_of_Playboy_Playmates_of_1961
//  https://en.wikipedia.org/wiki/List_of_Playboy_Playmates_of_2006

// table td(2nd=Player) <a>NAME</a>
//  https://en.wikipedia.org/wiki/List_of_Women%27s_National_Basketball_Association_season_rebounding_leaders

// <td>NAME<br>
// https://en.wikipedia.org/wiki/List_of_Miss_International_runners-up_and_finalists

// Miscellaneous ///////////////////////////////////////////////////////////////////////////////////////////////////////

function anchorText(anchor: HTMLElement): string { return cleanNameText(anchor.text) }

function any<T>(array: Array<T>):T { return array[Math.floor(array.length * Math.random())] };

/** Return `name` minus any trailing parenthesised text " (...)" or title ", Duchess of ..." */

function cleanNameText(name: string): string { return name.replace(/\s*[(,].*/, '') }

function okName(name: string) { return name.length > 3 }

// Given an element, remove an h2 with child span#See_also and all later siblings of the h2

function removeFromSeeAlsoOn(page: HTMLElement): void {
  const h2s = page.querySelectorAll('h2');
  let el: HTMLElement = h2s.filter(hasSeeAlsoSpan)?.[0];
  while (el) {
    const next = el.nextElementSibling;
    el.remove();
    el = next;
  }
}

function hasSeeAlsoSpan(element: HTMLElement): boolean {
  const seeAlso = element.querySelector('span#See_also');
  return !!seeAlso;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

women();
