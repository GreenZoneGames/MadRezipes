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
import RecipeDetailsDialog from '@/components/RecipeDetailsDialog'; // Import RecipeDetailsDialog

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
  categorized_ingredients?: CategorizedIngredients;
  instructions: string[];
  url: string;
  image?: string;
  cook_time?: string;
  servings?: number;
  meal_type?: 'Breakfast' | 'Lunch' | 'Dinner' | 'Appetizer' | 'Dessert' | 'Snack' | string;
  cookbook_id?: string;
  is_public?: boolean; // Added to indicate if the parent cookbook is public
}

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
  const [activeTab, setActiveTab] = useState('add-recipe'); // Changed default tab

  const [selectedRecipeForDetails, setSelectedRecipeForDetails] = useState<Recipe | null>(null);
  const [showRecipeDetailsDialog, setShowRecipeDetailsDialog] = useState(false);

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

  const handleViewRecipeDetails = (recipe: Recipe) => {
    setSelectedRecipeForDetails(recipe);
    setShowRecipeDetailsDialog(true);
  };

  return (
    <AppProvider>
      <AppLayout 
        onRecipeRemoved={handleRecipeRemoved} 
        setActiveTab={setActiveTab}
        onOpenDm={handleOpenDm}
        recipes={recipes}
        mealPlan={mealPlan}
        onShoppingListChange={handleShoppingListChange}
        onMealPlanChange={handleMealPlanChange} // Pass to AppLayout
        availableIngredients={availableIngredients} // Pass to AppLayout
        onRecipeGenerated={handleRecipeAdded} // Pass to AppLayout
        selectedMonth={selectedMonth} // Pass to AppLayout
        setSelectedMonth={setSelectedMonth} // Pass to AppLayout
        onViewRecipeDetails={handleViewRecipeDetails} // Pass to AppLayout
      >
        <div className="min-h-screen bg-gradient-to-br from-white via-green-50 to-blue-50">
          <div className="container mx-auto p-6 space-y-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
                🍽️ Recipe & Meal Planner
              </h1>
              <p className="text-muted-foreground">
                Discover, plan, and organize your culinary adventures
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2"> {/* Adjusted grid columns */}
                <TabsTrigger value="add-recipe">Add Recipe</TabsTrigger>
                <TabsTrigger value="discover">Discover</TabsTrigger>
              </TabsList>
              
              {/* Removed 'planner' tab content */}
              
              <TabsContent value="add-recipe">
                <ManualRecipeForm onRecipeAdded={handleRecipeAdded} />
              </TabsContent>

              <TabsContent value="discover">
                <DiscoverRecipes onRecipeAdded={handleRecipeAdded} onViewDetails={handleViewRecipeDetails} />
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

      <RecipeDetailsDialog
        open={showRecipeDetailsDialog}
        onOpenChange={setShowRecipeDetailsDialog}
        recipe={selectedRecipeForDetails}
        onAddToShoppingList={handleShoppingListChange} // Pass the shopping list handler
        onRecipeAdded={handleRecipeAdded} // Pass the recipe added handler
        onRemove={handleRecipeRemoved} // Pass the recipe remove handler
      />
    </AppProvider>
  );
};

export default Index;