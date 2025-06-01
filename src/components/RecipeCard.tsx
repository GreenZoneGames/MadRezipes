import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, ExternalLink, ChefHat, BookOpen, Plus, Share2, Printer, MessageSquare, Copy, Loader2, Globe, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useAppContext } from '@/contexts/AppContext';
import { toast } from '@/components/ui/use-toast';
import QuickShareRecipe from './QuickShareRecipe'; // Import QuickShareRecipe
import RecipeComments from './RecipeComments'; // Import RecipeComments
import { Switch } from '@/components/ui/switch'; // Import Switch
import { Label } from '@/components/ui/label'; // Import Label

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
  is_public?: boolean; // Added to indicate if the parent cookbook is public
  cookbook_owner_id?: string; // New: ID of the user who owns the cookbook
}

interface RecipeCardProps {
  recipe: Recipe;
  onAddToShoppingList?: (ingredients: string[]) => void;
  onRecipeAdded?: (recipe: Recipe) => void; // Added for consistency if needed
  showFullDetails?: boolean; // New prop to control full details display
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onAddToShoppingList, onRecipeAdded, showFullDetails = false }) => {
  const { user, cookbooks, guestCookbooks, createCookbook, addRecipeToCookbook, copyCookbook } = useAppContext();
  const [showCookbookDialog, setShowCookbookDialog] = useState(false);
  const [selectedCookbookId, setSelectedCookbookId] = useState('');
  const [newCookbookName, setNewCookbookName] = useState('');
  const [newCookbookDescription, setNewCookbookDescription] = useState(''); // Added for new cookbook
  const [newCookbookIsPublic, setNewCookbookIsPublic] = useState(false); // Added for new cookbook
  const [creatingCookbook, setCreatingCookbook] = useState(false);
  const [addingRecipe, setAddingRecipe] = useState(false);

  const [showCopyCookbookDialog, setShowCopyCookbookDialog] = useState(false);
  const [copiedCookbookName, setCopiedCookbookName] = useState('');
  const [copiedCookbookIsPublic, setCopiedCookbookIsPublic] = useState(false);
  const [isCopyingCookbook, setIsCopyingCookbook] = useState(false);

  const allAvailableCookbooks = useMemo(() => {
    const combined = [...cookbooks, ...guestCookbooks];
    const uniqueMap = new Map<string, typeof combined[0]>();
    combined.forEach(cb => uniqueMap.set(cb.id, cb));
    return Array.from(uniqueMap.values());
  }, [user, cookbooks, guestCookbooks]);

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
    if (allAvailableCookbooks.length === 0) {
      toast({ title: 'No Cookbooks', description: 'Please create a cookbook first.', variant: 'destructive' });
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
        onRecipeAdded({ ...recipe, cookbook_id: selectedCookbookId }); // Update local state with cookbook_id
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
      const newCookbook = await createCookbook(newCookbookName.trim(), newCookbookDescription.trim(), newCookbookIsPublic);
      setNewCookbookName('');
      setNewCookbookDescription('');
      setNewCookbookIsPublic(false); // Reset public state
      toast({ title: 'Cookbook Created!', description: `"${newCookbookName}" has been created.` });
      if (newCookbook) {
        setSelectedCookbookId(newCookbook.id); // Automatically select the new cookbook
      }
    } catch (error: any) {
      toast({ title: 'Creation Failed', description: error.message || 'Failed to create cookbook.', variant: 'destructive' });
    } finally {
      setCreatingCookbook(false);
    }
  };

  const handlePrintRecipe = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${recipe.title}</title>
          <style>
            body { font-family: sans-serif; margin: 20px; color: #333; }
            h1 { color: #e67e22; font-size: 28px; margin-bottom: 15px; }
            h2 { color: #3498db; font-size: 20px; margin-top: 25px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            img { max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 20px; }
            ul, ol { list-style-position: inside; padding-left: 0; margin-bottom: 20px; }
            li { margin-bottom: 8px; line-height: 1.5; }
            .meta { font-size: 14px; color: #777; margin-bottom: 20px; }
            .meta span { margin-right: 15px; }
            .category-badge { 
              display: inline-block; 
              padding: 4px 8px; 
              border-radius: 12px; 
              font-size: 10px; 
              font-weight: bold; 
              margin-right: 5px; 
              margin-bottom: 5px;
              background-color: #f0f0f0; /* Default light background */
              color: #555; /* Default dark text */
            }
            .category-proteins { background-color: #ffe0e0; color: #c0392b; }
            .category-vegetables { background-color: #e0ffe0; color: #27ae60; }
            .category-fruits { background-color: #fffbe0; color: #f39c12; }
            .category-grains { background-color: #f5e6cc; color: #d35400; }
            .category-dairy { background-color: #e0f0ff; color: #2980b9; }
            .category-spices { background-color: #f0e0ff; color: #8e44ad; }
            .category-other { background-color: #e0e0e0; color: #7f8c8d; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>${recipe.title}</h1>
          ${recipe.image ? `<img src="${recipe.image}" alt="${recipe.title}" />` : ''}
          <div class="meta">
            ${recipe.cook_time ? `<span>🕒 ${recipe.cook_time}</span>` : ''}
            ${recipe.servings ? `<span>🍽️ ${recipe.servings} servings</span>` : ''}
            ${recipe.meal_type ? `<span>🥣 ${recipe.meal_type}</span>` : ''}
            ${recipe.url && recipe.url !== 'generated' ? `<span>🔗 <a href="${recipe.url}" target="_blank">${new URL(recipe.url).hostname}</a></span>` : ''}
          </div>

          <h2>Ingredients</h2>
          <ul>
            ${recipe.ingredients.map(ingredient => `<li>${ingredient}</li>`).join('')}
          </ul>

          ${recipe.categorized_ingredients && Object.keys(recipe.categorized_ingredients).length > 0 ? `
            <h2>Categorized Ingredients</h2>
            <div>
              ${Object.entries(recipe.categorized_ingredients).map(([category, items]) => {
                if (items.length === 0) return '';
                const categoryClass = `category-${category.toLowerCase()}`;
                return `
                  <div style="margin-bottom: 10px;">
                    <span class="category-badge ${categoryClass}">${category.charAt(0).toUpperCase() + category.slice(1)} (${items.length})</span>
                    <ul style="list-style: none; padding-left: 15px; margin-top: 5px;">
                      ${items.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}

          <h2>Instructions</h2>
          <ol>
            ${recipe.instructions.map(instruction => `<li>${instruction}</li>`).join('')}
          </ol>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      // Use a timeout to ensure content is rendered before printing
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250); // Small delay
      toast({ title: '🖨️ Printing Recipe', description: `Preparing "${recipe.title}" for print.` });
    } else {
      toast({ title: 'Print Failed', description: 'Please allow pop-ups to print the recipe.', variant: 'destructive' });
    }
  };

  const handleCopyCookbook = async () => {
    if (!user) {
      toast({
        title: 'Sign In Required',
        description: 'Please sign in to copy cookbooks.',
        variant: 'destructive'
      });
      return;
    }
    if (!recipe.cookbook_id) {
      toast({
        title: 'Error',
        description: 'This recipe is not associated with a cookbook that can be copied.',
        variant: 'destructive'
      });
      return;
    }
    if (!copiedCookbookName.trim()) {
      toast({
        title: 'New Name Required',
        description: 'Please enter a name for your new cookbook.',
        variant: 'destructive'
      });
      return;
    }

    setIsCopyingCookbook(true);
    try {
      await copyCookbook(recipe.cookbook_id, copiedCookbookName.trim(), copiedCookbookIsPublic);
      setCopiedCookbookName('');
      setCopiedCookbookIsPublic(false);
      setShowCopyCookbookDialog(false);
    } catch (error) {
      // Toast handled by copyCookbook function in AppContext
    } finally {
      setIsCopyingCookbook(false);
    }
  };

  const canCopyCookbook = user && recipe.is_public && recipe.cookbook_id && recipe.cookbook_owner_id !== user.id;

  return (
    <Card className="hover-lift bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3"> {/* Adjusted padding */}
        <div className="flex items-start gap-3">
          {recipe.image && (
            <img 
              src={recipe.image} 
              alt={recipe.title}
              className="w-24 h-24 object-cover rounded-lg flex-shrink-0" // Increased size for better visibility
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
              {recipe.cook_time && (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {recipe.cook_time}
                </Badge>
              )}
              {recipe.servings && (
                <Badge variant="secondary" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  {recipe.servings} servings
                </Badge>
              )}
              {recipe.meal_type && (
                <Badge variant="secondary" className="text-xs">
                  <ChefHat className="h-3 w-3 mr-1" />
                  {recipe.meal_type}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {recipe.ingredients.length} ingredients
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-3"> {/* Adjusted padding */}
        {recipe.categorized_ingredients && Object.keys(recipe.categorized_ingredients).length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold mb-2 text-sm">📋 Ingredients by Category:</h4>
            <div className="space-y-2">
              {Object.entries(recipe.categorized_ingredients || {}).map(([category, items]) => {
                if (items.length === 0) return null;
                return (
                  <div key={category} className="text-xs">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${categoryColors[category as keyof typeof categoryColors]} font-medium mb-1`}>
                      <span>{categoryIcons[category as keyof typeof categoryIcons]}</span>
                      {category.charAt(0).toUpperCase() + category.slice(1)} ({items.length})
                    </div>
                    <div className="ml-2 text-muted-foreground">
                      {showFullDetails ? items.join(', ') : items.slice(0, 3).join(', ')}
                      {!showFullDetails && items.length > 3 && ` +${items.length - 3} more`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {showFullDetails && (
          <div className="space-y-4 mt-4">
            {/* New section for detailed meta-data */}
            <div className="p-3 bg-muted/30 rounded-lg border border-border">
              <h4 className="font-semibold mb-2 text-sm">📊 Recipe Overview:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                {recipe.cook_time && (
                  <p className="flex items-center gap-1"><Clock className="h-4 w-4 text-primary" /> Cook Time: {recipe.cook_time}</p>
                )}
                {recipe.servings && (
                  <p className="flex items-center gap-1"><Users className="h-4 w-4 text-primary" /> Servings: {recipe.servings}</p>
                )}
                {recipe.meal_type && (
                  <p className="flex items-center gap-1"><ChefHat className="h-4 w-4 text-primary" /> Meal Type: {recipe.meal_type}</p>
                )}
                {recipe.url && recipe.url !== 'generated' && (
                  <p className="flex items-center gap-1 col-span-2">
                    <ExternalLink className="h-4 w-4 text-primary" /> Source: <a href={recipe.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary/80 truncate">{new URL(recipe.url).hostname}</a>
                  </p>
                )}
              </div>
            </div>

            {/* Existing ingredients and instructions sections */}
            <div>
              <h4 className="font-semibold mb-2 text-sm">📝 All Ingredients:</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={index}>{ingredient}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-sm">🪜 Instructions:</h4>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                {recipe.instructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ol>
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
                {allAvailableCookbooks.length > 0 ? (
                  <Select value={selectedCookbookId} onValueChange={setSelectedCookbookId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an existing cookbook" />
                    </SelectTrigger>
                    <SelectContent>
                      {allAvailableCookbooks.map(cb => (
                        <SelectItem key={cb.id} value={cb.id}>{cb.name} {cb.user_id === 'guest' && '(Unsaved)'}</SelectItem>
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
          {user && (
            <QuickShareRecipe recipe={recipe}>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 flex items-center gap-1"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </QuickShareRecipe>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintRecipe}
            className="flex-1 flex items-center gap-1"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          {canCopyCookbook && (
            <Dialog open={showCopyCookbookDialog} onOpenChange={setShowCopyCookbookDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 flex items-center gap-1 text-purple-500 hover:text-purple-600 border-purple-300"
                >
                  <Copy className="h-4 w-4" />
                  Copy Cookbook
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Copy className="h-5 w-5" />
                    Copy Cookbook
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Copy "{recipe.title}"'s cookbook to your collection.
                  </p>
                  <Input
                    placeholder="New name for your copy (e.g., 'My Italian Favorites')"
                    value={copiedCookbookName}
                    onChange={(e) => setCopiedCookbookName(e.target.value)}
                    disabled={isCopyingCookbook}
                  />
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="copied-cookbook-public"
                      checked={copiedCookbookIsPublic}
                      onCheckedChange={setCopiedCookbookIsPublic}
                      disabled={isCopyingCookbook}
                    />
                    <Label htmlFor="copied-cookbook-public">
                      {copiedCookbookIsPublic ? (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Globe className="h-4 w-4" /> Make Public
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Lock className="h-4 w-4" /> Keep Private
                        </span>
                      )}
                    </Label>
                  </div>
                  <Button onClick={handleCopyCookbook} disabled={isCopyingCookbook || !copiedCookbookName.trim()} className="w-full">
                    {isCopyingCookbook ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Copying...
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" /> Copy Cookbook
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        {/* Recipe Comments Section */}
        <div className="mt-6 pt-4 border-t border-border">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Comments
          </h4>
          <RecipeComments recipeId={recipe.id} isRecipePublic={recipe.is_public || false} />
        </div>
      </CardContent>
    </Card>
  );
};

export default RecipeCard;