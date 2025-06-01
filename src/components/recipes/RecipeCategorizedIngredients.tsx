import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ChefHat, Users, Clock, ExternalLink, BookOpen, Plus, Share2, Printer, Copy, MessageSquare, Globe, Lock } from 'lucide-react';

interface CategorizedIngredients {
  proteins: string[];
  vegetables: string[];
  fruits: string[];
  grains: string[];
  dairy: string[];
  spices: string[];
  other: string[];
}

interface RecipeCategorizedIngredientsProps {
  categorizedIngredients?: CategorizedIngredients;
  showFullDetails: boolean;
}

const categoryColors = {
  proteins: 'bg-red-100 text-red-800',
  vegetables: 'bg-green-100 text-green-800',
  fruits: 'bg-yellow-100 text-yellow-800',
  grains: 'bg-amber-100 text-amber-800',
  dairy: 'bg-blue-100 text-blue-800',
  spices: 'bg-purple-100 text-purple-800',
  other: 'bg-gray-100 text-gray-800'
};

const categoryIcons = {
  proteins: '🥩',
  vegetables: '🥕',
  fruits: '🍎',
  grains: '🌾',
  dairy: '🥛',
  spices: '🌿',
  other: '📦'
};

const RecipeCategorizedIngredients: React.FC<RecipeCategorizedIngredientsProps> = ({
  categorizedIngredients,
  showFullDetails,
}) => {
  if (!categorizedIngredients || Object.keys(categorizedIngredients).length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <h4 className="font-semibold mb-2 text-sm">📋 Ingredients by Category:</h4>
      <div className="space-y-2">
        {Object.entries(categorizedIngredients).map(([category, items]) => {
          if (items.length === 0) return null;
          return (
            <div key={category} className="text-xs">
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${categoryColors[category as keyof typeof categoryColors]} font-medium mb-1`}>
                <span>{categoryIcons[category as keyof typeof categoryIcons]}</span>
                {category.charAt(0).toUpperCase() + category.slice(1)} ({items.length})
              </div>
              <div className="ml-2 text-muted-foreground">
                {showFullDetails ? items.join(', ') : items.slice(0, 3).join(', ')}
                {!showFullDetails && items.length > 3 && ` +${items.length - 3} more`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecipeCategorizedIngredients;