import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

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

interface FunctionCallSite {
    callee: string;
    position: { line: number; column: number };
    llm_calls: LLMCall[];
    is_cacheable: boolean;
    total_llm_calls: number;
}

interface FileAnalysisResult {
    file_path: string;
    functions: FunctionInfo[];
    call_sites: FunctionCallSite[];
}

interface AnalysisResult {
    files: FileAnalysisResult[];
}

interface PriceEntry {
    id: string;
    name?: string;
    architecture?: { modality?: string };
    pricing?: { prompt?: string };
    created?: number;
    expiration_date?: string | null;
}

function formatLLMCalls(llmCalls: LLMCall[], totalCountOverride?: number): string {
    if (llmCalls.length === 0) {
        return "LLM call";
    }

    const totalCalls = totalCountOverride ?? llmCalls.length;

    const perModel = llmCalls.map((call) => {
        const parts = [call.model];
        if (call.cost_per_1M_tokens !== null) {
            parts.push(`$${call.cost_per_1M_tokens.toFixed(2)}/1M`);
        }
        return parts.join(" ");
    });

    const pieces = [];
    pieces.push(`Total ${totalCalls} LLM call${totalCalls !== 1 ? "s" : ""}`);
    pieces.push(...perModel);

    return pieces.join(" | ");
}

function getCostTabHtml(analysis: AnalysisResult): string {
    const styles = `
        :root {
            color-scheme: light dark;
        }
        body {
            margin: 0;
            padding: 8px 10px 12px;
            background: var(--vscode-sideBar-background);
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
        }
        h1 { margin: 0 0 4px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--vscode-descriptionForeground); }
        p { margin: 0 0 10px; color: var(--vscode-descriptionForeground); }
        .files { display: flex; flex-direction: column; gap: 4px; }
        details.file {
            border-radius: 4px;
        }
        details summary {
            cursor: pointer;
            padding: 4px 8px;
            user-select: none;
            color: var(--vscode-foreground);
        }
        details summary:hover { background: var(--vscode-list-hoverBackground); }
        details[open] summary { background: var(--vscode-list-activeSelectionBackground); }
        summary .row {
            display: flex;
            gap: 6px;
            align-items: center;
        }
        .icon-file {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 14px;
            height: 14px;
            color: var(--vscode-icon-foreground, var(--vscode-foreground));
        }
        .icon-file svg {
            width: 14px;
            height: 14px;
            fill: currentColor;
        }
        .file-link {
            all: unset;
            cursor: pointer;
            color: inherit;
            display: inline;
            font-weight: 600;
        }
        .file-link:hover {
            color: var(--vscode-textLink-foreground);
            text-decoration: underline;
        }
        .call-link {
            all: unset;
            cursor: pointer;
            color: inherit;
            font-weight: 600;
        }
        .call-link:hover {
            color: var(--vscode-textLink-foreground);
            text-decoration: underline;
        }
        .file-path { color: var(--vscode-descriptionForeground); font-size: 12px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .badge {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 12px;
            padding: 2px 6px;
            font-size: 12px;
            font-weight: 500;
            line-height: 1;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        .badge.muted { background: var(--vscode-editor-inactiveSelectionBackground); color: var(--vscode-foreground); }
        .file-body { padding: 6px 8px 10px; border-top: 1px solid var(--vscode-editorGroup-border); background: var(--vscode-editor-background); }
        .section-title { margin: 8px 0 4px; font-size: 11px; font-weight: 700; color: var(--vscode-descriptionForeground); text-transform: uppercase; letter-spacing: 0.03em; }
        .item { padding: 6px 8px; border-radius: 4px; }
        .item h4 { margin: 0 0 2px; font-size: 12px; font-weight: 600; }
        .item .meta { color: var(--vscode-descriptionForeground); font-size: 12px; display: flex; gap: 6px; flex-wrap: wrap; }
        .empty { color: var(--vscode-descriptionForeground); font-size: 12px; margin: 4px 0 0; }
        code { background: var(--vscode-textPreformat-background); color: var(--vscode-textPreformat-foreground); padding: 2px 6px; border-radius: 4px; }
        summary:focus-visible, button:focus-visible, details:focus-visible {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: 2px;
        }
    `;

    const analysisJson = JSON.stringify(analysis).replace(/</g, "\\u003c");

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>${styles}</style>
        <title>VSCost</title>
    </head>
    <body>
        <h1>VSCost</h1>
        <p>Expand a file to see direct and indirect LLM usage.</p>
        <div class="files" id="files"></div>
        <script>
            const data = ${analysisJson};

            const filesEl = document.getElementById('files');

            const createBadge = (text, extra = '') => {
                const b = document.createElement('span');
                b.className = 'badge ' + extra;
                b.textContent = text;
                return b;
            };

            const addRow = (parent, title, metaParts, badges = [], location) => {
                const item = document.createElement('div');
                item.className = 'item';

                const h = document.createElement('h4');
                if (location) {
                    const link = document.createElement('button');
                    link.type = 'button';
                    link.className = 'call-link';
                    link.dataset.path = location.path;
                    if (typeof location.line === 'number') link.dataset.line = String(location.line);
                    link.setAttribute('data-open-file', 'true');
                    link.textContent = title;
                    h.appendChild(link);
                } else {
                    h.textContent = title;
                }
                item.appendChild(h);

                if (metaParts.length) {
                    const meta = document.createElement('div');
                    meta.className = 'meta';
                    metaParts.forEach((m) => {
                        const span = document.createElement('span');
                        span.textContent = m;
                        meta.appendChild(span);
                    });
                    item.appendChild(meta);
                }

                if (badges.length) {
                    const wrap = document.createElement('div');
                    wrap.style.marginTop = '6px';
                    wrap.style.display = 'flex';
                    wrap.style.gap = '6px';
                    badges.forEach((b) => wrap.appendChild(b));
                    item.appendChild(wrap);
                }

                parent.appendChild(item);
            };

            const totalFiles = data?.files?.length ?? 0;
            if (!totalFiles) {
                filesEl.textContent = 'No files analyzed.';
            }

            data.files.forEach((file) => {
                const functionsWithCalls = (file.functions || []).filter((fn) => (fn.llm_calls?.length || 0) > 0);
                const callSitesWithCalls = (file.call_sites || []).filter((cs) => (cs.llm_calls?.length || 0) > 0);

                const directCalls = functionsWithCalls.reduce((acc, fn) => acc + (fn.llm_calls?.length || 0), 0);
                const indirectCalls = callSitesWithCalls.reduce((acc, cs) => acc + (cs.llm_calls?.length || 0), 0);

                if (directCalls === 0 && indirectCalls === 0) {
                    return;
                }

                const details = document.createElement('details');
                details.className = 'file';

                const summary = document.createElement('summary');

                const row = document.createElement('span');
                row.className = 'row';

                const icon = document.createElement('span');
                icon.className = 'icon-file';
                icon.innerHTML = '<svg viewBox="0 0 16 16" role="img" aria-label="file"><path d="M9 1H4.75A1.75 1.75 0 0 0 3 2.75v10.5c0 .966.784 1.75 1.75 1.75h5.5c.966 0 1.75-.784 1.75-1.75V5.5L9 1Zm0 .06V5.5h3.44L9 1.06ZM4.75 2h3.5v4.25c0 .414.336.75.75.75H13v6.25a.75.75 0 0 1-.75.75h-5.5a.75.75 0 0 1-.75-.75V2.75A.75.75 0 0 1 4.75 2Z"></path></svg>';

                const name = document.createElement('button');
                name.type = 'button';
                name.className = 'file-link';
                name.dataset.path = file.file_path;
                name.setAttribute('data-open-file', 'true');
                name.textContent = file.file_path.split(/[/\\\\]/).pop() || file.file_path;

                const pathText = document.createElement('span');
                pathText.className = 'file-path';
                pathText.textContent = file.file_path;

                row.appendChild(icon);
                row.appendChild(name);
                row.appendChild(pathText);
                row.appendChild(createBadge(directCalls + ' LLM calls'));
                row.appendChild(createBadge(functionsWithCalls.length + ' functions', 'muted'));
                row.appendChild(createBadge(callSitesWithCalls.length + ' indirect', 'muted'));

                summary.appendChild(row);

                details.appendChild(summary);

                const body = document.createElement('div');
                body.className = 'file-body';

                // Direct LLM calls in functions
                const fnTitle = document.createElement('div');
                fnTitle.className = 'section-title';
                fnTitle.textContent = 'Direct LLM calls in functions';
                body.appendChild(fnTitle);

                if (!functionsWithCalls.length) {
                    const empty = document.createElement('div');
                    empty.className = 'empty';
                    empty.textContent = 'No direct LLM calls detected.';
                    body.appendChild(empty);
                } else {
                    functionsWithCalls.forEach((fn) => {
                        (fn.llm_calls || []).forEach((call) => {
                            addRow(
                                body,
                                fn.name || '(anonymous)',
                                ['line ' + (call.position.line + 1), call.model],
                                [createBadge('call')],
                                { path: file.file_path, line: call.position.line },
                            );
                        });
                    });
                }

                // Indirect call sites
                const csTitle = document.createElement('div');
                csTitle.className = 'section-title';
                csTitle.textContent = 'Indirect LLM call sites';
                body.appendChild(csTitle);

                if (!callSitesWithCalls.length) {
                    const empty = document.createElement('div');
                    empty.className = 'empty';
                    empty.textContent = 'No indirect call sites detected.';
                    body.appendChild(empty);
                } else {
                    callSitesWithCalls.forEach((cs) => {
                        const callCount = cs.llm_calls?.length || 0;
                        const badges = [
                            createBadge(callCount + ' call' + (callCount === 1 ? '' : 's')),
                        ];
                        if (cs.is_cacheable) {
                            badges.push(createBadge('cacheable', 'muted'));
                        }
                        addRow(
                            body,
                            cs.callee,
                            ['line ' + (cs.position.line + 1), 'indirect total ' + (cs.total_llm_calls ?? callCount)],
                            badges,
                            { path: file.file_path, line: cs.position.line },
                        );
                    });
                }

                details.appendChild(body);
                filesEl.appendChild(details);
            });

            const vscode = acquireVsCodeApi();
            document.addEventListener('click', (e) => {
                const target = e.target instanceof HTMLElement ? e.target.closest('[data-open-file]') : null;
                if (!target) return;
                e.preventDefault();
                e.stopPropagation();
                const path = target.dataset.path;
                const line = target.dataset.line ? parseInt(target.dataset.line, 10) : undefined;
                if (path) {
                    vscode.postMessage({ type: 'openFile', path, line });
                }
            });
        </script>
    </body>
    </html>`;
}

function loadPrices(pricesPath: string): PriceEntry[] {
    try {
        const raw = fs.readFileSync(pricesPath, "utf-8");
        const parsed = JSON.parse(raw);
        return (parsed.data as PriceEntry[]) ?? [];
    } catch (e) {
        console.error("Failed to load prices:", e);
        return [];
    }
}

function recommendModel(currentId: string, pricesPath: string): string | null {
    const prices = loadPrices(pricesPath);
    if (!prices || prices.length === 0) return null;

    const current = prices.find((p) => p.id === currentId) ?? prices.find((p) => p.id.split("/").pop() === currentId);
    if (!current) return null;

    const provider = current.id.split("/")[0];
    const modality = current.architecture?.modality ?? "text->text";
    const currentPrompt = Number.parseFloat(current.pricing?.prompt ?? "NaN");
    const isDeprecated = current.expiration_date !== null;

    const activeCandidates = prices
        .filter((p) => p.id !== current.id)
        .filter((p) => p.expiration_date === null)
        .filter((p) => (p.architecture?.modality ?? "text->text") === modality)
        .filter((p) => p.id.startsWith(`${provider}/`))
        .map((p) => ({
            model: p.id,
            prompt: Number.parseFloat(p.pricing?.prompt ?? "NaN"),
            created: p.created ?? 0,
        }))
        .filter((p) => Number.isFinite(p.prompt));

    if (activeCandidates.length === 0) return null;

    if (isDeprecated) {
        // Prefer the newest active sibling; fall back to cheapest if created is identical.
        activeCandidates.sort((a, b) => {
            if (a.created !== b.created) return b.created - a.created;
            return a.prompt - b.prompt;
        });
        return activeCandidates[0]?.model ?? null;
    }

    const cheaperCandidates = activeCandidates.filter((p) => p.prompt < currentPrompt);
    if (cheaperCandidates.length === 0) return null;

    cheaperCandidates.sort((a, b) => {
        if (a.prompt !== b.prompt) return a.prompt - b.prompt;
        return b.created - a.created;
    });

    // Pick randomly from top 3 cheapest (or fewer if less available)
    const topN = Math.min(3, cheaperCandidates.length);
    const randomIndex = Math.floor(Math.random() * topN);
    return cheaperCandidates[randomIndex]?.model ?? null;
}

function findModelStringRange(document: vscode.TextDocument, modelId: string): vscode.Range | null {
    const text = document.getText();
    const quoteVariants = [`"${modelId}"`, `'${modelId}'`, `\`${modelId}\``];
    let idx = -1;
    let matchLength = 0;
    for (const q of quoteVariants) {
        idx = text.indexOf(q);
        if (idx >= 0) {
            matchLength = q.length;
            break;
        }
    }
    if (idx < 0) return null;
    const start = document.positionAt(idx);
    const end = document.positionAt(idx + matchLength);
    return new vscode.Range(start, end);
}

class FunctionHintProvider implements vscode.CodeLensProvider {
    private analysis: AnalysisResult;
    private readonly _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

    constructor(analysis: AnalysisResult) {
        this.analysis = analysis;
    }

    setAnalysis(analysis: AnalysisResult) {
        this.analysis = analysis;
        this._onDidChangeCodeLenses.fire();
    }

    async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
        const codeLenses: vscode.CodeLens[] = [];
        const filePath = document.uri.fsPath;
        console.log("provideCodeLenses called for:", filePath);
        console.log(
            "Available files in analysis:",
            this.analysis.files.map((f: FileAnalysisResult) => f.file_path),
        );

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
                    if (llmCall.cost_per_1M_tokens > 5.0) {
                        info.push(" 🤑 Costly");
                    } else {
                        info.push(" ✅ Affordable");
                    }
                }

                if (llmCall.is_deprecated) {
                    info.push(" 👴 Deprecated");
                }
                if (llmCall.loop_info.is_in_loop) {
                    info.push(` 🔁 In ${llmCall.loop_info.loop_type} loop`);
                }
                if (llmCall.is_cacheable) {
                    info.push(" ⚠️ Cacheable");
                }
                if (llmCall.supports_thinking) {
                    info.push(" 💸 Thinking");
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

        // Create CodeLens for call sites that transitively invoke LLMs
        for (const callSite of fileAnalysis.call_sites ?? []) {
            if (!callSite.llm_calls || callSite.llm_calls.length === 0) {
                continue;
            }

            const line = callSite.position.line;
            const range = new vscode.Range(line, 0, line, 0);
            const infoParts = [
                `Indirect LLM via ${callSite.callee}: ${formatLLMCalls(callSite.llm_calls, callSite.total_llm_calls)}`,
            ];
            if (callSite.is_cacheable) {
                infoParts.push("⚠️ Cacheable");
            }
            const title = infoParts.join(" | ");

            codeLenses.push(
                new vscode.CodeLens(range, {
                    title,
                    command: "",
                }),
            );
        }

        return codeLenses;
    }
}

type TreeEntry =
    | { kind: "file"; file: FileAnalysisResult }
    | { kind: "group"; label: string; calls: TreeEntry[] }
    | { kind: "call"; filePath: string; line: number; label: string; description: string; icon: vscode.ThemeIcon };

class VSCostTreeDataProvider implements vscode.TreeDataProvider<TreeEntry> {
    private analysis: AnalysisResult;
    private readonly workspaceRoot: string;
    private _onDidChangeTreeData = new vscode.EventEmitter<TreeEntry | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(analysis: AnalysisResult, workspaceRoot: string) {
        this.analysis = analysis;
        this.workspaceRoot = workspaceRoot;
    }

    setAnalysis(analysis: AnalysisResult) {
        this.analysis = analysis;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TreeEntry): vscode.TreeItem {
        if (element.kind === "file") {
            const treeItem = new vscode.TreeItem(
                path.basename(element.file.file_path),
                vscode.TreeItemCollapsibleState.Collapsed,
            );
            treeItem.resourceUri = vscode.Uri.file(element.file.file_path);
            treeItem.description = path.relative(this.workspaceRoot, element.file.file_path);
            treeItem.command = {
                command: "vscost.openLocation",
                title: "Open file",
                arguments: [element.file.file_path, 0],
            };
            return treeItem;
        }

        if (element.kind === "group") {
            const treeItem = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Expanded);
            treeItem.iconPath = new vscode.ThemeIcon("group-by-ref-type");
            treeItem.description = `${element.calls.length} call${element.calls.length === 1 ? "" : "s"}`;
            treeItem.contextValue = "group";
            return treeItem;
        }

        const treeItem = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
        treeItem.description = element.description;
        treeItem.iconPath = element.icon;
        treeItem.command = {
            command: "vscost.openLocation",
            title: "Open call",
            arguments: [element.filePath, element.line],
        };
        return treeItem;
    }

    getChildren(element?: TreeEntry): TreeEntry[] {
        if (!element) {
            return this.analysis.files
                .filter((file) => this.fileHasCalls(file))
                .map((file) => ({ kind: "file", file }));
        }

        if (element.kind === "file") {
            const directCalls: TreeEntry[] = [];
            for (const fn of element.file.functions || []) {
                for (const call of fn.llm_calls || []) {
                    directCalls.push({
                        kind: "call",
                        filePath: element.file.file_path,
                        line: call.position.line,
                        label: `${fn.name || "(anonymous)"} · ${call.model}`,
                        description: `line ${call.position.line + 1}`,
                        icon: new vscode.ThemeIcon("symbol-method"),
                    });
                }
            }

            const indirectCalls: TreeEntry[] = [];
            for (const cs of element.file.call_sites || []) {
                for (const call of cs.llm_calls || []) {
                    indirectCalls.push({
                        kind: "call",
                        filePath: element.file.file_path,
                        line: call.position.line,
                        label: `Uses LLM indirectly · ${cs.callee} · ${call.model}`,
                        description: `line ${call.position.line + 1}`,
                        icon: new vscode.ThemeIcon("link"),
                    });
                }
            }

            const groups: TreeEntry[] = [];
            if (directCalls.length) {
                groups.push({ kind: "group", label: "Direct LLM calls", calls: directCalls });
            }
            if (indirectCalls.length) {
                groups.push({ kind: "group", label: "Uses LLM indirectly", calls: indirectCalls });
            }

            return groups;
        }

        if (element.kind === "group") {
            return element.calls;
        }

        return [];
    }

    private fileHasCalls(file: FileAnalysisResult): boolean {
        const direct = (file.functions || []).some((fn) => (fn.llm_calls?.length || 0) > 0);
        const indirect = (file.call_sites || []).some((cs) => (cs.llm_calls?.length || 0) > 0);
        return direct || indirect;
    }
}

type DiagnosticEntry =
    | { kind: "category"; label: string; severity: "error" | "warning" | "info"; items: DiagnosticEntry[] }
    | {
          kind: "item";
          label: string;
          description: string;
          filePath: string;
          line: number;
          severity: "error" | "warning" | "info";
      };

class DiagnosticsTreeDataProvider implements vscode.TreeDataProvider<DiagnosticEntry> {
    private analysis: AnalysisResult;
    private _onDidChangeTreeData = new vscode.EventEmitter<DiagnosticEntry | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(analysis: AnalysisResult) {
        this.analysis = analysis;
    }

    setAnalysis(analysis: AnalysisResult): void {
        this.analysis = analysis;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DiagnosticEntry): vscode.TreeItem {
        if (element.kind === "category") {
            const treeItem = new vscode.TreeItem(
                element.label,
                element.items.length > 0
                    ? vscode.TreeItemCollapsibleState.Expanded
                    : vscode.TreeItemCollapsibleState.None,
            );
            const iconMap = { error: "error", warning: "warning", info: "info" };
            treeItem.iconPath = new vscode.ThemeIcon(iconMap[element.severity]);
            treeItem.description = `${element.items.length}`;
            return treeItem;
        }

        const treeItem = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
        treeItem.description = element.description;
        const iconMap = { error: "circle-filled", warning: "circle-filled", info: "circle-filled" };
        const colorMap = {
            error: "errorForeground",
            warning: "editorWarning.foreground",
            info: "editorInfo.foreground",
        };
        treeItem.iconPath = new vscode.ThemeIcon(
            iconMap[element.severity],
            new vscode.ThemeColor(colorMap[element.severity]),
        );
        treeItem.command = {
            command: "vscost.openLocation",
            title: "Open location",
            arguments: [element.filePath, element.line],
        };
        return treeItem;
    }

    getChildren(element?: DiagnosticEntry): DiagnosticEntry[] {
        if (!element) {
            const errors: DiagnosticEntry[] = [];
            const warnings: DiagnosticEntry[] = [];
            const info: DiagnosticEntry[] = [];

            for (const file of this.analysis.files) {
                const fileName = file.file_path.split(/[/\\]/).pop() || file.file_path;
                for (const fn of file.functions || []) {
                    for (const call of fn.llm_calls || []) {
                        if (call.is_deprecated) {
                            errors.push({
                                kind: "item",
                                label: `Deprecated: ${call.model}`,
                                description: `${fileName}:${call.position.line + 1}`,
                                filePath: file.file_path,
                                line: call.position.line,
                                severity: "error",
                            });
                        }
                        if (call.cost_per_1M_tokens !== null && call.cost_per_1M_tokens > 5) {
                            errors.push({
                                kind: "item",
                                label: `Costly: $${call.cost_per_1M_tokens.toFixed(2)}/1M`,
                                description: `${fileName}:${call.position.line + 1}`,
                                filePath: file.file_path,
                                line: call.position.line,
                                severity: "error",
                            });
                        }
                        if (call.supports_thinking) {
                            info.push({
                                kind: "item",
                                label: `Thinking: ${call.model}`,
                                description: `${fileName}:${call.position.line + 1}`,
                                filePath: file.file_path,
                                line: call.position.line,
                                severity: "info",
                            });
                        }
                        if (call.loop_info.is_in_loop) {
                            warnings.push({
                                kind: "item",
                                label: `In ${call.loop_info.loop_type} loop`,
                                description: `${fileName}:${call.position.line + 1}`,
                                filePath: file.file_path,
                                line: call.position.line,
                                severity: "warning",
                            });
                        }
                    }
                }
            }

            return [
                { kind: "category", label: "Errors", severity: "error", items: errors },
                { kind: "category", label: "Warnings", severity: "warning", items: warnings },
                { kind: "category", label: "Info", severity: "info", items: info },
            ];
        }

        if (element.kind === "category") {
            return element.items;
        }

        return [];
    }
}

class QuickPicksWebviewProvider implements vscode.WebviewViewProvider {
    private view?: vscode.WebviewView;
    private readonly pricesPath: string;
    private analysis: AnalysisResult;

    constructor(pricesPath: string, analysis: AnalysisResult) {
        this.pricesPath = pricesPath;
        this.analysis = analysis;
    }

    setAnalysis(analysis: AnalysisResult): void {
        this.analysis = analysis;
        this.refresh();
    }

    resolveWebviewView(webviewView: vscode.WebviewView): void {
        this.view = webviewView;
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = this.getHtml();
    }

    refresh(): void {
        if (this.view) {
            this.view.webview.html = this.getHtml();
        }
    }

    private getHtml(): string {
        const prices = loadPrices(this.pricesPath);

        // Filter models with valid prompt pricing
        const modelsWithPricing = prices
            .filter((p) => p.pricing?.prompt !== undefined)
            .map((p) => ({
                id: p.id,
                name: p.name ?? p.id,
                provider: p.id.split("/")[0] || "unknown",
                price: Number.parseFloat(p.pricing?.prompt ?? "NaN") * 1_000_000,
                expirationDate: p.expiration_date,
            }))
            .filter((p) => Number.isFinite(p.price));

        // Active models (no expiration date)
        const activeModels = modelsWithPricing.filter((m) => m.expirationDate === null);

        // Deprecated models (have expiration date)
        const deprecatedModels = modelsWithPricing
            .filter((m) => m.expirationDate !== null)
            .sort((a, b) => {
                if (a.expirationDate && b.expirationDate) {
                    return a.expirationDate.localeCompare(b.expirationDate);
                }
                return 0;
            })
            .slice(0, 3);

        // Top 3 cheapest (excluding free models with price 0)
        const cheapestModels = [...activeModels]
            .filter((m) => m.price > 0)
            .sort((a, b) => a.price - b.price)
            .slice(0, 3);

        // Top 3 most expensive
        const expensiveModels = [...activeModels].sort((a, b) => b.price - a.price).slice(0, 3);

        const renderCard = (
            model: { id: string; name: string; provider: string; price: number; expirationDate?: string | null },
            copyable = false,
        ) => {
            const modelName = model.id.split("/").pop() || model.id;
            const priceOrExpiry = model.expirationDate
                ? `expires: ${model.expirationDate}`
                : `$${model.price.toFixed(2)}/1M tokens`;
            const copyAttr = copyable ? `data-copy="${model.id}"` : "";
            const copyClass = copyable ? " card-copyable" : "";
            return `
                <div class="card${copyClass}" ${copyAttr}>
                    <div class="card-name">${modelName}</div>
                    <div class="card-provider">${model.provider}</div>
                    <div class="card-price">${priceOrExpiry}</div>
                </div>
            `;
        };

        const renderCategory = (emoji: string, label: string, models: typeof modelsWithPricing, copyable = false) => {
            if (models.length === 0) return "";
            return `
                <div class="category">
                    <div class="category-header">${emoji} ${label}</div>
                    <div class="cards">
                        ${models.map((m) => renderCard(m, copyable)).join("")}
                    </div>
                </div>
            `;
        };

        const styles = `
            :root {
                color-scheme: light dark;
            }
            body {
                margin: 0;
                padding: 8px;
                background: var(--vscode-sideBar-background);
                color: var(--vscode-foreground);
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
            }
            .category {
                margin-bottom: 16px;
            }
            .category-header {
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: var(--vscode-descriptionForeground);
                margin-bottom: 8px;
                padding: 0 4px;
            }
            .cards {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .card {
                background: var(--vscode-editor-background);
                border: 1px solid var(--vscode-editorGroup-border);
                border-radius: 6px;
                padding: 10px 12px;
            }
            .card:hover {
                border-color: var(--vscode-focusBorder);
            }
            .card-name {
                font-weight: 600;
                font-size: 12px;
                color: var(--vscode-foreground);
                margin-bottom: 2px;
                word-break: break-word;
            }
            .card-provider {
                font-size: 11px;
                color: var(--vscode-descriptionForeground);
                margin-bottom: 4px;
            }
            .card-price {
                font-size: 11px;
                color: var(--vscode-textLink-foreground);
                font-weight: 500;
            }
            .empty {
                color: var(--vscode-descriptionForeground);
                font-size: 12px;
                padding: 12px;
                text-align: center;
            }
            .card-copyable {
                cursor: pointer;
                position: relative;
            }
            .card-copyable::after {
                content: "Click to copy";
                position: absolute;
                right: 8px;
                top: 8px;
                font-size: 9px;
                color: var(--vscode-descriptionForeground);
                opacity: 0;
                transition: opacity 0.15s;
            }
            .card-copyable:hover::after {
                opacity: 1;
            }
            .card-copyable.copied::after {
                content: "Copied!";
                color: var(--vscode-textLink-foreground);
                opacity: 1;
            }
        `;

        const content = [
            renderCategory("🤑", "CHEAPEST", cheapestModels, true),
            renderCategory("💀", "DEPRECATED", deprecatedModels),
            renderCategory("🔥", "CASH BURNERS", expensiveModels),
        ].join("");

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>${styles}</style>
        </head>
        <body>
            ${content || '<div class="empty">No model data available</div>'}
            <script>
                document.querySelectorAll('.card-copyable').forEach(card => {
                    card.addEventListener('click', async () => {
                        const modelId = card.dataset.copy;
                        if (modelId) {
                            await navigator.clipboard.writeText(modelId);
                            card.classList.add('copied');
                            setTimeout(() => card.classList.remove('copied'), 1500);
                        }
                    });
                });
            </script>
        </body>
        </html>`;
    }
}

class VSCostCodeActionProvider implements vscode.CodeActionProvider {
    private readonly recommendations: Map<string, { current: string; recommended: string }>;
    private readonly ignoredThinking: Set<string>;

    constructor(recommendations: Map<string, { current: string; recommended: string }>, ignoredThinking: Set<string>) {
        this.recommendations = recommendations;
        this.ignoredThinking = ignoredThinking;
    }

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range,
        context: vscode.CodeActionContext,
    ): vscode.CodeAction[] {
        console.log("VSCost CodeAction: called for", document.uri.fsPath, "line", range.start.line);
        console.log("VSCost CodeAction: recommendations count:", this.recommendations.size);
        const actions: vscode.CodeAction[] = [];

        const addActions = (line: number, diag?: vscode.Diagnostic) => {
            const key = `${document.uri.fsPath}:${line}`;
            console.log("VSCost CodeAction: checking key:", key, "found:", this.recommendations.has(key));
            const rec = this.recommendations.get(key);
            if (!rec) return;

            const replaceAction = new vscode.CodeAction(
                `Replace model with ${rec.recommended}`,
                vscode.CodeActionKind.QuickFix,
            );
            if (diag) replaceAction.diagnostics = [diag];
            replaceAction.isPreferred = true;

            const rangeToReplace = findModelStringRange(document, rec.current);
            if (rangeToReplace) {
                replaceAction.edit = new vscode.WorkspaceEdit();
                replaceAction.edit.replace(document.uri, rangeToReplace, JSON.stringify(rec.recommended));
            } else {
                replaceAction.command = {
                    command: "vscost.openCostTab",
                    title: "Open VSCost tab",
                };
            }
            actions.push(replaceAction);

            const openAction = new vscode.CodeAction(
                "VSCost: Review cheaper / newer models",
                vscode.CodeActionKind.QuickFix,
            );
            if (diag) openAction.diagnostics = [diag];
            openAction.command = {
                command: "vscost.openCostTab",
                title: "Open VSCost tab",
            };
            actions.push(openAction);
        };

        if (context.diagnostics.length) {
            for (const diag of context.diagnostics) {
                if (diag.source !== "VSCost") continue;
                addActions(diag.range.start.line, diag);

                // Add "Ignore thinking warning" action if this is a thinking diagnostic
                if (diag.message.includes("Thinking mode")) {
                    const key = `${document.uri.fsPath}:${diag.range.start.line}`;
                    if (!this.ignoredThinking.has(key)) {
                        const ignoreAction = new vscode.CodeAction(
                            "Ignore thinking model warning",
                            vscode.CodeActionKind.QuickFix,
                        );
                        ignoreAction.diagnostics = [diag];
                        ignoreAction.command = {
                            command: "vscost.ignoreThinking",
                            title: "Ignore thinking warning",
                            arguments: [key],
                        };
                        actions.push(ignoreAction);
                    }
                }
            }
        } else {
            // Provide actions even without diagnostics when cursor is on a call line
            addActions(range.start.line);
        }
        console.log("VSCost CodeAction: returning", actions.length, "actions");
        return actions;
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
        const { analyze_code, setPricesPath, get_all_files } = await import("vscost-parser");

        // Set prices path using extension context
        const pricesPath = path.join(context.extensionPath, "assets", "prices_llm.json");
        console.log("Prices path:", pricesPath);
        setPricesPath(pricesPath);
        const files = get_all_files(projectPath);
        let analysis = analyze_code(files);
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

        const treeProvider = new VSCostTreeDataProvider(analysis, projectPath);
        const treeView = vscode.window.createTreeView("vscost.sidebar", {
            treeDataProvider: treeProvider,
            showCollapseAll: true,
        });
        context.subscriptions.push(treeView);

        const diagnosticsProvider = new DiagnosticsTreeDataProvider(analysis);
        const diagnosticsView = vscode.window.createTreeView("vscost.diagnostics", {
            treeDataProvider: diagnosticsProvider,
            showCollapseAll: true,
        });
        context.subscriptions.push(diagnosticsView);

        const quickPicksProvider = new QuickPicksWebviewProvider(pricesPath, analysis);
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider("vscost.recommendations", quickPicksProvider),
        );

        const openLocationCommand = vscode.commands.registerCommand(
            "vscost.openLocation",
            async (filePath: string, line?: number) => {
                const uri = vscode.Uri.file(filePath);
                const doc = await vscode.workspace.openTextDocument(uri);
                const editor = await vscode.window.showTextDocument(doc, { preview: false });
                if (typeof line === "number" && !Number.isNaN(line)) {
                    const pos = new vscode.Position(line, 0);
                    editor.selection = new vscode.Selection(pos, pos);
                    editor.revealRange(
                        new vscode.Range(pos, pos),
                        vscode.TextEditorRevealType.InCenterIfOutsideViewport,
                    );
                }
            },
        );
        context.subscriptions.push(openLocationCommand);

        const openTabDisposable = vscode.commands.registerCommand("vscost.openCostTab", () => {
            const panel = vscode.window.createWebviewPanel("vscostTab", "VSCost", vscode.ViewColumn.One, {
                enableScripts: true,
            });

            panel.iconPath = {
                light: vscode.Uri.joinPath(context.extensionUri, "assets", "vscost-tab-light.svg"),
                dark: vscode.Uri.joinPath(context.extensionUri, "assets", "vscost-tab-dark.svg"),
            };

            panel.webview.html = getCostTabHtml(analysis);
            panel.webview.onDidReceiveMessage(async (message) => {
                if (message?.type === "openFile" && typeof message.path === "string") {
                    const uri = vscode.Uri.file(message.path);
                    if (typeof message.line === "number") {
                        const doc = await vscode.workspace.openTextDocument(uri);
                        const editor = await vscode.window.showTextDocument(doc, { preview: false });
                        const pos = new vscode.Position(message.line, 0);
                        editor.selection = new vscode.Selection(pos, pos);
                        editor.revealRange(
                            new vscode.Range(pos, pos),
                            vscode.TextEditorRevealType.InCenterIfOutsideViewport,
                        );
                    } else {
                        await vscode.commands.executeCommand("vscode.open", uri);
                    }
                }
            });
        });

        context.subscriptions.push(openTabDisposable);

        const diagnostics = vscode.languages.createDiagnosticCollection("VSCost");
        context.subscriptions.push(diagnostics);

        const recommendations = new Map<string, { current: string; recommended: string }>();
        const ignoredThinking = new Set<string>();

        const updateDiagnostics = () => {
            console.log("VSCost: updateDiagnostics called");
            diagnostics.clear();
            recommendations.clear();
            for (const file of analysis.files) {
                const uri = vscode.Uri.file(file.file_path);
                const fileDiagnostics: vscode.Diagnostic[] = [];

                for (const fn of file.functions || []) {
                    for (const call of fn.llm_calls || []) {
                        const messages: string[] = [];
                        let severity: vscode.DiagnosticSeverity = vscode.DiagnosticSeverity.Information;

                        if (call.is_deprecated) {
                            messages.push("Model is deprecated");
                            severity = vscode.DiagnosticSeverity.Error;
                        }
                        if (call.cost_per_1M_tokens !== null && call.cost_per_1M_tokens > 5) {
                            messages.push(`Costly model ($${call.cost_per_1M_tokens.toFixed(2)}/1M)`);
                            severity = vscode.DiagnosticSeverity.Error;
                        }
                        if (call.loop_info.is_in_loop) {
                            const loopLabel = call.loop_info.loop_type ?? "a";
                            messages.push(`LLM call in ${loopLabel} loop`);
                            if (severity === vscode.DiagnosticSeverity.Information) {
                                severity = vscode.DiagnosticSeverity.Warning;
                            }
                        }
                        if (call.supports_thinking) {
                            const thinkingKey = `${file.file_path}:${call.position.line}`;
                            if (!ignoredThinking.has(thinkingKey)) {
                                messages.push("Thinking mode can add significant cost");
                            }
                        }

                        const recommended = recommendModel(call.model, pricesPath);
                        if (recommended) {
                            messages.push(`Try ${recommended} for lower cost / newer model`);
                            const key = `${file.file_path}:${call.position.line}`;
                            recommendations.set(key, { current: call.model, recommended });
                        }

                        if (messages.length === 0) continue;

                        const range = new vscode.Range(call.position.line, 0, call.position.line, 200);
                        const diag = new vscode.Diagnostic(range, messages.join(" · "), severity);
                        diag.source = "VSCost";
                        diag.code = "VSCost";
                        fileDiagnostics.push(diag);
                    }
                }

                diagnostics.set(uri, fileDiagnostics);
            }
            console.log("VSCost: updateDiagnostics done, recommendations count:", recommendations.size);
        };

        updateDiagnostics();

        const codeActionProvider = new VSCostCodeActionProvider(recommendations, ignoredThinking);
        context.subscriptions.push(
            vscode.languages.registerCodeActionsProvider(
                ["typescript", "typescriptreact", "javascript", "javascriptreact"],
                codeActionProvider,
                {
                    providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
                },
            ),
        );

        const ignoreThinkingCommand = vscode.commands.registerCommand("vscost.ignoreThinking", (key: string) => {
            ignoredThinking.add(key);
            updateDiagnostics();
        });
        context.subscriptions.push(ignoreThinkingCommand);

        let refreshInFlight: Promise<void> | null = null;
        const refreshAnalysis = async () => {
            console.log("VSCost: Refresh triggered");
            if (refreshInFlight) {
                console.log("VSCost: Already in flight, waiting");
                return refreshInFlight;
            }

            const doRefresh = async () => {
                console.log("VSCost: Starting analysis refresh");
                const updatedFiles = get_all_files(projectPath);
                console.log("VSCost: Got", updatedFiles.length, "files");
                analysis = analyze_code(updatedFiles);
                console.log("VSCost: Analysis complete");
                provider.setAnalysis(analysis);
                treeProvider.setAnalysis(analysis);
                diagnosticsProvider.setAnalysis(analysis);
                quickPicksProvider.setAnalysis(analysis);
                updateDiagnostics();
                console.log("VSCost: Analysis refreshed");
            };

            refreshInFlight = doRefresh().finally(() => {
                refreshInFlight = null;
                console.log("VSCost: Refresh promise cleared");
            });

            return refreshInFlight;
        };

        const saveListener = vscode.workspace.onDidSaveTextDocument((doc) => {
            console.log("VSCost: File saved:", doc.uri.fsPath);
            if (doc.uri.fsPath.startsWith(projectPath)) {
                console.log("VSCost: Triggering refresh");
                refreshAnalysis().catch((err) => console.error("VSCost: Refresh failed", err));
            }
        });
        context.subscriptions.push(saveListener);

        const watcher = vscode.workspace.createFileSystemWatcher("**/*.{ts,tsx,js,jsx}");
        watcher.onDidChange((uri) => {
            if (uri.fsPath.startsWith(projectPath)) {
                refreshAnalysis().catch((err) => console.error("VSCost: Refresh failed", err));
            }
        });
        watcher.onDidCreate((uri) => {
            if (uri.fsPath.startsWith(projectPath)) {
                refreshAnalysis().catch((err) => console.error("VSCost: Refresh failed", err));
            }
        });
        watcher.onDidDelete((uri) => {
            if (uri.fsPath.startsWith(projectPath)) {
                refreshAnalysis().catch((err) => console.error("VSCost: Refresh failed", err));
            }
        });
        context.subscriptions.push(watcher);
    } catch (error) {
        console.error("VSCost activation failed:", error);
    }
}

export function deactivate() {}
