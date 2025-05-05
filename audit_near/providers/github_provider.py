"""
GitHub repository provider for downloading GitHub repositories.

This module provides functionality to download GitHub repositories and
prepare them for auditing.
"""

import os
import re
import tempfile
import logging
from git import Repo
from pathlib import Path
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

def is_github_url(url):
    """
    Check if a string is a GitHub repository URL.
    
    Args:
        url (str): The URL to check
        
    Returns:
        bool: True if the URL is a GitHub repository URL, False otherwise
    """
    if not url:
        return False
    
    # Check if it's already a directory path
    if os.path.isdir(url):
        return False
    
    # Basic pattern matching for GitHub URLs
    github_patterns = [
        r'https?://github\.com/[\w-]+/[\w.-]+/?$',
        r'https?://github\.com/[\w-]+/[\w.-]+/?\.git$',
        r'git@github\.com:[\w-]+/[\w.-]+/?\.git$'
    ]
    
    return any(re.match(pattern, url) for pattern in github_patterns)

def get_repository_branches(repo_path):
    """
    Get list of branches from a git repository with metadata.
    
    Args:
        repo_path (str): Path to git repository
        
    Returns:
        list: List of dictionaries containing branch information with keys:
            - name: Branch name
            - commit_hash: Latest commit hash
            - commit_date: Date of the latest commit
            - is_default: Whether this is the default branch
    """
    try:
        repo = Repo(repo_path)
        
        # Get remote reference to determine default branch
        default_branch = None
        try:
            # Get the default branch from origin (usually main or master)
            for ref in repo.references:
                if ref.name == 'origin/HEAD':
                    default_branch = ref.reference.name.replace('origin/', '')
                    break
        except Exception:
            # Fallback if origin/HEAD doesn't exist
            # Try common default branch names
            for name in ['main', 'master']:
                if name in [b.name for b in repo.branches]:
                    default_branch = name
                    break
        
        # If still no default branch, use the current HEAD
        if not default_branch and repo.active_branch:
            default_branch = repo.active_branch.name
        
        branches = []
        # Get all branches
        for branch in repo.branches:
            # Get latest commit for the branch
            commit = next(repo.iter_commits(branch.name, max_count=1))
            branches.append({
                'name': branch.name,
                'commit_hash': commit.hexsha,
                'commit_date': commit.committed_datetime.strftime('%Y-%m-%d %H:%M:%S'),
                'commit_message': commit.message.strip().split('\n')[0],  # First line of commit message
                'is_default': branch.name == default_branch
            })
        
        # Sort branches: default branch first, then alphabetically
        branches.sort(key=lambda x: (not x['is_default'], x['name']))
        
        return branches
    except Exception as e:
        logger.error(f"Error getting repository branches: {e}")
        return []

def download_github_repo(url, branch='main'):
    """
    Download a GitHub repository to a temporary directory.
    
    Args:
        url (str): GitHub repository URL
        branch (str): Branch to clone (default: main)
        
    Returns:
        str: Path to the temporary directory containing the repository
    """
    logger.info(f"Downloading GitHub repository: {url}, branch: {branch}")
    
    # Extract repo name for better directory naming
    repo_name = extract_repo_name_from_url(url)
    
    # Add timestamp to make unique folders for multiple audits of the same repo
    import datetime
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Create a temporary directory with repo name and timestamp
    temp_dir = tempfile.mkdtemp(prefix=f"audit_near_{repo_name}_{timestamp}_")
    logger.info(f"Created temporary directory: {temp_dir}")
    
    try:
        # Normalize URL to ensure it works with GitPython
        if url.endswith('/'):
            url = url[:-1]
        if not url.endswith('.git') and not url.startswith('git@'):
            url = f"{url}.git"
        
        # Clone the repository to the temporary directory
        logger.info(f"Cloning repository to {temp_dir}...")
        repo = Repo.clone_from(url, temp_dir, branch=branch)
        logger.info(f"Repository cloned successfully, HEAD is at: {repo.head.commit.hexsha}")
        
        return temp_dir
    except Exception as e:
        logger.error(f"Error downloading GitHub repository: {e}")
        # Clean up if there was an error
        try:
            import shutil
            shutil.rmtree(temp_dir)
        except Exception as cleanup_error:
            logger.error(f"Error cleaning up temp directory: {cleanup_error}")
        
        raise RuntimeError(f"Failed to download GitHub repository: {e}")

def extract_repo_name_from_url(url):
    """
    Extract the repository name from a GitHub URL.
    
    Args:
        url (str): GitHub repository URL
        
    Returns:
        str: Repository name
    """
    # Handle SSH URLs
    if url.startswith('git@'):
        match = re.search(r'git@github\.com:[\w-]+/([\w.-]+)/?\.git$', url)
        if match:
            return match.group(1)
    
    # Handle HTTPS URLs
    parsed_url = urlparse(url)
    path_parts = parsed_url.path.strip('/').split('/')
    
    if len(path_parts) >= 2:
        repo_name = path_parts[1]
        # Remove .git if present
        if repo_name.endswith('.git'):
            repo_name = repo_name[:-4]
        return repo_name
    
    # Fallback: use the URL if we couldn't parse it
    return url