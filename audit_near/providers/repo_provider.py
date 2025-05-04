"""
Local repository provider.

This module implements a provider to traverse local repositories,
yielding file paths and contents.
"""

import logging
import os
import re
import stat
import fnmatch
from pathlib import Path
from typing import Dict, Generator, List, Set, Tuple, Optional

from audit_near.providers.base_provider import BaseProvider


class RepoProvider(BaseProvider):
    """
    Provider for local repositories.
    
    This provider traverses a local repository directory,
    yielding file paths and contents.
    """
    
    def __init__(self, repo_path: str, branch: str = "main", max_file_size_kb: int = 500):
        """
        Initialize the repository provider.
        
        Args:
            repo_path: Path to the local repository
            branch: Branch name (default: main)
            max_file_size_kb: Maximum file size in KB to include (default: 500)
        """
        self.repo_path = os.path.abspath(repo_path)
        self.branch = branch
        self.max_file_size_bytes = max_file_size_kb * 1024
        self.logger = logging.getLogger(__name__)
        
        if not os.path.isdir(self.repo_path):
            raise ValueError(f"Repository path does not exist: {self.repo_path}")
            
        self.logger.info(f"Initialized repository provider for {self.repo_path}")
        
        # Parse .gitignore if it exists
        self.gitignore_patterns = self._parse_gitignore()

    def _parse_gitignore(self) -> List[str]:
        """
        Parse .gitignore file and return patterns.
        
        Returns:
            List of gitignore patterns
        """
        gitignore_path = os.path.join(self.repo_path, '.gitignore')
        patterns = []
        
        if os.path.exists(gitignore_path):
            try:
                with open(gitignore_path, 'r', encoding='utf-8', errors='replace') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#'):
                            patterns.append(line)
                self.logger.info(f"Loaded {len(patterns)} patterns from .gitignore")
            except Exception as e:
                self.logger.warning(f"Error parsing .gitignore: {e}")
        
        return patterns

    def _is_excluded_by_gitignore(self, rel_path: str) -> bool:
        """
        Check if a path is excluded by .gitignore patterns.
        
        Args:
            rel_path: Relative path to check
            
        Returns:
            True if the path is excluded, False otherwise
        """
        # Convert Windows path separators to Unix style for matching
        rel_path = rel_path.replace('\\', '/')
        
        for pattern in self.gitignore_patterns:
            # Handle negation pattern (files that should NOT be ignored)
            if pattern.startswith('!'):
                if fnmatch.fnmatch(rel_path, pattern[1:]):
                    return False
                continue
                
            # Handle directory pattern (ending with /)
            if pattern.endswith('/'):
                # Check if the path or any parent directory matches
                if rel_path == pattern[:-1] or rel_path.startswith(pattern):
                    return True
                continue
                
            # Handle file pattern
            if fnmatch.fnmatch(rel_path, pattern):
                return True
                
            # Handle pattern matching a directory at any level
            if '/' not in pattern:
                parts = rel_path.split('/')
                if any(fnmatch.fnmatch(part, pattern) for part in parts):
                    return True
        
        return False

    def _is_excluded(self, path: str) -> bool:
        """
        Check if a path should be excluded from analysis.
        
        Args:
            path: Path to check
            
        Returns:
            True if the path should be excluded, False otherwise
        """
        # Standard exclusions
        excluded_dirs = {
            ".git", "node_modules", "__pycache__", ".idea", ".vscode", ".venv", 
            "venv", "env", "build", "dist", "coverage", ".next", ".nuxt", ".output",
            "target", "vendor", "bower_components", "jspm_packages", "lib", "libs",
            "generated", "min", "third_party", "third-party", "3rdparty", "3rd-party", 
            ".gradle", ".mvn", "bin", "obj"
        }
        
        excluded_files = {
            ".DS_Store", ".gitignore", ".gitattributes", "package-lock.json", "yarn.lock",
            "pnpm-lock.yaml", "Pipfile.lock", "poetry.lock", "Gemfile.lock", "Cargo.lock",
            ".eslintcache", ".stylelintcache", ".env", ".env.local", ".env.development",
            ".env.test", ".env.production", ".editorconfig", ".npmrc", ".yarnrc",
            "LICENSE", "LICENCE", "NOTICE", "PATENTS", "AUTHORS", "CONTRIBUTORS",
            "CHANGELOG", "CHANGELOG.md", "HISTORY", "HISTORY.md"
        }
        
        excluded_extensions = {
            # Binary executables and libraries
            ".pyc", ".pyo", ".so", ".o", ".a", ".lib", ".dll", ".exe", ".bin", 
            # Media files
            ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".ico", ".mp3", ".mp4", 
            ".wav", ".avi", ".mov", ".webm", ".ogg", ".webp", ".ttf", ".otf", ".woff", ".woff2",
            # Document formats
            ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".csv", 
            # Compressed files
            ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
            # Database files
            ".db", ".sqlite", ".sqlite3", ".mysql", ".psql",
            # Minified files
            ".min.js", ".min.css",
            # Metadata files
            ".pb", ".d.ts", ".tsbuildinfo"
        }

        # Get relative path for gitignore matching
        rel_path = os.path.relpath(path, self.repo_path)
        
        # Check if path is excluded by .gitignore
        if self._is_excluded_by_gitignore(rel_path):
            return True
        
        path_parts = Path(path).parts
        
        # Check if any part of the path is in excluded_dirs
        if any(part in excluded_dirs for part in path_parts):
            return True
            
        # Check if filename is in excluded_files
        if os.path.basename(path) in excluded_files:
            return True
            
        # Check if file has an excluded extension
        file_ext = os.path.splitext(path)[1].lower()
        if file_ext in excluded_extensions:
            return True
            
        # Check for minified files (file.min.js pattern)
        if os.path.basename(path).endswith((".min.js", ".min.css")):
            return True
        
        # Check file size (if it exists and is a regular file)
        if os.path.exists(path) and os.path.isfile(path):
            try:
                if os.path.getsize(path) > self.max_file_size_bytes:
                    self.logger.debug(f"File too large, skipping: {path}")
                    return True
            except Exception as e:
                self.logger.warning(f"Error checking file size for {path}: {e}")
        
        # Check if file appears to be binary
        if self._is_binary_file(path):
            self.logger.debug(f"Binary file detected, skipping: {path}")
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
        if not os.path.exists(file_path):
            return False
            
        # Check file type based on extension first for efficiency
        _, ext = os.path.splitext(file_path)
        if ext.lower() in {'.txt', '.md', '.py', '.js', '.ts', '.html', '.css', '.json', '.xml', '.yaml', '.yml', '.toml', '.ini', '.conf', '.cfg', '.sh', '.bat', '.ps1'}:
            return False
            
        # Peek at the file content to detect binary files
        try:
            with open(file_path, 'rb') as f:
                chunk = f.read(8192)  # Read first 8KB
                # Check for null bytes which often indicate binary files
                if b'\x00' in chunk:
                    return True
                # Try to decode as text
                try:
                    chunk.decode('utf-8')
                    return False
                except UnicodeDecodeError:
                    return True
        except Exception as e:
            self.logger.warning(f"Error checking if file is binary {file_path}: {e}")
            return True  # Assume binary on error
            
        return False

    def _get_file_content(self, file_path: str, max_lines: Optional[int] = None) -> str:
        """
        Get the content of a file.
        
        Args:
            file_path: Path to the file
            max_lines: Maximum number of lines to read (default: None, meaning all lines)
            
        Returns:
            Content of the file as a string
            
        Raises:
            ValueError: If the file cannot be read
        """
        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                if max_lines is None:
                    return f.read()
                else:
                    return ''.join([next(f) for _ in range(max_lines) if f])
        except Exception as e:
            self.logger.warning(f"Could not read file {file_path}: {e}")
            return ""  # Return empty string for binary or unreadable files

    def get_files(self, max_lines_per_file: Optional[int] = None) -> Generator[Tuple[str, str], None, None]:
        """
        Get files from the repository.
        
        Args:
            max_lines_per_file: Maximum number of lines to read per file (default: None)
            
        Yields:
            Tuples of (file_path, file_content)
        """
        self.logger.info(f"Traversing repository: {self.repo_path}")
        
        for root, dirs, files in os.walk(self.repo_path):
            # Filter out excluded directories in-place
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
                content = self._get_file_content(file_path, max_lines=max_lines_per_file)
                
                yield rel_path, content
                
    def get_files_by_type(self, file_types: Set[str], max_files: int = 100) -> List[Tuple[str, str]]:
        """
        Get files of specific types.
        
        Args:
            file_types: Set of file extensions to include (e.g., {'.js', '.py'})
            max_files: Maximum number of files to return
            
        Returns:
            List of (file_path, file_content) tuples
        """
        result = []
        count = 0
        
        for rel_path, content in self.get_files():
            ext = os.path.splitext(rel_path)[1].lower()
            if ext in file_types:
                result.append((rel_path, content))
                count += 1
                
                if count >= max_files:
                    break
                    
        return result
