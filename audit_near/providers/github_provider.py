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
        logger.info(f"Getting branches for repository at {repo_path}")
        
        # Get remote reference to determine default branch
        default_branch = None
        try:
            # Get the default branch from origin (usually main or master)
            for ref in repo.references:
                if ref.name == 'origin/HEAD':
                    default_branch = ref.reference.name.replace('origin/', '')
                    logger.info(f"Found default branch from origin/HEAD: {default_branch}")
                    break
        except Exception as e:
            logger.warning(f"Error finding default branch from origin/HEAD: {e}")
        
        # Fallback if origin/HEAD doesn't exist
        if not default_branch:
            # Try common default branch names
            for name in ['main', 'master']:
                if name in [b.name for b in repo.branches]:
                    default_branch = name
                    logger.info(f"Using common default branch name: {default_branch}")
                    break
        
        # If still no default branch, use the current HEAD
        if not default_branch and repo.active_branch:
            default_branch = repo.active_branch.name
            logger.info(f"Using active branch as default: {default_branch}")
        
        branches = []
        local_branches = list(repo.branches)
        logger.info(f"Found {len(local_branches)} local branches")
        
        # Also get remote branches
        remote_branches = []
        try:
            # Method 1: Using GitPython API
            for remote in repo.remotes:
                # Fetch to ensure we have remote branch info
                remote.fetch()
                for ref in remote.refs:
                    # Skip HEAD reference
                    if ref.name.endswith('/HEAD'):
                        continue
                    # Get branch name without remote prefix
                    branch_name = ref.name.split('/', 1)[1]
                    # Check if this is already a local branch
                    if branch_name not in [b.name for b in local_branches]:
                        remote_branches.append((branch_name, ref))
            
            # Method 2: Direct git command for shallow clones
            # This is helpful when we use depth=1 and don't have full branch info
            if len(remote_branches) == 0:
                try:
                    import subprocess
                    # Run git branch -r to get remote branches
                    result = subprocess.run(
                        ['git', 'branch', '-r'], 
                        cwd=repo_path, 
                        capture_output=True, 
                        text=True, 
                        check=True
                    )
                    
                    if result.stdout:
                        # Parse branch names from output
                        for line in result.stdout.splitlines():
                            line = line.strip()
                            if line and not line.endswith('/HEAD'):
                                # Remote branch format is usually 'origin/branch_name'
                                branch_parts = line.split('/', 1)
                                if len(branch_parts) > 1:
                                    remote_name, branch_name = branch_parts
                                    # Check if already in local branches
                                    if branch_name not in [b.name for b in local_branches]:
                                        # Create a simple tuple with branch name
                                        remote_branches.append((branch_name, None))
                                        logger.debug(f"Added remote branch from git command: {branch_name}")
                except Exception as cmd_error:
                    logger.warning(f"Error getting remote branches via git command: {cmd_error}")
                    
            logger.info(f"Found {len(remote_branches)} additional remote branches")
        except Exception as e:
            logger.warning(f"Error fetching remote branches: {e}")
        
        # Process local branches
        for branch in local_branches:
            try:
                # Get latest commit for the branch
                commit = next(repo.iter_commits(branch.name, max_count=1))
                branches.append({
                    'name': branch.name,
                    'commit_hash': commit.hexsha,
                    'commit_date': commit.committed_datetime.strftime('%Y-%m-%d %H:%M:%S'),
                    'commit_message': commit.message.strip().split('\n')[0],  # First line of commit message
                    'is_default': branch.name == default_branch
                })
                logger.debug(f"Added local branch: {branch.name}")
            except Exception as e:
                logger.warning(f"Error processing local branch {branch.name}: {e}")
        
        # Process remote branches
        for branch_name, ref in remote_branches:
            try:
                if ref:
                    # If we have a reference object, use it to get commit info
                    commit = next(repo.iter_commits(ref.name, max_count=1))
                    branches.append({
                        'name': branch_name,
                        'commit_hash': commit.hexsha,
                        'commit_date': commit.committed_datetime.strftime('%Y-%m-%d %H:%M:%S'),
                        'commit_message': commit.message.strip().split('\n')[0],
                        'is_default': branch_name == default_branch,
                        'is_remote': True
                    })
                else:
                    # For branches discovered via git command without ref objects
                    # Create a simpler branch entry with just the name
                    ref_name = f"origin/{branch_name}"
                    try:
                        # Try to get commit info using string reference
                        commit = next(repo.iter_commits(ref_name, max_count=1))
                        branches.append({
                            'name': branch_name,
                            'commit_hash': commit.hexsha,
                            'commit_date': commit.committed_datetime.strftime('%Y-%m-%d %H:%M:%S'),
                            'commit_message': commit.message.strip().split('\n')[0],
                            'is_default': branch_name == default_branch,
                            'is_remote': True
                        })
                    except:
                        # If that fails, just add the branch name with minimal info
                        branches.append({
                            'name': branch_name,
                            'commit_hash': 'unknown',
                            'commit_date': 'unknown',
                            'commit_message': '',
                            'is_default': branch_name == default_branch,
                            'is_remote': True
                        })
                logger.debug(f"Added remote branch: {branch_name}")
            except Exception as e:
                logger.warning(f"Error processing remote branch {branch_name}: {e}")
        
        # Sort branches: default branch first, then alphabetically
        branches.sort(key=lambda x: (not x['is_default'], x['name']))
        
        logger.info(f"Returning {len(branches)} branches in total")
        return branches
    except Exception as e:
        logger.error(f"Error getting repository branches: {e}", exc_info=True)
        return []

def download_github_repo(url, branch='main', fetch_all_branches=True):
    """
    Download a GitHub repository to a temporary directory.
    
    Args:
        url (str): GitHub repository URL
        branch (str): Branch to clone (default: main)
        fetch_all_branches (bool): Whether to fetch all branches or only the specified branch
                                  Use True for validation, False for actual auditing
        
    Returns:
        str: Path to the temporary directory containing the repository
    """
    logger.info(f"Downloading GitHub repository: {url}, branch: {branch}, fetch_all_branches: {fetch_all_branches}")
    
    # Extract repo name for better directory naming
    repo_name = extract_repo_name_from_url(url)
    owner = extract_owner_from_url(url)
    
    # Add timestamp to make unique folders for multiple audits of the same repo
    import datetime
    import random
    import string
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    
    # Create a temporary directory with repo name and timestamp
    temp_dir = tempfile.mkdtemp(prefix=f"audit_near_{repo_name}_{timestamp}_")
    logger.info(f"Created temporary directory: {temp_dir}")
    
    try:
        # Clean URL for public repositories to ensure we can clone without authentication
        if url.endswith('/'):
            url = url[:-1]
        
        # For GitHub URLs specifically, use the HTTPS URL format for public repos
        if 'github.com' in url:
            # If ssh format, convert to https
            if url.startswith('git@'):
                if owner and repo_name:
                    url = f"https://github.com/{owner}/{repo_name}"
                    logger.info(f"Converted SSH URL to HTTPS: {url}")
            
            # Ensure URL ends with .git for public repos
            if not url.endswith('.git'):
                url = f"{url}.git"
                
            logger.info(f"Using GitHub URL: {url}")
        
        # Set up clone options
        clone_options = {
            'url': url,
            'to_path': temp_dir,
            'branch': branch,
            'depth': 1,  # Only get the latest commit
            'env': {"GIT_TERMINAL_PROMPT": "0"}  # Disable Git prompting for credentials
        }
        
        # For actual auditing (not validation), only get the specific branch
        if not fetch_all_branches:
            clone_options['single_branch'] = True
        
        # Clone the repository
        logger.info(f"Cloning repository to {temp_dir} with options: {clone_options}")
        repo = Repo.clone_from(**clone_options)
        
        logger.info(f"Repository cloned successfully, HEAD is at: {repo.head.commit.hexsha}")
        
        # Extra step for validation: If we're fetching all branches, also do a direct fetch
        # This helps get branch information that might not be available from the initial shallow clone
        if fetch_all_branches:
            try:
                import subprocess
                logger.info("Fetching additional branch information...")
                subprocess.run(
                    ['git', 'remote', 'set-branches', 'origin', '*'],  # Configure git to fetch all remote branches
                    cwd=temp_dir, 
                    check=True,
                    capture_output=True
                )
                
                subprocess.run(
                    ['git', 'fetch', '--depth=1', '--all'],  # Fetch all branches but still with depth=1
                    cwd=temp_dir, 
                    check=True,
                    capture_output=True
                )
                
                # Log branch info for debugging
                result = subprocess.run(
                    ['git', 'branch', '-a'],
                    cwd=temp_dir,
                    check=True,
                    text=True,
                    capture_output=True
                )
                if result.stdout:
                    logger.info(f"Available branches after fetch: {result.stdout}")
            except Exception as fetch_error:
                logger.warning(f"Error during additional branch fetching: {fetch_error}")
                # Continue even if this fails, as we still have the main clone
        
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

def extract_owner_from_url(url):
    """
    Extract the owner (username or org) from a GitHub URL.
    
    Args:
        url (str): GitHub repository URL
        
    Returns:
        str: Owner name or None if not found
    """
    # Handle SSH URLs
    if url.startswith('git@'):
        match = re.search(r'git@github\.com:([\w-]+)/[\w.-]+/?\.git$', url)
        if match:
            return match.group(1)
    
    # Handle HTTPS URLs
    parsed_url = urlparse(url)
    path_parts = parsed_url.path.strip('/').split('/')
    
    if len(path_parts) >= 2:
        return path_parts[0]
    
    return None

def get_repo_metadata(repo_path, original_url=None):
    """
    Get metadata for a repository including description, avatar URL, 
    stars, forks, and other information.
    
    Args:
        repo_path (str): Path to the local repository
        original_url (str, optional): Original GitHub URL if available
        
    Returns:
        dict: Repository metadata
    """
    metadata = {
        "description": None,
        "avatar_url": None,
        "owner": None,
        "repo_name": None,
        "default_branch": None,
        "stars": None,
        "forks": None,
        "commits": 0,
        "contributors": [],
        "last_commit_date": None,
        "languages": {},
        "source_url": original_url
    }
    
    try:
        repo = Repo(repo_path)
        
        # Try to get description from repository config
        try:
            metadata["description"] = repo.description
        except:
            pass
        
        # Get default branch information
        for ref in repo.references:
            if ref.name == 'origin/HEAD':
                metadata["default_branch"] = ref.reference.name.replace('origin/', '')
                break
        
        # Fallback if origin/HEAD doesn't exist
        if not metadata["default_branch"]:
            # Try common default branch names
            for name in ['main', 'master']:
                if name in [b.name for b in repo.branches]:
                    metadata["default_branch"] = name
                    break
        
        # If still no default branch, use the current HEAD
        if not metadata["default_branch"] and repo.active_branch:
            metadata["default_branch"] = repo.active_branch.name
        
        # Count commits
        try:
            metadata["commits"] = sum(1 for _ in repo.iter_commits())
        except:
            pass
        
        # Get last commit date
        try:
            last_commit = next(repo.iter_commits())
            metadata["last_commit_date"] = last_commit.committed_datetime.strftime('%Y-%m-%d %H:%M:%S')
        except:
            pass
        
        # Get contributor information
        try:
            contributors = set()
            for commit in repo.iter_commits():
                author = f"{commit.author.name} <{commit.author.email}>"
                contributors.add(author)
            metadata["contributors"] = list(contributors)
        except:
            pass
            
        # If we have a GitHub URL, extract owner and repo name
        if original_url and is_github_url(original_url):
            metadata["owner"] = extract_owner_from_url(original_url)
            metadata["repo_name"] = extract_repo_name_from_url(original_url)
            
            # Generate avatar URL for the owner
            if metadata["owner"]:
                metadata["avatar_url"] = f"https://github.com/{metadata['owner']}.png"
                
            # Generate source URL if not already set
            if not metadata["source_url"]:
                metadata["source_url"] = f"https://github.com/{metadata['owner']}/{metadata['repo_name']}"
        else:
            # Use the basename as repo name for local repositories
            metadata["repo_name"] = os.path.basename(repo_path)
        
        return metadata
    except Exception as e:
        logger.error(f"Error getting repository metadata: {e}", exc_info=True)
        
        # For local repositories with no remote, at least get the directory name
        if not metadata["repo_name"]:
            metadata["repo_name"] = os.path.basename(repo_path)
        
        return metadata