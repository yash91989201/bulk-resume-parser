import asyncio
import json
from typing import Dict
from config import SERVICE_CONFIG
from google.generativeai import GenerativeModel, configure, GenerationConfig
from utils import logger


class ResumeDataExtractor:
    def __init__(self, gemini_api_key: str, max_retries: int = 3):
        self.gemini_api_key = gemini_api_key
        self.max_retries = max_retries

    async def extract_data(self, text_content: str) -> Dict:
        """Extract resume data with rate limit handling"""

        if len(text_content) == 0:
            return self.empty_response()

        # Remove empty new lines from the text
        sanitized_text_content = "\n".join(
            [line for line in text_content.splitlines() if line.strip()]
        )

        prompt = f"""
        Extract the following details from the given resume text and return a strictly valid JSON object with no extra text:

        {{
            "full_name": "Full name of the candidate (if available, otherwise null)",
            "email": "Candidate's email address in a valid format, with all unwanted or non-printable characters (e.g., null bytes) removed (if not available, then null)",
            "phone_number": "Comma-separated list of valid phone numbers. A valid phone number is exactly 10 digits after removing country code and any spaces, dashes, or special characters (if no valid phone numbers are found, then null)",
            "country_code": "Comma-separated list of unique country codes (each prefixed with a + sign) extracted from the phone numbers (if none, then null)",
            "invalid_number": "Comma-separated list of phone numbers that do not have exactly 10 digits after extracting any country code (if none, then null)",
            "designation": "The candidate’s current job title or designation based on the most recent or current employment mentioned in the resume (if unavailable, then null)",
            "department": "Based on the resume content, classify the candidate’s department into one of the following categories: 'Construction', 'IT', 'Oil and Gas', 'Power and Energy', 'Others', or 'Not mentioned'. If unclear or missing, return 'Not mentioned'.",
            "functional_area": "The candidate's core expertise domain inferred from job roles, skills, certifications, and experience. Capture loose depictions (e.g., 'coding' → 'Software Development', 'people management' → 'HR', 'account handling' → 'Sales'). Return standardized terms like 'Software Development', 'Project Management', 'Finance', etc. If unclear, return null."
        }}

        **Rules & Requirements:**
        1. **Output Format:** The output must be a strict JSON object and contain only the JSON without any extra text.
        2. **Field Defaults:** If a field is unavailable or missing in the resume text, return its value as `null` (or 'Not mentioned' where applicable).
        3. **Email Field:**
           - Validate the email format (e.g., ensure it contains an '@' and a domain).
           - Remove any unwanted or non-printable characters (such as null bytes) so that the email appears clean.
        4. **Phone Number Extraction:**
           - Identify phone numbers including optional country codes (e.g., numbers starting with a '+' sign).
           - For each phone number:
             - If a country code is present (a '+' followed by digits), extract it and clean it.
             - Remove all spaces, dashes, and special characters from the remaining number.
             - If the cleaned number has exactly 10 digits, consider it valid and include it in the `phone_number` field.
             - If the cleaned number does not have exactly 10 digits after extracting the country code, include it in the `invalid_number` field.
           - List all unique country codes found in a comma-separated format under `country_code`.
        5. **Designation Extraction:**
           - Find the candidate’s current or most recent designation based on context and placement in the resume.
           - Titles like "Software Engineer", "Project Manager", "Civil Supervisor", etc., should be considered.
        6. **Department Classification:**
           - Analyze the resume text and categorize the department based on relevant keywords, skills, experiences, or domain knowledge.
           - Choose **only one** of the following categories: 'Construction', 'IT', 'Oil and Gas', 'Power and Energy', 'Others', or 'Not mentioned'.
           - If multiple domains are present, prioritize based on most recent or primary experience.
        7. **Functional Area Detection:**
           - Infer from job titles, responsibilities, tools/technologies, certifications, and achievements - not just explicit mentions.
           - Map loose terms to standardized areas (e.g., 'full-stack dev' → 'Software Development', 'recruitment' → 'HR', 'client acquisition' → 'Sales').
           - Prioritize terms reflecting the candidate's primary expertise over generic terms.

        **Resume Text:**  

        ```  
        {sanitized_text_content}  
        ```      
        """

        for attempt in range(self.max_retries):
            api_key = self.gemini_api_key
            if not api_key:
                await asyncio.sleep(2**attempt)
                continue

            try:
                configure(api_key=api_key)
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

                return self.validate_response(response.text)

            except Exception as e:
                if "429" in str(e):
                    logger.error("API KEY rate limited")
                logger.error(f"Attempt {attempt + 1} failed: {str(e)}")
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
                "invalid_number": data.get("invalid_number"),
                "designation": data.get("designation"),
                "department": data.get("department"),
                "functional_area": data.get("functional_area"),
            }
        except json.JSONDecodeError:
            logger.error("Invalid JSON response")
            raise

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
