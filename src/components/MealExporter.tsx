import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Calendar, ShoppingCart } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { MealPlan as MealPlanType, Recipe } from './MealPlanner'; // Import MealPlanType and Recipe from MealPlanner
import { exportMealPlanToPDF } from '@/utils/pdf-export'; // Import the new utility

interface MealExporterProps {
  recipes: Recipe[];
  mealPlan: MealPlanType[];
  selectedMonth: string; // Pass selectedMonth from Index.tsx
}

const MealExporter: React.FC<MealExporterProps> = ({ recipes, mealPlan, selectedMonth }) => {
  const getAllIngredients = () => {
    const ingredientMap = new Map<string, number>();
    mealPlan.forEach(meal => {
      meal.recipe.ingredients.forEach(ingredient => {
        const cleanIngredient = ingredient.toLowerCase().trim();
        ingredientMap.set(cleanIngredient, (ingredientMap.get(cleanIngredient) || 0) + 1);
      });
    });
    return Array.from(ingredientMap.entries()).map(([ingredient, count]) => ({ ingredient, count }));
  };

  const handleExport = async () => {
    try {
      await exportMealPlanToPDF(mealPlan, selectedMonth, recipes);
      toast({ 
        title: 'Calendar PDF Exported', 
        description: `Full month calendar with ${mealPlan.length} meals and shopping list downloaded!` 
      });
    } catch (error) {
      toast({ 
        title: 'Export Error', 
        description: 'Failed to generate PDF. Please try again.', 
        variant: 'destructive' 
      });
    }
  };

  return (
    <Card className="w-full hover-lift bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Download className="h-5 w-5 text-primary" />
          Export Meal Calendar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button 
            onClick={handleExport}
            disabled={mealPlan.length === 0} // Disable if no meal plan is generated
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground hover-lift transition-all duration-300 shadow-lg"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Export Full Month Calendar PDF
          </Button>
          
          <div className="text-sm text-muted-foreground space-y-1 text-center">
            <div className="flex items-center justify-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span>Full month calendar with meal titles and icons</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span>☀️ Breakfast</span>
              <span>🍽️ Lunch</span>
              <span>🌙 Dinner</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <span>Combined shopping list for all ingredients</span>
            </div>
            <p className="text-xs pt-2 text-center">
              {mealPlan.length > 0 ? `${mealPlan.length} planned meals` : 'Generate a plan first'} • {getAllIngredients().length} unique ingredients
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MealExporter;