function call_LLM(string prompt) {
  const response = fetch('https://api.example.com/llm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt: prompt }),
  });

  const response_llm = openai.ChatCompletion.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: prompt },
    ],
  });

  const response_gemini_llm = gemini.chat.completions.create({
    model: "gemini-2.5-pro",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: prompt },
    ],
  });

  return response.json();
}

function call_LLM2(string prompt) {
  const response = fetch('https://api.example.com/llm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt: prompt }),
  });

  const response_llm = openai.ChatCompletion.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: prompt },
    ],
  });

  const response_gemini_llm = gemini.chat.completions.create({
    model: "gemini-2.5-pro",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: prompt },
    ],
  });

  return response.json();
}
