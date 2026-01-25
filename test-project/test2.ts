function tes(prompt: string) {
    const response_llm = openai.ChatCompletion.create({
        model: "qwen-2.5-72b-instruct",
        messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt },
        ],
    });
    
    return response_llm.json();
}