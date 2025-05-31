import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Plus, Trash2, Edit } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  url: string;
  image?: string;
  cookTime?: string;
  servings?: number;
  mealType?: string;
}

interface CookbookManagerProps {
  recipes: Recipe[];
  onRecipeRemoved: (id: string) => void;
}

const CookbookManager: React.FC<CookbookManagerProps> = ({ recipes, onRecipeRemoved }) => {
  const { user, cookbooks, selectedCookbook, setSelectedCookbook, createCookbook } = useAppContext();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCookbookName, setNewCookbookName] = useState('');
  const [newCookbookDescription, setNewCookbookDescription] = useState('');
  const [loading, setLoading] = useState(false);

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

  const getRecipesInCookbook = () => {
    if (!selectedCookbook) return [];
    return recipes.filter(recipe => recipe.cookbookId === selectedCookbook.id);
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
                  {getRecipesInCookbook().length} recipes
                </Badge>
              </div>
              {selectedCookbook.description && (
                <p className="text-sm text-muted-foreground">
                  {selectedCookbook.description}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CookbookManager;