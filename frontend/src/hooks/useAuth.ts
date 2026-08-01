import { useCallback, useEffect, useSyncExternalStore } from 'react'
import authService, { clearStoredToken, getStoredToken } from '../services/authService'
import type { UserOut } from '../types/auth'

interface AuthState {
  user: UserOut | null
  isInitializing: boolean
}

let state: AuthState = {
  user: null,
  isInitializing: true,
}

const listeners = new Set<() => void>()

function setState(next: Partial<AuthState>) {
  state = { ...state, ...next }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): AuthState {
  return state
}

export function useAuth() {
  const { user, isInitializing } = useSyncExternalStore(subscribe, getSnapshot)

  const login = useCallback(async (email: string, password: string) => {
    await authService.login(email, password)
    const currentUser = await authService.getCurrentUser()
    setState({ user: currentUser, isInitializing: false })
  }, [])

  const register = useCallback(async (email: string, password: string, fullName?: string) => {
    await authService.register(email, password, fullName)
    await authService.login(email, password)
    const currentUser = await authService.getCurrentUser()
    setState({ user: currentUser, isInitializing: false })
  }, [])

  const logout = useCallback(() => {
    clearStoredToken()
    setState({ user: null, isInitializing: false })
  }, [])

  useEffect(() => {
    let isMounted = true

    const hydrate = async () => {
      if (!getStoredToken()) {
        if (isMounted) setState({ user: null, isInitializing: false })
        return
      }

      try {
        const currentUser = await authService.getCurrentUser()
        if (isMounted) setState({ user: currentUser, isInitializing: false })
      } catch {
        clearStoredToken()
        if (isMounted) setState({ user: null, isInitializing: false })
      }
    }

    void hydrate()

    return () => {
      isMounted = false
    }
  }, [])

  return {
    user,
    isAuthenticated: user !== null,
    isInitializing,
    login,
    register,
    logout,
  }
}

