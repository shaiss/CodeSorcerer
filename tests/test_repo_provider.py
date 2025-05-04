"""
Tests for the repository provider.
"""

import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from audit_near.providers.repo_provider import RepoProvider


class TestRepoProvider(unittest.TestCase):
    """
    Tests for the RepoProvider class.
    """
    
    def setUp(self):
        """Set up test environment before each test."""
        # Create a temporary directory to act as our repository
        self.temp_dir = tempfile.TemporaryDirectory()
        self.repo_path = self.temp_dir.name
        
        # Create some test files
        self._create_test_files()
        
        # Create the provider
        self.provider = RepoProvider(repo_path=self.repo_path)
    
    def tearDown(self):
        """Clean up test environment after each test."""
        self.temp_dir.cleanup()
    
    def _create_test_files(self):
        """Create test files in the temporary directory."""
        # Create a simple file structure
        files = {
            "README.md": "# Test Repository",
            "src/main.js": "console.log('Hello, world!');",
            "src/utils/helper.js": "function helper() { return true; }",
            ".git/HEAD": "ref: refs/heads/main",  # Should be excluded
            "node_modules/package/index.js": "module.exports = {};",  # Should be excluded
            "build/bundle.js": "console.log('built');",  # Should be excluded
            "assets/logo.png": b"\x89PNG\r\n\x1a\n",  # Binary file, should be excluded
        }
        
        for path, content in files.items():
            full_path = os.path.join(self.repo_path, path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            # Write text or binary content as appropriate
            if isinstance(content, bytes):
                with open(full_path, "wb") as f:
                    f.write(content)
            else:
                with open(full_path, "w") as f:
                    f.write(content)
    
    def test_get_files_excludes_git_and_node_modules(self):
        """Test that get_files excludes .git and node_modules directories."""
        files = list(self.provider.get_files())
        file_paths = [path for path, _ in files]
        
        # Check that we get the expected files
        self.assertIn("README.md", file_paths)
        self.assertIn("src/main.js", file_paths)
        self.assertIn("src/utils/helper.js", file_paths)
        
        # Check that excluded files are not present
        self.assertNotIn(".git/HEAD", file_paths)
        self.assertNotIn("node_modules/package/index.js", file_paths)
    
    def test_get_files_excludes_binary_files(self):
        """Test that get_files excludes binary files."""
        files = list(self.provider.get_files())
        file_paths = [path for path, _ in files]
        
        # Check that binary files are not included
        self.assertNotIn("assets/logo.png", file_paths)
    
    def test_get_files_returns_content(self):
        """Test that get_files returns file content."""
        files = list(self.provider.get_files())
        file_dict = {path: content for path, content in files}
        
        # Check content of files
        self.assertEqual(file_dict["README.md"], "# Test Repository")
        self.assertEqual(file_dict["src/main.js"], "console.log('Hello, world!');")
    
    def test_invalid_repository_path(self):
        """Test that an invalid repository path raises an error."""
        with self.assertRaises(ValueError):
            RepoProvider(repo_path="/path/that/does/not/exist")
    
    @mock.patch("logging.Logger.warning")
    def test_unreadable_file_returns_empty_string(self, mock_warning):
        """Test that unreadable files return an empty string and log a warning."""
        # Create a provider with a mocked _get_file_content method
        provider = RepoProvider(repo_path=self.repo_path)
        
        # Mock _get_file_content to raise an exception
        with mock.patch.object(provider, "_get_file_content", side_effect=Exception("Test exception")):
            files = list(provider.get_files())
            
            # Check that we still get files, but content is empty for those that couldn't be read
            self.assertTrue(any(path for path, _ in files))
            self.assertTrue(any(not content for _, content in files))
            
            # Check that a warning was logged
            mock_warning.assert_called()


if __name__ == "__main__":
    unittest.main()
