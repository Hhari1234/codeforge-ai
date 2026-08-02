import axios from 'axios'
import api from './api'
import type { RegisterRequest, Token, UserOut } from '../types/auth'

const TOKEN_STORAGE_KEY = 'access_token'

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export function getAuthErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ detail?: string }>(error)) {
    const status = error.response?.status
    const detail = error.response?.data?.detail

    if (typeof detail === 'string') {
      return detail
    }
    if (status === 401) {
      return 'Incorrect email or password'
    }
    if (status === 400) {
      return 'Email already registered'
    }
    if (status !== undefined && status >= 500) {
      return 'Server error. Please try again later.'
    }
  }

  return 'Something went wrong. Please try again.'
}

const authService = {
  async register(email: string, password: string, fullName?: string): Promise<UserOut> {
    const payload: RegisterRequest = {
      email,
      password,
      full_name: fullName?.trim() || null,
    }
    const { data } = await api.post<UserOut>('/auth/register', payload)
    return data
  },

  async login(email: string, password: string): Promise<Token> {
    const form = new URLSearchParams()
    form.append('username', email.trim())
    form.append('password', password)

    const { data } = await api.post<Token>('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token)
    return data
  },

  async getCurrentUser(): Promise<UserOut> {
    const { data } = await api.get<UserOut>('/auth/me')
    return data
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>('/auth/forgot-password', { email })
    return data
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await api.post('/auth/reset-password', { token, new_password: newPassword })
  },
}

export default authService

