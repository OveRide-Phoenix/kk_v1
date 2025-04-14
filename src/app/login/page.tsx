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
import { Menu, X, Coffee, Eye, EyeOff } from "lucide-react";
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
    const [isLoading, setIsLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // When phone number changes, fetch city and is_admin flag when 10 digits are present.
    const handlePhoneChange = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        let value = e.target.value;

        // Remove all non-digit characters including +91
        const digitsOnly = value.replace(/\D/g, "");

        let formattedValue = "";
        if (digitsOnly.length > 0) {
            // Remove any leading 91 if present
            const cleanNumber = digitsOnly.startsWith("91")
                ? digitsOnly.slice(2)
                : digitsOnly;

            // Add +91 prefix and limit to 10 digits
            formattedValue = "+91 " + cleanNumber.slice(0, 10);
        }

        setPhoneNumber(formattedValue);

        // Extract only the digits after +91 for API calls
        const numericValue = formattedValue.replace(/\D/g, "").slice(2);

        if (numericValue.length === 10) {
            setErrorMessage("");
            setIsLoading(true);
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
            } finally {
                setIsLoading(false);
            }
        } else {
            // Remove the validation message during typing
            setErrorMessage("");
            setCity("");
            setAdmin(false);
        }
    };

    const handleLogin = async () => {
        // Add validation check at login attempt
        if (phoneNumber.replace(/\D/g, "").length !== 12) {
            // +91 + 10 digits = 12
            setErrorMessage("Please enter a valid 10-digit phone number");
            return;
        }

        setErrorMessage("");
        setIsLoading(true);

        try {
            const formattedPhone = phoneNumber.startsWith("+91")
                ? phoneNumber.replace("+91", "").replace(/\D/g, "")
                : phoneNumber.replace(/\D/g, "");

            const payload = {
                phone: formattedPhone,
                admin_password: adminPassword || null,
            };

            const response = await fetch("http://localhost:8000/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok) {
                console.log("Login successful:", data);

                // Store with different expiration based on remember me
                if (rememberMe) {
                    const thirtyDaysFromNow = new Date();
                    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
                    localStorage.setItem(
                        "authExpiry",
                        thirtyDaysFromNow.toISOString()
                    );
                } else {
                    const oneDayFromNow = new Date();
                    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
                    localStorage.setItem(
                        "authExpiry",
                        oneDayFromNow.toISOString()
                    );
                }

                localStorage.setItem("isAdmin", JSON.stringify(data.is_admin));
                localStorage.setItem("user", JSON.stringify(data.user));

                useAuthStore.getState().setAdmin(data.is_admin);
                useAuthStore.getState().setUser(data.user);

                if (data.is_admin) {
                    router.push("/admin");
                } else {
                    router.push("/customer");
                }
            } else {
                // Handle error message properly to prevent rendering the whole object
                const errorDetail =
                    data.detail || data.msg || "Login failed. Try again.";
                setErrorMessage(errorDetail);
            }
        } catch (error) {
            console.error("Login error:", error);
            if (!navigator.onLine) {
                setErrorMessage(
                    "No internet connection. Please check your network."
                );
            } else {
                setErrorMessage("Something went wrong. Please try again.");
            }
        } finally {
            setIsLoading(false);
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
                                href="/"
                                className="text-xl font-bold text-cream"
                            >
                                Kuteera Kitchen
                            </a>
                        </div>
                        <nav className="hidden md:flex items-center space-x-8">
                            <a
                                href="/"
                                className="text-sm font-medium hover:text-primary"
                            >
                                Home
                            </a>
                            <a
                                href="/menu"
                                className="text-sm font-medium hover:text-primary"
                            >
                                Menu
                            </a>
                            <a
                                href="/about"
                                className="text-sm font-medium hover:text-primary"
                            >
                                About
                            </a>
                            <a
                                href="/contact"
                                className="text-sm font-medium hover:text-primary"
                            >
                                Contact
                            </a>
                            <a
                                href="tel:+919876543210"
                                className="text-sm font-medium hover:text-primary"
                            >
                                +91 98765 43210
                            </a>
                            <Button
                                onClick={() => router.push("/register")}
                                className="bg-primary hover:bg-primary/90 text-white text-sm"
                            >
                                Register
                            </Button>
                        </nav>
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
                                <div className="relative">
                                    <Input
                                        id="adminPassword"
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        placeholder="Enter admin password"
                                        value={adminPassword}
                                        onChange={(e) =>
                                            setAdminPassword(e.target.value)
                                        }
                                        required
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
                                    >
                                        {showPassword ? (
                                            <Eye className="h-4 w-4" />
                                        ) : (
                                            <EyeOff className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                        {/* Add Remember Me checkbox before error message */}
                        <div className="flex items-center space-x-2 pt-4">
                            <input
                                type="checkbox"
                                id="rememberMe"
                                checked={rememberMe}
                                onChange={(e) =>
                                    setRememberMe(e.target.checked)
                                }
                                className="rounded border-gray-300"
                                title="Remember me"
                            />
                            <Label htmlFor="rememberMe" className="text-sm">
                                Remember me
                            </Label>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-2">
                        <Button
                            className="w-full bg-primary"
                            onClick={handleLogin}
                            disabled={!phoneNumber || isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                    <span>Logging in...</span>
                                </div>
                            ) : (
                                "Login"
                            )}
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
                        {errorMessage && (
                            <p className="text-red-600 text-sm text-center mt-6">
                                {errorMessage}
                            </p>
                        )}
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
