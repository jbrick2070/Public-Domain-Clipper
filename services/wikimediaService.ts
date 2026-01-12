
import { WIKIMEDIA_API } from '../constants';
import { ImageMetadata } from '../types';
import { fetchMetImages, fetchAICImages } from './museumService';
import { GoogleGenAI } from "@google/genai";

// Initialize AI client for query optimization
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

/**
 * AI-POWERED QUERY OPTIMIZER
 * Expands a simple user term into specific archival search queries.
 */
const generateSmartQueries = async (topic: string): Promise<{ wiki: string, archive: string, museum: string }> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      config: { 
        responseMimeType: 'application/json' 
      },
      contents: {
        parts: [{
          text: `You are an expert visual archivist. The user is searching for "${topic}". 
          Generate 3 distinct, highly effective search phrases to find PUBLIC DOMAIN images suitable for collage/cutting out (isolated subjects, clear illustrations).
          
          1. "wiki": For Wikimedia Commons. Use scientific names if biological, or specific distinct terms. (e.g. "Musa acuminata" instead of "Banana").
          2. "archive": For Library of Congress/Internet Archive. Use historical terms, "engraving", "lithograph", "plate", or "vintage photograph".
          3. "museum": For Art Museums. Use "study", "drawing", "watercolor", "oil sketch", or specific art movements.
          
          Return JSON: { "wiki": "string", "archive": "string", "museum": "string" }`
        }]
      }
    });
    
    const text = response.text;
    if (text) {
      const json = JSON.parse(text);
      // Fallback if keys are missing
      return {
        wiki: json.wiki || topic,
        archive: json.archive || topic,
        museum: json.museum || topic
      };
    }
    throw new Error("No text returned from AI");
  } catch (e) {
    console.warn("Smart Query failed, using raw term:", e);
    return { wiki: topic, archive: topic, museum: topic };
  }
};

/**
 * WIKIMEDIA COMMONS SEARCH
 */
export const fetchWikimediaImages = async (query: string, limit: number = 3): Promise<ImageMetadata[]> => {
  const cleanQuery = query.replace('Category:', '');
  
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrnamespace: '6', // File namespace
    gsrsearch: `${cleanQuery} filetype:bitmap`, // Force bitmap
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
  // "mediatype:image" is crucial
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchTerm)}+AND+mediatype:image&fl[]=identifier&fl[]=title&fl[]=description&rows=${limit}&output=json`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!data.response || !data.response.docs) return [];

    return data.response.docs.map((doc: any) => ({
      title: doc.title || "Internet Archive Item",
      url: `https://archive.org/download/${doc.identifier}/${doc.identifier}.jpg`,
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
 * Now enhanced with AI Query Generation
 */
export const getTopicImages = async (topicName: string): Promise<ImageMetadata[]> => {
  
  // 1. Ask Gemini for better search terms for each specific archive type
  const smartQueries = await generateSmartQueries(topicName);
  
  console.log(`Smart Search for "${topicName}":`, smartQueries);

  // 2. Parallel fetch using the specialized queries
  const [wiki, loc, ia, met, aic] = await Promise.all([
    fetchWikimediaImages(smartQueries.wiki, 4),
    fetchLOCImages(smartQueries.archive, 2),
    fetchIAImages(smartQueries.archive, 2),
    fetchMetImages(smartQueries.museum, 2),
    fetchAICImages(smartQueries.museum, 2)
  ]);

  // 3. Interleave results
  const result = [];
  const maxLength = Math.max(wiki.length, loc.length, ia.length, met.length, aic.length);
  
  for (let i = 0; i < maxLength; i++) {
    if (wiki[i]) result.push(wiki[i]);
    if (met[i]) result.push(met[i]);
    if (aic[i]) result.push(aic[i]);
    if (loc[i]) result.push(loc[i]);
    if (ia[i]) result.push(ia[i]);
  }

  return result.slice(0, 12);
};
