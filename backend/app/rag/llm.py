"""LLM provider adapters with tool calling (Anthropic Messages API and any
OpenAI-compatible Chat Completions server). Keys stay on the backend."""
import json
import time
from dataclasses import dataclass, field
from typing import Any, Optional, Protocol

import httpx

from app.core.config import settings


class LLMError(Exception):
    pass


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict[str, Any]


@dataclass
class LLMReply:
    text: str
    tool_calls: list[ToolCall] = field(default_factory=list)
    model: str = ""


class LLMClient(Protocol):
    model: str

    def chat(self, system: str, messages: list[dict], tools: list[dict]) -> LLMReply: ...


def _post(url: str, headers: dict, body: dict) -> dict:
    last: Optional[Exception] = None
    for attempt in range(settings.LLM_MAX_RETRIES + 1):
        try:
            response = httpx.post(url, headers=headers, json=body, timeout=settings.LLM_TIMEOUT_SECONDS)
            if response.status_code in (429, 500, 502, 503, 504, 529) and attempt < settings.LLM_MAX_RETRIES:
                time.sleep(0.5 * 3 ** attempt)
                continue
            if response.status_code >= 400:
                raise LLMError(f"LLM provider returned HTTP {response.status_code}: {response.text[:200]}")
            return response.json()
        except httpx.TransportError as error:
            last = error
            if attempt < settings.LLM_MAX_RETRIES:
                time.sleep(0.5 * 3 ** attempt)
    raise LLMError(f"LLM provider unreachable: {type(last).__name__}")


class AnthropicClient:
    def __init__(self, api_key: str, model: str, base_url: str = ""):
        self.api_key, self.model = api_key, model
        self.url = (base_url or "https://api.anthropic.com").rstrip("/") + "/v1/messages"

    def _messages(self, messages: list[dict]) -> list[dict]:
        out: list[dict] = []
        for m in messages:
            if m["role"] == "tool":
                block = {"type": "tool_result", "tool_use_id": m["tool_call_id"], "content": m["content"]}
                if out and out[-1]["role"] == "user" and isinstance(out[-1]["content"], list) \
                        and out[-1]["content"] and out[-1]["content"][0].get("type") == "tool_result":
                    out[-1]["content"].append(block)
                else:
                    out.append({"role": "user", "content": [block]})
            elif m["role"] == "assistant" and m.get("tool_calls"):
                content = [{"type": "text", "text": m["content"]}] if m.get("content") else []
                content += [{"type": "tool_use", "id": c.id, "name": c.name, "input": c.arguments}
                            for c in m["tool_calls"]]
                out.append({"role": "assistant", "content": content})
            else:
                out.append({"role": m["role"], "content": m["content"]})
        return out

    def chat(self, system: str, messages: list[dict], tools: list[dict]) -> LLMReply:
        data = _post(self.url, {"x-api-key": self.api_key, "anthropic-version": "2023-06-01"}, {
            "model": self.model, "max_tokens": 1024, "system": system, "messages": self._messages(messages),
            "tools": [{"name": t["name"], "description": t["description"], "input_schema": t["parameters"]}
                      for t in tools]})
        text = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")
        calls = [ToolCall(b["id"], b["name"], b.get("input") or {})
                 for b in data.get("content", []) if b.get("type") == "tool_use"]
        return LLMReply(text.strip(), calls, data.get("model", self.model))


class OpenAICompatibleClient:
    def __init__(self, api_key: str, model: str, base_url: str):
        self.api_key, self.model = api_key, model
        self.url = (base_url or "https://api.openai.com/v1").rstrip("/") + "/chat/completions"

    def chat(self, system: str, messages: list[dict], tools: list[dict]) -> LLMReply:
        converted: list[dict] = [{"role": "system", "content": system}]
        for m in messages:
            if m["role"] == "assistant" and m.get("tool_calls"):
                converted.append({"role": "assistant", "content": m.get("content") or None, "tool_calls": [
                    {"id": c.id, "type": "function",
                     "function": {"name": c.name, "arguments": json.dumps(c.arguments)}} for c in m["tool_calls"]]})
            elif m["role"] == "tool":
                converted.append({"role": "tool", "tool_call_id": m["tool_call_id"], "content": m["content"]})
            else:
                converted.append({"role": m["role"], "content": m["content"]})
        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        data = _post(self.url, headers, {"model": self.model, "messages": converted, "temperature": 0.2,
                                         "tools": [{"type": "function", "function": t} for t in tools]})
        try:
            message = data["choices"][0]["message"]
        except (KeyError, IndexError):
            raise LLMError("Malformed LLM response")
        calls = []
        for call in message.get("tool_calls") or []:
            try:
                arguments = json.loads(call["function"].get("arguments") or "{}")
            except ValueError:
                arguments = {"__invalid__": True}
            calls.append(ToolCall(call["id"], call["function"]["name"], arguments))
        return LLMReply((message.get("content") or "").strip(), calls, data.get("model", self.model))


_SCHEMA_KEYS = {"type", "description", "properties", "items", "required", "enum", "format", "nullable",
                "minimum", "maximum", "minItems", "maxItems", "minLength", "maxLength"}


def _gemini_schema(schema: Any) -> Any:
    """Reduce a JSON Schema to the OpenAPI subset Gemini function declarations accept."""
    if not isinstance(schema, dict):
        return schema
    out: dict[str, Any] = {}
    for key, value in schema.items():
        if key not in _SCHEMA_KEYS:
            continue
        if key == "type" and isinstance(value, list):
            kinds = [k for k in value if k != "null"]
            out["type"] = kinds[0] if kinds else "string"
            if "null" in value:
                out["nullable"] = True
        elif key == "properties":
            out[key] = {name: _gemini_schema(sub) for name, sub in value.items()}
        elif key == "items":
            out[key] = _gemini_schema(value)
        elif key == "enum":
            out[key] = [str(v) for v in value if v is not None]
        else:
            out[key] = value
    if "anyOf" in schema and "type" not in out:
        for option in schema["anyOf"]:
            if isinstance(option, dict) and option.get("type") not in (None, "null"):
                out.update(_gemini_schema(option))
                out["nullable"] = True
                break
    if out.get("type") == "object" and not out.get("properties"):
        out.pop("required", None)
    return out


class GeminiClient:
    """Google Gemini generateContent API. Keys starting with "AQ." are Vertex AI express-mode
    keys and use the Vertex endpoint; other keys use the Gemini Developer API."""

    def __init__(self, api_key: str, model: str, base_url: str = ""):
        self.api_key, self.model = api_key, model
        if not base_url:
            base_url = ("https://aiplatform.googleapis.com/v1/publishers/google" if api_key.startswith("AQ.")
                        else "https://generativelanguage.googleapis.com/v1beta")
        self.url = f"{base_url.rstrip('/')}/models/{model}:generateContent"

    def _contents(self, messages: list[dict]) -> list[dict]:
        names: dict[str, str] = {}
        out: list[dict] = []
        for m in messages:
            if m["role"] == "tool":
                part = {"functionResponse": {"name": names.get(m["tool_call_id"], "tool"),
                                             "response": {"content": m["content"]}}}
                if out and out[-1]["role"] == "user" and "functionResponse" in out[-1]["parts"][0]:
                    out[-1]["parts"].append(part)
                else:
                    out.append({"role": "user", "parts": [part]})
            elif m["role"] == "assistant":
                parts = [{"text": m["content"]}] if m.get("content") else []
                for c in m.get("tool_calls") or []:
                    names[c.id] = c.name
                    parts.append({"functionCall": {"name": c.name, "args": c.arguments}})
                out.append({"role": "model", "parts": parts or [{"text": ""}]})
            else:
                out.append({"role": "user", "parts": [{"text": m["content"]}]})
        return out

    def chat(self, system: str, messages: list[dict], tools: list[dict]) -> LLMReply:
        body: dict[str, Any] = {"systemInstruction": {"parts": [{"text": system}]},
                                "contents": self._contents(messages),
                                "generationConfig": {"temperature": 0.2}}
        if tools:
            body["tools"] = [{"functionDeclarations": [
                {"name": t["name"], "description": t["description"], "parameters": _gemini_schema(t["parameters"])}
                for t in tools]}]
        data = _post(f"{self.url}?key={self.api_key}", {}, body)
        try:
            parts = data["candidates"][0]["content"].get("parts") or []
        except (KeyError, IndexError):
            raise LLMError("Malformed LLM response")
        text = "".join(p.get("text", "") for p in parts if not p.get("thought"))
        calls = [ToolCall(f"call_{i}_{p['functionCall']['name']}", p["functionCall"]["name"],
                          p["functionCall"].get("args") or {})
                 for i, p in enumerate(parts) if "functionCall" in p]
        return LLMReply(text.strip(), calls, data.get("modelVersion", self.model))


def get_llm() -> Optional[LLMClient]:
    if not settings.llm_configured:
        return None
    if settings.LLM_PROVIDER == "anthropic":
        return AnthropicClient(settings.LLM_API_KEY, settings.LLM_MODEL, settings.LLM_BASE_URL)
    if settings.LLM_PROVIDER == "openai_compatible":
        return OpenAICompatibleClient(settings.LLM_API_KEY, settings.LLM_MODEL, settings.LLM_BASE_URL)
    if settings.LLM_PROVIDER == "gemini":
        return GeminiClient(settings.LLM_API_KEY, settings.LLM_MODEL, settings.LLM_BASE_URL)
    raise ValueError(f"Unknown LLM_PROVIDER {settings.LLM_PROVIDER!r}")
