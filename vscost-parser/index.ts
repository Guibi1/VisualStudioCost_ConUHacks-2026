import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import type {
  LLMCall,
  LoopInfo,
  FunctionInfo,
  FileAnalysisResult,
  AnalysisResult,
} from "./types.js";

export type {
  LLMCall,
  LoopInfo,
  FunctionInfo,
  FileAnalysisResult,
  AnalysisResult,
} from "./types.js";
const VALID_EXTENSIONS = [".ts", ".js", ".tsx", ".jsx"];

let pricesData: { data: any[] } | null = null;

export function setPricesPath(pricesPath: string): void {
  pricesData = JSON.parse(fs.readFileSync(pricesPath, "utf-8"));
}

function loadPrices(): { data: any[] } {
  if (!pricesData) {
    // Default path for CLI usage
    const dir = import.meta.dirname ?? process.cwd();
    const pricesPath = path.join(dir, "assets/prices_llm.json");
    pricesData = JSON.parse(fs.readFileSync(pricesPath, "utf-8"));
  }
  return pricesData!;
}

function get_model_object(model_name: string): any | null {
  const prices = loadPrices();
  for (const entry of prices.data) {
    if (entry.id.split("/").pop()! === model_name) {
      return entry;
    }
  }
  return null;
}

function isTargetCallee(callee: string): boolean {
  return (
    callee === "openai.ChatCompletion.create" ||
    callee === "gemini.ChatCompletion.create" ||
    callee === "gemini.chat.completions.create" ||
    callee === "anthropic.chat.completions.create" ||
    callee === "openRouter.chat.send"
  );
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

function checkMessagesAreCacheable(
  node: ts.CallExpression,
  sourceFile: ts.SourceFile,
): boolean {
  for (const arg of node.arguments) {
    if (ts.isObjectLiteralExpression(arg)) {
      for (const prop of arg.properties) {
        if (
          ts.isPropertyAssignment(prop) &&
          prop.name.getText(sourceFile) === "messages"
        ) {
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

  const pos = sourceFile.getLineAndCharacterOfPosition(
    loopNode.getStart(sourceFile),
  );

  return {
    is_in_loop: true,
    loop_type: getLoopType(loopNode),
    position: { line: pos.line, column: pos.character },
  };
}

function parse_call_expression(
  node: ts.CallExpression,
  sourceFile: ts.SourceFile,
): LLMCall | null {
  const callee = node.expression.getText(sourceFile);
  if (!isTargetCallee(callee)) {
    return null;
  }
  const pos = sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile),
  );
  const position = { line: pos.line, column: pos.character };
  for (const arg of node.arguments) {
    if (ts.isObjectLiteralExpression(arg)) {
      for (const prop of arg.properties) {
        if (
          ts.isPropertyAssignment(prop) &&
          prop.name.getText(sourceFile) === "model"
        ) {
          const modelValue = prop.initializer
            .getText(sourceFile)
            .replace(/['"`]/g, "");
          const model_object = get_model_object(modelValue);
          const supports_thinking =
            model_object &&
            Array.isArray(model_object.supported_parameters) &&
            model_object.supported_parameters.includes("include_reasoning");
          const loop_info = getLoopInfo(node, sourceFile);
          const is_cacheable = checkMessagesAreCacheable(node, sourceFile);
          const is_deprecated = isModelDeprecated(model_object);
          const cost_per_1M_tokens = model_object?.pricing?.prompt
            ? parseFloat(model_object.pricing.prompt) * 1_000_000
            : null;
          return {
            callee: callee,
            position: position,
            model: modelValue,
            cost_per_1M_tokens: cost_per_1M_tokens,
            supports_thinking: supports_thinking,
            is_deprecated: is_deprecated,
            is_cacheable: is_cacheable,
            loop_info: loop_info,
          };
        }
      }
    }
  }
  return null;
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

function parse_file(file_path: string): FileAnalysisResult {
  const maybeAst = ts.createProgram([file_path], {}).getSourceFile(file_path);
  if (!maybeAst) {
    throw new Error(`Could not create AST from file: ${file_path}`);
  }
  const ast: ts.SourceFile = maybeAst;

  // Set parent references for all nodes
  setParentNodes(ast);

  const functions: FunctionInfo[] = [];

  function visitNode(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name) {
      const funcName = node.name.getText(ast);
      const funcPos = ast.getLineAndCharacterOfPosition(node.getStart(ast));
      const position = { line: funcPos.line, column: funcPos.character };
      const llmCalls: LLMCall[] = [];

      const callExpressions = findAllCallExpressions(node);
      for (const call of callExpressions) {
        const llmCall = parse_call_expression(call, ast);
        if (llmCall) {
          llmCalls.push(llmCall);
        }
      }

      if (llmCalls.length > 0) {
        functions.push({ name: funcName, position: position, llm_calls: llmCalls });
      }
    }
    ts.forEachChild(node, visitNode);
  }

  ts.forEachChild(ast, visitNode);

  return {
    file_path,
    functions,
  };
}

function get_all_files(dir_path: string): string[] {
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

export function analyze_code(dir_path: string): AnalysisResult {
  const files = get_all_files(dir_path);
  const fileResults: FileAnalysisResult[] = [];
  let totalCost = 0;

  for (const file of files) {
    try {
      const result = parse_file(file);
      if (result.functions.length > 0) {
        fileResults.push(result);
      }
    } catch (error) {
      console.error(`Error parsing ${file}:`, error);
    }
  }

  return {
    files: fileResults,
  };
}

// CLI entry point - only run when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const targetDir = process.argv[2] || ".";
  console.log(JSON.stringify(analyze_code(targetDir), null, 2));
}
