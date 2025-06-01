import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ShoppingCart } from 'lucide-react';
import ShoppingList from './ShoppingList';
import { MealPlan } from './MealPlanner';

interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  categorized_ingredients?: any;
  instructions: string[];
  url: string;
  image?: string;
  cook_time?: string;
  servings?: number;
  meal_type?: string;
  cookbook_id?: string;
}

interface ShoppingListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipes: Recipe[];
  mealPlan: MealPlan[];
  onShoppingListChange: (ingredients: string[]) => void;
}

const ShoppingListDialog: React.FC<ShoppingListDialogProps> = ({ open, onOpenChange, recipes, mealPlan, onShoppingListChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Your Shopping List
          </DialogTitle>
        </DialogHeader>
        <ShoppingList 
          recipes={recipes} 
          mealPlan={mealPlan} 
          onShoppingListChange={onShoppingListChange} 
        />
      </DialogContent>
    </Dialog>
  );
};

export default ShoppingListDialog;