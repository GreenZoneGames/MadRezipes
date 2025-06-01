import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ShoppingCart } from 'lucide-react';
import ShoppingList from './ShoppingList';
import { MealPlan, Recipe } from './MealPlanner'; // Import types from MealPlanner

interface ShoppingListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipes: Recipe[];
  onShoppingListChange: (ingredients: string[]) => void;
  mealPlan: MealPlan[];
}

const ShoppingListDialog: React.FC<ShoppingListDialogProps> = ({
  open,
  onOpenChange,
  recipes,
  onShoppingListChange,
  mealPlan,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Shopping List
          </DialogTitle>
        </DialogHeader>
        <ShoppingList
          recipes={recipes}
          onShoppingListChange={onShoppingListChange}
          mealPlan={mealPlan}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ShoppingListDialog;