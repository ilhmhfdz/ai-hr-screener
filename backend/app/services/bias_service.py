import json
from openai import AsyncOpenAI
from app.config import get_settings
from app.models.job import BiasReport, BiasFlag

settings = get_settings()
openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def detect_bias(job_description: str) -> BiasReport:
    """Analyze a job description for potential bias using GPT-4o."""

    system_prompt = """You are an expert in Diversity, Equity, and Inclusion (DEI) in hiring. Analyze the given job description for potential biases.

Check for these types of bias:

1. GENDER-CODED LANGUAGE:
   - Masculine-coded: "ninja", "rockstar", "aggressive", "dominant", "competitive", "crush it"
   - Feminine-coded: "nurturing", "supportive", "collaborative" (when used exclusively)

2. AGE-SPECIFIC LANGUAGE:
   - "Young and energetic", "digital native", "recent graduate only"
   - "Senior" when meaning old (vs seniority level)
   - Unreasonable years of experience for the role

3. EXCLUSIONARY LANGUAGE:
   - "Native English speaker" vs "Fluent in English"
   - "Must be able to stand/lift" (when not physically required)
   - Unnecessary degree requirements
   - "Culture fit" without defining culture values

4. UNNECESSARY REQUIREMENTS:
   - Degree requirements when skills matter more
   - Specific age ranges
   - Gender-specific pronouns for the role

Return a JSON object:
{
    "has_bias": true/false,
    "overall_score": <0-100 where 100 is no bias detected>,
    "flags": [
        {
            "phrase": "exact phrase from JD",
            "bias_type": "gender|age|exclusionary|unnecessary",
            "severity": "high|medium|low",
            "explanation": "Why this is potentially biased",
            "suggested_alternative": "Suggested rewording"
        }
    ],
    "summary": "Overall assessment of the job description's inclusivity"
}

Be careful not to over-flag. Only flag genuine bias concerns, not neutral professional language."""

    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": f"Analyze this job description for potential bias:\n\n{job_description[:5000]}",
                },
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
        )

        result = json.loads(response.choices[0].message.content)

        flags = [BiasFlag(**f) for f in result.get("flags", [])]

        return BiasReport(
            has_bias=result.get("has_bias", False),
            overall_score=result.get("overall_score", 100),
            flags=flags,
            summary=result.get("summary", ""),
        )

    except Exception as e:
        print(f"Error detecting bias: {e}")
        return BiasReport(
            has_bias=False,
            overall_score=100,
            summary=f"Bias analysis failed: {str(e)[:200]}",
        )
