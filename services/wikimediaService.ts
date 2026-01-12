
import { WIKIMEDIA_API } from '../constants';
import { ImageMetadata } from '../types';
import { fetchMetImages, fetchAICImages } from './museumService';

/**
 * WIKIMEDIA COMMONS SEARCH
 * Now uses generator=search to find files by keyword if strict category fails or for general search.
 */
export const fetchWikimediaImages = async (query: string, limit: number = 3): Promise<ImageMetadata[]> => {
  // Try to clean the query
  const cleanQuery = query.replace('Category:', '');
  
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrnamespace: '6', // File namespace
    gsrsearch: cleanQuery + ' filetype:bitmap', // Prefer images
    gsrlimit: limit.toString(),
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|thumburl',
    iiurlwidth: '400',
    format: 'json',
    origin: '*'
  });

  try {
    const response = await fetch(`${WIKIMEDIA_API}?${params.toString()}`);
    const data = await response.json();
    if (!data.query || !data.query.pages) return [];

    const pages = Object.values(data.query.pages);
    
    return pages.map((page: any): ImageMetadata | null => {
      const info = page.imageinfo?.[0];
      if (!info) return null;

      const meta = info.extmetadata;
      return {
        title: page.title.replace('File:', ''),
        url: info.url,
        descriptionUrl: info.descriptionurl,
        thumbUrl: info.thumburl,
        source: 'Wikimedia' as const,
        license: (meta?.LicenseShortName?.value || "Public Domain").replace(/<[^>]*>?/gm, ''),
        attribution: (meta?.Attribution?.value || meta?.Artist?.value || "Wikimedia Commons").replace(/<[^>]*>?/gm, '')
      };
    }).filter((d): d is ImageMetadata => d !== null);
  } catch (e) {
    console.error("Wiki fetch failed", e);
    return [];
  }
};

/**
 * LIBRARY OF CONGRESS SEARCH
 */
export const fetchLOCImages = async (query: string, limit: number = 2): Promise<ImageMetadata[]> => {
  const searchTerm = query.replace('Category:', '').replace(/_/g, ' ');
  const url = `https://www.loc.gov/photos/?q=${encodeURIComponent(searchTerm)}&fo=json&c=${limit}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!data.results) return [];

    return data.results.slice(0, limit).map((item: any) => ({
      title: item.title || "LOC Image",
      url: item.image_url?.[item.image_url.length - 1] || '',
      descriptionUrl: item.url ? `https://www.loc.gov${item.url}` : '',
      thumbUrl: item.image_url?.[0] || '',
      source: 'Library of Congress' as const,
      license: "Public Domain / No Known Restrictions",
      attribution: `Library of Congress, Call Number: ${item.call_number || 'N/A'}`
    })).filter((i: any) => i.url);
  } catch (e) {
    return [];
  }
};

/**
 * INTERNET ARCHIVE SEARCH
 */
export const fetchIAImages = async (query: string, limit: number = 2): Promise<ImageMetadata[]> => {
  const searchTerm = query.replace('Category:', '').replace(/_/g, ' ');
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchTerm)}+AND+mediatype:image&fl[]=identifier&fl[]=title&fl[]=description&rows=${limit}&output=json`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!data.response || !data.response.docs) return [];

    return data.response.docs.map((doc: any) => ({
      title: doc.title || "Internet Archive Item",
      url: `https://archive.org/download/${doc.identifier}/${doc.identifier}.jpg`, // Simplistic guess, but works for most IA image collections
      descriptionUrl: `https://archive.org/details/${doc.identifier}`,
      thumbUrl: `https://archive.org/services/img/${doc.identifier}`,
      source: 'Internet Archive' as const,
      license: "Public Domain / CC0",
      attribution: `Internet Archive: ${doc.identifier}`
    }));
  } catch (e) {
    return [];
  }
};

/**
 * AGGREGATED DISCOVERY
 */
export const getTopicImages = async (topicName: string): Promise<ImageMetadata[]> => {
  // Parallel fetch from all 5 sources
  const [wiki, loc, ia, met, aic] = await Promise.all([
    fetchWikimediaImages(topicName, 4),
    fetchLOCImages(topicName, 2),
    fetchIAImages(topicName, 2),
    fetchMetImages(topicName, 2),
    fetchAICImages(topicName, 2)
  ]);

  // Interleave results for diversity
  const result = [];
  const maxLength = Math.max(wiki.length, loc.length, ia.length, met.length, aic.length);
  
  for (let i = 0; i < maxLength; i++) {
    if (wiki[i]) result.push(wiki[i]);
    if (met[i]) result.push(met[i]); // Prioritize high quality museum scans
    if (aic[i]) result.push(aic[i]);
    if (loc[i]) result.push(loc[i]);
    if (ia[i]) result.push(ia[i]);
  }

  // Increased limit to accommodate new sources
  return result.slice(0, 12);
};
