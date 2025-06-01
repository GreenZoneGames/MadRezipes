import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import RecipeCard from './RecipeCard';
import { BookOpen } from 'lucide-react';

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

interface RecipeDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe | null;
  onAddToShoppingList?: (ingredients: string[]) => void;
  onRecipeAdded?: (recipe: Recipe) => void;
  onRemove?: (recipeId: string, cookbookId?: string) => void;
}

const RecipeDetailsDialog: React.FC<RecipeDetailsDialogProps> = ({
  open,
  onOpenChange,
  recipe,
  onAddToShoppingList,
  onRecipeAdded,
  onRemove,
}) => {
  if (!recipe) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {recipe.title}
          </DialogTitle>
        </DialogHeader>
        <RecipeCard
          recipe={recipe}
          onAddToShoppingList={onAddToShoppingList}
          onRecipeAdded={onRecipeAdded}
          onRemove={onRemove}
          showFullDetails={true} // Always show full details in this dialog
        />
      </DialogContent>
    </Dialog>
  );
};

export default RecipeDetailsDialog;