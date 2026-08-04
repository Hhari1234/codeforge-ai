export type BugSeverity = 'Critical' | 'High' | 'Medium' | 'Low'

export type BugCategory =
  | 'Logic'
  | 'Security'
  | 'Performance'
  | 'Error_Handling'
  | 'Concurrency'
  | 'Resource'
  | 'Null_Safety'
  | 'Type'
  | 'Syntax'
  | 'API_Usage'
  | 'Best_Practice'

export interface DebugBug {
  severity: BugSeverity
  category: BugCategory
  file: string
  line: number | null
  title: string
  description: string
  root_cause: string
  suggested_fix: string
  fixed_code: string | null
  best_practice: string | null
}

export interface BugDebugResult {
  health_score: number
  summary: string
  bugs: DebugBug[]
  recommendations: string[]
}

export interface BugDebugRequest {
  repo_url: string
}

export interface BugDebugCodeRequest {
  filename: string
  language: string
  source_code: string
}

export interface BugDebugOut {
  id: number
  repo_source: string
  result: BugDebugResult
  created_at: string
}

export interface BugDebugListItem {
  id: number
  repo_source: string
  created_at: string
}
