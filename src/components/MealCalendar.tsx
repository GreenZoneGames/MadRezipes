import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';

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
}

export interface MealPlan {
  date: string;
  recipe: Recipe;
  mealType?: 'breakfast' | 'lunch' | 'dinner';
}

interface MealCalendarProps {
  mealPlan: MealPlan[];
  selectedMonth: string;
}

const MealCalendar: React.FC<MealCalendarProps> = ({ mealPlan, selectedMonth }) => {
  const getMealIcon = (mealType: 'breakfast' | 'lunch' | 'dinner' | string) => {
    switch (mealType.toLowerCase()) {
      case 'breakfast': return '☀️';
      case 'lunch': return '🍽️';
      case 'dinner': return '🌙';
      case 'appetizer': return '🍢'; // New icon for appetizer
      case 'dessert': return '🍰'; // New icon for dessert
      case 'snack': return '🥨'; // New icon for snack
      default: return '🍽️';
    }
  };

  const getMealsByDate = () => {
    const mealsByDate: { [key: string]: MealPlan[] } = {};
    mealPlan.forEach(meal => {
      if (!mealsByDate[meal.date]) {
        mealsByDate[meal.date] = [];
      }
      mealsByDate[meal.date].push(meal);
    });
    return mealsByDate;
  };

  const mealsByDate = getMealsByDate();
  const sortedDates = Object.keys(mealsByDate).sort();

  if (mealPlan.length === 0) {
    return (
      <Card className="w-full hover-lift bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Calendar className="h-5 w-5 text-primary" />
            Meal Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg border border-dashed border-border">
            <Calendar className="h-12 w-12 text-primary mx-auto mb-2" />
            <p className="text-muted-foreground">
              📅 Generate a meal plan to see your calendar!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full hover-lift bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Calendar className="h-5 w-5 text-primary" />
          Meal Calendar - {selectedMonth}
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            📅 {sortedDates.length} days planned
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 max-h-96 overflow-y-auto">
          {sortedDates.map(date => {
            const dayMeals = mealsByDate[date];
            const dateObj = new Date(date);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNumber = dateObj.getDate();
            
            return (
              <div key={date} className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 border border-border rounded-lg hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-center">
                    <div className="text-xs text-primary font-medium">{dayName}</div>
                    <div className="text-lg font-bold text-foreground">{dayNumber}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">
                      📅 {dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {['breakfast', 'lunch', 'dinner'].map(mealType => {
                    const meal = dayMeals.find(m => m.mealType === mealType);
                    return (
                      <div key={mealType} className="flex items-center gap-3 p-2 bg-background/60 rounded border border-border/50">
                        <span className="text-lg">{getMealIcon(mealType as 'breakfast' | 'lunch' | 'dinner')}</span>
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground capitalize font-medium">{mealType}</div>
                          {meal ? (
                            <div className="text-sm font-medium text-foreground truncate">
                              {meal.recipe.title}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground italic">No meal planned</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default MealCalendar;