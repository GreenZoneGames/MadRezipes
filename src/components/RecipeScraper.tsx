import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ChefHat, Plus, Utensils, CheckCircle, BookOpen, Globe, Lock } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/contexts/AppContext';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import AddRecipeToCookbookDialog from './recipes/AddRecipeToCookbookDialog'; // Import the dialog

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

interface RecipeScraperProps {
  onRecipeAdded: (recipe: Recipe) => void;
}

const RecipeScraper: React.FC<RecipeScraperProps> = ({ onRecipeAdded }) => {
  const { user, cookbooks, guestCookbooks, createCookbook, addRecipeToCookbook } = useAppContext();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  // Removed scrapedRecipes state as recipes are added directly to main collection
  // Removed selectedRecipes state
  // Removed showBulkAddRecipeToCookbookDialog state
  // Removed selectedCookbookId state
  // Removed isCreatingNewCookbook state
  // Removed newCookbookName state
  // Removed newCookbookDescription state
  // Removed newCookbookIsPublic state
  // Removed addingRecipesToCookbook state

  const [showSingleAddRecipeDialog, setShowSingleAddRecipeDialog] = useState(false);
  const [recipeForSingleAdd, setRecipeForSingleAdd] = useState<Recipe | null>(null);

  // allAvailableCookbooks is no longer needed here as bulk add is removed

  const handleScrape = async () => {
    if (!url.trim()) {
      toast({ 
        title: '🍽️ Missing URL', 
        description: 'Please enter a recipe URL to get cooking!' 
      });
      return;
    }

    setLoading(true);
    // setScrapedRecipes([]); // No longer needed
    // setSelectedRecipes(new Set()); // No longer needed
    
    try {
      const { data, error } = await supabase.functions.invoke('scrape-recipe', {
        method: 'POST',
        body: { url }
      });
      
      if (error) {
        console.error('Supabase function invoke error:', error);
        throw new Error(error.message);
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.recipes && data.recipes.length > 0) {
        const recipesWithIds = data.recipes.map((recipe: any) => ({
          ...recipe,
          id: recipe.id || `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          categorized_ingredients: recipe.categorizedIngredients || {}, // Map to snake_case
          cook_time: recipe.cookTime, // Map to snake_case
          meal_type: recipe.mealType, // Map to snake_case
          cookbook_id: recipe.cookbookId, // Map to snake_case
        }));

        // Automatically add each scraped recipe to the main collection
        recipesWithIds.forEach((recipe: Recipe) => {
          onRecipeAdded(recipe);
        });

        toast({ 
          title: '🍳 Recipes Found!', 
          description: `Successfully found ${recipesWithIds.length} delicious recipe(s) and added them to your collection!` 
        });
        setUrl(''); // Clear URL input after successful scrape and add
      } else {
        toast({ 
          title: '🔍 No Recipes Found', 
          description: 'Could not find structured recipe data on this page. Try a different URL or manually add the recipe!',
          variant: 'destructive' 
        });
      }
      
    } catch (error: any) {
      console.error('Scraping error:', error);
      toast({ 
        title: '❌ Scraping Failed', 
        description: `Unable to extract recipes: ${error.message}. This often happens if the website doesn't provide structured recipe data.`, 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Removed toggleRecipeSelection
  // Removed handleAddSelectedToCookbook
  // Removed selectAll

  const handleOpenSingleAddDialog = (recipe: Recipe) => {
    setRecipeForSingleAdd(recipe);
    setShowSingleAddRecipeDialog(true);
  };

  // categoryColors is still used by RecipeCard, so keep it if RecipeCard is rendered directly here.
  // But since RecipeScraper no longer displays scraped recipes directly, this can be removed.
  // For now, I'll keep it as it's not causing harm.
  const categoryColors = {
    proteins: 'bg-red-100 text-red-800',
    vegetables: 'bg-green-100 text-green-800',
    fruits: 'bg-yellow-100 text-yellow-800',
    grains: 'bg-amber-100 text-amber-800',
    dairy: 'bg-blue-100 text-blue-800',
    spices: 'bg-purple-100 text-purple-800',
    other: 'bg-gray-100 text-gray-800'
  };

  return (
    <div className="space-y-4">
      <Card className="w-full hover-lift bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <ChefHat className="h-5 w-5 text-primary" />
            Recipe Scraper
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            🥘 Enter a recipe URL to find recipes with categorized ingredients and images
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="🌐 https://example.com/recipes..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
              onKeyPress={(e) => e.key === 'Enter' && handleScrape()}
            />
            <Button 
              onClick={handleScrape} 
              disabled={loading}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Searching...
                </>
              ) : (
                <>
                  <Utensils className="h-4 w-4 mr-2" />
                  Find Recipes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Removed the section that displayed scrapedRecipes and bulk add options */}
      
      {recipeForSingleAdd && (
        <AddRecipeToCookbookDialog
          recipe={recipeForSingleAdd}
          open={showSingleAddRecipeDialog}
          onOpenChange={setShowSingleAddRecipeDialog}
          onRecipeAdded={onRecipeAdded}
        />
      )}
    </div>
  );
};

export default RecipeScraper;