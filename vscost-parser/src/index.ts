import * as fs from "node:fs";
import * as path from "node:path";
import ts from "typescript";
import prices_llm from "../assets/prices_llm.js";
import type {
    AnalysisResult,
    AudioGenerationCall,
    FileAnalysisResult,
    FunctionInfo,
    ImageGenerationCall,
    LLMCall,
    LoopInfo,
} from "./types.js";

export type {
    AnalysisResult,
    AudioGenerationCall,
    FileAnalysisResult,
    FunctionCallSite,
    FunctionInfo,
    ImageGenerationCall,
    LLMCall,
    LoopInfo,
} from "./types.js";

const VALID_EXTENSIONS = [".ts", ".js", ".tsx", ".jsx"];

let pricesData: { data: any[] } | null = null;

export function setPricesPath(pricesPath: string): void {
    pricesData = JSON.parse(fs.readFileSync(pricesPath, "utf-8"));
}

function loadPrices(): { data: any[] } {
    if (!pricesData) {
        // Default to bundled TypeScript asset
        pricesData = prices_llm as { data: any[] };
    }
    return pricesData!;
}

function get_model_object(model_name: string): any | null {
    const prices = loadPrices();
    // Prefer exact match (needed for ai.generateText which uses full ids like "google/gemini-2.5-pro")
    const exact = prices.data.find((entry) => entry.id === model_name);
    if (exact) return exact;

    const shortName = model_name.split("/").pop();
    return prices.data.find((entry) => entry.id.split("/").pop() === shortName) ?? null;
}

// LLM API patterns
const LLM_CALLEES = [
    "openai.ChatCompletion.create",
    "gemini.ChatCompletion.create",
    "gemini.chat.completions.create",
    "ai.generateText",
    "anthropic.chat.completions.create",
    "openRouter.chat.send",
];

// Image generation API patterns
const IMAGE_CALLEES = [
    "openai.images.generate",
    "openai.images.edit",
    "openai.images.createVariation",
    "openai.Image.create",
    "openai.Image.edit",
    "openai.Image.variation",
    "stability.generate",
    "stability.textToImage",
    "stability.imageToImage",
    "stabilityai.generate",
    "replicate.run",
    "midjourney.imagine",
    "ai.generateImage",
    "openRouter.images.generate",
];

// Audio generation API patterns
const AUDIO_CALLEES = [
    "openai.audio.speech.create",
    "openai.audio.transcriptions.create",
    "openai.audio.translations.create",
    "elevenlabs.generate",
    "elevenlabs.textToSpeech",
    "elevenlabs.voiceGeneration",
    "textToSpeech.synthesize",
    "polly.synthesizeSpeech",
    "speechSynthesizer.speakTextAsync",
    "ai.generateSpeech",
    "ai.transcribe",
    "openRouter.audio.speech.create",
];

type CalleeType = "llm" | "image" | "audio" | null;

function getCalleeType(callee: string): CalleeType {
    // Check exact LLM matches
    if (LLM_CALLEES.includes(callee)) return "llm";

    // Check exact image matches
    if (IMAGE_CALLEES.includes(callee)) return "image";

    // Check exact audio matches
    if (AUDIO_CALLEES.includes(callee)) return "audio";

    // Fuzzy matching for common patterns
    if (IMAGE_CALLEES.some((c) => callee.includes(c))) return "image";
    if (AUDIO_CALLEES.some((c) => callee.includes(c))) return "audio";

    // Pattern-based detection
    if (callee.includes(".images.") || callee.includes("Image.create")) return "image";
    if (callee.includes(".audio.") || callee.includes("speech.create") || callee.includes("transcriptions.create"))
        return "audio";

    return null;
}

function isTargetCallee(callee: string): boolean {
    return LLM_CALLEES.includes(callee);
}

function getSimpleCalleeName(node: ts.CallExpression, sourceFile: ts.SourceFile): string | null {
    const expr = node.expression;

    if (ts.isIdentifier(expr)) {
        return expr.getText(sourceFile);
    }

    if (ts.isPropertyAccessExpression(expr)) {
        return expr.name.getText(sourceFile);
    }

    return null;
}

const ARRAY_LOOP_METHODS = ["forEach", "map", "filter"];

function isArrayLoopMethod(node: ts.CallExpression): string | null {
    if (ts.isPropertyAccessExpression(node.expression)) {
        const methodName = node.expression.name.getText();
        if (ARRAY_LOOP_METHODS.includes(methodName)) {
            return methodName;
        }
    }
    return null;
}

function findContainingLoop(node: ts.Node): ts.Node | null {
    let current = node.parent;

    while (current) {
        if (
            ts.isForStatement(current) ||
            ts.isForOfStatement(current) ||
            ts.isForInStatement(current) ||
            ts.isWhileStatement(current) ||
            ts.isDoStatement(current)
        ) {
            return current;
        }

        if (ts.isCallExpression(current) && isArrayLoopMethod(current)) {
            return current;
        }

        current = current.parent;
    }

    return null;
}

function getLoopType(node: ts.Node): string {
    if (ts.isForStatement(node)) return "for";
    if (ts.isForOfStatement(node)) return "for...of";
    if (ts.isForInStatement(node)) return "for...in";
    if (ts.isWhileStatement(node)) return "while";
    if (ts.isDoStatement(node)) return "do...while";

    if (ts.isCallExpression(node)) {
        const method = isArrayLoopMethod(node);
        if (method) return method;
    }

    return "unknown";
}

function isConstantExpression(node: ts.Node): boolean {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        return true;
    }
    if (ts.isTemplateExpression(node)) {
        return false; // Template with substitutions like `Hello ${name}`
    }
    if (ts.isArrayLiteralExpression(node)) {
        return node.elements.every((el) => isConstantExpression(el));
    }
    if (ts.isObjectLiteralExpression(node)) {
        return node.properties.every((prop) => {
            if (ts.isPropertyAssignment(prop)) {
                return isConstantExpression(prop.initializer);
            }
            return false;
        });
    }
    if (
        ts.isNumericLiteral(node) ||
        node.kind === ts.SyntaxKind.TrueKeyword ||
        node.kind === ts.SyntaxKind.FalseKeyword
    ) {
        return true;
    }
    return false;
}

function checkMessagesAreCacheable(node: ts.CallExpression, sourceFile: ts.SourceFile): boolean {
    for (const arg of node.arguments) {
        if (ts.isObjectLiteralExpression(arg)) {
            for (const prop of arg.properties) {
                if (ts.isPropertyAssignment(prop) && prop.name.getText(sourceFile) === "messages") {
                    return isConstantExpression(prop.initializer);
                }
            }
        }
    }
    return false;
}

function isModelDeprecated(model_object: any): boolean {
    if (!model_object || model_object.expiration_date === null) {
        return false;
    }
    return true;
}

function getLoopInfo(node: ts.Node, sourceFile: ts.SourceFile): LoopInfo {
    const loopNode = findContainingLoop(node);

    if (!loopNode) {
        return {
            is_in_loop: false,
            loop_type: null,
            position: null,
        };
    }

    const pos = sourceFile.getLineAndCharacterOfPosition(loopNode.getStart(sourceFile));

    return {
        is_in_loop: true,
        loop_type: getLoopType(loopNode),
        position: { line: pos.line, column: pos.character },
    };
}

function extractObjectProperty(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
    propName: string,
): string | null {
    for (const arg of node.arguments) {
        if (ts.isObjectLiteralExpression(arg)) {
            for (const prop of arg.properties) {
                if (ts.isPropertyAssignment(prop) && prop.name.getText(sourceFile) === propName) {
                    return prop.initializer.getText(sourceFile).replace(/['"`]/g, "");
                }
            }
        }
    }
    return null;
}

function extractNumericProperty(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
    propName: string,
): number | null {
    const value = extractObjectProperty(node, sourceFile, propName);
    if (value !== null) {
        const num = Number.parseFloat(value);
        return Number.isNaN(num) ? null : num;
    }
    return null;
}

function parseLLMCall(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
    callee: string,
    position: { line: number; column: number },
    loop_info: LoopInfo,
): LLMCall | null {
    const modelValue = extractObjectProperty(node, sourceFile, "model");
    if (!modelValue) return null;

    const model_object = get_model_object(modelValue);
    const supports_thinking =
        model_object &&
        Array.isArray(model_object.supported_parameters) &&
        model_object.supported_parameters.includes("include_reasoning");
    const is_cacheable = checkMessagesAreCacheable(node, sourceFile);
    const is_deprecated = isModelDeprecated(model_object);
    const cost_per_1M_tokens = model_object?.pricing?.prompt
        ? Number.parseFloat(model_object.pricing.prompt) * 1_000_000
        : Number.NaN;

    return {
        type: "llm",
        callee,
        position,
        model: modelValue,
        cost_per_1M_tokens,
        supports_thinking,
        is_deprecated,
        is_cacheable,
        loop_info,
    };
}

function parseImageCall(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
    callee: string,
    position: { line: number; column: number },
    loop_info: LoopInfo,
): ImageGenerationCall {
    const model = extractObjectProperty(node, sourceFile, "model") || "dall-e-3";
    const size = extractObjectProperty(node, sourceFile, "size");
    const quality = extractObjectProperty(node, sourceFile, "quality");
    const n = extractNumericProperty(node, sourceFile, "n");

    const model_object = get_model_object(model);
    const is_deprecated = isModelDeprecated(model_object);

    // Calculate cost per image
    let cost_per_image: number | null = null;
    if (model_object?.pricing?.image) {
        cost_per_image = Number.parseFloat(model_object.pricing.image);
        // Apply size multiplier for DALL-E style pricing
        if (size === "1792x1024" || size === "1024x1792") {
            cost_per_image *= 2;
        }
        // Apply quality multiplier
        if (quality === "hd") {
            cost_per_image *= 2;
        }
    }

    return {
        type: "image",
        callee,
        position,
        model,
        cost_per_image,
        size,
        quality,
        n,
        is_deprecated,
        loop_info,
    };
}

function parseAudioCall(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
    callee: string,
    position: { line: number; column: number },
    loop_info: LoopInfo,
): AudioGenerationCall {
    const model = extractObjectProperty(node, sourceFile, "model") || "tts-1";
    const voice = extractObjectProperty(node, sourceFile, "voice");

    const model_object = get_model_object(model);
    const is_deprecated = isModelDeprecated(model_object);

    // Determine audio operation from callee
    let audio_operation: "speech" | "transcription" | "translation" | null = null;
    if (callee.includes("speech") || callee.includes("tts") || callee.includes("textToSpeech")) {
        audio_operation = "speech";
    } else if (callee.includes("transcription")) {
        audio_operation = "transcription";
    } else if (callee.includes("translation")) {
        audio_operation = "translation";
    }

    // Determine pricing unit based on operation
    let pricing_unit: "per_second" | "per_character" | "per_request" = "per_character";
    if (audio_operation === "transcription" || audio_operation === "translation") {
        pricing_unit = "per_second";
    }

    // Get cost per unit
    let cost_per_unit: number | null = null;
    if (model_object?.pricing?.audio) {
        cost_per_unit = Number.parseFloat(model_object.pricing.audio);
    }

    return {
        type: "audio",
        callee,
        position,
        model,
        pricing_unit,
        cost_per_unit,
        voice,
        audio_operation,
        is_deprecated,
        loop_info,
    };
}

type ParsedAPICall =
    | { type: "llm"; call: LLMCall }
    | { type: "image"; call: ImageGenerationCall }
    | { type: "audio"; call: AudioGenerationCall }
    | null;

function parse_call_expression(node: ts.CallExpression, sourceFile: ts.SourceFile): ParsedAPICall {
    const callee = node.expression.getText(sourceFile);
    const calleeType = getCalleeType(callee);

    if (!calleeType) return null;

    const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    const position = { line: pos.line, column: pos.character };
    const loop_info = getLoopInfo(node, sourceFile);

    switch (calleeType) {
        case "llm": {
            const call = parseLLMCall(node, sourceFile, callee, position, loop_info);
            return call ? { type: "llm", call } : null;
        }
        case "image": {
            const call = parseImageCall(node, sourceFile, callee, position, loop_info);
            return { type: "image", call };
        }
        case "audio": {
            const call = parseAudioCall(node, sourceFile, callee, position, loop_info);
            return { type: "audio", call };
        }
    }
}

function findAllCallExpressions(node: ts.Node): ts.CallExpression[] {
    const calls: ts.CallExpression[] = [];
    function walk(n: ts.Node) {
        if (ts.isCallExpression(n)) {
            calls.push(n);
        }
        ts.forEachChild(n, walk);
    }
    walk(node);
    return calls;
}

function setParentNodes(node: ts.Node, parent?: ts.Node): void {
    if (parent) {
        (node as any).parent = parent;
    }
    ts.forEachChild(node, (child) => setParentNodes(child, node));
}

function areArgumentsConstant(node: ts.CallExpression, sourceFile: ts.SourceFile): boolean {
    if (node.arguments.length === 0) return false;
    return node.arguments.every((arg) => isConstantExpression(arg));
}

type FunctionRecord = FunctionInfo & {
    id: string;
    callees: string[];
};

type ParsedFile = {
    file_path: string;
    functions: FunctionRecord[];
    raw_calls: {
        callee: string;
        position: { line: number; column: number };
        is_cacheable: boolean;
    }[];
};

type TransitiveResult = {
    uniqueLLMCalls: LLMCall[];
    uniqueImageCalls: ImageGenerationCall[];
    uniqueAudioCalls: AudioGenerationCall[];
    llmCount: number;
    imageCount: number;
    audioCount: number;
};

function dedupeLLMCalls(calls: LLMCall[]): LLMCall[] {
    const seen = new Set<string>();
    const result: LLMCall[] = [];

    for (const call of calls) {
        const key = [
            call.callee,
            call.model,
            call.position.line,
            call.position.column,
            call.cost_per_1M_tokens ?? "null",
        ].join("|");

        if (!seen.has(key)) {
            seen.add(key);
            result.push(call);
        }
    }

    return result;
}

function dedupeImageCalls(calls: ImageGenerationCall[]): ImageGenerationCall[] {
    const seen = new Set<string>();
    const result: ImageGenerationCall[] = [];

    for (const call of calls) {
        const key = [call.callee, call.model, call.position.line, call.position.column].join("|");

        if (!seen.has(key)) {
            seen.add(key);
            result.push(call);
        }
    }

    return result;
}

function dedupeAudioCalls(calls: AudioGenerationCall[]): AudioGenerationCall[] {
    const seen = new Set<string>();
    const result: AudioGenerationCall[] = [];

    for (const call of calls) {
        const key = [call.callee, call.model, call.position.line, call.position.column].join("|");

        if (!seen.has(key)) {
            seen.add(key);
            result.push(call);
        }
    }

    return result;
}

function mergeLLMCalls(existing: LLMCall[], incoming: LLMCall[]): LLMCall[] {
    return dedupeLLMCalls([...existing, ...incoming]);
}

function mergeImageCalls(existing: ImageGenerationCall[], incoming: ImageGenerationCall[]): ImageGenerationCall[] {
    return dedupeImageCalls([...existing, ...incoming]);
}

function mergeAudioCalls(existing: AudioGenerationCall[], incoming: AudioGenerationCall[]): AudioGenerationCall[] {
    return dedupeAudioCalls([...existing, ...incoming]);
}

function parse_file(file_path: string, ast: ts.SourceFile): ParsedFile {
    // Set parent references for all nodes
    setParentNodes(ast);

    const functions: FunctionRecord[] = [];
    const raw_calls: {
        callee: string;
        position: { line: number; column: number };
        is_cacheable: boolean;
    }[] = [];

    function processFunction(node: ts.FunctionDeclaration) {
        if (!node.name) return;

        const funcName = node.name.getText(ast);
        const funcPos = ast.getLineAndCharacterOfPosition(node.getStart(ast));
        const position = { line: funcPos.line, column: funcPos.character };
        const llmCalls: LLMCall[] = [];
        const imageCalls: ImageGenerationCall[] = [];
        const audioCalls: AudioGenerationCall[] = [];
        const callees: string[] = [];

        const callExpressions = findAllCallExpressions(node);
        for (const call of callExpressions) {
            const parsedCall = parse_call_expression(call, ast);
            if (parsedCall) {
                switch (parsedCall.type) {
                    case "llm":
                        llmCalls.push(parsedCall.call);
                        break;
                    case "image":
                        imageCalls.push(parsedCall.call);
                        break;
                    case "audio":
                        audioCalls.push(parsedCall.call);
                        break;
                }
                continue;
            }

            const calleeName = getSimpleCalleeName(call, ast);
            if (calleeName) {
                callees.push(calleeName);
            }
        }

        functions.push({
            id: `${file_path}:${funcName}`,
            name: funcName,
            position,
            llm_calls: llmCalls,
            image_calls: imageCalls,
            audio_calls: audioCalls,
            callees,
        });
    }

    function visitNode(node: ts.Node) {
        if (ts.isFunctionDeclaration(node)) {
            processFunction(node);
        }
        ts.forEachChild(node, visitNode);
    }

    ts.forEachChild(ast, visitNode);

    // Collect all non-API call expressions in the file for call-site lenses
    const allCalls = findAllCallExpressions(ast);
    for (const call of allCalls) {
        const parsedCall = parse_call_expression(call, ast);
        if (parsedCall) continue; // direct API calls already surfaced at callsite

        const calleeName = getSimpleCalleeName(call, ast);
        if (!calleeName) continue;

        const pos = ast.getLineAndCharacterOfPosition(call.getStart(ast));
        const is_cacheable = areArgumentsConstant(call, ast);
        raw_calls.push({
            callee: calleeName,
            position: { line: pos.line, column: pos.character },
            is_cacheable,
        });
    }

    return {
        file_path,
        functions,
        raw_calls,
    };
}

export function get_all_files(dir_path: string): string[] {
    const files: string[] = [];

    function walk(current_path: string) {
        const entries = fs.readdirSync(current_path, { withFileTypes: true });

        for (const entry of entries) {
            const full_path = path.join(current_path, entry.name);

            if (entry.isDirectory()) {
                if (entry.name !== "node_modules" && !entry.name.startsWith(".")) {
                    walk(full_path);
                }
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name);
                if (VALID_EXTENSIONS.includes(ext)) {
                    files.push(full_path);
                }
            }
        }
    }

    walk(dir_path);
    return files;
}

export function analyze_code(files: string[], fileContents?: Record<string, string>): AnalysisResult {
    let program: ts.Program;
    if (fileContents) {
        const host = ts.createCompilerHost({});
        host.readFile = (fileName) => fileContents[fileName];
        program = ts.createProgram(files, {}, host);
    } else {
        program = ts.createProgram(files, {});
    }

    const parsedFiles: ParsedFile[] = [];
    for (const file of files) {
        try {
            const ast = program.getSourceFile(file);
            if (!ast) {
                throw new Error(`Could not create AST from file: ${file}`);
            }
            const result = parse_file(file, ast);
            parsedFiles.push(result);
        } catch (error) {
            console.error(`Error parsing ${file}:`, error);
        }
    }

    const functionMap = new Map<string, FunctionRecord>();
    const functionsByName = new Map<string, string[]>();

    for (const parsed of parsedFiles) {
        for (const fn of parsed.functions) {
            functionMap.set(fn.id, fn);
            if (!functionsByName.has(fn.name)) {
                functionsByName.set(fn.name, []);
            }
            functionsByName.get(fn.name)!.push(fn.id);
        }
    }

    const memoizedTransitive = new Map<string, TransitiveResult>();

    function getTransitiveCalls(functionId: string, stack: Set<string> = new Set()): TransitiveResult {
        if (memoizedTransitive.has(functionId)) {
            return memoizedTransitive.get(functionId)!;
        }

        if (stack.has(functionId)) {
            const empty: TransitiveResult = {
                uniqueLLMCalls: [],
                uniqueImageCalls: [],
                uniqueAudioCalls: [],
                llmCount: 0,
                imageCount: 0,
                audioCount: 0,
            };
            memoizedTransitive.set(functionId, empty);
            return empty;
        }

        stack.add(functionId);

        const fn = functionMap.get(functionId);
        if (!fn) {
            const empty: TransitiveResult = {
                uniqueLLMCalls: [],
                uniqueImageCalls: [],
                uniqueAudioCalls: [],
                llmCount: 0,
                imageCount: 0,
                audioCount: 0,
            };
            memoizedTransitive.set(functionId, empty);
            stack.delete(functionId);
            return empty;
        }

        let combinedLLMCalls: LLMCall[] = [...fn.llm_calls];
        let combinedImageCalls: ImageGenerationCall[] = [...fn.image_calls];
        let combinedAudioCalls: AudioGenerationCall[] = [...fn.audio_calls];
        let llmCount = fn.llm_calls.length;
        let imageCount = fn.image_calls.length;
        let audioCount = fn.audio_calls.length;

        for (const calleeName of fn.callees) {
            const candidateIds = functionsByName.get(calleeName) ?? [];
            for (const candidateId of candidateIds) {
                const result = getTransitiveCalls(candidateId, stack);
                combinedLLMCalls = mergeLLMCalls(combinedLLMCalls, result.uniqueLLMCalls);
                combinedImageCalls = mergeImageCalls(combinedImageCalls, result.uniqueImageCalls);
                combinedAudioCalls = mergeAudioCalls(combinedAudioCalls, result.uniqueAudioCalls);
                llmCount += result.llmCount;
                imageCount += result.imageCount;
                audioCount += result.audioCount;
            }
        }

        const computed: TransitiveResult = {
            uniqueLLMCalls: dedupeLLMCalls(combinedLLMCalls),
            uniqueImageCalls: dedupeImageCalls(combinedImageCalls),
            uniqueAudioCalls: dedupeAudioCalls(combinedAudioCalls),
            llmCount,
            imageCount,
            audioCount,
        };
        memoizedTransitive.set(functionId, computed);
        stack.delete(functionId);
        return computed;
    }

    const fileResultMap = new Map<string, FileAnalysisResult>();

    for (const parsed of parsedFiles) {
        fileResultMap.set(parsed.file_path, {
            file_path: parsed.file_path,
            functions: parsed.functions.map((fn) => ({
                name: fn.name,
                position: fn.position,
                llm_calls: fn.llm_calls,
                image_calls: fn.image_calls,
                audio_calls: fn.audio_calls,
            })),
            call_sites: [],
        });
    }

    for (const parsed of parsedFiles) {
        const targetFile = fileResultMap.get(parsed.file_path);
        if (!targetFile) continue;

        for (const call of parsed.raw_calls) {
            const candidateIds = functionsByName.get(call.callee) ?? [];
            let aggregatedLLMCalls: LLMCall[] = [];
            let aggregatedImageCalls: ImageGenerationCall[] = [];
            let aggregatedAudioCalls: AudioGenerationCall[] = [];
            let llmCount = 0;
            let imageCount = 0;
            let audioCount = 0;

            for (const candidateId of candidateIds) {
                const result = getTransitiveCalls(candidateId);
                aggregatedLLMCalls = mergeLLMCalls(aggregatedLLMCalls, result.uniqueLLMCalls);
                aggregatedImageCalls = mergeImageCalls(aggregatedImageCalls, result.uniqueImageCalls);
                aggregatedAudioCalls = mergeAudioCalls(aggregatedAudioCalls, result.uniqueAudioCalls);
                llmCount += result.llmCount;
                imageCount += result.imageCount;
                audioCount += result.audioCount;
            }

            if (aggregatedLLMCalls.length > 0 || aggregatedImageCalls.length > 0 || aggregatedAudioCalls.length > 0) {
                targetFile.call_sites.push({
                    callee: call.callee,
                    position: call.position,
                    llm_calls: dedupeLLMCalls(aggregatedLLMCalls),
                    image_calls: dedupeImageCalls(aggregatedImageCalls),
                    audio_calls: dedupeAudioCalls(aggregatedAudioCalls),
                    is_cacheable: call.is_cacheable || aggregatedLLMCalls.some((c) => c.is_cacheable),
                    total_llm_calls: llmCount,
                    total_image_calls: imageCount,
                    total_audio_calls: audioCount,
                });
            }
        }
    }

    const finalFiles = Array.from(fileResultMap.values()).filter(
        (file) => file.functions.length > 0 || file.call_sites.length > 0,
    );

    return {
        files: finalFiles,
    };
}
