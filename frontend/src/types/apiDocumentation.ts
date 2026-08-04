export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD'

export type ParameterLocation = 'path' | 'query' | 'header' | 'body' | 'cookie'

export interface EndpointParameter {
  name: string
  location: ParameterLocation
  type: string | null
  required: boolean
  description: string
}

export interface ExampleBlock {
  language: string
  content: string
}

export interface EndpointError {
  status_code: number
  description: string
}

export interface Endpoint {
  method: HttpMethod
  path: string
  summary: string
  description: string
  tags: string[]
  parameters: EndpointParameter[]
  request_body: string | null
  responses: ExampleBlock[]
  errors: EndpointError[]
  example_request: ExampleBlock | null
  example_response: ExampleBlock | null
}

export interface AuthInfo {
  type: 'none' | 'bearer' | 'basic' | 'api_key' | 'oauth2'
  description: string
  header_name: string | null
}

export interface ApiDocumentationResult {
  framework: string
  base_url: string
  api_overview: string
  authentication: AuthInfo
  endpoints: Endpoint[]
  status_codes: string[]
  error_responses: string[]
  recommendations: string[]
}

export interface DocumentationRequest {
  repo_url: string
}

export interface DocumentationSourceRequest {
  filename: string
  language: string
  source_code: string
  framework: string
}

export interface ApiDocumentationOut {
  id: number
  repo_source: string
  result: ApiDocumentationResult
  created_at: string
}

export interface ApiDocumentationListItem {
  id: number
  repo_source: string
  created_at: string
}
