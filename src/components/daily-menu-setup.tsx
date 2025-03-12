"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Filter } from "lucide-react";

export function DailyMenuSetup() {
  const [filterValue, setFilterValue] = useState<string>("all");
  const [menuType, setMenuType] = useState<string>("");
  const [mealType, setMealType] = useState<string>("");
  const [items, setItems] = useState<{ name: string; qty: number; rate: number; sort: number }[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [activePage, setActivePage] = useState<string>("dailymenu");

  // Function to add a new menu item
  const addMenuItem = () => {
    setItems([...items, { name: "", qty: 1, rate: 0, sort: items.length + 1 }]);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} activePage={activePage} setActivePage={setActivePage} />
      
      <div className="flex-1">
        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">Daily Menu Setup</h1>
            <p className="text-gray-500">Add and manage daily menus</p>
          </div>

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
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <Input placeholder="Search menu..." className="pl-10" />
                </div>
                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-gray-500" />
                  <Select value={filterValue} onValueChange={setFilterValue}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="breakfast">Breakfast</SelectItem>
                      <SelectItem value="lunch">Lunch</SelectItem>
                      <SelectItem value="dinner">Dinner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Menu Type and Meal Type */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Select value={menuType} onValueChange={setMenuType}>
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

                <Select value={mealType} onValueChange={setMealType}>
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
        </main>
      </div>
    </div>
  );
}
