"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Calendar as CalendarIcon, Eye, Pencil, Trash2,Check  } from "lucide-react";
import { Popover , PopoverTrigger, PopoverContent} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin-layout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";



export function DailyMenuSetup() {
  const [menuType, setMenuType] = useState<string>("");
  const [mealType, setMealType] = useState<string>("");
  const [items, setItems] = useState<{ name: string; qty: number; rate: number; sort: number; date?: Date }[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [confirmedDate, setConfirmedDate] = useState<Date | null>(null);
  const [open, setOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState("");

  
  const [availableItems, setAvailableItems] = useState([
    { 
      id: 1, 
      name: "Idli", 
      rate: 30, 
      category: "breakfast",
      description: "Soft and fluffy steamed rice cakes",
      preparationTime: "15 mins",
      isVeg: true,
      calories: 120
    },
    { 
      id: 2, 
      name: "Masala Dosa", 
      rate: 40, 
      category: "breakfast",
      description: "Crispy rice crepe with spiced potato filling",
      preparationTime: "20 mins",
      isVeg: true,
      calories: 250
    },
    { 
      id: 3, 
      name: "Vada", 
      rate: 25, 
      category: "breakfast",
      description: "Crispy lentil doughnuts",
      preparationTime: "15 mins",
      isVeg: true,
      calories: 150
    },
    { 
      id: 4, 
      name: "Thali", 
      rate: 120, 
      category: "lunch",
      description: "Complete meal with rice, rotis, dal, and sides",
      preparationTime: "30 mins",
      isVeg: true,
      calories: 800
    },
    { 
      id: 5, 
      name: "Biryani", 
      rate: 150, 
      category: "lunch",
      description: "Fragrant rice dish with spices and vegetables",
      preparationTime: "45 mins",
      isVeg: true,
      calories: 650
    },
    { 
      id: 6, 
      name: "Paneer Butter Masala", 
      rate: 140, 
      category: "dinner",
      description: "Cottage cheese in rich tomato gravy",
      preparationTime: "25 mins",
      isVeg: true,
      calories: 450
    }
  ]);

  
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  // Group items by category
  const groupedItems = availableItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof availableItems>);

  // Filter items based on search query
  const filteredItems = (items: typeof availableItems) => {
    return items.filter(item =>
      item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(itemSearchQuery.toLowerCase())
    );
  };

  const addMenuItem = () => {
    setItemDialogOpen(true);
  };

  const handleItemSelection = () => {
    const newItems = selectedItems.map(id => {
      const item = availableItems.find(i => i.id === id);
      return {
        name: item?.name || "",
        qty: 1,
        rate: item?.rate || 0,
        sort: items.length + 1,
        date: undefined
      };
    });
    setItems([...items, ...newItems]);
    setItemDialogOpen(false);
    setSelectedItems([]);
  };

  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [viewItem, setViewItem] = useState<{ name: string; qty: number; rate: number; sort: number; date?: Date } | null>(null);
  
  const handleEdit = (index: number) => {
    setEditIndex(index);
  };
  
  const handleDelete = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };
  
  const handleSave = (index: number, field: keyof (typeof items)[number], value: string | number | Date) => {
      const newItems = [...items];
      newItems[index][field] = value as never; // Type assertion to satisfy TypeScript
      setItems(newItems);
  };

  

  function ItemCard({ item }: { item: typeof availableItems[0] }) {
    return (
      <div className="flex items-center space-x-4 p-4 hover:bg-accent rounded-lg border">
        <Checkbox
          checked={selectedItems.includes(item.id)}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelectedItems([...selectedItems, item.id]);
            } else {
              setSelectedItems(selectedItems.filter(id => id !== item.id));
            }
          }}
        />
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <div className="font-medium">{item.name}</div>
            <div className="font-medium text-primary">₹{item.rate}</div>
          </div>
          <p className="text-sm text-muted-foreground">{item.description}</p>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="text-xs">
              {item.preparationTime}
            </Badge>
            <Badge variant="outline" className={item.isVeg ? "bg-green-50 text-green-700 border-green-300" : ""}>
              {item.isVeg ? "Veg" : "Non-veg"}
            </Badge>
            <Badge variant="outline">
              {item.calories} cal
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout activePage="dailymenusetup">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Setup Daily Menu</CardTitle>
            <Button onClick={addMenuItem} disabled={!confirmedDate} className={!confirmedDate ? "opacity-50 cursor-not-allowed" : ""}>
            <Plus size={16} className="mr-2" />
            Add Menu Item
          </Button>
          </div>
        </CardHeader>
        <CardContent>

        {/* Date Picker */}
        <div className="mb-4">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="w-[200px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {confirmedDate ? format(confirmedDate, "PPP") : "Select Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="start">
              <Calendar
                mode="single"
                selected={selectedDate || undefined}
                onSelect={(date: Date | undefined) => {
                  if (date) {
                    setSelectedDate(date);
                  }
                }}
                disabled={(date) =>
                  date < new Date(new Date().setHours(0, 0, 0, 0))
                }
                initialFocus
              />
              <div className="mt-4 flex justify-end">
                <Button 
                  onClick={() => {
                    if (selectedDate) {
                      setConfirmedDate(selectedDate);
                      setOpen(false);
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
                <TableHead>Sl.no</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Available Qty</TableHead> {/* yet to make it uneditable (available - ordered)- backend */}
                  <TableHead>Planned Qty</TableHead>
                  <TableHead>Menu Rate</TableHead>
                  {/*<TableHead>Sort Order</TableHead>*/}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>

                      <TableCell>{index + 1}</TableCell> {/* ✅ Auto-incremented Serial Number */}

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
                    {/* Sort Order removed */}


                    {/* Actions */}
                    <TableBody>
                    {items.map((item, index: number) => (
                    <TableRow key={index}>
                   <TableCell>
                    {editIndex === index ? (
                      <Input value={item.name} onChange={(e) => handleSave(index, 'name', e.target.value)} />
                    ) : (
                      item.name
                    )}
                  </TableCell>
                  <TableCell>
                    {editIndex === index ? (
                      <Input type="number" value={item.qty} onChange={(e) => handleSave(index, 'qty', e.target.value)} />
                    ) : (
                      item.qty
                    )}
                  </TableCell>
                  <TableCell>
                    {editIndex === index ? (
                      <Input type="number" value={item.rate} onChange={(e) => handleSave(index, 'rate', e.target.value)} />
                    ) : (
                      `₹${item.rate}`
                    )}
                  </TableCell> 
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => setViewItem(item)}><Eye className="h-4 w-4" /></Button>
                    {editIndex === index ? (
                      <Button size="icon" variant="ghost" onClick={() => setEditIndex(null)}><Check className="h-4 w-4" /></Button>
                    ) : (
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(index)}><Pencil className="h-4 w-4" /></Button>
                    )}
                    <Button size="icon" variant="destructive" onClick={() => handleDelete(index)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>     
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
          </div>

          {/* Item Selection Dialog */}
          <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
            <DialogContent className="sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle>Select Menu Items</DialogTitle>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    placeholder="Search items..."
                    className="pl-10"
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                  />
                </div>
              </DialogHeader>
              
              <Tabs defaultValue="all" className="mt-2">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="breakfast">Breakfast</TabsTrigger>
                  <TabsTrigger value="lunch">Lunch</TabsTrigger>
                  <TabsTrigger value="dinner">Dinner</TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {filteredItems(availableItems).map((item) => (
                        <ItemCard key={item.id} item={item} />
                       
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {Object.entries(groupedItems).map(([category, items]) => (
                  <TabsContent key={category} value={category}>
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-4">
                        {filteredItems(items).map((item) => (
                          <ItemCard key={item.id} item={item} />
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>

              <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setItemDialogOpen(false);
                  setItemSearchQuery("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  handleItemSelection();
                  setItemSearchQuery("");
                }}
                disabled={selectedItems.length === 0}
              >
                Add Selected ({selectedItems.length})
              </Button>
            </DialogFooter>

            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

