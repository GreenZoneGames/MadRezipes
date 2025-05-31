import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shuffle, ChefHat, BookOpen, Loader2, Download } from 'lucide-react'; // Import Download icon
import { toast } from '@/components/ui/use-toast';
import MealCalendar from './MealCalendar';
import { useAppContext } from '@/contexts/AppContext'; // Import useAppContext
import { useQuery } from '@tanstack/react-query'; // Import useQuery
import { supabase } from '@/lib/supabase'; // Import supabase
import { exportMealPlanToPDF } from '@/utils/pdf-export'; // Import the new utility

interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  url: string;
  image?: string;
  cook_time?: string; // Changed to snake_case
  servings?: number;
  meal_type?: 'Breakfast' | 'Lunch' | 'Dinner' | 'Appetizer' | 'Dessert' | 'Snack' | string; // Changed to snake_case
}

export interface MealPlan {
  date: string;
  recipe: Recipe;
  mealType?: 'breakfast' | 'lunch' | 'dinner'; // Keep these for daily planning slots
}

interface MealPlannerProps {
  onMealPlanChange: (mealPlan: MealPlan[]) => void;
  availableIngredients: string[];
  onRecipeGenerated: (recipe: Recipe) => void;
  selectedMonth: string; // Pass selectedMonth from Index.tsx
  setSelectedMonth: (month: string) => void; // Pass setSelectedMonth from Index.tsx
  allRecipes: Recipe[]; // Pass all recipes for PDF generation fallback
}

const MealPlanner: React.FC<MealPlannerProps> = ({ 
  onMealPlanChange, 
  availableIngredients, 
  onRecipeGenerated,
  selectedMonth,
  setSelectedMonth,
  allRecipes // Receive allRecipes
}) => {
  const { user, selectedCookbook, guestRecipes } = useAppContext(); // Get selectedCookbook and guestRecipes
  const [mealPlan, setMealPlan] = useState<MealPlan[]>([]);
  const [generatingRecipe, setGeneratingRecipe] = useState(false);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const mealTypes: ('breakfast' | 'lunch' | 'dinner')[] = ['breakfast', 'lunch', 'dinner']; // These are the daily slots

  // Fetch recipes for the selected cookbook
  const { data: dbRecipes, isLoading: isLoadingDbRecipes } = useQuery<Recipe[]>({
    queryKey: ['recipes', user?.id, selectedCookbook?.id],
    queryFn: async () => {
      if (!user || !selectedCookbook || selectedCookbook.user_id === 'guest') return [];
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', user.id)
        .eq('cookbook_id', selectedCookbook.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!selectedCookbook && selectedCookbook.user_id !== 'guest',
  });

  // Determine the recipes to use for planning based on selected cookbook
  const recipesToPlan = useMemo(() => {
    if (!selectedCookbook) return [];
    if (selectedCookbook.user_id === 'guest') {
      return guestRecipes.filter(r => r.cookbook_id === selectedCookbook.id);
    }
    return dbRecipes || [];
  }, [selectedCookbook, guestRecipes, dbRecipes]);

  const generateRandomPlan = () => {
    if (recipesToPlan.length === 0 || !selectedMonth) {
      toast({ 
        title: '🍽️ No Recipes Available', 
        description: 'Please select a cookbook with recipes or add some recipes first to generate a meal plan!',
        variant: 'destructive'
      });
      return;
    }

    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const monthIndex = months.indexOf(selectedMonth);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const newPlan: MealPlan[] = [];

    // Generate meals for full month with breakfast, lunch, dinner
    for (let day = 1; day <= daysInMonth; day++) {
      mealTypes.forEach(mealType => {
        // Try to find a recipe matching the meal type
        const matchingRecipes = recipesToPlan.filter(r => 
          r.meal_type?.toLowerCase() === mealType.toLowerCase()
        );
        
        let selectedRecipe: Recipe;
        if (matchingRecipes.length > 0) {
          selectedRecipe = matchingRecipes[Math.floor(Math.random() * matchingRecipes.length)];
        } else {
          // Fallback to any random recipe if no specific meal type match
          selectedRecipe = recipesToPlan[Math.floor(Math.random() * recipesToPlan.length)];
        }

        const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        newPlan.push({
          date: dateStr,
          recipe: selectedRecipe,
          mealType
        });
      });
    }

    setMealPlan(newPlan);
    onMealPlanChange(newPlan);
    toast({ 
      title: '🗓️ Full Month Plan Created!', 
      description: `${newPlan.length} delicious meals planned for ${selectedMonth}!` 
    });
  };

  const generateRecipeFromIngredients = async () => {
    if (availableIngredients.length === 0) {
      toast({ 
        title: '🛒 No Ingredients Found', 
        description: 'Add some fresh ingredients to your shopping list first!',
        variant: 'destructive'
      });
      return;
    }

    setGeneratingRecipe(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const sampleRecipes = [
        {
          title: `🥗 Fresh ${availableIngredients[0]} Bowl`,
          ingredients: availableIngredients.slice(0, 6),
          instructions: [
            `🔪 Prepare ${availableIngredients[0]} by washing and chopping`,
            `🔥 Heat oil in a large pan over medium heat`,
            `🧄 Add ${availableIngredients[1] || 'seasonings'} and cook for 2 minutes`,
            `🥄 Add remaining ingredients and stir well`,
            `⏰ Cook for 15-20 minutes until tender`,
            `🧂 Season to taste and serve hot`
          ],
          meal_type: 'Dinner', // Changed to snake_case
          cook_time: '25 min', // Changed to snake_case
          servings: 4,
          image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop'
        }
      ];
      
      const randomTemplate = sampleRecipes[0];
      const generatedRecipe: Recipe = {
        id: `generated-${Date.now()}`,
        title: randomTemplate.title,
        ingredients: randomTemplate.ingredients,
        instructions: randomTemplate.instructions,
        url: 'generated',
        image: randomTemplate.image,
        cook_time: randomTemplate.cook_time, // Changed to snake_case
        servings: randomTemplate.servings,
        meal_type: randomTemplate.meal_type // Changed to snake_case
      };
      
      onRecipeGenerated(generatedRecipe);
      toast({ 
        title: '👨‍🍳 Recipe Generated!', 
        description: `Created ${generatedRecipe.title} using your fresh ingredients!` 
      });
      
    } catch (error) {
      toast({ 
        title: '❌ Generation Failed', 
        description: 'Could not whip up a recipe. Please try again!',
        variant: 'destructive'
      });
    } finally {
      setGeneratingRecipe(false);
    }
  };

  const handleExportMealPlan = async () => {
    try {
      await exportMealPlanToPDF(mealPlan, selectedMonth, allRecipes);
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

  const isLoadingRecipes = user && selectedCookbook?.user_id !== 'guest' ? isLoadingDbRecipes : false;

  return (
    <div className="space-y-4">
      <Card className="w-full hover-lift bg-card/50 backdrop-blur-sm border-border/50 animate-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <ChefHat className="h-5 w-5 text-blue-500" />
            Meal Planner
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Plan your delicious meals for the full month with breakfast, lunch & dinner
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!selectedCookbook ? (
              <div className="text-center py-6 bg-gradient-to-br from-blue-50/30 to-purple-50/30 rounded-lg border border-dashed border-blue-200">
                <BookOpen className="h-12 w-12 text-blue-400 mx-auto mb-2" />
                <p className="text-muted-foreground">
                  Please select a cookbook from "My Cookbooks" to start planning meals.
                </p>
              </div>
            ) : isLoadingRecipes ? (
              <div className="text-center py-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                Loading recipes from cookbook...
              </div>
            ) : recipesToPlan.length === 0 ? (
              <div className="text-center py-6 bg-gradient-to-br from-orange-50/30 to-red-50/30 rounded-lg border border-dashed border-orange-200">
                <ChefHat className="h-12 w-12 text-orange-400 mx-auto mb-2" />
                <p className="text-muted-foreground">
                  The selected cookbook has no recipes. Add some to start meal planning!
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="flex-1 bg-background/50 border-border/50">
                    <SelectValue placeholder="📅 Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(month => (
                      <SelectItem key={month} value={month}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={generateRandomPlan}
                  disabled={!selectedMonth || recipesToPlan.length === 0}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white hover-lift transition-all duration-300"
                >
                  <Shuffle className="h-4 w-4 mr-1" />
                  🎲 Generate Full Month
                </Button>
              </div>
            )}

            <div className="flex justify-center">
              <Button 
                onClick={generateRecipeFromIngredients}
                disabled={generatingRecipe || availableIngredients.length === 0}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white hover-lift transition-all duration-300"
              >
                {generatingRecipe ? (
                  <>
                    <Shuffle className="h-4 w-4 mr-2 animate-spin" />
                    🍳 Cooking up ideas...
                  </>
                ) : (
                  <>
                    <ChefHat className="h-4 w-4 mr-2" />
                    👨‍🍳 Generate Recipe from Pantry
                  </>
                )}
              </Button>
            </div>

            {mealPlan.length > 0 && (
              <div className="flex justify-center mt-4">
                <Button 
                  onClick={handleExportMealPlan}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground hover-lift transition-all duration-300 shadow-lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Calendar PDF
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <MealCalendar mealPlan={mealPlan} selectedMonth={selectedMonth} />
    </div>
  );
};

export default MealPlanner;