"""
Test the migration of categories to plugins.

This module tests that all migrated categories can be loaded as plugins.
"""

import os
import unittest
import logging
from pathlib import Path

from audit_near.plugins.registry import registry
from audit_near.plugins.loader import loader
from audit_near.plugins.management import discover_plugins, init_plugins_directory


class TestPluginMigration(unittest.TestCase):
    """
    Tests for the category migration to plugins.
    """
    
    def setUp(self):
        """Set up test environment before each test."""
        # Configure logging
        logging.basicConfig(level=logging.DEBUG)
        
        # Initialize plugins directory
        init_plugins_directory()
        
        # Clear registry before each test
        registry.clear()
    
    def tearDown(self):
        """Clean up test environment after each test."""
        # Clear registry after each test
        registry.clear()
    
    def test_all_categories_migrated(self):
        """Test that all categories have been migrated to plugins."""
        # Legacy category list
        legacy_categories = [
            "code_quality",
            "functionality", 
            "security",
            "innovation",
            "documentation",
            "ux_design",
            "blockchain_integration"
        ]
        
        # Load all plugins
        loaded_plugins = discover_plugins()
        logging.info(f"Loaded plugins: {', '.join(loaded_plugins)}")
        
        # Check that all legacy categories are available as plugins
        for category in legacy_categories:
            self.assertIn(category, loaded_plugins, f"Category {category} not found in loaded plugins")
            
            # Check category is in registry
            self.assertIsNotNone(registry.get_category(category), f"Category {category} not found in registry")
            
            # Check metadata exists
            metadata = registry.get_metadata(category)
            self.assertIsNotNone(metadata, f"Metadata for category {category} not found")
            
            # Check required fields in metadata
            self.assertIn("id", metadata, f"Missing 'id' in metadata for {category}")
            self.assertIn("name", metadata, f"Missing 'name' in metadata for {category}")
            self.assertIn("version", metadata, f"Missing 'version' in metadata for {category}")
            self.assertIn("description", metadata, f"Missing 'description' in metadata for {category}")
    
    def test_plugin_file_structure(self):
        """Test that each plugin has the required files."""
        plugin_dir = Path(os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "plugins", "categories"
        ))
        
        # Legacy categories that should have been migrated
        legacy_categories = [
            "code_quality",
            "functionality", 
            "security",
            "innovation",
            "documentation",
            "ux_design",
            "blockchain_integration"
        ]
        
        for category in legacy_categories:
            # Check TOML file exists
            toml_path = plugin_dir / f"{category}.toml"
            self.assertTrue(toml_path.exists(), f"TOML file for {category} not found at {toml_path}")
            
            # Check MD file exists
            md_path = plugin_dir / f"{category}.md"
            self.assertTrue(md_path.exists(), f"MD file for {category} not found at {md_path}")
            
            # Check TOML file is valid by trying to load it
            try:
                loader.load_plugin(str(toml_path))
                # If we get here, the plugin loaded successfully
                plugin_loaded = True
            except Exception as e:
                plugin_loaded = False
                self.fail(f"Failed to load plugin from {toml_path}: {str(e)}")
            
            # Check MD file is not empty
            self.assertTrue(md_path.stat().st_size > 0, f"MD file for {category} is empty")


if __name__ == "__main__":
    unittest.main()