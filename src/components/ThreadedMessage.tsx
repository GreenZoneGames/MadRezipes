import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { User, Clock, ChefHat, Reply, Send } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import RecipeCard from './RecipeCard'; // Import RecipeCard

interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  url: string;
  image?: string;
  cook_time?: string; // Changed to snake_case
  servings?: number;
  meal_type?: 'Breakfast' | 'Lunch' | 'Dinner' | 'Appetizer' | 'Dessert' | 'Snack' | string; // Changed to snake_case
  cookbook_id?: string; // Changed to snake_case
}

interface Message {
  id: string;
  sender_id: string;
  sender_username: string;
  recipient_id: string;
  parent_message_id?: string;
  thread_id?: string;
  message_type: 'text' | 'recipe';
  content: string;
  recipe_data?: Recipe; // Use the updated Recipe interface
  created_at: string;
  read: boolean;
  replies?: Message[];
}

interface ThreadedMessageProps {
  message: Message;
  onReply: (parentId: string, content: string) => void;
  depth?: number;
}

const ThreadedMessage: React.FC<ThreadedMessageProps> = ({ message, onReply, depth = 0 }) => {
  const { user, addRecipeToCookbook } = useAppContext(); // Destructure addRecipeToCookbook
  const [showReply, setShowReply] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReply = async () => {
    if (!replyContent.trim() || !user) return;
    
    setLoading(true);
    try {
      await onReply(message.id, replyContent.trim());
      setReplyContent('');
      setShowReply(false);
      toast({
        title: 'Reply sent!',
        description: 'Your reply has been sent successfully.'
      });
    } catch (error: any) {
      toast({
        title: 'Error sending reply',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecipeToCollection = async (recipe: Recipe) => {
    if (!user) {
      toast({
        title: 'Sign In Required',
        description: 'Please sign in to add recipes to your collection.',
        variant: 'destructive'
      });
      return;
    }
    try {
      // Assuming a default cookbook or prompting user to select one.
      // For simplicity, let's assume the user has at least one cookbook or we create a default.
      // In a real app, you might open a dialog to select a cookbook.
      // For now, we'll just add it to the currently selected cookbook or the first available.
      const defaultCookbook = user ? useAppContext().cookbooks[0] : useAppContext().guestCookbooks[0];
      if (!defaultCookbook) {
        toast({
          title: 'No Cookbook Available',
          description: 'Please create a cookbook first to save this recipe.',
          variant: 'destructive'
        });
        return;
      }
      await addRecipeToCookbook(recipe, defaultCookbook.id);
      toast({
        title: 'Recipe Added!',
        description: `${recipe.title} has been added to your collection.`
      });
    } catch (error: any) {
      toast({
        title: 'Failed to Add Recipe',
        description: error.message || 'An error occurred while adding the recipe.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l-2 border-gray-200 pl-4' : ''}`}>
      <Card className={`mb-3 ${!message.read ? 'border-blue-300 bg-blue-50/50' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="font-medium">{message.sender_username}</span>
              {!message.read && <Badge variant="destructive" className="text-xs">New</Badge>}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {new Date(message.created_at).toLocaleDateString()}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {message.message_type === 'recipe' && message.recipe_data ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <ChefHat className="h-4 w-4" />
                Recipe Suggestion
              </div>
              <RecipeCard 
                recipe={message.recipe_data} 
                showFullDetails={true} // Show full details for shared recipes
                onAddToShoppingList={handleAddRecipeToCollection} // Allow adding to shopping list from here
                onRecipeAdded={handleAddRecipeToCollection} // Allow adding to collection from here
              />
              {message.content && (
                <p className="text-sm mt-2">{message.content}</p>
              )}
            </div>
          ) : (
            <p className="text-sm">{message.content}</p>
          )}
          
          {user && user.id !== message.sender_id && (
            <div className="mt-3 pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReply(!showReply)}
                className="text-xs"
              >
                <Reply className="h-3 w-3 mr-1" />
                Reply
              </Button>
            </div>
          )}
          
          {showReply && (
            <div className="mt-3 space-y-2">
              <Textarea
                placeholder="Write your reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleReply}
                  disabled={loading || !replyContent.trim()}
                >
                  <Send className="h-3 w-3 mr-1" />
                  {loading ? 'Sending...' : 'Send Reply'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowReply(false);
                    setReplyContent('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {message.replies && message.replies.map((reply) => (
        <ThreadedMessage
          key={reply.id}
          message={reply}
          onReply={onReply}
          depth={depth + 1}
        />
      ))}
    </div>
  );
};

export default ThreadedMessage;