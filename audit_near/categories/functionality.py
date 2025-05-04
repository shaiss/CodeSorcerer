"""
Functionality category processor.

This module implements the processor for the functionality category.
"""

import logging
import os
from typing import Dict, List, Tuple

from audit_near.ai_client import AiClient
from audit_near.categories.utils import load_prompt_template


class Functionality:
    """
    Processor for the functionality category.
    """
    
    def __init__(self, ai_client: AiClient, prompt_file: str, max_points: int, repo_path: str):
        """
        Initialize the functionality processor.
        
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
        Process the functionality category.
        
        Args:
            files: List of (file_path, file_content) tuples
            
        Returns:
            Tuple of (score, feedback)
        """
        self.logger.info("Processing functionality category")
        
        # Identify project structure
        project_info = self._identify_project_structure(files)
        
        # Identify main entry points and APIs
        entry_points = self._identify_entry_points(files)
        
        # Build the prompt
        prompt = self._build_prompt(files, project_info, entry_points)
        
        # Get analysis from AI
        analysis = self.ai_client.analyze_functionality(prompt)
        
        # Extract score and feedback
        score, feedback = self._extract_results(analysis)
        
        return score, feedback
    
    def _identify_project_structure(self, files: List[Tuple[str, str]]) -> Dict:
        """
        Identify the project structure.
        
        Args:
            files: List of (file_path, file_content) tuples
            
        Returns:
            Dictionary containing project structure information
        """
        # Initialize project info
        project_info = {
            "type": "unknown",
            "language": "unknown",
            "frameworks": [],
            "has_tests": False,
            "has_readme": False,
            "file_count": len(files),
        }
        
        # Check for package.json (Node.js project)
        package_json = next((content for path, content in files if path.endswith("package.json")), None)
        if package_json:
            project_info["type"] = "node"
            project_info["language"] = "javascript/typescript"
            
            # Try to extract dependencies
            try:
                import json
                pkg_data = json.loads(package_json)
                
                # Extract dependencies
                all_deps = {}
                for dep_type in ["dependencies", "devDependencies"]:
                    if dep_type in pkg_data:
                        all_deps.update(pkg_data[dep_type])
                
                # Identify common frameworks
                if "react" in all_deps:
                    project_info["frameworks"].append("react")
                if "next" in all_deps:
                    project_info["frameworks"].append("next.js")
                if "near-api-js" in all_deps or "@near-js/api" in all_deps:
                    project_info["frameworks"].append("near-api-js")
            except Exception as e:
                self.logger.warning(f"Error parsing package.json: {e}")
        
        # Check for Cargo.toml (Rust project)
        cargo_toml = next((content for path, content in files if path.endswith("Cargo.toml")), None)
        if cargo_toml:
            project_info["type"] = "rust"
            project_info["language"] = "rust"
            
            # Check for near SDK
            if "near-sdk" in cargo_toml:
                project_info["frameworks"].append("near-sdk-rs")
        
        # Check for Python projects
        requirements_txt = next((content for path, content in files if path.endswith("requirements.txt")), None)
        if requirements_txt:
            project_info["type"] = "python"
            project_info["language"] = "python"
        
        # Check for tests
        project_info["has_tests"] = any(
            "test" in path.lower() or "spec" in path.lower() for path, _ in files
        )
        
        # Check for README
        project_info["has_readme"] = any(
            path.lower() == "readme.md" for path, _ in files
        )
        
        return project_info
    
    def _identify_entry_points(self, files: List[Tuple[str, str]]) -> List[str]:
        """
        Identify main entry points and APIs.
        
        Args:
            files: List of (file_path, file_content) tuples
            
        Returns:
            List of entry point file paths
        """
        entry_points = []
        
        # Common entry point patterns
        entry_point_patterns = [
            "index.js", "main.js", "app.js", "server.js",
            "index.ts", "main.ts", "app.ts", "server.ts",
            "main.py", "app.py", "main.rs", "lib.rs",
        ]
        
        # Check for common entry points
        for pattern in entry_point_patterns:
            matches = [path for path, _ in files if path.endswith(pattern)]
            entry_points.extend(matches)
        
        # Look for contract files
        contract_files = [
            path for path, _ in files
            if "contract" in path.lower() and path.endswith((".rs", ".ts", ".js"))
        ]
        entry_points.extend(contract_files)
        
        # Look for API routes
        api_routes = [
            path for path, _ in files
            if "api" in path.lower() and path.endswith((".js", ".ts", ".py"))
        ]
        entry_points.extend(api_routes)
        
        return list(set(entry_points))  # Remove duplicates
    
    def _build_prompt(
        self, 
        files: List[Tuple[str, str]], 
        project_info: Dict, 
        entry_points: List[str]
    ) -> str:
        """
        Build the prompt for the AI.
        
        Args:
            files: List of (file_path, file_content) tuples
            project_info: Dictionary containing project structure information
            entry_points: List of entry point file paths
            
        Returns:
            Prompt string
        """
        # Include project info
        project_info_str = "\n".join([
            f"Project Type: {project_info['type']}",
            f"Language: {project_info['language']}",
            f"Frameworks: {', '.join(project_info['frameworks']) if project_info['frameworks'] else 'None detected'}",
            f"Has Tests: {'Yes' if project_info['has_tests'] else 'No'}",
            f"Has README: {'Yes' if project_info['has_readme'] else 'No'}",
            f"File Count: {project_info['file_count']}",
        ])
        
        # Include entry points
        entry_points_content = []
        for entry_path in entry_points[:5]:  # Limit to first 5 entry points to avoid token limits
            entry_content = next((content for path, content in files if path == entry_path), "")
            entry_points_content.append(f"File: {entry_path}\n\n```\n{entry_content}\n```\n")
        
        entry_points_str = "\n".join(entry_points_content)
        
        # Replace placeholders in prompt template
        prompt = self.prompt_template
        prompt = prompt.replace("{PROJECT_INFO}", project_info_str)
        prompt = prompt.replace("{ENTRY_POINTS}", entry_points_str)
        
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
            return 0, "Error processing functionality analysis."
