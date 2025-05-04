"""
Boilerplate and SDK detector for repository analysis.

This module provides functionality to detect and classify boilerplate code
and third-party libraries in a repository.
"""

import logging
import os
import re
from typing import Dict, List, Set, Tuple, Any


class BoilerplateDetector:
    """
    Detector for boilerplate code and third-party libraries.
    
    This class provides methods to detect and classify boilerplate code
    and third-party libraries in a repository.
    """
    
    def __init__(self):
        """Initialize the boilerplate detector."""
        self.logger = logging.getLogger(__name__)
        
        # Initialize known patterns
        self._init_patterns()
    
    def _init_patterns(self):
        """Initialize patterns for detecting boilerplate and libraries."""
        
        # NEAR SDK patterns
        self.near_sdk_patterns = {
            # JavaScript/TypeScript
            'near-api-js': {
                'file_patterns': [
                    r'node_modules/near-api-js/',
                    r'src/near-api-js/',
                    r'lib/near-api-js/',
                ],
                'import_patterns': [
                    r'import.*from [\'"]near-api-js[\'"]',
                    r'require\([\'"]near-api-js[\'"]\)',
                ],
                'content_patterns': [
                    r'class NearAPI',
                    r'class Near\b',
                    r'class Connection\b',
                    r'class Account\b',
                    r'class Contract\b',
                    r'class WalletConnection\b',
                ],
            },
            
            # Rust
            'near-sdk-rs': {
                'file_patterns': [
                    r'near-sdk/',
                    r'near-sdk-rs/',
                    r'near_sdk/',
                ],
                'import_patterns': [
                    r'use near_sdk::',
                    r'use near_sdk as',
                    r'extern crate near_sdk',
                ],
                'content_patterns': [
                    r'#\[near\(',
                    r'#\[derive\(BorshDeserialize, BorshSerialize\)\]',
                    r'#\[derive\(Near',
                    r'pub struct Contract \{',
                ],
            },
            
            # AssemblyScript
            'near-sdk-as': {
                'file_patterns': [
                    r'node_modules/near-sdk-as/',
                    r'src/near-sdk-as/',
                    r'lib/near-sdk-as/',
                ],
                'import_patterns': [
                    r'import \{.*\} from [\'"]near-sdk-as[\'"]',
                ],
                'content_patterns': [
                    r'@nearBindgen',
                    r'export class \w+ implements Contract',
                ],
            },
        }
        
        # Common framework patterns
        self.framework_patterns = {
            # React
            'react': {
                'file_patterns': [
                    r'node_modules/react/',
                    r'node_modules/react-dom/',
                ],
                'import_patterns': [
                    r'import React',
                    r'import \* as React',
                    r'import \{ useState, useEffect',
                    r'import ReactDOM',
                ],
                'content_patterns': [
                    r'class \w+ extends React\.Component',
                    r'const \w+ = \(\) => {',
                    r'function \w+\(\) {.*return \(',
                    r'<React.Fragment>',
                    r'<>.*<\/>',
                    r'useState\(',
                    r'useEffect\(',
                ],
            },
            
            # Vue
            'vue': {
                'file_patterns': [
                    r'node_modules/vue/',
                ],
                'import_patterns': [
                    r'import Vue',
                    r'import \* as Vue',
                    r'import \{ ref, computed',
                ],
                'content_patterns': [
                    r'new Vue\(\{',
                    r'export default \{',
                    r'<template>',
                    r'<script>',
                    r'components: \{',
                ],
            },
            
            # Angular
            'angular': {
                'file_patterns': [
                    r'node_modules/@angular/',
                ],
                'import_patterns': [
                    r'import \{ Component',
                    r'import \{ NgModule',
                ],
                'content_patterns': [
                    r'@Component\(\{',
                    r'@NgModule\(\{',
                    r'selector: [\'"]app-',
                    r'templateUrl: ',
                ],
            },
            
            # Express
            'express': {
                'file_patterns': [
                    r'node_modules/express/',
                ],
                'import_patterns': [
                    r'import express',
                    r'require\([\'"]express[\'"]\)',
                ],
                'content_patterns': [
                    r'const app = express\(\)',
                    r'app\.get\([\'"]',
                    r'app\.post\([\'"]',
                    r'app\.use\(',
                    r'app\.listen\(',
                ],
            },
            
            # Next.js
            'nextjs': {
                'file_patterns': [
                    r'node_modules/next/',
                    r'\.next/',
                ],
                'import_patterns': [
                    r'import \{.*\} from [\'"]next',
                    r'import next',
                ],
                'content_patterns': [
                    r'export default function',
                    r'getStaticProps',
                    r'getServerSideProps',
                    r'export async function getStaticPaths',
                ],
            },
        }
        
        # Common boilerplate patterns
        self.boilerplate_patterns = {
            # Create React App
            'create-react-app': {
                'files': {
                    'public/index.html',
                    'src/App.js',
                    'src/index.js',
                    'src/logo.svg',
                    'src/App.css',
                    'src/App.test.js',
                },
                'content_patterns': [
                    r'ReactDOM\.render\(',
                    r'<div className="App">',
                    r'Learn React',
                ],
            },
            
            # Next.js starter
            'nextjs-starter': {
                'files': {
                    'pages/index.js',
                    'pages/_app.js',
                    'styles/globals.css',
                    'public/vercel.svg',
                },
                'content_patterns': [
                    r'Welcome to <a href="https://nextjs.org">Next.js!</a>',
                    r'Get started by editing',
                    r'Powered by',
                ],
            },
            
            # Rust contract template
            'near-rust-template': {
                'files': {
                    'Cargo.toml',
                    'src/lib.rs',
                },
                'content_patterns': [
                    r'name = "hello-near"',
                    r'crate-type = \["cdylib"\]',
                    r'pub struct Contract \{',
                    r'impl Default for Contract \{',
                ],
            },
        }
    
    def detect(self, files: List[Tuple[str, str]]) -> Dict[str, Any]:
        """
        Detect boilerplate and third-party libraries.
        
        Args:
            files: List of (file_path, file_content) tuples
            
        Returns:
            Dictionary with detection results
        """
        results = {
            'near_sdk': self._detect_near_sdk(files),
            'frameworks': self._detect_frameworks(files),
            'boilerplate': self._detect_boilerplate(files),
            'third_party_summary': {},
        }
        
        # Build summary
        for sdk_name, sdk_info in results['near_sdk'].items():
            if sdk_info['detected']:
                if 'NEAR SDK' not in results['third_party_summary']:
                    results['third_party_summary']['NEAR SDK'] = []
                results['third_party_summary']['NEAR SDK'].append(sdk_name)
        
        for framework_name, framework_info in results['frameworks'].items():
            if framework_info['detected']:
                if 'Frameworks' not in results['third_party_summary']:
                    results['third_party_summary']['Frameworks'] = []
                results['third_party_summary']['Frameworks'].append(framework_name)
        
        for template_name, template_info in results['boilerplate'].items():
            if template_info['confidence'] > 0.5:
                if 'Boilerplate' not in results['third_party_summary']:
                    results['third_party_summary']['Boilerplate'] = []
                results['third_party_summary']['Boilerplate'].append(template_name)
        
        return results
    
    def _detect_near_sdk(self, files: List[Tuple[str, str]]) -> Dict[str, Dict[str, Any]]:
        """
        Detect NEAR SDK usage.
        
        Args:
            files: List of (file_path, file_content) tuples
            
        Returns:
            Dictionary mapping SDK names to detection results
        """
        results = {}
        
        for sdk_name, patterns in self.near_sdk_patterns.items():
            matches = []
            file_paths = []
            
            for file_path, content in files:
                # Check file path patterns
                path_match = any(re.search(pattern, file_path) for pattern in patterns.get('file_patterns', []))
                
                # Check import patterns
                import_match = any(re.search(pattern, content) for pattern in patterns.get('import_patterns', []))
                
                # Check content patterns
                content_match = any(re.search(pattern, content) for pattern in patterns.get('content_patterns', []))
                
                if path_match or import_match or content_match:
                    matches.append({
                        'file_path': file_path,
                        'path_match': path_match,
                        'import_match': import_match,
                        'content_match': content_match,
                    })
                    file_paths.append(file_path)
            
            results[sdk_name] = {
                'detected': len(matches) > 0,
                'match_count': len(matches),
                'files': file_paths,
                'matches': matches[:10],  # Limit to 10 matches for brevity
            }
        
        return results
    
    def _detect_frameworks(self, files: List[Tuple[str, str]]) -> Dict[str, Dict[str, Any]]:
        """
        Detect common framework usage.
        
        Args:
            files: List of (file_path, file_content) tuples
            
        Returns:
            Dictionary mapping framework names to detection results
        """
        results = {}
        
        for framework_name, patterns in self.framework_patterns.items():
            matches = []
            file_paths = []
            
            for file_path, content in files:
                # Check file path patterns
                path_match = any(re.search(pattern, file_path) for pattern in patterns.get('file_patterns', []))
                
                # Check import patterns
                import_match = any(re.search(pattern, content) for pattern in patterns.get('import_patterns', []))
                
                # Check content patterns
                content_match = any(re.search(pattern, content) for pattern in patterns.get('content_patterns', []))
                
                if path_match or import_match or content_match:
                    matches.append({
                        'file_path': file_path,
                        'path_match': path_match,
                        'import_match': import_match,
                        'content_match': content_match,
                    })
                    file_paths.append(file_path)
            
            results[framework_name] = {
                'detected': len(matches) > 0,
                'match_count': len(matches),
                'files': file_paths,
                'matches': matches[:10],  # Limit to 10 matches for brevity
            }
        
        return results
    
    def _detect_boilerplate(self, files: List[Tuple[str, str]]) -> Dict[str, Dict[str, Any]]:
        """
        Detect common boilerplate templates.
        
        Args:
            files: List of (file_path, file_content) tuples
            
        Returns:
            Dictionary mapping template names to detection results
        """
        # Build a lookup for files
        file_dict = {file_path: content for file_path, content in files}
        
        results = {}
        
        for template_name, template_info in self.boilerplate_patterns.items():
            file_matches = []
            content_matches = []
            
            # Check for presence of specific files
            for expected_file in template_info.get('files', []):
                for file_path in file_dict:
                    if file_path.endswith(expected_file):
                        file_matches.append(file_path)
                        break
            
            # Check for content patterns
            for pattern in template_info.get('content_patterns', []):
                for file_path, content in files:
                    if re.search(pattern, content):
                        content_matches.append({
                            'file_path': file_path,
                            'pattern': pattern,
                        })
            
            # Calculate confidence based on matches
            expected_file_count = len(template_info.get('files', []))
            expected_pattern_count = len(template_info.get('content_patterns', []))
            
            file_confidence = len(file_matches) / expected_file_count if expected_file_count > 0 else 0
            content_confidence = len(content_matches) / expected_pattern_count if expected_pattern_count > 0 else 0
            
            # Overall confidence is weighted average
            confidence = (file_confidence * 0.7) + (content_confidence * 0.3)
            
            results[template_name] = {
                'confidence': confidence,
                'file_matches': file_matches,
                'content_matches': content_matches[:10],  # Limit to 10 matches for brevity
            }
        
        return results
    
    def is_boilerplate_file(self, file_path: str, content: str) -> bool:
        """
        Check if a file is likely to be boilerplate.
        
        Args:
            file_path: Path to the file
            content: Content of the file
            
        Returns:
            True if the file is likely boilerplate, False otherwise
        """
        # Common boilerplate file patterns
        boilerplate_file_patterns = [
            # Create React App
            r'src/serviceWorker\.js',
            r'src/setupTests\.js',
            r'src/reportWebVitals\.js',
            # Configuration files
            r'tsconfig\.json',
            r'babel\.config\.js',
            r'jest\.config\.js',
            r'webpack\.config\.js',
            # Generated files
            r'\.eslintrc\.js',
            r'\.prettierrc',
            # Documentation templates
            r'CONTRIBUTING\.md',
            r'CODE_OF_CONDUCT\.md',
        ]
        
        # Check file path
        if any(re.search(pattern, file_path) for pattern in boilerplate_file_patterns):
            return True
        
        # Common boilerplate content patterns
        boilerplate_content_patterns = [
            # Create React App
            r'This code was generated by create-react-app',
            r'This file is auto-generated',
            r'// @generated',
            # Documentation templates
            r'# Code of Conduct',
            r'# Contributing',
            # License templates
            r'MIT License',
            r'Apache License',
            # Configuration files
            r'"compilerOptions":',
        ]
        
        # Check content
        if any(re.search(pattern, content) for pattern in boilerplate_content_patterns):
            return True
        
        return False
    
    def is_third_party_file(self, file_path: str) -> bool:
        """
        Check if a file is likely to be from a third-party library.
        
        Args:
            file_path: Path to the file
            
        Returns:
            True if the file is likely third-party, False otherwise
        """
        # Common third-party directory patterns
        third_party_dir_patterns = [
            r'node_modules/',
            r'vendor/',
            r'third[_-]party/',
            r'external/',
            r'lib/',
            r'libs/',
            r'packages/',
            r'dist/',
            r'build/',
        ]
        
        # Check file path
        return any(re.search(pattern, file_path) for pattern in third_party_dir_patterns)
    
    def get_file_classification(self, file_path: str, content: str) -> str:
        """
        Get the classification of a file.
        
        Args:
            file_path: Path to the file
            content: Content of the file
            
        Returns:
            Classification string: 'boilerplate', 'third-party', or 'custom'
        """
        if self.is_boilerplate_file(file_path, content):
            return 'boilerplate'
        elif self.is_third_party_file(file_path):
            return 'third-party'
        else:
            return 'custom'