"use client";

import * as React from "react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/app/actions/auth";

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const validateEmail = (value: string) => {
    if (!value) {
      setEmailError("Email is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError(null);
    return true;
  };

  const validatePassword = (value: string) => {
    if (!value) {
      setPasswordError("Password is required");
      return false;
    }
    if (value.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return false;
    }
    setPasswordError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);

      const result = await signIn(formData);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left: brand */}
      <div className="relative hidden overflow-hidden border-r border-border bg-muted/30 lg:block">
        <div className="relative flex h-full flex-col justify-between p-10">
          <div className="leading-tight">
            <div className="text-lg font-semibold tracking-tight">
              Compliance AI
            </div>
            <div className="text-muted-foreground text-sm">
              AI‑powered compliance
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold tracking-tight">
              Sign in to your{" "}
              <span className="text-primary">account</span>
            </h1>
            <p className="text-muted-foreground max-w-md leading-7">
              Use the same Supabase credentials as the main web app to access
              the dashboard.
            </p>
          </div>
        </div>
      </div>

      {/* Right: sign in */}
      <div className="flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Enter your email and password to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) validateEmail(e.target.value);
                  }}
                  onBlur={(e) => validateEmail(e.target.value)}
                  className={emailError ? "border-destructive" : ""}
                  required
                />
                {emailError && (
                  <p className="text-sm text-destructive">{emailError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) validatePassword(e.target.value);
                  }}
                  onBlur={(e) => validatePassword(e.target.value)}
                  className={passwordError ? "border-destructive" : ""}
                  required
                />
                {passwordError && (
                  <p className="text-sm text-destructive">{passwordError}</p>
                )}
              </div>

              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
