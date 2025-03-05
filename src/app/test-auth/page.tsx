"use client"

import { useAuth } from "@/context/AuthContext"

export default function TestAuth() {
  const { isLoggedIn, isAdmin, login, logout } = useAuth()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Auth Test</h1>
      <p>Logged In: {isLoggedIn ? "Yes" : "No"}</p>
      <p>Is Admin: {isAdmin ? "Yes" : "No"}</p>
      
      <button 
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded" 
        onClick={() => login(true)}
      >
        Login as Admin
      </button>

      <button 
        className="mt-4 ml-2 px-4 py-2 bg-gray-500 text-white rounded" 
        onClick={logout}
      >
        Logout
      </button>
    </div>
  )
}
