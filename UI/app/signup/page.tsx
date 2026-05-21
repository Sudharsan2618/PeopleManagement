"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { GraduationCap, Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { useAuth, getRoleRedirectPath } from "@/lib/auth-context"

export default function SignupPage() {
  const router = useRouter()
  const { register, isLoading, error } = useAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [mobile, setMobile] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState<"telecaller" | "spoc">("telecaller")
  const [showPassword, setShowPassword] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{
    name?: string
    email?: string
    mobile?: string
    password?: string
    confirmPassword?: string
  }>({})

  const validateForm = () => {
    const errors: {
      name?: string
      email?: string
      mobile?: string
      password?: string
      confirmPassword?: string
    } = {}

    if (!name) errors.name = "Name is required"
    if (!email) {
      errors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email"
    }
    if (!mobile) {
      errors.mobile = "Mobile number is required"
    } else if (!/^\d{10,15}$/.test(mobile)) {
      errors.mobile = "Enter a valid mobile number"
    }
    if (!password) {
      errors.password = "Password is required"
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters"
    }
    if (confirmPassword !== password) {
      errors.confirmPassword = "Passwords do not match"
    }
    if (!role) {
      // role should always be set but validate defensively
      errors.confirmPassword = errors.confirmPassword || undefined
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    const registeredUser = await register({
      name,
      email,
      mobile,
      password,
      role,
    })

    if (registeredUser) {
      router.push(getRoleRedirectPath(registeredUser.role))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
              <GraduationCap className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
          <CardDescription>Register to access TATTI CRM</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (validationErrors.name) setValidationErrors((prev) => ({ ...prev, name: undefined }))
                  }}
                  className={validationErrors.name ? "border-destructive" : ""}
                />
                {validationErrors.name && (
                  <p className="text-sm text-destructive">{validationErrors.name}</p>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (validationErrors.email) setValidationErrors((prev) => ({ ...prev, email: undefined }))
                  }}
                  className={validationErrors.email ? "border-destructive" : ""}
                />
                {validationErrors.email && (
                  <p className="text-sm text-destructive">{validationErrors.email}</p>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="mobile">Mobile</FieldLabel>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="Enter your mobile number"
                  value={mobile}
                  onChange={(e) => {
                    setMobile(e.target.value)
                    if (validationErrors.mobile) setValidationErrors((prev) => ({ ...prev, mobile: undefined }))
                  }}
                  className={validationErrors.mobile ? "border-destructive" : ""}
                />
                {validationErrors.mobile && (
                  <p className="text-sm text-destructive">{validationErrors.mobile}</p>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="role">Register As</FieldLabel>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as "telecaller" | "spoc")}
                  className="w-full rounded-md border border-input px-3 py-2 bg-background"
                >
                  <option value="telecaller">Telecaller</option>
                  <option value="spoc">SPOC</option>
                </select>
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (validationErrors.password) setValidationErrors((prev) => ({ ...prev, password: undefined }))
                    }}
                    className={validationErrors.password ? "border-destructive pr-10" : "pr-10"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="sr-only">
                      {showPassword ? "Hide password" : "Show password"}
                    </span>
                  </Button>
                </div>
                {validationErrors.password && (
                  <p className="text-sm text-destructive">{validationErrors.password}</p>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    if (validationErrors.confirmPassword) setValidationErrors((prev) => ({ ...prev, confirmPassword: undefined }))
                  }}
                  className={validationErrors.confirmPassword ? "border-destructive" : ""}
                />
                {validationErrors.confirmPassword && (
                  <p className="text-sm text-destructive">{validationErrors.confirmPassword}</p>
                )}
              </Field>
            </FieldGroup>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing up...
                </>
              ) : (
                "Create Account"
              )}
            </Button>

            <div className="text-center text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
