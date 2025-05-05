"""
Plugin management utilities.

This module provides functions for managing plugin installations,
including creating and managing the plugins directory structure.
"""

import logging
import os
import shutil
from typing import List, Optional, Dict, Any

from audit_near.plugins.loader import loader

logger = logging.getLogger(__name__)


def init_plugins_directory(base_dir: Optional[str] = None) -> str:
    """
    Initialize the plugins directory structure.
    
    Args:
        base_dir: Base directory for plugins (default: project root)
        
    Returns:
        Path to the plugins directory
    """
    if base_dir is None:
        # Use project root as base directory
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    # Create plugins directory
    plugins_dir = os.path.join(base_dir, "plugins")
    os.makedirs(plugins_dir, exist_ok=True)
    
    # Create subdirectories for organization
    categories_dir = os.path.join(plugins_dir, "categories")
    bundles_dir = os.path.join(plugins_dir, "bundles")
    
    os.makedirs(categories_dir, exist_ok=True)
    os.makedirs(bundles_dir, exist_ok=True)
    
    logger.info(f"Initialized plugins directory structure at: {plugins_dir}")
    return plugins_dir


def install_plugin(source_path: str, dest_name: Optional[str] = None) -> Optional[str]:
    """
    Install a plugin from a file.
    
    Args:
        source_path: Path to the plugin file
        dest_name: Name to use for the installed plugin (default: original filename)
        
    Returns:
        ID of the installed plugin, or None if installation failed
    """
    return loader.install_plugin(source_path, dest_name)


def uninstall_plugin(plugin_id: str) -> bool:
    """
    Uninstall a plugin.
    
    Args:
        plugin_id: ID of the plugin to uninstall
        
    Returns:
        True if uninstalled successfully, False otherwise
    """
    return loader.uninstall_plugin(plugin_id)


def list_installed_plugins() -> List[Dict[str, Any]]:
    """
    List all installed plugins.
    
    Returns:
        List of plugin metadata dictionaries
    """
    from audit_near.plugins.registry import registry
    
    plugins = []
    for category_id in registry.list_categories():
        metadata = registry.get_metadata(category_id)
        plugins.append({
            "id": category_id,
            "name": metadata.get("name", category_id),
            "description": metadata.get("description", ""),
            "version": metadata.get("version", "1.0.0"),
            "author": metadata.get("author", "Unknown")
        })
    
    return plugins


def discover_plugins() -> List[str]:
    """
    Discover and load all plugins.
    
    Returns:
        List of loaded plugin IDs
    """
    return loader.load_plugins()


def create_plugin_skeleton(
    plugin_id: str, 
    name: str, 
    description: str,
    output_dir: Optional[str] = None,
    enhanced: bool = False
) -> Optional[str]:
    """
    Create a skeleton for a new plugin.
    
    Args:
        plugin_id: ID for the plugin (lowercase with underscores)
        name: Display name for the plugin
        description: Description of the plugin
        output_dir: Directory to create the plugin in (default: current directory)
        enhanced: Whether to create an enhanced plugin
        
    Returns:
        Path to the created plugin directory, or None if creation failed
    """
    try:
        if output_dir is None:
            output_dir = os.getcwd()
        
        # Create plugin directory
        plugin_dir = os.path.join(output_dir, plugin_id)
        os.makedirs(plugin_dir, exist_ok=True)
        
        # Create prompt template
        prompt_file = f"{plugin_id}.md"
        prompt_path = os.path.join(plugin_dir, prompt_file)
        with open(prompt_path, "w") as f:
            f.write(f"""# {name} Analysis

Please evaluate the following code files for aspects related to {name.lower()}.

## Repository Overview

{{REPO_SUMMARY}}

## Files to Analyze

{{FILES_CONTENT}}

## Evaluation Criteria

Please assess the code based on the following criteria:
1. [Criterion 1]
2. [Criterion 2]
3. [Criterion 3]
4. [Criterion 4]
5. [Criterion 5]

## Output Format

Provide your assessment in the following JSON format:
```json
{{
  "score": <score between 0 and 10>,
  "feedback": "<detailed feedback with specific observations>"
}}
```
""")
        
        # Create plugin configuration
        plugin_config_path = os.path.join(plugin_dir, f"{plugin_id}.toml")
        with open(plugin_config_path, "w") as f:
            f.write(f"""# {name} Plugin

[metadata]
id = "{plugin_id}"
name = "{name}"
version = "1.0.0"
description = "{description}"
author = ""

[config]
max_points = 10
prompt_file = "{prompt_file}"
enhanced = {"true" if enhanced else "false"}

[patterns]
# Add file patterns to include
include = []
# Add file patterns to exclude
exclude = []
""")
        
        logger.info(f"Created plugin skeleton at: {plugin_dir}")
        return plugin_dir
    
    except Exception as e:
        logger.error(f"Error creating plugin skeleton: {str(e)}")
        return None