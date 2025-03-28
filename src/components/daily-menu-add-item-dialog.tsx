"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface AddItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: any) => void;
}

const AddItemDialog: React.FC<AddItemDialogProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    itemName: "",
    incrementQty: 1,
    plannedQty: 0,
    rate: "",
    sortOrder: 0,
  });

  // Reset form when dialog is opened
  useEffect(() => {
    if (isOpen) {
      setFormData({
        itemName: "",
        incrementQty: 1,
        plannedQty: 0,
        rate: "",
        sortOrder: 0,
      });
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "itemName" ? value : Number(value) || 0, // Convert numbers properly
    }));
  };

  const handleSubmit = () => {
    console.log("Submitting item:", formData); // Debugging
  
    if (!formData.itemName.trim()) {
      console.warn("Item Name is required!");
      return;
    }
  
    onSave({
      itemName: formData.itemName,
      incrementQty: Number(formData.incrementQty),
      plannedQty: Number(formData.plannedQty),
      rate: Number(formData.rate),
      sortOrder: Number(formData.sortOrder),
    });
  
    setFormData({ // Reset fields after saving
      itemName: "",
      incrementQty: 1,
      plannedQty: 0,
      rate: "",
      sortOrder: 0,
    });
  
    onClose(); // Close dialog after saving
  };
  

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="itemName">Item Name</Label>
            <Input id="itemName" name="itemName" value={formData.itemName} onChange={handleChange} />
          </div>

          <div>
            <Label htmlFor="incrementQty">Increment Quantity</Label>
            <Input type="number" id="incrementQty" name="incrementQty" value={formData.incrementQty} onChange={handleChange} />
          </div>

          <div>
            <Label htmlFor="plannedQty">Planned Quantity</Label>
            <Input type="number" id="plannedQty" name="plannedQty" value={formData.plannedQty} onChange={handleChange} />
          </div>

          <div>
            <Label htmlFor="rate">Rate</Label>
            <Input type="number" id="rate" name="rate" value={formData.rate} onChange={handleChange} />
          </div>

          <div>
            <Label htmlFor="sortOrder">Sort Order</Label>
            <Input type="number" id="sortOrder" name="sortOrder" value={formData.sortOrder} onChange={handleChange} />
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddItemDialog;
