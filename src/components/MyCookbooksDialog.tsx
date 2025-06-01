import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BookOpen } from 'lucide-react';
import CookbookManager from './CookbookManager';

interface MyCookbooksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecipeRemoved: (id: string) => void;
  setActiveTab: (tab: string) => void;
}

const MyCookbooksDialog: React.FC<MyCookbooksDialogProps> = ({ open, onOpenChange, onRecipeRemoved, setActiveTab }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            My Cookbooks
          </DialogTitle>
        </DialogHeader>
        <CookbookManager onRecipeRemoved={onRecipeRemoved} setActiveTab={setActiveTab} />
      </DialogContent>
    </Dialog>
  );
};

export default MyCookbooksDialog;