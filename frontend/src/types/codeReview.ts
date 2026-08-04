export type ReviewSeverity = 'Critical' | 'High' | 'Medium' | 'Low'

export type ReviewCategory =
  | 'security'
  | 'bug'
  | 'performance'
  | 'code_smell'
  | 'maintainability'
  | 'best_practice'

export interface ReviewFinding {
  file: string
  line: number | null
  severity: ReviewSeverity
  category: ReviewCategory
  title: string
  description: string
  code_snippet: string | null
  recommendation: string
}

export interface CodeReviewResult {
  overall_quality_score: number
  summary: string
  strengths: string[]
  findings: ReviewFinding[]
  recommendations: string[]
}

export interface CodeReviewRequest {
  repo_url: string
}

export interface CodeReviewOut {
  id: number
  repo_source: string
  result: CodeReviewResult
  created_at: string
}

export interface CodeReviewListItem {
  id: number
  repo_source: string
  created_at: string
}
