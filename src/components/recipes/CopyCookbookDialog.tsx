import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Copy, Loader2, Globe, Lock } from 'lucide-react';
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
  meal_type?: string;
  cookbook_id?: string;
  is_public?: boolean;
  cookbook_owner_id?: string;
}

interface CopyCookbookDialogProps {
  recipe: Recipe;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CopyCookbookDialog: React.FC<CopyCookbookDialogProps> = ({ recipe, open, onOpenChange }) => {
  const { user, copyCookbook } = useAppContext();
  const [copiedCookbookName, setCopiedCookbookName] = useState('');
  const [copiedCookbookIsPublic, setCopiedCookbookIsPublic] = useState(false);
  const [isCopyingCookbook, setIsCopyingCookbook] = useState(false);

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
      onOpenChange(false); // Close dialog on success
    } catch (error) {
      // Toast handled by copyCookbook function in AppContext
    } finally {
      setIsCopyingCookbook(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
  );
};

export default CopyCookbookDialog;