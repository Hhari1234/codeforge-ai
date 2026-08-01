export interface FunctionExplanation {
  name: string
  explanation: string
}

export interface ClassExplanation {
  name: string
  explanation: string
}

export interface CodeExplanationResult {
  summary: string
  functions_explained: FunctionExplanation[]
  classes_explained: ClassExplanation[]
  overall_flow: string
}

export interface CodeExplanationRequest {
  filename: string
  language: string
  source_code: string
}

export interface CodeExplanationOut {
  id: number
  filename: string
  language: string
  result: CodeExplanationResult
  created_at: string
}

export interface CodeExplanationListItem {
  id: number
  filename: string
  language: string
  created_at: string
}

