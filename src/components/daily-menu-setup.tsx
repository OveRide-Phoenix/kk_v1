"use client";

import { useState,useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin-layout";
import AddItemDialog from "@/components/daily-menu-add-item-dialog";

export function DailyMenuSetup() {
  const [menuType, setMenuType] = useState<string>("");
  const [mealType, setMealType] = useState<string>("");
  const [items, setItems] = useState<{ name: string; qty: number; rate: number; sort: number; date?: Date }[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [confirmedDate, setConfirmedDate] = useState<Date | null>(null);
  const [open, setOpen] = useState(false);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false); // Track hydration state

  useEffect(() => {
      setHydrated(true); // Set to true once the component mounts
    }, []);

  useEffect(() => {
      setItems([]); // Ensures it's only initialized on the client
    }, []);

  // Function to handle saving a new item
  const handleSave = (newItem: any) => {
    console.log("Saving item:", newItem); // Debugging: Check the received data
  
    setItems((prevItems) => [
      ...prevItems,
      {
        name: newItem.itemName,         // Fix key mapping
        qty: newItem.incrementQty,      // Fix key mapping
        plannedQty: newItem.plannedQty, // Fix key mapping
        rate: newItem.rate,             // Fix key mapping
        sort: newItem.sortOrder,        // Fix key mapping
      },
    ]);
  };
  
  

  return (
    <AdminLayout activePage="dailymenusetup">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Setup Daily Menu</CardTitle>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus size={16} className="mr-2" />
              Add Menu Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>

          {/* Date Picker */}
          <div className="mb-4">
            {hydrated && (  
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Select Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4">
                <Calendar
                  mode="single"
                  selected={selectedDate || undefined}
                  onSelect={(day) => setSelectedDate(day || null)}
                  initialFocus
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    onClick={() => {
                      if (selectedDate) setConfirmedDate(selectedDate);
                      setOpen(false);
                    }}
                    size="sm"
                    disabled={!selectedDate}
                  >
                    OK
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
           )}
          </div>

          {/* Menu Type and Meal Type */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Select value={menuType} onValueChange={setMenuType} disabled={!confirmedDate}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Menu Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one_day">One Day</SelectItem>
                <SelectItem value="subscription">Subscription</SelectItem>
                <SelectItem value="all_days">All Days</SelectItem>
                <SelectItem value="festivals">Festivals</SelectItem>
              </SelectContent>
            </Select>

            <Select value={mealType} onValueChange={setMealType} disabled={!confirmedDate}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Meal Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="breakfast">Breakfast</SelectItem>
                <SelectItem value="lunch">Lunch</SelectItem>
                <SelectItem value="dinner">Dinner</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input placeholder="Search menu..." className="pl-10" />
            </div>
          </div>

          {/* Add Item Dialog */}
          <AddItemDialog isOpen={isDialogOpen} onClose={() => setDialogOpen(false)} onSave={handleSave} />

          {/* Table for Displaying Saved Items */}
          <div className="mt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Increment Qty</TableHead>
                  <TableHead>Planned Qty</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Sort Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length > 0 ? (
                  items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.qty}</TableCell>
                      <TableCell>{item.qty}</TableCell>
                      <TableCell>{item.rate}</TableCell>
                      <TableCell>{item.sort}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      No items added yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
