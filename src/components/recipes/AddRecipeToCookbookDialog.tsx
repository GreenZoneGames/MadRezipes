import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { BookOpen, Plus, Globe, Lock } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { toast } from '@/components/ui/use-toast';

interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  url: string;
  image?: string;
  cook_time?: string;
  servings?: number;
  meal_type?: 'Breakfast' | 'Lunch' | 'Dinner' | 'Appetizer' | 'Dessert' | 'Snack' | string;
  cookbook_id?: string;
  categorized_ingredients?: any;
}

interface AddRecipeToCookbookDialogProps {
  recipe: Recipe;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecipeAdded: (recipe: Recipe) => void;
}

const AddRecipeToCookbookDialog: React.FC<AddRecipeToCookbookDialogProps> = ({
  recipe,
  open,
  onOpenChange,
  onRecipeAdded,
}) => {
  const { user, cookbooks, guestCookbooks, createCookbook, addRecipeToCookbook } = useAppContext();
  const [selectedCookbookId, setSelectedCookbookId] = useState('');
  const [newCookbookName, setNewCookbookName] = useState('');
  const [newCookbookDescription, setNewCookbookDescription] = useState('');
  const [newCookbookIsPublic, setNewCookbookIsPublic] = useState(false);
  const [creatingCookbook, setCreatingCookbook] = useState(false);
  const [addingRecipe, setAddingRecipe] = useState(false);
  const [isCreatingNewCookbook, setIsCreatingNewCookbook] = useState(false);

  const allAvailableCookbooks = useMemo(() => {
    const combined = [...cookbooks, ...guestCookbooks];
    const uniqueMap = new Map<string, typeof combined[0]>();
    combined.forEach(cb => uniqueMap.set(cb.id, cb));
    return Array.from(uniqueMap.values());
  }, [user, cookbooks, guestCookbooks]);

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
      setNewCookbookIsPublic(false);
      toast({ title: 'Cookbook Created!', description: `"${newCookbookName}" has been created.` });
      if (newCookbook) {
        setSelectedCookbookId(newCookbook.id); // Automatically select the new cookbook
        setIsCreatingNewCookbook(false); // Switch back to selecting existing
      }
    } catch (error: any) {
      toast({ title: 'Creation Failed', description: error.message || 'Failed to create cookbook.', variant: 'destructive' });
    } finally {
      setCreatingCookbook(false);
    }
  };

  const handleAddRecipe = async () => {
    if (isCreatingNewCookbook && !newCookbookName.trim()) {
      toast({ title: 'Name Required', description: 'Please enter a name for the new cookbook.', variant: 'destructive' });
      return;
    }
    if (!isCreatingNewCookbook && !selectedCookbookId) {
      toast({ title: 'Cookbook Required', description: 'Please select a cookbook.', variant: 'destructive' });
      return;
    }

    setAddingRecipe(true);
    let targetCookbookId = selectedCookbookId;

    try {
      if (isCreatingNewCookbook) {
        const newCookbook = await createCookbook(newCookbookName.trim(), newCookbookDescription.trim(), newCookbookIsPublic);
        if (!newCookbook) {
          throw new Error('Failed to create new cookbook.');
        }
        targetCookbookId = newCookbook.id;
      }

      await addRecipeToCookbook(recipe, targetCookbookId);
      onRecipeAdded({ ...recipe, cookbook_id: targetCookbookId });
      onOpenChange(false); // Close dialog on success
      setSelectedCookbookId('');
      setNewCookbookName('');
      setNewCookbookDescription('');
      setNewCookbookIsPublic(false);
      setIsCreatingNewCookbook(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Add "{recipe.title}" to Cookbook
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select
            value={isCreatingNewCookbook ? "create-new" : selectedCookbookId}
            onValueChange={(value) => {
              if (value === "create-new") {
                setIsCreatingNewCookbook(true);
                setSelectedCookbookId('');
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
              {allAvailableCookbooks.length === 0 ? (
                <SelectItem value="no-cookbooks" disabled>No cookbooks found. Create one!</SelectItem>
              ) : (
                <>
                  <p className="px-2 py-1 text-xs text-muted-foreground">Existing Cookbooks:</p>
                  {allAvailableCookbooks.map(cb => (
                    <SelectItem key={cb.id} value={cb.id}>{cb.name} {cb.user_id === 'guest' && '(Unsaved)'}</SelectItem>
                  ))}
                </>
              )}
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
                disabled={creatingCookbook || addingRecipe}
              />
              <Textarea
                placeholder="Description (optional)"
                value={newCookbookDescription}
                onChange={(e) => setNewCookbookDescription(e.target.value)}
                disabled={creatingCookbook || addingRecipe}
                rows={2}
              />
              <div className="flex items-center space-x-2">
                <Switch
                  id="new-cookbook-public-add-recipe"
                  checked={newCookbookIsPublic}
                  onCheckedChange={setNewCookbookIsPublic}
                  disabled={creatingCookbook || addingRecipe}
                />
                <Label htmlFor="new-cookbook-public-add-recipe">
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
            onClick={handleAddRecipe}
            disabled={
              addingRecipe ||
              (isCreatingNewCookbook && !newCookbookName.trim()) ||
              (!isCreatingNewCookbook && !selectedCookbookId)
            }
            className="w-full"
          >
            {addingRecipe ? 'Adding...' : 'Add Recipe to Cookbook'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddRecipeToCookbookDialog;