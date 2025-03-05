"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Menu, X, Coffee } from "lucide-react";
import { useAuthStore } from "@/store/store";

export default function LoginPage() {
    const router = useRouter();
    const [phoneNumber, setPhoneNumber] = useState("");
    const [city, setCity] = useState("");
    const { isAdmin, setAdmin } = useAuthStore();
    const [adminPassword, setAdminPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showRegisterHighlight, setShowRegisterHighlight] = useState(false);

    // When phone number changes, fetch city and is_admin flag when 10 digits are present.
    const handlePhoneChange = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        let value = e.target.value;

        // Remove all non-digit characters.
        value = value.replace(/[^\d]/g, "");

        // Ensure it starts with "+91 " appropriately.
        if (value.startsWith("91")) {
            value = "+91 " + value.slice(2);
        } else if (value.startsWith("+91")) {
            value = "+91 " + value.slice(3);
        } else {
            value = "+91 " + value;
        }

        // Limit to "+91 " (4 characters) plus 10 digits = 14 characters.
        if (value.length > 14) {
            value = value.slice(0, 14);
        }

        setPhoneNumber(value);

        // Extract only the 10-digit number after the "+91 " prefix.
        const numericValue = value.replace(/\D/g, "").slice(2);

        if (numericValue.length === 10) {
            setErrorMessage("");
            try {
                console.log("Numeric Value:", numericValue);
                const response = await fetch(
                    `http://localhost:8000/api/get-city?phone=${numericValue}`
                );
                const data = await response.json();
                console.log("Response:", data);
                if (response.ok) {
                    console.log("Response Data:", data);
                    setCity(data.city);
                    setAdmin(data.is_admin);
                    console.log("Is Admin:", data.is_admin);

                    setShowRegisterHighlight(false);
                } else {
                    setErrorMessage(
                        data.detail || "User does not exist. Please register."
                    );
                    setCity("");
                    setAdmin(false);
                    setShowRegisterHighlight(true);
                }
            } catch {
                setErrorMessage("Error fetching city data.");
                setCity("");
                setAdmin(false);
                setShowRegisterHighlight(false);
            }
        } else {
            setCity("");
            setAdmin(false);
        }
    };

    const handleLogin = async () => {
        setErrorMessage(""); // Clear previous errors

        try {
            const formattedPhone = phoneNumber.startsWith("+91")
                ? phoneNumber.replace("+91", "").replace(/\D/g, "")
                : phoneNumber.replace(/\D/g, "");

            const payload = {
                phone: formattedPhone,
                admin_password: adminPassword || null, // Send the admin password if isAdmin is true
            };
            console.log("Payload:", payload); // Log to check the payload

            const response = await fetch("http://localhost:8000/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok) {
                console.log("Login successful:", data);

                // Store the isAdmin and user details in localStorage
                localStorage.setItem("isAdmin", JSON.stringify(data.is_admin));
                localStorage.setItem("user", JSON.stringify(data.user)); // Assuming `data.user` contains user details

                // After successful login, set isAdmin and user globally using Zustand store
                useAuthStore.getState().setAdmin(data.is_admin);
                useAuthStore.getState().setUser(data.user); // Update the store with user details

                if (data.is_admin) {
                    router.push("/admin");
                } else {
                    router.push("/dashboard");
                }
            } else {
                // Handle error message properly to prevent rendering the whole object
                const errorDetail =
                    data.detail || data.msg || "Login failed. Try again.";
                setErrorMessage(errorDetail);
            }
        } catch (error) {
            console.error("Login error:", error);
            setErrorMessage("Something went wrong. Please try again.");
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-muted">
                <div className="container mx-auto px-4">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Coffee className="h-6 w-6 text-primary" />
                            <a
                                href="#"
                                className="text-xl font-bold text-cream"
                            >
                                Kuteera Kitchen
                            </a>
                        </div>
                        <nav className="hidden md:flex space-x-8">
                            <a
                                href="#"
                                className="text-sm font-medium text-foreground/80 hover:text-primary"
                            >
                                Home
                            </a>
                            <a
                                href="#"
                                className="text-sm font-medium text-foreground/80 hover:text-primary"
                            >
                                About
                            </a>
                            <a
                                href="#"
                                className="text-sm font-medium text-foreground/80 hover:text-primary"
                            >
                                Services
                            </a>
                            <a
                                href="#"
                                className="text-sm font-medium text-foreground/80 hover:text-primary"
                            >
                                Contact
                            </a>
                        </nav>
                        <div className="md:hidden">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                    setMobileMenuOpen(!mobileMenuOpen)
                                }
                            >
                                {mobileMenuOpen ? (
                                    <X size={24} />
                                ) : (
                                    <Menu size={24} />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex flex-grow items-center justify-center p-4">
                <Card className="w-full max-w-md border-primary/20">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">
                            Welcome back
                        </CardTitle>
                        <CardDescription>
                            Enter your phone number and city to login or
                            register
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="+91"
                                value={phoneNumber}
                                onChange={handlePhoneChange}
                                required
                            />
                        </div>
                        <div className="space-y-2 pt-4">
                            <Label htmlFor="city">City</Label>
                            <Input
                                id="city"
                                type="text"
                                value={city}
                                readOnly
                            />
                        </div>
                        {isAdmin && (
                            <div className="space-y-2 pt-4">
                                <Label htmlFor="adminPassword">
                                    Admin Password
                                </Label>
                                <Input
                                    id="adminPassword"
                                    type="password"
                                    placeholder="Enter admin password"
                                    value={adminPassword}
                                    onChange={(e) =>
                                        setAdminPassword(e.target.value)
                                    }
                                    required
                                />
                            </div>
                        )}
                        {errorMessage && (
                            <p className="text-red-600 text-sm text-center pt-4">
                                {errorMessage}
                            </p>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-2 ">
                        <Button
                            className="w-full bg-primary"
                            onClick={handleLogin}
                            disabled={!phoneNumber}
                        >
                            Login
                        </Button>
                        <Button
                            className={`w-full transition-all ${
                                showRegisterHighlight
                                    ? "shadow-lg shadow-red-500/25 ring-2 ring-red-400"
                                    : ""
                            }`}
                            variant="outline"
                            onClick={() => router.push("/register")}
                        >
                            Register
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
