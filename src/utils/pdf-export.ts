import { jsPDF } from 'jspdf';

interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  url: string;
  image?: string;
  cook_time?: string;
  servings?: number;
  meal_type?: 'Breakfast' | 'Lunch' | 'Dinner' | 'Appetizer' | 'Dessert' | 'Snack' | string;
}

export interface MealPlan { // This is the interface for a single meal entry in the plan
  date: string;
  recipe: Recipe;
  mealType?: 'breakfast' | 'lunch' | 'dinner';
}

const getMealIcon = (mealType: string) => {
  switch (mealType.toLowerCase()) {
    case 'breakfast': return '☀️';
    case 'lunch': return '🍽️';
    case 'dinner': return '🌙';
    case 'appetizer': return '🍢';
    case 'dessert': return '🍰';
    case 'snack': return '🥨';
    default: return '🍽️';
  }
};

const getIngredientIcon = (ingredient: string) => {
  const lower = ingredient.toLowerCase();
  if (lower.includes('apple') || lower.includes('fruit')) return '🍎';
  if (lower.includes('carrot') || lower.includes('vegetable')) return '🥕';
  if (lower.includes('milk') || lower.includes('dairy')) return '🥛';
  if (lower.includes('bread') || lower.includes('flour')) return '🍞';
  if (lower.includes('meat') || lower.includes('chicken') || lower.includes('beef')) return '🥩';
  if (lower.includes('fish') || lower.includes('salmon')) return '🐟';
  if (lower.includes('egg')) return '🥚';
  if (lower.includes('cheese')) return '🧀';
  if (lower.includes('tomato')) return '🍅';
  if (lower.includes('onion')) return '🧅';
  if (lower.includes('pepper')) return '🌶️';
  if (lower.includes('garlic')) return '🧄';
  if (lower.includes('herb') || lower.includes('basil') || lower.includes('parsley')) return '🌿';
  if (lower.includes('oil') || lower.includes('olive')) return '🫒';
  if (lower.includes('salt') || lower.includes('spice')) return '🧂';
  return '🥄';
};

export const exportMealPlanToPDF = async (mealPlan: MealPlan[], selectedMonth: string, allRecipes: Recipe[]) => {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Define new color palette for PDF
  const primaryColor = [36, 128, 70]; // A health-conscious green (HSL: 142.1 76.2% 36.3%)
  const textColor = [56, 63, 71]; // Dark blue-grey (HSL: 222.2 84% 4.9%)
  const mutedTextColor = [108, 117, 125]; // Medium grey (HSL: 215.4 16.3% 46.9%)
  const backgroundColor = [255, 255, 255]; // White
  const borderColor = [214, 220, 225]; // Light grey for borders

  // Ensure mealPlan is not empty. If it is, try to generate a plan from allRecipes.
  const planToUse = mealPlan.length > 0 ? mealPlan : generateFullMonthPlan(allRecipes, selectedMonth);

  if (planToUse.length === 0) {
    throw new Error("No meal plan data available to export.");
  }

  // Page 1: Calendar View
  doc.setFillColor(...backgroundColor);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Title
  doc.setTextColor(...primaryColor);
  doc.setFontSize(24);
  doc.text('Monthly Meal Calendar', pageWidth / 2, 20, { align: 'center' });

  doc.setTextColor(...mutedTextColor);
  doc.setFontSize(12);
  const currentDate = new Date();
  const monthName = selectedMonth || currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  doc.text(`${monthName} - Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' });

  // Calendar grid
  const startY = 45;
  const cellWidth = (pageWidth - 40) / 7;
  const cellHeight = 25;
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Draw calendar header
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  daysOfWeek.forEach((day, index) => {
    doc.text(day, 20 + (index * cellWidth) + cellWidth / 2, startY, { align: 'center' });
  });

  // Draw calendar grid and meals
  doc.setTextColor(...textColor);

  const year = currentDate.getFullYear();
  const monthIndex = new Date(Date.parse(selectedMonth + " 1, " + year)).getMonth(); // Get month index from selectedMonth string
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  for (let week = 0; week < 6; week++) {
    for (let day = 0; day < 7; day++) {
      const dayNumber = week * 7 + day - firstDay + 1;
      const x = 20 + day * cellWidth;
      const y = startY + 5 + week * cellHeight;

      // Draw cell border
      doc.setDrawColor(...borderColor);
      doc.rect(x, y, cellWidth, cellHeight);

      if (dayNumber > 0 && dayNumber <= daysInMonth) {
        doc.setFontSize(8);
        doc.text(dayNumber.toString(), x + 2, y + 6);

        // Check for meals on this date
        const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
        const dayMeals = planToUse.filter(m => m.date === dateStr);

        let mealY = y + 10;
        const mealTypesForDisplay: ('breakfast' | 'lunch' | 'dinner')[] = ['breakfast', 'lunch', 'dinner'];

        mealTypesForDisplay.forEach(type => {
          const meal = dayMeals.find(m => m.mealType === type);
          const icon = getMealIcon(type);
          const mealTitle = meal ? (meal.recipe.title.length > 15 ? meal.recipe.title.substring(0, 15) + '...' : meal.recipe.title) : 'No meal';
          const mealTextColor = meal ? primaryColor : mutedTextColor;

          if (mealY < y + cellHeight - 2) {
            doc.setFontSize(7);
            doc.setTextColor(...mealTextColor);
            doc.text(`${icon} ${mealTitle}`, x + 1, mealY);
            mealY += 4;
          }
        });
        doc.setTextColor(...textColor);
      }
    }
  }

  // Legend
  doc.setFontSize(8);
  doc.setTextColor(...primaryColor);
  doc.text('Meal Icons:', 20, pageHeight - 15);
  doc.setTextColor(...textColor);
  doc.text('☀️ Breakfast  🍽️ Lunch  🌙 Dinner', 20, pageHeight - 10);

  // Page 2: Shopping List
  doc.addPage();
  doc.setFillColor(...backgroundColor);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  doc.setTextColor(...primaryColor);
  doc.setFontSize(24);
  doc.text('Shopping List', pageWidth / 2, 20, { align: 'center' });

  doc.setTextColor(...mutedTextColor);
  doc.setFontSize(12);
  doc.text('Combined ingredients for all planned meals', pageWidth / 2, 30, { align: 'center' });

  const ingredientMap = new Map<string, number>();
  planToUse.forEach(meal => {
    meal.recipe.ingredients.forEach(ingredient => {
      const cleanIngredient = ingredient.toLowerCase().trim();
      ingredientMap.set(cleanIngredient, (ingredientMap.get(cleanIngredient) || 0) + 1);
    });
  });
  const ingredients = Array.from(ingredientMap.entries()).map(([ingredient, count]) => ({ ingredient, count }));

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
        doc.setFillColor(...backgroundColor);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        yPos = 20;
        xPos = 20;
      }
    }

    doc.setTextColor(...primaryColor);
    doc.text('•', xPos, yPos);
    doc.setTextColor(...textColor);
    doc.text(`${item.ingredient}${item.count > 1 ? ` (${item.count}x)` : ''}`, xPos + 5, yPos);
    yPos += 6;
  });

  doc.save(`meal-calendar-${monthName.replace(' ', '-')}.pdf`);
};

const generateFullMonthPlan = (recipes: Recipe[], selectedMonth: string): MealPlan[] => {
  if (recipes.length === 0) return [];

  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const monthIndex = new Date(Date.parse(selectedMonth + " 1, " + year)).getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const fullMonthPlan: MealPlan[] = [];
  const mealTypes: ('breakfast' | 'lunch' | 'dinner')[] = ['breakfast', 'lunch', 'dinner'];

  for (let day = 1; day <= daysInMonth; day++) {
    mealTypes.forEach(mealType => {
      const matchingRecipes = recipes.filter(r => 
        r.meal_type?.toLowerCase() === mealType.toLowerCase()
      );
      
      let selectedRecipe: Recipe;
      if (matchingRecipes.length > 0) {
        selectedRecipe = matchingRecipes[Math.floor(Math.random() * matchingRecipes.length)];
      } else {
        // Fallback to any random recipe if no specific meal type match
        selectedRecipe = recipes[Math.floor(Math.random() * recipes.length)];
      }

      const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      fullMonthPlan.push({
        date: dateStr,
        recipe: selectedRecipe,
        mealType
      });
    });
  }
  return fullMonthPlan;
};