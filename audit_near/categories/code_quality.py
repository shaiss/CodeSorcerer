"""
Code quality category processor.

This module implements the processor for the code quality category.
"""

import logging
import os
import random
from collections import defaultdict
from typing import Dict, List, Tuple, Set, Optional

from audit_near.ai_client import AiClient
from audit_near.categories.utils import load_prompt_template


class CodeQuality:
    """
    Processor for the code quality category.
    """
    
    # Rough estimate of tokens per character for different languages
    # This helps estimate how many tokens a piece of code will consume
    TOKENS_PER_CHAR = {
        # Default for unknown languages
        "default": 0.25,
        # Language-specific estimates
        "py": 0.25,  # Python tends to be token-efficient
        "js": 0.3,   # JavaScript
        "jsx": 0.3,  # JavaScript React
        "ts": 0.3,   # TypeScript
        "tsx": 0.3,  # TypeScript React
        "rs": 0.35,  # Rust has more symbols
        "sol": 0.35, # Solidity
        "cpp": 0.35, # C++
        "c": 0.3,    # C
        "java": 0.35,# Java is verbose
        "go": 0.28,  # Go
        "rb": 0.25,  # Ruby is concise
    }
    
    # Maximum estimated tokens to use for code files
    MAX_TOKENS = 80000  # Leave room for system prompt and response
    
    # Maximum lines to include from very large files
    MAX_LINES_PER_FILE = 300
    
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
        
        # Group files by language for better representation
        grouped_files = self._group_files_by_language(code_files)
        
        # Select a representative sample of code files
        sample = self._select_code_sample(grouped_files)
        
        # Truncate file content if needed
        sample = self._truncate_sample(sample)
        
        # Build the prompt
        prompt = self._build_prompt(sample)
        
        # Get analysis from AI
        self.logger.info(f"Sending prompt to AI (estimated tokens: {self._estimate_tokens(prompt)})")
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
        
        # Further filter out test files and generated code if we have many code files
        excluded_patterns = {
            "test_", "_test", "tests/", "spec_", "_spec", "specs/",
            "mock_", "_mock", "mocks/", "stub_", "_stub", "stubs/",
            "generated/", "dist/", "build/", "vendor/", "node_modules/",
        }
        
        filtered_files = []
        for path, content in files:
            if not content.strip():
                continue
                
            ext = os.path.splitext(path)[1].lower()
            if ext not in code_extensions:
                continue
                
            # Skip test files and generated code if we have enough code files
            if len(filtered_files) > 50:
                if any(pattern in path for pattern in excluded_patterns):
                    continue
            
            filtered_files.append((path, content))
        
        return filtered_files
    
    def _group_files_by_language(self, code_files: List[Tuple[str, str]]) -> Dict[str, List[Tuple[str, str]]]:
        """
        Group files by programming language.
        
        Args:
            code_files: List of (file_path, file_content) tuples for code files
            
        Returns:
            Dictionary mapping language extensions to lists of (file_path, file_content) tuples
        """
        grouped = defaultdict(list)
        
        for path, content in code_files:
            ext = os.path.splitext(path)[1].lower()
            if ext:
                # Remove the dot
                lang = ext[1:]
                grouped[lang].append((path, content))
        
        return grouped
    
    def _estimate_tokens(self, text: str) -> int:
        """
        Estimate the number of tokens in a text.
        
        Args:
            text: The text to estimate
            
        Returns:
            Estimated number of tokens
        """
        # Simple estimation based on character count
        return int(len(text) * 0.25)  # Rough estimate of 4 chars per token on average
    
    def _select_code_sample(self, grouped_files: Dict[str, List[Tuple[str, str]]]) -> List[Tuple[str, str]]:
        """
        Select a representative sample of code files for analysis.
        
        Args:
            grouped_files: Dictionary mapping language extensions to lists of (file_path, file_content) tuples
            
        Returns:
            List of (file_path, file_content) tuples for the sample
        """
        # Initialize sample and token count
        sample = []
        total_tokens = 0
        
        # First, identify key files that are likely important regardless of language
        key_file_patterns = {
            "main", "index", "app", "server", "client", "core", "api", "model", "view", "controller",
            "component", "service", "utils", "helpers", "config", "settings", "constants", "types",
            "database", "storage", "auth", "user", "admin", "provider", "context", "hook", "state",
            "router", "route", "navigation", "validator", "parser", "formatter", "renderer",
        }
        
        key_files = []
        for lang, files in grouped_files.items():
            for path, content in files:
                # Check for key files by filename without extension
                filename = os.path.basename(path)
                name_without_ext = os.path.splitext(filename)[0].lower()
                
                if any(pattern in name_without_ext for pattern in key_file_patterns):
                    # Add to key files list but don't remove from grouped_files yet
                    key_files.append((path, content, lang))
        
        # Sort key files by size and select up to 5 most important ones
        key_files.sort(key=lambda x: len(x[1]), reverse=True)  # Sort by file size, largest first
        
        for path, content, lang in key_files[:5]:
            # Estimate tokens
            tokens = int(len(content) * self.TOKENS_PER_CHAR.get(lang, self.TOKENS_PER_CHAR["default"]))
            
            if total_tokens + tokens <= self.MAX_TOKENS:
                sample.append((path, content))
                total_tokens += tokens
                # Remove this file from the grouped files to avoid duplication
                grouped_files[lang] = [(p, c) for p, c in grouped_files[lang] if p != path]
        
        # Allocate remaining token budget proportionally to each language based on codebase composition
        total_remaining = self.MAX_TOKENS - total_tokens
        
        # Calculate total size of remaining code by language
        lang_sizes = {}
        total_size = 0
        for lang, files in grouped_files.items():
            lang_size = sum(len(content) for _, content in files)
            lang_sizes[lang] = lang_size
            total_size += lang_size
        
        # Allocate tokens proportionally
        lang_tokens = {}
        for lang, size in lang_sizes.items():
            if total_size > 0:
                lang_tokens[lang] = int((size / total_size) * total_remaining)
            else:
                lang_tokens[lang] = 0
        
        # Select files from each language
        for lang, files in grouped_files.items():
            # Skip if no token budget for this language
            if lang not in lang_tokens or lang_tokens[lang] <= 0:
                continue
                
            # Sort files by size
            sorted_files = sorted(files, key=lambda x: len(x[1]))
            
            # Select a variety of file sizes (small, medium, large)
            lang_sample = []
            
            if len(sorted_files) <= 3:
                # Use all files for small codebases
                lang_sample = sorted_files
            else:
                # Get small, medium, and large files
                lang_sample = [
                    sorted_files[0],  # Small
                    sorted_files[len(sorted_files) // 2],  # Medium
                    sorted_files[-1],  # Large
                ]
                
                # Add a few random files if we have token budget
                remaining_files = [f for f in sorted_files if f not in lang_sample]
                if remaining_files and len(lang_sample) < 5:
                    random_files = random.sample(remaining_files, min(2, len(remaining_files)))
                    lang_sample.extend(random_files)
            
            # Add files to sample up to the token budget for this language
            lang_token_count = 0
            for path, content in lang_sample:
                tokens = int(len(content) * self.TOKENS_PER_CHAR.get(lang, self.TOKENS_PER_CHAR["default"]))
                
                if lang_token_count + tokens <= lang_tokens[lang]:
                    sample.append((path, content))
                    lang_token_count += tokens
                    total_tokens += tokens
        
        # Ensure we have at least some files
        if not sample and grouped_files:
            # If we couldn't add any files with our budget, take at least one file
            for lang, files in grouped_files.items():
                if files:
                    # Find the smallest file
                    smallest_file = min(files, key=lambda x: len(x[1]))
                    sample.append(smallest_file)
                    break
        
        self.logger.info(f"Selected {len(sample)} files for code quality analysis")
        return sample
    
    def _truncate_sample(self, sample: List[Tuple[str, str]]) -> List[Tuple[str, str]]:
        """
        Truncate very large files in the sample.
        
        Args:
            sample: List of (file_path, file_content) tuples
            
        Returns:
            List of (file_path, file_content) tuples with truncated content
        """
        truncated_sample = []
        
        for path, content in sample:
            # Count lines
            lines = content.splitlines()
            line_count = len(lines)
            
            if line_count > self.MAX_LINES_PER_FILE:
                # Take the first 1/3, then some from the middle, then the last 1/3
                first_chunk = lines[:self.MAX_LINES_PER_FILE // 3]
                last_chunk = lines[-(self.MAX_LINES_PER_FILE // 3):]
                
                # Take some middle lines
                middle_start = (line_count // 2) - (self.MAX_LINES_PER_FILE // 6)
                middle_end = middle_start + (self.MAX_LINES_PER_FILE // 3)
                middle_chunk = lines[middle_start:middle_end]
                
                # Join with a comment indicating truncation
                truncated_content = (
                    "\n".join(first_chunk) +
                    f"\n\n// ... [Truncated {line_count - self.MAX_LINES_PER_FILE} lines] ...\n\n" +
                    "\n".join(middle_chunk) +
                    f"\n\n// ... [Truncated] ...\n\n" +
                    "\n".join(last_chunk)
                )
                
                truncated_sample.append((path, truncated_content))
                self.logger.info(f"Truncated {path} from {line_count} to {self.MAX_LINES_PER_FILE} lines")
            else:
                truncated_sample.append((path, content))
        
        return truncated_sample
    
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
            ext = os.path.splitext(path)[1].lower()
            # Add appropriate language for syntax highlighting in code blocks
            lang = ""
            if ext:
                # Remove the dot
                lang = ext[1:]
                
            file_sections.append(f"File: {path}\n\n```{lang}\n{content}\n```\n")
        
        files_content = "\n".join(file_sections)
        
        # Add information about what was sampled
        sampled_info = f"Analysis based on a representative sample of {len(sample)} files from the codebase.\n\n"
        
        # Replace placeholder in prompt template
        prompt = self.prompt_template.replace("{FILES_CONTENT}", sampled_info + files_content)
        
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
