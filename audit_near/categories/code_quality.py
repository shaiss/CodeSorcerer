"""
Code quality category processor.

This module implements the processor for the code quality category.
"""

import logging
import os
from typing import Dict, List, Tuple

from audit_near.ai_client import AiClient
from audit_near.categories.utils import load_prompt_template


class CodeQuality:
    """
    Processor for the code quality category.
    """
    
    def __init__(self, ai_client: AiClient, prompt_file: str, max_points: int, repo_path: str):
        """
        Initialize the code quality processor.
        
        Args:
            ai_client: AI client instance
            prompt_file: Path to the prompt template file
            max_points: Maximum number of points for this category
            repo_path: Path to the repository
        """
        self.ai_client = ai_client
        self.prompt_file = prompt_file
        self.max_points = max_points
        self.repo_path = repo_path
        self.logger = logging.getLogger(__name__)
        
        # Load prompt template
        self.prompt_template = load_prompt_template(prompt_file)
    
    def process(self, files: List[Tuple[str, str]]) -> Tuple[int, str]:
        """
        Process the code quality category.
        
        Args:
            files: List of (file_path, file_content) tuples
            
        Returns:
            Tuple of (score, feedback)
        """
        self.logger.info("Processing code quality category")
        
        # Filter files for code (exclude assets, configs, etc.)
        code_files = self._filter_code_files(files)
        
        # Select a representative sample of code files
        sample = self._select_code_sample(code_files)
        
        # Build the prompt
        prompt = self._build_prompt(sample)
        
        # Get analysis from AI
        analysis = self.ai_client.analyze_code_quality(prompt)
        
        # Extract score and feedback
        score, feedback = self._extract_results(analysis)
        
        return score, feedback
    
    def _filter_code_files(self, files: List[Tuple[str, str]]) -> List[Tuple[str, str]]:
        """
        Filter files to include only code files.
        
        Args:
            files: List of (file_path, file_content) tuples
            
        Returns:
            List of (file_path, file_content) tuples for code files
        """
        code_extensions = {
            ".js", ".jsx", ".ts", ".tsx",  # JavaScript/TypeScript
            ".py",  # Python
            ".rs",  # Rust
            ".sol",  # Solidity
            ".wasm",  # WebAssembly
            ".c", ".cpp", ".h", ".hpp",  # C/C++
            ".java",  # Java
            ".go",  # Go
            ".cs",  # C#
            ".php",  # PHP
            ".rb",  # Ruby
            ".swift",  # Swift
            ".kt",  # Kotlin
        }
        
        return [
            (path, content) for path, content in files
            if os.path.splitext(path)[1].lower() in code_extensions and content.strip()
        ]
    
    def _select_code_sample(self, code_files: List[Tuple[str, str]]) -> List[Tuple[str, str]]:
        """
        Select a representative sample of code files for analysis.
        
        Args:
            code_files: List of (file_path, file_content) tuples for code files
            
        Returns:
            List of (file_path, file_content) tuples for the sample
        """
        # Sort files by size (smallest to largest)
        sorted_files = sorted(code_files, key=lambda x: len(x[1]))
        
        # Get a representative sample:
        # - Some small files (may be utilities or helpers)
        # - Some medium files (may be components or modules)
        # - Some large files (may be complex logic)
        
        total_files = len(sorted_files)
        
        if total_files <= 10:
            # If we have 10 or fewer files, use all of them
            return sorted_files
        
        # Calculate indices for small, medium, and large files
        small_idx = total_files // 5
        medium_idx = total_files // 2
        large_idx = total_files * 4 // 5
        
        # Select 3 small, 4 medium, and 3 large files
        sample = (
            sorted_files[:3] +  # Small files
            sorted_files[medium_idx-2:medium_idx+2] +  # Medium files
            sorted_files[-3:]  # Large files
        )
        
        # Ensure we don't have more than 10 files to avoid token limits
        return sample[:10]
    
    def _build_prompt(self, sample: List[Tuple[str, str]]) -> str:
        """
        Build the prompt for the AI.
        
        Args:
            sample: List of (file_path, file_content) tuples for the sample
            
        Returns:
            Prompt string
        """
        # Insert file contents into the prompt
        file_sections = []
        
        for path, content in sample:
            file_sections.append(f"File: {path}\n\n```\n{content}\n```\n")
        
        files_content = "\n".join(file_sections)
        
        # Replace placeholder in prompt template
        prompt = self.prompt_template.replace("{FILES_CONTENT}", files_content)
        
        return prompt
    
    def _extract_results(self, analysis: Dict) -> Tuple[int, str]:
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
            return 0, "Error processing code quality analysis."
