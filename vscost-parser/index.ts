import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

const VALID_EXTENSIONS = [".ts", ".js", ".tsx", ".jsx"];

function get_model_cost(model_name: string): number | null {
  // read file assets/prices_llm.json
  const prices = require("./assets/prices_llm.json");
  for (const entry of prices.data) {
    if (entry.id.split("/").pop()! === model_name) {
      return parseFloat(entry.pricing.prompt);
    }
  }
  return null;
}

function isTargetCallee(callee: string): boolean {
  return (
    callee === "openai.ChatCompletion.create" ||
    callee === "gemini.chat.completions.create" ||
    callee === "anthropic.chat.completions.create" ||
    callee === "openRouter.chat.send"
  );
}

interface LLMCall {
  position: { line: number; column: number };
  model: string;
  cost_per_1M_tokens: number | null;
}

function parse_call_expression(
  node: ts.CallExpression,
  sourceFile: ts.SourceFile,
): LLMCall | null {
  const callee = node.expression.getText(sourceFile);
  if (!isTargetCallee(callee)) {
    return null;
  }
  const position = sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile),
  );
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
          const cost = get_model_cost(modelValue);
          return {
            position: position,
            model: modelValue,
            cost_per_1M_tokens: cost,
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

interface FunctionInfo {
  name: string;
  position: { line: number; column: number };
  llm_calls: LLMCall[];
}

interface FileAnalysisResult {
  file_path: string;
  functions: FunctionInfo[];
  total_cost_per_1M_tokens: number;
}

interface AnalysisResult {
  files: FileAnalysisResult[];
  total_cost_per_1M_tokens: number;
}

function parse_file(file_path: string): FileAnalysisResult {
  const ast = ts.createProgram([file_path], {}).getSourceFile(file_path);
  if (!ast) {
    throw new Error(`Could not create AST from file: ${file_path}`);
  }

  const functions: FunctionInfo[] = [];
  let totalCost = 0;

  function visitNode(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name) {
      const funcName = node.name.getText(ast);
      const pos = ast.getLineAndCharacterOfPosition(node.getStart(ast));
      const llmCalls: LLMCall[] = [];

      const callExpressions = findAllCallExpressions(node);
      for (const call of callExpressions) {
        const llmCall = parse_call_expression(call, ast);
        if (llmCall) {
          llmCalls.push(llmCall);
          if (llmCall.cost_per_1M_tokens !== null) {
            totalCost += llmCall.cost_per_1M_tokens;
          }
        }
      }

      if (llmCalls.length > 0) {
        functions.push({ name: funcName, position: pos, llm_calls: llmCalls });
      }
    }
    ts.forEachChild(node, visitNode);
  }

  ts.forEachChild(ast, visitNode);

  return {
    file_path,
    functions,
    total_cost_per_1M_tokens: totalCost,
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

function analyze_code(dir_path: string): AnalysisResult {
  const files = get_all_files(dir_path);
  const fileResults: FileAnalysisResult[] = [];
  let totalCost = 0;

  for (const file of files) {
    try {
      const result = parse_file(file);
      if (result.functions.length > 0) {
        fileResults.push(result);
        totalCost += result.total_cost_per_1M_tokens;
      }
    } catch (error) {
      console.error(`Error parsing ${file}:`, error);
    }
  }

  return {
    files: fileResults,
    total_cost_per_1M_tokens: totalCost,
  };
}

const targetDir = process.argv[2] || ".";
console.log(JSON.stringify(analyze_code(targetDir), null, 2));
