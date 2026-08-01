export interface ReadmeGenerationResult {
  title: string
  description: string
  installation: string
  usage: string
  folder_structure_explanation: string
  tech_stack: string[]
  features: string[]
  full_markdown: string
}

export interface ReadmeGenerationOut {
  id: number
  input_summary: string
  result: ReadmeGenerationResult
  created_at: string
}

export interface ReadmeGenerationListItem {
  id: number
  input_summary: string
  title: string
  created_at: string
}

