
// Fix: Use the standard import for GoogleGenAI
import { GoogleGenAI, Type } from "@google/genai";
import { DeconstructedVideo, VideoScriptSegment } from "../types";

// Fix: Helper to ensure a fresh GoogleGenAI instance is used for each call
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeVideoAI = async (filename: string): Promise<DeconstructedVideo> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `假装你正在分析一个名为 "${filename}" 的爆款短视频。
    请提取它的:
    1. 结构公式 (例如: 痛点+产品+对比+促销)
    2. 分镜节奏 (例如: 2秒/镜头)
    3. 核心视觉元素 (例如: 文字+大箭头)
    4. 详细的分镜拆解 (4个分镜)`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          niche: { type: Type.STRING },
          formula_name: { type: Type.STRING },
          structure: { type: Type.STRING },
          pace: { type: Type.STRING },
          core_elements: { type: Type.STRING },
          segments: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.STRING },
                hook_type: { type: Type.STRING },
                visual_prompt: { type: Type.STRING },
                voiceover_text: { type: Type.STRING },
                retention_strategy: { type: Type.STRING },
              },
              required: ["time", "hook_type", "visual_prompt", "voiceover_text", "retention_strategy"]
            }
          }
        },
        required: ["title", "niche", "formula_name", "structure", "pace", "core_elements", "segments"]
      }
    }
  });

  // Fix: response.text is a property, not a method.
  const text = response.text || "{}";
  return JSON.parse(text);
};

export const generateVisualThumbnail = async (prompt: string): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Cinematic commercial shot for: ${prompt}, 4k, professional lighting` }] },
      config: { imageConfig: { aspectRatio: "9:16" } }
    });
    
    // Fix: Safely iterate through parts to find the image data
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
  } catch(e) {
    console.error("AI Image generation failed", e);
  }
  return `https://picsum.photos/400/711?random=${Math.random()}`;
};
