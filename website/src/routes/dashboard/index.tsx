import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/")({ component: App });

function App() {
    return <div>Wow logged in!</div>;
}
