"""
Enhanced code quality category processor.

This module implements an enhanced processor for the code quality category
that utilizes the repository analyzer for improved file selection and context.
"""

import logging
import os
from typing import Dict, List, Tuple, Any

from audit_near.ai_client import AiClient
from audit_near.categories.base_category import BaseCategory


class EnhancedCodeQuality(BaseCategory):
    """
    Enhanced processor for the code quality category.
    """
    
    def __init__(self, ai_client: AiClient, prompt_file: str, max_points: int, repo_path: str, branch: str = "main"):
        """
        Initialize the enhanced code quality processor.
        
        Args:
            ai_client: AI client instance
            prompt_file: Path to the prompt template file
            max_points: Maximum number of points for this category
            repo_path: Path to the repository
            branch: Repository branch (default: main)
        """
        super().__init__(
            ai_client=ai_client,
            prompt_file=prompt_file,
            max_points=max_points,
            repo_path=repo_path,
            category_name="Code Quality & Documentation",
            branch=branch
        )
        self.logger = logging.getLogger(__name__)
    
    def _select_files(self, files: List[Tuple[str, str]], repo_analysis: Dict[str, Any]) -> List[Tuple[str, str]]:
        """
        Select files for analysis.
        
        Args:
            files: List of (file_path, file_content) tuples
            repo_analysis: Repository analysis results
            
        Returns:
            List of (file_path, file_content) tuples for analysis
        """
        self.logger.info("Selecting files for code quality analysis using enhanced selection")
        
        # Get file importance from dependency analysis
        important_files = repo_analysis.get('dependency_analysis', {}).get('important_files', [])
        
        # Get files by category
        categorized_files = repo_analysis.get('categorized_files', {})
        
        # Get language-specific core files
        language_files = {}
        for path, _ in files:
            ext = os.path.splitext(path)[1].lower()
            if ext not in language_files:
                language_files[ext] = []
            language_files[ext].append(path)
        
        # Prioritize selection:
        # 1. Most important files from dependency analysis
        # 2. Representative files from different languages
        # 3. Tests if available
        # 4. Documentation files
        
        # Start with the most important files (up to 5)
        selected_paths = set(important_files[:5])
        
        # Add representative files from each language (up to 3 per language, max 2 languages)
        top_languages = sorted(language_files.items(), key=lambda x: len(x[1]), reverse=True)[:2]
        for ext, paths in top_languages:
            for path in paths[:3]:
                selected_paths.add(path)
                if len(selected_paths) >= 10:
                    break
        
        # Add test files if available (up to 2)
        test_paths = categorized_files.get('tests', [])
        for path in test_paths[:2]:
            selected_paths.add(path)
            if len(selected_paths) >= 12:
                break
        
        # Add documentation files if available (up to 2)
        doc_paths = categorized_files.get('documentation', [])
        for path in doc_paths[:2]:
            selected_paths.add(path)
            if len(selected_paths) >= 12:
                break
        
        # Filter out overly large files (> 50KB) to stay within token limits
        selected_paths = {
            path for path in selected_paths
            if os.path.exists(os.path.join(self.repo_path, path)) and
            os.path.getsize(os.path.join(self.repo_path, path)) < 50000
        }
        
        # Map back to (path, content) tuples
        path_to_content = {path: content for path, content in files}
        selected_files = [(path, path_to_content.get(path, "")) for path in selected_paths]
        
        # Ensure we don't exceed token limits (max 12 files)
        return selected_files[:12]
    
    def _get_ai_analysis(self, prompt: str) -> Dict[str, Any]:
        """
        Get analysis from AI.
        
        Args:
            prompt: Prompt string
            
        Returns:
            Dictionary with analysis results
        """
        return self.ai_client.analyze_code_quality(prompt)