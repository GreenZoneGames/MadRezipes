import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Share2, Send, Users } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  url?: string;
}

interface Friend {
  id: string;
  username: string;
  email: string;
}

interface QuickShareRecipeProps {
  recipe: Recipe;
  children: React.ReactNode;
}

const QuickShareRecipe: React.FC<QuickShareRecipeProps> = ({ recipe, children }) => {
  const { user } = useAppContext();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<string>('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchFriends = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('friends')
        .select(`
          friend_id,
          users!friends_friend_id_fkey (
            id,
            username,
            email
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'accepted');
      
      if (error) throw error;
      
      const friendsList = data?.map(item => ({
        id: item.users.id,
        username: item.users.username,
        email: item.users.email
      })) || [];
      
      setFriends(friendsList);
    } catch (error: any) {
      console.error('Error fetching friends:', error);
    }
  };

  const shareRecipe = async () => {
    if (!selectedFriend || !user) {
      toast({
        title: 'Please select a friend',
        description: 'Choose someone to share this recipe with.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          sender_username: user.username || user.email?.split('@')[0] || 'User',
          recipient_id: selectedFriend,
          message_type: 'recipe',
          content: message || `Check out this recipe: ${recipe.title}`,
          recipe_data: recipe,
          read: false
        });
      
      if (error) throw error;
      
      toast({
        title: 'Recipe shared!',
        description: `${recipe.title} has been shared successfully.`
      });
      
      setOpen(false);
      setSelectedFriend('');
      setMessage('');
    } catch (error: any) {
      toast({
        title: 'Failed to share recipe',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchFriends();
    }
  }, [open]);

  if (!user) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Recipe
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-3 bg-orange-50 rounded-lg border">
            <h4 className="font-semibold text-sm">{recipe.title}</h4>
            <p className="text-xs text-muted-foreground">
              {recipe.ingredients.length} ingredients • {recipe.instructions.length} steps
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Share with:</label>
            <Select value={selectedFriend} onValueChange={setSelectedFriend}>
              <SelectTrigger>
                <SelectValue placeholder="Select a friend" />
              </SelectTrigger>
              <SelectContent>
                {friends.length === 0 ? (
                  <SelectItem value="none" disabled>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      No friends added yet
                    </div>
                  </SelectItem>
                ) : (
                  friends.map((friend) => (
                    <SelectItem key={friend.id} value={friend.id}>
                      {friend.username}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Message (optional):</label>
            <Textarea
              placeholder="Add a personal message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
          
          <Button 
            onClick={shareRecipe} 
            disabled={loading || !selectedFriend || friends.length === 0}
            className="w-full"
          >
            {loading ? (
              'Sharing...'
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Share Recipe
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickShareRecipe;