import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.43/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_PAGES_TO_SCRAPE = 5; // Limit the number of pages to scrape per request
const MAX_DEPTH = 1; // Limit the depth of link traversal (0 for initial page only, 1 for initial + direct links)

// Helper function to extract recipes from a single HTML string
const extractRecipesFromHtml = (html: string, url: string) => {
  const recipes = [];

  // --- Attempt 1: Parse JSON-LD (preferred) ---
  const jsonLdRegex = /<script type="application\/ld\+json">(.*?)<\/script>/gs;
  let match;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1]);
      const processJson = (data: any) => {
        if (Array.isArray(data)) {
          data.forEach(processJson);
        } else if (data && typeof data === 'object') {
          if (data['@type'] === 'Recipe') {
            const recipe = {
              id: data['@id'] || null,
              title: data.name || 'Untitled Recipe',
              ingredients: Array.isArray(data.recipeIngredient) ? data.recipeIngredient : [],
              instructions: Array.isArray(data.recipeInstructions) 
                ? data.recipeInstructions.map((step: any) => step.text || step).filter(Boolean) 
                : [],
              url: data.url || url,
              image: data.image?.url || (Array.isArray(data.image) ? data.image[0]?.url : data.image) || null,
              cookTime: data.cookTime || data.totalTime || null,
              servings: data.recipeYield || null,
              mealType: data.recipeCategory || null,
            };
            recipes.push(recipe);
          }
          for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
              processJson(data[key]);
            }
          }
        }
      };
      processJson(json);
    } catch (parseError) {
      console.error('Error parsing JSON-LD:', parseError);
    }
  }

  // --- Attempt 2: Fallback to HTML parsing if no JSON-LD recipe found ---
  if (recipes.length === 0) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    if (doc) {
      const titleElement = doc.querySelector('h1.entry-title, h1.recipe-title, .wprm-recipe-name');
      const title = titleElement?.textContent?.trim() || 'Untitled Recipe (HTML Scrape)';

      // Refined selectors for ingredients and instructions
      const ingredientsList = doc.querySelector('.wprm-recipe-ingredients, .tasty-recipes-ingredients, .recipe-ingredients, .ingredients');
      const ingredients = Array.from(ingredientsList?.querySelectorAll('li, .wprm-recipe-ingredient, .ingredient') || []) // Added .ingredient
        .map(li => li.textContent?.trim())
        .filter(Boolean);

      const instructionsList = doc.querySelector('.wprm-recipe-instructions, .tasty-recipes-instructions, .recipe-instructions, .instructions');
      const instructions = Array.from(instructionsList?.querySelectorAll('li, .wprm-recipe-instruction, .instruction') || []) // Added .instruction
        .map(li => li.textContent?.trim())
        .filter(Boolean);

      const imageElement = doc.querySelector('img.wp-post-image, .wprm-recipe-image img, .tasty-recipes-image img');
      const image = imageElement?.getAttribute('src') || null;

      if (ingredients.length > 0 || instructions.length > 0) {
        recipes.push({
          id: `html-scrape-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          title,
          ingredients,
          instructions,
          url,
          image,
          cookTime: null,
          servings: null,
          mealType: null,
        });
      }
    }
  }
  return recipes;
};

// Helper function to find relevant links on a page
const findRecipeLinks = (html: string, baseUrl: string, visitedUrls: Set<string>) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (!doc) return [];

  const links: string[] = [];
  const baseHostname = new URL(baseUrl).hostname;

  doc.querySelectorAll('a').forEach(a => {
    const href = a.getAttribute('href');
    if (href) {
      try {
        const absoluteUrl = new URL(href, baseUrl).href;
        const urlObj = new URL(absoluteUrl);

        // Only follow links on the same domain and not already visited
        if (urlObj.hostname === baseHostname && !visitedUrls.has(absoluteUrl)) {
          // Simple heuristic: look for common recipe path segments
          const path = urlObj.pathname.toLowerCase();
          if (
            path.includes('/recipe/') ||
            path.includes('/recipes/') ||
            path.includes('/dish/') ||
            path.includes('/cook/') ||
            path.includes('/meal/') ||
            path.includes('/food/') ||
            /\/\d{4}\/\d{2}\/\d{2}\/[^/]+\/?$/.test(path) // common blog post pattern that might contain recipes
          ) {
            links.push(absoluteUrl);
          }
        }
      } catch (e) {
        // Ignore invalid URLs
      }
    }
  });
  return links;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url: initialUrl } = await req.json();

    if (!initialUrl) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const allRecipes: any[] = [];
    const visitedUrls = new Set<string>();
    const urlsToVisit: { url: string; depth: number }[] = [{ url: initialUrl, depth: 0 }];

    let pagesScrapedCount = 0;

    while (urlsToVisit.length > 0 && pagesScrapedCount < MAX_PAGES_TO_SCRAPE) {
      const { url: currentUrl, depth: currentDepth } = urlsToVisit.shift()!;

      if (visitedUrls.has(currentUrl)) {
        continue;
      }

      visitedUrls.add(currentUrl);
      pagesScrapedCount++;

      console.log(`Scraping: ${currentUrl} (Depth: ${currentDepth}, Pages Scraped: ${pagesScrapedCount})`);

      try {
        const response = await fetch(currentUrl);
        if (!response.ok) {
          console.warn(`Failed to fetch ${currentUrl}: ${response.statusText}`);
          continue;
        }

        const html = await response.text();
        const recipesOnPage = extractRecipesFromHtml(html, currentUrl);
        
        recipesOnPage.forEach(recipe => {
          // Add recipe if it's not a duplicate (based on title and main ingredients)
          const isDuplicate = allRecipes.some(existingRecipe => 
            existingRecipe.title === recipe.title && 
            JSON.stringify(existingRecipe.ingredients.sort()) === JSON.stringify(recipe.ingredients.sort())
          );
          if (!isDuplicate) {
            allRecipes.push(recipe);
          }
        });

        if (currentDepth < MAX_DEPTH) {
          const newLinks = findRecipeLinks(html, currentUrl, visitedUrls);
          newLinks.forEach(link => {
            if (!visitedUrls.has(link) && urlsToVisit.length + pagesScrapedCount < MAX_PAGES_TO_SCRAPE) {
              urlsToVisit.push({ url: link, depth: currentDepth + 1 });
            }
          });
        }

      } catch (fetchError: any) {
        console.error(`Error processing ${currentUrl}:`, fetchError.message);
      }
    }

    if (allRecipes.length === 0) {
      return new Response(JSON.stringify({ recipes: [], message: 'No structured recipe data found on the initial page or linked pages.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ recipes: allRecipes }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Edge Function error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});