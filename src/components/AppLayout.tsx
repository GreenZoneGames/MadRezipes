import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import RecipeScraper from './RecipeScraper';
import RecipeCard from './RecipeCard';
import ShoppingList from './ShoppingList';
import ShoppingListPDF from './ShoppingListPDF'; 
import MealPlanner, { MealPlan } from './MealPlanner';
import MealExporter from './MealExporter';
import TopBar from './TopBar';
import FriendsList from './FriendsList';
import CookbookManager from './CookbookManager';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import MobileNavMenu from './MobileNavMenu'; // Import the new component
import SortableCollectionRecipeItem from './SortableCollectionRecipeItem'; // Import the new sortable item
import RecipeDetailsDialog from './RecipeDetailsDialog'; // Import the new dialog

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { arrayMove } from '@/utils/array-utils';


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
  is_public?: boolean;
  cookbook_owner_id?: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
  onRecipeRemoved: (id: string) => void;
  setActiveTab: (tab: string) => void;
  onOpenDm: (recipientId: string, recipientUsername: string) => void;
  recipes: Recipe[]; // Added
  mealPlan: MealPlan[]; // Added
  onShoppingListChange: (ingredients: string[]) => void; // Added
  onMealPlanChange: (mealPlan: MealPlan[]) => void; // Added
  availableIngredients: string[]; // Added
  onRecipeGenerated: (recipe: Recipe) => void; // Added
  selectedMonth: string; // Added
  setSelectedMonth: (month: string) => void; // Added
  onViewRecipeDetails: (recipe: Recipe) => void; // New prop from Index.tsx
  onRecipeAdded: (recipe: Recipe) => void; // New prop from Index.tsx
}

const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  onRecipeRemoved, 
  setActiveTab, 
  onOpenDm, 
  recipes, 
  mealPlan, 
  onShoppingListChange,
  onMealPlanChange,
  availableIngredients,
  onRecipeGenerated,
  selectedMonth,
  setSelectedMonth,
  onViewRecipeDetails, // Destructure new prop
  onRecipeAdded, // Destructure new prop
}) => {
  const { sidebarOpen, toggleSidebar, deleteRecipe, setSelectedCookbook } = useAppContext(); // Destructure deleteRecipe and setSelectedCookbook
  const isMobile = useIsMobile();
  const [localRecipes, setLocalRecipes] = useState<Recipe[]>(recipes); // Renamed to avoid prop drilling issues
  const [localMealPlan, setLocalMealPlan] = useState<MealPlan[]>(mealPlan); // Renamed
  const [localShoppingList, setLocalShoppingList] = useState<string[]>(availableIngredients); // Renamed

  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor),
  );

  // Sync props to local state if they change from parent (Index.tsx)
  React.useEffect(() => {
    setLocalRecipes(recipes);
  }, [recipes]);

  React.useEffect(() => {
    setLocalMealPlan(mealPlan);
  }, [mealPlan]);

  React.useEffect(() => {
    setLocalShoppingList(availableIngredients);
  }, [availableIngredients]);

  const handleLocalRecipeAdded = (recipe: Recipe) => { // Renamed to avoid conflict with prop
    setLocalRecipes(prev => {
      // Prevent adding duplicates if recipe already exists by ID
      if (prev.some(r => r.id === recipe.id)) {
        return prev;
      }
      return [...prev, recipe];
    });
    onRecipeAdded(recipe); // Call the prop to update parent's state
  };

  const handleLocalMealPlanChange = (newMealPlan: MealPlan[]) => {
    setLocalMealPlan(newMealPlan);
    onMealPlanChange(newMealPlan); // Pass up to Index.tsx
  };

  const handleLocalShoppingListChange = (newShoppingList: string[]) => {
    setLocalShoppingList(newShoppingList);
    onShoppingListChange(newShoppingList); // Pass up to Index.tsx
  };

  const addToShoppingList = (ingredients: string[]) => {
    const newItems = ingredients.filter(item => !localShoppingList.includes(item));
    if (newItems.length > 0) {
      setLocalShoppingList(prev => [...prev, ...newItems]);
      onShoppingListChange([...localShoppingList, ...newItems]); // Update parent's state
      toast({
        title: '🛒 Added to Shopping List',
        description: `${newItems.length} ingredient(s) added to your shopping list.`
      });
    }
  };

  const handleRecipeGenerated = (recipe: Recipe) => {
    setLocalRecipes(prev => [...prev, recipe]);
    onRecipeGenerated(recipe); // Pass up to Index.tsx
  };

  const handleRemoveRecipeFromCollection = async (recipeId: string, cookbookId?: string) => {
    try {
      // Attempt to delete from Supabase if it has a cookbook_id
      if (cookbookId) {
        await deleteRecipe(recipeId, cookbookId);
      } else {
        // If no cookbook_id, it's likely a temporary/guest recipe, remove locally
        toast({ title: 'Recipe Removed', description: 'Recipe removed from your collection.' });
      }
      // Always update local state regardless of Supabase success/failure
      setLocalRecipes(prev => prev.filter(r => r.id !== recipeId));
      onRecipeRemoved(recipeId); // Notify parent (Index.tsx)
    } catch (error) {
      // Toast is already handled by deleteRecipe in AppContext
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setLocalRecipes((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
    setActiveId(null);
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const getActiveRecipe = (activeId: string | null) => {
    return localRecipes.find((recipe) => recipe.id === activeId);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 border-b border-black/20 sticky top-0 z-50 shadow-lg">
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
              <h1 className={`font-bold bg-gradient-to-r from-white via-green-200 to-white bg-clip-text text-transparent drop-shadow-lg ${isMobile ? 'text-xl' : 'text-3xl'} filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-white`}>
                MadRezipes
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Removed recipe and meal count display */}
              <TopBar 
                onRecipeRemoved={onRecipeRemoved} 
                setActiveTab={setActiveTab} 
                onOpenDm={onOpenDm}
                recipes={localRecipes}
                mealPlan={localMealPlan}
                onShoppingListChange={handleLocalShoppingListChange}
                onMealPlanChange={handleLocalMealPlanChange}
                availableIngredients={localShoppingList}
                onRecipeGenerated={handleRecipeGenerated}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
              />
            </div>
          </div>
        </div>
      </header>

      {isMobile && (
        <MobileNavMenu
          open={sidebarOpen}
          onOpenChange={toggleSidebar}
          onOpenDm={onOpenDm}
          recipes={localRecipes}
          mealPlan={localMealPlan}
          onShoppingListChange={handleLocalShoppingListChange}
          onMealPlanChange={handleLocalMealPlanChange}
          availableIngredients={localShoppingList}
          onRecipeGenerated={handleRecipeGenerated}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          setActiveTab={setActiveTab}
        />
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`grid gap-8 ${
          isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'
        }`}>
          <div className={`space-y-6 ${
            isMobile ? 'order-1' : 'lg:col-span-2'
          }`}>
            <RecipeScraper onRecipeAdded={handleLocalRecipeAdded} />
            
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Your Recipe Collection</h2>
              {localRecipes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground animate-fade-in">
                  <p>No recipes yet. Start by scraping recipes from a URL!</p>
                  <p className="text-sm mt-2">Enter a recipe URL above to extract the exact recipe details.</p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragCancel={handleDragCancel}
                >
                  <SortableContext
                    items={localRecipes.map(r => r.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="grid gap-4">
                      {localRecipes.map(recipe => (
                        <SortableCollectionRecipeItem
                          key={recipe.id}
                          recipe={recipe}
                          onAddToShoppingList={addToShoppingList}
                          onRecipeAdded={handleLocalRecipeAdded} // Pass the local handler
                          onRemove={handleRemoveRecipeFromCollection} // Pass the remove handler
                          onViewDetails={onViewRecipeDetails} // Pass onViewRecipeDetails
                        />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeId ? (
                      <div className="p-2 border rounded-lg bg-background/80 shadow-lg">
                        <span className="text-sm font-medium truncate">
                          {getActiveRecipe(activeId)?.title}
                        </span>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </div>
          </div>

          <div className={`space-y-6 ${
            isMobile ? 'order-2' : ''
          }`}>
            <CookbookManager 
              onRecipeRemoved={onRecipeRemoved} 
              setActiveTab={setActiveTab} 
              setSelectedCookbook={setSelectedCookbook} // Pass setSelectedCookbook
              onRecipeAdded={handleLocalRecipeAdded} // Pass the local handler
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AppLayout;