export interface RepositoryAnalysisResult {
  folder_structure: string
  architecture_summary: string
  dependencies: string[]
  database_findings: string
  auth_findings: string
  api_flow: string
  weaknesses: string[]
  suggestions: string[]
}

export interface RepositoryAnalysisRequest {
  repo_url: string
}

export interface RepositoryAnalysisOut {
  id: number
  repo_source: string
  result: RepositoryAnalysisResult
  created_at: string
}

export interface RepositoryAnalysisListItem {
  id: number
  repo_source: string
  created_at: string
}

