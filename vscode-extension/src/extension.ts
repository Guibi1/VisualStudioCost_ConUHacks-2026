import * as vscode from "vscode";
import * as path from "path";

interface LoopInfo {
  is_in_loop: boolean;
  loop_type: string | null;
  position: { line: number; column: number } | null;
}

interface LLMCall {
  callee: string;
  position: { line: number; column: number };
  model: string;
  cost_per_1M_tokens: number | null;
  supports_thinking: boolean;
  is_deprecated: boolean;
  is_cacheable: boolean;
  loop_info: LoopInfo;
}

interface FunctionInfo {
  name: string;
  position: { line: number; column: number };
  llm_calls: LLMCall[];
}

interface FileAnalysisResult {
  file_path: string;
  functions: FunctionInfo[];
}

interface AnalysisResult {
  files: FileAnalysisResult[];
}

class FunctionHintProvider implements vscode.CodeLensProvider {
  private analysis: AnalysisResult;

  constructor(analysis: AnalysisResult) {
    this.analysis = analysis;
  }

  async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];
    const filePath = document.uri.fsPath;
    console.log("provideCodeLenses called for:", filePath);
    console.log("Available files in analysis:", this.analysis.files.map((f: FileAnalysisResult) => f.file_path));

    // Find the analysis for this file
    const fileAnalysis = this.analysis.files.find((f: FileAnalysisResult) => f.file_path === filePath);
    if (!fileAnalysis) {
      console.log("No analysis found for this file");
      return codeLenses;
    }
    console.log("Found analysis for file:", fileAnalysis);

    // Create CodeLens for each LLM call
    for (const func of fileAnalysis.functions) {
      for (const llmCall of func.llm_calls) {
        const line = llmCall.position.line;
        const range = new vscode.Range(line, 0, line, 0);

        // Build info string
        const info: string[] = [];

        // Add cost
        if (llmCall.cost_per_1M_tokens !== null) {
          info.push(`$${llmCall.cost_per_1M_tokens.toFixed(2)}/1M tokens`);
        }

        if (llmCall.is_deprecated) {
          info.push("Deprecated");
        }
        if (llmCall.loop_info.is_in_loop) {
          info.push(`In ${llmCall.loop_info.loop_type} loop`);
        }
        if (llmCall.is_cacheable) {
          info.push("Cacheable");
        }
        if (llmCall.supports_thinking) {
          info.push("Thinking");
        }

        const title = `${llmCall.model} | ${info.join(" | ")}`;

        codeLenses.push(
          new vscode.CodeLens(range, {
            title: title,
            command: "",
          }),
        );
      }
    }

    return codeLenses;
  }
}

export async function activate(context: vscode.ExtensionContext) {
  try {
    console.log("VSCost extension activating...");
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      console.log("No workspace folder found");
      return;
    }

    const projectUri = workspaceFolders[0].uri;
    const projectPath = projectUri.fsPath;
    console.log("Project path:", projectPath);

    // Dynamic import for ESM module
    const { analyze_code, setPricesPath } = await import("vscost-parser");

    // Set prices path using extension context
    const pricesPath = path.join(context.extensionPath, "assets", "prices_llm.json");
    console.log("Prices path:", pricesPath);
    setPricesPath(pricesPath);

    const analysis = analyze_code(projectPath);
    console.log("Analysis complete:", JSON.stringify(analysis, null, 2));

    const provider = new FunctionHintProvider(analysis);

    const codeLensDisposable = vscode.languages.registerCodeLensProvider(
      [
        { language: "typescript", scheme: "file" },
        { language: "typescriptreact", scheme: "file" },
        { language: "javascript", scheme: "file" },
        { language: "javascriptreact", scheme: "file" },
      ],
      provider,
    );

    context.subscriptions.push(codeLensDisposable);
    console.log("VSCost CodeLens provider registered");
  } catch (error) {
    console.error("VSCost activation failed:", error);
  }
}

export function deactivate() {}
