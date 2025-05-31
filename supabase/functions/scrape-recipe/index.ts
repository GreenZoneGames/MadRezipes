import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.43-alpha/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const html = await response.text();
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

        const ingredientsList = doc.querySelector('.wprm-recipe-ingredients, .tasty-recipes-ingredients, .recipe-ingredients, .ingredients');
        const ingredients = Array.from(ingredientsList?.querySelectorAll('li, .wprm-recipe-ingredient') || [])
          .map(li => li.textContent?.trim())
          .filter(Boolean);

        const instructionsList = doc.querySelector('.wprm-recipe-instructions, .tasty-recipes-instructions, .recipe-instructions, .instructions');
        const instructions = Array.from(instructionsList?.querySelectorAll('li, .wprm-recipe-instruction') || [])
          .map(li => li.textContent?.trim())
          .filter(Boolean);

        const imageElement = doc.querySelector('img.wp-post-image, .wprm-recipe-image img, .tasty-recipes-image img');
        const image = imageElement?.getAttribute('src') || null;

        if (ingredients.length > 0 || instructions.length > 0) {
          recipes.push({
            id: `html-scrape-${Date.now()}`,
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

    if (recipes.length === 0) {
      return new Response(JSON.stringify({ recipes: [], message: 'No structured recipe data found (JSON-LD or common HTML patterns).' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ recipes }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Edge Function error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});