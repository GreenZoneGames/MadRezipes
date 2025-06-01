import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChefHat } from 'lucide-react';
import MealPlanner, { MealPlan, Recipe } from './MealPlanner';

interface MealPlannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipes: Recipe[];
  mealPlan: MealPlan[];
  onMealPlanChange: (mealPlan: MealPlan[]) => void;
  availableIngredients: string[];
  onRecipeGenerated: (recipe: Recipe) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  allRecipes: Recipe[];
}

const MealPlannerDialog: React.FC<MealPlannerDialogProps> = ({
  open,
  onOpenChange,
  recipes,
  mealPlan,
  onMealPlanChange,
  availableIngredients,
  onRecipeGenerated,
  selectedMonth,
  setSelectedMonth,
  allRecipes,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Meal Planner
          </DialogTitle>
        </DialogHeader>
        <MealPlanner
          recipes={recipes}
          mealPlan={mealPlan}
          onMealPlanChange={onMealPlanChange}
          availableIngredients={availableIngredients}
          onRecipeGenerated={onRecipeGenerated}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          allRecipes={allRecipes}
        />
      </DialogContent>
    </Dialog>
  );
};

export default MealPlannerDialog;