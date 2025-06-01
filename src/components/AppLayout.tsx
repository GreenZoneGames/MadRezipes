import React, { useState, useMemo } from 'react';
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
import { Menu, X, Search, Utensils, Filter, XCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Recipe } from '@/types/recipe'; // Import Recipe from central types file
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AppLayout: React.FC = () => {
  const { sidebarOpen, toggleSidebar } = useAppContext();
  const isMobile = useIsMobile();
  const [recipes, setRecipes] = useState<Recipe[]>([]); // This state will now primarily hold scraped/generated recipes before DB save, and then be updated by DB changes.
  const [mealPlan, setMealPlan] = useState<MealPlan[]>([]);
  const [shoppingList, setShoppingList] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [mealTypeFilter, setMealTypeFilter] = useState('');

  const handleRecipeAdded = (recipe: Recipe) => {
    setRecipes(prev => {
      // Prevent adding duplicates if recipe already exists by ID
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

  const handleRecipeRemoved = (id: string) => {
    // This function is now primarily called by CookbookManager after DB deletion
    setRecipes(prev => prev.filter(recipe => recipe.id !== id));
  };

  const handleMealPlanChange = (newMealPlan: MealPlan[]) => {
    setMealPlan(newMealPlan);
  };

  const handleShoppingListChange = (newShoppingList: string[]) => {
    setShoppingList(newShoppingList);
  };

  const addToShoppingList = (ingredients: string[]) => {
    const newItems = ingredients.filter(item => !shoppingList.includes(item));
    if (newItems.length > 0) {
      setShoppingList(prev => [...prev, ...newItems]);
      toast({
        title: '🛒 Added to Shopping List',
        description: `${newItems.length} ingredient(s) added to your shopping list.`
      });
    }
  };

  const handleRecipeGenerated = (recipe: Recipe) => {
    setRecipes(prev => [...prev, recipe]);
  };

  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => {
      const matchesSearch = searchTerm === '' ||
        recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.ingredients.some(ingredient => ingredient.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesMealType = mealTypeFilter === '' ||
        (recipe.meal_type && recipe.meal_type.toLowerCase() === mealTypeFilter.toLowerCase());
      
      return matchesSearch && matchesMealType;
    });
  }, [recipes, searchTerm, mealTypeFilter]);

  const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Appetizer', 'Dessert', 'Snack'];

  const handleClearFilters = () => {
    setSearchTerm('');
    setMealTypeFilter('');
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
                {recipes.length} recipes • {mealPlan.length} meals
              </div>
              <TopBar />
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
              
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title or ingredient..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={mealTypeFilter} onValueChange={setMealTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Filter by meal type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Meal Types</SelectItem>
                    {mealTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        <span className="flex items-center gap-2">
                          <Utensils className="h-4 w-4" /> {type}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(searchTerm !== '' || mealTypeFilter !== '') && (
                  <Button variant="outline" onClick={handleClearFilters} className="w-full sm:w-auto">
                    <XCircle className="h-4 w-4 mr-2" /> Clear Filters
                  </Button>
                )}
              </div>

              {filteredRecipes.length === 0 && recipes.length > 0 && (
                <div className="text-center py-8 text-muted-foreground animate-fade-in">
                  <p>No recipes match your current filters.</p>
                  <Button variant="link" onClick={handleClearFilters} className="mt-2">
                    Clear Filters
                  </Button>
                </div>
              )}

              {recipes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground animate-fade-in">
                  <p>No recipes yet. Start by scraping recipes from a URL!</p>
                  <p className="text-sm mt-2">Enter a recipe URL above to extract the exact recipe details.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredRecipes.map(recipe => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      onAddToShoppingList={addToShoppingList}
                      onRecipeAdded={handleRecipeAdded} // Pass this to allow adding from RecipeCard
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={`space-y-6 ${
            isMobile ? 'order-2' : ''
          }`}>
            <CookbookManager onRecipeRemoved={handleRecipeRemoved} />
            <FriendsList />
            <ShoppingList 
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
            <MealExporter recipes={recipes} mealPlan={mealPlan} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AppLayout;