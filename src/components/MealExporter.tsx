import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Calendar, ShoppingCart, Coffee, Utensils, Moon } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  url: string;
  image?: string;
  cook_time?: string; // Changed to snake_case
  servings?: number;
  meal_type?: string; // Changed to snake_case
}

interface MealPlan {
  date: string;
  recipe: Recipe;
  mealType?: 'breakfast' | 'lunch' | 'dinner';
}

interface MealExporterProps {
  recipes: Recipe[];
  mealPlan: MealPlan[];
}

const MealExporter: React.FC<MealExporterProps> = ({ recipes, mealPlan }) => {
  const getAllIngredients = () => {
    const ingredientMap = new Map<string, number>();
    mealPlan.forEach(meal => {
      meal.recipe.ingredients.forEach(ingredient => {
        const cleanIngredient = ingredient.toLowerCase().trim();
        ingredientMap.set(cleanIngredient, (ingredientMap.get(cleanIngredient) || 0) + 1);
      });
    });
    return Array.from(ingredientMap.entries()).map(([ingredient, count]) => ({ ingredient, count }));
  };

  const generateFullMonthPlan = () => {
    if (recipes.length === 0) return [];
    
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const fullMonthPlan: MealPlan[] = [];
    const mealTypes: ('breakfast' | 'lunch' | 'dinner')[] = ['breakfast', 'lunch', 'dinner'];
    
    for (let day = 1; day <= daysInMonth; day++) {
      mealTypes.forEach(mealType => {
        const randomRecipe = recipes[Math.floor(Math.random() * recipes.length)];
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        fullMonthPlan.push({
          date: dateStr,
          recipe: randomRecipe,
          mealType
        });
      });
    }
    
    return fullMonthPlan;
  };

  const getMealIcon = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return '☀️';
      case 'lunch': return '🍽️';
      case 'dinner': return '🌙';
      default: return '🍽️';
    }
  };

  const exportToPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      const fullMonthPlan = mealPlan.length > 0 ? mealPlan : generateFullMonthPlan();
      
      // Page 1: Calendar View
      doc.setFillColor(41, 37, 36);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      
      // Title
      doc.setTextColor(251, 146, 60);
      doc.setFontSize(24);
      doc.text('Monthly Meal Calendar', pageWidth/2, 20, { align: 'center' });
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      const currentDate = new Date();
      const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      doc.text(`${monthName} - Generated: ${new Date().toLocaleDateString()}`, pageWidth/2, 30, { align: 'center' });
      
      // Calendar grid
      const startY = 45;
      const cellWidth = (pageWidth - 40) / 7;
      const cellHeight = 25;
      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      // Draw calendar header
      doc.setFontSize(10);
      doc.setTextColor(251, 146, 60);
      daysOfWeek.forEach((day, index) => {
        doc.text(day, 20 + (index * cellWidth) + cellWidth/2, startY, { align: 'center' });
      });
      
      // Draw calendar grid and meals
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      for (let week = 0; week < 6; week++) {
        for (let day = 0; day < 7; day++) {
          const dayNumber = week * 7 + day - firstDay + 1;
          const x = 20 + day * cellWidth;
          const y = startY + 5 + week * cellHeight;
          
          // Draw cell border
          doc.setDrawColor(100, 100, 100);
          doc.rect(x, y, cellWidth, cellHeight);
          
          if (dayNumber > 0 && dayNumber <= daysInMonth) {
            doc.setFontSize(8);
            doc.text(dayNumber.toString(), x + 2, y + 6);
            
            // Check for meals on this date
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
            const dayMeals = fullMonthPlan.filter(m => m.date === dateStr);
            
            let mealY = y + 10;
            dayMeals.forEach(meal => {
              if (mealY < y + cellHeight - 2) {
                doc.setFontSize(5);
                doc.setTextColor(134, 239, 172);
                const icon = getMealIcon(meal.mealType || 'dinner');
                const mealTitle = meal.recipe.title.length > 12 ? 
                  meal.recipe.title.substring(0, 12) + '...' : meal.recipe.title;
                doc.text(`${icon} ${mealTitle}`, x + 1, mealY);
                mealY += 4;
              }
            });
            doc.setTextColor(255, 255, 255);
          }
        }
      }
      
      // Legend
      doc.setFontSize(8);
      doc.setTextColor(251, 146, 60);
      doc.text('Meal Icons:', 20, pageHeight - 15);
      doc.setTextColor(255, 255, 255);
      doc.text('☀️ Breakfast  🍽️ Lunch  🌙 Dinner', 20, pageHeight - 10);
      
      // Page 2: Shopping List
      doc.addPage();
      doc.setFillColor(41, 37, 36);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      
      doc.setTextColor(251, 146, 60);
      doc.setFontSize(24);
      doc.text('Shopping List', pageWidth/2, 20, { align: 'center' });
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text('Combined ingredients for all planned meals', pageWidth/2, 30, { align: 'center' });
      
      const ingredients = getAllIngredients();
      let yPos = 45;
      let xPos = 20;
      const columnWidth = (pageWidth - 40) / 2;
      
      doc.setFontSize(10);
      ingredients.forEach((item, index) => {
        if (yPos > pageHeight - 20) {
          yPos = 45;
          xPos += columnWidth;
          if (xPos > pageWidth - columnWidth) {
            doc.addPage();
            doc.setFillColor(41, 37, 36);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            yPos = 20;
            xPos = 20;
          }
        }
        
        doc.setTextColor(134, 239, 172);
        doc.text('•', xPos, yPos);
        doc.setTextColor(255, 255, 255);
        doc.text(`${item.ingredient}${item.count > 1 ? ` (${item.count}x)` : ''}`, xPos + 5, yPos);
        yPos += 6;
      });
      
      doc.save(`meal-calendar-${monthName.replace(' ', '-')}.pdf`);
      toast({ 
        title: 'Calendar PDF Exported', 
        description: `Full month calendar with ${fullMonthPlan.length} meals and shopping list downloaded!` 
      });
    } catch (error) {
      toast({ 
        title: 'Export Error', 
        description: 'Failed to generate PDF. Please try again.', 
        variant: 'destructive' 
      });
    }
  };

  return (
    <Card className="w-full hover-lift bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Download className="h-5 w-5 text-primary" />
          Export Meal Calendar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button 
            onClick={exportToPDF}
            disabled={recipes.length === 0}
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground hover-lift transition-all duration-300 shadow-lg"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Export Full Month Calendar PDF
          </Button>
          
          <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex items-center justify-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span>Full month calendar with meal titles and icons</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Coffee className="h-4 w-4 text-orange-500" />
              <span>☀️ Breakfast</span>
              <Utensils className="h-4 w-4 text-blue-500" />
              <span>🍽️ Lunch</span>
              <Moon className="h-4 w-4 text-purple-500" />
              <span>🌙 Dinner</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <span>Combined shopping list for all ingredients</span>
            </div>
            <p className="text-xs pt-2 text-center">
              {mealPlan.length > 0 ? `${mealPlan.length} planned meals` : 'Auto-generates full month plan'} • {getAllIngredients().length} unique ingredients
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MealExporter;