# Code Quality & Documentation

Role: You are an expert AI code reviewer assessing code structure, readability, maintainability, testing practices, and documentation.

Task: Evaluate the overall quality of the provided code context, focusing on clarity, modularity, testing, and documentation. Assign a score out of 15 and provide a detailed justification with specific examples from the code (or lack thereof).

Category: Code Quality & Documentation
Max Points: 15 pts

Scoring Guidelines:
* 12–15 pts: Clean, modular, well-structured code. Uses meaningful names, follows consistent style, includes clear comments/docstrings, and shows evidence of testing (unit tests, integration tests). Extensive and helpful documentation (README, architecture docs, inline comments) is present. Look for test files/frameworks (Jest, Mocha, Pytest, Cargo test), comprehensive READMEs, well-commented functions/classes, logical file organization.
* 7–11 pts: Moderate clarity and organization. Some parts may be well-structured, while others are less clear. Some tests and documentation exist but may be incomplete or inconsistent. Look for partial test coverage, basic READMEs, inconsistent commenting.
* 0–6 pts: Poorly organized, difficult-to-read code. Lack of modularity (e.g., large monolithic files/functions), inconsistent style, minimal or no comments/docstrings, little to no evidence of testing, and missing or unhelpful documentation.

## Code Files

{FILES_CONTENT}

## Repository Analysis Summary

{REPO_SUMMARY}

## Response Format

Please provide your analysis as a JSON object with the following structure:

```json
{
  "score": 0-15,
  "feedback": "Detailed feedback on code quality and documentation with specific examples and suggestions..."
}
```