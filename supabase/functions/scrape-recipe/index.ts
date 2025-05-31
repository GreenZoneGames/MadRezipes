import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

    // Attempt to find JSON-LD script tags
    const jsonLdRegex = /<script type="application\/ld\+json">(.*?)<\/script>/gs;
    let match;
    const recipes = [];

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
            // Recursively check nested objects/arrays for recipes
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

    if (recipes.length === 0) {
      return new Response(JSON.stringify({ recipes: [], message: 'No JSON-LD recipe data found.' }), {
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