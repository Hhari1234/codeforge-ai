export interface ProjectGenerationResult {
  project_name: string
  requirements: string[]
  features: string[]
  folder_structure: string[]
  database_schema: string[]
  rest_apis: string[]
  authentication: string
  tech_stack: string[]
  readme: string
}

export interface ProjectGenerationOut {
  id: number
  idea: string
  result: ProjectGenerationResult
  created_at: string
}

export interface ProjectGenerationListItem {
  id: number
  idea: string
  project_name: string
  created_at: string
}
