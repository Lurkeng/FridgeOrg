/**
 * Smart shelf-life lookup system for common Norwegian grocery items.
 *
 * Covers 80+ items typically found at Rema 1000, Kiwi, Coop, and Meny.
 * Supports both Norwegian and English names with fuzzy matching.
 */

import type { FoodCategory, StorageLocation } from "@/types";

// ── Per-item shelf life (days) by storage location ─────────────────────────

interface ShelfLifeEntry {
  /** Norwegian and English aliases for matching */
  names: string[];
  category: FoodCategory;
  fridge?: number;
  freezer?: number;
  pantry?: number;
}

/**
 * Comprehensive shelf-life database.
 * Days are for *unopened* items stored correctly.
 * Sources: Matportalen.no, Mattilsynet guidelines, manufacturer labels.
 */
const SHELF_LIFE_DB: ShelfLifeEntry[] = [
  // ── Dairy ──────────────────────────────────────────────────────────────────
  { names: ["melk", "milk", "helmelk", "whole milk", "lettmelk", "skummet melk", "skim milk"],
    category: "dairy", fridge: 10, freezer: 90 },
  { names: ["fløte", "cream", "matfløte", "cooking cream", "kremfløte", "whipping cream"],
    category: "dairy", fridge: 14, freezer: 90 },
  { names: ["rømme", "sour cream", "lettrømme", "crème fraîche", "creme fraiche"],
    category: "dairy", fridge: 14 },
  { names: ["yoghurt", "yogurt", "skyr"],
    category: "dairy", fridge: 14, freezer: 60 },
  { names: ["smør", "butter", "meierismør"],
    category: "dairy", fridge: 30, freezer: 180 },
  { names: ["margarin", "margarine", "bremykt", "soft margarine"],
    category: "dairy", fridge: 60, freezer: 180 },
  { names: ["ost", "cheese", "gulost", "norvegia", "jarlsberg", "synnøve"],
    category: "dairy", fridge: 28, freezer: 120 },
  { names: ["brunost", "brown cheese", "fløtemysost", "gudbrandsdalsost", "ski queen"],
    category: "dairy", fridge: 60, freezer: 180 },
  { names: ["cottage cheese", "kesam"],
    category: "dairy", fridge: 10 },
  { names: ["mozzarella"],
    category: "dairy", fridge: 7, freezer: 90 },
  { names: ["feta", "fetaost"],
    category: "dairy", fridge: 14, freezer: 90 },
  { names: ["parmesan", "parmigiano", "parmesan cheese"],
    category: "dairy", fridge: 42, freezer: 180 },
  { names: ["egg", "eggs", "frittgående egg", "økologisk egg"],
    category: "dairy", fridge: 28 },
  { names: ["riskrem", "pudding", "rislunsj"],
    category: "dairy", fridge: 7 },

  // ── Meat ───────────────────────────────────────────────────────────────────
  { names: ["kjøttdeig", "minced meat", "ground beef", "karbonadedeig"],
    category: "meat", fridge: 3, freezer: 90 },
  { names: ["biff", "beef", "entrecôte", "entrecote", "ytrefilet", "indrefilet", "beef steak"],
    category: "meat", fridge: 4, freezer: 180 },
  { names: ["svinekjøtt", "pork", "svinekoteletter", "pork chops", "svinenakke", "pork neck"],
    category: "meat", fridge: 4, freezer: 180 },
  { names: ["bacon"],
    category: "meat", fridge: 7, freezer: 90 },
  { names: ["pølse", "pølser", "sausage", "sausages", "grillpølse", "wiener", "wienerpølse"],
    category: "meat", fridge: 7, freezer: 90 },
  { names: ["skinke", "ham", "kokt skinke", "cooked ham"],
    category: "meat", fridge: 7, freezer: 60 },
  { names: ["salami", "pepperoni"],
    category: "meat", fridge: 21, freezer: 90 },
  { names: ["leverpostei", "liver pâté", "liver paste"],
    category: "meat", fridge: 7 },
  { names: ["lam", "lamb", "lammekjøtt", "lammekoteletter", "lamb chops"],
    category: "meat", fridge: 4, freezer: 180 },
  { names: ["ribbe", "pork ribs", "pinnekjøtt"],
    category: "meat", fridge: 5, freezer: 270 },
  { names: ["kjøttpålegg", "deli meat", "pålegg", "spekeskinke", "spekemat"],
    category: "meat", fridge: 7, freezer: 60 },
  { names: ["medisterkake", "medisterpølse", "meatballs", "kjøttkaker", "meat cakes"],
    category: "meat", fridge: 4, freezer: 90 },

  // ── Poultry ────────────────────────────────────────────────────────────────
  { names: ["kylling", "chicken", "kyllingfilet", "chicken breast", "kyllingbryst"],
    category: "poultry", fridge: 3, freezer: 270 },
  { names: ["kyllinglår", "chicken thigh", "chicken thighs", "kyllingvinger", "chicken wings"],
    category: "poultry", fridge: 3, freezer: 270 },
  { names: ["kalkun", "turkey", "kalkunfilet", "turkey breast"],
    category: "poultry", fridge: 3, freezer: 270 },
  { names: ["and", "duck", "andebryst", "duck breast"],
    category: "poultry", fridge: 3, freezer: 180 },
  { names: ["kyllingkjøttdeig", "chicken mince", "minced chicken"],
    category: "poultry", fridge: 2, freezer: 90 },

  // ── Seafood ────────────────────────────────────────────────────────────────
  { names: ["laks", "salmon", "laksefilet", "salmon fillet", "røkelaks", "smoked salmon"],
    category: "seafood", fridge: 3, freezer: 180 },
  { names: ["torsk", "cod", "torskefilet", "cod fillet", "skrei"],
    category: "seafood", fridge: 2, freezer: 180 },
  { names: ["sei", "saithe", "seifilet", "coalfish"],
    category: "seafood", fridge: 2, freezer: 180 },
  { names: ["reker", "shrimp", "prawns", "reke"],
    category: "seafood", fridge: 2, freezer: 120 },
  { names: ["makrell", "mackerel", "makrellfilet"],
    category: "seafood", fridge: 2, freezer: 90 },
  { names: ["ørret", "trout", "ørretfilet", "trout fillet"],
    category: "seafood", fridge: 2, freezer: 180 },
  { names: ["tunfisk", "tuna", "tunfisk på boks", "canned tuna"],
    category: "seafood", fridge: 3, freezer: 90, pantry: 730 },
  { names: ["fiskekaker", "fish cakes", "fiskepinner", "fish sticks", "fiskeboller", "fish balls"],
    category: "seafood", fridge: 5, freezer: 90 },
  { names: ["sild", "herring", "ansjos", "anchovies"],
    category: "seafood", fridge: 5, pantry: 365 },
  { names: ["krabbe", "crab", "hummer", "lobster"],
    category: "seafood", fridge: 2, freezer: 90 },

  // ── Produce — Vegetables ───────────────────────────────────────────────────
  { names: ["poteter", "potato", "potatoes", "potet"],
    category: "produce", pantry: 21, fridge: 28, freezer: 240 },
  { names: ["gulrot", "gulrøtter", "carrot", "carrots"],
    category: "produce", fridge: 21, freezer: 240 },
  { names: ["løk", "onion", "onions", "rødløk", "red onion"],
    category: "produce", pantry: 30, fridge: 30 },
  { names: ["hvitløk", "garlic"],
    category: "produce", pantry: 60, fridge: 60 },
  { names: ["brokkoli", "broccoli"],
    category: "produce", fridge: 7, freezer: 240 },
  { names: ["blomkål", "cauliflower"],
    category: "produce", fridge: 7, freezer: 240 },
  { names: ["paprika", "bell pepper", "pepper", "rød paprika", "gul paprika"],
    category: "produce", fridge: 10 },
  { names: ["tomat", "tomater", "tomato", "tomatoes", "cherry tomater", "cherry tomatoes"],
    category: "produce", fridge: 7 },
  { names: ["agurk", "cucumber"],
    category: "produce", fridge: 7 },
  { names: ["salat", "lettuce", "isbergsalat", "iceberg lettuce", "romaine", "ruccola"],
    category: "produce", fridge: 5 },
  { names: ["spinat", "spinach"],
    category: "produce", fridge: 5, freezer: 240 },
  { names: ["sopp", "mushroom", "mushrooms", "sjampinjong", "champignon"],
    category: "produce", fridge: 5 },
  { names: ["mais", "corn", "maiskolbe", "corn cob"],
    category: "produce", fridge: 5, freezer: 240, pantry: 730 },
  { names: ["erter", "peas", "grønne erter"],
    category: "produce", fridge: 5, freezer: 240, pantry: 730 },
  { names: ["bønner", "beans", "grønne bønner", "green beans", "kidneybønner"],
    category: "produce", fridge: 5, freezer: 240, pantry: 730 },
  { names: ["avokado", "avocado"],
    category: "produce", fridge: 5, pantry: 3 },
  { names: ["squash", "zucchini", "courgette"],
    category: "produce", fridge: 7 },
  { names: ["selleri", "celery"],
    category: "produce", fridge: 14 },
  { names: ["kål", "cabbage", "rødkål", "red cabbage", "surkål", "sauerkraut"],
    category: "produce", fridge: 14, freezer: 180 },

  // ── Produce — Fruits ───────────────────────────────────────────────────────
  { names: ["epler", "eple", "apple", "apples"],
    category: "produce", fridge: 28, pantry: 7 },
  { names: ["banan", "bananer", "banana", "bananas"],
    category: "produce", pantry: 5, freezer: 60 },
  { names: ["appelsin", "appelsiner", "orange", "oranges"],
    category: "produce", fridge: 21, pantry: 7 },
  { names: ["sitron", "lemon", "lemons", "lime"],
    category: "produce", fridge: 21 },
  { names: ["jordbær", "strawberry", "strawberries"],
    category: "produce", fridge: 4, freezer: 240 },
  { names: ["blåbær", "blueberry", "blueberries"],
    category: "produce", fridge: 7, freezer: 240 },
  { names: ["bringebær", "raspberry", "raspberries"],
    category: "produce", fridge: 3, freezer: 240 },
  { names: ["druer", "grapes"],
    category: "produce", fridge: 7 },
  { names: ["vannmelon", "watermelon", "melon"],
    category: "produce", fridge: 5 },
  { names: ["pære", "pærer", "pear", "pears"],
    category: "produce", fridge: 7, pantry: 4 },
  { names: ["kiwi fruit", "kiwifrukt"],
    category: "produce", fridge: 14, pantry: 5 },
  { names: ["mango"],
    category: "produce", fridge: 5, pantry: 3 },
  { names: ["ananas", "pineapple"],
    category: "produce", fridge: 5 },

  // ── Grains & Bakery ────────────────────────────────────────────────────────
  { names: ["brød", "bread", "grovbrød", "whole wheat bread", "kneippbrød", "loff"],
    category: "grains", pantry: 5, fridge: 7, freezer: 90 },
  { names: ["knekkebrød", "crispbread", "wasa", "kavring"],
    category: "grains", pantry: 180 },
  { names: ["pasta", "spaghetti", "penne", "makaroni", "fusilli"],
    category: "grains", pantry: 730 },
  { names: ["ris", "rice", "jasminris", "basmatiris", "fullkornsris"],
    category: "grains", pantry: 730, freezer: 365 },
  { names: ["havregryn", "oats", "oatmeal", "grøt"],
    category: "grains", pantry: 365 },
  { names: ["müsli", "musli", "muesli", "granola"],
    category: "grains", pantry: 180 },
  { names: ["mel", "flour", "hvetemel", "wheat flour", "sammalt mel"],
    category: "grains", pantry: 365 },
  { names: ["tortilla", "tortillas", "wraps", "lompe", "lomper", "lefse"],
    category: "grains", pantry: 14, fridge: 21, freezer: 90 },
  { names: ["rundstykker", "rolls", "boller", "buns"],
    category: "grains", pantry: 3, freezer: 90 },
  { names: ["pizza", "frossenpizza", "frozen pizza", "grandiosa"],
    category: "grains", freezer: 180, fridge: 3 },
  { names: ["nudler", "noodles", "ramen", "mr lee"],
    category: "grains", pantry: 365 },

  // ── Beverages ──────────────────────────────────────────────────────────────
  { names: ["juice", "appelsinjuice", "orange juice", "eplejuice", "apple juice"],
    category: "beverages", fridge: 10, pantry: 180 },
  { names: ["brus", "soda", "cola", "coca-cola", "pepsi", "fanta", "solo"],
    category: "beverages", pantry: 270, fridge: 270 },
  { names: ["vann", "water", "mineralvann", "sparkling water", "farris", "imsdal"],
    category: "beverages", pantry: 365 },
  { names: ["øl", "beer", "pils"],
    category: "beverages", fridge: 180, pantry: 180 },
  { names: ["vin", "wine", "rødvin", "hvitvin", "red wine", "white wine"],
    category: "beverages", pantry: 730, fridge: 5 },
  { names: ["kaffe", "coffee", "espresso"],
    category: "beverages", pantry: 365, freezer: 365 },
  { names: ["te", "tea", "grønn te", "green tea"],
    category: "beverages", pantry: 730 },
  { names: ["havremelk", "oat milk", "soyamelk", "soy milk", "mandelmelk", "almond milk"],
    category: "beverages", fridge: 10, pantry: 180 },

  // ── Condiments & Sauces ────────────────────────────────────────────────────
  { names: ["ketchup", "tomatketchup"],
    category: "condiments", fridge: 180, pantry: 365 },
  { names: ["sennep", "mustard"],
    category: "condiments", fridge: 365, pantry: 365 },
  { names: ["majones", "mayonnaise", "mayo"],
    category: "condiments", fridge: 90 },
  { names: ["soyasaus", "soy sauce"],
    category: "condiments", pantry: 730, fridge: 730 },
  { names: ["olivenolje", "olive oil", "rapsolje", "canola oil", "matolje", "cooking oil"],
    category: "condiments", pantry: 365 },
  { names: ["eddik", "vinegar", "balsamico", "balsamic vinegar"],
    category: "condiments", pantry: 730 },
  { names: ["syltetøy", "jam", "marmelade"],
    category: "condiments", fridge: 90, pantry: 365 },
  { names: ["honning", "honey"],
    category: "condiments", pantry: 730 },
  { names: ["peanøttsmør", "peanut butter", "nøttesmør"],
    category: "condiments", pantry: 180, fridge: 180 },
  { names: ["saus", "sauce", "pastasaus", "pasta sauce", "tomatsaus", "tomato sauce"],
    category: "condiments", fridge: 5, pantry: 365 },
  { names: ["pesto"],
    category: "condiments", fridge: 7, pantry: 365 },
  { names: ["remulade", "remoulade"],
    category: "condiments", fridge: 90 },
  { names: ["dressing", "salatdressing", "salad dressing"],
    category: "condiments", fridge: 60 },
  { names: ["taco kryddermix", "taco seasoning", "tacosaus", "taco sauce", "salsa"],
    category: "condiments", fridge: 14, pantry: 365 },

  // ── Frozen Meals ───────────────────────────────────────────────────────────
  { names: ["frossenmiddag", "frozen dinner", "ferdigrett", "ready meal", "findus"],
    category: "frozen_meals", freezer: 180 },
  { names: ["frossen grønnsaker", "frozen vegetables", "frossen grønnsaksblanding"],
    category: "frozen_meals", freezer: 240 },
  { names: ["is", "iskrem", "ice cream"],
    category: "frozen_meals", freezer: 120 },
  { names: ["frosne bær", "frozen berries", "frosne jordbær", "frozen strawberries"],
    category: "frozen_meals", freezer: 240 },

  // ── Snacks ─────────────────────────────────────────────────────────────────
  { names: ["chips", "potetgull", "potato chips", "sørlandschips"],
    category: "snacks", pantry: 90 },
  { names: ["sjokolade", "chocolate", "freia", "kvikk lunsj", "melkesjokolade"],
    category: "snacks", pantry: 365 },
  { names: ["nøtter", "nuts", "peanøtter", "peanuts", "cashew", "mandler", "almonds"],
    category: "snacks", pantry: 180 },
  { names: ["kjeks", "cookies", "biscuits", "digestive"],
    category: "snacks", pantry: 180 },
  { names: ["popcorn", "popkorn"],
    category: "snacks", pantry: 180 },
  { names: ["tørrfrukt", "dried fruit", "rosiner", "raisins"],
    category: "snacks", pantry: 180 },

  // ── Leftovers ──────────────────────────────────────────────────────────────
  { names: ["rester", "leftovers", "middagsrester", "dinner leftovers"],
    category: "leftovers", fridge: 4, freezer: 90 },

  // ── Other / Pantry staples ─────────────────────────────────────────────────
  { names: ["sukker", "sugar"],
    category: "other", pantry: 730 },
  { names: ["salt"],
    category: "other", pantry: 1825 },
  { names: ["gjær", "yeast", "tørrgjær", "dry yeast"],
    category: "other", fridge: 14, pantry: 365 },
  { names: ["bakepulver", "baking powder"],
    category: "other", pantry: 365 },
  { names: ["hermetikk", "canned food", "hermetiske tomater", "canned tomatoes", "boks tomater"],
    category: "other", pantry: 730 },
  { names: ["kokosmjølk", "kokosmelk", "coconut milk"],
    category: "other", pantry: 730, fridge: 5 },
  { names: ["tofu"],
    category: "other", fridge: 7, freezer: 150 },
];

// ── Pre-built lookup index ─────────────────────────────────────────────────

/**
 * Flat map of lowercase name -> ShelfLifeEntry for O(1) exact lookups.
 */
const NAME_INDEX = new Map<string, ShelfLifeEntry>();
for (const entry of SHELF_LIFE_DB) {
  for (const name of entry.names) {
    NAME_INDEX.set(name.toLowerCase(), entry);
  }
}

// ── Exported lookup map (category+location -> days) ────────────────────────

/**
 * Category + location defaults used as a final fallback when no item-level
 * match is found. Keys are `${category}:${location}`.
 */
export const SHELF_LIFE_DEFAULTS: Map<string, number> = new Map([
  // Dairy
  ["dairy:fridge", 14],
  ["dairy:freezer", 90],
  ["dairy:pantry", 180],
  // Meat
  ["meat:fridge", 4],
  ["meat:freezer", 180],
  ["meat:pantry", 1],
  // Poultry
  ["poultry:fridge", 3],
  ["poultry:freezer", 270],
  ["poultry:pantry", 1],
  // Seafood
  ["seafood:fridge", 2],
  ["seafood:freezer", 180],
  ["seafood:pantry", 365],
  // Produce
  ["produce:fridge", 7],
  ["produce:freezer", 240],
  ["produce:pantry", 7],
  // Grains
  ["grains:fridge", 7],
  ["grains:freezer", 180],
  ["grains:pantry", 180],
  // Beverages
  ["beverages:fridge", 14],
  ["beverages:freezer", 365],
  ["beverages:pantry", 365],
  // Condiments
  ["condiments:fridge", 90],
  ["condiments:freezer", 365],
  ["condiments:pantry", 365],
  // Leftovers
  ["leftovers:fridge", 4],
  ["leftovers:freezer", 90],
  ["leftovers:pantry", 1],
  // Frozen meals
  ["frozen_meals:fridge", 3],
  ["frozen_meals:freezer", 180],
  ["frozen_meals:pantry", 1],
  // Snacks
  ["snacks:fridge", 14],
  ["snacks:freezer", 180],
  ["snacks:pantry", 90],
  // Other
  ["other:fridge", 7],
  ["other:freezer", 90],
  ["other:pantry", 30],
]);

// ── Category detection ─────────────────────────────────────────────────────

/**
 * Keyword -> FoodCategory mapping used by `getDefaultCategory`.
 * Order matters: first match wins, so more specific keywords come first.
 */
const CATEGORY_KEYWORDS: [string[], FoodCategory][] = [
  // Dairy
  [["melk", "milk", "fløte", "cream", "rømme", "sour cream", "yoghurt", "yogurt",
    "skyr", "smør", "butter", "margarin", "ost", "cheese", "brunost", "brown cheese",
    "mozzarella", "feta", "parmesan", "egg", "cottage cheese", "kesam",
    "pudding", "riskrem"], "dairy"],
  // Poultry (before meat — more specific)
  [["kylling", "chicken", "kalkun", "turkey", "and", "duck", "høne", "hen"], "poultry"],
  // Seafood
  [["laks", "salmon", "torsk", "cod", "sei", "saithe", "reker", "shrimp", "prawns",
    "fisk", "fish", "makrell", "mackerel", "ørret", "trout", "tunfisk", "tuna",
    "sild", "herring", "krabbe", "crab", "hummer", "lobster", "skrei",
    "fiskekaker", "fiskepinner", "fiskeboller"], "seafood"],
  // Meat
  [["kjøtt", "meat", "biff", "beef", "svin", "pork", "bacon", "pølse", "sausage",
    "skinke", "ham", "salami", "pepperoni", "leverpostei", "lam", "lamb",
    "ribbe", "pinnekjøtt", "pålegg", "deli", "speke", "medister",
    "kjøttkaker", "meatball", "karbonadedeig", "kjøttdeig", "minced",
    "ground beef", "entrecôte", "entrecote", "indrefilet", "ytrefilet"], "meat"],
  // Produce
  [["potet", "potato", "gulrot", "carrot", "løk", "onion", "hvitløk", "garlic",
    "brokkoli", "broccoli", "blomkål", "cauliflower", "paprika", "pepper",
    "tomat", "tomato", "agurk", "cucumber", "salat", "lettuce", "spinat", "spinach",
    "sopp", "mushroom", "mais", "corn", "erter", "peas", "bønner", "beans",
    "avokado", "avocado", "squash", "zucchini", "selleri", "celery", "kål", "cabbage",
    "eple", "apple", "banan", "banana", "appelsin", "orange",
    "sitron", "lemon", "lime", "jordbær", "strawberry", "blåbær", "blueberry",
    "bringebær", "raspberry", "druer", "grape", "melon", "pære", "pear",
    "mango", "ananas", "pineapple", "frukt", "fruit", "grønnsak", "vegetable",
    "bær", "berries", "kiwifrukt"], "produce"],
  // Grains
  [["brød", "bread", "knekkebrød", "crispbread", "pasta", "spaghetti", "penne",
    "makaroni", "fusilli", "ris", "rice", "havregryn", "oats", "oatmeal", "grøt",
    "müsli", "musli", "muesli", "granola", "mel", "flour", "tortilla", "wraps",
    "lompe", "lefse", "rundstykker", "rolls", "boller", "buns", "pizza",
    "grandiosa", "nudler", "noodles", "ramen", "kavring", "wasa", "loff"], "grains"],
  // Beverages
  [["juice", "brus", "soda", "cola", "pepsi", "fanta", "solo", "vann", "water",
    "farris", "imsdal", "øl", "beer", "vin", "wine", "kaffe", "coffee",
    "te", "tea", "havremelk", "oat milk", "soyamelk", "soy milk",
    "mandelmelk", "almond milk", "drikke", "drink"], "beverages"],
  // Condiments
  [["ketchup", "sennep", "mustard", "majones", "mayo", "soyasaus", "soy sauce",
    "olje", "oil", "eddik", "vinegar", "balsamico", "syltetøy", "jam",
    "honning", "honey", "peanøttsmør", "peanut butter", "saus", "sauce",
    "pesto", "remulade", "dressing", "salsa", "kryddermix", "seasoning",
    "krydder", "spice"], "condiments"],
  // Frozen meals
  [["frossenmiddag", "frozen dinner", "ferdigrett", "ready meal", "findus",
    "frossen grønnsak", "frozen vegetable", "iskrem", "ice cream",
    "frosne bær", "frozen berries"], "frozen_meals"],
  // Snacks
  [["chips", "potetgull", "sjokolade", "chocolate", "nøtter", "nuts",
    "peanøtter", "peanuts", "cashew", "mandler", "almonds", "kjeks",
    "cookies", "biscuits", "popcorn", "popkorn", "tørrfrukt", "dried fruit",
    "rosiner", "raisins", "godteri", "candy", "snacks", "kvikk lunsj",
    "digestive", "freia"], "snacks"],
  // Leftovers
  [["rester", "leftovers", "middagsrester"], "leftovers"],
];

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Look up the default shelf life in days for an item.
 *
 * Resolution order:
 * 1. Exact name match in SHELF_LIFE_DB (case-insensitive)
 * 2. Fuzzy/partial name match in SHELF_LIFE_DB
 * 3. Category + location default from SHELF_LIFE_DEFAULTS
 * 4. Hard-coded fallback (7 days)
 */
export function getDefaultShelfLife(
  name: string,
  category: FoodCategory,
  location: StorageLocation,
): number {
  const normalized = name.toLowerCase().trim();

  // 1. Exact match
  const exact = NAME_INDEX.get(normalized);
  if (exact) {
    const days = exact[location];
    if (days != null) return days;
    // Item exists but not for this location — pick closest available
    const fallback = exact.fridge ?? exact.pantry ?? exact.freezer;
    if (fallback != null) return fallback;
  }

  // 2. Fuzzy / partial match — try to find any entry whose name is
  //    contained in the query, or whose query is contained in the name.
  for (const entry of SHELF_LIFE_DB) {
    for (const alias of entry.names) {
      const lowerAlias = alias.toLowerCase();
      if (normalized.includes(lowerAlias) || lowerAlias.includes(normalized)) {
        const days = entry[location];
        if (days != null) return days;
        const fallback = entry.fridge ?? entry.pantry ?? entry.freezer;
        if (fallback != null) return fallback;
      }
    }
  }

  // 3. Category + location default
  const catDefault = SHELF_LIFE_DEFAULTS.get(`${category}:${location}`);
  if (catDefault != null) return catDefault;

  // 4. Hard-coded fallback
  return 7;
}

/**
 * Guess the `FoodCategory` from a free-text item name.
 *
 * Returns `null` when no keyword matches.
 */
export function getDefaultCategory(name: string): FoodCategory | null {
  const normalized = name.toLowerCase().trim();

  // First try the exact name index — highest confidence
  const exact = NAME_INDEX.get(normalized);
  if (exact) return exact.category;

  // Then try partial/substring matching against the name index
  for (const [key, entry] of NAME_INDEX) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return entry.category;
    }
  }

  // Finally fall back to keyword matching
  for (const [keywords, category] of CATEGORY_KEYWORDS) {
    for (const kw of keywords) {
      if (normalized.includes(kw) || kw.includes(normalized)) {
        return category;
      }
    }
  }

  return null;
}

/**
 * Return the most common storage location for a given category.
 */
export function getDefaultLocation(category: FoodCategory): StorageLocation {
  switch (category) {
    case "dairy":        return "fridge";
    case "meat":         return "fridge";
    case "poultry":      return "fridge";
    case "seafood":      return "fridge";
    case "produce":      return "fridge";
    case "grains":       return "pantry";
    case "beverages":    return "pantry";
    case "condiments":   return "fridge";
    case "leftovers":    return "fridge";
    case "frozen_meals": return "freezer";
    case "snacks":       return "pantry";
    case "other":        return "pantry";
  }
}
