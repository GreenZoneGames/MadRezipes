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
import FriendsList from '@/components/FriendsList';
import ManualRecipeForm from '@/components/ManualRecipeForm';
import DirectMessageWindow from '@/components/DirectMessageWindow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CookbookManager from '@/components/CookbookManager';
import DiscoverRecipes from '@/components/DiscoverRecipes'; // Import new component
import { Recipe } from '@/types/recipe'; // Import Recipe from central types file

interface OpenDmWindow {
  id: string;
  recipientId: string;
  recipientUsername: string;
}

const Index = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlan[]>([]);
  const [availableIngredients, setAvailableIngredients] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toLocaleDateString('en-US', { month: 'long' })
  );
  const [openDmWindows, setOpenDmWindows] = useState<OpenDmWindow[]>([]);
  const [activeTab, setActiveTab] = useState('planner');

  const handleRecipeAdded = (recipe: Recipe) => {
    setRecipes(prev => {
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

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5"> {/* Increased grid columns */}
                <TabsTrigger value="planner">Meal Planner</TabsTrigger>
                <TabsTrigger value="community">Community</TabsTrigger>
                <TabsTrigger value="recipes">My Cookbooks</TabsTrigger>
                <TabsTrigger value="add-recipe">Add Recipe</TabsTrigger>
                <TabsTrigger value="discover">Discover</TabsTrigger> {/* New Tab */}
              </TabsList>
              
              <TabsContent value="planner" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-6"> {/* Left Column */}
                    <RecipeScraper onRecipeAdded={handleRecipeAdded} />
                    <MealPlanner 
                      onMealPlanChange={handleMealPlanChange}
                      availableIngredients={availableIngredients}
                      onRecipeGenerated={handleRecipeAdded}
                      selectedMonth={selectedMonth}
                      setSelectedMonth={setSelectedMonth}
                      allRecipes={recipes}
                    />
                  </div>
                  
                  <div className="space-y-6"> {/* Right Column */}
                    <ShoppingList 
                      recipes={recipes} 
                      onShoppingListChange={handleShoppingListChange}
                      mealPlan={mealPlan}
                    />
                    <ShoppingListPDF 
                      mealPlan={mealPlan}
                      selectedMonth={selectedMonth}
                    />
                    <MealExporter 
                      recipes={recipes} 
                      mealPlan={mealPlan} 
                      selectedMonth={selectedMonth}
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="community">
                <FriendsList onOpenDm={handleOpenDm} />
              </TabsContent>
              
              <TabsContent value="recipes">
                <CookbookManager onRecipeRemoved={handleRecipeRemoved} setActiveTab={setActiveTab} />
              </TabsContent>

              <TabsContent value="add-recipe">
                <ManualRecipeForm onRecipeAdded={handleRecipeAdded} />
              </TabsContent>

              <TabsContent value="discover"> {/* New Tab Content */}
                <DiscoverRecipes onRecipeAdded={handleRecipeAdded} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <Toaster />
      </AppLayout>

      {openDmWindows.map((dmWindow, index) => (
        <DirectMessageWindow
          key={dmWindow.id}
          recipientId={dmWindow.recipientId}
          recipientUsername={dmWindow.recipientUsername}
          onClose={() => handleCloseDm(dmWindow.id)}
        />
      ))}
    </AppProvider>
  );
};

export default Index;