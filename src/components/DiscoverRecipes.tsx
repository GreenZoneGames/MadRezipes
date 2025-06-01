import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Globe } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import RecipeCard from './RecipeCard';
import { useAppContext } from '@/contexts/AppContext'; // Import useAppContext

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
  categorized_ingredients?: CategorizedIngredients;
  instructions: string[];
  url: string;
  image?: string;
  cook_time?: string;
  servings?: number;
  meal_type?: 'Breakfast' | 'Lunch' | 'Dinner' | 'Appetizer' | 'Dessert' | 'Snack' | string;
  cookbook_id?: string;
  is_public?: boolean; // Added to indicate if the parent cookbook is public
  cookbook_owner_id?: string; // New: ID of the user who owns the cookbook
}

interface DiscoverRecipesProps {
  onRecipeAdded: (recipe: Recipe) => void;
}

const DiscoverRecipes: React.FC<DiscoverRecipesProps> = ({ onRecipeAdded }) => {
  const { user } = useAppContext();

  const { data: publicRecipes, isLoading, error } = useQuery<Recipe[]>({
    queryKey: ['publicRecipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          cookbooks!inner(is_public, user_id)
        `)
        .eq('cookbooks.is_public', true); // Only fetch recipes from public cookbooks

      if (error) throw error;

      // Map the data to include is_public and cookbook_owner_id directly on the recipe object
      return data.map(recipe => ({
        ...recipe,
        is_public: recipe.cookbooks?.is_public || false,
        cookbook_owner_id: recipe.cookbooks?.user_id || null,
      })) as Recipe[];
    },
  });

  if (isLoading) {
    return (
      <Card className="w-full hover-lift bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-6 text-center">
          <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
          <p className="text-muted-foreground">Loading public recipes...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    toast({
      title: 'Error loading recipes',
      description: error.message,
      variant: 'destructive'
    });
    return (
      <Card className="w-full hover-lift bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-6 text-center">
          <p className="text-destructive">Failed to load public recipes. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="w-full hover-lift bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Globe className="h-5 w-5 text-green-500" />
            Discover Public Recipes
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Explore delicious recipes shared by the MadRezipes community!
          </p>
        </CardHeader>
        <CardContent>
          {publicRecipes && publicRecipes.length > 0 ? (
            <div className="grid gap-4">
              {publicRecipes.map(recipe => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onRecipeAdded={onRecipeAdded} // Allow adding to user's cookbook
                  showFullDetails={false} // Default to condensed view
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No public recipes found yet. Be the first to share!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DiscoverRecipes;