import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import RecipeComments from './RecipeComments';
import RecipeHeader from './recipes/RecipeHeader';
import RecipeCategorizedIngredients from './recipes/RecipeCategorizedIngredients';
import RecipeDetailsSection from './recipes/RecipeDetailsSection';
import RecipeActions from './recipes/RecipeActions';

interface CategorizedIngredients {
  proteins: string[];
  vegetables: string[];
  fruits: string[];
  grains: string[];
  dairy: string[];
  spices: string[];
  other: string[];
}

interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  categorized_ingredients?: CategorizedIngredients;
  instructions: string[];
  url: string;
  image?: string;
  cook_time?: string;
  servings?: number;
  meal_type?: 'Breakfast' | 'Lunch' | 'Dinner' | 'Appetizer' | 'Dessert' | 'Snack' | string;
  cookbook_id?: string;
  is_public?: boolean;
  cookbook_owner_id?: string;
}

interface RecipeCardProps {
  recipe: Recipe;
  onAddToShoppingList?: (ingredients: string[]) => void;
  onRecipeAdded?: (recipe: Recipe) => void;
  showFullDetails?: boolean;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onAddToShoppingList, onRecipeAdded, showFullDetails = false }) => {
  return (
    <Card className="hover-lift bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <RecipeHeader
          title={recipe.title}
          image={recipe.image}
          cookTime={recipe.cook_time}
          servings={recipe.servings}
          mealType={recipe.meal_type}
          ingredientsCount={recipe.ingredients.length}
        />
      </CardHeader>
      <CardContent className="pt-3">
        <RecipeCategorizedIngredients
          categorizedIngredients={recipe.categorized_ingredients}
          showFullDetails={showFullDetails}
        />

        {showFullDetails && (
          <RecipeDetailsSection recipe={recipe} />
        )}

        <RecipeActions
          recipe={recipe}
          onAddToShoppingList={onAddToShoppingList}
          onRecipeAdded={onRecipeAdded}
        />

        {/* Recipe Comments Section */}
        <div className="mt-6 pt-4 border-t border-border">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Comments
          </h4>
          <RecipeComments recipeId={recipe.id} isRecipePublic={recipe.is_public || false} />
        </div>
      </CardContent>
    </Card>
  );
};

export default RecipeCard;