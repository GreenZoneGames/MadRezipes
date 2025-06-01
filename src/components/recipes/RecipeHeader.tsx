import React from 'react';
import { CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, ChefHat } from 'lucide-react';

interface RecipeHeaderProps {
  title: string;
  image?: string;
  cookTime?: string;
  servings?: number;
  mealType?: string;
  ingredientsCount: number;
}

const RecipeHeader: React.FC<RecipeHeaderProps> = ({
  title,
  image,
  cookTime,
  servings,
  mealType,
  ingredientsCount,
}) => {
  return (
    <div className="flex items-start gap-3">
      {image && (
        <img
          src={image}
          alt={title}
          className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      <div className="flex-1">
        <CardTitle className="text-lg mb-2 flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-orange-500" />
          {title}
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          {cookTime && (
            <Badge variant="secondary" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {cookTime}
            </Badge>
          )}
          {servings && (
            <Badge variant="secondary" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              {servings} servings
            </Badge>
          )}
          {mealType && (
            <Badge variant="secondary" className="text-xs">
              <ChefHat className="h-3 w-3 mr-1" />
              {mealType}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {ingredientsCount} ingredients
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default RecipeHeader;