"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Calendar as CalendarIcon } from "lucide-react";
import { Popover , PopoverTrigger, PopoverContent} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin-layout";


export function DailyMenuSetup() {
  const [menuType, setMenuType] = useState<string>("");
  const [mealType, setMealType] = useState<string>("");
  const [items, setItems] = useState<{ name: string; qty: number; rate: number; sort: number; date?: Date }[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [confirmedDate, setConfirmedDate] = useState<Date | null>(null);
  const [open, setOpen] = useState(false);

  const addMenuItem = () => {
    setItems([...items, { name: "", qty: 1, rate: 0, sort: items.length + 1, date: undefined }]);
  };

  return (
    <AdminLayout activePage="dailymenusetup">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Setup Daily Menu</CardTitle>
            <Button onClick={addMenuItem}>
              <Plus size={16} className="mr-2" />
              Add Menu Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>

        {/* Date Picker */}
   {/* Date Picker */}
<div className="mb-4">
  <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button 
        variant="outline" 
        className="w-[200px] justify-start text-left"
      >
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
            if (selectedDate) {
              setConfirmedDate(selectedDate); // Save the selected date
              setOpen(false); // Close popover if date is selected
            }
          }} 
          size="sm" 
          disabled={!selectedDate}
        >
          OK
        </Button>
      </div>
    </PopoverContent>
  </Popover>
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
            <div className="flex items-center gap-2">
              {/*<Filter size={18} className="text-gray-500" />*/}
              
            </div>
          </div>


          {/* Menu Items Table */}
          <div className="rounded-md border">
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
                {items.map((item, index) => (
                  <TableRow key={index}>

                     {/*Item Name*/}
                    <TableCell>
                      <Input
                        value={item.name}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].name = e.target.value;
                          setItems(newItems);
                        }}
                        placeholder="Item Name"
                      />
                    </TableCell>
                    { /* Increment Qty */}
                    <TableCell>
                      <Input
                        type="number"
                        value={item.qty}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].qty = parseInt(e.target.value) || 0;
                          setItems(newItems);
                        }}
                      />
                    </TableCell>
                    { /* Planned Qty */}
                    <TableCell>
                      <Input
                        type="number"
                        value={item.qty}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].qty = parseInt(e.target.value) || 0;
                          setItems(newItems);
                        }}
                      />
                    </TableCell>
                    { /* Rate */}
                    <TableCell>
                      <Input
                        type="number"
                        value={item.rate}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].rate = parseFloat(e.target.value) || 0;
                          setItems(newItems);
                        }}
                      />
                    </TableCell>
                    {/* Sort Order */}
                    <TableCell>
                      <Input
                        type="number"
                        value={item.sort}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].sort = parseInt(e.target.value) || 0;
                          setItems(newItems);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
