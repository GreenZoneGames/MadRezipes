import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Plus, Trash2, Edit, Loader2, Save } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import UserAuth from './UserAuth'; // Import UserAuth for login prompt

interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  url: string;
  image?: string;
  cook_time?: string; // Matches DB column name
  servings?: number;
  meal_type?: string; // Matches DB column name
  cookbook_id?: string; // Matches DB column name
  categorized_ingredients?: any; // Matches DB column name
}

interface CookbookManagerProps {
  onRecipeRemoved: (id: string) => void; // Still needed for local state sync in AppLayout
}

const CookbookManager: React.FC<CookbookManagerProps> = ({ onRecipeRemoved }) => {
  const { user, cookbooks, selectedCookbook, setSelectedCookbook, createCookbook, guestCookbooks, guestRecipes, syncGuestDataToUser } = useAppContext();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCookbookName, setNewCookbookName] = useState('');
  const [newCookbookDescription, setNewCookbookDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false); // State for auth dialog
  const queryClient = useQueryClient();

  const currentCookbooks = user ? cookbooks : guestCookbooks;
  const currentSelectedCookbook = selectedCookbook || (guestCookbooks.length > 0 ? guestCookbooks[0] : null);

  const { data: recipesInCookbook, isLoading: isLoadingRecipes } = useQuery<Recipe[]>({
    queryKey: ['recipes', user?.id, currentSelectedCookbook?.id],
    queryFn: async () => {
      if (!user || !currentSelectedCookbook || currentSelectedCookbook.user_id === 'guest') return []; // Don't fetch guest cookbooks from DB
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', user.id)
        .eq('cookbook_id', currentSelectedCookbook.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!currentSelectedCookbook && currentSelectedCookbook.user_id !== 'guest', // Only run query if user and selectedCookbook exist and it's not a guest cookbook
  });

  // Filter guest recipes for the selected guest cookbook
  const guestRecipesForSelectedCookbook = currentSelectedCookbook && currentSelectedCookbook.user_id === 'guest'
    ? guestRecipes.filter(recipe => recipe.cookbook_id === currentSelectedCookbook.id)
    : [];

  const handleCreateCookbook = async () => {
    if (!newCookbookName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a cookbook name.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const newCb = await createCookbook(newCookbookName.trim(), newCookbookDescription.trim());
      setNewCookbookName('');
      setNewCookbookDescription('');
      setShowCreateDialog(false);
      toast({
        title: '📚 Cookbook Created!',
        description: `"${newCookbookName}" has been added to your collection.`
      });
      if (newCb) {
        setSelectedCookbook(newCb); // Automatically select the newly created cookbook
      }
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['cookbooks', user.id] }); // Invalidate cookbooks query for logged-in user
      }
    } catch (error: any) {
      toast({
        title: 'Creation Failed',
        description: error.message || 'Failed to create cookbook.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRecipe = async (recipeId: string) => {
    if (!user) {
      // Remove from guest recipes
      setGuestRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
      toast({
        title: 'Recipe Removed',
        description: 'Recipe has been removed from this temporary cookbook.'
      });
      onRecipeRemoved(recipeId); // Notify parent component
      return;
    }
    
    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', recipeId)
        .eq('user_id', user.id); // Ensure user owns the recipe
      
      if (error) throw error;
      
      toast({
        title: 'Recipe Removed',
        description: 'Recipe has been removed from this cookbook.'
      });
      queryClient.invalidateQueries({ queryKey: ['recipes', user.id, selectedCookbook?.id] }); // Invalidate recipes in this cookbook
      onRecipeRemoved(recipeId); // Notify parent component to update its local state if needed
    } catch (error: any) {
      toast({
        title: 'Removal Failed',
        description: error.message || 'Failed to remove recipe.',
        variant: 'destructive'
      });
    }
  };

  const handleSaveToAccount = () => {
    if (!user) {
      setShowAuthDialog(true); // Open login/signup dialog
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthDialog(false);
    // syncGuestDataToUser is called automatically by AppContext after successful login
  };

  const recipesToDisplay = user ? recipesInCookbook : guestRecipesForSelectedCookbook;
  const isLoadingCurrentRecipes = user ? isLoadingRecipes : false; // Only show loading for DB fetch

  return (
    <Card className="hover-lift bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-500" />
            My Cookbooks
          </div>
          <div className="flex items-center gap-2">
            {!user && guestCookbooks.length > 0 && (
              <Button size="sm" onClick={handleSaveToAccount} className="bg-purple-500 hover:bg-purple-600">
                <Save className="h-4 w-4 mr-1" />
                Save to Account
              </Button>
            )}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-500 hover:bg-blue-600">
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Cookbook</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Cookbook name"
                    value={newCookbookName}
                    onChange={(e) => setNewCookbookName(e.target.value)}
                    disabled={loading}
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={newCookbookDescription}
                    onChange={(e) => setNewCookbookDescription(e.target.value)}
                    disabled={loading}
                  />
                  <Button onClick={handleCreateCookbook} disabled={loading} className="w-full">
                    {loading ? 'Creating...' : 'Create Cookbook'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Select
            value={currentSelectedCookbook?.id || ''}
            onValueChange={(value) => {
              const cookbook = currentCookbooks.find(c => c.id === value);
              setSelectedCookbook(cookbook || null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a cookbook" />
            </SelectTrigger>
            <SelectContent>
              {currentCookbooks.map(cookbook => (
                <SelectItem key={cookbook.id} value={cookbook.id}>
                  {cookbook.name} {cookbook.user_id === 'guest' && '(Unsaved)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {currentCookbooks.length === 0 && (
            <p className="text-muted-foreground text-center py-4 text-sm">
              No cookbooks yet. Create your first one!
            </p>
          )}

          {currentSelectedCookbook && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{currentSelectedCookbook.name}</h4>
                <Badge variant="secondary">
                  {recipesToDisplay?.length || 0} recipes
                </Badge>
              </div>
              {currentSelectedCookbook.description && (
                <p className="text-sm text-muted-foreground">
                  {currentSelectedCookbook.description}
                </p>
              )}

              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {isLoadingCurrentRecipes ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading recipes...
                  </div>
                ) : recipesToDisplay && recipesToDisplay.length > 0 ? (
                  recipesToDisplay.map(recipe => (
                    <div key={recipe.id} className="flex items-center justify-between p-2 border rounded-lg bg-background/30">
                      <span className="text-sm font-medium truncate">{recipe.title}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveRecipe(recipe.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recipes in this cookbook yet. Add some!
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <UserAuth open={showAuthDialog} onOpenChange={setShowAuthDialog} onAuthSuccess={handleAuthSuccess} />
    </Card>
  );
};

export default CookbookManager;