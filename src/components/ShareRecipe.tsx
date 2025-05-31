import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Share2, Send } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { toast } from '@/components/ui/use-toast';

interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  url: string;
  image?: string;
  cook_time?: string; // Changed to snake_case
  servings?: number;
  meal_type?: string; // Changed to snake_case
}

interface ShareRecipeProps {
  recipe: Recipe;
}

const ShareRecipe: React.FC<ShareRecipeProps> = ({ recipe }) => {
  const { user, friends, shareRecipe } = useAppContext();
  const [selectedFriend, setSelectedFriend] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleShare = async () => {
    if (!selectedFriend) {
      toast({
        title: 'Select Friend',
        description: 'Please select a friend to share with',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      await shareRecipe(recipe.id, selectedFriend);
      toast({
        title: 'Recipe Shared!',
        description: `"${recipe.title}" has been shared successfully`
      });
      setOpen(false);
      setSelectedFriend('');
    } catch (error) {
      toast({
        title: 'Share Failed',
        description: 'Failed to share recipe. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  const acceptedFriends = friends.filter(friend => friend.status === 'accepted');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Share2 className="h-3 w-3" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share "{recipe.title}"
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {acceptedFriends.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No friends to share with. Add some friends first!
            </p>
          ) : (
            <>
              <Select value={selectedFriend} onValueChange={setSelectedFriend}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a friend" />
                </SelectTrigger>
                <SelectContent>
                  {acceptedFriends.map(friend => (
                    <SelectItem key={friend.id} value={friend.id}>
                      {friend.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleShare} disabled={loading} className="w-full">
                <Send className="h-4 w-4 mr-2" />
                {loading ? 'Sharing...' : 'Share Recipe'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareRecipe;