import React from 'react';
import { Clock, Users, ExternalLink, ChefHat } from 'lucide-react';

interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  url: string;
  image?: string;
  cook_time?: string;
  servings?: number;
  meal_type?: string;
}

interface RecipeDetailsSectionProps {
  recipe: Recipe;
}

const RecipeDetailsSection: React.FC<RecipeDetailsSectionProps> = ({ recipe }) => {
  return (
    <div className="space-y-4 mt-4">
      <div className="p-3 bg-muted/30 rounded-lg border border-border">
        <h4 className="font-semibold mb-2 text-sm">📊 Recipe Overview:</h4>
        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          {recipe.cook_time && (
            <p className="flex items-center gap-1"><Clock className="h-4 w-4 text-primary" /> Cook Time: {recipe.cook_time}</p>
          )}
          {recipe.servings && (
            <p className="flex items-center gap-1"><Users className="h-4 w-4 text-primary" /> Servings: {recipe.servings}</p>
          )}
          {recipe.meal_type && (
            <p className="flex items-center gap-1"><ChefHat className="h-4 w-4 text-primary" /> Meal Type: {recipe.meal_type}</p>
          )}
          {recipe.url && recipe.url !== 'generated' && (
            <p className="flex items-center gap-1 col-span-2">
              <ExternalLink className="h-4 w-4 text-primary" /> Source: <a href={recipe.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary/80 truncate">{new URL(recipe.url).hostname}</a>
            </p>
          )}
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-2 text-sm">📝 All Ingredients:</h4>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          {recipe.ingredients.map((ingredient, index) => (
            <li key={index}>{ingredient}</li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="font-semibold mb-2 text-sm">🪜 Instructions:</h4>
        <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
          {recipe.instructions.map((instruction, index) => (
            <li key={index}>{instruction}</li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default RecipeDetailsSection;