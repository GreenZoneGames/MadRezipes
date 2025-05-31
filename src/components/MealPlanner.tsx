import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shuffle, ChefHat } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import MealCalendar from './MealCalendar';

interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  url: string;
  image?: string;
  cookTime?: string;
  servings?: number;
  mealType?: string;
}

export interface MealPlan {
  date: string;
  recipe: Recipe;
  mealType?: 'breakfast' | 'lunch' | 'dinner';
}

interface MealPlannerProps {
  recipes: Recipe[];
  onMealPlanChange: (mealPlan: MealPlan[]) => void;
  availableIngredients: string[];
  onRecipeGenerated: (recipe: Recipe) => void;
}

const MealPlanner: React.FC<MealPlannerProps> = ({ 
  recipes, 
  onMealPlanChange, 
  availableIngredients, 
  onRecipeGenerated 
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [mealPlan, setMealPlan] = useState<MealPlan[]>([]);
  const [generatingRecipe, setGeneratingRecipe] = useState(false);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const mealTypes: ('breakfast' | 'lunch' | 'dinner')[] = ['breakfast', 'lunch', 'dinner'];

  const generateRandomPlan = () => {
    if (recipes.length === 0 || !selectedMonth) return;

    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const monthIndex = months.indexOf(selectedMonth);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const newPlan: MealPlan[] = [];

    // Generate meals for full month with breakfast, lunch, dinner
    for (let day = 1; day <= daysInMonth; day++) {
      mealTypes.forEach(mealType => {
        const randomRecipe = recipes[Math.floor(Math.random() * recipes.length)];
        const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        newPlan.push({
          date: dateStr,
          recipe: randomRecipe,
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
          mealType: 'Dinner',
          cookTime: '25 min',
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
        cookTime: randomTemplate.cookTime,
        servings: randomTemplate.servings,
        mealType: randomTemplate.mealType
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
                disabled={recipes.length === 0 || !selectedMonth}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white hover-lift transition-all duration-300"
              >
                <Shuffle className="h-4 w-4 mr-1" />
                🎲 Generate Full Month
              </Button>
            </div>

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

            {recipes.length === 0 && (
              <div className="text-center py-6 bg-gradient-to-br from-orange-50/30 to-red-50/30 rounded-lg border border-dashed border-orange-200">
                <ChefHat className="h-12 w-12 text-orange-400 mx-auto mb-2" />
                <p className="text-muted-foreground">
                  🍳 Add some delicious recipes to start meal planning!
                </p>
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