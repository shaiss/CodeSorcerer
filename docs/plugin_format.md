# Category Plugin Format Specification

This document defines the standard format for Code Sorcerer category plugins.

## Overview

Category plugins allow users to define new audit categories without modifying the codebase. 
A plugin is defined in a TOML file with specific sections and fields.

## File Structure

Category plugins use TOML format with the following structure:

```toml
# Example category_plugin.toml

[metadata]
id = "plugin_id"
name = "Display Name"
version = "1.0.0"
description = "Detailed description of what this category evaluates"
author = "Author Name"
requires = ["optional_dependency_category"]

[config]
max_points = 10
prompt_file = "plugin_id.md"
enhanced = false

[patterns]
include = ["\\.sol$", "contract.*\\.js$"]
exclude = ["test", "mock"]
```

## Required Fields

### Metadata Section

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier for the category (lowercase with underscores) |
| `name` | string | Human-readable display name |
| `description` | string | Detailed description of what the category evaluates |

### Config Section

| Field | Type | Description |
|-------|------|-------------|
| `max_points` | integer | Maximum number of points for this category (1-100). Recommended: 5-25 based on category importance |
| `prompt_file` | string | Path to the prompt template file (relative to plugin file) |

## Optional Fields

### Metadata Section

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Semantic version of the plugin (default: "1.0.0") |
| `author` | string | Name of the plugin author |
| `requires` | array | List of category IDs this plugin depends on |

### Config Section

| Field | Type | Description |
|-------|------|-------------|
| `enhanced` | boolean | Whether to use the enhanced base category (default: false) |

### Patterns Section

| Field | Type | Description |
|-------|------|-------------|
| `include` | array | List of regex patterns for files to include |
| `exclude` | array | List of regex patterns for files to exclude |

## Prompt Template Format

The prompt template file should be a Markdown file with placeholders for:

- `{FILES_CONTENT}`: Will be replaced with the selected files' content
- `{REPO_SUMMARY}`: Will be replaced with the repository analysis summary

Example:

```markdown
# Code Quality Analysis

Please evaluate the following code files for quality, structure, and best practices.

## Repository Overview

{REPO_SUMMARY}

## Files to Analyze

{FILES_CONTENT}

## Evaluation Criteria

Please assess the code based on:
1. Code structure and organization
2. Readability and naming conventions
3. Error handling and robustness
4. Performance considerations
5. Documentation quality

## Output Format

Provide your assessment in the following JSON format:
```json
{
  "score": 7,
  "feedback": "Detailed feedback here..."
}
```
```

## Validation Rules

1. Plugin ID must be unique across all plugins
2. Plugin ID must be lowercase with underscores
3. Max points must be a positive integer between 1 and 100
4. Prompt file must exist and be accessible
5. Include/exclude patterns must be valid regex