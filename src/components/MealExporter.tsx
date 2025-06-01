import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Calendar, ShoppingCart, Trash2, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { MealPlan as MealPlanType, Recipe } from './MealPlanner'; // Import MealPlanType and Recipe from MealPlanner
import { exportMealPlanToPDF } from '@/utils/pdf-export'; // Import the new utility
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/contexts/AppContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface MealExporterProps {
  recipes: Recipe[]; // All recipes for PDF generation fallback
  mealPlan: MealPlanType[]; // Currently generated meal plan
  selectedMonth: string; // Currently selected month
}

interface SavedMealPlan {
  id: string;
  user_id: string;
  name: string;
  month: string;
  year: number;
  plan_data: MealPlanType[];
  created_at: string;
}

const MealExporter: React.FC<MealExporterProps> = ({ recipes, mealPlan, selectedMonth }) => {
  const { user, savedMealPlans, loadMealPlans, deleteMealPlan } = useAppContext();
  const [selectedSavedPlanId, setSelectedSavedPlanId] = useState<string>('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (user) {
      loadMealPlans(user.id);
    }
  }, [user, loadMealPlans]);

  const selectedPlan = selectedSavedPlanId 
    ? savedMealPlans.find(plan => plan.id === selectedSavedPlanId) 
    : null;

  const planToExport = selectedPlan ? selectedPlan.plan_data : mealPlan;
  const monthToExport = selectedPlan ? selectedPlan.month : selectedMonth;
  const yearToExport = selectedPlan ? selectedPlan.year : new Date().getFullYear();

  const getAllIngredients = (plan: MealPlanType[]) => {
    const ingredientMap = new Map<string, number>();
    plan.forEach(meal => {
      meal.recipe.ingredients.forEach(ingredient => {
        const cleanIngredient = ingredient.toLowerCase().trim();
        ingredientMap.set(cleanIngredient, (ingredientMap.get(cleanIngredient) || 0) + 1);
      });
    });
    return Array.from(ingredientMap.entries()).map(([ingredient, count]) => ({ ingredient, count }));
  };

  const handleExport = async () => {
    if (planToExport.length === 0) {
      toast({
        title: 'No Meal Plan to Export',
        description: 'Please generate or select a meal plan first.',
        variant: 'destructive'
      });
      return;
    }

    setExporting(true);
    try {
      await exportMealPlanToPDF(planToExport, monthToExport, recipes); // Pass allRecipes for fallback
      toast({ 
        title: 'Calendar PDF Exported', 
        description: `Meal calendar for ${monthToExport} downloaded!` 
      });
    } catch (error) {
      toast({ 
        title: 'Export Error', 
        description: 'Failed to generate PDF. Please try again.', 
        variant: 'destructive' 
      });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteSelectedPlan = async () => {
    if (!selectedSavedPlanId) return;
    try {
      await deleteMealPlan(selectedSavedPlanId);
      setSelectedSavedPlanId(''); // Deselect after deletion
    } catch (error) {
      // Error handled by AppContext's deleteMealPlan
    }
  };

  const totalIngredientsCount = getAllIngredients(planToExport).length;

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
          {user ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Select Saved Plan:</label>
                <div className="flex gap-2">
                  <Select value={selectedSavedPlanId} onValueChange={setSelectedSavedPlanId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Choose a saved meal plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {savedMealPlans.length === 0 ? (
                        <SelectItem value="no-plans" disabled>No saved plans</SelectItem>
                      ) : (
                        savedMealPlans.map(plan => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name} ({plan.month} {plan.year})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {selectedSavedPlanId && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon" className="flex-shrink-0">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the meal plan "{selectedPlan?.name}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleDeleteSelectedPlan}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Delete Plan
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Or export the currently generated plan below.
              </p>
            </>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Sign in to save and manage your meal plans.
            </div>
          )}

          <Button 
            onClick={handleExport}
            disabled={exporting || planToExport.length === 0}
            className="w-full bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-600 text-primary-foreground hover-lift transition-all duration-300 shadow-lg"
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Export {selectedPlan ? selectedPlan.name : 'Current Plan'} PDF
              </>
            )}
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
              {planToExport.length > 0 ? `${planToExport.length} planned meals` : 'Generate a plan first'} • {totalIngredientsCount} unique ingredients
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MealExporter;