import * as vscode from "vscode";

class FunctionHintProvider implements vscode.CodeLensProvider {
    async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
        const codeLenses: vscode.CodeLens[] = [];

        // Get all symbols in the document
        const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
            "vscode.executeDocumentSymbolProvider",
            document.uri,
        );

        if (!symbols) {
            return codeLenses;
        }

        // Recursively find all functions
        const findFunctions = (symbols: vscode.DocumentSymbol[]) => {
            for (const symbol of symbols) {
                if (symbol.kind === vscode.SymbolKind.Function || symbol.kind === vscode.SymbolKind.Method) {
                    const range = new vscode.Range(symbol.range.start.line, 0, symbol.range.start.line, 0);
                    codeLenses.push(
                        new vscode.CodeLens(range, {
                            title: `💡 ${symbol.name}`,
                            command: "",
                        }),
                    );
                }
                if (symbol.children) {
                    findFunctions(symbol.children);
                }
            }
        };

        findFunctions(symbols);
        return codeLenses;
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log("VSCost extension activating...");

    const provider = new FunctionHintProvider();

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
}

export function deactivate() {}
