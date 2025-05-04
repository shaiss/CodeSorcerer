"""
Base category processor.

This module provides a base class for category processors that utilizes
the repository analyzer for improved file selection and context generation.
"""

import json
import logging
import os
from typing import Dict, List, Tuple, Any, Optional

from audit_near.ai_client import AiClient
from audit_near.categories.utils import load_prompt_template
from audit_near.providers.repo_analyzer import RepoAnalyzer


class BaseCategory:
    """
    Base class for category processors.
    
    This class provides common functionality for category processors,
    including repository analysis and prompt building.
    """
    
    def __init__(
        self, 
        ai_client: AiClient, 
        prompt_file: str, 
        max_points: int, 
        repo_path: str,
        category_name: str,
        branch: str = "main"
    ):
        """
        Initialize the base category processor.
        
        Args:
            ai_client: AI client instance
            prompt_file: Path to the prompt template file
            max_points: Maximum number of points for this category
            repo_path: Path to the repository
            category_name: Name of the category
            branch: Repository branch name (default: main)
        """
        self.ai_client = ai_client
        self.prompt_file = prompt_file
        self.max_points = max_points
        self.repo_path = repo_path
        self.category_name = category_name
        self.branch = branch
        self.logger = logging.getLogger(__name__)
        
        # Load prompt template
        self.prompt_template = load_prompt_template(prompt_file)
        
        # Initialize repository analyzer (lazy loading - will be created when needed)
        self._repo_analyzer = None
    
    @property
    def repo_analyzer(self) -> RepoAnalyzer:
        """
        Get the repository analyzer.
        
        Returns:
            RepoAnalyzer instance
        """
        if self._repo_analyzer is None:
            self.logger.info(f"Initializing repository analyzer for {self.repo_path}")
            self._repo_analyzer = RepoAnalyzer(repo_path=self.repo_path, branch=self.branch)
        
        return self._repo_analyzer
    
    def get_repo_summary(self) -> Dict[str, Any]:
        """
        Get the repository analysis summary.
        
        Returns:
            Repository analysis summary
        """
        return self.repo_analyzer.analyze().get('summary', {})
    
    def process(self, files: List[Tuple[str, str]]) -> Tuple[int, str]:
        """
        Process the category.
        
        Args:
            files: List of (file_path, file_content) tuples
            
        Returns:
            Tuple of (score, feedback)
        """
        self.logger.info(f"Processing {self.category_name} category")
        
        # Analyze repository
        repo_analysis = self.repo_analyzer.analyze()
        
        # Select files for this category
        selected_files = self._select_files(files, repo_analysis)
        
        # Build the prompt
        prompt = self._build_prompt(selected_files, repo_analysis)
        
        # Get analysis from AI
        analysis = self._get_ai_analysis(prompt)
        
        # Extract score and feedback
        score, feedback = self._extract_results(analysis)
        
        return score, feedback
    
    def _select_files(
        self, 
        files: List[Tuple[str, str]], 
        repo_analysis: Dict[str, Any]
    ) -> List[Tuple[str, str]]:
        """
        Select files for analysis.
        
        Args:
            files: List of (file_path, file_content) tuples
            repo_analysis: Repository analysis results
            
        Returns:
            List of (file_path, file_content) tuples for analysis
        """
        # This is a base implementation that should be overridden by subclasses
        # to implement category-specific file selection logic
        file_limit = 10  # Limit to 10 files to avoid token limits
        return files[:file_limit]
    
    def _build_prompt(
        self, 
        selected_files: List[Tuple[str, str]], 
        repo_analysis: Dict[str, Any]
    ) -> str:
        """
        Build the prompt for the AI.
        
        Args:
            selected_files: List of (file_path, file_content) tuples for analysis
            repo_analysis: Repository analysis results
            
        Returns:
            Prompt string
        """
        # Format files content
        files_content = []
        for path, content in selected_files:
            files_content.append(f"File: {path}\n\n```\n{content}\n```\n")
        
        files_content_str = "\n".join(files_content)
        
        # Format repository summary
        repo_summary = json.dumps(repo_analysis.get('summary', {}), indent=2)
        
        # Replace placeholders in template
        prompt = self.prompt_template
        prompt = prompt.replace("{FILES_CONTENT}", files_content_str)
        prompt = prompt.replace("{REPO_SUMMARY}", repo_summary)
        
        return prompt
    
    def _get_ai_analysis(self, prompt: str) -> Dict[str, Any]:
        """
        Get analysis from AI.
        
        Args:
            prompt: Prompt string
            
        Returns:
            Dictionary with analysis results
        """
        # This method should be implemented by subclasses to use the
        # appropriate AI client method for the category
        raise NotImplementedError("Subclasses must implement _get_ai_analysis")
    
    def _extract_results(self, analysis: Dict[str, Any]) -> Tuple[int, str]:
        """
        Extract results from the AI analysis.
        
        Args:
            analysis: Analysis results from the AI
            
        Returns:
            Tuple of (score, feedback)
        """
        try:
            score = int(analysis.get("score", 0))
            # Ensure score is within bounds
            score = max(0, min(score, self.max_points))
            
            feedback = analysis.get("feedback", "No feedback provided.")
            
            return score, feedback
        except (KeyError, ValueError) as e:
            self.logger.error(f"Error extracting results from AI analysis: {e}")
            return 0, f"Error processing {self.category_name} analysis."