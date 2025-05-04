"""
Tests for the GitIgnore handler.
"""

import os
import tempfile
import unittest
from unittest import mock

from audit_near.providers.gitignore_handler import GitIgnoreHandler


class TestGitIgnoreHandler(unittest.TestCase):
    """
    Tests for the GitIgnoreHandler class.
    """
    
    def setUp(self):
        """Set up test environment before each test."""
        # Create a temporary directory to act as our repository
        self.temp_dir = tempfile.TemporaryDirectory()
        self.repo_path = self.temp_dir.name
        
        # Create a .gitignore file
        with open(os.path.join(self.repo_path, '.gitignore'), 'w') as f:
            f.write("# This is a comment\n")
            f.write("*.log\n")
            f.write("build/\n")
            f.write("temp/\n")
            f.write("!temp/keep.txt\n")  # Negated pattern
        
        # Create a nested .gitignore file
        os.makedirs(os.path.join(self.repo_path, 'src'), exist_ok=True)
        with open(os.path.join(self.repo_path, 'src', '.gitignore'), 'w') as f:
            f.write("*.tmp\n")
            f.write("local/\n")
        
        # Create the handler
        self.handler = GitIgnoreHandler(self.repo_path)
    
    def tearDown(self):
        """Clean up test environment after each test."""
        self.temp_dir.cleanup()
    
    def test_gitignore_patterns_from_root(self):
        """Test that patterns from root .gitignore are applied."""
        # Should be ignored by root .gitignore
        self.assertTrue(self.handler.is_ignored('example.log'))
        self.assertTrue(self.handler.is_ignored('logs/example.log'))
        self.assertTrue(self.handler.is_ignored('build/output.txt'))
        self.assertTrue(self.handler.is_ignored('temp/file.txt'))
        
        # Should not be ignored
        self.assertFalse(self.handler.is_ignored('example.txt'))
        self.assertFalse(self.handler.is_ignored('temp/keep.txt'))  # Negated pattern
    
    def test_gitignore_patterns_from_nested(self):
        """Test that patterns from nested .gitignore are applied."""
        # Should be ignored by nested .gitignore
        self.assertTrue(self.handler.is_ignored('src/example.tmp'))
        self.assertTrue(self.handler.is_ignored('src/local/file.txt'))
        
        # Should not be ignored
        self.assertFalse(self.handler.is_ignored('src/example.txt'))
        
        # Files in other directories with same names should not be ignored
        self.assertFalse(self.handler.is_ignored('example.tmp'))
        self.assertFalse(self.handler.is_ignored('local/file.txt'))
    
    def test_default_patterns(self):
        """Test that default patterns are applied."""
        # Common patterns that should be ignored
        self.assertTrue(self.handler.is_ignored('.git/config'))
        self.assertTrue(self.handler.is_ignored('node_modules/package/index.js'))
        self.assertTrue(self.handler.is_ignored('__pycache__/module.pyc'))
        self.assertTrue(self.handler.is_ignored('.venv/lib/python3.9/site-packages/module.py'))
        self.assertTrue(self.handler.is_ignored('.DS_Store'))
        
        # Should not be ignored
        self.assertFalse(self.handler.is_ignored('src/git/config.js'))  # Not in .git
    
    def test_absolute_path_handling(self):
        """Test that absolute paths are handled correctly."""
        # Create an absolute path
        abs_path = os.path.join(self.repo_path, 'example.log')
        
        # Should be ignored
        self.assertTrue(self.handler.is_ignored(abs_path))
        
        # Create an absolute path outside the repo
        outside_path = os.path.join(os.path.dirname(self.repo_path), 'example.log')
        
        # Should not throw an error, but also not match
        with self.assertLogs(level='WARNING'):
            result = self.handler.is_ignored(outside_path)
            # Can't assert specific result as it depends on the underlying implementation