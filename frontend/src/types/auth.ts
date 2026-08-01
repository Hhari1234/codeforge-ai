export interface RegisterRequest {
  email: string
  password: string
  full_name?: string | null
}

export interface LoginRequest {
  email: string
  password: string
}

export interface Token {
  access_token: string
  token_type: string
}

export interface UserOut {
  id: number
  email: string
  full_name: string | null
  created_at: string
}

