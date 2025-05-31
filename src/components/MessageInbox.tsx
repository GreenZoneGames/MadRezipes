import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Send, Users } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import ThreadedMessage from './ThreadedMessage';

interface Message {
  id: string;
  sender_id: string;
  sender_username: string;
  recipient_id: string;
  parent_message_id?: string;
  thread_id?: string;
  message_type: 'text' | 'recipe';
  content: string;
  recipe_data?: any;
  created_at: string;
  read: boolean;
  replies?: Message[];
}

interface MessageInboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MessageInbox: React.FC<MessageInboxProps> = ({ open, onOpenChange }) => {
  const { user, friends } = useAppContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFriend, setSelectedFriend] = useState('');
  const [sending, setSending] = useState(false);

  const fetchMessages = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`recipient_id.eq.${user.id},sender_id.eq.${user.id}`) // Fetch messages where user is sender or recipient
        .is('parent_message_id', null) // Only fetch top-level messages
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const messagesWithReplies = await Promise.all(
        (data || []).map(async (msg) => {
          const { data: replies } = await supabase
            .from('messages')
            .select('*')
            .eq('thread_id', msg.thread_id || msg.id) // Fetch replies belonging to the same thread
            .not('id', 'eq', msg.id) // Exclude the parent message itself
            .order('created_at', { ascending: true });
          
          return { ...msg, replies: replies || [] };
        })
      );
      
      setMessages(messagesWithReplies);
    } catch (error: any) {
      toast({
        title: 'Error loading messages',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('id', messageId)
        .eq('recipient_id', user?.id); // Ensure only recipient can mark as read
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, read: true } : msg
        )
      );
    } catch (error: any) {
      console.error('Error marking message as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!user || !newMessage.trim() || !selectedFriend) return;
    
    setSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          sender_username: user.username || user.email?.split('@')[0] || 'User',
          recipient_id: selectedFriend,
          content: newMessage.trim(),
          message_type: 'text'
        });
      
      if (error) throw error;
      
      setNewMessage('');
      setSelectedFriend('');
      setShowCompose(false);
      toast({
        title: 'Message sent!',
        description: 'Your message has been sent successfully.'
      });
      fetchMessages(); // Re-fetch messages to show the new one
    } catch (error: any) {
      toast({
        title: 'Error sending message',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const handleReply = async (parentId: string, content: string) => {
    if (!user) return;
    
    const parentMessage = messages.find(m => m.id === parentId);
    if (!parentMessage) return;
    
    // Determine the actual recipient of the reply (the original sender of the parent message)
    const replyRecipientId = parentMessage.sender_id;

    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        sender_username: user.username || user.email?.split('@')[0] || 'User',
        recipient_id: replyRecipientId,
        parent_message_id: parentId,
        thread_id: parentMessage.thread_id || parentId, // Use existing thread_id or parentId if new thread
        content,
        message_type: 'text'
      });
    
    if (error) throw error;
    
    fetchMessages(); // Re-fetch messages to update the thread
  };

  useEffect(() => {
    if (open && user) {
      fetchMessages();
    }
  }, [open, user]);

  const unreadCount = messages.filter(msg => !msg.read && msg.recipient_id === user?.id).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Messages {unreadCount > 0 && <Badge variant="destructive">{unreadCount}</Badge>}
            </div>
            <Button
              size="sm"
              onClick={() => setShowCompose(!showCompose)}
              className="flex items-center gap-1"
            >
              <Send className="h-4 w-4" />
              New Message
            </Button>
          </div>
        </DialogHeader>
        
        {showCompose && (
          <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
            <div className="space-y-2">
              <label className="text-sm font-medium">Send to:</label>
              <select
                value={selectedFriend}
                onChange={(e) => setSelectedFriend(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Select a friend...</option>
                {friends.filter(f => f.status === 'accepted').map(friend => (
                  <option key={friend.id} value={friend.friend_id === user?.id ? friend.user_id : friend.friend_id}>
                    {friend.email}
                  </option>
                ))}
              </select>
            </div>
            <Textarea
              placeholder="Write your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex gap-2">
              <Button
                onClick={sendMessage}
                disabled={sending || !newMessage.trim() || !selectedFriend}
              >
                {sending ? 'Sending...' : 'Send Message'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCompose(false);
                  setNewMessage('');
                  setSelectedFriend('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
        
        <div className="space-y-3 min-h-[200px]"> {/* Added min-h to prevent resizing */}
          {loading ? (
            <div className="text-center py-4 text-muted-foreground"> {/* Adjusted padding */}
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground"> {/* Adjusted padding */}
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No messages yet</p>
              <p className="text-xs">Start a conversation with your friends!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} onClick={() => !message.read && message.recipient_id === user?.id && markAsRead(message.id)}>
                <ThreadedMessage
                  message={message}
                  onReply={handleReply}
                />
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MessageInbox;