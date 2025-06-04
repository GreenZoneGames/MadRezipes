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
  is_owner?: boolean; // Added for UI convenience
  is_collaborator?: boolean; // Added for UI convenience
}

interface CookbookInvitation {
  id: string;
  cookbook_id: string;
  cookbook_name: string;
  invited_by_user_id: string;
  invited_by_username: string;
  status: 'pending' | 'accepted' | 'rejected';
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
  meal_type?: 'Breakfast' | 'Lunch' | 'Dinner' | 'Appetizer' | 'Dessert' | 'Snack' | string; // Changed to snake_case
  cookbook_id?: string; // Changed to snake_case
  position?: number; // Added position for ordering
}

export interface MealPlanEntry { // Renamed to avoid conflict with MealPlan interface in MealPlanner
  date: string;
  recipe: Recipe;
  mealType?: 'breakfast' | 'lunch' | 'dinner';
}

interface SavedMealPlan {
  id: string;
  user_id: string;
  name: string;
  month: string;
  year: number;
  plan_data: MealPlanEntry[];
  created_at: string;
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
  savedMealPlans: SavedMealPlan[]; // New state for saved meal plans
  cookbookInvitations: CookbookInvitation[]; // New state for cookbook invitations
  hasShownWelcomeToast: boolean; // New: Track if welcome toast has been shown for current session
  setGuestRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>; // Added to default context
  setSelectedCookbook: (cookbook: Cookbook | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username?: string, securityQuestion?: string, securityAnswer?: string, avatarUrl?: string, bio?: string) => Promise<void>;
  signOut: () => Promise<void>;
  createCookbook: (name: string, description?: string, isPublic?: boolean) => Promise<Cookbook | null>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>; // New
  updateCookbookPrivacy: (cookbookId: string, isPublic: boolean) => Promise<void>; // New
  deleteCookbook: (cookbookId: string) => Promise<void>; // New
  deleteRecipe: (recipeId: string, cookbookId?: string) => Promise<void>; // New: Delete single recipe
  copyCookbook: (cookbookId: string, newName: string, isPublic: boolean) => Promise<void>; // New
  addFriend: (email: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  acceptFriendRequest: (requestId: string, friendUserId: string) => Promise<void>; // New function
  rejectFriendRequest: (requestId: string) => Promise<void>; // New function
  addRecipeToCookbook: (recipe: Recipe, cookbookId: string) => Promise<void>;
  updateRecipeOrder: (cookbookId: string, orderedRecipeIds: string[]) => Promise<void>; // New function
  sendPasswordResetEmail: (email: string) => Promise<void>;
  syncGuestDataToUser: () => Promise<void>; // New function to sync guest data
  saveMealPlan: (name: string, month: string, year: number, planData: MealPlanEntry[]) => Promise<void>; // New
  loadMealPlans: (userId: string) => Promise<void>; // New
  deleteMealPlan: (planId: string) => Promise<void>; // New
  inviteCollaborator: (cookbookId: string, collaboratorEmail: string) => Promise<void>; // New
  acceptCookbookInvitation: (invitationId: string) => Promise<void>; // New
  rejectCookbookInvitation: (invitationId: string) => Promise<void>; // New
  removeCollaborator: (cookbookId: string, collaboratorUserId: string) => Promise<void>; // New
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
  savedMealPlans: [], // Default for new state
  cookbookInvitations: [], // Default for new state
  hasShownWelcomeToast: false, // Default for new state
  setGuestRecipes: () => {}, // Dummy function added here
  setSelectedCookbook: () => {},
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  createCookbook: async () => null,
  updateUserProfile: async () => {}, // Dummy
  updateCookbookPrivacy: async () => {}, // Dummy
  deleteCookbook: async () => {}, // Dummy
  deleteRecipe: async () => {}, // Dummy
  copyCookbook: async () => {}, // Dummy
  addFriend: async () => {},
  removeFriend: async () => {},
  acceptFriendRequest: async () => {}, // Dummy function
  rejectFriendRequest: async () => {}, // Dummy function
  addRecipeToCookbook: async () => {},
  updateRecipeOrder: async () => {}, // Dummy
  sendPasswordResetEmail: async () => {},
  syncGuestDataToUser: async () => {},
  saveMealPlan: async () => {}, // Dummy
  loadMealPlans: async () => {}, // Dummy
  deleteMealPlan: async () => {}, // Dummy
  inviteCollaborator: async () => {}, // Dummy
  acceptCookbookInvitation: async () => {}, // Dummy
  rejectCookbookInvitation: async () => {}, // Dummy
  removeCollaborator: async () => {}, // Dummy
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
  const [savedMealPlans, setSavedMealPlans] = useState<SavedMealPlan[]>([]); // New state
  const [cookbookInvitations, setCookbookInvitations] = useState<CookbookInvitation[]>([]); // New state
  const [hasShownWelcomeToast, setHasShownWelcomeToast] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('welcomeToastShown') === 'true';
    }
    return false;
  });
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

  const loadCookbooks = useCallback(async (userId: string) => {
    try {
      // Fetch cookbooks owned by the user
      const { data: ownedCookbooks, error: ownedError } = await supabase
        .from('cookbooks')
        .select('*')
        .eq('user_id', userId);
      if (ownedError) throw ownedError;

      // Fetch cookbooks where the user is a collaborator
      const { data: collaboratedCookbooksData, error: collabError } = await supabase
        .from('cookbook_collaborators')
        .select(`
          cookbook_id,
          cookbooks (
            id,
            name,
            description,
            user_id,
            is_public
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'accepted');
      if (collabError) throw collabError;

      const collaboratedCookbooks: Cookbook[] = (collaboratedCookbooksData || [])
        .map((item: any) => ({
          ...item.cookbooks,
          is_owner: false,
          is_collaborator: true,
        }));

      const allCookbooks: Cookbook[] = [
        ...(ownedCookbooks || []).map(cb => ({ ...cb, is_owner: true, is_collaborator: false })),
        ...collaboratedCookbooks,
      ];

      // Filter out duplicates if a user owns and is also a collaborator (shouldn't happen with current RLS but good practice)
      const uniqueCookbooks = Array.from(new Map(allCookbooks.map(cb => [cb.id, cb])).values());

      setCookbooks(uniqueCookbooks);
    } catch (error) {
      console.error('Load cookbooks error:', error);
    }
  }, [setCookbooks]); // Removed selectedCookbook from dependencies

  // New useEffect to manage selectedCookbook based on available cookbooks
  useEffect(() => {
    const currentCookbookList = user ? cookbooks : guestCookbooks;
    if (currentCookbookList.length > 0 && !selectedCookbook) {
      setSelectedCookbook(currentCookbookList[0]);
    } else if (selectedCookbook && !currentCookbookList.some(cb => cb.id === selectedCookbook.id)) {
      // If the currently selected cookbook is no longer in the list, deselect it
      setSelectedCookbook(null);
    }
  }, [user, cookbooks, guestCookbooks, selectedCookbook, setSelectedCookbook]);


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

  const loadMealPlans = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSavedMealPlans(data || []);
    } catch (error) {
      console.error('Error loading meal plans', error);
      toast({
        title: 'Error loading meal plans',
        description: 'Failed to fetch your saved meal plans.',
        variant: 'destructive'
      });
    }
  }, [setSavedMealPlans]);

  const loadCookbookInvitations = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('cookbook_collaborators')
        .select(`
          id,
          cookbook_id,
          status,
          cookbooks(name),
          invited_by_user:users!cookbook_collaborators_invited_by_user_id_fkey(username, email)
        `)
        .eq('user_id', userId)
        .eq('status', 'pending');
      
      if (error) throw error;

      const invitations: CookbookInvitation[] = (data || []).map((item: any) => ({
        id: item.id,
        cookbook_id: item.cookbook_id,
        cookbook_name: item.cookbooks.name,
        invited_by_user_id: item.invited_by_user.id, // Assuming ID is available, though not explicitly selected
        invited_by_username: item.invited_by_user.username || item.invited_by_user.email.split('@')[0],
        status: item.status,
      }));
      setCookbookInvitations(invitations);
    } catch (error) {
      console.error('Error loading cookbook invitations:', error);
    }
  }, [setCookbookInvitations]);

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
        
        // Get max position for the new cookbook to assign a sequential position
        const { data: maxPositionData, error: maxPosError } = await supabase
          .from('recipes')
          .select('position')
          .eq('cookbook_id', newCookbookId)
          .order('position', { ascending: false })
          .limit(1)
          .single();
        
        const newPosition = (maxPositionData?.position || -1) + 1;

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
            position: newPosition, // Assign position
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
  }, [user, guestCookbooks, guestRecipes, queryClient, setGuestCookbooks, setGuestRecipes]);

  const checkUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // First, sync guest data if any, before loading user-specific data
        if (guestCookbooks.length > 0 || guestRecipes.length > 0) {
          await syncGuestDataToUser(); 
        }

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
              await loadCookbooks(newUserData.id); // Ensure cookbooks are loaded
              loadFriends(newUserData.id);
              loadMealPlans(newUserData.id); // Load meal plans on login
              loadCookbookInvitations(newUserData.id); // Load invitations on login
            }
          }
        } else if (fetchUserError) {
          console.error('Error fetching user data:', fetchUserError);
          await supabase.auth.signOut(); // Sign out on other fetch errors
          setUser(null);
        } else if (userData) {
          setUser(userData);
          await loadCookbooks(userData.id); // Ensure cookbooks are loaded
          loadFriends(userData.id);
          loadMealPlans(userData.id); // Load meal plans on login
          loadCookbookInvitations(userData.id); // Load invitations on login
        }
      } else {
        setUser(null);
        setCookbooks([]); // Clear Supabase cookbooks if logged out
        setFriends([]); // Clear Supabase friends if logged out
        setSavedMealPlans([]); // Clear saved meal plans if logged out
        setCookbookInvitations([]); // Clear invitations if logged out
        // Do NOT clear guest data here, as it should persist until synced
      }
    } catch (error) {
      console.error('Check user error:', error);
      // If there's an error checking user, assume logged out state
      setUser(null);
    }
  }, [guestCookbooks, guestRecipes, syncGuestDataToUser, loadMealPlans, loadCookbookInvitations, loadCookbooks, setFriends, setSavedMealPlans, setCookbookInvitations]); // Added setters to dependencies

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
    setSavedMealPlans([]); // Clear saved meal plans on explicit sign out
    setCookbookInvitations([]); // Clear invitations on explicit sign out
    setHasShownWelcomeToast(false); // Reset welcome toast state
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('welcomeToastShown'); // Clear session storage flag
    }
    // Do NOT clear guest data here, as it should persist until synced
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
      setSelectedCookbook(newGuestCookbook); // Set as selected immediately
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
      setSelectedCookbook(data); // Set as selected immediately
      queryClient.invalidateQueries({ queryKey: ['cookbooks', user.id] }); // Re-fetch to ensure consistency
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
      setGuestRecipes(prev => prev.filter(recipe => recipe.cookbook_id === cookbookId));
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

  const deleteRecipe = async (recipeId: string, cookbookId?: string) => {
    if (!user) {
      // Guest mode: remove from local storage
      setGuestRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
      toast({ title: 'Recipe Removed', description: 'Recipe removed from your temporary collection.' });
      return;
    }

    try {
      // Determine the user_id associated with the recipe's cookbook
      let ownerId = user.id; // Assume current user is owner by default
      if (cookbookId) {
        const { data: cookbookData, error: cookbookError } = await supabase
          .from('cookbooks')
          .select('user_id')
          .eq('id', cookbookId)
          .single();
        
        if (cookbookError || !cookbookData) {
          throw new Error('Cookbook not found or inaccessible.');
        }
        ownerId = cookbookData.user_id;
      }

      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', recipeId)
        .eq('user_id', ownerId); // Ensure deletion is by the recipe owner

      if (error) throw error;
      toast({ title: 'Recipe Removed', description: 'Recipe successfully removed.' });
      queryClient.invalidateQueries({ queryKey: ['recipes', ownerId, cookbookId] }); // Invalidate specific cookbook recipes
      queryClient.invalidateQueries({ queryKey: ['userRecipes', user.id] }); // Invalidate user's overall recipes
    } catch (error: any) {
      console.error('Delete recipe error:', error);
      toast({ title: 'Failed to Remove Recipe', description: error.message, variant: 'destructive' });
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
        .eq('cookbook_id', cookbookId)
        .order('position', { ascending: true }); // Order by position for copying

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
          .eq('user_id', user.id) // Corrected to user.id
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

      // 4. Copy recipes to the new cookbook, preserving order if possible
      if (sourceRecipes && sourceRecipes.length > 0) {
        const recipesToInsert = sourceRecipes.map((recipe, index) => ({
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
          position: index, // Assign new sequential position based on source order
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
      throw error;
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

  const inviteCollaborator = async (cookbookId: string, collaboratorEmail: string) => {
    if (!user) throw new Error('You must be logged in to invite collaborators.');

    // 1. Verify current user owns the cookbook
    const { data: cookbook, error: cookbookError } = await supabase
      .from('cookbooks')
      .select('id, user_id, name')
      .eq('id', cookbookId)
      .eq('user_id', user.id)
      .single();

    if (cookbookError || !cookbook) {
      throw new Error('Cookbook not found or you do not own it.');
    }

    // 2. Find the collaborator's user ID
    const { data: collaboratorUser, error: collabUserError } = await supabase
      .from('users')
      .select('id, username, email')
      .eq('email', collaboratorEmail)
      .single();

    if (collabUserError || !collaboratorUser) {
      throw new Error('Collaborator user with this email not found.');
    }

    if (collaboratorUser.id === user.id) {
      throw new Error('You cannot invite yourself to collaborate.');
    }

    // 3. Check if invitation or collaboration already exists
    const { data: existingCollab, error: existingCollabError } = await supabase
      .from('cookbook_collaborators')
      .select('*')
      .eq('cookbook_id', cookbookId)
      .eq('user_id', collaboratorUser.id);

    if (existingCollabError) throw existingCollabError;

    if (existingCollab && existingCollab.length > 0) {
      if (existingCollab[0].status === 'pending') {
        throw new Error('Invitation already pending for this user.');
      } else if (existingCollab[0].status === 'accepted') {
        throw new Error('This user is already a collaborator on this cookbook.');
      }
    }

    // 4. Insert the invitation
    try {
      const { error } = await supabase
        .from('cookbook_collaborators')
        .insert({
          cookbook_id: cookbookId,
          user_id: collaboratorUser.id,
          invited_by_user_id: user.id,
          status: 'pending',
          role: 'editor', // Default role for now
        });

      if (error) throw error;
      toast({
        title: 'Invitation Sent!',
        description: `Invitation sent to ${collaboratorUser.username || collaboratorUser.email} for "${cookbook.name}".`,
      });
      queryClient.invalidateQueries({ queryKey: ['cookbookCollaborators', cookbookId] }); // Invalidate to refetch collaborators
    } catch (error: any) {
      console.error('Error inviting collaborator:', error);
      toast({
        title: 'Failed to Send Invitation',
        description: error.message || 'An error occurred while sending the invitation.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const acceptCookbookInvitation = async (invitationId: string) => {
    if (!user) throw new Error('You must be logged in to accept invitations.');
    try {
      const { error } = await supabase
        .from('cookbook_collaborators')
        .update({ status: 'accepted' })
        .eq('id', invitationId)
        .eq('user_id', user.id)
        .eq('status', 'pending'); // Only accept pending invitations

      if (error) throw error;
      toast({
        title: 'Invitation Accepted!',
        description: 'You are now a collaborator on this cookbook.',
      });
      queryClient.invalidateQueries({ queryKey: ['cookbookInvitations', user.id] });
      queryClient.invalidateQueries({ queryKey: ['cookbooks', user.id] }); // Re-fetch cookbooks to show the new one
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast({
        title: 'Failed to Accept Invitation',
        description: error.message || 'An error occurred while accepting the invitation.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const rejectCookbookInvitation = async (invitationId: string) => {
    if (!user) throw new Error('You must be logged in to reject invitations.');
    try {
      const { error } = await supabase
        .from('cookbook_collaborators')
        .update({ status: 'rejected' }) // Or delete the entry
        .eq('id', invitationId)
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;
      toast({
        title: 'Invitation Rejected',
        description: 'The cookbook invitation has been declined.',
      });
      queryClient.invalidateQueries({ queryKey: ['cookbookInvitations', user.id] });
    }
    catch (error: any) {
      console.error('Error rejecting invitation:', error);
      toast({
        title: 'Failed to Reject Invitation',
        description: error.message || 'An error occurred while rejecting the invitation.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const removeCollaborator = async (cookbookId: string, collaboratorUserId: string) => {
    if (!user) throw new Error('You must be logged in to remove collaborators.');

    // Verify current user owns the cookbook
    const { data: cookbook, error: cookbookError } = await supabase
      .from('cookbooks')
      .select('id, user_id')
      .eq('id', cookbookId)
      .eq('user_id', user.id)
      .single();

    if (cookbookError || !cookbook) {
      throw new Error('Cookbook not found or you do not own it.');
    }

    try {
      const { error } = await supabase
        .from('cookbook_collaborators')
        .delete()
        .eq('cookbook_id', cookbookId)
        .eq('user_id', collaboratorUserId);

      if (error) throw error;
      toast({
        title: 'Collaborator Removed',
        description: 'The collaborator has been removed from the cookbook.',
      });
      queryClient.invalidateQueries({ queryKey: ['cookbookCollaborators', cookbookId] });
      queryClient.invalidateQueries({ queryKey: ['cookbooks', collaboratorUserId] }); // Invalidate collaborator's cookbooks
    } catch (error: any) {
      console.error('Error removing collaborator:', error);
      toast({
        title: 'Failed to Remove Collaborator',
        description: error.message || 'An error occurred while removing the collaborator.',
        variant: 'destructive',
      });
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
        position: guestRecipes.filter(r => r.cookbook_id === cookbookId).length, // Assign position for guest recipes
      };
      setGuestRecipes(prev => [...prev, newGuestRecipe]);
      console.log('AppContext - Added guest recipe:', newGuestRecipe);
      toast({
        title: 'Recipe Added!',
        description: `${recipe.title} has been added to your temporary cookbook. Sign in to save it permanently!`,
      });
      return;
    }
    
    try {
      // Check if user is owner or collaborator
      const { data: cookbookAccess, error: accessError } = await supabase
        .from('cookbooks')
        .select('user_id')
        .eq('id', cookbookId)
        .single();

      if (accessError || !cookbookAccess) {
        throw new Error('Cookbook not found or inaccessible.');
      }

      const isOwner = cookbookAccess.user_id === user.id;

      const { data: collaboratorStatus, error: collabStatusError } = await supabase
        .from('cookbook_collaborators')
        .select('status')
        .eq('cookbook_id', cookbookId)
        .eq('user_id', user.id)
        .single();

      const isAcceptedCollaborator = collaboratorStatus?.status === 'accepted';

      if (!isOwner && !isAcceptedCollaborator) {
        throw new Error('You do not have permission to add recipes to this cookbook.');
      }

      // Check for duplicate in Supabase
      const { data: existingRecipes, error: fetchError } = await supabase
        .from('recipes')
        .select('id')
        .eq('user_id', isOwner ? user.id : cookbookAccess.user_id) // If collaborator, check against owner's recipes
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

      // Get max position for the target cookbook
      const { data: maxPositionData, error: maxPosError } = await supabase
        .from('recipes')
        .select('position')
        .eq('cookbook_id', cookbookId)
        .order('position', { ascending: false })
        .limit(1)
        .single();
      
      const newPosition = (maxPositionData?.position || -1) + 1;

      const { data, error } = await supabase
        .from('recipes')
        .insert({
          user_id: isOwner ? user.id : cookbookAccess.user_id, // Recipes are owned by the cookbook owner
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
          position: newPosition, // Assign position
        })
        .select()
        .single();
      
      if (error) throw error;
      console.log('AppContext - Added DB recipe:', data);
      console.log('AppContext - Invalidating recipes query for cookbook:', cookbookId);
      toast({
        title: 'Recipe Added!',
        description: `${recipe.title} has been added to your cookbook.`,
      });
      queryClient.invalidateQueries({ queryKey: ['recipes', cookbookId] }); // Invalidate recipes for this cookbook
    } catch (error) {
      console.error('Error adding recipe to cookbook:', error);
      throw error;
    }
  };

  const updateRecipeOrder = async (cookbookId: string, orderedRecipeIds: string[]) => {
    if (!user) {
      // Guest mode: update local storage
      setGuestRecipes(prev => {
        const updatedRecipes = [...prev];
        const cookbookRecipes = updatedRecipes.filter(r => r.cookbook_id === cookbookId);
        const otherRecipes = updatedRecipes.filter(r => r.cookbook_id !== cookbookId);

        const reorderedCookbookRecipes = orderedRecipeIds.map((id, index) => {
          const recipe = cookbookRecipes.find(r => r.id === id);
          return recipe ? { ...recipe, position: index } : null;
        }).filter(Boolean) as Recipe[];

        return [...otherRecipes, ...reorderedCookbookRecipes];
      });
      return;
    }

    try {
      const updates = orderedRecipeIds.map((recipeId, index) => ({
        id: recipeId,
        position: index, // Assign new sequential position
      }));

      // Perform a batch update
      const { error } = await supabase
        .from('recipes')
        .upsert(updates, { onConflict: 'id' }); // Use upsert with onConflict to update existing rows

      if (error) {
        console.error('Error updating recipe order:', error);
        throw error;
      }
      queryClient.invalidateQueries({ queryKey: ['recipes', cookbookId] }); // Invalidate to ensure fresh data
    } catch (error: any) {
      console.error('Error updating recipe order:', error);
      toast({
        title: 'Failed to Reorder Recipes',
        description: error.message || 'An error occurred while saving the new order.',
        variant: 'destructive'
      });
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

  const saveMealPlan = async (name: string, month: string, year: number, planData: MealPlanEntry[]) => {
    if (!user) {
      toast({
        title: 'Sign In Required',
        description: 'Please sign in to save meal plans.',
        variant: 'destructive'
      });
      throw new Error('User not logged in.');
    }

    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .insert({
          user_id: user.id,
          name,
          month,
          year,
          plan_data: planData,
        })
        .select()
        .single();

      if (error) throw error;
      setSavedMealPlans(prev => [...prev, data]);
      toast({
        title: 'Meal Plan Saved!',
        description: `"${name}" for ${month} ${year} has been saved.`,
      });
    } catch (error: any) {
      console.error('Error saving meal plan:', error);
      toast({
        title: 'Failed to Save Meal Plan',
        description: error.message || 'An error occurred while saving the meal plan.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const deleteMealPlan = async (planId: string) => {
    if (!user) {
      toast({
        title: 'Sign In Required',
        description: 'Please sign in to delete meal plans.',
        variant: 'destructive'
      });
      throw new Error('User not logged in.');
    }

    try {
      const { error } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', planId)
        .eq('user_id', user.id);

      if (error) throw error;
      setSavedMealPlans(prev => prev.filter(plan => plan.id !== planId));
      toast({
        title: 'Meal Plan Deleted!',
        description: 'The meal plan has been removed.',
      });
    } catch (error: any) {
      console.error('Error deleting meal plan:', error);
      toast({
        title: 'Failed to Delete Meal Plan',
        description: error.message || 'An error occurred while deleting the meal plan.',
        variant: 'destructive'
      });
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
        savedMealPlans,
        cookbookInvitations, // Added
        hasShownWelcomeToast, // Added
        setGuestRecipes,
        setSelectedCookbook,
        signIn,
        signUp,
        signOut,
        createCookbook,
        updateUserProfile,
        updateCookbookPrivacy,
        deleteCookbook,
        deleteRecipe, // Added
        copyCookbook,
        addFriend,
        removeFriend,
        acceptFriendRequest,
        rejectFriendRequest,
        addRecipeToCookbook,
        updateRecipeOrder, // Added
        sendPasswordResetEmail,
        syncGuestDataToUser,
        saveMealPlan,
        loadMealPlans,
        deleteMealPlan,
        inviteCollaborator, // Added
        acceptCookbookInvitation, // Added
        rejectCookbookInvitation, // Added
        removeCollaborator, // Added
      }}
    >
      {children}
    </AppContext.Provider>
  );
};