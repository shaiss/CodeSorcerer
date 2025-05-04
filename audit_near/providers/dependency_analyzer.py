"""
Dependency analyzer for repository files.

This module provides functionality to analyze dependencies between files
in a repository and calculate centrality metrics.
"""

import logging
import os
import re
from collections import defaultdict
from typing import Dict, List, Set, Tuple, Any


class DependencyAnalyzer:
    """
    Analyzer for file dependencies.
    
    This class provides methods to analyze dependencies between files
    in a repository and calculate centrality metrics.
    """
    
    def __init__(self):
        """Initialize the dependency analyzer."""
        self.logger = logging.getLogger(__name__)
        
        # Define patterns for import statements by language
        self.import_patterns = {
            # JavaScript/TypeScript
            '.js': [
                r'(?:import|export).*?from\s+[\'"](.+?)[\'"]',
                r'require\([\'"](.+?)[\'"]\)',
                r'import\s+[\'"](.+?)[\'"]\s*;?',
            ],
            '.jsx': [
                r'(?:import|export).*?from\s+[\'"](.+?)[\'"]',
                r'require\([\'"](.+?)[\'"]\)',
                r'import\s+[\'"](.+?)[\'"]\s*;?',
            ],
            '.ts': [
                r'(?:import|export).*?from\s+[\'"](.+?)[\'"]',
                r'require\([\'"](.+?)[\'"]\)',
                r'import\s+[\'"](.+?)[\'"]\s*;?',
            ],
            '.tsx': [
                r'(?:import|export).*?from\s+[\'"](.+?)[\'"]',
                r'require\([\'"](.+?)[\'"]\)',
                r'import\s+[\'"](.+?)[\'"]\s*;?',
            ],
            # Python
            '.py': [
                r'^\s*import\s+(\w+(?:\.\w+)*)',
                r'^\s*from\s+(\w+(?:\.\w+)*)\s+import',
            ],
            # Rust
            '.rs': [
                r'^\s*use\s+(\w+(?:::\w+)*)',
                r'^\s*extern\s+crate\s+(\w+)',
            ],
        }
        
        # Mapping of file extensions to languages
        self.extension_to_language = {
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.rs': 'rust',
        }
    
    def analyze_dependencies(self, files: List[Tuple[str, str]]) -> Dict[str, Any]:
        """
        Analyze dependencies between files.
        
        Args:
            files: List of (file_path, file_content) tuples
            
        Returns:
            Dictionary with dependency analysis results
        """
        # Create a graph representation of dependencies
        graph = self._build_dependency_graph(files)
        
        # Calculate centrality metrics
        centrality = self._calculate_centrality(graph)
        
        # Identify important files based on centrality
        important_files = self._identify_important_files(centrality)
        
        return {
            'graph': graph,
            'centrality': centrality,
            'important_files': important_files,
        }
    
    def _build_dependency_graph(self, files: List[Tuple[str, str]]) -> Dict[str, Set[str]]:
        """
        Build a graph of file dependencies.
        
        Args:
            files: List of (file_path, file_content) tuples
            
        Returns:
            Dictionary mapping file paths to sets of dependent file paths
        """
        graph = defaultdict(set)
        file_by_module = {}
        
        # Map files by their module/package name
        for file_path, _ in files:
            file_ext = os.path.splitext(file_path)[1].lower()
            module_name = self._extract_module_name(file_path, file_ext)
            file_by_module[module_name] = file_path
        
        # Analyze imports in each file
        for file_path, content in files:
            file_ext = os.path.splitext(file_path)[1].lower()
            
            # Skip files with unsupported extensions
            if file_ext not in self.import_patterns:
                continue
            
            # Extract imports
            imports = self._extract_imports(content, file_ext)
            
            # Add edges to the graph
            for imported_module in imports:
                # Resolve the imported module to an actual file
                imported_file = self._resolve_import(imported_module, file_path, file_by_module)
                
                if imported_file:
                    graph[file_path].add(imported_file)
        
        return graph
    
    def _extract_module_name(self, file_path: str, file_ext: str) -> str:
        """
        Extract the module name from a file path.
        
        Args:
            file_path: Path to the file
            file_ext: Extension of the file
            
        Returns:
            Module name
        """
        # Strip extension
        module_path = file_path[:-len(file_ext)] if file_ext else file_path
        
        # Convert path separators to module separators
        if file_ext in {'.py', '.pyw'}:
            # Python uses dots
            return module_path.replace('/', '.').replace('\\', '.')
        else:
            # JavaScript/TypeScript use path-like imports
            return module_path
    
    def _extract_imports(self, content: str, file_ext: str) -> Set[str]:
        """
        Extract import statements from file content.
        
        Args:
            content: Content of the file
            file_ext: Extension of the file
            
        Returns:
            Set of imported module names
        """
        imports = set()
        
        # Get patterns for this extension
        patterns = self.import_patterns.get(file_ext, [])
        
        for pattern in patterns:
            # Extract all matches
            matches = re.finditer(pattern, content, re.MULTILINE)
            
            for match in matches:
                imported = match.group(1).strip()
                
                # Skip built-in modules
                if self._is_builtin_module(imported, file_ext):
                    continue
                
                imports.add(imported)
        
        return imports
    
    def _is_builtin_module(self, module_name: str, file_ext: str) -> bool:
        """
        Check if a module is a built-in or standard library module.
        
        Args:
            module_name: Name of the module
            file_ext: Extension of the importing file
            
        Returns:
            True if the module is built-in, False otherwise
        """
        # Get language for this extension
        language = self.extension_to_language.get(file_ext)
        
        if language == 'python':
            # Common Python standard library modules
            builtin_modules = {
                'os', 'sys', 're', 'math', 'datetime', 'time', 'json', 
                'logging', 'unittest', 'collections', 'argparse', 'pathlib',
                'typing', 'io', 'random', 'functools', 'itertools', 'urllib',
                'http', 'threading', 'multiprocessing'
            }
            
            # Check if module name or first part is in built-in modules
            module_first_part = module_name.split('.')[0]
            return module_first_part in builtin_modules
            
        elif language in {'javascript', 'typescript'}:
            # Check for node.js built-in modules
            builtin_modules = {
                'fs', 'path', 'os', 'http', 'https', 'net', 'dns', 'crypto',
                'stream', 'util', 'events', 'child_process', 'url', 'querystring',
                'assert', 'buffer', 'cluster', 'console', 'constants', 'dgram',
                'domain', 'punycode', 'readline', 'repl', 'string_decoder',
                'timers', 'tls', 'tty', 'v8', 'vm', 'zlib'
            }
            
            return module_name in builtin_modules
            
        elif language == 'rust':
            # Common Rust standard library modules
            builtin_modules = {
                'std', 'core', 'alloc', 'test', 'proc_macro'
            }
            
            # Check if module name or first part is in built-in modules
            module_first_part = module_name.split('::')[0]
            return module_first_part in builtin_modules
            
        return False
    
    def _resolve_import(self, imported_module: str, importing_file: str, 
                       file_by_module: Dict[str, str]) -> str:
        """
        Resolve an imported module to an actual file.
        
        Args:
            imported_module: Name of the imported module
            importing_file: Path to the importing file
            file_by_module: Dictionary mapping module names to file paths
            
        Returns:
            Path to the imported file, or empty string if not found
        """
        # For JavaScript/TypeScript:
        # 1. Check if imported module is a direct match
        if imported_module in file_by_module:
            return file_by_module[imported_module]
        
        # 2. For relative imports, resolve based on importing file
        if imported_module.startswith('./') or imported_module.startswith('../'):
            # Get the directory of the importing file
            importing_dir = os.path.dirname(importing_file)
            
            # Resolve the relative path
            try:
                resolved_path = os.path.normpath(os.path.join(importing_dir, imported_module))
                
                # Check if the resolved path exists
                if resolved_path in file_by_module:
                    return file_by_module[resolved_path]
                
                # Check with common extensions
                for ext in ['.js', '.jsx', '.ts', '.tsx', '.py', '.rs']:
                    if resolved_path + ext in file_by_module:
                        return file_by_module[resolved_path + ext]
                
                # Check for index files
                for ext in ['.js', '.jsx', '.ts', '.tsx']:
                    index_path = os.path.join(resolved_path, 'index' + ext)
                    if index_path in file_by_module:
                        return file_by_module[index_path]
            except Exception as e:
                self.logger.debug(f"Error resolving relative import {imported_module}: {e}")
        
        # For Python:
        # Convert dot notation to path
        if '.' in imported_module and not imported_module.startswith('.'):
            # Convert dots to path separators
            path_form = imported_module.replace('.', '/')
            
            # Check with .py extension
            py_path = path_form + '.py'
            if py_path in file_by_module:
                return file_by_module[py_path]
            
            # Check for __init__.py in package directory
            init_path = path_form + '/__init__.py'
            if init_path in file_by_module:
                return file_by_module[init_path]
        
        # Could not resolve import
        return ""
    
    def _calculate_centrality(self, graph: Dict[str, Set[str]]) -> Dict[str, float]:
        """
        Calculate centrality metrics for files in the graph.
        
        Args:
            graph: Dictionary mapping file paths to sets of dependent file paths
            
        Returns:
            Dictionary mapping file paths to centrality scores
        """
        centrality = {}
        
        # Calculate degree centrality
        for node in graph:
            # Outgoing dependencies (files this node depends on)
            out_degree = len(graph[node])
            
            # Incoming dependencies (files that depend on this node)
            in_degree = sum(1 for deps in graph.values() if node in deps)
            
            # Weight in-degree higher as it indicates importance
            centrality[node] = in_degree * 2 + out_degree
        
        # Add nodes that are only targets (not sources) in the graph
        all_nodes = set(graph.keys())
        for deps in graph.values():
            all_nodes.update(deps)
        
        for node in all_nodes:
            if node not in centrality:
                # Calculate in-degree for nodes not in graph keys
                in_degree = sum(1 for deps in graph.values() if node in deps)
                centrality[node] = in_degree * 2
        
        return centrality
    
    def _identify_important_files(self, centrality: Dict[str, float]) -> List[str]:
        """
        Identify important files based on centrality.
        
        Args:
            centrality: Dictionary mapping file paths to centrality scores
            
        Returns:
            List of file paths sorted by importance
        """
        # Sort files by centrality score in descending order
        sorted_files = sorted(centrality.items(), key=lambda x: x[1], reverse=True)
        
        # Return the file paths
        return [file_path for file_path, _ in sorted_files]