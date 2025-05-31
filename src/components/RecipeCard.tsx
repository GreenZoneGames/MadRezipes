import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, ExternalLink, ChefHat, BookOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useAppContext } from '@/contexts/AppContext';
import { toast } from '@/components/ui/use-toast';

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

interface RecipeCardProps {
  recipe: Recipe;
  onAddToShoppingList?: (ingredients: string[]) => void;
  onRecipeAdded?: (recipe: Recipe) => void; // Added for consistency if needed
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onAddToShoppingList, onRecipeAdded }) => {
  const { user, cookbooks, createCookbook, addRecipeToCookbook } = useAppContext();
  const [showCookbookDialog, setShowCookbookDialog] = useState(false);
  const [selectedCookbookId, setSelectedCookbookId] = useState('');
  const [newCookbookName, setNewCookbookName] = useState('');
  const [creatingCookbook, setCreatingCookbook] = useState(false);
  const [addingRecipe, setAddingRecipe] = useState(false);

  const categoryColors = {
    proteins: 'bg-red-100 text-red-800',
    vegetables: 'bg-green-100 text-green-800',
    fruits: 'bg-yellow-100 text-yellow-800',
    grains: 'bg-amber-100 text-amber-800',
    dairy: 'bg-blue-100 text-blue-800',
    spices: 'bg-purple-100 text-purple-800',
    other: 'bg-gray-100 text-gray-800'
  };

  const categoryIcons = {
    proteins: '🥩',
    vegetables: '🥕',
    fruits: '🍎',
    grains: '🌾',
    dairy: '🥛',
    spices: '🌿',
    other: '📦'
  };

  const handleAddRecipeToCookbook = async () => {
    if (!user) {
      toast({ title: 'Authentication Required', description: 'Please sign in to add recipes to a cookbook.', variant: 'destructive' });
      return;
    }
    if (!selectedCookbookId) {
      toast({ title: 'Cookbook Required', description: 'Please select a cookbook.', variant: 'destructive' });
      return;
    }

    setAddingRecipe(true);
    try {
      await addRecipeToCookbook(recipe, selectedCookbookId);
      toast({
        title: 'Recipe Added!',
        description: `${recipe.title} has been added to your cookbook.`
      });
      if (onRecipeAdded) {
        onRecipeAdded({ ...recipe, cookbookId: selectedCookbookId });
      }
      setShowCookbookDialog(false);
      setSelectedCookbookId('');
    } catch (error: any) {
      toast({
        title: 'Failed to Add Recipe',
        description: error.message || 'An error occurred while adding the recipe to the cookbook.',
        variant: 'destructive'
      });
    } finally {
      setAddingRecipe(false);
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

  return (
    <Card className="hover-lift bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <div className="flex items-start gap-3">
          {recipe.image && (
            <img 
              src={recipe.image} 
              alt={recipe.title}
              className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          <div className="flex-1">
            <CardTitle className="text-lg mb-2 flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-orange-500" />
              {recipe.title}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {recipe.cookTime && (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {recipe.cookTime}
                </Badge>
              )}
              {recipe.servings && (
                <Badge variant="secondary" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  {recipe.servings} servings
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {recipe.ingredients.length} ingredients
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {recipe.categorizedIngredients && Object.keys(recipe.categorizedIngredients).length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold mb-2 text-sm">📋 Ingredients by Category:</h4>
            <div className="space-y-2">
              {Object.entries(recipe.categorizedIngredients || {}).map(([category, items]) => {
                if (items.length === 0) return null;
                return (
                  <div key={category} className="text-xs">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${categoryColors[category as keyof typeof categoryColors]} font-medium mb-1`}>
                      <span>{categoryIcons[category as keyof typeof categoryIcons]}</span>
                      {category.charAt(0).toUpperCase() + category.slice(1)} ({items.length})
                    </div>
                    <div className="ml-2 text-muted-foreground">
                      {items.slice(0, 3).join(', ')}
                      {items.length > 3 && ` +${items.length - 3} more`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(recipe.url, '_blank')}
            className="flex-1"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            View Recipe
          </Button>
          {onAddToShoppingList && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onAddToShoppingList(recipe.ingredients)}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              🛒 Add to List
            </Button>
          )}
          {user && (
            <Dialog open={showCookbookDialog} onOpenChange={setShowCookbookDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <BookOpen className="h-4 w-4 mr-1" />
                  Add to Cookbook
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Add "{recipe.title}" to Cookbook
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
                    onClick={handleAddRecipeToCookbook} 
                    disabled={addingRecipe || !selectedCookbookId} 
                    className="w-full"
                  >
                    {addingRecipe ? 'Adding...' : 'Add Recipe to Cookbook'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecipeCard;