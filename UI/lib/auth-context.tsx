"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
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
  isInitialized: boolean
  error: string | null
  login: (email: string, password: string) => Promise<User | null>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY = "cems_user"

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
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setUser(parsed)
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    } finally {
      setIsInitialized(true)
    }
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<User | null> => {
    setIsLoading(true)
    setError(null)

    try {
      // Authenticate with backend — password is verified server-side
      const apiUser = await authApi.login(email, password)
      const uiUser = convertApiUserToUser(apiUser)
      
      // Persist to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(uiUser))
      setUser(uiUser)
      setIsLoading(false)
      return uiUser
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
      setIsLoading(false)
      return null
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setError(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, isInitialized, error, login, logout }}>
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
