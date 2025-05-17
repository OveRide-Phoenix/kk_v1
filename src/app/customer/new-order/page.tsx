"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { Home, ShoppingBag, ShoppingCart, User, MapPin, Plus, Minus, X, Clock, Flame } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import CustomerNavBar from "@/components/customer-nav-bar"

export default function NewOrder() {
  const [quantities, setQuantities] = useState<{ [key: number]: number }>({})
  const [popupQuantities, setPopupQuantities] = useState<{ [key: number]: number }>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [location, setLocation] = useState("WORK No. 3, St. Mark's Road, Bengaluru - 04......");
  const [selectedAddress, setSelectedAddress] = useState("work");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [quantityChanged, setQuantityChanged] = useState(false); // New state variable
  const [addresses] = useState([
    { type: "HOME", address: "123 Home Street, Bengaluru - 01" },
    { type: "WORK", address: "WORK No. 3, St. Mark's Road, Bengaluru - 04" },
    { type: "FRIEND", address: "456 Friend Avenue, Bengaluru - 02" },
  ]);

  const handleQuantityChange = (itemId: number, change: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] || 0) + change)
    }));
  };

  const handlePopupQuantityChange = (itemId: number, change: number) => {
    setPopupQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] || 0) + change)
    }));
    setQuantityChanged(true); // Mark that the quantity has been changed
  };

  const handleConfirm = () => {
    setQuantities(prev => ({
      ...prev,
      [selectedItem.id]: popupQuantities[selectedItem.id] || 0
    }));
    setSelectedItem(null);
    setQuantityChanged(false); // Reset the change tracker
  };

  const handleCloseDialog = () => {
    if (quantityChanged) {
      alert("Please confirm your changes before closing."); // Warning message
    } else {
      setSelectedItem(null);
    }
  };

  const openPopup = (item) => {
    setSelectedItem(item);
    setPopupQuantities(prev => ({
      ...prev,
      [item.id]: quantities[item.id] || 0
    }));
    setQuantityChanged(false); // Reset the change tracker when opening
  };

  // Menu items data
  const menuItems = [
    // Breakfast Items
    {
      id: 1,
      name: "Masala Dosa",
      description: "Crispy rice crepe served with potato filling, sambar and chutneys",
      price: 120,
      image: "/images/menu/masala-dosa.jpg",
      category: "breakfast"
    },
    {
      id: 2,
      name: "Idli Sambar",
      description: "Steamed rice cakes served with lentil soup and coconut chutney",
      price: 80,
      image: "/images/menu/idli-sambar.jpg",
      category: "breakfast"
    },
    {
      id: 3,
      name: "Poori Bhaji",
      description: "Deep-fried bread served with spiced potato curry",
      price: 100,
      image: "/images/menu/poori.jpg",
      category: "breakfast"
    },
    {
      id: 13,
      name: "Upma",
      description: "Savory semolina porridge with vegetables and spices",
      price: 90,
      image: "/images/menu/upma.jpg",
      category: "breakfast"
    },
    {
      id: 14,
      name: "Vada Sambar",
      description: "Crispy lentil doughnuts served with lentil soup",
      price: 85,
      image: "/images/menu/vada-sambar.jpg",
      category: "breakfast"
    },
    {
      id: 15,
      name: "Rava Dosa",
      description: "Crispy semolina crepe served with potato curry",
      price: 110,
      image: "/images/menu/rava-dosa.jpg",
      category: "breakfast"
    },
    // Lunch Items
    {
      id: 4,
      name: "Veg Thali",
      description: "Complete meal with rice, rotis, dal, sabzi, and dessert",
      price: 200,
      image: "/images/menu/idli-sambar.jpg",
      category: "lunch"
    },
    {
      id: 5,
      name: "Pulao",
      description: "Fragrant rice cooked with mixed vegetables and spices",
      price: 180,
      image: "/images/menu/idli-sambar.jpg",
      category: "lunch"
    },
    {
      id: 6,
      name: "Dal Makhani",
      description: "Creamy black lentils cooked overnight with butter and spices",
      price: 160,
      image: "/images/menu/idli-sambar.jpg",
      category: "lunch"
    },
    {
      id: 16,
      name: "Chole Bhature",
      description: "Spiced chickpea curry with deep-fried bread",
      price: 150,
      image: "/images/menu/idli-sambar.jpg",
      category: "lunch"
    },
    {
      id: 17,
      name: "Rajma Chawal",
      description: "Kidney bean curry served with steamed rice",
      price: 170,
      image: "/images/menu/idli-sambar.jpg",
      category: "lunch"
    },
    {
      id: 18,
      name: "Kadai Paneer",
      description: "Cottage cheese in spicy bell pepper gravy",
      price: 190,
      image: "/images/menu/idli-sambar.jpg",
      category: "lunch"
    },
    // Dinner Items
    {
      id: 7,
      name: "Paneer Butter Masala",
      description: "Cottage cheese cubes in rich tomato gravy",
      price: 220,
      image: "/images/menu/idli-sambar.jpg",
      category: "dinner"
    },
    {
      id: 8,
      name: "Veg Biryani",
      description: "Aromatic rice layered with mixed vegetables and spices",
      price: 250,
      image: "/images/menu/idli-sambar.jpg",
      category: "dinner"
    },
    {
      id: 9,
      name: "Roti Basket",
      description: "Assorted Indian breads with butter",
      price: 120,
      image: "/images/menu/idli-sambar.jpg",
      category: "dinner"
    },
    {
      id: 19,
      name: "Malai Kofta",
      description: "Vegetable dumplings in creamy curry sauce",
      price: 230,
      image: "/images/menu/idli-sambar.jpg",
      category: "dinner"
    },
    {
      id: 20,
      name: "Palak Paneer",
      description: "Cottage cheese in creamy spinach gravy",
      price: 210,
      image: "/images/menu/idli-sambar.jpg",
      category: "dinner"
    },
    {
      id: 21,
      name: "Dal Tadka",
      description: "Yellow lentils tempered with spices",
      price: 140,
      image: "/images/menu/idli-sambar.jpg",
      category: "dinner"
    },
    // Condiments
    {
      id: 10,
      name: "Mint Chutney",
      description: "Fresh mint and coriander chutney",
      price: 40,
      image: "/images/menu/idli-sambar.jpg",
      category: "condiments"
    },
    {
      id: 11,
      name: "Mixed Pickle",
      description: "Spicy mixed vegetable pickle",
      price: 50,
      image: "/images/menu/idli-sambar.jpg",
      category: "condiments"
    },
    {
      id: 12,
      name: "Raita",
      description: "Yogurt with mixed vegetables and mild spices",
      price: 60,
      image: "/images/menu/idli-sambar.jpg",
      category: "condiments"
    },
    {
      id: 22,
      name: "Mango Chutney",
      description: "Sweet and tangy mango relish",
      price: 45,
      image: "/images/menu/idli-sambar.jpg",
      category: "condiments"
    },
    {
      id: 23,
      name: "Onion Salad",
      description: "Sliced onions with lemon and spices",
      price: 30,
      image: "/images/menu/idli-sambar.jpg",
      category: "condiments"
    },
    {
      id: 24,
      name: "Papad Basket",
      description: "Assorted crispy lentil wafers",
      price: 55,
      image: "/images/menu/idli-sambar.jpg",
      category: "condiments"
    }
  ]

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <CustomerNavBar />
      
      <main className="container mx-auto px-4 pt-20">
        <div className="py-4">
          <div className="flex items-center justify-center mb-8">
            <div className="h-px bg-border flex-grow max-w-xs"></div>
            <div className="mx-4 flex items-center">
              <ShoppingBag className="h-5 w-5 text-[#463028] mr-2" />
              <h1 className="text-3xl font-serif font-bold text-[#463028]">Place a New Order</h1>
            </div>
            <div className="h-px bg-border flex-grow max-w-xs"></div>
          </div>
          
          {/* Category Buttons */}
          <div className="sticky top-20 z-10">
            <div className="flex justify-center gap-2">
              {["breakfast", "lunch", "dinner", "condiments"].map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setActiveCategory(activeCategory === category ? null : category);
                    const element = document.getElementById(category);
                    const headerOffset = 160;
                    const elementPosition = element?.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                    
                    window.scrollTo({
                      top: offsetPosition,
                      behavior: 'smooth'
                    });
                  }}
                  className={`px-4 py-1.5 rounded-full border border-primary capitalize font-serif text-sm transition-colors shadow-md
                    ${activeCategory === category 
                      ? 'bg-primary text-white' 
                      : 'bg-[#faf7f2] text-primary hover:bg-primary hover:text-white'
                    }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="px-16">
            <div className="grid grid-cols-1 gap-16">
              {["breakfast", "lunch", "dinner", "condiments"].map((category) => (
                <div key={category} id={category}>
                  <h2 className="text-xl font-semibold text-[#463028] mb-4 capitalize font-serif">{category}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {menuItems
                      .filter(item => item.category === category)
                      .map((item) => (
                        <div key={item.id} 
                          className="flex bg-[#faf7f2] border-2 border-[#e6dfd0] rounded-lg overflow-hidden h-[120px] shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
                          onClick={() => openPopup(item)}
                        >
                          <div className="w-[120px] h-[120px] flex-shrink-0">
                            <Image
                              src={item.image}
                              alt={item.name}
                              width={120}
                              height={120}
                              className="object-cover h-full w-full"
                            />
                          </div>
                          <div className="flex-1 p-3 relative">
                            <h3 className="font-medium text-[#463028] text-sm">{item.name}</h3>
                            <p className="text-xs text-[#8d6e63] mt-1 line-clamp-2">{item.description}</p>
                            <div className="absolute bottom-3 right-3 flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6 border-primary text-primary hover:bg-primary hover:text-white"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevents the click from triggering the parent onClick
                                  handleQuantityChange(item.id, -1);
                                }}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm text-primary font-medium min-w-[20px] text-center">
                                {quantities[item.id] || 0}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6 border-primary text-primary hover:bg-primary hover:text-white"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevents the click from triggering the parent onClick
                                  handleQuantityChange(item.id, 1);
                                }}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Floating Cart Button */}
      <div className="fixed bottom-6 right-6">
        <Button 
          className="h-12 w-12 rounded-full bg-primary/80 hover:bg-primary text-white shadow-xl flex items-center justify-center relative"
        >
          <ShoppingCart className="h-4 w-4" />
          <span className="absolute -top-2 -right-2 bg-[#463028] text-white text-xs font-medium rounded-full h-5 w-5 flex items-center justify-center border-2 border-[#faf7f2]">
            {Object.values(quantities).reduce((a, b) => a + b, 0)}
          </span>
        </Button>
      </div>

      {/* Dialog Component */}
      <Dialog open={selectedItem !== null} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden bg-[#faf7f2]">
          <div className="relative w-full h-[250px]">
            <Image
              src={selectedItem?.image || '/placeholder.svg'}
              alt={selectedItem?.name || ''}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <h2 className="text-xl font-serif mb-2">{selectedItem?.name}</h2>
              <p className="text-sm text-white/80">{selectedItem?.description}</p>
            </div>
            <button
              className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"
              onClick={handleCloseDialog}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#8d6e63]">Comes with:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#8d6e63]">- Rice</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#8d6e63]">- Salad</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-sm text-[#8d6e63] mb-1">Price</p>
                <p className="text-xl font-medium text-primary">₹{selectedItem?.price}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 border-primary text-primary hover:bg-primary hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectedItem && handlePopupQuantityChange(selectedItem.id, -1);
                  }}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-sm text-primary font-medium min-w-[20px] text-center">
                  {popupQuantities[selectedItem?.id] || quantities[selectedItem?.id] || 0}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 border-primary text-primary hover:bg-primary hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectedItem && handlePopupQuantityChange(selectedItem.id, 1);
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Button
              className="w-full mt-4 bg-primary text-white hover:bg-primary-dark"
              onClick={handleConfirm}
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}