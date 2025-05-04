"""
Tests for the category processors.
"""

import unittest
from unittest import mock

from audit_near.ai_client import AiClient
from audit_near.categories.code_quality import CodeQuality


class TestCategories(unittest.TestCase):
    """
    Tests for the category processors.
    """
    
    def setUp(self):
        """Set up test environment before each test."""
        # Mock AI client
        self.ai_client = mock.MagicMock(spec=AiClient)
        
        # Create a temporary prompt file
        self.prompt_file = "test_prompt.md"
        with open(self.prompt_file, "w") as f:
            f.write("Test prompt with placeholder: {FILES_CONTENT}")
        
        # Create a code quality processor
        self.code_quality = CodeQuality(
            ai_client=self.ai_client,
            prompt_file=self.prompt_file,
            max_points=10,
            repo_path="/path/to/repo"
        )
    
    def tearDown(self):
        """Clean up test environment after each test."""
        import os
        if os.path.exists(self.prompt_file):
            os.remove(self.prompt_file)
    
    def test_code_quality_filter_code_files(self):
        """Test that _filter_code_files returns only code files."""
        # Test data
        files = [
            ("src/main.js", "console.log('Hello');"),
            ("src/utils.py", "print('Hello')"),
            ("README.md", "# README"),
            ("assets/logo.png", "binary content"),
        ]
        
        # Filter code files
        code_files = self.code_quality._filter_code_files(files)
        
        # Check that only code files are returned
        self.assertEqual(len(code_files), 2)
        self.assertIn(("src/main.js", "console.log('Hello');"), code_files)
        self.assertIn(("src/utils.py", "print('Hello')"), code_files)
    
    def test_code_quality_select_code_sample(self):
        """Test that _select_code_sample returns a representative sample."""
        # Test data with 15 files of different sizes
        files = [
            (f"file{i}.js", "x".ljust(i * 100))
            for i in range(1, 16)
        ]
        
        # Select code sample
        sample = self.code_quality._select_code_sample(files)
        
        # Check that the sample size is limited
        self.assertLessEqual(len(sample), 10)
    
    def test_code_quality_build_prompt(self):
        """Test that _build_prompt correctly formats the prompt."""
        # Test data
        sample = [
            ("file1.js", "console.log('Hello');"),
            ("file2.py", "print('Hello')"),
        ]
        
        # Build prompt
        prompt = self.code_quality._build_prompt(sample)
        
        # Check that the prompt contains file content
        self.assertIn("file1.js", prompt)
        self.assertIn("console.log('Hello');", prompt)
        self.assertIn("file2.py", prompt)
        self.assertIn("print('Hello')", prompt)
    
    def test_code_quality_extract_results(self):
        """Test that _extract_results extracts score and feedback."""
        # Test data
        analysis = {
            "score": 8,
            "feedback": "Good code quality with minor issues."
        }
        
        # Extract results
        score, feedback = self.code_quality._extract_results(analysis)
        
        # Check that score and feedback are extracted correctly
        self.assertEqual(score, 8)
        self.assertEqual(feedback, "Good code quality with minor issues.")
    
    def test_code_quality_extract_results_handles_invalid_data(self):
        """Test that _extract_results handles invalid data."""
        # Test data with missing score
        analysis = {
            "feedback": "Good code quality with minor issues."
        }
        
        # Extract results
        score, feedback = self.code_quality._extract_results(analysis)
        
        # Check that default values are used
        self.assertEqual(score, 0)
        self.assertEqual(feedback, "Good code quality with minor issues.")
        
        # Test data with invalid score
        analysis = {
            "score": "invalid",
            "feedback": "Good code quality with minor issues."
        }
        
        # Extract results
        score, feedback = self.code_quality._extract_results(analysis)
        
        # Check that default values are used
        self.assertEqual(score, 0)
        self.assertEqual(feedback, "Error processing code quality analysis.")
    
    def test_code_quality_process(self):
        """Test the complete process method."""
        # Test data
        files = [
            ("src/main.js", "console.log('Hello');"),
            ("src/utils.py", "print('Hello')"),
            ("README.md", "# README"),
        ]
        
        # Mock AI client response
        self.ai_client.analyze_code_quality.return_value = {
            "score": 8,
            "feedback": "Good code quality with minor issues."
        }
        
        # Process files
        score, feedback = self.code_quality.process(files)
        
        # Check that AI client was called
        self.ai_client.analyze_code_quality.assert_called_once()
        
        # Check that score and feedback are correct
        self.assertEqual(score, 8)
        self.assertEqual(feedback, "Good code quality with minor issues.")


if __name__ == "__main__":
    unittest.main()
