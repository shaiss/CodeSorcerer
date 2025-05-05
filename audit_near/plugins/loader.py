"""
Plugin loader for category plugins.

This module provides functionality to load category plugins from
TOML/JSON files and register them with the category registry.
"""

import importlib
import inspect
import logging
import os
import re
import sys
from typing import Dict, Any, List, Type, Optional, Tuple, Set, cast

# tomli is included in Python 3.11+, but we need to ensure compatibility
try:
    import tomli
except ImportError:
    import tomllib as tomli

from audit_near.categories.base_category import BaseCategory
from audit_near.plugins.registry import registry
from audit_near.plugins.schema import validate_plugin_config


class CategoryPluginLoader:
    """
    Loader for category plugins.
    
    This class provides functionality to load category plugins from
    TOML files and register them with the category registry.
    """
    
    def __init__(self, plugins_dir: Optional[str] = None):
        """
        Initialize the category plugin loader.
        
        Args:
            plugins_dir: Directory containing plugin files (default: plugins/)
        """
        self.logger = logging.getLogger(__name__)
        
        # Determine plugins directory
        if plugins_dir is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            self.plugins_dir = os.path.join(base_dir, "plugins")
        else:
            self.plugins_dir = plugins_dir
    
    def load_plugins(self) -> List[str]:
        """
        Load all plugins from the plugins directory.
        
        Returns:
            List of loaded plugin IDs
        """
        if not os.path.exists(self.plugins_dir):
            os.makedirs(self.plugins_dir, exist_ok=True)
            self.logger.info(f"Created plugins directory: {self.plugins_dir}")
            return []
        
        loaded_plugins = []
        
        # Load plugins from the main plugins directory and categories subdirectory
        plugin_dirs = [
            self.plugins_dir,
            os.path.join(self.plugins_dir, "categories")
        ]
        
        for plugin_dir in plugin_dirs:
            if not os.path.exists(plugin_dir):
                continue
                
            # Load all TOML files in the directory
            for filename in os.listdir(plugin_dir):
                if filename.endswith(".toml"):
                    plugin_path = os.path.join(plugin_dir, filename)
                    plugin_id = self.load_plugin(plugin_path)
                    if plugin_id:
                        loaded_plugins.append(plugin_id)
        
        self.logger.info(f"Loaded {len(loaded_plugins)} plugins: {', '.join(loaded_plugins)}")
        return loaded_plugins
    
    def load_plugin(self, plugin_path: str) -> Optional[str]:
        """
        Load a single plugin from a file.
        
        Args:
            plugin_path: Path to the plugin file
            
        Returns:
            Plugin ID if loaded successfully, None otherwise
        """
        try:
            self.logger.info(f"Loading plugin from: {plugin_path}")
            
            # Parse the TOML file
            with open(plugin_path, "rb") as f:
                config = tomli.load(f)
            
            # Get the plugin directory
            plugin_dir = os.path.dirname(plugin_path)
            
            # Validate the plugin configuration
            errors = validate_plugin_config(config, plugin_dir)
            if errors:
                for error in errors:
                    self.logger.error(f"Plugin validation error: {error}")
                self.logger.error(f"Failed to load plugin: {plugin_path}")
                return None
            
            # Get metadata
            metadata = config["metadata"]
            plugin_id = metadata["id"]
            
            # Create the category class
            if config["config"].get("enhanced", False):
                category_class = self._create_enhanced_category_class(plugin_id, config, plugin_dir)
            else:
                category_class = self._create_category_class(plugin_id, config, plugin_dir)
            
            # Register the category
            registry.register(plugin_id, category_class, metadata)
            
            self.logger.info(f"Successfully loaded plugin: {plugin_id}")
            return plugin_id
            
        except Exception as e:
            self.logger.error(f"Error loading plugin {plugin_path}: {str(e)}")
            return None
    
    def _create_category_class(
        self, 
        plugin_id: str, 
        config: Dict[str, Any], 
        plugin_dir: str
    ) -> Type[BaseCategory]:
        """
        Create a category class for a standard plugin.
        
        Args:
            plugin_id: Plugin ID
            config: Plugin configuration
            plugin_dir: Directory containing the plugin file
            
        Returns:
            Category class
        """
        prompt_file = os.path.join(plugin_dir, config["config"]["prompt_file"])
        patterns = config.get("patterns", {})
        include_patterns = patterns.get("include", [])
        exclude_patterns = patterns.get("exclude", [])
        
        # Create dynamic category class
        class DynamicCategory(BaseCategory):
            def _select_files(self, files, repo_analysis):
                # Use patterns from plugin config
                selected = []
                for path, content in files:
                    if not include_patterns or any(re.search(pattern, path) for pattern in include_patterns):
                        if not exclude_patterns or not any(re.search(pattern, path) for pattern in exclude_patterns):
                            selected.append((path, content))
                
                return selected[:10]  # Limit to 10 files
                
            def _get_ai_analysis(self, prompt):
                # Use a generic analysis method based on category name
                # Try specific method first, fall back to generic ones
                methods = [
                    f"analyze_{plugin_id}",
                    f"analyze_{plugin_id.split('_')[0]}",
                    "analyze_code_quality"  # Default fallback
                ]
                
                for method_name in methods:
                    if hasattr(self.ai_client, method_name):
                        self.logger.info(f"Using AI analysis method: {method_name}")
                        return getattr(self.ai_client, method_name)(prompt)
                
                self.logger.warning(f"No specific analysis method found for {plugin_id}, using default")
                return self.ai_client.analyze_code_quality(prompt)
        
        # Set class name and docstring
        metadata = config["metadata"]
        class_name = f"{plugin_id.title().replace('_', '')}Category"
        DynamicCategory.__name__ = class_name
        DynamicCategory.__qualname__ = class_name
        DynamicCategory.__doc__ = metadata.get("description", f"Dynamic category for {plugin_id}")
        
        return DynamicCategory
    
    def _create_enhanced_category_class(
        self, 
        plugin_id: str, 
        config: Dict[str, Any], 
        plugin_dir: str
    ) -> Type[BaseCategory]:
        """
        Create a category class for an enhanced plugin.
        
        Args:
            plugin_id: Plugin ID
            config: Plugin configuration
            plugin_dir: Directory containing the plugin file
            
        Returns:
            Category class
        """
        prompt_file = os.path.join(plugin_dir, config["config"]["prompt_file"])
        patterns = config.get("patterns", {})
        include_patterns = patterns.get("include", [])
        exclude_patterns = patterns.get("exclude", [])
        
        # Create dynamic enhanced category class
        class EnhancedDynamicCategory(BaseCategory):
            def _select_files(self, files, repo_analysis):
                # Use repository analysis for smarter file selection
                important_files = repo_analysis.get('dependency_analysis', {}).get('important_files', [])
                categorized_files = repo_analysis.get('categorized_files', {})
                
                # Apply custom patterns
                filtered_files = []
                for path, content in files:
                    if not include_patterns or any(re.search(pattern, path) for pattern in include_patterns):
                        if not exclude_patterns or not any(re.search(pattern, path) for pattern in exclude_patterns):
                            filtered_files.append((path, content))
                
                # Build a priority selection combining important files and pattern-matched files
                # Start with important files that also match our patterns
                selected_paths = set()
                for path in important_files[:5]:  # Top 5 important files
                    if any((file_path == path for file_path, _ in filtered_files)):
                        selected_paths.add(path)
                
                # Add remaining pattern-matched files
                for path, content in filtered_files:
                    selected_paths.add(path)
                    if len(selected_paths) >= 10:
                        break
                
                # Map back to (path, content) tuples
                path_to_content = {path: content for path, content in files}
                selected_files = [(path, path_to_content.get(path, "")) for path in selected_paths]
                
                # Ensure we don't exceed token limits
                return selected_files[:10]
                
            def _get_ai_analysis(self, prompt):
                # Use a generic analysis method based on category name
                # Try specific method first, fall back to generic ones
                methods = [
                    f"analyze_{plugin_id}",
                    f"analyze_{plugin_id.split('_')[0]}",
                    "analyze_code_quality"  # Default fallback
                ]
                
                for method_name in methods:
                    if hasattr(self.ai_client, method_name):
                        self.logger.info(f"Using AI analysis method: {method_name}")
                        return getattr(self.ai_client, method_name)(prompt)
                
                self.logger.warning(f"No specific analysis method found for {plugin_id}, using default")
                return self.ai_client.analyze_code_quality(prompt)
        
        # Set class name and docstring
        metadata = config["metadata"]
        class_name = f"Enhanced{plugin_id.title().replace('_', '')}Category"
        EnhancedDynamicCategory.__name__ = class_name
        EnhancedDynamicCategory.__qualname__ = class_name
        EnhancedDynamicCategory.__doc__ = metadata.get("description", f"Enhanced dynamic category for {plugin_id}")
        
        return EnhancedDynamicCategory
    
    def install_plugin(self, plugin_file_path: str, dest_filename: Optional[str] = None) -> Optional[str]:
        """
        Install a plugin from a file.
        
        Args:
            plugin_file_path: Path to the plugin file
            dest_filename: Name to use for the installed plugin file (default: use original name)
            
        Returns:
            Plugin ID if installed successfully, None otherwise
        """
        try:
            if not os.path.exists(plugin_file_path):
                self.logger.error(f"Plugin file not found: {plugin_file_path}")
                return None
            
            # Create plugins directory if it doesn't exist
            if not os.path.exists(self.plugins_dir):
                os.makedirs(self.plugins_dir, exist_ok=True)
            
            # Create categories subdirectory if it doesn't exist
            categories_dir = os.path.join(self.plugins_dir, "categories")
            if not os.path.exists(categories_dir):
                os.makedirs(categories_dir, exist_ok=True)
            
            # Determine destination filename
            if dest_filename is None:
                dest_filename = os.path.basename(plugin_file_path)
            
            # Ensure it has .toml extension
            if not dest_filename.endswith(".toml"):
                dest_filename += ".toml"
            
            # Install to the categories subdirectory
            dest_path = os.path.join(categories_dir, dest_filename)
            
            # Copy the file
            with open(plugin_file_path, "rb") as src:
                content = src.read()
                
                # Try to parse and validate before saving
                config = tomli.loads(content.decode('utf-8'))
                temp_dir = os.path.dirname(plugin_file_path)
                errors = validate_plugin_config(config, temp_dir)
                
                if errors:
                    for error in errors:
                        self.logger.error(f"Plugin validation error: {error}")
                    self.logger.error(f"Failed to install plugin: {plugin_file_path}")
                    return None
                
                # Get plugin ID
                plugin_id = config["metadata"]["id"]
                
                # Copy prompt file if it exists
                prompt_file = config["config"]["prompt_file"]
                prompt_path = os.path.join(temp_dir, prompt_file)
                if os.path.exists(prompt_path):
                    with open(prompt_path, "rb") as prompt_src:
                        prompt_content = prompt_src.read()
                        dest_prompt_path = os.path.join(categories_dir, prompt_file)
                        with open(dest_prompt_path, "wb") as prompt_dest:
                            prompt_dest.write(prompt_content)
                
                # Save the plugin file
                with open(dest_path, "wb") as dest:
                    dest.write(content)
            
            self.logger.info(f"Installed plugin: {plugin_id} to {dest_path}")
            return plugin_id
            
        except Exception as e:
            self.logger.error(f"Error installing plugin: {str(e)}")
            return None
    
    def uninstall_plugin(self, plugin_id: str) -> bool:
        """
        Uninstall a plugin.
        
        Args:
            plugin_id: ID of the plugin to uninstall
            
        Returns:
            True if uninstalled successfully, False otherwise
        """
        try:
            # Plugin directories to search
            plugin_dirs = [
                self.plugins_dir,
                os.path.join(self.plugins_dir, "categories")
            ]
            
            # Find the plugin file
            plugin_file = None
            plugin_dir = None
            
            for current_dir in plugin_dirs:
                if not os.path.exists(current_dir):
                    continue
                    
                for filename in os.listdir(current_dir):
                    if filename.endswith(".toml"):
                        plugin_path = os.path.join(current_dir, filename)
                        with open(plugin_path, "rb") as f:
                            try:
                                config = tomli.load(f)
                                if config.get("metadata", {}).get("id") == plugin_id:
                                    plugin_file = filename
                                    plugin_dir = current_dir
                                    break
                            except Exception:
                                continue
                
                if plugin_file:
                    break
            
            if not plugin_file or not plugin_dir:
                self.logger.error(f"Plugin not found: {plugin_id}")
                return False
            
            # Remove the plugin file
            plugin_path = os.path.join(plugin_dir, plugin_file)
            
            # Try to get the prompt file name before removing the plugin
            prompt_file = None
            try:
                with open(plugin_path, "rb") as f:
                    config = tomli.load(f)
                    prompt_file = config.get("config", {}).get("prompt_file")
            except Exception:
                pass
                
            # Remove the plugin file
            os.remove(plugin_path)
            
            # Try to remove associated prompt file if it exists
            if prompt_file:
                prompt_path = os.path.join(plugin_dir, prompt_file)
                if os.path.exists(prompt_path):
                    try:
                        os.remove(prompt_path)
                        self.logger.info(f"Removed associated prompt file: {prompt_file}")
                    except Exception as e:
                        self.logger.warning(f"Failed to remove prompt file: {str(e)}")
            
            # Unregister the plugin
            if registry.unregister(plugin_id):
                self.logger.info(f"Uninstalled plugin: {plugin_id}")
                return True
            else:
                self.logger.warning(f"Plugin file removed but not unregistered: {plugin_id}")
                return False
                
        except Exception as e:
            self.logger.error(f"Error uninstalling plugin: {str(e)}")
            return False


# Create a singleton instance
loader = CategoryPluginLoader()