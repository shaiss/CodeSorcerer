# Migration Guide: Converting Base Categories to Plugins

This document outlines the step-by-step process for migrating built-in categories to the plugin architecture in the Code Sorcerer audit system.

## Overview

The Code Sorcerer audit system is transitioning from hardcoded categories to a plugin-based architecture. This allows for:
- Dynamic extension of the system with new categories
- Customization of existing categories without code changes
- Creation of category bundles for different use cases (hackathons, grants, etc.)
- User-provided category definitions through a simple file format

## Migration Process

### 1. Analyze the Existing Category

First, identify and analyze the existing category implementation:

```bash
# Locate the category implementation
- Check audit_near/categories/ for the base class or enhanced version
- Identify the prompt file in prompts/ directory
- Note the category's unique aspects (max points, special file filtering)
```

### 2. Create Plugin TOML Configuration

Create a TOML file in `plugins/categories/` with this structure:

```toml
# [Category Name] Plugin

[metadata]
id = "category_id"               # Must match original ID (e.g., "functionality")
name = "Human-Readable Name"     # Display name (e.g., "Functionality & Features")
version = "1.0.0"                # Start with 1.0.0
description = "Brief description of what this category evaluates"
author = "Shai Perednik"
requires = []                    # Dependencies on other categories, if any

[config]
max_points = 20                  # Maximum points (1-100, recommended: 5-25 based on importance)
prompt_file = "category_id.md"   # Name of the markdown prompt file
enhanced = true                  # Use true for better file selection logic

[patterns]
# Include patterns - file types this category should evaluate
include = [
    "\\.py$", "\\.js$", "\\.jsx$", "\\.ts$", "\\.tsx$", 
    # Add other relevant file extensions
]

# Exclude patterns - files/directories to skip
exclude = [
    "node_modules", "dist", "build", "target", 
    "\\.min\\.js$", "test", "__pycache__"
]
```

> **IMPORTANT**: 
> - The system supports flexible point ranges (1-100) to accommodate different category weightings
> - Choose a max_points value that reflects the category's relative importance (recommended: 5-25)
> - Ensure scoring guidelines in the prompt file align with the chosen max_points value

### 3. Create Plugin Markdown Prompt

Create a markdown file in `plugins/categories/` with this structure:

```markdown
# Category Title

## Repository Overview

{REPO_SUMMARY}

## Files to Analyze

{FILES_CONTENT}

## Evaluation Criteria

[Convert the original prompt content, maintaining these key elements:]
1. Explanation of what the category evaluates
2. Specific criteria with bullet points
3. Scoring guidelines that align with the max_points value
4. Detailed instructions for the AI evaluator

## Output Format

Provide your assessment in the following JSON format:
```json
{
  "score": <score between 0 and X>,
  "feedback": "<detailed feedback with specific observations and recommendations>"
}
```
```

### 4. Adjust Scoring Scale (If Necessary)

If the original category used a different point scale:

1. Adjust scoring guidelines in the markdown file to match the chosen max_points value
2. Choose an appropriate max_points value that reflects the category's importance
3. Document the scoring scale in the category description

### 5. Test the Plugin

1. Restart the application
2. Verify the plugin loads correctly (check logs)
3. Navigate to the audit page and confirm the category appears
4. Run a test audit to verify functionality

### 6. Address Common Issues

- **Invalid max_points**: The validation enforces max_points to be between 1-100
- **Missing prompt file**: Ensure the prompt file name matches the one in the config
- **Path resolution**: Plugin markdown files must be in plugins/categories/
- **Duplicate categories**: If both legacy and plugin versions appear, adjust priority

### 7. Future Considerations

Once all categories are migrated to plugins:

1. Update the UI to reflect the dynamic nature of categories
2. Create a management interface for enabling/disabling categories
3. Add support for exporting/importing category definitions
4. Develop a visual builder for custom categories

## Reference Implementation

The migrated Code Quality category provides a template for other migrations:

```
plugins/categories/code_quality.toml
plugins/categories/code_quality.md
```

## Testing Checklist

- [ ] Plugin appears in the audit form
- [ ] Plugin can be selected independently
- [ ] Plugin is used when running an audit
- [ ] Scoring works correctly
- [ ] All feedback is properly generated

By following this process, we can systematically migrate all built-in categories to plugins, creating a fully customizable and extensible audit system.