
export interface Cultivar {
  id: string;
  name: string;
  category: string;
  order: number;
  description: string;
}

export interface Topic {
  id: string;
  name: string;
  description: string; // Used for search term display or extra info
}

export interface ImageMetadata {
  title: string;
  url: string;
  descriptionUrl: string;
  license: string;
  attribution: string;
  thumbUrl: string;
  source: 'Wikimedia' | 'Internet Archive' | 'Library of Congress' | 'The Met' | 'Art Institute of Chicago';
  processedUrl?: string; 
  processing?: boolean;  
}

export interface TopicResult {
  topic: Topic;
  images: ImageMetadata[];
  status: 'loading' | 'success' | 'error';
}