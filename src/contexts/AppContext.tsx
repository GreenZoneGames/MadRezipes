import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/components/ui/use-toast'; // Import toast for notifications

interface User {
  id: string;
  email: string;
  username?: string;
  avatar_url?: string; // New
  bio?: string; // New
  favorite_recipe_id?: string; // New
}

interface Cookbook {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  is_public: boolean; // New
}

interface Friend {
  id: string;
  user_id: string; // The ID of the user who sent/received the request
  friend_id: string; // The ID of the friend (the other user)
  email: string; // The email of the friend (for display)
  username?: string; // Added username field
  status: 'pending' | 'accepted';
}

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
  meal_type?: string; // Changed to snake_case
  cookbook_id?: string; // Changed to snake_case
}

interface AppContextType {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  user: User | null;
  cookbooks: Cookbook[];
  selectedCookbook: Cookbook | null;
  friends: Friend[];
  guestCookbooks: Cookbook[]; // New state for guest cookbooks
  guestRecipes: Recipe[]; // New state for guest recipes
  setGuestRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>; // Added to default context
  setSelectedCookbook: (cookbook: Cookbook | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username?: string, securityQuestion?: string, securityAnswer?: string, avatarUrl?: string, bio?: string) => Promise<void>;
  signOut: () => Promise<void>;
  createCookbook: (name: string, description?: string, isPublic?: boolean) => Promise<Cookbook | null>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>; // New
  updateCookbookPrivacy: (cookbookId: string, isPublic: boolean) => Promise<void>; // New
  deleteCookbook: (cookbookId: string) => Promise<void>; // New
  copyCookbook: (cookbookId: string, newName: string, isPublic: boolean) => Promise<void>; // New
  addFriend: (email: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  acceptFriendRequest: (requestId: string, friendUserId: string) => Promise<void>; // New function
  rejectFriendRequest: (requestId: string) => Promise<void>; // New function
  addRecipeToCookbook: (recipe: Recipe, cookbookId: string) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  syncGuestDataToUser: () => Promise<void>; // New function to sync guest data
}

const defaultAppContext: AppContextType = {
  sidebarOpen: false,
  toggleSidebar: () => {},
  user: null,
  cookbooks: [],
  selectedCookbook: null,
  friends: [],
  guestCookbooks: [],
  guestRecipes: [],
  setGuestRecipes: () => {}, // Dummy function added here
  setSelectedCookbook: () => {},
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  createCookbook: async () => null,
  updateUserProfile: async () => {}, // Dummy
  updateCookbookPrivacy: async () => {}, // Dummy
  deleteCookbook: async () => {}, // Dummy
  copyCookbook: async () => {}, // Dummy
  addFriend: async () => {},
  removeFriend: async () => {},
  acceptFriendRequest: async () => {}, // Dummy function
  rejectFriendRequest: async () => {}, // Dummy function
  addRecipeToCookbook: async () => {},
  sendPasswordResetEmail: async () => {},
  syncGuestDataToUser: async () => {},
};

const AppContext = createContext<AppContextType>(defaultAppContext);

export const useAppContext = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [cookbooks, setCookbooks] = useState<Cookbook[]>([]);
  const [selectedCookbook, setSelectedCookbook] = useState<Cookbook | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [guestCookbooks, setGuestCookbooks] = useState<Cookbook[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('guestCookbooks');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [guestRecipes, setGuestRecipes] = useState<Recipe[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('guestRecipes');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('guestCookbooks', JSON.stringify(guestCookbooks));
    }
  }, [guestCookbooks]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('guestRecipes', JSON.stringify(guestRecipes));
    }
  }, [guestRecipes]);

  const loadCookbooks = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('cookbooks')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      setCookbooks(data || []);
    } catch (error) {
      console.error('Load cookbooks error:', error);
    }
  };

  const loadFriends = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('friends')
        .select(`
          id,
          user_id,
          friend_id,
          status,
          users!friends_friend_id_fkey (
            email,
            username
          )
        `)
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`); // Fetch requests where current user is sender or recipient
      
      if (error) throw error;

      const formattedFriends: Friend[] = (data || []).map((item: any) => {
        // Determine which user in the 'friends' relationship is the actual 'friend' from the perspective of 'userId'
        const friendUserData = item.users; // This refers to the 'friend_id' user's data
        
        return {
          id: item.id,
          user_id: item.user_id,
          friend_id: item.friend_id,
          email: friendUserData.email,
          username: friendUserData.username,
          status: item.status,
        };
      });
      
      setFriends(formattedFriends);
    } catch (error) {
      console.error('Load friends error:', error);
    }
  };

  const syncGuestDataToUser = useCallback(async () => {
    if (!user || (guestCookbooks.length === 0 && guestRecipes.length === 0)) {
      return;
    }

    console.log('Syncing guest data to user account...');
    const cookbookIdMap: { [guestId: string]: string } = {};
    const newCookbooks: Cookbook[] = [];
    const newRecipes: Recipe[] = [];

    try {
      // 1. Insert guest cookbooks
      for (const guestCb of guestCookbooks) {
        const { data: newCb, error: cbError } = await supabase
          .from('cookbooks')
          .insert({ name: guestCb.name, description: guestCb.description, user_id: user.id, is_public: guestCb.is_public }) // Include is_public
          .select()
          .single();
        
        if (cbError) {
          console.error('Error inserting guest cookbook:', cbError);
          continue;
        }
        cookbookIdMap[guestCb.id] = newCb.id;
        newCookbooks.push(newCb);
      }

      // 2. Insert guest recipes
      for (const guestRecipe of guestRecipes) {
        const newCookbookId = guestRecipe.cookbook_id ? cookbookIdMap[guestRecipe.cookbook_id] : null;
        
        const { error: recipeError } = await supabase
          .from('recipes')
          .insert({
            user_id: user.id,
            cookbook_id: newCookbookId,
            title: guestRecipe.title,
            ingredients: guestRecipe.ingredients,
            instructions: guestRecipe.instructions,
            url: guestRecipe.url,
            image: guestRecipe.image,
            cook_time: guestRecipe.cook_time,
            servings: guestRecipe.servings,
            meal_type: guestRecipe.meal_type,
            categorized_ingredients: guestRecipe.categorized_ingredients,
          });
        
        if (recipeError) {
          console.error('Error inserting guest recipe:', recipeError);
          continue;
        }
        newRecipes.push(guestRecipe); // Just for logging/confirmation, actual data comes from DB reload
      }

      console.log(`Synced ${newCookbooks.length} cookbooks and ${newRecipes.length} recipes.`);
      
      // Clear guest data after successful sync
      setGuestCookbooks([]);
      setGuestRecipes([]);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('guestCookbooks');
        localStorage.removeItem('guestRecipes');
      }

      // Invalidate queries to refetch user's actual data from Supabase
      queryClient.invalidateQueries({ queryKey: ['cookbooks', user.id] });
      queryClient.invalidateQueries({ queryKey: ['recipes', user.id] });

    } catch (error) {
      console.error('Error syncing guest data:', error);
    }
  }, [user, guestCookbooks, guestRecipes, queryClient]);

  const checkUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: userData, error: fetchUserError } = await supabase
          .from('users')
          .select('*, favorite_recipe:recipes(id, title)') // Select favorite recipe details
          .eq('id', session.user.id) // Use ID for direct lookup
          .single();
        
        if (fetchUserError && fetchUserError.code === 'PGRST116') { // PGRST116 means no rows found
          console.warn('User session exists but profile data not found in public.users. Attempting to create profile.');
          // Attempt to create a basic profile if it's missing
          const { error: insertProfileError } = await supabase
            .from('users')
            .insert({
              id: session.user.id,
              email: session.user.email,
              username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || null,
              avatar_url: session.user.user_metadata?.avatar_url || null, // Include new fields
              bio: session.user.user_metadata?.bio || null, // Include new fields
            });

          if (insertProfileError) {
            console.error('Error creating missing user profile:', insertProfileError);
            // If we can't even create a basic profile, something is seriously wrong.
            // Sign out to prevent an inconsistent state.
            await supabase.auth.signOut();
            setUser(null);
          } else {
            // Profile successfully created, now fetch it to set the user state
            const { data: newUserData, error: fetchNewUserError } = await supabase
              .from('users')
              .select('*, favorite_recipe:recipes(id, title)')
              .eq('id', session.user.id)
              .single();

            if (fetchNewUserError || !newUserData) {
              console.error('Error fetching newly created user profile:', fetchNewUserError);
              await supabase.auth.signOut();
              setUser(null);
            } else {
              setUser(newUserData);
              loadCookbooks(newUserData.id);
              loadFriends(newUserData.id);
              if (guestCookbooks.length > 0 || guestRecipes.length > 0) {
                syncGuestDataToUser();
              }
            }
          }
        } else if (fetchUserError) {
          console.error('Error fetching user data:', fetchUserError);
          await supabase.auth.signOut(); // Sign out on other fetch errors
          setUser(null);
        } else if (userData) {
          setUser(userData);
          loadCookbooks(userData.id);
          loadFriends(userData.id);
          // Sync guest data after user is set and their data is loaded
          if (guestCookbooks.length > 0 || guestRecipes.length > 0) {
            syncGuestDataToUser();
          }
        }
      } else {
        setUser(null);
        setCookbooks([]); // Clear Supabase cookbooks if logged out
        setFriends([]); // Clear Supabase friends if logged out
      }
    } catch (error) {
      console.error('Check user error:', error);
      // If there's an error checking user, assume logged out state
      setUser(null);
    }
  }, [guestCookbooks, guestRecipes, syncGuestDataToUser]);

  useEffect(() => {
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
      checkUser(); // Re-check user on auth state change
    });

    return () => subscription.unsubscribe();
  }, [checkUser]);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // checkUser will handle setting user and syncing data
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, username?: string, securityQuestion?: string, securityAnswer?: string, avatarUrl?: string, bio?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            username,
            security_question: securityQuestion,
            security_answer: securityAnswer,
            avatar_url: avatarUrl,
            bio: bio,
          }
        }
      });
      if (error) throw error;
      
      if (data.user) {
        // The handle_new_user trigger should now automatically insert into public.users
        // with the user_metadata. No need for explicit insert here.
      }
      // checkUser will handle setting user and syncing data
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCookbooks([]);
    setSelectedCookbook(null);
    setFriends([]);
    setGuestCookbooks([]); // Clear guest data on explicit sign out
    setGuestRecipes([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('guestCookbooks');
      localStorage.removeItem('guestRecipes');
    }
  };

  const createCookbook = async (name: string, description?: string, isPublic: boolean = false): Promise<Cookbook | null> => {
    if (!user) {
      // Guest mode: Check for existing guest cookbook by name
      const existingGuestCookbook = guestCookbooks.find(cb => cb.name.toLowerCase() === name.toLowerCase());
      if (existingGuestCookbook) {
        toast({
          title: 'Cookbook Exists',
          description: `A temporary cookbook named "${name}" already exists.`,
          variant: 'destructive',
        });
        return existingGuestCookbook;
      }

      const newGuestCookbook: Cookbook = {
        id: uuidv4(),
        name,
        description,
        user_id: 'guest', // Placeholder for guest user
        is_public: isPublic, // Include is_public for guest cookbooks
      };
      setGuestCookbooks(prev => [...prev, newGuestCookbook]);
      return newGuestCookbook;
    }
    
    try {
      // Logged-in user: Check for existing cookbook by name and user_id
      const { data: existingCookbook, error: fetchError } = await supabase
        .from('cookbooks')
        .select('*')
        .eq('user_id', user.id)
        .ilike('name', name) // Case-insensitive check
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine
        throw fetchError;
      }

      if (existingCookbook) {
        toast({
          title: 'Cookbook Exists',
          description: `A cookbook named "${name}" already exists.`,
          variant: 'destructive',
        });
        return existingCookbook;
      }

      const { data, error } = await supabase
        .from('cookbooks')
        .insert({ name, description, user_id: user.id, is_public: isPublic })
        .select()
        .single();
      
      if (error) throw error;
      setCookbooks(prev => [...prev, data]);
      return data;
    } catch (error) {
      console.error('Create cookbook error:', error);
      throw error;
    }
  };

  const updateUserProfile = async (updates: Partial<User>) => {
    if (!user) throw new Error('User not logged in.');
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      setUser(data); // Update local user state
      queryClient.invalidateQueries({ queryKey: ['user', user.id] }); // Invalidate user query
    } catch (error) {
      console.error('Update user profile error:', error);
      throw error;
    }
  };

  const updateCookbookPrivacy = async (cookbookId: string, isPublic: boolean) => {
    if (!user) throw new Error('User not logged in.');
    try {
      const { data, error } = await supabase
        .from('cookbooks')
        .update({ is_public: isPublic })
        .eq('id', cookbookId)
        .eq('user_id', user.id) // Ensure user owns the cookbook
        .select()
        .single();
      
      if (error) throw error;
      setCookbooks(prev => prev.map(cb => cb.id === cookbookId ? data : cb)); // Update local state
      queryClient.invalidateQueries({ queryKey: ['cookbooks', user.id] }); // Invalidate cookbooks query
    } catch (error) {
      console.error('Update cookbook privacy error:', error);
      throw error;
    }
  };

  const deleteCookbook = async (cookbookId: string) => {
    if (!user) {
      // Guest mode: remove from local storage
      setGuestCookbooks(prev => prev.filter(cb => cb.id !== cookbookId));
      setGuestRecipes(prev => prev.filter(recipe => recipe.cookbook_id !== cookbookId));
      if (selectedCookbook?.id === cookbookId) {
        setSelectedCookbook(null); // Deselect if the deleted one was selected
      }
      return;
    }

    try {
      // First, delete all recipes associated with this cookbook
      const { error: deleteRecipesError } = await supabase
        .from('recipes')
        .delete()
        .eq('cookbook_id', cookbookId)
        .eq('user_id', user.id); // Ensure user owns the recipes

      if (deleteRecipesError) {
        console.error('Error deleting recipes for cookbook:', deleteRecipesError);
        throw deleteRecipesError;
      }

      // Then, delete the cookbook itself
      const { error: deleteCookbookError } = await supabase
        .from('cookbooks')
        .delete()
        .eq('id', cookbookId)
        .eq('user_id', user.id); // Ensure user owns the cookbook

      if (deleteCookbookError) {
        console.error('Error deleting cookbook:', deleteCookbookError);
        throw deleteCookbookError;
      }

      setCookbooks(prev => prev.filter(cb => cb.id !== cookbookId));
      if (selectedCookbook?.id === cookbookId) {
        setSelectedCookbook(null); // Deselect if the deleted one was selected
      }
      queryClient.invalidateQueries({ queryKey: ['cookbooks', user.id] });
      queryClient.invalidateQueries({ queryKey: ['recipes', user.id, cookbookId] }); // Invalidate recipes for this cookbook
    } catch (error) {
      console.error('Delete cookbook error:', error);
      throw error;
    }
  };

  const copyCookbook = async (cookbookId: string, newName: string, isPublic: boolean) => {
    if (!user) {
      throw new Error('You must be logged in to copy cookbooks.');
    }

    try {
      // 1. Fetch the source cookbook and its recipes
      const { data: sourceCookbook, error: sourceCookbookError } = await supabase
        .from('cookbooks')
        .select('*')
        .eq('id', cookbookId)
        .eq('is_public', true) // Only allow copying public cookbooks
        .single();

      if (sourceCookbookError || !sourceCookbook) {
        throw new Error('Public cookbook not found or not accessible.');
      }

      const { data: sourceRecipes, error: sourceRecipesError } = await supabase
        .from('recipes')
        .select('*')
        .eq('cookbook_id', cookbookId);

      if (sourceRecipesError) {
        throw sourceRecipesError;
      }

      // 2. Determine a unique name for the new cookbook
      let finalNewName = newName;
      let suffix = 0;
      let nameExists = true;

      while (nameExists) {
        const { data: existingCookbook, error: fetchError } = await supabase
          .from('cookbooks')
          .select('id')
          .eq('user_id', user.id)
          .ilike('name', finalNewName)
          .single();

        if (fetchError && fetchError.code === 'PGRST116') { // No rows found, name is unique
          nameExists = false;
        } else if (existingCookbook) { // Name exists, try another suffix
          suffix++;
          finalNewName = `${newName} (Copy ${suffix})`;
        } else { // Other error
          throw fetchError;
        }
      }

      // 3. Create a new cookbook for the current user with the unique name
      const { data: newCookbook, error: newCookbookError } = await supabase
        .from('cookbooks')
        .insert({
          name: finalNewName,
          description: sourceCookbook.description,
          user_id: user.id,
          is_public: isPublic,
        })
        .select()
        .single();

      if (newCookbookError) {
        throw newCookbookError;
      }

      // 4. Copy recipes to the new cookbook
      if (sourceRecipes && sourceRecipes.length > 0) {
        const recipesToInsert = sourceRecipes.map(recipe => ({
          user_id: user.id,
          cookbook_id: newCookbook.id,
          title: recipe.title,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          url: recipe.url,
          image: recipe.image,
          cook_time: recipe.cook_time,
          servings: recipe.servings,
          meal_type: recipe.meal_type,
          categorized_ingredients: recipe.categorized_ingredients,
        }));

        const { error: insertRecipesError } = await supabase
          .from('recipes')
          .insert(recipesToInsert);

        if (insertRecipesError) {
          // If recipe insertion fails, consider deleting the newly created cookbook to clean up
          await supabase.from('cookbooks').delete().eq('id', newCookbook.id);
          throw insertRecipesError;
        }
      }

      // 5. Update local state and invalidate queries
      setCookbooks(prev => [...prev, newCookbook]);
      setSelectedCookbook(newCookbook); // Select the newly copied cookbook
      queryClient.invalidateQueries({ queryKey: ['cookbooks', user.id] });
      queryClient.invalidateQueries({ queryKey: ['recipes', user.id, newCookbook.id] });

      toast({
        title: 'Cookbook Copied!',
        description: `"${sourceCookbook.name}" has been copied to your cookbooks as "${finalNewName}".`,
      });

    } catch (error: any) {
      console.error('Error copying cookbook:', error);
      toast({
        title: 'Failed to Copy Cookbook',
        description: error.message || 'An error occurred while copying the cookbook.',
        variant: 'destructive',
      });
    }
  };

  const addFriend = async (email: string) => {
    if (!user) {
      throw new Error('You must be logged in to send friend requests.');
    }

    // First, find the recipient's user ID
    const { data: recipientUser, error: recipientError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (recipientError || !recipientUser) {
      throw new Error('User with this email not found.');
    }

    if (recipientUser.id === user.id) {
      throw new Error('You cannot send a friend request to yourself.');
    }

    // Check if a request already exists (either way)
    const { data: existingRequest, error: existingError } = await supabase
      .from('friends')
      .select('*')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${recipientUser.id}),and(user_id.eq.${recipientUser.id},friend_id.eq.${user.id})`);

    if (existingError) throw existingError;

    if (existingRequest && existingRequest.length > 0) {
      if (existingRequest[0].status === 'pending') {
        throw new Error('Friend request already pending.');
      } else if (existingRequest[0].status === 'accepted') {
        throw new Error('You are already friends with this user.');
      }
    }
    
    try {
      const { error } = await supabase
        .from('friends')
        .insert({ user_id: user.id, friend_id: recipientUser.id, status: 'pending' });
      
      if (error) throw error;
      // Reload friends list to show the new pending request
      await loadFriends(user.id);
    } catch (error) {
      console.error('Add friend error:', error);
      throw error;
    }
  };

  const removeFriend = async (friendshipId: string) => {
    if (!user) return; 
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', friendshipId)
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`); // Ensure current user is part of the friendship
      
      if (error) throw error;
      await loadFriends(user.id); // Reload friends list
    } catch (error) {
      console.error('Remove friend error:', error);
      throw error;
    }
  };

  const acceptFriendRequest = async (requestId: string, friendUserId: string) => {
    if (!user) return;
    try {
      // Update the status of the existing request to 'accepted'
      const { error: updateError } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', requestId)
        .eq('friend_id', user.id); // Ensure current user is the recipient of this request

      if (updateError) throw updateError;

      // Create a reciprocal entry for the other user if it doesn't exist
      // This ensures both sides of the relationship are recorded as 'accepted'
      const { data: existingReciprocal, error: reciprocalCheckError } = await supabase
        .from('friends')
        .select('id')
        .eq('user_id', user.id)
        .eq('friend_id', friendUserId)
        .single();

      if (reciprocalCheckError && reciprocalCheckError.code !== 'PGRST116') { // PGRST116 means no rows found
        throw reciprocalCheckError;
      }

      if (!existingReciprocal) {
        const { error: insertError } = await supabase
          .from('friends')
          .insert({ user_id: user.id, friend_id: friendUserId, status: 'accepted' });
        if (insertError) throw insertError;
      }
      
      await loadFriends(user.id); // Reload friends list
    } catch (error) {
      console.error('Accept friend request error:', error);
      throw error;
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', requestId)
        .eq('friend_id', user.id); // Ensure current user is the recipient of this request
      
      if (error) throw error;
      await loadFriends(user.id); // Reload friends list
    } catch (error) {
      console.error('Reject friend request error:', error);
      throw error;
    }
  };

  const addRecipeToCookbook = async (recipe: Recipe, cookbookId: string) => {
    if (!user) {
      // Guest mode: add to local storage
      const isDuplicate = guestRecipes.some(
        (r) => r.cookbook_id === cookbookId && r.title === recipe.title && r.url === recipe.url
      );

      if (isDuplicate) {
        toast({
          title: 'Duplicate Recipe',
          description: `"${recipe.title}" is already in this cookbook.`,
          variant: 'destructive',
        });
        return;
      }

      const newGuestRecipe: Recipe = {
        ...recipe,
        id: recipe.id || uuidv4(), // Ensure recipe has an ID
        cookbook_id: cookbookId,
      };
      setGuestRecipes(prev => [...prev, newGuestRecipe]);
      toast({
        title: 'Recipe Added!',
        description: `${recipe.title} has been added to your temporary cookbook. Sign in to save it permanently!`,
      });
      return;
    }
    
    try {
      // Check for duplicate in Supabase
      const { data: existingRecipes, error: fetchError } = await supabase
        .from('recipes')
        .select('id')
        .eq('user_id', user.id)
        .eq('cookbook_id', cookbookId)
        .eq('title', recipe.title)
        .eq('url', recipe.url);

      if (fetchError) throw fetchError;

      if (existingRecipes && existingRecipes.length > 0) {
        toast({
          title: 'Duplicate Recipe',
          description: `"${recipe.title}" is already in this cookbook.`,
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase
        .from('recipes')
        .insert({
          user_id: user.id,
          cookbook_id: cookbookId,
          title: recipe.title,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          url: recipe.url,
          image: recipe.image,
          cook_time: recipe.cook_time,
          servings: recipe.servings,
          meal_type: recipe.meal_type,
          categorized_ingredients: recipe.categorized_ingredients,
        })
        .select()
        .single();
      
      if (error) throw error;
      console.log('Recipe added to cookbook:', data);
      toast({
        title: 'Recipe Added!',
        description: `${recipe.title} has been added to your cookbook.`,
      });
    } catch (error) {
      console.error('Error adding recipe to cookbook:', error);
      throw error;
    }
  };

  const sendPasswordResetEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    } catch (error) {
      console.error('Password reset email error:', error);
      throw error;
    }
  };

  return (
    <AppContext.Provider
      value={{
        sidebarOpen,
        toggleSidebar,
        user,
        cookbooks,
        selectedCookbook,
        friends,
        guestCookbooks,
        guestRecipes,
        setGuestRecipes,
        setSelectedCookbook,
        signIn,
        signUp,
        signOut,
        createCookbook,
        updateUserProfile, // Added
        updateCookbookPrivacy, // Added
        deleteCookbook, // Added
        copyCookbook, // Added
        addFriend,
        removeFriend,
        acceptFriendRequest,
        rejectFriendRequest,
        addRecipeToCookbook,
        sendPasswordResetEmail,
        syncGuestDataToUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};