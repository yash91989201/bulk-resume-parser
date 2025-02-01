import asyncio
import json
from typing import Dict
from config import SERVICE_CONFIG
from google.generativeai import GenerativeModel, configure, GenerationConfig
from utils import logger

class ResumeDataExtractor:
    def __init__(self, gemini_api_key: str, max_retries: int = 3):
        self.gemini_api_key= gemini_api_key 
        self.max_retries = max_retries


    async def extract_data(self, text_content: str) -> Dict:
        """Extract resume data with rate limit handling"""
        prompt = f"""
        Extract the following details from the given resume text and return a valid JSON object:

        {{
            "full_name": "Full name of the candidate",
            "email": "Candidate's email address (validate format)",
            "phone_number": "All valid phone numbers (exactly 10 digits after extracting country code, separated by commas, otherwise null)",
            "country_code": "Country code(s) for extracted phone numbers prefixed with + sign (if applicable, otherwise null)",
            "invalid_number": "List of phone numbers that are less or more than 10 digits after extracting country code, separated by commas (if any, otherwise null)"
        }}

        **Extraction Rules:**
        1. Return `null` for any missing or unavailable fields.
        2. Ensure the output follows a **strict JSON format** without any extra text.
        3. Validate the email format to ensure correctness.
        4. If a phone number is present:
           - Extract the country code if it starts with `+` (e.g., `+91`, `+971`).
           - Remove spaces, dashes, and special characters from the remaining number.
           - If the cleaned number is **exactly 10 digits**, add it to `phone_number` (comma-separated for multiple values).
           - If it is **less or more than 10 digits after removing the country code**, add it to `invalid_number` (comma-separated for multiple values).
           - Extract and list all unique country codes found in `country_code` (comma-separated).

        **Special Cases:**
        - If multiple valid phone numbers are found, store them in `phone_number` as a **comma-separated list**.
        - If any valid phone number is found, `phone_number` must **not** be null.
        - If all numbers are invalid, set `phone_number` to `null` and store invalid ones in `invalid_number`.
        - If country codes exist, list them in `country_code` as a **comma-separated list**.

        **Resume Text:**  
        ```  
        {text_content}  
        ```      
        """ 

        for attempt in range(self.max_retries):
            api_key = self.gemini_api_key 
            if not api_key:
                await asyncio.sleep(2 ** attempt)
                continue

            try:
                configure(api_key=api_key)
                gemini = GenerativeModel(SERVICE_CONFIG.GEMINI_MODEL)
                response = await asyncio.to_thread(
                    gemini.generate_content,
                    prompt,
                    generation_config=GenerationConfig(
                        temperature=0,
                        response_mime_type="application/json"
                    )
                )

                if not response.text:
                    raise ValueError("Empty Gemini response")

                return self.validate_response(response.text)

            except Exception as e:
                if "429" in str(e):
                    logger.error("API KEY rate limited") 
                logger.error(f"Attempt {attempt+1} failed: {str(e)}")
                if attempt == self.max_retries - 1:
                    raise

        raise Exception("Max retries exceeded")

    def validate_response(self, response_text: str) -> Dict:
        """Validate JSON response structure"""
        try:
            data = json.loads(response_text)
            return {
                "full_name": data.get("full_name"),
                "email": data.get("email"),
                "phone_number": data.get("phone_number"),
                "country_code": data.get("country_code"),
                "invalid_number": data.get("invalid_number")
            }
        except json.JSONDecodeError:
            logger.error("Invalid JSON response")
            raise


resume_data_extractor = ResumeDataExtractor(
    gemini_api_key=SERVICE_CONFIG.GEMINI_API_KEY,
    max_retries=SERVICE_CONFIG.MAX_RETRIES
)
