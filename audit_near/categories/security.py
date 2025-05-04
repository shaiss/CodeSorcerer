"""
Security category processor.

This module implements the processor for the security category.
"""

import logging
import os
from typing import Dict, List, Tuple

from audit_near.ai_client import AiClient
from audit_near.categories.utils import load_prompt_template


class Security:
    """
    Processor for the security category.
    """
    
    def __init__(self, ai_client: AiClient, prompt_file: str, max_points: int, repo_path: str):
        """
        Initialize the security processor.
        
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
        Process the security category.
        
        Args:
            files: List of (file_path, file_content) tuples
            
        Returns:
            Tuple of (score, feedback)
        """
        self.logger.info("Processing security category")
        
        # Filter security-sensitive files
        sensitive_files = self._filter_sensitive_files(files)
        
        # Build the prompt
        prompt = self._build_prompt(sensitive_files)
        
        # Get analysis from AI
        analysis = self.ai_client.analyze_security(prompt)
        
        # Extract score and feedback
        score, feedback = self._extract_results(analysis)
        
        return score, feedback
    
    def _filter_sensitive_files(self, files: List[Tuple[str, str]]) -> List[Tuple[str, str]]:
        """
        Filter files to include only security-sensitive files.
        
        Args:
            files: List of (file_path, file_content) tuples
            
        Returns:
            List of (file_path, file_content) tuples for security-sensitive files
        """
        # File patterns that are likely to contain security-sensitive code
        sensitive_patterns = [
            # Smart contracts
            ".sol", "contract", 
            # Authentication
            "auth", "login", "password", "token", "jwt", "session", 
            # Financial
            "payment", "wallet", "transaction", "transfer", 
            # Storage
            "database", "storage", "db", 
            # API
            "api", "endpoint", "route", 
            # Configuration
            "config", "env", ".env", 
            # NEAR specific
            "near", "account", "signer", "permission", "access"
        ]
        
        # Filter files based on patterns
        sensitive_files = []
        
        for path, content in files:
            # Skip binary or very large files
            if not content or len(content) > 100000:
                continue
                
            # Check if path contains any sensitive pattern
            if any(pattern in path.lower() for pattern in sensitive_patterns):
                sensitive_files.append((path, content))
                continue
                
            # Check for sensitive patterns in file content
            content_lower = content.lower()
            if any(
                pattern in content_lower
                for pattern in [
                    "password", "secret", "token", "api_key", "apikey", 
                    "private_key", "privatekey", "wallet", "account", 
                    "near.call", "near.view", "contract.call"
                ]
            ):
                sensitive_files.append((path, content))
        
        # Limit the number of files to analyze (to avoid token limits)
        # Prioritize contract files
        contract_files = [
            (path, content) for path, content in sensitive_files
            if any(term in path.lower() for term in ["contract", ".sol", ".rs"])
        ]
        
        other_files = [
            (path, content) for path, content in sensitive_files
            if not any(term in path.lower() for term in ["contract", ".sol", ".rs"])
        ]
        
        # Select up to 3 contract files and up to 5 other files
        return contract_files[:3] + other_files[:5]
    
    def _build_prompt(self, sensitive_files: List[Tuple[str, str]]) -> str:
        """
        Build the prompt for the AI.
        
        Args:
            sensitive_files: List of (file_path, file_content) tuples for security-sensitive files
            
        Returns:
            Prompt string
        """
        # Insert file contents into the prompt
        file_sections = []
        
        for path, content in sensitive_files:
            file_sections.append(f"File: {path}\n\n```\n{content}\n```\n")
        
        files_content = "\n".join(file_sections)
        
        # Replace placeholder in prompt template
        prompt = self.prompt_template.replace("{SENSITIVE_FILES}", files_content)
        
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
            return 0, "Error processing security analysis."
