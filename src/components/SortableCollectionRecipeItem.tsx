"use client";

import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import RecipeCard from './RecipeCard';

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
  categorized_ingredients?: CategorizedIngredients;
  instructions: string[];
  url: string;
  image?: string;
  cook_time?: string;
  servings?: number;
  meal_type?: 'Breakfast' | 'Lunch' | 'Dinner' | 'Appetizer' | 'Dessert' | 'Snack' | string;
  cookbook_id?: string;
  is_public?: boolean;
  cookbook_owner_id?: string;
}

interface SortableCollectionRecipeItemProps {
  recipe: Recipe;
  onAddToShoppingList?: (ingredients: string[]) => void;
  onRecipeAdded: (recipe: Recipe) => void; // Made mandatory
  onRemove: (recipeId: string, cookbookId?: string) => void;
  onViewDetails: (recipe: Recipe) => void; // New prop
}

const SortableCollectionRecipeItem: React.FC<SortableCollectionRecipeItemProps> = ({
  recipe,
  onAddToShoppingList,
  onRecipeAdded, // Destructure mandatory prop
  onRemove,
  onViewDetails,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: recipe.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab', // Indicate draggable
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <RecipeCard
        recipe={recipe}
        onAddToShoppingList={onAddToShoppingList}
        onRecipeAdded={onRecipeAdded} // Pass the mandatory prop
        showFullDetails={false} // Keep condensed view for collection
        onRemove={onRemove}
        onViewDetails={onViewDetails} // Pass onViewDetails to RecipeCard
      />
    </div>
  );
};

export default SortableCollectionRecipeItem;