import { OpenRouter } from "@openrouter/sdk";
import ai, { type ModelMessage } from "ai";

async function greetUser() {
    const openRouter = new OpenRouter();

    const response = openRouter.chat.send({
        model: "openai/gpt-5-codex",
        messages: [{ role: "system", content: "You are a helpful assistant." }],
    });
    console.log(response);
}

async function compareResponses(prompt: string) {
    const response_gpt_llm = await ai.generateText({
        model: "openai/gpt-5-codex",
        prompt: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: prompt },
        ],
    });
    console.log(response_gpt_llm);

    const response_gemini_llm = await ai.generateText({
        model: "alibaba/qwen3-max",
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

// Image generation test cases
async function generateImage(prompt: string) {
    const openai = { images: { generate: async (opts: any) => opts } };

    // Standard image generation
    // const image = await ai.generateImage({
    //     model: "google/nano-banana",
    //     prompt,
    //     size: "1024x1024",
    //     n: 1,
    // });
    // console.log(image);
}

async function generateHDImages(prompt: string) {
    const openai = { images: { generate: async (opts: any) => opts } };

    // HD quality image generation (more expensive)
    const images = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        size: "1792x1024",
        quality: "hd",
        n: 2,
    });
    console.log(images);
}

async function imageInLoop(prompts: string[]) {
    const openai = { images: { generate: async (opts: any) => opts } };

    // WARNING: Image generation in a loop - very expensive!
    for (const prompt of prompts) {
        const image = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            size: "1024x1024",
        });
        console.log(image);
    }
}

// Audio generation test cases
async function textToSpeech(text: string) {
    const openai = { audio: { speech: { create: async (opts: any) => opts } } };

    // TTS generation
    const speech = await openai.audio.speech.create({
        model: "tts-1",
        input: text,
        voice: "alloy",
    });
    console.log(speech);
}

async function textToSpeechHD(text: string) {
    const openai = { audio: { speech: { create: async (opts: any) => opts } } };

    // HD TTS generation
    const speech = await openai.audio.speech.create({
        model: "tts-1-hd",
        input: text,
        voice: "nova",
    });
    console.log(speech);
}

async function transcribeAudio(audioFile: any) {
    const openai = {
        audio: { transcriptions: { create: async (opts: any) => opts } },
    };

    // Audio transcription (Whisper)
    const transcription = await openai.audio.transcriptions.create({
        model: "whisper-1",
        file: audioFile,
    });
    console.log(transcription);
}

async function translateAudio(audioFile: any) {
    const openai = {
        audio: { translations: { create: async (opts: any) => opts } },
    };

    // Audio translation
    const translation = await openai.audio.translations.create({
        model: "whisper-1",
        file: audioFile,
    });
    console.log(translation);
}

async function audioInLoop(texts: string[]) {
    const openai = { audio: { speech: { create: async (opts: any) => opts } } };

    // WARNING: Audio generation in a loop
    for (const text of texts) {
        const speech = await openai.audio.speech.create({
            model: "tts-1",
            input: text,
            voice: "alloy",
        });
        console.log(speech);
    }
}

function runExamples() {
    greetUser();
    compareResponses("Hello, how are you?");
}

function main() {
    runExamples();
    agentMode("Hi, can you help me set a timer?");

    // Test image generation
    generateImage("A beautiful sunset over mountains");
    generateHDImages("A detailed portrait");
    imageInLoop(["cat", "dog", "bird"]);

    // Test audio generation
    textToSpeech("Hello, this is a test of text to speech.");
    textToSpeechHD("This is high quality audio.");
    transcribeAudio({});
    translateAudio({});
    audioInLoop(["Hello", "World", "Test"]);
}

main();
