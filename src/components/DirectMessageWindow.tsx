import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Send, X, User } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: string;
  sender_id: string;
  sender_username: string;
  recipient_id: string;
  content: string;
  created_at: string;
}

interface DirectMessageWindowProps {
  recipientId: string;
  recipientUsername: string;
  onClose: () => void;
}

const DirectMessageWindow: React.FC<DirectMessageWindowProps> = ({ recipientId, recipientUsername, onClose }) => {
  const { user } = useAppContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
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

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`dm_chat_${user?.id}_${recipientId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${user?.id}`,
      }, (payload) => {
        const newMessage = payload.new as Message;
        // Only add if the message is from the current recipient or sent by current user to recipient
        if (
          (newMessage.sender_id === recipientId && newMessage.recipient_id === user?.id) ||
          (newMessage.sender_id === user?.id && newMessage.recipient_id === recipientId)
        ) {
          setMessages((prevMessages) => [...prevMessages, newMessage]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, recipientId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!user || !newMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          sender_username: user.username || user.email?.split('@')[0] || 'User',
          recipient_id: recipientId,
          content: newMessage.trim(),
          message_type: 'text',
          read: false, // Mark as unread for recipient
        });

      if (error) throw error;
      setNewMessage('');
      // Optimistically add message to UI
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: Math.random().toString(36).substring(2, 15), // Temp ID
          sender_id: user.id,
          sender_username: user.username || user.email?.split('@')[0] || 'User',
          recipient_id: recipientId,
          content: newMessage.trim(),
          created_at: new Date().toISOString(),
        },
      ]);
      scrollToBottom();
    } catch (error: any) {
      toast({
        title: 'Error sending message',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <Card className="fixed bottom-4 right-4 w-80 h-96 flex flex-col shadow-lg border-border/50 bg-card animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 border-b border-border">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <User className="h-4 w-4" />
          Chat with {recipientUsername}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose} className="p-1 h-auto">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 p-3 overflow-hidden flex flex-col">
        <ScrollArea className="flex-1 pr-2 custom-scrollbar">
          <div className="space-y-2">
            {loading ? (
              <div className="text-center text-muted-foreground text-sm">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm">Say hello!</div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] p-2 rounded-lg text-sm ${
                      msg.sender_id === user?.id
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-muted text-foreground rounded-bl-none'
                    }`}
                  >
                    <p className="font-medium text-xs mb-1">
                      {msg.sender_id === user?.id ? 'You' : msg.sender_username}
                    </p>
                    {msg.content}
                    <p className="text-right text-xs opacity-70 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>
      <div className="p-3 border-t border-border flex gap-2">
        <Input
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          className="flex-1"
        />
        <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};

export default DirectMessageWindow;