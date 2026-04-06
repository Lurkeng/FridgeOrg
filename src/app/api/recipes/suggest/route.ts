import { NextRequest, NextResponse } from 'next/server';

export interface AIRecipe {
  id: string;
  title: string;
  matchedIngredients: string[];
  missingIngredients: string[];
  matchPercentage: number;
  prepTime: number;
  servings: number;
  instructions: string[];
  tags: string[];
  aiGenerated: true;
}

interface RequestBody {
  items: { name: string; category: string; expiry_date: string }[];
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set. Add it to your .env.local file.' },
      { status: 503 }
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { items } = body;
  if (!items?.length) {
    return NextResponse.json({ error: 'No items provided' }, { status: 400 });
  }

  // Build a concise inventory string, sorted soonest-expiring first
  const sorted = [...items].sort(
    (a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
  );

  const inventoryList = sorted
    .map((item) => {
      const daysLeft = Math.ceil(
        (new Date(item.expiry_date).getTime() - Date.now()) / 86400000
      );
      const urgency = daysLeft <= 0 ? ' ⚠️ EXPIRED' : daysLeft <= 3 ? ' ⚠️ expiring soon' : '';
      return `- ${item.name} (${item.category})${urgency}`;
    })
    .join('\n');

  const prompt = `You are a helpful cooking assistant. Based on the food inventory below, suggest 4 creative, practical recipes the user can make.

INVENTORY:
${inventoryList}

Rules:
- Prioritise recipes that use items marked as "expiring soon" or "EXPIRED"
- Each recipe must use at least 2 items from the inventory
- Keep recipes realistic for a home cook
- Vary the meal types (breakfast, lunch, dinner, snack)

Respond ONLY with a valid JSON array. No explanation, no markdown, no extra text. Schema:
[
  {
    "title": string,
    "matchedIngredients": string[],   // inventory items this recipe uses
    "missingIngredients": string[],   // ingredients needed but not in inventory
    "matchPercentage": number,        // 0-100, how many required ingredients are in inventory
    "prepTime": number,               // minutes
    "servings": number,
    "instructions": string[],         // 4-7 step-by-step strings
    "tags": string[]                  // e.g. ["quick", "vegetarian", "breakfast"]
  }
]`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return NextResponse.json(
        { error: 'Anthropic API request failed', detail: err },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text: string = data.content?.[0]?.text ?? '';

    // Parse JSON — strip any accidental markdown fences
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    let recipes: Omit<AIRecipe, 'id' | 'aiGenerated'>[];
    try {
      recipes = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse AI response as JSON:', text);
      return NextResponse.json(
        { error: 'AI returned malformed JSON', raw: text },
        { status: 502 }
      );
    }

    // Stamp each recipe with a stable id and aiGenerated flag
    const stamped: AIRecipe[] = recipes.map((r, i) => ({
      ...r,
      id: `ai-${Date.now()}-${i}`,
      aiGenerated: true,
    }));

    return NextResponse.json({ recipes: stamped });
  } catch (err) {
    console.error('Recipe suggest error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
