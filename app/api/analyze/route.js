import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

const SYSTEM_PROMPT = `You are a world-class geolocation expert. When shown an image, analyze every visual clue to determine the location:

- Road signs, language, scripts
- Architecture style, building materials
- Vegetation, terrain, climate
- Vehicles, license plates, driving side
- Sun position, shadows
- Brand names, shop signs
- Road markings, infrastructure style
- Clothing, cultural indicators

Provide your best guess with:
1. **Location**: Your best guess (city, region, country)
2. **Coordinates**: Approximate lat/lng
3. **Confidence**: Low / Medium / High
4. **Clues**: List the visual clues you used
5. **Reasoning**: Brief explanation of your deduction

If the image is not a location/landscape photo, say so and still try to identify any location clues if present.`;

export async function POST(req) {
  try {
    const { messages } = await req.json();

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    // Build Gemini chat history (all messages except the last one)
    const history = [];
    for (let i = 0; i < messages.length - 1; i++) {
      const msg = messages[i];
      if (msg.role === "user") {
        const parts = [];
        if (msg.images && msg.images.length > 0) {
          for (const img of msg.images) {
            const match = img.match(/^data:(image\/\w+);base64,(.+)$/);
            if (match) {
              parts.push({
                inlineData: { mimeType: match[1], data: match[2] },
              });
            }
          }
        }
        if (msg.text) {
          parts.push({ text: msg.text });
        }
        history.push({ role: "user", parts });
      } else {
        history.push({ role: "model", parts: [{ text: msg.text }] });
      }
    }

    // Build the current message (last one)
    const lastMsg = messages[messages.length - 1];
    const currentParts = [];
    if (lastMsg.images && lastMsg.images.length > 0) {
      for (const img of lastMsg.images) {
        const match = img.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          currentParts.push({
            inlineData: { mimeType: match[1], data: match[2] },
          });
        }
      }
    }
    if (lastMsg.text) {
      currentParts.push({ text: lastMsg.text });
    }

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(currentParts);
    const text = result.response.text();

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze image" },
      { status: 500 }
    );
  }
}
