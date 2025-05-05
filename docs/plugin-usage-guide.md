# Plugin Usage Guide

## Overview

The Code Sorcerer tool now supports a plugin system that allows you to extend the auditing capabilities with custom category plugins. This guide explains how to use, install, and create your own plugins.

## Using Plugins

### From the Web Interface

1. Start a new audit from the web interface
2. Select your repository (local or GitHub)
3. After validating the repository, you'll see the Category Selection section
4. You can select:
   - Standard built-in categories
   - Plugin categories (if any are installed)
   - A pre-configured bundle that includes multiple categories

### From the Command Line

When using the CLI, you can specify plugins and bundles using the configuration file:

```toml
# Example configuration with plugins
[categories]
code_quality = { max_points = 20 }
functionality = { max_points = 15 }
code_maintainability = { max_points = 10 }  # Plugin category
developer_experience = { max_points = 10 }  # Plugin category
```

You can also use bundle files:

```bash
# Using a bundle configuration
audit-near --repo /path/to/repo --config plugins/bundles/hackathon_bundle.toml
```

## Installing Plugins

Plugins are installed in the `plugins/categories` directory. Each plugin consists of two files:
- A TOML configuration file (e.g., `code_maintainability.toml`)
- A markdown prompt template file (e.g., `code_maintainability.md`)

To install a plugin:
1. Copy both files to the `plugins/categories` directory
2. Restart the application

Plugins are automatically discovered and loaded at startup.

## Creating Plugins

### Plugin Format

A plugin consists of two files:

1. **TOML Configuration File**: Defines metadata, settings, and file patterns
2. **Markdown Prompt Template**: Contains the prompt template for the AI analysis

### TOML Configuration Format

```toml
# Example plugin configuration

[metadata]
id = "plugin_id"                  # Unique identifier (required)
name = "Human-Readable Name"      # Display name (required)
version = "1.0.0"                 # Version number (required)
description = "Plugin description" # Description (optional)
author = "Your Name"              # Author information (optional)
requires = []                     # Dependencies (optional)

[config]
max_points = 10                   # Maximum score points (required)
prompt_file = "prompt_template.md" # Prompt template file (required)
enhanced = false                  # Whether it uses enhanced features (optional)

[patterns]
# File patterns to include/exclude
include = ["\\.py$", "\\.js$"]    # Regex patterns to include
exclude = ["test", "node_modules"] # Patterns to exclude
```

### Markdown Prompt Template

The prompt template is a markdown file with special placeholders:

```markdown
# Category Title

Please evaluate the following code files for specific aspects.

## Repository Overview

{REPO_SUMMARY}

## Files to Analyze

{FILES_CONTENT}

## Evaluation Criteria

Please assess the code based on the following criteria:
1. Criterion 1
2. Criterion 2
3. Criterion 3

## Output Format

Provide your assessment in the following JSON format:
```json
{
  "score": <score between 0 and 10>,
  "feedback": "<detailed feedback with specific observations and recommendations>"
}
```
```

### Creating Bundles

Bundles are collections of categories configured for specific use cases:

```toml
# Example bundle

[metadata]
id = "custom_bundle"
name = "Custom Evaluation Bundle"
version = "1.0.0"
description = "A bundle optimized for specific evaluations"
author = "Your Name"

[categories]
# Standard categories
code_quality = true
functionality = true
security = true

# Plugin categories
code_maintainability = true
developer_experience = true
```

## Advanced Usage

### Category Dependencies

Plugins can specify dependencies on other categories:

```toml
[metadata]
id = "advanced_category"
name = "Advanced Category"
requires = ["code_quality", "security"]
```

### Custom Scoring

You can adjust the maximum points for any category:

```toml
[config]
max_points = 15  # Custom maximum score
```

For more information on plugin development, see the [Plugin Format Specification](plugin_format.md).