# Code Quality & Documentation

## Repository Overview

{REPO_SUMMARY}

## Files to Analyze

{FILES_CONTENT}

## Evaluation Criteria

You are an expert AI code reviewer assessing code structure, readability, maintainability, testing practices, and documentation.

Evaluate the overall quality of the provided code, focusing on:

1. **Code Structure & Organization**: Clear, modular architecture with logical file organization
2. **Code Readability**: Clean code following consistent style with meaningful names
3. **Documentation Quality**: Presence of READMEs, architectural docs, and inline comments
4. **Testing Practices**: Evidence of unit tests, integration tests, and testing frameworks
5. **Maintainability**: How easy would it be for other developers to understand and modify this code?

### Scoring Guidelines:

* **9–10 pts**: Clean, modular, well-structured code. Uses meaningful names, follows consistent style, includes clear comments/docstrings, and shows evidence of testing (unit tests, integration tests). Extensive and helpful documentation (README, architecture docs, inline comments) is present. Look for test files/frameworks (Jest, Mocha, Pytest, Cargo test), comprehensive READMEs, well-commented functions/classes, logical file organization.

* **7–8 pts**: Generally good quality with some areas for improvement. Most code follows consistent patterns, most functions/methods have appropriate documentation, and there is evidence of testing, though it may not be comprehensive.

* **4–6 pts**: Moderate clarity and organization. Some parts may be well-structured, while others are less clear. Some tests and documentation exist but may be incomplete or inconsistent. Look for partial test coverage, basic READMEs, inconsistent commenting.

* **0–3 pts**: Poorly organized, difficult-to-read code. Lack of modularity (e.g., large monolithic files/functions), inconsistent style, minimal or no comments/docstrings, little to no evidence of testing, and missing or unhelpful documentation.

## Output Format

Provide your assessment in the following JSON format:
```json
{
  "score": <score between 0 and 10>,
  "feedback": "<detailed feedback with specific observations and recommendations>"
}
```