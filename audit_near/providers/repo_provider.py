"""
Local repository provider.

This module implements a provider to traverse local repositories,
yielding file paths and contents.
"""

import logging
import os
import stat
from pathlib import Path
from typing import Dict, Generator, List, Set, Tuple, Optional

from audit_near.providers.base_provider import BaseProvider
from audit_near.providers.gitignore_handler import GitIgnoreHandler


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
        
        # Initialize GitIgnore handler
        self.gitignore_handler = GitIgnoreHandler(self.repo_path)
            
        self.logger.info(f"Initialized repository provider for {self.repo_path}")

    def _is_excluded(self, path: str) -> bool:
        """
        Check if a path should be excluded from analysis.
        
        Args:
            path: Path to check
            
        Returns:
            True if the path should be excluded, False otherwise
        """
        # First check if the file is ignored by gitignore patterns
        rel_path = os.path.relpath(path, self.repo_path)
        if self.gitignore_handler.is_ignored(rel_path):
            return True
        
        # Additional exclusions that might not be in .gitignore
        excluded_extensions = {
            # Binary files that shouldn't be analyzed
            ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".ico", ".svg",
            ".mp3", ".mp4", ".wav", ".avi", ".mov", ".flac", ".ogg",
            ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
            ".zip", ".tar", ".gz", ".rar", ".7z",
            ".ttf", ".otf", ".woff", ".woff2", ".eot",
            ".db", ".sqlite", ".sqlite3", ".db3",
            ".exe", ".dll", ".so", ".dylib", ".bin", ".o", ".a", ".lib"
        }
        
        # Check if extension is in excluded_extensions (additional binary files)
        if os.path.splitext(path)[1].lower() in excluded_extensions:
            return True
            
        return False

    def _is_binary_file(self, file_path: str) -> bool:
        """
        Check if a file is binary.
        
        Args:
            file_path: Path to the file
            
        Returns:
            True if the file is binary, False otherwise
        """
        # Check file extension
        _, ext = os.path.splitext(file_path)
        if ext.lower() in {
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico',
            '.pdf', '.zip', '.tar', '.gz', '.exe', '.dll', '.so',
            '.pyc', '.pyo', '.o', '.a', '.lib', '.bin',
            '.mp3', '.mp4', '.wav', '.avi', '.mov',
        }:
            return True
            
        # Check first few bytes for null bytes (common in binary files)
        try:
            with open(file_path, 'rb') as f:
                chunk = f.read(1024)
                if b'\x00' in chunk:
                    return True
                # Additional check for UTF-16 BOM
                if chunk.startswith(b'\xff\xfe') or chunk.startswith(b'\xfe\xff'):
                    return False  # It's a text file, just UTF-16 encoded
        except Exception:
            # If we can't read the file, treat it as binary
            return True
            
        return False

    def _get_file_content(self, file_path: str) -> Optional[str]:
        """
        Get the content of a file.
        
        Args:
            file_path: Path to the file
            
        Returns:
            Content of the file as a string, or None if file is binary
        """
        # Skip files that are too large
        try:
            file_size = os.path.getsize(file_path)
            if file_size > 1024 * 1024:  # Skip files > 1MB
                self.logger.debug(f"Skipping large file {file_path} ({file_size} bytes)")
                return None
                
            # Skip files that are symlinks
            if os.path.islink(file_path):
                self.logger.debug(f"Skipping symlink {file_path}")
                return None
                
            # Skip files that are executable
            mode = os.stat(file_path).st_mode
            if mode & stat.S_IEXEC:
                self.logger.debug(f"Skipping executable file {file_path}")
                return None
                
            # Check if file is binary
            if self._is_binary_file(file_path):
                self.logger.debug(f"Skipping binary file {file_path}")
                return None
                
            # Read text content
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                return f.read()
        except Exception as e:
            self.logger.warning(f"Could not read file {file_path}: {e}")
            return None

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
                
                # Skip if content is None (binary file)
                if content is None:
                    continue
                
                yield rel_path, content
