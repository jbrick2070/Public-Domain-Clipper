import { ImageMetadata } from '../types';

/**
 * THE METROPOLITAN MUSEUM OF ART SEARCH
 * Endpoint: https://metmuseum.github.io/
 */
export const fetchMetImages = async (query: string, limit: number = 2): Promise<ImageMetadata[]> => {
  // We filter for objects that specifically have images and are in the public domain
  const searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encodeURIComponent(query)}&hasImages=true&isPublicDomain=true`;
  
  try {
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    if (!searchData.objectIDs || searchData.objectIDs.length === 0) return [];

    // Take top results. We limit this strictly because we must make a separate call for each object details
    const idsToFetch = searchData.objectIDs.slice(0, limit);
    
    const objectPromises = idsToFetch.map(async (id: number) => {
        try {
            const res = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
            return await res.json();
        } catch(e) { return null; }
    });

    const objects = await Promise.all(objectPromises);

    return objects.map((obj: any): ImageMetadata | null => {
        if (!obj || !obj.primaryImage) return null;
        return {
            title: obj.title || "Met Museum Object",
            url: obj.primaryImage,
            descriptionUrl: obj.objectURL,
            thumbUrl: obj.primaryImageSmall || obj.primaryImage,
            source: 'The Met',
            license: "Public Domain (CC0)",
            attribution: `${obj.artistDisplayName || 'Unknown Artist'} (${obj.objectDate || 'N/A'})`
        };
    }).filter((item): item is ImageMetadata => item !== null);

  } catch (e) {
    console.error("Met fetch failed", e);
    return [];
  }
};

/**
 * ART INSTITUTE OF CHICAGO SEARCH
 * Endpoint: https://api.artic.edu/docs/
 */
export const fetchAICImages = async (query: string, limit: number = 2): Promise<ImageMetadata[]> => {
  // Field filtering to reduce payload size
  const url = `https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(query)}&query[term][is_public_domain]=true&fields=id,title,image_id,artist_display,date_display&limit=${limit}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.data) return [];

    return data.data.map((item: any): ImageMetadata | null => {
        if (!item.image_id) return null;
        return {
            title: item.title,
            // Construct IIIF URL: https://www.artic.edu/iiif/2/{identifier}/full/{size}/0/default.jpg
            url: `https://www.artic.edu/iiif/2/${item.image_id}/full/843,/0/default.jpg`,
            thumbUrl: `https://www.artic.edu/iiif/2/${item.image_id}/full/400,/0/default.jpg`,
            descriptionUrl: `https://www.artic.edu/artworks/${item.id}`,
            source: 'Art Institute of Chicago',
            license: "Public Domain (CC0)",
            attribution: `${item.artist_display || 'Unknown'} (${item.date_display || 'N/A'})`
        };
    }).filter((item): item is ImageMetadata => item !== null);

  } catch (e) {
    console.error("AIC fetch failed", e);
    return [];
  }
};