"""
Documentation category processor.

This module implements the processor for the documentation category.
"""

import logging
import os
from typing import Dict, List, Tuple

from audit_near.ai_client import AiClient
from audit_near.categories.utils import load_prompt_template


class Documentation:
    """
    Processor for the documentation category.
    """
    
    def __init__(self, ai_client: AiClient, prompt_file: str, max_points: int, repo_path: str):
        """
        Initialize the documentation processor.
        
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
        Process the documentation category.
        
        Args:
            files: List of (file_path, file_content) tuples
            
        Returns:
            Tuple of (score, feedback)
        """
        self.logger.info("Processing documentation category")
        
        # Extract all documentation files
        doc_files = self._extract_documentation_files(files)
        
        # Extract inline documentation statistics
        inline_doc_stats = self._extract_inline_documentation_stats(files)
        
        # Build the prompt
        prompt = self._build_prompt(doc_files, inline_doc_stats)
        
        # Get analysis from AI
        analysis = self.ai_client.analyze_documentation(prompt)
        
        # Extract score and feedback
        score, feedback = self._extract_results(analysis)
        
        return score, feedback
    
    def _extract_documentation_files(self, files: List[Tuple[str, str]]) -> List[Tuple[str, str]]:
        """
        Extract all documentation files.
        
        Args:
            files: List of (file_path, file_content) tuples
            
        Returns:
            List of (file_path, file_content) tuples for documentation files
        """
        # Documentation files typically have .md, .txt, or .adoc extensions
        # or are located in a docs directory
        doc_files = []
        
        for path, content in files:
            # Skip very large files
            if len(content) > 100000:
                continue
                
            # Check for documentation files
            if (
                path.lower().endswith((".md", ".txt", ".adoc", ".rst")) or
                "doc" in path.lower() or
                "readme" in path.lower() or
                "guide" in path.lower() or
                "tutorial" in path.lower()
            ):
                doc_files.append((path, content))
        
        return doc_files
    
    def _extract_inline_documentation_stats(self, files: List[Tuple[str, str]]) -> Dict:
        """
        Extract inline documentation statistics.
        
        Args:
            files: List of (file_path, file_content) tuples
            
        Returns:
            Dictionary containing inline documentation statistics
        """
        code_file_extensions = [
            ".js", ".jsx", ".ts", ".tsx",  # JavaScript/TypeScript
            ".py",  # Python
            ".rs",  # Rust
            ".sol",  # Solidity
            ".c", ".cpp", ".h", ".hpp",  # C/C++
            ".go",  # Go
            ".java",  # Java
            ".cs",  # C#
        ]
        
        total_code_files = 0
        files_with_comments = 0
        total_lines = 0
        comment_lines = 0
        
        for path, content in files:
            # Check if this is a code file
            if not any(path.endswith(ext) for ext in code_file_extensions):
                continue
                
            # Skip empty or very large files
            if not content or len(content) > 100000:
                continue
                
            total_code_files += 1
            
            # Count lines and comment lines
            lines = content.splitlines()
            total_lines += len(lines)
            
            has_comments = False
            
            for line in lines:
                line = line.strip()
                
                # Check for comments in different languages
                if (
                    line.startswith("//") or
                    line.startswith("#") or
                    line.startswith("--") or
                    line.startswith("/*") or
                    line.startswith("*") or
                    line.startswith("'''") or
                    line.startswith('"""') or
                    "///" in line or
                    "//!" in line
                ):
                    comment_lines += 1
                    has_comments = True
            
            if has_comments:
                files_with_comments += 1
        
        # Calculate statistics
        comment_ratio = comment_lines / total_lines if total_lines > 0 else 0
        files_with_comments_ratio = files_with_comments / total_code_files if total_code_files > 0 else 0
        
        return {
            "total_code_files": total_code_files,
            "files_with_comments": files_with_comments,
            "files_with_comments_ratio": files_with_comments_ratio,
            "total_lines": total_lines,
            "comment_lines": comment_lines,
            "comment_ratio": comment_ratio,
        }
    
    def _build_prompt(self, doc_files: List[Tuple[str, str]], inline_doc_stats: Dict) -> str:
        """
        Build the prompt for the AI.
        
        Args:
            doc_files: List of (file_path, file_content) tuples for documentation files
            inline_doc_stats: Dictionary containing inline documentation statistics
            
        Returns:
            Prompt string
        """
        # Format documentation files
        doc_files_content = []
        for path, content in doc_files[:5]:  # Limit to first 5 files to avoid token limits
            doc_files_content.append(f"File: {path}\n\n```\n{content}\n```\n")
        
        doc_files_str = "\n".join(doc_files_content)
        
        # Format inline documentation statistics
        inline_doc_stats_str = "\n".join([
            f"Total code files: {inline_doc_stats['total_code_files']}",
            f"Files with comments: {inline_doc_stats['files_with_comments']} ({inline_doc_stats['files_with_comments_ratio']:.2%})",
            f"Total lines of code: {inline_doc_stats['total_lines']}",
            f"Comment lines: {inline_doc_stats['comment_lines']} ({inline_doc_stats['comment_ratio']:.2%})",
        ])
        
        # Replace placeholders in prompt template
        prompt = self.prompt_template
        prompt = prompt.replace("{DOC_FILES}", doc_files_str)
        prompt = prompt.replace("{INLINE_DOC_STATS}", inline_doc_stats_str)
        
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
            return 0, "Error processing documentation analysis."
