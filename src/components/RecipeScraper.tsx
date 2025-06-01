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
  const [scrapedRecipes, setScrapedRecipes] = useState<Recipe[]>([]);
  const [selectedRecipes, setSelectedRecipes] = useState(new Set<string>());
  const [showBulkAddRecipeToCookbookDialog, setShowBulkAddRecipeToCookbookDialog] = useState(false);
  const [selectedCookbookId, setSelectedCookbookId] = useState('');
  const [isCreatingNewCookbook, setIsCreatingNewCookbook] = useState(false);
  const [newCookbookName, setNewCookbookName] = useState('');
  const [newCookbookDescription, setNewCookbookDescription] = useState('');
  const [newCookbookIsPublic, setNewCookbookIsPublic] = useState(false);
  const [addingRecipesToCookbook, setAddingRecipesToCookbook] = useState(false);

  const [showSingleAddRecipeDialog, setShowSingleAddRecipeDialog] = useState(false);
  const [recipeForSingleAdd, setRecipeForSingleAdd] = useState<Recipe | null>(null);

  const allAvailableCookbooks = useMemo(() => {
    const combined = [...cookbooks, ...guestCookbooks];
    const uniqueMap = new Map<string, typeof combined[0]>();
    combined.forEach(cb => uniqueMap.set(cb.id, cb));
    return Array.from(uniqueMap.values());
  }, [user, cookbooks, guestCookbooks]);

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
          categorized_ingredients: recipe.categorizedIngredients || {}, // Map to snake_case
          cook_time: recipe.cookTime, // Map to snake_case
          meal_type: recipe.mealType, // Map to snake_case
          cookbook_id: recipe.cookbookId, // Map to snake_case
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
    if (isCreatingNewCookbook && !newCookbookName.trim()) {
      toast({ title: 'Name Required', description: 'Please enter a name for the new cookbook.', variant: 'destructive' });
      return;
    }
    if (!isCreatingNewCookbook && !selectedCookbookId) {
      toast({ title: 'Cookbook Required', description: 'Please select a cookbook.', variant: 'destructive' });
      return;
    }
    if (selectedRecipes.size === 0) {
      toast({ title: 'No Recipes Selected', description: 'Please select at least one recipe to add.', variant: 'destructive' });
      return;
    }

    setAddingRecipesToCookbook(true);
    let targetCookbookId = selectedCookbookId;

    try {
      if (isCreatingNewCookbook) {
        const newCookbook = await createCookbook(newCookbookName.trim(), newCookbookDescription.trim(), newCookbookIsPublic);
        if (!newCookbook) {
          throw new Error('Failed to create new cookbook.');
        }
        targetCookbookId = newCookbook.id;
        toast({ title: 'Cookbook Created!', description: `"${newCookbookName}" has been created.` });
      }

      const recipesToAdd = scrapedRecipes.filter(recipe => selectedRecipes.has(recipe.id));
      for (const recipe of recipesToAdd) {
        await addRecipeToCookbook(recipe, targetCookbookId);
        onRecipeAdded({ ...recipe, cookbook_id: targetCookbookId }); // Update local state with cookbook_id
      }
      
      toast({
        title: 'Recipes Added!',
        description: `${recipesToAdd.length} recipe(s) added to your cookbook.`
      });
      setScrapedRecipes([]);
      setSelectedRecipes(new Set());
      setUrl('');
      setShowBulkAddRecipeToCookbookDialog(false);
      // Reset new cookbook fields
      setIsCreatingNewCookbook(false);
      setNewCookbookName('');
      setNewCookbookDescription('');
      setNewCookbookIsPublic(false);
      setSelectedCookbookId(''); // Clear selected cookbook
    } catch (error: any) {
      toast({
        title: 'Failed to Add Recipes',
        description: error.message || 'An error occurred while adding recipes to the cookbook.',
        variant: 'destructive'
      });
    } finally {
      setAddingRecipesToCookbook(false);
    }
  };

  const handleOpenSingleAddDialog = (recipe: Recipe) => {
    setRecipeForSingleAdd(recipe);
    setShowSingleAddRecipeDialog(true);
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
      
      {scrapedRecipes.length > 0 && (
        <Card className="hover-lift bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-primary" />
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
                  <Dialog open={showBulkAddRecipeToCookbookDialog} onOpenChange={setShowBulkAddRecipeToCookbookDialog}>
                    <DialogTrigger asChild>
                      <Button
                        className="bg-gradient-to-r from-primary to-primary/80"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add {selectedRecipes.size} Recipe{selectedRecipes.size > 1 ? 's' : ''}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <BookOpen className="h-5 w-5" />
                          Add Selected Recipes to Cookbook
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Select 
                          value={isCreatingNewCookbook ? "create-new" : selectedCookbookId} 
                          onValueChange={(value) => {
                            if (value === "create-new") {
                              setIsCreatingNewCookbook(true);
                              setSelectedCookbookId(''); // Clear selected cookbook when creating new
                            } else {
                              setIsCreatingNewCookbook(false);
                              setSelectedCookbookId(value);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an existing cookbook or create new" />
                          </SelectTrigger>
                          <SelectContent>
                            {allAvailableCookbooks.length > 0 && (
                              <p className="px-2 py-1 text-xs text-muted-foreground">Existing Cookbooks:</p>
                            )}
                            {allAvailableCookbooks.map(cb => (
                              <SelectItem key={cb.id} value={cb.id}>{cb.name} {cb.user_id === 'guest' && '(Unsaved)'}</SelectItem>
                            ))}
                            <SelectItem value="create-new" className="font-semibold text-blue-500">
                              <Plus className="h-4 w-4 mr-2 inline-block" /> Create New Cookbook...
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {isCreatingNewCookbook && (
                          <div className="space-y-3 p-3 border rounded-lg bg-muted/20">
                            <h4 className="font-semibold text-sm">New Cookbook Details:</h4>
                            <Input
                              placeholder="New cookbook name"
                              value={newCookbookName}
                              onChange={(e) => setNewCookbookName(e.target.value)}
                              disabled={addingRecipesToCookbook}
                            />
                            <Textarea
                              placeholder="Description (optional)"
                              value={newCookbookDescription}
                              onChange={(e) => setNewCookbookDescription(e.target.value)}
                              disabled={addingRecipesToCookbook}
                              rows={2}
                            />
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="new-cookbook-public-scraper"
                                checked={newCookbookIsPublic}
                                onCheckedChange={setNewCookbookIsPublic}
                                disabled={addingRecipesToCookbook}
                              />
                              <Label htmlFor="new-cookbook-public-scraper">
                                {newCookbookIsPublic ? (
                                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Globe className="h-4 w-4" /> Public
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Lock className="h-4 w-4" /> Private
                                  </span>
                                )}
                              </Label>
                            </div>
                          </div>
                        )}

                        <Button 
                          onClick={handleAddSelectedToCookbook} 
                          disabled={
                            addingRecipesToCookbook || 
                            (isCreatingNewCookbook && !newCookbookName.trim()) || 
                            (!isCreatingNewCookbook && !selectedCookbookId) ||
                            selectedRecipes.size === 0
                          } 
                          className="w-full"
                        >
                          {addingRecipesToCookbook ? 'Adding...' : `Add ${selectedRecipes.size} to Cookbook`}
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
                      ? 'border-primary bg-primary/10' 
                      : 'border-border/50 hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedRecipes.has(recipe.id)}
                      onCheckedChange={() => toggleRecipeSelection(recipe.id)}
                      className="mt-1 border-primary"
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
                          <CheckCircle className="h-4 w-4 text-primary" />
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
                      
                      {recipe.categorized_ingredients && (
                        <div className="text-xs mb-2">
                          <div className="font-medium mb-1">📦 Categorized Ingredients:</div>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(recipe.categorized_ingredients).map(([category, items]) => {
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
                              <span className="text-primary">•</span> {ingredient}
                            </div>
                          ))}
                          {recipe.ingredients.length > 3 && (
                            <div className="text-primary font-medium">
                              ...and {recipe.ingredients.length - 3} more ingredients
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleOpenSingleAddDialog(recipe)}
                        >
                          <BookOpen className="h-4 w-4 mr-1" /> Add to Cookbook
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
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