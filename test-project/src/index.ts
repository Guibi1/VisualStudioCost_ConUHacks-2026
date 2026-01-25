import { OpenRouter } from "@openrouter/sdk";
import ai, { type ModelMessage } from "ai";

async function greetUser() {
    const openRouter = new OpenRouter();

    const response = openRouter.chat.send({
        model: "google/gemini-3-flash-preview",
        messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: prompt },
        ],
    });
    console.log(response);
}

async function compareResponses(prompt: string) {
    const response_gpt_llm = await ai.generateText({
        model: "liquid/lfm-2.5-1.2b-thinking:free",
        prompt: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: prompt },
        ],
    });
    console.log(response_gpt_llm);

    const response_gemini_llm = await ai.generateText({
        model: "google/gemini-2.5-flash-lite-preview-09-2025",
        prompt: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: prompt },
        ],
    });
    console.log(response_gemini_llm);

    // Do something here, like asking the user for feedback between the two responses!
}

async function agentMode(prompt: string) {
    const messages: ModelMessage[] = [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt },
    ];

    for (let i = 0; i < 10; i++) {
        const response = await ai.generateText({
            model: "google/gemini-2.5-flash-lite-preview-09-2025",
            prompt: messages,
        });

        messages.push(...response.response.messages);
    }
}

function runExamples() {
    greetUser();
    compareResponses("Hello, how are you?");
}

function main() {
    runExamples();
    agentMode("Hi, can you help me set a timer?");
}

main();
