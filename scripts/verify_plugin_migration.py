#!/usr/bin/env python3
"""
Verification script for plugin migration.

This script demonstrates loading and using all the migrated category plugins.
It verifies that all categories have been properly migrated from built-in classes
to plugins.

Usage:
    python scripts/verify_plugin_migration.py

"""

import os
import sys
import logging
from pathlib import Path

# Add the project root to the path
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from audit_near.plugins.registry import registry
from audit_near.plugins.loader import loader
from audit_near.plugins.management import discover_plugins, init_plugins_directory


def main():
    """
    Main function to verify plugin migration.
    """
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    
    # Initialize plugins directory
    init_plugins_directory()
    
    # Clear registry
    registry.clear()
    
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
    
    print("\n==== Plugin Migration Verification ====\n")
    
    # Check each legacy category
    all_migrated = True
    for category in legacy_categories:
        if category in loaded_plugins:
            metadata = registry.get_metadata(category)
            print(f"✅ {category} successfully migrated")
            print(f"   Name: {metadata['name']}")
            print(f"   Description: {metadata['description']}")
            print(f"   Max Points: {registry.get_config(category).get('max_points', 'Not specified')}")
            print()
        else:
            print(f"❌ {category} not found as a plugin")
            all_migrated = False
            print()
    
    # Summary
    print("\n==== Migration Summary ====\n")
    if all_migrated:
        print("🎉 All categories successfully migrated to plugins!")
        print("You can now use the plugin system for all categories.")
    else:
        print("⚠️ Some categories have not been migrated to plugins.")
        print("Please check the output above and fix any missing plugins.")
    
    return 0 if all_migrated else 1


if __name__ == "__main__":
    sys.exit(main())