import ConvexProvider from "@/components/ConvexProvider";
import NavigationBar from "@/components/NavigationBar";
import RepoProvider from "@/components/RepoProvider";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { ReactNode } from "react";
import stylesheet from "../styles.css?url";

export const Route = createRootRoute({
    head: () => ({
        meta: [
            {
                charSet: "utf-8",
            },
            {
                name: "viewport",
                content: "width=device-width, initial-scale=1",
            },
            {
                title: "VS Cost",
            },
        ],
        links: [
            {
                rel: "stylesheet",
                href: stylesheet,
            },
        ],
    }),

    shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }) {
    return (
        <html lang="en" className="dark">
            <head>
                <HeadContent />
            </head>

            <body className="relative flex min-h-screen flex-col bg-background text-foreground">
                <ConvexProvider>
                    <RepoProvider>
                        <NavigationBar />

                        {children}

                        <TanStackDevtools
                            config={{ position: "bottom-right" }}
                            plugins={[{ name: "Tanstack Router", render: <TanStackRouterDevtoolsPanel /> }]}
                        />
                    </RepoProvider>
                </ConvexProvider>
                <Scripts />
            </body>
        </html>
    );
}
