export interface LLMCall {
  callee: string;
  position: { line: number; column: number };
  model: string;
}

export interface FunctionInfo {
  name: string;
  position: { line: number; column: number };
  llm_calls: LLMCall[];
}

export interface FileAnalysisResult {
  file_path: string;
  functions: FunctionInfo[];
}

export interface AnalysisResult {
  files: FileAnalysisResult[];
}
