"""
File categorization module for repository analysis.

This module provides functionality to categorize files in a repository
based on different assessment categories.
"""

import logging
import os
import re
from typing import Dict, List, Set, Tuple


class FileCategorizer:
    """
    Categorizer for repository files.
    
    This class provides methods to categorize files in a repository
    based on different assessment categories.
    """
    
    def __init__(self):
        """Initialize the file categorizer."""
        self.logger = logging.getLogger(__name__)
        
        # Define file patterns for different categories
        self._init_category_patterns()
    
    def _init_category_patterns(self):
        """Initialize patterns for different categories."""
        
        # NEAR Protocol Integration - Contract and blockchain interaction files
        self.near_integration_patterns = {
            'extensions': {'.js', '.ts', '.jsx', '.tsx', '.rs', '.py', '.wasm'},
            'path_patterns': [
                r'contract[s]?/',
                r'.*near.*',
                r'.*blockchain.*',
                r'.*wallet.*',
                r'.*token.*',
            ],
            'content_patterns': [
                # JavaScript/TypeScript NEAR patterns
                r'import.*near-api-js',
                r'import.*from [\'"]near-',
                r'new near\.',
                r'\.connect\(.*[\'"]near.*[\'"]\)',
                r'\.accountId',
                r'\.createTransaction',
                r'\.functionCall',
                r'\.viewFunction',
                # Rust NEAR patterns
                r'use near_sdk',
                r'#\[near\(',
                r'#\[derive\(.*Near',
                # Python NEAR patterns
                r'import near',
                r'from near',
            ],
            'filenames': {'near.config.js', 'near.config.ts'},
        }
        
        # Onchain Quality - Smart contract files and tests
        self.onchain_quality_patterns = {
            'extensions': {'.rs', '.js', '.ts', '.wasm'},
            'path_patterns': [
                r'contract[s]?/',
                r'.*near.*contract.*',
                r'.*blockchain.*',
            ],
            'content_patterns': [
                # Smart contract patterns
                r'#\[near\(',
                r'#\[payable\]',
                r'Contract',
                r'transfer',
                r'balance_of',
                r'assert!',
                r'require\(',
                r'state',
                # Transaction patterns
                r'\.signAndSendTransaction',
                r'\.functionCall',
                r'\.sendTokens',
                r'\.stake',
            ],
            'filenames': {'contract.rs', 'contract.ts', 'contract.js'},
        }
        
        # Offchain Quality - Frontend and backend files
        self.offchain_quality_patterns = {
            'extensions': {'.js', '.ts', '.jsx', '.tsx', '.py', '.html', '.css', '.vue', '.svelte'},
            'path_patterns': [
                r'src/',
                r'pages/',
                r'components/',
                r'api/',
                r'backend/',
                r'frontend/',
                r'ui/',
                r'views/',
                r'hooks/',
                r'utils/',
                r'services/',
            ],
            'content_patterns': [
                # Frontend frameworks
                r'import React',
                r'import Vue',
                r'import Angular',
                r'import.*svelte',
                r'import.*next',
                r'import.*nuxt',
                # Backend frameworks
                r'import express',
                r'import fastify',
                r'import nestjs',
                r'import flask',
                r'import django',
                r'import fastapi',
                # API patterns
                r'fetch\(',
                r'axios\.',
                r'\.get\(',
                r'\.post\(',
                r'api\.', 
                r'router\.',
                r'app\.use\(',
                r'app\.get\(',
                r'app\.post\(',
            ],
            'exclude_patterns': [
                r'contract[s]?/',
                r'node_modules/',
                r'.*\.test\.',
                r'.*\.spec\.',
            ],
        }
        
        # Code Quality & Documentation - All code + docs
        self.code_quality_documentation_patterns = {
            'extensions': {
                # Code files
                '.js', '.ts', '.jsx', '.tsx', '.py', '.rs', '.go', '.java', '.c', '.cpp', '.cs',
                '.html', '.css', '.scss', '.sass', '.less',
                # Documentation files
                '.md', '.rst', '.txt', '.adoc', '.wiki', '.ipynb',
            },
            'path_patterns': [
                r'src/',
                r'docs?/',
                r'wiki/',
                r'examples?/',
                r'tutorials?/',
            ],
            'filenames': {
                'README.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 
                'LICENSE', 'CODE_OF_CONDUCT.md', 'SECURITY.md',
                'api.md', 'architecture.md', 'design.md',
            },
        }
        
        # Technical Innovation - Core implementation files
        self.technical_innovation_patterns = {
            'extensions': {'.js', '.ts', '.jsx', '.tsx', '.py', '.rs', '.go', '.wasm'},
            'path_patterns': [
                r'src/core/',
                r'src/lib/',
                r'lib/',
                r'algorithm/',
                r'engine/',
                r'core/',
            ],
            'exclude_patterns': [
                r'.*\.test\.',
                r'.*\.spec\.',
                r'test/',
                r'tests/',
                r'__tests__/',
            ],
        }
    
    def categorize_files(self, files: List[Tuple[str, str]]) -> Dict[str, List[Tuple[str, str]]]:
        """
        Categorize files based on assessment categories.
        
        Args:
            files: List of (file_path, file_content) tuples
            
        Returns:
            Dictionary mapping category names to lists of (file_path, file_content) tuples
        """
        categories = {
            'near_protocol_integration': [],
            'onchain_quality': [],
            'offchain_quality': [],
            'code_quality_documentation': [],
            'technical_innovation': [],
            'team_activity_project_maturity': files,  # All files are relevant for this category
            'grant_impact_ecosystem_fit': [],  # Will be populated with README and design docs
        }
        
        # Process each file
        for file_path, content in files:
            file_name = os.path.basename(file_path)
            file_ext = os.path.splitext(file_path)[1].lower()
            
            # Check for NEAR Protocol Integration files
            if self._matches_category(file_path, file_name, file_ext, content, self.near_integration_patterns):
                categories['near_protocol_integration'].append((file_path, content))
                
            # Check for Onchain Quality files
            if self._matches_category(file_path, file_name, file_ext, content, self.onchain_quality_patterns):
                categories['onchain_quality'].append((file_path, content))
                
            # Check for Offchain Quality files
            if self._matches_category(file_path, file_name, file_ext, content, self.offchain_quality_patterns):
                # Check exclusion patterns
                if not any(re.search(pattern, file_path) for pattern in self.offchain_quality_patterns.get('exclude_patterns', [])):
                    categories['offchain_quality'].append((file_path, content))
                
            # Check for Code Quality & Documentation files
            if self._matches_category(file_path, file_name, file_ext, content, self.code_quality_documentation_patterns):
                categories['code_quality_documentation'].append((file_path, content))
                
            # Check for Technical Innovation files
            if self._matches_category(file_path, file_name, file_ext, content, self.technical_innovation_patterns):
                # Check exclusion patterns
                if not any(re.search(pattern, file_path) for pattern in self.technical_innovation_patterns.get('exclude_patterns', [])):
                    categories['technical_innovation'].append((file_path, content))
            
            # Special case for Grant Impact & Ecosystem Fit - Focus on README and design docs
            if (file_name.lower() in {'readme.md', 'design.md', 'architecture.md', 'overview.md', 'vision.md'} or
                    re.search(r'docs?/.*\.(md|rst|txt)$', file_path, re.IGNORECASE)):
                categories['grant_impact_ecosystem_fit'].append((file_path, content))
        
        # Log category statistics
        for category, category_files in categories.items():
            self.logger.info(f"Category '{category}' has {len(category_files)} relevant files")
        
        return categories
    
    def _matches_category(self, file_path: str, file_name: str, file_ext: str, 
                         content: str, patterns: Dict) -> bool:
        """
        Check if a file matches a category based on patterns.
        
        Args:
            file_path: Path to the file
            file_name: Name of the file
            file_ext: Extension of the file
            content: Content of the file
            patterns: Dictionary of patterns to match
            
        Returns:
            True if the file matches the category, False otherwise
        """
        # Check extension
        if 'extensions' in patterns and file_ext in patterns['extensions']:
            # Check path patterns
            if 'path_patterns' in patterns:
                for pattern in patterns['path_patterns']:
                    if re.search(pattern, file_path):
                        return True
            
            # Check content patterns
            if 'content_patterns' in patterns:
                for pattern in patterns['content_patterns']:
                    if re.search(pattern, content):
                        return True
        
        # Check specific filenames
        if 'filenames' in patterns and file_name in patterns['filenames']:
            return True
            
        return False