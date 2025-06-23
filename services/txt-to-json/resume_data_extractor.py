import asyncio
import json
from typing import Dict
from config import SERVICE_CONFIG
from google.generativeai.generative_models import GenerativeModel
from google.generativeai.client import configure
from google.generativeai.types import GenerationConfig
from utils import logger


class ResumeDataExtractor:
    def __init__(self, gemini_api_key: str, max_retries: int = 3):
        self.gemini_api_key = gemini_api_key
        self.max_retries = max_retries

    async def extract_resume_data(self, prompt: str, resume: str) -> Dict:
        """
        Extract data from a dynamic prompt and resume text.
        This method is used for testing purposes.
        """
        if len(resume) == 0:
            return self.empty_response()

        prompt = f"{prompt}\n\nResume Text:\n{resume}"

        for attempt in range(self.max_retries):
            try:
                configure(api_key=self.gemini_api_key)
                gemini = GenerativeModel(SERVICE_CONFIG.GEMINI_MODEL)
                response = await asyncio.to_thread(
                    gemini.generate_content,
                    prompt,
                    generation_config=GenerationConfig(
                        temperature=0, response_mime_type="application/json"
                    ),
                )

                if not response.text:
                    return self.empty_response()

                try:
                    return json.loads(response.text)
                except json.JSONDecodeError:
                    logger.error("Invalid JSON response")
                    raise

            except Exception as e:
                if "429" in str(e):
                    logger.error("API KEY rate limited")
                logger.error(f"Attempt {attempt + 1} failed: {str(e)}")
                if attempt == self.max_retries - 1:
                    raise

        raise Exception("Max retries exceeded")

    def empty_response(self):
        return {
            "full_name": None,
            "email": None,
            "phone_number": None,
            "country_code": None,
            "invalid_number": None,
            "designation": None,
            "department": None,
            "functional_area": None,
        }


resume_data_extractor = ResumeDataExtractor(
    gemini_api_key=SERVICE_CONFIG.GEMINI_API_KEY, max_retries=SERVICE_CONFIG.MAX_RETRIES
)
