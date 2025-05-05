"""
Command-line interface for audit-near.

This module handles command-line arguments and orchestrates the audit process.
"""

import argparse
import logging
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional

import tomli

from audit_near.ai_client import AiClient
from audit_near.categories.blockchain_integration import BlockchainIntegration
from audit_near.categories.code_quality import CodeQuality
from audit_near.categories.documentation import Documentation
from audit_near.categories.functionality import Functionality
from audit_near.categories.innovation import Innovation
from audit_near.categories.security import Security
from audit_near.categories.ux_design import UXDesign
# Import enhanced category processors
from audit_near.categories.enhanced_blockchain_integration import EnhancedBlockchainIntegration
from audit_near.categories.enhanced_code_quality import EnhancedCodeQuality
from audit_near.providers.repo_provider import RepoProvider
from audit_near.providers.repo_analyzer import RepoAnalyzer
from audit_near.reporters.markdown_reporter import MarkdownReporter


def setup_logging():
    """Setup basic logging configuration."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )


def parse_arguments():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Audit NEAR-based hackathon projects and generate scorecard"
    )
    parser.add_argument(
        "--repo",
        type=str,
        required=True,
        help="Path to the local repository",
    )
    parser.add_argument(
        "--branch",
        type=str,
        default="main",
        help="Branch name (default: main)",
    )
    parser.add_argument(
        "--config",
        type=str,
        default=None,
        help="Path to the TOML configuration file",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="audit_report.md",
        help="Path to the output Markdown report",
    )
    parser.add_argument(
        "--api-key",
        type=str,
        help="OpenAI API key (alternatively set OPENAI_API_KEY environment variable)",
    )
    
    return parser.parse_args()


def load_config(config_path: Optional[str]) -> Dict:
    """
    Load configuration from a TOML file.
    
    Args:
        config_path: Path to the TOML configuration file
        
    Returns:
        Dictionary containing the configuration
    """
    if config_path is None:
        # Use default config path
        default_config_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "configs",
            "near_hackathon.toml"
        )
        config_path = default_config_path
    
    try:
        with open(config_path, "rb") as f:
            config = tomli.load(f)
        return config
    except FileNotFoundError:
        logging.error(f"Configuration file not found: {config_path}")
        sys.exit(1)
    except tomli.TOMLDecodeError:
        logging.error(f"Error parsing TOML configuration: {config_path}")
        sys.exit(1)


def get_category_handlers(config: Dict, ai_client: AiClient, repo_path: str, branch: str = "main"):
    """
    Get category handlers based on configuration.
    
    Args:
        config: Configuration dictionary
        ai_client: AI client instance
        repo_path: Path to repository
        branch: Repository branch (default: main)
        
    Returns:
        Dictionary mapping category names to handler instances
    """
    base_prompts_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "prompts"
    )
    
    # Import the registry and plugin loader
    from audit_near.plugins.registry import registry
    from audit_near.plugins.loader import loader
    from audit_near.plugins.management import discover_plugins, init_plugins_directory
    
    # Legacy category map for backward compatibility
    legacy_category_map = {
        "code_quality": EnhancedCodeQuality,  # Use the enhanced version
        "functionality": Functionality,
        "security": Security,
        "innovation": Innovation,
        "documentation": Documentation,
        "ux_design": UXDesign,
        "blockchain_integration": EnhancedBlockchainIntegration,  # Use the enhanced version
    }
    
    # Initialize plugins directory
    init_plugins_directory()
    
    # Discover and load plugins
    loaded_plugins = discover_plugins()
    logging.info(f"Loaded {len(loaded_plugins)} plugins: {', '.join(loaded_plugins)}")
    
    handlers = {}
    
    # Process categories from configuration
    for category_name in config["categories"]:
        category_config = config["categories"][category_name]
        max_points = category_config.get("max_points", 10)
        
        # Check if this category is available in the registry (plugin system)
        if registry.get_category(category_name):
            logging.info(f"Using plugin for category: {category_name}")
            category_class = registry.get_category(category_name)
            metadata = registry.get_metadata(category_name)
            
            # Get prompt file from metadata or use default
            if "prompt_file" in category_config:
                # Use prompt file from config
                prompt_file = os.path.join(base_prompts_dir, category_config["prompt_file"])
            else:
                # Use default prompt file name
                prompt_file = os.path.join(base_prompts_dir, f"{category_name}.md")
            
            # Determine if this is an enhanced category
            is_enhanced = metadata.get("enhanced", False)
            
            if is_enhanced:
                # Use enhanced initialization with branch parameter
                handlers[category_name] = category_class(
                    ai_client=ai_client,
                    prompt_file=prompt_file,
                    max_points=max_points,
                    repo_path=repo_path,
                    category_name=metadata.get("name", category_name),
                    branch=branch
                )
            else:
                # Use standard initialization
                try:
                    # Try to initialize with category_name (new style)
                    handlers[category_name] = category_class(
                        ai_client=ai_client,
                        prompt_file=prompt_file,
                        max_points=max_points,
                        repo_path=repo_path,
                        category_name=metadata.get("name", category_name)
                    )
                except TypeError:
                    # Fall back to old style without category_name
                    handlers[category_name] = category_class(
                        ai_client=ai_client,
                        prompt_file=prompt_file,
                        max_points=max_points,
                        repo_path=repo_path
                    )
        
        # Legacy category handling (backward compatibility)
        elif category_name in legacy_category_map:
            logging.info(f"Using legacy class for category: {category_name}")
            category_class = legacy_category_map[category_name]
            prompt_file = os.path.join(base_prompts_dir, f"{category_name}.md")
            
            # Check if this is an enhanced category that requires a branch parameter
            if category_class in [EnhancedCodeQuality, EnhancedBlockchainIntegration]:
                handlers[category_name] = category_class(
                    ai_client=ai_client,
                    prompt_file=prompt_file,
                    max_points=max_points,
                    repo_path=repo_path,
                    branch=branch
                )
            else:
                # Use original instantiation for non-enhanced categories
                handlers[category_name] = category_class(
                    ai_client=ai_client,
                    prompt_file=prompt_file,
                    max_points=max_points,
                    repo_path=repo_path
                )
        else:
            logging.warning(f"Category {category_name} not found in registry or legacy map, skipping")
    
    return handlers


def main():
    """Main entry point for the CLI."""
    setup_logging()
    args = parse_arguments()
    
    # Set up OpenAI API key
    api_key = args.api_key or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        logging.error("OpenAI API key is required. Set it via --api-key or OPENAI_API_KEY environment variable.")
        sys.exit(1)
    
    # Load configuration
    config = load_config(args.config)
    
    # Create AI client
    ai_client = AiClient(api_key=api_key, config=config)
    
    # Create repo provider
    repo_provider = RepoProvider(repo_path=args.repo, branch=args.branch)
    repo_files = repo_provider.get_files()
    
    # Get category handlers with branch info
    category_handlers = get_category_handlers(config, ai_client, args.repo, args.branch)
    
    # Process each category
    results = {}
    total_score = 0
    total_possible = 0
    
    for category_name, handler in category_handlers.items():
        logging.info(f"Processing category: {category_name}")
        
        try:
            score, feedback = handler.process(repo_files)
            max_points = handler.max_points
            
            results[category_name] = {
                "score": score,
                "max_points": max_points,
                "feedback": feedback
            }
            
            total_score += score
            total_possible += max_points
            
            logging.info(f"Completed category {category_name}: {score}/{max_points}")
            
        except Exception as e:
            logging.error(f"Error processing category {category_name}: {e}")
            results[category_name] = {
                "score": 0,
                "max_points": handler.max_points,
                "feedback": f"Error processing category: {str(e)}"
            }
            total_possible += handler.max_points
    
    # Generate report
    output_path = args.output
    reporter = MarkdownReporter()
    reporter.generate_report(
        repo_path=args.repo,
        branch=args.branch,
        results=results,
        total_score=total_score,
        total_possible=total_possible,
        output_path=output_path
    )
    
    logging.info(f"Audit completed. Report saved to: {output_path}")
    print(f"Total score: {total_score}/{total_possible}")
    print(f"Report saved to: {output_path}")


if __name__ == "__main__":
    main()
