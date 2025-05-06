"""
Category registry for plugin system.

This module provides the registry infrastructure for managing
category plugins in a dynamic, extensible way.
"""

import logging
from typing import Dict, Any, List, Type, Optional

from audit_near.categories.base_category import BaseCategory


class CategoryRegistry:
    """
    Registry for category plugins.
    
    This class provides a central registry for category plugins,
    allowing dynamic registration and retrieval of category classes.
    """
    
    def __init__(self):
        """Initialize the category registry."""
        self._categories = {}  # Maps category_id to category class
        self._category_metadata = {}  # Maps category_id to metadata
        self.logger = logging.getLogger(__name__)
    
    def register(self, category_id: str, category_class: Type[BaseCategory], 
                 metadata: Optional[Dict[str, Any]] = None) -> None:
        """
        Register a category class with the registry.
        
        Args:
            category_id: Unique identifier for the category
            category_class: The category class to register
            metadata: Optional metadata dictionary for the category
        """
        if not issubclass(category_class, BaseCategory):
            raise TypeError(f"Category class {category_class.__name__} must be a subclass of BaseCategory")
        
        self._categories[category_id] = category_class
        self._category_metadata[category_id] = metadata or {}
        self.logger.info(f"Registered category: {category_id}")
    
    def unregister(self, category_id: str) -> bool:
        """
        Unregister a category from the registry.
        
        Args:
            category_id: Unique identifier for the category
            
        Returns:
            True if the category was unregistered, False if it wasn't found
        """
        if category_id in self._categories:
            del self._categories[category_id]
            del self._category_metadata[category_id]
            self.logger.info(f"Unregistered category: {category_id}")
            return True
        return False
    
    def get_category(self, category_id: str) -> Optional[Type[BaseCategory]]:
        """
        Get a category class by ID.
        
        Args:
            category_id: Unique identifier for the category
            
        Returns:
            The category class, or None if not found
        """
        return self._categories.get(category_id)
    
    def get_metadata(self, category_id: str) -> Dict[str, Any]:
        """
        Get metadata for a category.
        
        Args:
            category_id: Unique identifier for the category
            
        Returns:
            Metadata dictionary for the category, or empty dict if not found
        """
        return self._category_metadata.get(category_id, {})
    
    def list_categories(self) -> List[str]:
        """
        List all registered category IDs.
        
        Returns:
            List of category IDs
        """
        return list(self._categories.keys())
        
    def get_all_category_ids(self) -> List[str]:
        """
        Get all registered category IDs.
        
        Returns:
            List of all category IDs in the registry
        """
        return list(self._categories.keys())
    
    def get_all_categories(self) -> Dict[str, Dict[str, Any]]:
        """
        Get all categories with their metadata.
        
        Returns:
            Dictionary mapping category IDs to metadata
        """
        return {
            category_id: {
                "class": self._categories[category_id],
                "metadata": self._category_metadata[category_id]
            }
            for category_id in self._categories
        }
    
    def clear(self) -> None:
        """Clear all registered categories."""
        self._categories.clear()
        self._category_metadata.clear()
        self.logger.info("Cleared all registered categories")


# Create a singleton instance
registry = CategoryRegistry()