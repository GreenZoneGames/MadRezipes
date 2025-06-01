import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download } from 'lucide-react';
import MealExporter from './MealExporter';
import { MealPlan, Recipe } from './MealPlanner'; // Import types from MealPlanner

interface MealExporterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipes: Recipe[];
  mealPlan: MealPlan[];
  selectedMonth: string;
}

const MealExporterDialog: React.FC<MealExporterDialogProps> = ({
  open,
  onOpenChange,
  recipes,
  mealPlan,
  selectedMonth,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Meal Calendar & Shopping List
          </DialogTitle>
        </DialogHeader>
        <MealExporter
          recipes={recipes}
          mealPlan={mealPlan}
          selectedMonth={selectedMonth}
        />
      </DialogContent>
    </Dialog>
  );
};

export default MealExporterDialog;