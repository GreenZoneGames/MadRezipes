import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ChefHat, Plus, Utensils, CheckCircle, BookOpen } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabase'; // Import supabase client
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/contexts/AppContext';

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

interface RecipeScraperProps {
  onRecipeAdded: (recipe: Recipe) => void;
}

const RecipeScraper: React.FC<RecipeScraperProps> = ({ onRecipeAdded }) => {
  const { user, cookbooks, createCookbook, addRecipeToCookbook } = useAppContext();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [scrapedRecipes, setScrapedRecipes] = useState<Recipe[]>([]);
  const [selectedRecipes, setSelectedRecipes] = useState(new Set<string>()); // Fixed this line
  const [showCookbookDialog, setShowCookbookDialog] = useState(false);
  const [selectedCookbookId, setSelectedCookbookId] = useState('');
  const [newCookbookName, setNewCookbookName] = useState('');
  const [creatingCookbook, setCreatingCookbook] = useState(false);

  const handleScrape = async () => {
    if (!url.trim()) {
      toast({ 
        title: '🍽️ Missing URL', 
        description: 'Please enter a recipe URL to get cooking!' 
      });
      return;
    }

    setLoading(true);
    setScrapedRecipes([]);
    setSelectedRecipes(new Set());
    
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
          categorizedIngredients: recipe.categorizedIngredients || {}, // Ensure it's an object
        }));
        setScrapedRecipes(recipesWithIds);
        toast({ 
          title: '🍳 Recipes Found!', 
          description: `Successfully found ${recipesWithIds.length} delicious recipe(s)!` 
        });
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

  const toggleRecipeSelection = (recipeId: string) => {
    const newSelected = new Set(selectedRecipes);
    if (newSelected.has(recipeId)) {
      newSelected.delete(recipeId);
    } else {
      newSelected.add(recipeId);
    }
    setSelectedRecipes(newSelected);
  };

  const handleAddSelectedToCookbook = async () => {
    if (!user) {
      toast({ title: 'Authentication Required', description: 'Please sign in to add recipes to a cookbook.', variant: 'destructive' });
      return;
    }
    if (!selectedCookbookId) {
      toast({ title: 'Cookbook Required', description: 'Please select a cookbook.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const recipesToAdd = scrapedRecipes.filter(recipe => selectedRecipes.has(recipe.id));
      for (const recipe of recipesToAdd) {
        await addRecipeToCookbook(recipe, selectedCookbookId);
        onRecipeAdded({ ...recipe, cookbookId: selectedCookbookId }); // Update local state with cookbookId
      }
      
      toast({
        title: 'Recipes Added!',
        description: `${recipesToAdd.length} recipe(s) added to your cookbook.`
      });
      setScrapedRecipes([]);
      setSelectedRecipes(new Set());
      setUrl('');
      setShowCookbookDialog(false);
    } catch (error: any) {
      toast({
        title: 'Failed to Add Recipes',
        description: error.message || 'An error occurred while adding recipes to the cookbook.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewCookbook = async () => {
    if (!newCookbookName.trim()) {
      toast({ title: 'Name Required', description: 'Please enter a name for the new cookbook.', variant: 'destructive' });
      return;
    }
    setCreatingCookbook(true);
    try {
      await createCookbook(newCookbookName.trim());
      setNewCookbookName('');
      toast({ title: 'Cookbook Created!', description: `"${newCookbookName}" has been created.` });
    } catch (error: any) {
      toast({ title: 'Creation Failed', description: error.message || 'Failed to create cookbook.', variant: 'destructive' });
    } finally {
      setCreatingCookbook(false);
    }
  };

  const selectAll = () => {
    if (selectedRecipes.size === scrapedRecipes.length) {
      setSelectedRecipes(new Set());
    } else {
      setSelectedRecipes(new Set(scrapedRecipes.map(r => r.id)));
    }
  };

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
            <ChefHat className="h-5 w-5 text-orange-500" />
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
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
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
      
      {scrapedRecipes.length > 0 && (
        <Card className="hover-lift bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-green-500" />
                Found {scrapedRecipes.length} Recipe{scrapedRecipes.length > 1 ? 's' : ''}!
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                >
                  {selectedRecipes.size === scrapedRecipes.length ? 'Deselect All' : 'Select All'}
                </Button>
                {selectedRecipes.size > 0 && (
                  <Dialog open={showCookbookDialog} onOpenChange={setShowCookbookDialog}>
                    <DialogTrigger asChild>
                      <Button
                        className="bg-gradient-to-r from-green-500 to-emerald-500"
                        disabled={!user}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add {selectedRecipes.size} Recipe{selectedRecipes.size > 1 ? 's' : ''}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <BookOpen className="h-5 w-5" />
                          Add to Cookbook
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        {cookbooks.length > 0 ? (
                          <Select value={selectedCookbookId} onValueChange={setSelectedCookbookId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an existing cookbook" />
                            </SelectTrigger>
                            <SelectContent>
                              {cookbooks.map(cb => (
                                <SelectItem key={cb.id} value={cb.id}>{cb.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm text-muted-foreground">No cookbooks found. Create one below!</p>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Or create new cookbook"
                            value={newCookbookName}
                            onChange={(e) => setNewCookbookName(e.target.value)}
                            disabled={creatingCookbook}
                          />
                          <Button onClick={handleCreateNewCookbook} disabled={creatingCookbook}>
                            {creatingCookbook ? 'Creating...' : 'Create'}
                          </Button>
                        </div>

                        <Button 
                          onClick={handleAddSelectedToCookbook} 
                          disabled={loading || !selectedCookbookId} 
                          className="w-full"
                        >
                          {loading ? 'Adding...' : `Add ${selectedRecipes.size} to Cookbook`}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scrapedRecipes.map((recipe) => (
                <div 
                  key={recipe.id} 
                  className={`border rounded-lg p-4 transition-all ${
                    selectedRecipes.has(recipe.id) 
                      ? 'border-green-300 bg-green-50/50' 
                      : 'border-border/50 hover:border-orange-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedRecipes.has(recipe.id)}
                      onCheckedChange={() => toggleRecipeSelection(recipe.id)}
                      className="mt-1"
                    />
                    {recipe.image && (
                      <img 
                        src={recipe.image} 
                        alt={recipe.title}
                        className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        🍽️ {recipe.title}
                        {selectedRecipes.has(recipe.id) && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </h4>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="secondary" className="text-xs">
                          <Utensils className="h-3 w-3 mr-1" />
                          {recipe.ingredients.length} ingredients
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          📋 {recipe.instructions.length} steps
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          🔗 {new URL(recipe.url).hostname}
                        </Badge>
                      </div>
                      
                      {recipe.categorizedIngredients && (
                        <div className="text-xs mb-2">
                          <div className="font-medium mb-1">📦 Categorized Ingredients:</div>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(recipe.categorizedIngredients).map(([category, items]) => {
                              if (items.length === 0) return null;
                              return (
                                <span 
                                  key={category}
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    categoryColors[category as keyof typeof categoryColors]
                                  }`}
                                >
                                  {category}: {items.length}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground">
                        <div className="font-medium mb-1">🥕 Ingredients Preview:</div>
                        <div className="max-h-16 overflow-y-auto">
                          {recipe.ingredients.slice(0, 3).map((ingredient, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <span className="text-orange-500">•</span> {ingredient}
                            </div>
                          ))}
                          {recipe.ingredients.length > 3 && (
                            <div className="text-primary font-medium">
                              ...and {recipe.ingredients.length - 3} more ingredients
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RecipeScraper;