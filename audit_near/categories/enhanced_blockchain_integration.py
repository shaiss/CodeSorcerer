"""
Enhanced blockchain integration category processor.

This module implements an enhanced processor for the blockchain integration category
that utilizes the repository analyzer for improved file selection and context.
"""

import logging
import os
from typing import Dict, List, Tuple, Any

from audit_near.ai_client import AiClient
from audit_near.categories.base_category import BaseCategory


class EnhancedBlockchainIntegration(BaseCategory):
    """
    Enhanced processor for the blockchain integration category.
    """
    
    def __init__(self, ai_client: AiClient, prompt_file: str, max_points: int, repo_path: str, branch: str = "main"):
        """
        Initialize the enhanced blockchain integration processor.
        
        Args:
            ai_client: AI client instance
            prompt_file: Path to the prompt template file
            max_points: Maximum number of points for this category
            repo_path: Path to the repository
            branch: Repository branch (default: main)
        """
        super().__init__(
            ai_client=ai_client,
            prompt_file=prompt_file,
            max_points=max_points,
            repo_path=repo_path,
            category_name="NEAR Protocol Integration",
            branch=branch
        )
        self.logger = logging.getLogger(__name__)
    
    def _select_files(self, files: List[Tuple[str, str]], repo_analysis: Dict[str, Any]) -> List[Tuple[str, str]]:
        """
        Select files for analysis.
        
        Args:
            files: List of (file_path, file_content) tuples
            repo_analysis: Repository analysis results
            
        Returns:
            List of (file_path, file_content) tuples for analysis
        """
        self.logger.info("Selecting files for blockchain integration analysis using enhanced selection")
        
        # Blockchain-related directories and file patterns
        blockchain_dirs = ["contract", "contracts", "blockchain", "near", "chain"]
        blockchain_patterns = [
            "near", "contract", "wallet", "transaction", "blockchain", 
            "token", "nft", "fungible", "account", "deploy", "gas"
        ]
        
        # Get blockchain-related files from the categorizer if available
        blockchain_files = repo_analysis.get('categorized_files', {}).get('blockchain', [])
        
        # If no blockchain files were identified by the categorizer, use fallback approach
        if not blockchain_files:
            blockchain_files = []
            for path, content in files:
                # Skip large files
                if len(content) > 50000:
                    continue
                    
                # Check if path contains a blockchain directory
                if any(blockchain_dir in path.split("/") for blockchain_dir in blockchain_dirs):
                    blockchain_files.append(path)
                    continue
                
                # Check for blockchain patterns in path
                if any(pattern in path.lower() for pattern in blockchain_patterns):
                    blockchain_files.append(path)
                    continue
                
                # Check for blockchain patterns in content
                content_lower = content.lower()
                if any(
                    pattern in content_lower
                    for pattern in [
                        "near.call", "near.view", "near-api-js", "near-sdk", 
                        "@near-js", "contract.call", "contract.view", 
                        "window.near", "connect.wallet", "wallet.signTransaction"
                    ]
                ):
                    blockchain_files.append(path)
        
        # Prioritize contract files and files with NEAR in the name
        priority_files = [
            path for path in blockchain_files
            if "contract" in path.lower() or "near" in path.lower()
        ]
        
        other_files = [
            path for path in blockchain_files
            if path not in priority_files
        ]
        
        # Combine and limit
        selected_paths = priority_files[:5] + other_files[:3]
        
        # Map back to (path, content) tuples
        path_to_content = {path: content for path, content in files}
        selected_files = [
            (path, path_to_content.get(path, "")) 
            for path in selected_paths 
            if path in path_to_content
        ]
        
        return selected_files
    
    def _extract_near_patterns(self, files: List[Tuple[str, str]]) -> Dict:
        """
        Extract NEAR-specific integration patterns.
        
        Args:
            files: List of (file_path, file_content) tuples
            
        Returns:
            Dictionary containing information about NEAR integration patterns
        """
        patterns = {
            "near_api_js": False,
            "near_sdk_rs": False,
            "near_sdk_as": False,
            "wallet_integration": False,
            "contract_calls": False,
            "view_calls": False,
            "state_management": False,
            "ft_integration": False,
            "nft_integration": False,
            "cross_contract_calls": False,
        }
        
        # Check for patterns in all files
        for path, content in files:
            content_lower = content.lower()
            
            # Check for NEAR API JS
            if "near-api-js" in content_lower or "@near-js" in content_lower:
                patterns["near_api_js"] = True
                
            # Check for NEAR SDK Rust
            if "near-sdk" in content_lower and any(ext in path for ext in [".rs", ".toml"]):
                patterns["near_sdk_rs"] = True
                
            # Check for NEAR SDK AssemblyScript
            if "near-sdk-as" in content_lower or "near-sdk-bindgen" in content_lower:
                patterns["near_sdk_as"] = True
                
            # Check for wallet integration
            if any(pattern in content_lower for pattern in [
                "wallet.sign", "wallet.request", "connect.wallet", "wallet.account", 
                "walletconnect", "walletrequest", "signtransaction", "requestsign"
            ]):
                patterns["wallet_integration"] = True
                
            # Check for contract calls
            if any(pattern in content_lower for pattern in [
                "near.call", "contract.call", "call(", ".callraw", "functioncall", 
                "near.functioncall", "contractcall"
            ]):
                patterns["contract_calls"] = True
                
            # Check for view calls
            if any(pattern in content_lower for pattern in [
                "near.view", "contract.view", "view(", ".viewraw", "viewfunction", 
                "near.viewfunction", "contractview"
            ]):
                patterns["view_calls"] = True
                
            # Check for state management
            if any(pattern in content_lower for pattern in [
                "storagemana", "persistentstor", "storage.get", "storage.set", 
                "collections::", "treemap", "lookup", "storageusage"
            ]):
                patterns["state_management"] = True
                
            # Check for fungible token integration
            if any(pattern in content_lower for pattern in [
                "ft_transfer", "ft_balance", "fungible_token", "ft.transfer", "ft_mint", 
                "nep141", "nep-141"
            ]):
                patterns["ft_integration"] = True
                
            # Check for NFT integration
            if any(pattern in content_lower for pattern in [
                "nft_transfer", "nft_mint", "non_fungible_token", "nft.transfer", 
                "nep171", "nep-171"
            ]):
                patterns["nft_integration"] = True
                
            # Check for cross-contract calls
            if any(pattern in content_lower for pattern in [
                "promise", "ext_contract", "then(", "crosscontract", "cross_contract", 
                "callback", "after_transaction", "transaction_complete"
            ]):
                patterns["cross_contract_calls"] = True
        
        return patterns
    
    def _build_prompt(self, selected_files: List[Tuple[str, str]], repo_analysis: Dict[str, Any]) -> str:
        """
        Build the prompt for the AI.
        
        Args:
            selected_files: List of (file_path, file_content) tuples for analysis
            repo_analysis: Repository analysis results
            
        Returns:
            Prompt string
        """
        # Format blockchain files
        blockchain_files_content = []
        for path, content in selected_files:
            blockchain_files_content.append(f"File: {path}\n\n```\n{content}\n```\n")
        
        blockchain_files_str = "\n".join(blockchain_files_content)
        
        # Extract NEAR integration patterns
        near_patterns = self._extract_near_patterns(selected_files)
        
        # Format NEAR integration patterns
        near_patterns_str = "\n".join([
            f"- NEAR API JS: {'Yes' if near_patterns['near_api_js'] else 'No'}",
            f"- NEAR SDK Rust: {'Yes' if near_patterns['near_sdk_rs'] else 'No'}",
            f"- NEAR SDK AssemblyScript: {'Yes' if near_patterns['near_sdk_as'] else 'No'}",
            f"- Wallet Integration: {'Yes' if near_patterns['wallet_integration'] else 'No'}",
            f"- Contract Calls: {'Yes' if near_patterns['contract_calls'] else 'No'}",
            f"- View Calls: {'Yes' if near_patterns['view_calls'] else 'No'}",
            f"- State Management: {'Yes' if near_patterns['state_management'] else 'No'}",
            f"- Fungible Token Integration: {'Yes' if near_patterns['ft_integration'] else 'No'}",
            f"- NFT Integration: {'Yes' if near_patterns['nft_integration'] else 'No'}",
            f"- Cross-Contract Calls: {'Yes' if near_patterns['cross_contract_calls'] else 'No'}",
        ])
        
        # Format repository summary
        repo_summary = repo_analysis.get('summary', {})
        
        # Check for NEAR SDK usage in boilerplate analysis
        near_sdk_usage = repo_analysis.get('boilerplate_analysis', {}).get('near_sdk', {})
        if near_sdk_usage:
            near_sdk_summary = []
            for sdk_name, sdk_info in near_sdk_usage.items():
                if sdk_info.get('detected', False):
                    near_sdk_summary.append(f"- {sdk_name}: Detected")
                    near_sdk_summary.append(f"  - Version: {sdk_info.get('version', 'Unknown')}")
                    near_sdk_summary.append(f"  - Features: {', '.join(sdk_info.get('features', []))}")
            
            if near_sdk_summary:
                near_patterns_str += "\n\n## NEAR SDK Details\n\n" + "\n".join(near_sdk_summary)
        
        # Convert repository summary to JSON string
        repo_summary_str = str(repo_summary)
        
        # Replace placeholders in prompt template
        prompt = self.prompt_template
        prompt = prompt.replace("{BLOCKCHAIN_FILES}", blockchain_files_str)
        prompt = prompt.replace("{NEAR_PATTERNS}", near_patterns_str)
        prompt = prompt.replace("{REPO_SUMMARY}", repo_summary_str)
        
        return prompt
    
    def _get_ai_analysis(self, prompt: str) -> Dict[str, Any]:
        """
        Get analysis from AI.
        
        Args:
            prompt: Prompt string
            
        Returns:
            Dictionary with analysis results
        """
        return self.ai_client.analyze_blockchain_integration(prompt)