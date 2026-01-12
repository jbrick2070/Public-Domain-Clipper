
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
  const blob = await response.blob();
  
  if (blob.type === 'image/svg+xml') {
    return convertImageToPng(blob);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve({ data: base64, mimeType: blob.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const removeBackground = async (imageUrl: string): Promise<string> => {
  const ai = getAiClient();
  const { data, mimeType } = await imageUrlToBase64(imageUrl);

  await new Promise(resolve => setTimeout(resolve, 500));

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
          text: 'Act as a professional photo editor. Extract the main subject (ideally the fruit/bananas) from this image. Remove all backgrounds and replace with solid black (#000000). If this is a map or diagram and not a photo of a fruit, please try to extract the primary geographical features or the central diagram elements onto the black background instead. Your output MUST be an image.',
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
    console.warn("AI returned text instead of an image:", textPart.text);
    throw new Error(`AI was unable to process this image: ${textPart.text}`);
  }

  throw new Error("AI failed to return a valid image result for this specific file.");
};
