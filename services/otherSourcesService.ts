
import { ImageMetadata } from '../types';

/**
 * CLEVELAND MUSEUM OF ART API
 * Docs: https://openaccess-api.clevelandart.org/
 */
export const fetchClevelandImages = async (query: string, limit: number = 2): Promise<ImageMetadata[]> => {
  const url = `https://openaccess-api.clevelandart.org/api/artworks/?q=${encodeURIComponent(query)}&cc0=1&has_image=1&limit=${limit}`;

  try {
    const response = await fetch(url);
    const json = await response.json();
    
    if (!json.data || !Array.isArray(json.data)) return [];

    return json.data.map((item: any): ImageMetadata | null => {
      const imageUrl = item.images?.web?.url;
      if (!imageUrl) return null;

      return {
        title: item.title || "Untitled",
        url: imageUrl,
        descriptionUrl: item.url || `https://www.clevelandart.org/art/${item.id}`,
        thumbUrl: item.images?.print?.url || imageUrl,
        source: 'Cleveland Museum of Art',
        license: "Public Domain (CC0)",
        attribution: item.creators?.[0]?.description || item.creation_date || "Cleveland Museum of Art"
      };
    }).filter((item): item is ImageMetadata => item !== null);

  } catch (e) {
    console.error("Cleveland API fetch failed", e);
    return [];
  }
};

/**
 * NASA IMAGE AND VIDEO LIBRARY API
 * Docs: https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf
 */
export const fetchNasaImages = async (query: string, limit: number = 2): Promise<ImageMetadata[]> => {
  // NASA API returns 100 items by default, we slice the result manually.
  // "media_type=image" is required.
  const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=image`;

  try {
    const response = await fetch(url);
    const json = await response.json();

    if (!json.collection || !json.collection.items) return [];

    return json.collection.items.slice(0, limit).map((item: any): ImageMetadata | null => {
        const link = item.links?.[0]?.href; // Usually the thumbnail/preview
        const data = item.data?.[0];
        
        if (!link || !data) return null;

        // Try to construct a larger image URL if possible, otherwise use the preview
        // NASA previews often end in ~thumb.jpg. Original is usually different, but for this app, the 'href' is safe.
        // Often 'href' in links array is a medium sized jpg.
        
        return {
            title: data.title || "NASA Image",
            url: link, // We use the direct link provided in the search result for simplicity
            descriptionUrl: `https://images.nasa.gov/details/${data.nasa_id}`,
            thumbUrl: link,
            source: 'NASA',
            license: "Public Domain (US Gov)",
            attribution: data.photographer || data.center || "NASA"
        };
    }).filter((item): item is ImageMetadata => item !== null);

  } catch (e) {
     console.error("NASA API fetch failed", e);
     return [];
  }
};
