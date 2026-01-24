export interface LoopInfo {
  is_in_loop: boolean;
  loop_type: string | null;
  position: { line: number; column: number } | null;
}

export interface LLMCall {
  callee: string;
  position: { line: number; column: number };
  model: string;
  supports_thinking: boolean;
  is_deprecated: boolean;
  is_cacheable: boolean;
  loop_info: LoopInfo;
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
