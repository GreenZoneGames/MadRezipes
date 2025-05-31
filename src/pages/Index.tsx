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
import FriendsList from '@/components/FriendsList'; // Correctly import FriendsList
import ManualRecipeForm from '@/components/ManualRecipeForm';
import DirectMessageWindow from '@/components/DirectMessageWindow'; // Import DirectMessageWindow
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
  categorized_ingredients?: CategorizedIngredients; // Changed to snake_case
  instructions: string[];
  url: string;
  image?: string;
  cook_time?: string; // Changed to snake_case
  servings?: number;
  meal_type?: 'Breakfast' | 'Lunch' | 'Dinner' | 'Appetizer' | 'Dessert' | 'Snack' | string; // Changed to snake_case
  cookbook_id?: string; // Changed to snake_case
}

interface OpenDmWindow {
  id: string; // Unique ID for the window instance
  recipientId: string;
  recipientUsername: string;
}

const Index = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlan[]>([]);
  const [availableIngredients, setAvailableIngredients] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [openDmWindows, setOpenDmWindows] = useState<OpenDmWindow[]>([]); // State to manage multiple DM windows

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

  const handleOpenDm = (recipientId: string, recipientUsername: string) => {
    // Check if a DM window for this recipient is already open
    if (!openDmWindows.some(window => window.recipientId === recipientId)) {
      setOpenDmWindows(prev => [
        ...prev,
        { id: `dm-${recipientId}-${Date.now()}`, recipientId, recipientUsername }
      ]);
    }
  };

  const handleCloseDm = (id: string) => {
    setOpenDmWindows(prev => prev.filter(window => window.id !== id));
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
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="planner">Meal Planner</TabsTrigger>
                <TabsTrigger value="community">Community</TabsTrigger>
                <TabsTrigger value="recipes">Recipes</TabsTrigger>
                <TabsTrigger value="add-recipe">Add Recipe</TabsTrigger>
              </TabsList>
              
              <TabsContent value="planner" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <RecipeScraper onRecipeAdded={handleRecipeAdded} />
                    <MealPlanner 
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
                {/* CommunityFunctions was removed as FriendsList now handles all friend management UI */}
                <FriendsList onOpenDm={handleOpenDm} /> {/* Pass the DM handler */}
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
                          onAddToShoppingList={() => { /* Placeholder for now */ }}
                          onRecipeAdded={handleRecipeAdded}
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

              <TabsContent value="add-recipe">
                <ManualRecipeForm onRecipeAdded={handleRecipeAdded} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <Toaster />
      </AppLayout>

      {/* Render all open DM windows */}
      {openDmWindows.map((dmWindow, index) => (
        <DirectMessageWindow
          key={dmWindow.id}
          recipientId={dmWindow.recipientId}
          recipientUsername={dmWindow.recipientUsername}
          onClose={() => handleCloseDm(dmWindow.id)}
          // Position multiple windows if needed, for now they'll stack
          // style={{ right: `${4 + index * 20}px`, bottom: `${4 + index * 20}px` }}
        />
      ))}
    </AppProvider>
  );
};

export default Index;