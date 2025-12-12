import yaml
import os
import json
import re
from typing import Dict, List, Optional, Any
from gpt4all import GPT4All
from sentence_transformers import SentenceTransformer
from openai import OpenAI as OpenAIClient
import openai
from dotenv import load_dotenv
load_dotenv()


class AIEngine:
    """
    Module quản lý AI: LLM (GPT4All), ChatGPT API, Embedding Model
    """

    def __init__(self, config_path: str = "config.yaml"):
        print("🤖 Đang tải cấu hình AI từ YAML...")

        with open(config_path, "r", encoding="utf-8") as f:
            self.config = yaml.safe_load(f) or {}

        # ========= RUNTIME CONFIG =========
        runtime_cfg = self.config.get("runtime", {})
        self.max_input_chars = runtime_cfg.get("max_input_chars", 3000)

        # ========= EMBEDDING CONFIG =========
        embed_cfg = self.config.get("embedding", {})
        try:
            self.embedder = SentenceTransformer(embed_cfg.get("model_name", "all-MiniLM-L6-v2"))
            print(f"Đã tải Embedding Model: {embed_cfg.get('model_name')}")
        except Exception as e:
            raise Exception(f"Không thể tải Embedding Model: {e}")

        # ========= PROVIDER / LEGACY CONFIG =========
        self.providers_cfg = self.config.get("providers")
        if not self.providers_cfg:
            # fallback to legacy layout
            self.providers_cfg = {}

            # openai block
            if "openai" in self.config:
                openai_block = self.config.get("openai", {})
                self.providers_cfg["openai"] = {
                    "enabled": openai_block.get("enabled", False),
                    "models": [
                        {"id": openai_block.get("model", openai_block.get("model_name", "")),
                         "max_tokens": openai_block.get("max_tokens", 1000)}
                    ]
                }

            # gpt4all block
            if "gpt4all" in self.config:
                g4 = self.config.get("gpt4all", {})
                model_name = g4.get("model_name") or g4.get("model")
                self.providers_cfg["gpt4all"] = {
                    "enabled": g4.get("enabled", False),
                    "models": [
                        {"id": model_name, "path": g4.get("model_path"), "device": g4.get("device", "cpu")}
                    ]
                }

        # container to hold initialized provider clients/resources
        self.loaded_providers: Dict[str, Dict[str, Any]] = {}
        self._init_providers()

        # choose default active provider/model (the first enabled one)
        self.active_provider = None
        self.active_model_id = None
        for pname, pcfg in self.providers_cfg.items():
            if pcfg.get("enabled"):
                self.active_provider = pname
                models = pcfg.get("models", [])
                if models:
                    first = models[0]
                    # model item may be dict or string
                    if isinstance(first, dict):
                        self.active_model_id = first.get("id")
                    else:
                        self.active_model_id = first
                break

        # Also maintain legacy openai fields for backward compatibility
        openai_cfg = self.config.get("openai", {})
        self.use_chatgpt = openai_cfg.get("enabled", False)
        self.chatgpt_model = openai_cfg.get("model", openai_cfg.get("model_name", "gpt-3.5-turbo"))
        self.openai_api_key = os.getenv("OPENAI_API_KEY") or openai_cfg.get("api_key_env") and os.getenv(openai_cfg.get("api_key_env"))
        self.max_tokens = openai_cfg.get("max_tokens", 1000)

        # If OpenAI should be initialized by provider init, it will be in loaded_providers
        if self.active_provider == "openai" and self.active_model_id:
            # override chatgpt_model if active model specified
            self.chatgpt_model = self.active_model_id

    # -----------------------
    # Provider initialization
    # -----------------------
    def _init_providers(self):
        for provider_name, provider_cfg in self.providers_cfg.items():
            if not provider_cfg.get("enabled", False):
                continue
            init_fn = getattr(self, f"_init_provider_{provider_name}", None)
            if callable(init_fn):
                try:
                    self.loaded_providers[provider_name] = init_fn(provider_cfg)
                except Exception as e:
                    print(f"❌ Không thể khởi tạo provider {provider_name}: {e}")
            else:
                # try builtin initializers for openai/gpt4all
                if provider_name == "openai":
                    try:
                        self.loaded_providers["openai"] = self._init_provider_openai(provider_cfg)
                    except Exception as e:
                        print(f"❌ Không thể khởi tạo OpenAI provider: {e}")
                elif provider_name == "gpt4all":
                    try:
                        self.loaded_providers["gpt4all"] = self._init_provider_gpt4all(provider_cfg)
                    except Exception as e:
                        print(f"❌ Không thể khởi tạo GPT4All provider: {e}")
                else:
                    print(f"⚠️ Provider {provider_name} không có initializer, bỏ qua.")

    def _init_provider_openai(self, cfg: Dict[str, Any]) -> Dict[str, Any]:
        # cfg.models: list of {id, max_tokens} or list of ids
        api_key = os.getenv("OPENAI_API_KEY") or cfg.get("api_key") or cfg.get("api_key_env") and os.getenv(cfg.get("api_key_env"))
        if not api_key:
            raise RuntimeError("Missing OpenAI API key for provider openai")
        try:
            client = OpenAIClient(api_key=api_key)
        except Exception:
            # fallback to openai package
            openai.api_key = api_key
            client = openai
        models = []
        for m in cfg.get("models", []):
            if isinstance(m, dict):
                models.append(m)
            else:
                models.append({"id": m, "max_tokens": cfg.get("max_tokens", self.max_tokens)})
        print(f"✔ OpenAI provider initialized with models: {[m['id'] for m in models]}")
        return {"client": client, "models": models}

    def _init_provider_gpt4all(self, cfg: Dict[str, Any]) -> Dict[str, Any]:
        models_map: Dict[str, GPT4All] = {}
        for m in cfg.get("models", []):
            # m may be dict or string
            if isinstance(m, dict):
                model_id = m.get("id") or m.get("model_name")
                model_path = m.get("path") or m.get("model_path")
                device = m.get("device", "cpu")
            else:
                model_id = m
                model_path = None
                device = "cpu"
            try:
                # instantiate GPT4All instance lazily if model_path provided, else try with model_id
                g = GPT4All(model_name=model_id, model_path=model_path, device=device)
                models_map[model_id] = g
                print(f"✔ GPT4All loaded model: {model_id}")
            except Exception as e:
                print(f"⚠️ Không tải GPT4All model {model_id}: {e}")
        return {"models": models_map}

    # Placeholder for custom provider initializers
    # def _init_provider_gemini(self, cfg): ...
    # def _init_provider_claude(self, cfg): ...

    def is_model_available(self, model: Optional[str] = None) -> tuple[bool, Optional[str]]:
        """
        Check if a requested model is available.
        
        Returns:
            (is_available, error_message)
            - If available: (True, None)
            - If not available: (False, error_message in Vietnamese)
        """
        if not model or model == "default":
            # Default is always available if a provider is configured
            if self.active_provider and self.active_model_id:
                return True, None
            return False, "Không có model mặc định được cấu hình. Vui lòng kiểm tra config.yaml"

        # Parse model string (format: "provider:model_id" or just "model_id")
        provider = None
        model_id = None

        if ":" in model:
            parts = model.split(":", 1)
            provider = parts[0].strip().lower()
            model_id = parts[1].strip()
        else:
            model_str = model.strip().lower()
            # Infer provider from common keywords
            if "chatgpt" in model_str or "openai" in model_str:
                provider = "openai"
                model_id = model_str
            elif "gpt4all" in model_str or "gpt4" in model_str:
                provider = "gpt4all"
                model_id = model_str.replace("gpt4all", "").replace("gpt4", "").strip() or None
            else:
                # Default to active provider
                provider = self.active_provider
                model_id = model_str

        # Check if provider is loaded and enabled
        if provider not in self.loaded_providers:
            provider_name = provider or "unknown"
            return False, f"Model '{model}' không được hỗ trợ. Provider '{provider_name}' chưa được cấu hình."

        # Check if specific model is available in the provider
        provider_data = self.loaded_providers[provider]
        if provider == "openai":
            available_models = [m.get("id") for m in provider_data.get("models", [])]
            if not any(m for m in available_models if m and m.lower() == (model_id or "").lower()):
                return False, f"Model OpenAI '{model_id}' không khả dụng. Các model có sẵn: {', '.join(available_models) if available_models else 'không có'}"
        elif provider == "gpt4all":
            available_models = list(provider_data.get("models", {}).keys())
            if model_id and model_id.lower() not in [m.lower() for m in available_models]:
                return False, f"Model GPT4All '{model_id}' không khả dụng. Các model có sẵn: {', '.join(available_models) if available_models else 'không có'}"

        return True, None

    # ==========================================================
    # ================= CHATGPT CALLER =========================
    # ==========================================================
    def _call_chatgpt(self, user_prompt: str, model: Optional[str] = None, max_tokens: Optional[int] = None) -> str:
        """
        Unified wrapper to call OpenAI Responses API (or fallback openai package).
        model and max_tokens may be overridden.
        """
        if not max_tokens:
            max_tokens = self.max_tokens

        model_to_use = model or self.chatgpt_model

        try:
            client = None
            if "openai" in self.loaded_providers:
                client = self.loaded_providers["openai"]["client"]
            elif self._openai_client is not None:
                client = self._openai_client
            else:
                # fallback to openai package if available
                client = openai

            # Some clients (OpenAIClient) use .responses.create, others (openai) may have different interface.
            if hasattr(client, "responses") and hasattr(client.responses, "create"):
                resp = client.responses.create(
                    model=model_to_use,
                    input=[
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "input_text",
                                    "text": user_prompt
                                }
                            ]
                        }
                    ],
                    max_output_tokens=max_tokens
                )
                # OpenAI SDK returns different structures; try to normalize
                if hasattr(resp, "output_text"):
                    return resp.output_text.strip()
                # older clients may return dict-like
                if isinstance(resp, dict):
                    # try common keys
                    if "output_text" in resp:
                        return resp["output_text"].strip()
                    if "choices" in resp and len(resp["choices"]) > 0:
                        return resp["choices"][0].get("text", "").strip()
                # fallback string
                return str(resp)
            else:
                # fallback older openai library usage
                resp = client.ChatCompletion.create(
                    model=model_to_use,
                    messages=[{"role": "user", "content": user_prompt}],
                    max_tokens=max_tokens
                )
                if resp and "choices" in resp and len(resp["choices"]) > 0:
                    return resp["choices"][0]["message"]["content"].strip()
                return str(resp)

        except Exception as e:
            raise RuntimeError(f"Lỗi khi gọi OpenAI Response API: {e}")

    # ==========================================================
    # ================= CV JSON EXTRACTION =====================
    # ==========================================================
    def extract_json_from_cv(self, text: str, model: Optional[str] = None) -> Dict:
        """
        Extract JSON from CV text using selected model.

        Args:
            text: raw CV text
            model: optional model hint, 3 supported forms:
                - "provider:model_id", e.g. "openai:gpt-5-nano"
                - "model_id" (provider inferred from active_provider)
                - None (use active provider + active model)
        """
        text_truncated = text[:self.max_input_chars]

        prompt = f"""
        You are an AI assistant specialized in parsing CV/Resume.

        Extract the following information and return ONLY a valid JSON object.

        Required format:
        {{
        "full_name": string,
        "email": string,
        "role": string,
        "years_exp": integer,

        "education": [
            {{
            "school": string,
            "degree": string,
            "major": string,
            "gpa": number | null,
            "time": string
            }}
        ],

        "skills": array of strings,

        "projects": [
            {{
            "name": string,
            "description": string,
            "score": number (0-10)
            }}
        ]
        }}

        Rules:
        - GPA must be a NUMBER (example: 3.2), not string.
        - If GPA is not found, return null.
        - If no project found, return empty array [].
        - "score" must be based on:
        + complexity
        + technologies used
        + real-world applicability
        (0 = very weak, 10 = excellent)

        CV TEXT:
        {text_truncated}
        """

        # ---------- Determine provider & model ----------
        provider = None
        model_id = None

        if model:
            if ":" in model:
                parts = model.split(":", 1)
                provider = parts[0].strip().lower()
                model_id = parts[1].strip()
            else:
                model_id = model.strip()
                provider = self.active_provider
        else:
            provider = self.active_provider
            model_id = self.active_model_id

        use_chat = False
        use_llm = False

        if provider == "openai":
            use_chat = True
        elif provider == "gpt4all":
            use_llm = True
        else:
            if "openai" in self.loaded_providers:
                use_chat = True
            elif "gpt4all" in self.loaded_providers:
                use_llm = True

        # ---------- Call the selected model ----------
        if use_chat:
            try:
                # locate desired max_tokens if model configured in providers
                max_toks = None
                if "openai" in self.loaded_providers:
                    for m in self.loaded_providers["openai"]["models"]:
                        if m.get("id") == model_id:
                            max_toks = m.get("max_tokens")
                            break
                response = self._call_chatgpt(user_prompt=prompt, model=model_id or self.chatgpt_model, max_tokens=max_toks or self.max_tokens)
                extracted = self._parse_json_response(response)
                return self._validate_extracted_data(extracted)
            except Exception as e:
                print(f"⚠️ Lỗi ChatGPT: {e}")

        if use_llm:
            try:
                # pick model instance from loaded_providers
                provider_models = self.loaded_providers.get("gpt4all", {}).get("models", {})
                model_instance = provider_models.get(model_id) if model_id else (next(iter(provider_models.values())) if provider_models else None)

                if model_instance is None:
                    raise RuntimeError("Không tìm thấy GPT4All model để chạy")

                with model_instance.chat_session():
                    response = model_instance.generate(prompt, max_tokens=600 if not self.max_tokens else self.max_tokens, temp=0.1)
                extracted = self._parse_json_response(response)
                return self._validate_extracted_data(extracted)
            except Exception as e:
                print(f"⚠️ Lỗi GPT4All: {e}")

        # fallback: simple extraction heuristics
        return self._simple_extraction(text)

    # ==========================================================
    # ================= JSON PARSER ============================
    # ==========================================================
    def _parse_json_response(self, response: str) -> Dict:
        try:
            if not isinstance(response, str):
                response = json.dumps(response)
            match = re.search(r'\{.*\}', response, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            return {}
        except json.JSONDecodeError:
            return {}

    # ==========================================================
    # ================= REGEX FALLBACK =========================
    # ==========================================================
    def _simple_extraction(self, text: str) -> Dict:
        data = {
            "full_name": "N/A",
            "email": "N/A",
            "role": "N/A",
            "years_exp": 0,
            "skills": [],
            "education": "N/A"
        }

        email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
        if email_match:
            data["email"] = email_match.group(0)

        lines = text.split('\n')
        if lines:
            data["full_name"] = lines[0].strip()[:50]

        common_skills = ['python', 'java', 'javascript', 'react', 'docker',
                         'aws', 'kubernetes', 'sql', 'mongodb', 'fastapi']
        text_lower = text.lower()
        data["skills"] = [skill for skill in common_skills if skill in text_lower]

        return data

    # ==========================================================
    # ================= DATA VALIDATION ========================
    # ==========================================================
    def _validate_extracted_data(self, data: Dict) -> Dict:
        defaults = {
            "full_name": "N/A",
            "email": "N/A",
            "role": "N/A",
            "years_exp": 0,
            "skills": [],
            "education": "N/A"
        }

        for key, default in defaults.items():
            if key not in data or data[key] is None:
                data[key] = default

            if key == "skills" and not isinstance(data[key], list):
                data[key] = [data[key]] if data[key] else []

            if key == "years_exp":
                try:
                    data[key] = int(data[key])
                except:
                    data[key] = 0

        return data

    def validate_resume(self, data: Dict, raw_text: str = "") -> (bool, list):
        """
        Basic heuristic checks to determine if extracted data corresponds to a valid resume.
        """
        reasons = []

        # Check full name
        full_name = (data.get('full_name') or '').strip()
        if not full_name or full_name.upper() == 'N/A' or len(full_name) < 2:
            reasons.append('Không tìm thấy tên ứng viên')

        # Check email
        email = (data.get('email') or '')
        email_match = re.search(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", email)
        if not email_match:
            reasons.append('Không tìm thấy email hợp lệ')

        # Check presence of role / skills / experience
        role = (data.get('role') or '').strip()
        skills = data.get('skills') or []
        try:
            years = int(data.get('years_exp') or 0)
        except Exception:
            years = 0

        if (not role or role.upper() == 'N/A') and (not skills or len(skills) == 0) and years == 0:
            reasons.append('Thiếu thông tin nghề nghiệp (vị trí / kỹ năng / kinh nghiệm)')

        # If raw text is extremely short, reject
        if raw_text and len(raw_text.strip()) < 100:
            reasons.append('Nội dung quá ngắn để là một CV hợp lệ')

        is_valid = len(reasons) == 0
        return is_valid, reasons

    # ==========================================================
    # ================= EMBEDDING ==============================
    # ==========================================================
    def create_embedding(self, text: str, model: Optional[str] = None) -> List[float]:
        """
        Create embedding for given text. `model` is accepted for future extension.
        Currently uses the configured SentenceTransformer embedder.
        """
        embedding = self.embedder.encode(text)
        return embedding.tolist()

    # ==========================================================
    # ================= SEMANTIC TEXT ==========================
    # ==========================================================
    def create_semantic_text(self, cv_data: Dict) -> str:
        role = cv_data.get('role', 'N/A')
        skills = cv_data.get('skills', [])
        education = cv_data.get('education', '')
        years_exp = cv_data.get('years_exp', 0)

        semantic_parts = [
            f"Role: {role}",
            f"Skills: {', '.join(skills)}",
            f"Experience: {years_exp} years",
            f"Education: {education}"
        ]

        return ". ".join(semantic_parts)
