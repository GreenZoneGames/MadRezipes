import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, MessageSquare, Share2 } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { toast } from '@/components/ui/use-toast';

const CommunityFunctions: React.FC = () => {
  const { user, friends, addFriend, removeFriend } = useAppContext();
  const [newFriendEmail, setNewFriendEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddFriend = async () => {
    if (!newFriendEmail.trim()) {
      toast({
        title: 'Email required',
        description: 'Please enter a friend\'s email address.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      await addFriend(newFriendEmail.trim());
      setNewFriendEmail('');
      toast({
        title: 'Friend request sent!',
        description: `Invitation sent to ${newFriendEmail}`
      });
    } catch (error: any) {
      toast({
        title: 'Error adding friend',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async (friendId: string, email: string) => {
    try {
      await removeFriend(friendId);
      toast({
        title: 'Friend removed',
        description: `${email} has been removed from your friends list.`
      });
    } catch (error: any) {
      toast({
        title: 'Error removing friend',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const shareRecipe = (friendEmail: string) => {
    toast({
      title: 'Recipe shared!',
      description: `Recipe shared with ${friendEmail}`
    });
  };

  const startConversation = (friendEmail: string) => {
    toast({
      title: 'Message feature',
      description: `Use the inbox to message ${friendEmail}`
    });
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Sign in to access community features</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Friends
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Friend's email address"
              value={newFriendEmail}
              onChange={(e) => setNewFriendEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddFriend()}
            />
            <Button onClick={handleAddFriend} disabled={loading}>
              {loading ? 'Adding...' : 'Add Friend'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Friends ({friends.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {friends.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No friends yet. Add some friends to start sharing recipes!
            </p>
          ) : (
            <div className="space-y-3">
              {friends.map((friend) => (
                <div key={friend.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{friend.email}</p>
                      <Badge variant={friend.status === 'accepted' ? 'default' : 'secondary'}>
                        {friend.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {friend.status === 'accepted' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startConversation(friend.email)}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => shareRecipe(friend.email)}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemoveFriend(friend.id, friend.email)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CommunityFunctions;