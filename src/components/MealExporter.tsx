import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Calendar, ShoppingCart, Trash2, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { MealPlan as MealPlanType } from '@/types/recipe'; // Import MealPlanType from central types
import { Recipe } from '@/types/recipe'; // Import Recipe from central types
import { exportMealPlanToPDF, generateFullMonthPlan } from '@/utils/pdf-export'; // Import the new utility
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
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

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
  const { user, savedMealPlans, loadMealPlans, deleteMealPlan, cookbooks, guestCookbooks, guestRecipes } = useAppContext();
  const [selectedSavedPlanId, setSelectedSavedPlanId] = useState<string>('');
  const [selectedCookbookForExportId, setSelectedCookbookForExportId] = useState<string>('');
  const [selectedMonthForExport, setSelectedMonthForExport] = useState<string>(
    new Date().toLocaleDateString('en-US', { month: 'long' })
  );
  const [exporting, setExporting] = useState(false);
  const [generatingAndExporting, setGeneratingAndExporting] = useState(false);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    if (user) {
      loadMealPlans(user.id);
    }
  }, [user, loadMealPlans]);

  const currentCookbooks = user ? cookbooks : guestCookbooks;

  // Fetch recipes for the selected cookbook for on-the-fly generation
  const { data: recipesForExport, isLoading: isLoadingRecipesForExport } = useQuery<Recipe[]>({
    queryKey: ['recipesForExport', user?.id, selectedCookbookForExportId],
    queryFn: async () => {
      if (!selectedCookbookForExportId) return [];

      const selectedCb = currentCookbooks.find(cb => cb.id === selectedCookbookForExportId);
      if (!selectedCb) return [];

      if (selectedCb.user_id === 'guest') {
        return guestRecipes.filter(r => r.cookbook_id === selectedCookbookForExportId);
      }

      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', selectedCb.user_id)
        .eq('cookbook_id', selectedCookbookForExportId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCookbookForExportId,
  });

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

  const handleGenerateAndExport = async () => {
    if (!selectedCookbookForExportId || !selectedMonthForExport) {
      toast({
        title: 'Missing Information',
        description: 'Please select both a cookbook and a month to generate and export.',
        variant: 'destructive'
      });
      return;
    }
    if (!recipesForExport || recipesForExport.length === 0) {
      toast({
        title: 'No Recipes in Cookbook',
        description: 'The selected cookbook has no recipes to generate a plan from.',
        variant: 'destructive'
      });
      return;
    }

    setGeneratingAndExporting(true);
    try {
      const generatedPlan = generateFullMonthPlan(recipesForExport, selectedMonthForExport);
      if (generatedPlan.length === 0) {
        throw new Error('Could not generate a meal plan with the selected recipes.');
      }
      await exportMealPlanToPDF(generatedPlan, selectedMonthForExport, recipesForExport);
      toast({
        title: 'Meal Plan PDF Generated!',
        description: `A new meal plan for ${selectedMonthForExport} has been generated and downloaded.`
      });
    } catch (error: any) {
      toast({
        title: 'Generation & Export Failed',
        description: error.message || 'An error occurred while generating and exporting the meal plan.',
        variant: 'destructive'
      });
    } finally {
      setGeneratingAndExporting(false);
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
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground hover-lift transition-all duration-300 shadow-lg"
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
          
          <div className="border-t pt-4 mt-4 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Generate & Export New Plan
            </h3>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Select Cookbook:</label>
              <Select value={selectedCookbookForExportId} onValueChange={setSelectedCookbookForExportId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a cookbook" />
                </SelectTrigger>
                <SelectContent>
                  {currentCookbooks.length === 0 ? (
                    <SelectItem value="no-cookbooks" disabled>No cookbooks available</SelectItem>
                  ) : (
                    currentCookbooks.map(cb => (
                      <SelectItem key={cb.id} value={cb.id}>
                        {cb.name} {cb.user_id === 'guest' && '(Unsaved)'}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Select Month:</label>
              <Select value={selectedMonthForExport} onValueChange={setSelectedMonthForExport}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleGenerateAndExport}
              disabled={generatingAndExporting || !selectedCookbookForExportId || !selectedMonthForExport || isLoadingRecipesForExport || (recipesForExport?.length || 0) === 0}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white hover-lift transition-all duration-300 shadow-lg"
            >
              {generatingAndExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating & Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate & Export PDF
                </>
              )}
            </Button>
            {isLoadingRecipesForExport && (
              <p className="text-center text-sm text-muted-foreground">Loading recipes for selected cookbook...</p>
            )}
          </div>

          <div className="text-sm text-muted-foreground space-y-1 text-center pt-4 border-t mt-4">
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