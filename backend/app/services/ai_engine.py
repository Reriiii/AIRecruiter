import yaml
import os
import json
import re
from typing import Dict, List, Optional
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
            self.config = yaml.safe_load(f)
        
        # ========= RUNTIME CONFIG =========
        runtime_cfg = self.config.get("runtime", {})
        self.max_input_chars = runtime_cfg.get("max_input_chars", 3000)

        # ========= OPENAI CONFIG =========
        openai_cfg = self.config.get("openai", {})
        self.use_chatgpt = openai_cfg.get("enabled", False)
        self.chatgpt_model = openai_cfg.get("model", "gpt-3.5-turbo")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.max_tokens = openai_cfg.get("max_tokens", 1000)

        self._openai_client = None
        if self.use_chatgpt and self.openai_api_key:
            try:
                if OpenAIClient is not None:
                    self._openai_client = OpenAIClient(api_key=self.openai_api_key)
                elif openai is not None:
                    openai.api_key = self.openai_api_key
                    self._openai_client = openai
                print(f"ChatGPT API: model {self.chatgpt_model} sẵn sàng")
            except Exception as e:
                print(f"Không thể khởi tạo OpenAI client: {e}")

        # ========= GPT4ALL CONFIG =========
        gpt_cfg = self.config.get("gpt4all", {})
        self.llm = None

        if gpt_cfg.get("enabled", True):
            try:
                self.llm = GPT4All(
                    model_name=gpt_cfg.get("model_name"),
                    model_path=gpt_cfg.get("model_path"),
                    device=gpt_cfg.get("device", "cpu")
                )
                print(f"Đã tải GPT4All: {gpt_cfg.get('model_name')}")
            except Exception as e:
                print(f"Không tải được GPT4All: {e}")
                self.llm = None

        # ========= EMBEDDING CONFIG =========
        embed_cfg = self.config.get("embedding", {})
        try:
            self.embedder = SentenceTransformer(embed_cfg.get("model_name", "all-MiniLM-L6-v2"))
            print(f"Đã tải Embedding Model: {embed_cfg.get('model_name')}")
        except Exception as e:
            raise Exception(f"Không thể tải Embedding Model: {e}")

    # ==========================================================
    # ================= CHATGPT CALLER =========================
    # ==========================================================
    
    def _call_chatgpt(self, user_prompt: str, max_tokens: int = 600) -> str:
        try:
            resp = self._openai_client.responses.create(
                model=self.chatgpt_model,
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

            return resp.output_text.strip()

        except Exception as e:
            raise RuntimeError(f"Lỗi khi gọi OpenAI Response API: {e}")

    # ==========================================================
    # ================= CV JSON EXTRACTION =====================
    # ==========================================================

    def extract_json_from_cv(self, text: str) -> Dict:
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

        if self.use_chatgpt:
            try:
                response = self._call_chatgpt(user_prompt=prompt, max_tokens=self.max_tokens)
                extracted = self._parse_json_response(response)
                return self._validate_extracted_data(extracted)
            except Exception as e:
                print(f"⚠️ Lỗi ChatGPT: {e}")

        if self.llm:
            try:
                with self.llm.chat_session():
                    response = self.llm.generate(prompt, max_tokens=600, temp=0.1)
                extracted = self._parse_json_response(response)
                return self._validate_extracted_data(extracted)
            except Exception as e:
                print(f"⚠️ Lỗi GPT4All: {e}")

        return self._simple_extraction(text)

    # ==========================================================
    # ================= JSON PARSER ============================
    # ==========================================================

    def _parse_json_response(self, response: str) -> Dict:
        try:
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

    # ==========================================================
    # ================= EMBEDDING ==============================
    # ==========================================================

    def create_embedding(self, text: str) -> List[float]:
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
