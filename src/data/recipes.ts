// Built-in recipe database — expandable via API integration later
export interface RecipeData {
  id: string;
  title: string;
  ingredients: string[];
  prepTime: number;
  servings: number;
  instructions: string[];
  tags: string[];
}

export const recipes: RecipeData[] = [
  {
    id: "1",
    title: "Quick Stir Fry",
    ingredients: ["chicken", "bell pepper", "onion", "soy sauce", "garlic", "rice", "oil"],
    prepTime: 20,
    servings: 4,
    instructions: [
      "Cook rice according to package directions.",
      "Slice chicken into thin strips and season with salt and pepper.",
      "Heat oil in a wok or large pan over high heat.",
      "Cook chicken until golden, about 5 minutes. Remove and set aside.",
      "Add sliced bell pepper, onion, and garlic. Stir fry for 3 minutes.",
      "Return chicken to pan, add soy sauce, and toss to combine.",
      "Serve over rice.",
    ],
    tags: ["quick", "dinner", "high-protein"],
  },
  {
    id: "2",
    title: "Pasta Primavera",
    ingredients: ["pasta", "zucchini", "tomato", "bell pepper", "onion", "garlic", "olive oil", "parmesan"],
    prepTime: 25,
    servings: 4,
    instructions: [
      "Cook pasta in salted boiling water until al dente.",
      "Dice all vegetables into bite-sized pieces.",
      "Heat olive oil in a large pan over medium-high heat.",
      "Sauté onion and garlic for 2 minutes.",
      "Add zucchini and bell pepper, cook for 5 minutes.",
      "Add diced tomatoes and cook for 3 more minutes.",
      "Toss with drained pasta and top with parmesan.",
    ],
    tags: ["vegetarian", "dinner", "pasta"],
  },
  {
    id: "3",
    title: "Egg Fried Rice",
    ingredients: ["rice", "egg", "soy sauce", "green onion", "garlic", "oil", "carrot"],
    prepTime: 15,
    servings: 2,
    instructions: [
      "Use day-old rice or cook and cool rice beforehand.",
      "Beat eggs in a small bowl.",
      "Heat oil in a wok over high heat.",
      "Scramble eggs quickly and break into small pieces.",
      "Add diced carrot and cook for 2 minutes.",
      "Add rice and stir fry for 3-4 minutes until slightly crispy.",
      "Add soy sauce and sliced green onion, toss and serve.",
    ],
    tags: ["quick", "lunch", "budget-friendly"],
  },
  {
    id: "4",
    title: "Greek Salad",
    ingredients: ["cucumber", "tomato", "red onion", "feta", "olive", "olive oil", "lemon"],
    prepTime: 10,
    servings: 2,
    instructions: [
      "Dice cucumber and tomatoes into chunks.",
      "Thinly slice red onion.",
      "Combine vegetables in a bowl with olives.",
      "Crumble feta cheese on top.",
      "Drizzle with olive oil and squeeze of lemon.",
      "Season with salt, pepper, and dried oregano.",
    ],
    tags: ["salad", "quick", "vegetarian", "healthy"],
  },
  {
    id: "5",
    title: "Banana Smoothie",
    ingredients: ["banana", "milk", "yogurt", "honey"],
    prepTime: 5,
    servings: 1,
    instructions: [
      "Peel and slice banana (frozen works great).",
      "Add banana, milk, yogurt, and honey to a blender.",
      "Blend until smooth.",
      "Pour into a glass and enjoy.",
    ],
    tags: ["breakfast", "snack", "quick", "healthy"],
  },
  {
    id: "6",
    title: "Chicken Caesar Wrap",
    ingredients: ["chicken", "lettuce", "parmesan", "tortilla", "caesar dressing", "croutons"],
    prepTime: 15,
    servings: 2,
    instructions: [
      "Cook or use leftover chicken, slice thinly.",
      "Chop lettuce and place on tortilla.",
      "Add chicken slices and parmesan.",
      "Drizzle with caesar dressing and add croutons.",
      "Roll tightly and slice in half.",
    ],
    tags: ["lunch", "quick", "wrap"],
  },
  {
    id: "7",
    title: "Tomato Soup",
    ingredients: ["tomato", "onion", "garlic", "butter", "cream", "basil"],
    prepTime: 30,
    servings: 4,
    instructions: [
      "Dice onion and mince garlic.",
      "Melt butter in a pot over medium heat.",
      "Sauté onion and garlic until soft, about 5 minutes.",
      "Add chopped tomatoes (or canned) and simmer for 15 minutes.",
      "Blend until smooth with an immersion blender.",
      "Stir in cream and fresh basil. Season to taste.",
    ],
    tags: ["soup", "comfort-food", "vegetarian"],
  },
  {
    id: "8",
    title: "Omelette",
    ingredients: ["egg", "cheese", "mushroom", "bell pepper", "onion", "butter"],
    prepTime: 10,
    servings: 1,
    instructions: [
      "Beat 3 eggs with a splash of milk, salt, and pepper.",
      "Dice mushroom, bell pepper, and onion finely.",
      "Melt butter in a non-stick pan over medium heat.",
      "Sauté vegetables for 2-3 minutes.",
      "Pour in eggs and let set for 1 minute.",
      "Add grated cheese, fold in half, and cook 1 more minute.",
    ],
    tags: ["breakfast", "quick", "high-protein"],
  },
  {
    id: "9",
    title: "Bean & Cheese Quesadilla",
    ingredients: ["tortilla", "beans", "cheese", "salsa", "sour cream"],
    prepTime: 10,
    servings: 2,
    instructions: [
      "Spread beans on half of each tortilla.",
      "Add grated cheese on top of beans.",
      "Fold tortilla in half.",
      "Cook in a dry pan over medium heat for 2-3 minutes per side.",
      "Cut into wedges and serve with salsa and sour cream.",
    ],
    tags: ["lunch", "quick", "vegetarian", "budget-friendly"],
  },
  {
    id: "10",
    title: "Salmon with Roasted Vegetables",
    ingredients: ["salmon", "broccoli", "carrot", "olive oil", "lemon", "garlic"],
    prepTime: 30,
    servings: 2,
    instructions: [
      "Preheat oven to 400°F (200°C).",
      "Cut broccoli into florets and slice carrots.",
      "Toss vegetables with olive oil, salt, and pepper on a baking sheet.",
      "Place salmon fillets alongside, drizzle with olive oil and lemon.",
      "Add minced garlic on top of salmon.",
      "Roast for 20-25 minutes until salmon is cooked through.",
    ],
    tags: ["dinner", "healthy", "high-protein"],
  },
  {
    id: "11",
    title: "Grilled Cheese Sandwich",
    ingredients: ["bread", "cheese", "butter"],
    prepTime: 10,
    servings: 1,
    instructions: [
      "Butter the outside of two slices of bread.",
      "Place cheese between the unbuttered sides.",
      "Cook in a pan over medium-low heat for 3-4 minutes per side.",
      "Press gently until cheese melts and bread is golden.",
    ],
    tags: ["lunch", "quick", "comfort-food", "budget-friendly"],
  },
  {
    id: "12",
    title: "Chicken & Rice Bowl",
    ingredients: ["chicken", "rice", "avocado", "beans", "corn", "lime", "cilantro"],
    prepTime: 25,
    servings: 2,
    instructions: [
      "Season chicken with cumin, chili powder, salt, and pepper.",
      "Cook chicken in a pan until done, then slice.",
      "Cook rice according to package directions.",
      "Warm beans and corn.",
      "Assemble bowls: rice, beans, corn, sliced chicken, diced avocado.",
      "Squeeze lime and sprinkle cilantro on top.",
    ],
    tags: ["dinner", "bowl", "high-protein"],
  },
];

// Fuzzy matching for ingredient names
function normalizeIngredient(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\b(fresh|frozen|canned|diced|sliced|chopped|minced|whole|organic|large|small|medium)\b/g, "")
    .trim();
}

export function findMatchingRecipes(
  pantryItems: string[],
  allRecipes: RecipeData[] = recipes
) {
  const normalizedPantry = pantryItems.map(normalizeIngredient);

  return allRecipes
    .map((recipe) => {
      const matched: string[] = [];
      const missing: string[] = [];

      recipe.ingredients.forEach((ingredient) => {
        const normalized = normalizeIngredient(ingredient);
        const isMatch = normalizedPantry.some(
          (item) => item.includes(normalized) || normalized.includes(item)
        );
        if (isMatch) {
          matched.push(ingredient);
        } else {
          missing.push(ingredient);
        }
      });

      return {
        ...recipe,
        matchedIngredients: matched,
        missingIngredients: missing,
        matchPercentage: Math.round(
          (matched.length / recipe.ingredients.length) * 100
        ),
      };
    })
    .filter((r) => r.matchPercentage > 0)
    .sort((a, b) => b.matchPercentage - a.matchPercentage);
}
