import asyncio
import json
import logging
from typing import Any, Dict, List, Optional

from google import genai
from google.genai import types

from config import ServiceConfig

logger = logging.getLogger("resume-extractor.extractor")


class ResumeDataExtractor:
    def __init__(
        self,
        api_key: str = None,
        model_name: str = None,
        max_retries: int = None,
        concurrency: int = None,
    ):
        self.api_key = api_key or ServiceConfig.GEMINI_API_KEY
        self.model_name = model_name or ServiceConfig.GEMINI_MODEL
        self.max_retries = max_retries or ServiceConfig.LLM_MAX_RETRIES
        self.concurrency = concurrency or ServiceConfig.LLM_CONCURRENCY

        self._semaphore = asyncio.Semaphore(self.concurrency)
        self._client = None

    @property
    def client(self) -> genai.Client:
        if self._client is None:
            self._client = genai.Client(api_key=self.api_key)
        return self._client

    @staticmethod
    def empty_response(field_keys: List[str]) -> Dict[str, Any]:
        return {key: None for key in field_keys}

    async def extract_resume_data(
        self, prompt: str, resume_text: str, field_keys: List[str]
    ) -> Dict[str, Any]:
        if not resume_text or not resume_text.strip():
            logger.warning("Empty resume text provided, returning empty response")
            return self.empty_response(field_keys)

        full_prompt = f"{prompt}\n\nResume Text:\n{resume_text}"

        async with self._semaphore:
            return await self._extract_with_retry(full_prompt, field_keys)

    async def _extract_with_retry(self, prompt: str, field_keys: List[str]) -> Dict[str, Any]:
        last_error = None

        for attempt in range(self.max_retries):
            try:
                response = await self.client.aio.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0,
                        response_mime_type="application/json",
                    ),
                )

                if not response.text:
                    logger.warning("Empty response from Gemini")
                    return self.empty_response(field_keys)

                try:
                    parsed = json.loads(response.text)
                    if isinstance(parsed, dict):
                        return parsed
                    logger.warning(f"LLM returned non-dict type: {type(parsed).__name__}")
                    return self.empty_response(field_keys)
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON response from Gemini: {e}")
                    last_error = e

            except Exception as e:
                last_error = e
                error_str = str(e)

                if "429" in error_str or "quota" in error_str.lower():
                    wait_time = ServiceConfig.LLM_RETRY_DELAY * (2**attempt)
                    logger.warning(f"Rate limited, waiting {wait_time}s before retry")
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"Attempt {attempt + 1}/{self.max_retries} failed: {e}")
                    await asyncio.sleep(ServiceConfig.LLM_RETRY_DELAY)

        logger.error(f"All {self.max_retries} attempts failed. Last error: {last_error}")
        return self.empty_response(field_keys)

    async def extract_batch(
        self,
        prompt: str,
        resume_texts: List[Dict[str, str]],
        field_keys: List[str],
        progress_callback: Optional[callable] = None,
    ) -> List[Dict[str, Any]]:
        total = len(resume_texts)
        completed = 0

        async def process_one(item: Dict[str, str]) -> Dict[str, Any]:
            nonlocal completed

            file_id = item.get("id", "unknown")
            text = item.get("text", "")

            data = await self.extract_resume_data(prompt, text, field_keys)

            completed += 1
            if progress_callback:
                await progress_callback(completed, total)

            return {"id": file_id, "data": data}

        tasks = [process_one(item) for item in resume_texts]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Batch extraction error for item {i}: {result}")
                processed_results.append(
                    {
                        "id": resume_texts[i].get("id", "unknown"),
                        "data": self.empty_response(field_keys),
                    }
                )
            else:
                processed_results.append(result)

        return processed_results


_extractor: Optional[ResumeDataExtractor] = None


def get_extractor() -> ResumeDataExtractor:
    global _extractor
    if _extractor is None:
        _extractor = ResumeDataExtractor()
    return _extractor


async def extract_resume_data(
    prompt: str, resume_text: str, field_keys: List[str]
) -> Dict[str, Any]:
    return await get_extractor().extract_resume_data(prompt, resume_text, field_keys)


async def extract_batch(
    prompt: str,
    resume_texts: List[Dict[str, str]],
    field_keys: List[str],
    progress_callback: Optional[callable] = None,
) -> List[Dict[str, Any]]:
    return await get_extractor().extract_batch(prompt, resume_texts, field_keys, progress_callback)
