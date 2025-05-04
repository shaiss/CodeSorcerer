"""
Utility functions for category processing.

This module provides utility functions used by multiple category processors.
"""

import logging
import os
from typing import Dict, List, Tuple


def load_prompt_template(prompt_file: str) -> str:
    """
    Load a prompt template from a file.
    
    Args:
        prompt_file: Path to the prompt template file
        
    Returns:
        Prompt template as a string
        
    Raises:
        FileNotFoundError: If the prompt file does not exist
    """
    try:
        with open(prompt_file, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        logging.error(f"Prompt file not found: {prompt_file}")
        raise
    except Exception as e:
        logging.error(f"Error loading prompt template: {e}")
        raise


def group_files_by_extension(files: List[Tuple[str, str]]) -> Dict[str, List[Tuple[str, str]]]:
    """
    Group files by extension.
    
    Args:
        files: List of (file_path, file_content) tuples
        
    Returns:
        Dictionary mapping extensions to lists of (file_path, file_content) tuples
    """
    extensions = {}
    
    for file_path, content in files:
        ext = os.path.splitext(file_path)[1].lower()
        if ext not in extensions:
            extensions[ext] = []
        extensions[ext].append((file_path, content))
    
    return extensions


def count_lines_of_code(files: List[Tuple[str, str]]) -> int:
    """
    Count the total number of lines of code.
    
    Args:
        files: List of (file_path, file_content) tuples
        
    Returns:
        Total number of lines of code
    """
    total_lines = 0
    
    for _, content in files:
        total_lines += len(content.splitlines())
    
    return total_lines
