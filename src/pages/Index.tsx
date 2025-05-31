import React, { useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { AppProvider } from '@/contexts/AppContext';
import AppLayout from '@/components/AppLayout';
import RecipeScraper from '@/components/RecipeScraper';
import RecipeCard from '@/components/RecipeCard';
import MealPlanner, { MealPlan } from '@/components/MealPlanner';
import ShoppingList from '@/components/ShoppingList';
import ShoppingListPDF from '@/components/ShoppingListPDF';
import MealExporter from '@/components/MealExporter';
import CommunityFunctions from '@/components/CommunityFunctions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  categorizedIngredients?: CategorizedIngredients;
  instructions: string[];
  url: string;
  image?: string;
  cookTime?: string;
  servings?: number;
  mealType?: string;
  cookbookId?: string; // Added cookbookId
}

const Index = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlan[]>([]);
  const [availableIngredients, setAvailableIngredients] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const handleRecipeAdded = (recipe: Recipe) => {
    setRecipes(prev => {
      // Prevent adding duplicates if recipe already exists by ID
      if (prev.some(r => r.id === recipe.id)) {
        return prev;
      }
      return [...prev, recipe];
    });
  };

  const handleRecipeRemoved = (id: string) => {
    setRecipes(prev => prev.filter(recipe => recipe.id !== id));
  };

  const handleMealPlanChange = (newMealPlan: MealPlan[]) => {
    setMealPlan(newMealPlan);
    if (newMealPlan.length > 0) {
      const month = new Date(newMealPlan[0].date).toLocaleDateString('en-US', { month: 'long' });
      setSelectedMonth(month);
    }
  };

  const handleShoppingListChange = (ingredients: string[]) => {
    setAvailableIngredients(ingredients);
  };

  return (
    <AppProvider>
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
          <div className="container mx-auto p-6 space-y-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
                🍽️ Recipe & Meal Planner
              </h1>
              <p className="text-muted-foreground">
                Discover, plan, and organize your culinary adventures
              </p>
            </div>

            <Tabs defaultValue="planner" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="planner">Meal Planner</TabsTrigger>
                <TabsTrigger value="community">Community</TabsTrigger>
                <TabsTrigger value="recipes">Recipes</TabsTrigger>
              </TabsList>
              
              <TabsContent value="planner" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <RecipeScraper onRecipeAdded={handleRecipeAdded} />
                    <MealPlanner 
                      recipes={recipes}
                      onMealPlanChange={handleMealPlanChange}
                      availableIngredients={availableIngredients}
                      onRecipeGenerated={handleRecipeAdded}
                    />
                  </div>
                  
                  <div className="space-y-6">
                    <ShoppingList 
                      recipes={recipes}
                      onShoppingListChange={handleShoppingListChange}
                      mealPlan={mealPlan}
                    />
                    <ShoppingListPDF 
                      mealPlan={mealPlan}
                      selectedMonth={selectedMonth}
                    />
                    <MealExporter recipes={recipes} mealPlan={mealPlan} />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="community">
                <CommunityFunctions />
              </TabsContent>
              
              <TabsContent value="recipes">
                {recipes.length > 0 ? (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                      📚 Your Recipe Collection
                      <span className="text-lg text-muted-foreground">({recipes.length})</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recipes.map(recipe => (
                        <RecipeCard
                          key={recipe.id}
                          recipe={recipe}
                          onRemove={handleRecipeRemoved}
                          onRecipeAdded={handleRecipeAdded} // Pass onRecipeAdded to RecipeCard
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No recipes yet. Start by scraping some recipes!</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <Toaster />
      </AppLayout>
    </AppProvider>
  );
};

export default Index;