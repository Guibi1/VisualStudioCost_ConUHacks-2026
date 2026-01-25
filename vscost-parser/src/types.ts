export interface LoopInfo {
    is_in_loop: boolean;
    loop_type: string | null;
    position: { line: number; column: number } | null;
}

export type APICallType = "llm" | "image" | "audio";

export interface LLMCall {
    type?: "llm";
    callee: string;
    position: { line: number; column: number };
    model: string;
    cost_per_1M_tokens: number;
    supports_thinking: boolean;
    is_deprecated: boolean;
    is_cacheable: boolean;
    loop_info: LoopInfo;
}

export interface ImageGenerationCall {
    type: "image";
    callee: string;
    position: { line: number; column: number };
    model: string;
    cost_per_image: number | null;
    size: string | null;
    quality: string | null;
    n: number | null;
    is_deprecated: boolean;
    loop_info: LoopInfo;
}

export interface AudioGenerationCall {
    type: "audio";
    callee: string;
    position: { line: number; column: number };
    model: string;
    pricing_unit: "per_second" | "per_character" | "per_request";
    cost_per_unit: number | null;
    voice: string | null;
    audio_operation: "speech" | "transcription" | "translation" | null;
    is_deprecated: boolean;
    loop_info: LoopInfo;
}

export type APICall = LLMCall | ImageGenerationCall | AudioGenerationCall;

export interface FunctionInfo {
    name: string;
    position: { line: number; column: number };
    llm_calls: LLMCall[];
    image_calls: ImageGenerationCall[];
    audio_calls: AudioGenerationCall[];
}

export interface FunctionCallSite {
    callee: string;
    position: { line: number; column: number };
    llm_calls: LLMCall[];
    image_calls: ImageGenerationCall[];
    audio_calls: AudioGenerationCall[];
    is_cacheable: boolean;
    total_llm_calls: number;
    total_image_calls: number;
    total_audio_calls: number;
}

export interface FileAnalysisResult {
    file_path: string;
    functions: FunctionInfo[];
    call_sites: FunctionCallSite[];
}

export interface AnalysisResult {
    files: FileAnalysisResult[];
}
