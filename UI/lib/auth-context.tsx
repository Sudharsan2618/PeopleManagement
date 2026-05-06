"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { type UserRole } from "./mock-data"
import { authApi, type User as ApiUser } from "./api-client"

interface User {
  id: string
  name: string
  email: string
  role: UserRole
  mobile: string
  phone: string
  status: "Active" | "Inactive"
  isActive: boolean
  hubId?: string
  createdAt: string
  lastLoginAt?: Date
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Convert API user to UI user format
function convertApiUserToUser(apiUser: ApiUser): User {
  return {
    id: String(apiUser.id),
    name: apiUser.name,
    email: apiUser.email,
    role: apiUser.role as UserRole,
    mobile: apiUser.mobile,
    phone: apiUser.mobile,
    status: apiUser.is_active ? "Active" : "Inactive",
    isActive: apiUser.is_active,
    createdAt: apiUser.created_at,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      // Authenticate with backend
      const apiUser = await authApi.login(email, password)
      
      // Simple password check (in production, backend should handle this)
      // For now, we'll accept any password if user exists
      if (apiUser && apiUser.is_active) {
        setUser(convertApiUserToUser(apiUser))
        setIsLoading(false)
        return true
      } else {
        setError("Invalid email or password or account is inactive")
        setIsLoading(false)
        return false
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
      setIsLoading(false)
      return false
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setError(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function getRoleRedirectPath(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard"
    case "telecaller":
      return "/telecaller/dashboard"
    case "spoke":
      return "/spoke/dashboard"
    default:
      return "/login"
  }
}
