import { create } from "zustand";

interface AuthStore {
    isAdmin: boolean;
    user: any; // Or define a more specific type for the user object
    setAdmin: (isAdmin: boolean) => void;
    setUser: (user: any) => void; // Or a specific user type
    logout: () => void; // New logout method to clear the store
}

export const useAuthStore = create<AuthStore>((set) => ({
    isAdmin: false,
    user: null, // Initially, no user is logged in
    setAdmin: (isAdmin: boolean) => set({ isAdmin }),
    setUser: (user: any) => set({ user }), // Update user details
    logout: () => set({ isAdmin: false, user: null }), // Reset the store values on logout
}));
