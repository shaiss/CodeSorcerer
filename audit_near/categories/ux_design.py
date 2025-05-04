"""
UX Design category processor.

This module implements the processor for the UX Design category.
"""

import logging
import os
from typing import Dict, List, Tuple

from audit_near.ai_client import AiClient
from audit_near.categories.utils import load_prompt_template


class UXDesign:
    """
    Processor for the UX Design category.
    """
    
    def __init__(self, ai_client: AiClient, prompt_file: str, max_points: int, repo_path: str):
        """
        Initialize the UX Design processor.
        
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
        Process the UX Design category.
        
        Args:
            files: List of (file_path, file_content) tuples
            
        Returns:
            Tuple of (score, feedback)
        """
        self.logger.info("Processing UX Design category")
        
        # Extract frontend files
        frontend_files = self._extract_frontend_files(files)
        
        # Extract screenshots or UI descriptions if available
        ui_descriptions = self._extract_ui_descriptions(files)
        
        # Build the prompt
        prompt = self._build_prompt(frontend_files, ui_descriptions)
        
        # Get analysis from AI
        analysis = self.ai_client.analyze_ux_design(prompt)
        
        # Extract score and feedback
        score, feedback = self._extract_results(analysis)
        
        return score, feedback
    
    def _extract_frontend_files(self, files: List[Tuple[str, str]]) -> List[Tuple[str, str]]:
        """
        Extract frontend files.
        
        Args:
            files: List of (file_path, file_content) tuples
            
        Returns:
            List of (file_path, file_content) tuples for frontend files
        """
        # Frontend files typically include HTML, CSS, JS/TS in UI directories
        frontend_files = []
        frontend_dirs = ["src", "ui", "frontend", "client", "public", "components", "pages"]
        frontend_exts = [".html", ".css", ".scss", ".jsx", ".tsx", ".js", ".ts", ".vue", ".svelte"]
        
        for path, content in files:
            # Skip large files
            if len(content) > 50000:
                continue
                
            # Check if path contains a frontend directory
            if any(frontend_dir in path.split("/") for frontend_dir in frontend_dirs):
                if any(path.endswith(ext) for ext in frontend_exts):
                    frontend_files.append((path, content))
                    continue
            
            # Check for frontend file extensions regardless of directory
            if any(path.endswith(ext) for ext in frontend_exts):
                frontend_files.append((path, content))
        
        # Select a representative sample of frontend files
        # Prioritize UI components, pages, and stylesheets
        ui_components = [
            (path, content) for path, content in frontend_files
            if "component" in path.lower() or "/ui/" in path.lower()
        ]
        
        pages = [
            (path, content) for path, content in frontend_files
            if "page" in path.lower() or "view" in path.lower() or "screen" in path.lower()
        ]
        
        styles = [
            (path, content) for path, content in frontend_files
            if path.endswith((".css", ".scss"))
        ]
        
        other_frontend = [
            (path, content) for path, content in frontend_files
            if (path, content) not in ui_components and 
               (path, content) not in pages and 
               (path, content) not in styles
        ]
        
        # Create a balanced sample
        sample = (
            ui_components[:3] +  # Up to 3 UI components
            pages[:2] +          # Up to 2 pages
            styles[:1] +         # Up to 1 stylesheet
            other_frontend[:2]   # Up to 2 other frontend files
        )
        
        return sample
    
    def _extract_ui_descriptions(self, files: List[Tuple[str, str]]) -> List[str]:
        """
        Extract UI descriptions from documentation.
        
        Args:
            files: List of (file_path, file_content) tuples
            
        Returns:
            List of UI descriptions
        """
        ui_descriptions = []
        
        # Look for UI descriptions in documentation
        for path, content in files:
            if path.lower().endswith((".md", ".txt")):
                # Look for UI-related sections in markdown
                lines = content.splitlines()
                in_ui_section = False
                section_content = []
                
                for line in lines:
                    # Check for UI-related section headings
                    if line.strip().startswith("#") and any(
                        term in line.lower() 
                        for term in ["ui", "user interface", "ux", "user experience", "design", "frontend", "screen"]
                    ):
                        if section_content:
                            ui_descriptions.append("\n".join(section_content))
                            section_content = []
                        in_ui_section = True
                        section_content.append(line)
                    elif in_ui_section:
                        section_content.append(line)
                        # End section at next heading
                        if line.strip().startswith("#"):
                            in_ui_section = False
                            ui_descriptions.append("\n".join(section_content))
                            section_content = []
                
                # Add the last section if any
                if in_ui_section and section_content:
                    ui_descriptions.append("\n".join(section_content))
        
        return ui_descriptions
    
    def _build_prompt(self, frontend_files: List[Tuple[str, str]], ui_descriptions: List[str]) -> str:
        """
        Build the prompt for the AI.
        
        Args:
            frontend_files: List of (file_path, file_content) tuples for frontend files
            ui_descriptions: List of UI descriptions
            
        Returns:
            Prompt string
        """
        # Format frontend files
        frontend_files_content = []
        for path, content in frontend_files:
            frontend_files_content.append(f"File: {path}\n\n```\n{content}\n```\n")
        
        frontend_files_str = "\n".join(frontend_files_content)
        
        # Format UI descriptions
        ui_descriptions_str = "\n\n".join(ui_descriptions)
        
        # Replace placeholders in prompt template
        prompt = self.prompt_template
        prompt = prompt.replace("{FRONTEND_FILES}", frontend_files_str)
        prompt = prompt.replace("{UI_DESCRIPTIONS}", ui_descriptions_str or "No UI descriptions found in documentation.")
        
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
            return 0, "Error processing UX Design analysis."
