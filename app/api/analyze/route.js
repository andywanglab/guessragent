import { NextResponse } from "next/server";

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

    const authToken = process.env.ANTHROPIC_AUTH_TOKEN;
    const baseUrl = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

    if (!authToken) {
      return NextResponse.json(
        { error: "ANTHROPIC_AUTH_TOKEN not set in .env.local" },
        { status: 500 }
      );
    }

    // Build Claude messages from chat history
    const claudeMessages = messages.map((msg) => {
      if (msg.role === "user") {
        const content = [];
        if (msg.images && msg.images.length > 0) {
          for (const img of msg.images) {
            const match = img.match(/^data:(image\/[\w+]+);base64,(.+)$/);
            if (match) {
              content.push({
                type: "image",
                source: {
                  type: "base64",
                  media_type: match[1],
                  data: match[2],
                },
              });
            }
          }
        }
        if (msg.text) {
          content.push({ type: "text", text: msg.text });
        }
        return { role: "user", content };
      }
      return { role: "assistant", content: msg.text };
    });

    const res = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": authToken,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: claudeMessages,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      const errMsg = data.error?.message || JSON.stringify(data);
      console.error("Anthropic API error:", errMsg);
      return NextResponse.json({ error: errMsg }, { status: 500 });
    }

    const text = data.content
      ?.filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("") || "No response";

    return NextResponse.json({ text });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze image" },
      { status: 500 }
    );
  }
}
