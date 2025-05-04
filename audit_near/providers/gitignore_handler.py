"""
GitIgnore handler for repository providers.

This module handles parsing .gitignore files and applying the patterns
to filter files during repository traversal.
"""

import logging
import os
from pathlib import Path
from typing import List, Set

import pathspec


class GitIgnoreHandler:
    """
    Handler for .gitignore files.
    
    This handler parses .gitignore files and provides methods
    to check if a path matches any of the patterns.
    """
    
    def __init__(self, repo_path: str):
        """
        Initialize the GitIgnore handler.
        
        Args:
            repo_path: Path to the repository
        """
        self.repo_path = os.path.abspath(repo_path)
        self.logger = logging.getLogger(__name__)
        self.spec = self._build_pathspec()
        
    def _build_pathspec(self) -> pathspec.PathSpec:
        """
        Build a PathSpec from .gitignore files.
        
        Returns:
            PathSpec object for pattern matching
        """
        patterns = []
        
        # Find all .gitignore files in the repository
        for root, dirs, files in os.walk(self.repo_path):
            if '.gitignore' in files:
                gitignore_path = os.path.join(root, '.gitignore')
                try:
                    with open(gitignore_path, 'r', encoding='utf-8') as f:
                        # Get patterns from this .gitignore file
                        gitignore_patterns = f.readlines()
                        
                        # Get the relative path from repo root to the .gitignore file directory
                        rel_dir = os.path.relpath(root, self.repo_path)
                        if rel_dir == '.':
                            rel_dir = ''
                            
                        # Add each pattern, adjusting for nested .gitignore files
                        for pattern in gitignore_patterns:
                            pattern = pattern.strip()
                            # Skip empty lines and comments
                            if pattern and not pattern.startswith('#'):
                                # Patterns in nested .gitignore files are relative to that directory
                                if rel_dir:
                                    # Only adjust relative patterns, not absolute ones
                                    if not pattern.startswith('/'):
                                        pattern = os.path.join(rel_dir, pattern)
                                patterns.append(pattern)
                        
                        self.logger.debug(f"Loaded {len(gitignore_patterns)} patterns from {gitignore_path}")
                except Exception as e:
                    self.logger.warning(f"Error reading .gitignore file {gitignore_path}: {e}")
        
        # Add default patterns for common files to exclude
        default_patterns = [
            # Version control
            ".git/",
            
            # Build artifacts and dependencies
            "node_modules/",
            "__pycache__/",
            "*.pyc",
            "*.pyo",
            "build/",
            "dist/",
            
            # IDEs and editors
            ".idea/",
            ".vscode/",
            "*.swp",
            
            # Environment
            ".env",
            ".venv/",
            "venv/",
            "env/",
            
            # OS specific
            ".DS_Store",
            "Thumbs.db"
        ]
        
        patterns.extend(default_patterns)
        
        return pathspec.PathSpec.from_lines('gitwildmatch', patterns)
    
    def is_ignored(self, path: str) -> bool:
        """
        Check if a path should be ignored based on .gitignore patterns.
        
        Args:
            path: Path to check (relative to repository root)
            
        Returns:
            True if the path should be ignored, False otherwise
        """
        # Normalize path to be relative to repo root and use forward slashes
        if os.path.isabs(path):
            rel_path = os.path.relpath(path, self.repo_path)
        else:
            rel_path = path
            
        # Convert backslashes to forward slashes for consistency
        rel_path = rel_path.replace('\\', '/')
        
        # Check if the path matches any pattern
        return self.spec.match_file(rel_path)