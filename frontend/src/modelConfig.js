export const MODEL_PROVIDERS = {
  openai: {
    label: "OpenAI",
    models: [
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
      { id: "gpt-5-mini", label: "GPT-5 Mini" },
      { id: "gpt-5-nano", label: "GPT-5 Nano" }
    ]
  },

  gpt4all: {
    label: "GPT4All",
    models: [
      { id: "Meta-Llama-3-8B-Instruct.Q4_0.gguf", label: "LLaMA-3 8B Q4_0" },
      { id: "Mistral-7B-Instruct.Q4_K_M.gguf", label: "Mistral-7B Q4_K_M" }
    ]
  },

  gemini: {
    label: "Gemini",
    models: [
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
      { id: "gemini-2.0-pro", label: "Gemini 2.0 Pro" }
    ]
  }
};
