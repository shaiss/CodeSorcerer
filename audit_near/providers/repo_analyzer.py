"""
Repository analyzer for comprehensive codebase assessment.

This module provides a comprehensive analyzer that combines multiple
analysis techniques to provide a holistic view of a repository.
"""

import logging
import os
from typing import Dict, List, Set, Tuple, Any, Optional, Union

from audit_near.providers.repo_provider import RepoProvider
from audit_near.providers.file_categorizer import FileCategorizer
from audit_near.providers.dependency_analyzer import DependencyAnalyzer
from audit_near.providers.git_analyzer import GitAnalyzer
from audit_near.providers.boilerplate_detector import BoilerplateDetector
from audit_near.providers.ast_analyzer import ASTAnalyzer


class RepoAnalyzer:
    """
    Comprehensive repository analyzer.
    
    This class combines multiple analysis techniques to provide
    a holistic view of a repository.
    """
    
    def __init__(self, repo_path: str, branch: str = "main"):
        """
        Initialize the repository analyzer.
        
        Args:
            repo_path: Path to the repository
            branch: Branch name (default: main)
        """
        self.repo_path = os.path.abspath(repo_path)
        self.branch = branch
        self.logger = logging.getLogger(__name__)
        
        # Initialize components
        self.repo_provider = RepoProvider(repo_path=self.repo_path, branch=self.branch)
        self.file_categorizer = FileCategorizer()
        self.dependency_analyzer = DependencyAnalyzer()
        self.git_analyzer = GitAnalyzer(repo_path=self.repo_path)
        self.boilerplate_detector = BoilerplateDetector()
        self.ast_analyzer = ASTAnalyzer()
        
        self.logger.info(f"Initialized repository analyzer for {self.repo_path}")
    
    def analyze(self) -> Dict[str, Any]:
        """
        Perform comprehensive repository analysis.
        
        Returns:
            Dictionary with analysis results
        """
        self.logger.info("Starting repository analysis")
        
        # Collect all files
        files = list(self.repo_provider.get_files())
        self.logger.info(f"Collected {len(files)} files from repository")
        
        # Skip empty repositories
        if not files:
            return {
                'error': 'Repository is empty',
                'file_count': 0,
            }
        
        # Analyze git metadata
        git_analysis = self.git_analyzer.analyze()
        self.logger.info("Completed Git metadata analysis")
        
        # Detect boilerplate and third-party libraries
        boilerplate_analysis = self.boilerplate_detector.detect(files)
        self.logger.info("Completed boilerplate and third-party detection")
        
        # Classify files by category
        categorized_files = self.file_categorizer.categorize_files(files)
        self.logger.info("Completed file categorization")
        
        # Analyze dependencies
        dependency_analysis = self.dependency_analyzer.analyze_dependencies(files)
        self.logger.info("Completed dependency analysis")
        
        # Perform AST analysis on supported files
        ast_analysis = self.ast_analyzer.analyze_files(files)
        self.logger.info("Completed AST analysis")
        
        # Combine results
        results = {
            'file_count': len(files),
            'git_analysis': git_analysis,
            'boilerplate_analysis': boilerplate_analysis,
            'ast_analysis': ast_analysis,
            'categorized_files': {
                category: [file_path for file_path, _ in category_files]
                for category, category_files in categorized_files.items()
            },
            'dependency_analysis': {
                'important_files': dependency_analysis['important_files'][:20],  # Top 20 most important files
            },
        }
        
        # Create file summaries for each category
        results['file_summaries'] = {}
        for category, category_files in categorized_files.items():
            # Skip empty categories
            if not category_files:
                continue
                
            # Create summary for this category
            results['file_summaries'][category] = self._create_file_summary(
                category_files, 
                dependency_analysis, 
                boilerplate_analysis,
                ast_analysis
            )
        
        # Create overall repository summary
        results['summary'] = self._create_repo_summary(
            files, 
            git_analysis, 
            boilerplate_analysis, 
            categorized_files, 
            dependency_analysis,
            ast_analysis
        )
        
        self.logger.info("Repository analysis completed")
        return results
    
    def _create_file_summary(self, 
                            category_files: List[Tuple[str, str]], 
                            dependency_analysis: Dict[str, Any],
                            boilerplate_analysis: Dict[str, Any],
                            ast_analysis: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Create a summary of files for a category.
        
        Args:
            category_files: List of (file_path, file_content) tuples for the category
            dependency_analysis: Dependency analysis results
            boilerplate_analysis: Boilerplate analysis results
            ast_analysis: AST analysis results (default: None)
            
        Returns:
            Dictionary with file summary
        """
        # Get a list of file paths
        file_paths = [file_path for file_path, _ in category_files]
        
        # Get centrality metrics for these files
        centrality = dependency_analysis.get('centrality', {})
        category_centrality = {path: centrality.get(path, 0) for path in file_paths}
        
        # Sort files by centrality
        sorted_files = sorted(category_centrality.items(), key=lambda x: x[1], reverse=True)
        
        # Classify files
        file_classifications = {}
        for file_path, content in category_files:
            file_classifications[file_path] = self.boilerplate_detector.get_file_classification(file_path, content)
        
        # Count classifications
        classification_counts = {
            'boilerplate': sum(1 for c in file_classifications.values() if c == 'boilerplate'),
            'third-party': sum(1 for c in file_classifications.values() if c == 'third-party'),
            'custom': sum(1 for c in file_classifications.values() if c == 'custom'),
        }
        
        # Get key technologies used
        technologies = []
        for sdk_name, sdk_info in boilerplate_analysis.get('near_sdk', {}).items():
            if sdk_info.get('detected', False):
                technologies.append(f"NEAR SDK: {sdk_name}")
        
        for framework_name, framework_info in boilerplate_analysis.get('frameworks', {}).items():
            if framework_info.get('detected', False):
                technologies.append(f"Framework: {framework_name}")
        
        # Create the summary
        summary = {
            'file_count': len(category_files),
            'important_files': [path for path, _ in sorted_files[:10]],  # Top 10 most important files
            'classifications': classification_counts,
            'custom_percentage': classification_counts['custom'] / len(category_files) if category_files else 0,
            'technologies': technologies,
        }
        
        # Add AST analysis data for this category if available
        if ast_analysis:
            # Filter AST data just for this category's files
            category_ast_data = {}
            
            # Collect function and class names for all files in this category
            category_functions = []
            category_classes = []
            category_patterns = set()
            category_complexity = 0
            category_function_count = 0
            complexity_samples = 0
            
            for file_path, _ in category_files:
                # Use file paths to filter relevant data
                for language, lang_data in ast_analysis.get('language_specific', {}).items():
                    # For language-specific stats
                    if language not in category_ast_data:
                        category_ast_data[language] = {
                            'function_count': 0,
                            'class_count': 0,
                            'has_error_handling': False
                        }
                    
                    category_ast_data[language]['has_error_handling'] |= ast_analysis.get('has_error_handling', False)
                
                # Collect function and class names that were found
                category_functions.extend(ast_analysis.get('function_names', []))
                category_classes.extend(ast_analysis.get('class_names', []))
                
                # Collect architectural patterns
                category_patterns.update(ast_analysis.get('architectural_patterns', []))
                
                # Sum up complexity
                if 'function_count' in ast_analysis and ast_analysis['function_count'] > 0:
                    category_function_count += ast_analysis.get('function_count', 0)
                    category_complexity += ast_analysis.get('total_complexity', 0)
                    complexity_samples += 1
            
            # Add the category-specific metrics
            if category_function_count > 0:
                summary['code_metrics'] = {
                    'function_count': category_function_count,
                    'class_count': len(category_classes),
                    'avg_complexity': category_complexity / category_function_count if category_function_count > 0 else 0,
                    'architectural_patterns': list(category_patterns),
                    'language_breakdown': category_ast_data
                }
        
        return summary
    
    def _create_repo_summary(self, 
                           files: List[Tuple[str, str]],
                           git_analysis: Dict[str, Any],
                           boilerplate_analysis: Dict[str, Any],
                           categorized_files: Dict[str, List[Tuple[str, str]]],
                           dependency_analysis: Dict[str, Any],
                           ast_analysis: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Create an overall summary of the repository.
        
        Args:
            files: List of all (file_path, file_content) tuples
            git_analysis: Git analysis results
            boilerplate_analysis: Boilerplate analysis results
            categorized_files: Categorized files
            dependency_analysis: Dependency analysis results
            ast_analysis: AST analysis results (default: None)
            
        Returns:
            Dictionary with repository summary
        """
        # Summary of file types
        file_types = {}
        for file_path, _ in files:
            ext = os.path.splitext(file_path)[1].lower()
            if ext not in file_types:
                file_types[ext] = 0
            file_types[ext] += 1
        
        # Summary of directories
        directories = {}
        for file_path, _ in files:
            dir_path = os.path.dirname(file_path)
            if dir_path not in directories:
                directories[dir_path] = 0
            directories[dir_path] += 1
        
        # Top directories by file count
        top_directories = sorted(directories.items(), key=lambda x: x[1], reverse=True)[:10]
        
        # Calculate custom code percentage
        custom_code_count = 0
        for file_path, content in files:
            if self.boilerplate_detector.get_file_classification(file_path, content) == 'custom':
                custom_code_count += 1
        
        custom_code_percentage = custom_code_count / len(files) if files else 0
        
        # Create summary
        summary = {
            'file_count': len(files),
            'top_file_types': sorted(file_types.items(), key=lambda x: x[1], reverse=True)[:10],
            'top_directories': top_directories,
            'custom_code_percentage': custom_code_percentage,
            'third_party_technologies': boilerplate_analysis.get('third_party_summary', {}),
        }
        
        # Add AST analysis metrics if available
        if ast_analysis:
            summary['code_metrics'] = {
                'function_count': ast_analysis.get('function_count', 0),
                'class_count': ast_analysis.get('class_count', 0),
                'avg_function_complexity': ast_analysis.get('avg_function_complexity', 0),
                'max_function_complexity': ast_analysis.get('max_function_complexity', 0),
                'architectural_patterns': ast_analysis.get('architectural_patterns', []),
                'has_error_handling': ast_analysis.get('has_error_handling', False),
            }
            
            # Add language-specific metrics
            language_specific = ast_analysis.get('language_specific', {})
            if language_specific:
                summary['language_metrics'] = language_specific
        
        # Add git metrics if available
        git_summary = git_analysis.get('summary', {})
        if git_summary:
            summary.update({
                'commit_count': git_summary.get('commit_count', 0),
                'contributor_count': git_summary.get('contributor_count', 0),
                'project_age_days': git_summary.get('project_age_days', 0),
                'recent_commit_count': git_summary.get('recent_commit_count', 0),
            })
        
        # Add category statistics
        category_stats = {}
        for category, category_files in categorized_files.items():
            category_stats[category] = len(category_files)
        
        summary['category_stats'] = category_stats
        
        return summary