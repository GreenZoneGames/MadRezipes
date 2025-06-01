import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import RecipeScraper from './RecipeScraper';
import RecipeCard from './RecipeCard';
import ShoppingList from './ShoppingList';
import MealPlanner, { MealPlan } from './MealPlanner';
import MealExporter from './MealExporter';
import TopBar from './TopBar';
import FriendsList from './FriendsList';
import CookbookManager from './CookbookManager';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

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
  cookbook_id?: string; // Changed to snake_case
}

interface AppLayoutProps {
  children: React.ReactNode;
  onRecipeRemoved: (id: string) => void;
  setActiveTab: (tab: string) => void;
  onOpenDm: (recipientId: string, recipientUsername: string) => void;
  // New props for meal planning and shopping list
  recipes: Recipe[];
  mealPlan: MealPlan[];
  onMealPlanChange: (mealPlan: MealPlan[]) => void;
  availableIngredients: string[];
  onRecipeGenerated: (recipe: Recipe) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  onShoppingListChange: (ingredients: string[]) => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  onRecipeRemoved,
  setActiveTab,
  onOpenDm,
  recipes,
  mealPlan,
  onMealPlanChange,
  availableIngredients,
  onRecipeGenerated,
  selectedMonth,
  setSelectedMonth,
  onShoppingListChange,
}) => {
  const { sidebarOpen, toggleSidebar } = useAppContext();
  const isMobile = useIsMobile();

  // These states are now managed in Index.tsx and passed down
  // const [recipes, setRecipes] = useState<Recipe[]>([]);
  // const [mealPlan, setMealPlan] = useState<MealPlan[]>([]);
  // const [shoppingList, setShoppingList] = useState<string[]>([]);

  // const handleRecipeAdded = (recipe: Recipe) => {
  //   setRecipes(prev => {
  //     if (prev.some(r => r.id === recipe.id)) {
  //       return prev;
  //     }
  //     return [...prev, recipe];
  //   });
  //   toast({
  //     title: '🍽️ Recipe Added!',
  //     description: `${recipe.title} has been added to your collection.`
  //   });
  // };

  // const handleMealPlanChange = (newMealPlan: MealPlan[]) => {
  //   setMealPlan(newMealPlan);
  // };

  // const handleShoppingListChange = (newShoppingList: string[]) => {
  //   setShoppingList(newShoppingList);
  // };

  const addToShoppingList = (ingredients: string[]) => {
    // This function needs to call the handler passed from Index.tsx
    onShoppingListChange(ingredients);
    toast({
      title: '🛒 Added to Shopping List',
      description: `${ingredients.length} ingredient(s) added to your shopping list.`
    });
  };

  // const handleRecipeGenerated = (recipe: Recipe) => {
  //   setRecipes(prev => [...prev, recipe]);
  // };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-r from-red-600 via-yellow-500 to-green-600 border-b border-black/20 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex justify-between items-center h-16 ${isMobile ? 'gap-2' : 'gap-4'}`}>
            <div className="flex items-center gap-3">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSidebar}
                  className="hover:bg-black/10 transition-all duration-200 text-white hover:text-white border border-white/20 hover:border-white/40"
                >
                  {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              )}
              <h1 className={`font-bold bg-gradient-to-r from-black via-red-800 to-black bg-clip-text text-transparent drop-shadow-lg ${isMobile ? 'text-xl' : 'text-3xl'} filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-white`}>
                MadRezipes
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className={`text-white/90 font-medium drop-shadow-md ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>
                {recipes.length} recipes • {mealPlan.length} meals
              </div>
              <TopBar 
                onRecipeRemoved={onRecipeRemoved} 
                setActiveTab={setActiveTab} 
                onOpenDm={onOpenDm}
                recipes={recipes}
                mealPlan={mealPlan}
                onMealPlanChange={onMealPlanChange}
                availableIngredients={availableIngredients}
                onRecipeGenerated={onRecipeGenerated}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                onShoppingListChange={onShoppingListChange}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`grid gap-8 ${
          isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'
        }`}>
          <div className={`space-y-6 ${
            isMobile ? 'order-1' : 'lg:col-span-2'
          }`}>
            {/* RecipeScraper is now in Index.tsx's tabs */}
            {/* The main content area will now be rendered by children prop */}
            {children}
          </div>

          <div className={`space-y-6 ${
            isMobile ? 'order-2' : ''
          }`}>
            {/* These components are now in dialogs or handled by Index.tsx's tabs */}
            {/* <FriendsList /> */}
            {/* <ShoppingList 
              recipes={recipes} 
              onShoppingListChange={handleShoppingListChange}
              mealPlan={mealPlan}
            />
            <MealPlanner 
              recipes={recipes} 
              onMealPlanChange={handleMealPlanChange}
              availableIngredients={shoppingList}
              onRecipeGenerated={handleRecipeGenerated}
            />
            <MealExporter recipes={recipes} mealPlan={mealPlan} /> */}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AppLayout;