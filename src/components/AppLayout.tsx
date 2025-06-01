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
  recipes: Recipe[]; // Added
  mealPlan: MealPlan[]; // Added
  onShoppingListChange: (ingredients: string[]) => void; // Added
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, onRecipeRemoved, setActiveTab, onOpenDm, recipes, mealPlan, onShoppingListChange }) => {
  const { sidebarOpen, toggleSidebar } = useAppContext();
  const isMobile = useIsMobile();
  const [localRecipes, setLocalRecipes] = useState<Recipe[]>(recipes); // Renamed to avoid prop drilling issues
  const [localMealPlan, setLocalMealPlan] = useState<MealPlan[]>(mealPlan); // Renamed
  const [shoppingList, setShoppingList] = useState<string[]>([]);

  // Sync props to local state if they change from parent (Index.tsx)
  React.useEffect(() => {
    setLocalRecipes(recipes);
  }, [recipes]);

  React.useEffect(() => {
    setLocalMealPlan(mealPlan);
  }, [mealPlan]);

  const handleRecipeAdded = (recipe: Recipe) => {
    setLocalRecipes(prev => {
      if (prev.some(r => r.id === recipe.id)) {
        return prev;
      }
      return [...prev, recipe];
    });
    toast({
      title: '🍽️ Recipe Added!',
      description: `${recipe.title} has been added to your collection.`
    });
  };

  const handleMealPlanChange = (newMealPlan: MealPlan[]) => {
    setLocalMealPlan(newMealPlan);
    // Also call the parent's handler if needed
    // onMealPlanChange(newMealPlan); // If Index.tsx needs to know about this change
  };

  const handleLocalShoppingListChange = (newShoppingList: string[]) => {
    setShoppingList(newShoppingList);
    onShoppingListChange(newShoppingList); // Pass up to Index.tsx
  };

  const addToShoppingList = (ingredients: string[]) => {
    const newItems = ingredients.filter(item => !shoppingList.includes(item));
    if (newItems.length > 0) {
      setShoppingList(prev => [...prev, ...newItems]);
      onShoppingListChange([...shoppingList, ...newItems]); // Update parent's state
      toast({
        title: '🛒 Added to Shopping List',
        description: `${newItems.length} ingredient(s) added to your shopping list.`
      });
    }
  };

  const handleRecipeGenerated = (recipe: Recipe) => {
    setLocalRecipes(prev => [...prev, recipe]);
  };

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
                {localRecipes.length} recipes • {localMealPlan.length} meals
              </div>
              <TopBar 
                onRecipeRemoved={onRecipeRemoved} 
                setActiveTab={setActiveTab} 
                onOpenDm={onOpenDm}
                recipes={localRecipes} // Pass local state
                mealPlan={localMealPlan} // Pass local state
                onShoppingListChange={handleLocalShoppingListChange} // Pass local handler
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
            <RecipeScraper onRecipeAdded={handleRecipeAdded} />
            
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Your Recipe Collection</h2>
              {localRecipes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground animate-fade-in">
                  <p>No recipes yet. Start by scraping recipes from a URL!</p>
                  <p className="text-sm mt-2">Enter a recipe URL above to extract the exact recipe details.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {localRecipes.map(recipe => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      onAddToShoppingList={addToShoppingList}
                      onRecipeAdded={handleRecipeAdded}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={`space-y-6 ${
            isMobile ? 'order-2' : ''
          }`}>
            {/* ShoppingList is now rendered via dialog */}
            <MealPlanner 
              recipes={localRecipes} 
              onMealPlanChange={handleMealPlanChange}
              availableIngredients={shoppingList}
              onRecipeGenerated={handleRecipeGenerated}
            />
            <MealExporter recipes={localRecipes} mealPlan={localMealPlan} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AppLayout;