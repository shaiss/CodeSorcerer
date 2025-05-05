"""
Plugin schema definition and validation.

This module provides schema definitions and validation functions
for category plugin configuration files.
"""

import logging
import os
import re
from typing import Dict, Any, List, Optional, Union

logger = logging.getLogger(__name__)

# Schema definition for plugin config files
PLUGIN_SCHEMA = {
    "metadata": {
        "required": ["id", "name", "description"],
        "optional": ["version", "author", "requires"],
        "types": {
            "id": str,
            "name": str,
            "description": str,
            "version": str,
            "author": str,
            "requires": list
        }
    },
    "config": {
        "required": ["max_points", "prompt_file"],
        "optional": ["enhanced"],
        "types": {
            "max_points": int,
            "prompt_file": str,
            "enhanced": bool
        }
    },
    "patterns": {
        "required": [],
        "optional": ["include", "exclude"],
        "types": {
            "include": list,
            "exclude": list
        }
    }
}


def validate_plugin_config(
    config: Dict[str, Any], 
    plugin_dir: str
) -> List[str]:
    """
    Validate a plugin configuration against the schema.
    
    Args:
        config: The plugin configuration dictionary
        plugin_dir: Directory containing the plugin file
        
    Returns:
        List of validation error messages, empty if valid
    """
    errors = []
    
    # Check required sections
    for section in PLUGIN_SCHEMA:
        if section not in config:
            errors.append(f"Missing required section: {section}")
    
    if errors:
        return errors
    
    # Validate each section
    for section, schema in PLUGIN_SCHEMA.items():
        section_errors = _validate_section(config[section], schema, section)
        errors.extend(section_errors)
    
    # Additional validations
    if "metadata" in config and "id" in config["metadata"]:
        plugin_id = config["metadata"]["id"]
        # Check ID format (lowercase with underscores)
        if not re.match(r'^[a-z][a-z0-9_]*$', plugin_id):
            errors.append(
                f"Invalid plugin ID format: {plugin_id}. "
                "Must be lowercase with underscores."
            )
    
    if "config" in config:
        # Validate max_points range
        if "max_points" in config["config"]:
            max_points = config["config"]["max_points"]
            if not isinstance(max_points, int) or max_points < 1 or max_points > 10:
                errors.append(
                    f"Invalid max_points: {max_points}. Must be between 1 and 10."
                )
        
        # Validate prompt file exists
        if "prompt_file" in config["config"]:
            prompt_file = config["config"]["prompt_file"]
            prompt_path = os.path.join(plugin_dir, prompt_file)
            if not os.path.exists(prompt_path):
                errors.append(
                    f"Prompt file not found: {prompt_file}. "
                    f"Expected at: {prompt_path}"
                )
    
    # Validate regex patterns
    if "patterns" in config:
        pattern_errors = _validate_patterns(config["patterns"])
        errors.extend(pattern_errors)
    
    return errors


def _validate_section(
    section_config: Dict[str, Any], 
    schema: Dict[str, Any], 
    section_name: str
) -> List[str]:
    """
    Validate a section of the plugin configuration.
    
    Args:
        section_config: Configuration for the section
        schema: Schema for the section
        section_name: Name of the section
        
    Returns:
        List of validation error messages
    """
    errors = []
    
    # Check required fields
    for field in schema["required"]:
        if field not in section_config:
            errors.append(f"Missing required field: {section_name}.{field}")
    
    # Check field types
    for field, value in section_config.items():
        expected_type = schema["types"].get(field)
        if expected_type and not isinstance(value, expected_type):
            errors.append(
                f"Invalid type for {section_name}.{field}: "
                f"expected {expected_type.__name__}, got {type(value).__name__}"
            )
    
    # Check for unknown fields
    valid_fields = schema["required"] + schema["optional"]
    for field in section_config:
        if field not in valid_fields:
            errors.append(f"Unknown field: {section_name}.{field}")
    
    return errors


def _validate_patterns(patterns_config: Dict[str, Any]) -> List[str]:
    """
    Validate regex patterns in the plugin configuration.
    
    Args:
        patterns_config: Configuration for patterns
        
    Returns:
        List of validation error messages
    """
    errors = []
    
    for field in ["include", "exclude"]:
        if field in patterns_config:
            patterns = patterns_config[field]
            if not isinstance(patterns, list):
                errors.append(
                    f"Invalid type for patterns.{field}: "
                    f"expected list, got {type(patterns).__name__}"
                )
                continue
            
            # Validate each pattern is a valid regex
            for i, pattern in enumerate(patterns):
                if not isinstance(pattern, str):
                    errors.append(
                        f"Invalid pattern in patterns.{field}[{i}]: "
                        f"expected string, got {type(pattern).__name__}"
                    )
                    continue
                
                try:
                    re.compile(pattern)
                except re.error as e:
                    errors.append(
                        f"Invalid regex in patterns.{field}[{i}]: {pattern}. "
                        f"Error: {str(e)}"
                    )
    
    return errors