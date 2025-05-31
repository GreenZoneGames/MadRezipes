import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Plus, Trash2, Edit, Loader2 } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
  const { user, cookbooks, selectedCookbook, setSelectedCookbook, createCookbook } = useAppContext();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCookbookName, setNewCookbookName] = useState('');
  const [newCookbookDescription, setNewCookbookDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: recipesInCookbook, isLoading: isLoadingRecipes } = useQuery<Recipe[]>({
    queryKey: ['recipes', user?.id, selectedCookbook?.id],
    queryFn: async () => {
      if (!user || !selectedCookbook) return [];
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', user.id)
        .eq('cookbook_id', selectedCookbook.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!selectedCookbook, // Only run query if user and selectedCookbook exist
  });

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
      await createCookbook(newCookbookName.trim(), newCookbookDescription.trim());
      setNewCookbookName('');
      setNewCookbookDescription('');
      setShowCreateDialog(false);
      toast({
        title: '📚 Cookbook Created!',
        description: `"${newCookbookName}" has been added to your collection.`
      });
      queryClient.invalidateQueries({ queryKey: ['cookbooks', user?.id] }); // Invalidate cookbooks query
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
    if (!user) return;
    
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

  if (!user) {
    return (
      <Card className="hover-lift bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-500" />
            My Cookbooks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Sign in to create and manage your cookbooks
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover-lift bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-500" />
            My Cookbooks
          </div>
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
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Select
            value={selectedCookbook?.id || ''}
            onValueChange={(value) => {
              const cookbook = cookbooks.find(c => c.id === value);
              setSelectedCookbook(cookbook || null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a cookbook" />
            </SelectTrigger>
            <SelectContent>
              {cookbooks.map(cookbook => (
                <SelectItem key={cookbook.id} value={cookbook.id}>
                  {cookbook.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {cookbooks.length === 0 && (
            <p className="text-muted-foreground text-center py-4 text-sm">
              No cookbooks yet. Create your first one!
            </p>
          )}

          {selectedCookbook && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{selectedCookbook.name}</h4>
                <Badge variant="secondary">
                  {recipesInCookbook?.length || 0} recipes
                </Badge>
              </div>
              {selectedCookbook.description && (
                <p className="text-sm text-muted-foreground">
                  {selectedCookbook.description}
                </p>
              )}

              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {isLoadingRecipes ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading recipes...
                  </div>
                ) : recipesInCookbook && recipesInCookbook.length > 0 ? (
                  recipesInCookbook.map(recipe => (
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
    </Card>
  );
};

export default CookbookManager;