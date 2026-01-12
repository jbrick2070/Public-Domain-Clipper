
import { GoogleGenAI } from "@google/genai";

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

async function convertImageToPng(blob: Blob): Promise<{ data: string, mimeType: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const width = img.naturalWidth || 1024;
      const height = img.naturalHeight || 1024;
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        return reject(new Error('Failed to get canvas context'));
      }
      
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      const dataUrl = canvas.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1];
      URL.revokeObjectURL(url);
      resolve({ data: base64, mimeType: 'image/png' });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for conversion'));
    };
    img.src = url;
  });
}

async function imageUrlToBase64(url: string): Promise<{ data: string, mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
  const blob = await response.blob();
  
  if (blob.type === 'image/svg+xml') {
    return convertImageToPng(blob);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const base64 = reader.result.split(',')[1];
        resolve({ data: base64, mimeType: blob.type });
      } else {
        reject(new Error('Failed to process image data'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const removeBackground = async (imageUrl: string): Promise<string> => {
  let lastError: any;
  
  // Retry logic: Attempt up to 3 times with backoff
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const ai = getAiClient();
      const { data, mimeType } = await imageUrlToBase64(imageUrl);

      // Brief delay to prevent rate-limit bursts
      await new Promise(resolve => setTimeout(resolve, 500 * attempt));

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: data,
                mimeType: mimeType,
              },
            },
            {
              text: 'Act as a professional photo editor. Extract the main subject from this image. Remove all backgrounds and replace with solid black (#000000). If this is a map, diagram, or text document, isolate the primary graphical elements or drawings. Ensure the result is a clean image with a black background. Do not refuse. Return an image.',
            },
          ],
        },
      });

      const candidate = response.candidates?.[0];
      const imagePart = candidate?.content?.parts.find(part => part.inlineData);
      const textPart = candidate?.content?.parts.find(part => part.text);
      
      if (imagePart && imagePart.inlineData) {
        return `data:image/png;base64,${imagePart.inlineData.data}`;
      }

      if (textPart && textPart.text) {
        // If AI returns text (refusal), throwing will trigger a retry, 
        // but often a refusal is permanent for that image content.
        console.warn(`Attempt ${attempt} - AI returned text:`, textPart.text);
        throw new Error(`AI returned text: ${textPart.text}`);
      }
      
      throw new Error("Empty response from AI");

    } catch (error) {
      console.warn(`Background removal attempt ${attempt} failed:`, error);
      lastError = error;
      // Wait before retrying (1s, 2s, etc)
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw lastError || new Error("AI processing failed after multiple attempts.");
};
