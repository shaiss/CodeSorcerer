"""
Innovation category processor.

This module implements the processor for the innovation category.
"""

import logging
import os
from typing import Dict, List, Tuple

from audit_near.ai_client import AiClient
from audit_near.categories.utils import load_prompt_template


class Innovation:
    """
    Processor for the innovation category.
    """
    
    def __init__(self, ai_client: AiClient, prompt_file: str, max_points: int, repo_path: str):
        """
        Initialize the innovation processor.
        
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
        Process the innovation category.
        
        Args:
            files: List of (file_path, file_content) tuples
            
        Returns:
            Tuple of (score, feedback)
        """
        self.logger.info("Processing innovation category")
        
        # Extract project summary from README or similar files
        project_summary = self._extract_project_summary(files)
        
        # Find unique or innovative code patterns
        innovative_patterns = self._find_innovative_patterns(files)
        
        # Build the prompt
        prompt = self._build_prompt(project_summary, innovative_patterns)
        
        # Get analysis from AI
        analysis = self.ai_client.analyze_innovation(prompt)
        
        # Extract score and feedback
        score, feedback = self._extract_results(analysis)
        
        return score, feedback
    
    def _extract_project_summary(self, files: List[Tuple[str, str]]) -> str:
        """
        Extract project summary from README or similar files.
        
        Args:
            files: List of (file_path, file_content) tuples
            
        Returns:
            Project summary as a string
        """
        # Look for README files
        readme = next(
            (content for path, content in files if path.lower() == "readme.md"), 
            None
        )
        
        if readme:
            return readme
        
        # Look for other documentation files
        docs = [
            content for path, content in files
            if path.lower().endswith((".md", ".txt")) and "doc" in path.lower()
        ]
        
        if docs:
            return "\n\n".join(docs[:3])  # Combine up to 3 doc files
        
        # As a fallback, look for package.json, Cargo.toml, or similar
        package_json = next(
            (content for path, content in files if path.lower() == "package.json"),
            None
        )
        
        if package_json:
            try:
                import json
                pkg_data = json.loads(package_json)
                
                summary_parts = []
                if "name" in pkg_data:
                    summary_parts.append(f"Project name: {pkg_data['name']}")
                if "description" in pkg_data:
                    summary_parts.append(f"Description: {pkg_data['description']}")
                
                return "\n".join(summary_parts)
            except Exception as e:
                self.logger.warning(f"Error parsing package.json: {e}")
        
        # If nothing else, return a brief summary based on directory structure
        dirs = set()
        for path, _ in files:
            parts = path.split("/")
            if len(parts) > 1:
                dirs.add(parts[0])
        
        return f"Project directory structure contains: {', '.join(sorted(dirs))}"
    
    def _find_innovative_patterns(self, files: List[Tuple[str, str]]) -> List[Tuple[str, str]]:
        """
        Find unique or innovative code patterns.
        
        Args:
            files: List of (file_path, file_content) tuples
            
        Returns:
            List of (file_path, snippet) tuples for innovative code patterns
        """
        # Look for NEAR-specific patterns
        near_patterns = [
            "near.call", "near.view", "near.connectWallet", 
            "Contract", "NearBindgen", "near_bindgen", 
            "AccountId", "Promise", "cross_contract_call"
        ]
        
        innovative_snippets = []
        
        for path, content in files:
            # Skip non-code files
            if not any(path.endswith(ext) for ext in [".js", ".ts", ".jsx", ".tsx", ".rs", ".py", ".sol"]):
                continue
                
            # Skip very large files
            if len(content) > 50000:
                continue
                
            # Look for NEAR-specific patterns
            lines = content.splitlines()
            
            for i, line in enumerate(lines):
                if any(pattern in line for pattern in near_patterns):
                    # Extract a snippet around this line
                    start = max(0, i - 5)
                    end = min(len(lines), i + 5)
                    
                    snippet = "\n".join(lines[start:end])
                    innovative_snippets.append((path, snippet))
                    break  # Only one snippet per file
        
        # Take up to 5 snippets
        return innovative_snippets[:5]
    
    def _build_prompt(self, project_summary: str, innovative_patterns: List[Tuple[str, str]]) -> str:
        """
        Build the prompt for the AI.
        
        Args:
            project_summary: Project summary as a string
            innovative_patterns: List of (file_path, snippet) tuples for innovative code patterns
            
        Returns:
            Prompt string
        """
        # Format innovative patterns
        patterns_content = []
        for path, snippet in innovative_patterns:
            patterns_content.append(f"File: {path}\n\n```\n{snippet}\n```\n")
        
        patterns_str = "\n".join(patterns_content)
        
        # Replace placeholders in prompt template
        prompt = self.prompt_template
        prompt = prompt.replace("{PROJECT_SUMMARY}", project_summary)
        prompt = prompt.replace("{INNOVATIVE_PATTERNS}", patterns_str)
        
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
            return 0, "Error processing innovation analysis."
