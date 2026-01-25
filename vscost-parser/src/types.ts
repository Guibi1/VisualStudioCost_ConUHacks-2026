export interface LoopInfo {
    is_in_loop: boolean;
    loop_type: string | null;
    position: { line: number; column: number } | null;
}

export interface LLMCall {
    callee: string;
    position: { line: number; column: number };
    model: string;
    cost_per_1M_tokens: number;
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

export interface FunctionCallSite {
    callee: string;
    position: { line: number; column: number };
    llm_calls: LLMCall[];
    is_cacheable: boolean;
    total_llm_calls: number;
}

export interface FileAnalysisResult {
    file_path: string;
    functions: FunctionInfo[];
    call_sites: FunctionCallSite[];
}

export interface AnalysisResult {
    files: FileAnalysisResult[];
}
