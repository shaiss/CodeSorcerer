"""
Local repository provider.

This module implements a provider to traverse local repositories,
yielding file paths and contents.
"""

import logging
import os
from pathlib import Path
from typing import Dict, Generator, List, Set, Tuple

from audit_near.providers.base_provider import BaseProvider


class RepoProvider(BaseProvider):
    """
    Provider for local repositories.
    
    This provider traverses a local repository directory,
    yielding file paths and contents.
    """
    
    def __init__(self, repo_path: str, branch: str = "main"):
        """
        Initialize the repository provider.
        
        Args:
            repo_path: Path to the local repository
            branch: Branch name (default: main)
        """
        self.repo_path = os.path.abspath(repo_path)
        self.branch = branch
        self.logger = logging.getLogger(__name__)
        
        if not os.path.isdir(self.repo_path):
            raise ValueError(f"Repository path does not exist: {self.repo_path}")
            
        self.logger.info(f"Initialized repository provider for {self.repo_path}")

    def _is_excluded(self, path: str) -> bool:
        """
        Check if a path should be excluded from analysis.
        
        Args:
            path: Path to check
            
        Returns:
            True if the path should be excluded, False otherwise
        """
        excluded_dirs = {".git", "node_modules", "__pycache__", ".idea", ".vscode", ".venv", "venv", "env", "build", "dist"}
        excluded_files = {".DS_Store", ".gitignore", ".gitattributes"}
        excluded_extensions = {".pyc", ".pyo", ".so", ".o", ".a", ".lib", ".dll", ".exe", ".bin", ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".ico", ".mp3", ".mp4", ".wav", ".avi", ".mov", ".pdf"}

        path_parts = Path(path).parts
        
        # Check if any part of the path is in excluded_dirs
        if any(part in excluded_dirs for part in path_parts):
            return True
            
        # Check if filename is in excluded_files
        if os.path.basename(path) in excluded_files:
            return True
            
        # Check if extension is in excluded_extensions
        if os.path.splitext(path)[1].lower() in excluded_extensions:
            return True
            
        return False

    def _get_file_content(self, file_path: str) -> str:
        """
        Get the content of a file.
        
        Args:
            file_path: Path to the file
            
        Returns:
            Content of the file as a string
            
        Raises:
            ValueError: If the file cannot be read
        """
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                return f.read()
        except Exception as e:
            self.logger.warning(f"Could not read file {file_path}: {e}")
            return ""  # Return empty string for binary or unreadable files

    def get_files(self) -> Generator[Tuple[str, str], None, None]:
        """
        Get files from the repository.
        
        Yields:
            Tuples of (file_path, file_content)
        """
        self.logger.info(f"Traversing repository: {self.repo_path}")
        
        for root, dirs, files in os.walk(self.repo_path):
            # Filter out excluded directories
            dirs[:] = [d for d in dirs if not self._is_excluded(os.path.join(root, d))]
            
            for file in files:
                file_path = os.path.join(root, file)
                
                # Skip excluded files
                if self._is_excluded(file_path):
                    continue
                
                # Get relative path
                rel_path = os.path.relpath(file_path, self.repo_path)
                
                self.logger.debug(f"Processing file: {rel_path}")
                
                # Get file content
                content = self._get_file_content(file_path)
                
                yield rel_path, content
