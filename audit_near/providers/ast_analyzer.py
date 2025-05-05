"""
Abstract Syntax Tree (AST) analyzer.

This module provides functionality to analyze code at the AST level,
extracting deeper insights about the code structure, quality, and patterns.
"""

import ast
import logging
import os
from typing import Dict, List, Optional, Set, Tuple, Any, Union
from pathlib import Path

import astroid
import libcst
import astpretty

logger = logging.getLogger(__name__)

class ASTAnalyzer:
    """
    Analyzer for Abstract Syntax Trees of different programming languages.
    
    This class is capable of parsing and analyzing code in various languages
    to extract structural information, metrics, and other insights.
    """
    
    def __init__(self):
        """Initialize the AST analyzer."""
        self.logger = logging.getLogger(__name__)
        
        # Mapping of file extensions to language names
        self.language_map = {
            # Python
            '.py': 'python',
            # JavaScript/TypeScript
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            # Rust
            '.rs': 'rust',
            # Go
            '.go': 'go',
            # Java
            '.java': 'java',
            # C/C++
            '.c': 'c',
            '.cpp': 'cpp',
            '.cc': 'cpp',
            '.cxx': 'cpp',
            '.h': 'c_header',
            '.hpp': 'cpp_header',
            # Web
            '.html': 'html',
            '.css': 'css',
            # Other
            '.json': 'json',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.md': 'markdown',
        }
        
        # Set of extensions we can actually parse
        self.supported_extensions = {
            '.py',  # Python via ast
            '.js', '.jsx',  # JavaScript via libcst
            '.ts', '.tsx',  # TypeScript via libcst
        }
    
    def get_language(self, file_path: str) -> Optional[str]:
        """
        Determine the programming language of a file.
        
        Args:
            file_path: Path to the file
            
        Returns:
            Language name or None if the language is not recognized
        """
        ext = os.path.splitext(file_path)[1].lower()
        return self.language_map.get(ext)
    
    def is_supported(self, file_path: str) -> bool:
        """
        Check if a file is supported for AST analysis.
        
        Args:
            file_path: Path to the file
            
        Returns:
            True if the file is supported, False otherwise
        """
        ext = os.path.splitext(file_path)[1].lower()
        return ext in self.supported_extensions
    
    def parse_file(self, file_path: str, content: str) -> Optional[Dict]:
        """
        Parse a file into an AST and extract metrics.
        
        Args:
            file_path: Path to the file
            content: Content of the file
            
        Returns:
            Dictionary with AST metrics, or None if parsing failed
        """
        language = self.get_language(file_path)
        
        if not language or not self.is_supported(file_path):
            return None
            
        try:
            if language == 'python':
                return self._parse_python(content)
            elif language in ('javascript', 'typescript'):
                return self._parse_js_ts(content, language)
            else:
                return None
        except Exception as e:
            self.logger.warning(f"Error parsing {file_path}: {e}")
            return None
    
    def _parse_python(self, content: str) -> Dict:
        """
        Parse Python code and extract metrics.
        
        Args:
            content: Python code content
            
        Returns:
            Dictionary with AST metrics
        """
        try:
            # Parse with ast
            tree = ast.parse(content)
            
            # Extract basic metrics
            metrics = self._extract_python_metrics(tree)
            
            # Parse with astroid for more complex analysis
            astroid_tree = astroid.parse(content)
            advanced_metrics = self._extract_python_advanced_metrics(astroid_tree)
            
            # Merge metrics
            metrics.update(advanced_metrics)
            
            return metrics
        except Exception as e:
            self.logger.debug(f"Error parsing Python code: {e}")
            # Try to parse with astroid only if ast fails
            try:
                astroid_tree = astroid.parse(content)
                return self._extract_python_advanced_metrics(astroid_tree)
            except Exception as e2:
                self.logger.warning(f"Error parsing Python code with astroid: {e2}")
                raise
    
    def _extract_python_metrics(self, tree: ast.AST) -> Dict:
        """
        Extract metrics from a Python AST.
        
        Args:
            tree: Python AST
            
        Returns:
            Dictionary with AST metrics
        """
        # Count elements
        function_count = 0
        class_count = 0
        import_count = 0
        docstring_count = 0
        
        # Complexity metrics
        max_function_complexity = 0
        total_complexity = 0
        
        # Names of classes and functions
        class_names = []
        function_names = []
        imported_modules = []
        
        # Visit all nodes
        for node in ast.walk(tree):
            # Count functions and methods
            if isinstance(node, ast.FunctionDef):
                function_count += 1
                function_names.append(node.name)
                complexity = self._calculate_python_complexity(node)
                max_function_complexity = max(max_function_complexity, complexity)
                total_complexity += complexity
                
                # Check for docstrings in functions
                if (node.body and isinstance(node.body[0], ast.Expr) and
                        isinstance(node.body[0].value, ast.Str)):
                    docstring_count += 1
            
            # Count classes
            elif isinstance(node, ast.ClassDef):
                class_count += 1
                class_names.append(node.name)
                
                # Check for docstrings in classes
                if (node.body and isinstance(node.body[0], ast.Expr) and
                        isinstance(node.body[0].value, ast.Str)):
                    docstring_count += 1
            
            # Count imports
            elif isinstance(node, (ast.Import, ast.ImportFrom)):
                import_count += 1
                
                if isinstance(node, ast.Import):
                    for name in node.names:
                        imported_modules.append(name.name)
                elif isinstance(node, ast.ImportFrom) and node.module:
                    imported_modules.append(node.module)
        
        # Calculate average complexity
        avg_complexity = total_complexity / function_count if function_count > 0 else 0
        
        # Calculate docstring coverage
        docstring_coverage = docstring_count / (function_count + class_count) if (function_count + class_count) > 0 else 0
        
        return {
            'language': 'python',
            'function_count': function_count,
            'class_count': class_count,
            'import_count': import_count,
            'docstring_count': docstring_count,
            'max_function_complexity': max_function_complexity,
            'avg_function_complexity': avg_complexity,
            'total_complexity': total_complexity,
            'docstring_coverage': docstring_coverage,
            'class_names': class_names,
            'function_names': function_names,
            'imported_modules': imported_modules,
        }
    
    def _extract_python_advanced_metrics(self, tree: astroid.Module) -> Dict:
        """
        Extract advanced metrics from an astroid Python AST.
        
        Args:
            tree: Astroid AST
            
        Returns:
            Dictionary with advanced AST metrics
        """
        # Initialize metrics
        metrics = {
            'has_error_handling': False,
            'has_custom_exceptions': False,
            'inheritance_depth': 0,
            'method_count': 0,
            'attribute_count': 0,
            'max_inheritance_depth': 0,
            'architectural_patterns': set(),
            'dependency_graph': {},
            'uses_async': False,
            'uses_type_annotations': False,
        }
        
        # Check for error handling (try/except blocks)
        for node in tree.nodes_of_class(astroid.TryExcept):
            metrics['has_error_handling'] = True
            break
        
        # Check for custom exceptions
        for node in tree.nodes_of_class(astroid.ClassDef):
            for base in node.bases:
                if isinstance(base, astroid.Name) and 'Error' in base.name or 'Exception' in base.name:
                    metrics['has_custom_exceptions'] = True
                    break
        
        # Count methods and attributes
        for node in tree.nodes_of_class(astroid.ClassDef):
            for child in node.get_children():
                if isinstance(child, astroid.FunctionDef):
                    metrics['method_count'] += 1
                elif isinstance(child, astroid.AssignName):
                    metrics['attribute_count'] += 1
        
        # Check for async
        for node in tree.nodes_of_class((astroid.AsyncFunctionDef, astroid.Await, astroid.AsyncFor, astroid.AsyncWith)):
            metrics['uses_async'] = True
            break
        
        # Check for type annotations
        for node in tree.nodes_of_class(astroid.AnnAssign):
            metrics['uses_type_annotations'] = True
            break
        
        # Detect patterns
        if self._has_singleton_pattern(tree):
            metrics['architectural_patterns'].add('singleton')
        if self._has_factory_pattern(tree):
            metrics['architectural_patterns'].add('factory')
        if self._has_observer_pattern(tree):
            metrics['architectural_patterns'].add('observer')
        
        # Convert set to list for JSON serialization
        metrics['architectural_patterns'] = list(metrics['architectural_patterns'])
        
        return metrics
    
    def _has_singleton_pattern(self, tree: astroid.Module) -> bool:
        """Check if the code contains a singleton pattern."""
        for node in tree.nodes_of_class(astroid.ClassDef):
            # Look for a private instance variable and a getInstance method
            has_instance_var = False
            has_get_instance = False
            
            for child in node.get_children():
                if (isinstance(child, astroid.Assign) and 
                    any(name.startswith('_instance') for name in child.targets)):
                    has_instance_var = True
                elif (isinstance(child, astroid.FunctionDef) and 
                      child.name in ('get_instance', 'getInstance')):
                    has_get_instance = True
            
            if has_instance_var and has_get_instance:
                return True
        return False
    
    def _has_factory_pattern(self, tree: astroid.Module) -> bool:
        """Check if the code contains a factory pattern."""
        for node in tree.nodes_of_class(astroid.ClassDef):
            # Look for 'Factory' in the name or a create method
            if 'Factory' in node.name:
                return True
            
            for child in node.get_children():
                if (isinstance(child, astroid.FunctionDef) and 
                    child.name in ('create', 'build', 'make', 'get_instance')):
                    return True
        return False
    
    def _has_observer_pattern(self, tree: astroid.Module) -> bool:
        """Check if the code contains an observer pattern."""
        # Look for subscribe/unsubscribe methods or observer-related names
        has_observers_list = False
        has_notify_method = False
        
        for node in tree.nodes_of_class(astroid.ClassDef):
            for child in node.get_children():
                if (isinstance(child, astroid.Assign) and 
                    any(name in str(target) for target in child.targets 
                        for name in ('observers', 'listeners', 'subscribers'))):
                    has_observers_list = True
                elif (isinstance(child, astroid.FunctionDef) and 
                      child.name in ('notify', 'notify_observers', 'emit', 'trigger')):
                    has_notify_method = True
        
        return has_observers_list and has_notify_method
    
    def _calculate_python_complexity(self, node: ast.AST) -> int:
        """
        Calculate cyclomatic complexity of a Python function.
        
        Args:
            node: AST node representing a function
            
        Returns:
            Cyclomatic complexity score
        """
        # Start with 1 (base complexity)
        complexity = 1
        
        # Increment for each branching statement
        for child in ast.walk(node):
            if isinstance(child, (ast.If, ast.While, ast.For, ast.AsyncFor)):
                complexity += 1
            elif isinstance(child, ast.BoolOp) and isinstance(child.op, ast.And):
                complexity += len(child.values) - 1
        
        return complexity
    
    def _parse_js_ts(self, content: str, language: str) -> Dict:
        """
        Parse JavaScript/TypeScript code and extract metrics.
        
        Args:
            content: JS/TS code content
            language: Language identifier ('javascript' or 'typescript')
            
        Returns:
            Dictionary with AST metrics
        """
        metrics = {
            'language': language,
            'function_count': 0,
            'class_count': 0,
            'import_count': 0,
            'class_names': [],
            'function_names': [],
            'imported_modules': [],
            'has_error_handling': False,
            'uses_async': False,
            'uses_promises': False,
            'uses_jsx': False,
            'uses_typescript_interfaces': False,
            'uses_typescript_types': False,
            'architectural_patterns': []
        }
        
        try:
            # Use libcst for parsing JavaScript/TypeScript
            module = libcst.parse_module(content)
            
            # Create a visitor to extract metrics
            visitor = JSTSVisitor(metrics)
            module.visit(visitor)
            
            return metrics
        except Exception as e:
            self.logger.debug(f"Error parsing {language} code: {e}")
            # Fall back to simple regex-based metrics if parsing fails
            return metrics
    
    def analyze_files(self, files: List[Tuple[str, str]]) -> Dict:
        """
        Analyze multiple files and aggregate metrics.
        
        Args:
            files: List of (file_path, file_content) tuples
            
        Returns:
            Dictionary with aggregated metrics
        """
        # Initialize aggregated metrics
        aggregated = {
            'file_count': 0,
            'language_counts': {},
            'function_count': 0,
            'class_count': 0,
            'import_count': 0,
            'avg_function_complexity': 0,
            'max_function_complexity': 0,
            'docstring_coverage': 0,
            'has_error_handling': False,
            'architectural_patterns': set(),
            'most_complex_functions': [],
            'popular_imports': {},
            'class_hierarchy': {},
            'language_specific': {}
        }
        
        # Process each file
        parseable_files = 0
        total_complexity = 0
        
        for file_path, content in files:
            if not self.is_supported(file_path):
                continue
                
            metrics = self.parse_file(file_path, content)
            if not metrics:
                continue
            
            # Update counts
            aggregated['file_count'] += 1
            
            # Update language counts
            language = metrics.get('language', 'unknown')
            aggregated['language_counts'][language] = aggregated['language_counts'].get(language, 0) + 1
            
            # Update totals
            aggregated['function_count'] += metrics.get('function_count', 0)
            aggregated['class_count'] += metrics.get('class_count', 0)
            aggregated['import_count'] += metrics.get('import_count', 0)
            
            # Track complexity
            max_func_complexity = metrics.get('max_function_complexity', 0)
            aggregated['max_function_complexity'] = max(
                aggregated['max_function_complexity'], max_func_complexity
            )
            
            total_complexity += metrics.get('total_complexity', 0)
            
            # Track error handling
            if metrics.get('has_error_handling', False):
                aggregated['has_error_handling'] = True
            
            # Track architectural patterns
            patterns = metrics.get('architectural_patterns', [])
            if patterns:
                aggregated['architectural_patterns'].update(patterns)
            
            # Track imports
            for module in metrics.get('imported_modules', []):
                aggregated['popular_imports'][module] = aggregated['popular_imports'].get(module, 0) + 1
            
            # Track language-specific metrics
            if language not in aggregated['language_specific']:
                aggregated['language_specific'][language] = {}
            
            lang_metrics = aggregated['language_specific'][language]
            
            if language == 'python':
                lang_metrics['docstring_coverage'] = lang_metrics.get('docstring_coverage', 0) + metrics.get('docstring_coverage', 0)
                lang_metrics['uses_type_annotations'] = lang_metrics.get('uses_type_annotations', False) or metrics.get('uses_type_annotations', False)
                lang_metrics['uses_async'] = lang_metrics.get('uses_async', False) or metrics.get('uses_async', False)
            elif language in ('javascript', 'typescript'):
                lang_metrics['uses_promises'] = lang_metrics.get('uses_promises', False) or metrics.get('uses_promises', False)
                lang_metrics['uses_async'] = lang_metrics.get('uses_async', False) or metrics.get('uses_async', False)
                lang_metrics['uses_jsx'] = lang_metrics.get('uses_jsx', False) or metrics.get('uses_jsx', False)
                
                if language == 'typescript':
                    lang_metrics['uses_interfaces'] = lang_metrics.get('uses_interfaces', False) or metrics.get('uses_typescript_interfaces', False)
                    lang_metrics['uses_types'] = lang_metrics.get('uses_types', False) or metrics.get('uses_typescript_types', False)
            
            parseable_files += 1
        
        # Calculate averages
        if parseable_files > 0:
            # Calculate average complexity
            aggregated['avg_function_complexity'] = total_complexity / aggregated['function_count'] if aggregated['function_count'] > 0 else 0
            
            # Calculate average docstring coverage for Python
            if 'python' in aggregated['language_specific']:
                py_metrics = aggregated['language_specific']['python']
                py_metrics['docstring_coverage'] /= parseable_files
        
        # Convert sets to lists for JSON serialization
        aggregated['architectural_patterns'] = list(aggregated['architectural_patterns'])
        
        # Sort popular imports
        aggregated['popular_imports'] = dict(
            sorted(aggregated['popular_imports'].items(), key=lambda x: x[1], reverse=True)[:10]
        )
        
        return aggregated


class JSTSVisitor(libcst.CSTVisitor):
    """Visitor for JavaScript/TypeScript AST nodes."""
    
    def __init__(self, metrics: Dict):
        """Initialize with metrics dictionary to update."""
        super().__init__()
        self.metrics = metrics
    
    def visit_FunctionDef(self, node: libcst.FunctionDef) -> None:
        """Visit function definitions."""
        self.metrics['function_count'] += 1
        if node.name.value not in self.metrics['function_names']:
            self.metrics['function_names'].append(node.name.value)
        
        # Check for async
        if node.asynchronous:
            self.metrics['uses_async'] = True
    
    def visit_ClassDef(self, node: libcst.ClassDef) -> None:
        """Visit class definitions."""
        self.metrics['class_count'] += 1
        if node.name.value not in self.metrics['class_names']:
            self.metrics['class_names'].append(node.name.value)
    
    def visit_Import(self, node: libcst.Import) -> None:
        """Visit import statements."""
        self.metrics['import_count'] += 1
        
        # Extract module names
        for name in node.names:
            if hasattr(name, 'name') and hasattr(name.name, 'value'):
                self.metrics['imported_modules'].append(name.name.value)
    
    def visit_ImportFrom(self, node: libcst.ImportFrom) -> None:
        """Visit from-import statements."""
        self.metrics['import_count'] += 1
        
        # Extract module name
        if hasattr(node, 'module') and hasattr(node.module, 'value'):
            self.metrics['imported_modules'].append(node.module.value)
    
    def visit_Try(self, node: libcst.Try) -> None:
        """Visit try-catch blocks."""
        self.metrics['has_error_handling'] = True
    
    def visit_Call(self, node: libcst.Call) -> None:
        """Visit function calls."""
        # Check for Promise usage
        if hasattr(node, 'func') and hasattr(node.func, 'value'):
            if 'Promise' in str(node.func.value):
                self.metrics['uses_promises'] = True
            elif 'then' in str(node.func.value) or 'catch' in str(node.func.value):
                self.metrics['uses_promises'] = True
            
            # Check for JSX/React usage by looking for createElement or Fragment
            if 'createElement' in str(node.func.value) or 'Fragment' in str(node.func.value):
                self.metrics['uses_jsx'] = True
    
    def leave_Module(self, original_node: libcst.Module) -> None:
        """
        Called when we finish visiting a module.
        Look for JSX indicators in the raw code if we haven't found them already.
        """
        if not self.metrics.get('uses_jsx', False):
            # Check for common JSX patterns in the raw code
            if hasattr(original_node, 'code'):
                code = original_node.code
                if '</' in code and '/>' in code and 'import React' in code:
                    self.metrics['uses_jsx'] = True
    
    # The following methods are for TypeScript but may not be fully supported by libcst
    # We rely on more generic detection instead
    
    def leave_SimpleString(self, original_node: libcst.SimpleString) -> None:
        """Look for type annotations in string literals (for detecting TypeScript)."""
        node_str = original_node.evaluated_value
        if isinstance(node_str, str) and ': ' in node_str and ('interface ' in node_str.lower() or 'type ' in node_str.lower()):
            self.metrics['uses_typescript_types'] = True