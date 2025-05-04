"""
Blockchain Integration category processor.

This module implements the processor for the Blockchain Integration category.
"""

import logging
import os
from typing import Dict, List, Tuple

from audit_near.ai_client import AiClient
from audit_near.categories.utils import load_prompt_template


class BlockchainIntegration:
    """
    Processor for the Blockchain Integration category.
    """
    
    def __init__(self, ai_client: AiClient, prompt_file: str, max_points: int, repo_path: str):
        """
        Initialize the Blockchain Integration processor.
        
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
        Process the Blockchain Integration category.
        
        Args:
            files: List of (file_path, file_content) tuples
            
        Returns:
            Tuple of (score, feedback)
        """
        self.logger.info("Processing Blockchain Integration category")
        
        # Extract blockchain-related files
        blockchain_files = self._extract_blockchain_files(files)
        
        # Extract NEAR-specific integration patterns
        near_patterns = self._extract_near_patterns(files)
        
        # Build the prompt
        prompt = self._build_prompt(blockchain_files, near_patterns)
        
        # Get analysis from AI
        analysis = self.ai_client.analyze_blockchain_integration(prompt)
        
        # Extract score and feedback
        score, feedback = self._extract_results(analysis)
        
        return score, feedback
    
    def _extract_blockchain_files(self, files: List[Tuple[str, str]]) -> List[Tuple[str, str]]:
        """
        Extract blockchain-related files.
        
        Args:
            files: List of (file_path, file_content) tuples
            
        Returns:
            List of (file_path, file_content) tuples for blockchain-related files
        """
        # Look for blockchain-related files
        blockchain_files = []
        
        # Common blockchain-related directories and file patterns
        blockchain_dirs = ["contract", "contracts", "blockchain", "near", "chain"]
        blockchain_patterns = [
            "near", "contract", "wallet", "transaction", "blockchain", 
            "token", "nft", "fungible", "account", "deploy", "gas"
        ]
        
        for path, content in files:
            # Skip large files
            if len(content) > 50000:
                continue
                
            # Check if path contains a blockchain directory
            if any(blockchain_dir in path.split("/") for blockchain_dir in blockchain_dirs):
                blockchain_files.append((path, content))
                continue
            
            # Check for blockchain patterns in path
            if any(pattern in path.lower() for pattern in blockchain_patterns):
                blockchain_files.append((path, content))
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
                blockchain_files.append((path, content))
        
        # If we have too many files, prioritize the most relevant ones
        if len(blockchain_files) > 8:
            # Prioritize contract files and files with NEAR in the name
            priority_files = [
                (path, content) for path, content in blockchain_files
                if "contract" in path.lower() or "near" in path.lower()
            ]
            
            other_files = [
                (path, content) for path, content in blockchain_files
                if (path, content) not in priority_files
            ]
            
            return priority_files[:5] + other_files[:3]  # Take up to 5 priority files and 3 other files
        
        return blockchain_files
    
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
    
    def _build_prompt(self, blockchain_files: List[Tuple[str, str]], near_patterns: Dict) -> str:
        """
        Build the prompt for the AI.
        
        Args:
            blockchain_files: List of (file_path, file_content) tuples for blockchain-related files
            near_patterns: Dictionary containing information about NEAR integration patterns
            
        Returns:
            Prompt string
        """
        # Format blockchain files
        blockchain_files_content = []
        for path, content in blockchain_files:
            blockchain_files_content.append(f"File: {path}\n\n```\n{content}\n```\n")
        
        blockchain_files_str = "\n".join(blockchain_files_content)
        
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
        
        # Replace placeholders in prompt template
        prompt = self.prompt_template
        prompt = prompt.replace("{BLOCKCHAIN_FILES}", blockchain_files_str)
        prompt = prompt.replace("{NEAR_PATTERNS}", near_patterns_str)
        
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
            return 0, "Error processing Blockchain Integration analysis."
