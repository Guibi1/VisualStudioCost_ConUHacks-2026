import { Highlight, type Language, themes } from "prism-react-renderer";
import { cn } from "@/lib/utils";

export function Code({
    code,
    language,
    className,
    lines,
}: {
    code: string;
    language: Language;
    className?: string;
    lines: number[];
}) {
    return (
        <Highlight code={code.trim()} language={language} theme={themes.vsDark}>
            {({ className: highlightClassName, style, tokens, getLineProps, getTokenProps }) => (
                <pre
                    className={cn(
                        "relative overflow-x-auto rounded-lg border bg-muted p-4 font-mono text-sm",
                        highlightClassName,
                        className,
                    )}
                    style={style}
                >
                    <code>
                        {tokens.map((line, i) => (
                            <div
                                key={i}
                                {...getLineProps({ line })}
                                className={lines.includes(i) ? ": bg-primary/40" : ""}
                            >
                                {line.map((token) => (
                                    <span key={token.content} {...getTokenProps({ token })} />
                                ))}
                            </div>
                        ))}
                    </code>
                </pre>
            )}
        </Highlight>
    );
}
