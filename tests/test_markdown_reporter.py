"""
Tests for the Markdown reporter.
"""

import os
import tempfile
import unittest

from audit_near.reporters.markdown_reporter import MarkdownReporter


class TestMarkdownReporter(unittest.TestCase):
    """
    Tests for the MarkdownReporter class.
    """
    
    def setUp(self):
        """Set up test environment before each test."""
        self.reporter = MarkdownReporter()
        self.temp_dir = tempfile.TemporaryDirectory()
        self.output_path = os.path.join(self.temp_dir.name, "report.md")
    
    def tearDown(self):
        """Clean up test environment after each test."""
        self.temp_dir.cleanup()
    
    def test_generate_report_creates_file(self):
        """Test that generate_report creates a file."""
        # Test data
        repo_path = "/path/to/repo"
        branch = "main"
        results = {
            "code_quality": {
                "score": 8,
                "max_points": 10,
                "feedback": "Good code quality with minor issues."
            }
        }
        total_score = 8
        total_possible = 10
        
        # Generate report
        self.reporter.generate_report(
            repo_path=repo_path,
            branch=branch,
            results=results,
            total_score=total_score,
            total_possible=total_possible,
            output_path=self.output_path
        )
        
        # Check that file was created
        self.assertTrue(os.path.exists(self.output_path))
    
    def test_report_contains_expected_content(self):
        """Test that the generated report contains expected content."""
        # Test data
        repo_path = "/path/to/repo"
        branch = "main"
        results = {
            "code_quality": {
                "score": 8,
                "max_points": 10,
                "feedback": "Good code quality with minor issues."
            },
            "security": {
                "score": 6,
                "max_points": 10,
                "feedback": "Average security with some vulnerabilities."
            }
        }
        total_score = 14
        total_possible = 20
        
        # Generate report
        self.reporter.generate_report(
            repo_path=repo_path,
            branch=branch,
            results=results,
            total_score=total_score,
            total_possible=total_possible,
            output_path=self.output_path
        )
        
        # Read report content
        with open(self.output_path, "r") as f:
            content = f.read()
        
        # Check that expected content is present
        self.assertIn("NEAR Hackathon Project Audit Report", content)
        self.assertIn("Repository: `repo`", content)
        self.assertIn("Branch: `main`", content)
        self.assertIn("Overall Score: 14/20", content)
        self.assertIn("Code Quality", content)
        self.assertIn("Security", content)
        self.assertIn("Good code quality with minor issues", content)
        self.assertIn("Average security with some vulnerabilities", content)
    
    def test_rating_calculation(self):
        """Test that the rating is calculated correctly."""
        # Create a reporter with a mocked _get_rating method to test different percentage values
        reporter = MarkdownReporter()
        
        # Test different percentage values
        self.assertEqual(reporter._get_rating(95), "Excellent")
        self.assertEqual(reporter._get_rating(85), "Very Good")
        self.assertEqual(reporter._get_rating(75), "Good")
        self.assertEqual(reporter._get_rating(65), "Satisfactory")
        self.assertEqual(reporter._get_rating(55), "Needs Improvement")
        self.assertEqual(reporter._get_rating(45), "Poor")


if __name__ == "__main__":
    unittest.main()
