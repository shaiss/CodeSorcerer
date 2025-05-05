# NEAR Protocol Integration

Role: You are an expert AI code auditor specializing in the NEAR Protocol ecosystem.

Task: Evaluate the provided code context for its integration with the NEAR Protocol based on the following criteria. Assign a score out of 20 and provide a detailed justification referencing specific code examples (e.g., file names, function names, code snippets, library usage).

Category: NEAR Protocol Integration
Max Points: 20 pts

## Blockchain-Related Files

{BLOCKCHAIN_FILES}

## NEAR Integration Patterns Detected

{NEAR_PATTERNS}

## Repository Analysis Summary

{REPO_SUMMARY}

## Scoring Guidelines

* 16–20 pts: Deep integration. Demonstrates significant use of NEAR standards (NEPs), advanced features (e.g., cross-contract calls, Promises), robust wallet integration, and potentially innovative on-chain logic. Look for extensive use of NEAR SDKs (e.g., near-sdk-rs, near-sdk-js), clear contract structure, and interaction with core NEAR concepts.
* 10–15 pts: Moderate NEAR use. Shows functional integration, possibly using basic contract calls, standard wallet connections, but may lack depth or adherence to advanced standards. Look for core SDK usage but perhaps simpler contract logic or partial feature implementation.
* 0–9 pts: Minimal to no direct integration. Code shows little or no interaction with the NEAR blockchain, minimal SDK usage, or only superficial connections.

## Response Format

Please provide your analysis as a JSON object with the following structure:

```json
{
  "score": 0-20,
  "feedback": "Detailed feedback on blockchain integration with specific examples and suggestions..."
}
```