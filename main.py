"""
Web interface for the Code Sorcerer tool.
"""

import os
import logging
from pathlib import Path
import tempfile
import json
import threading
import time
import uuid
from enum import Enum, auto
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Any, Optional

from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.utils import secure_filename

# Set up logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Create templates directory if it doesn't exist
os.makedirs('templates', exist_ok=True)
os.makedirs('static', exist_ok=True)
os.makedirs('static/css', exist_ok=True)
os.makedirs('static/js', exist_ok=True)

# Setup database
class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///audit_near.db")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
db.init_app(app)

# Define models
class AuditReport(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    repo_name = db.Column(db.String(200), nullable=False)
    repo_path = db.Column(db.String(500), nullable=False)
    branch = db.Column(db.String(100), default="main")
    total_score = db.Column(db.Float, nullable=False)
    total_possible = db.Column(db.Float, nullable=False)
    report_data = db.Column(db.Text, nullable=False)  # JSON string
    repo_metadata = db.Column(db.Text, nullable=True) # JSON string for repository metadata
    created_at = db.Column(db.DateTime, server_default=db.func.now())

# Create tables
with app.app_context():
    # Recreate tables (this will drop and recreate tables if schema has changed)
    db.drop_all()
    db.create_all()
    logger.info("Database tables recreated")

# Import audit functionality
from audit_near.cli import load_config, get_category_handlers
from audit_near.ai_client import AiClient
from audit_near.providers.repo_provider import RepoProvider
from audit_near.providers.repo_analyzer import RepoAnalyzer
from audit_near.providers.github_provider import (
    is_github_url, download_github_repo, extract_repo_name_from_url, 
    get_repository_branches, get_repo_metadata
)
from audit_near.reporters.markdown_reporter import MarkdownReporter

@app.route('/')
def index():
    """Home page."""
    # Get recent audits
    with app.app_context():
        recent_audits = AuditReport.query.order_by(AuditReport.created_at.desc()).limit(5).all()
    
    return render_template('index.html', recent_audits=recent_audits)

@app.route('/audit', methods=['GET', 'POST'])
def audit():
    """Start a new audit."""
    # Import the registry and plugin loader
    from audit_near.plugins.registry import registry
    from audit_near.plugins.management import init_plugins_directory, discover_plugins
    from pathlib import Path
    
    # Python 3.11+ includes tomllib in the standard library
    try:
        import tomllib  # Python 3.11+
    except ImportError:
        import tomli as tomllib  # Before Python 3.11
    
    # Initialize plugins directory and load plugins
    init_plugins_directory()
    available_plugins = discover_plugins()
    logger.info(f"Loaded {len(available_plugins)} plugins: {', '.join(available_plugins)}")
    
    # Get available categories from registry 
    available_categories = []
    for category_id in registry.get_all_category_ids():
        metadata = registry.get_metadata(category_id)
        if metadata:
            available_categories.append({
                "id": category_id,
                "name": metadata.get("name", category_id),
                "description": metadata.get("description", ""),
                "max_points": metadata.get("max_points", 10)
            })
    
    # Get available bundles
    bundles_dir = Path("plugins/bundles")
    available_bundles = []
    
    if bundles_dir.exists():
        for bundle_file in bundles_dir.glob("*.toml"):
            try:
                with open(bundle_file, "rb") as f:
                    bundle_data = tomllib.load(f)
                
                if "metadata" in bundle_data:
                    available_bundles.append({
                        "id": bundle_file.stem,
                        "name": bundle_data["metadata"].get("name", bundle_file.stem),
                        "description": bundle_data["metadata"].get("description", ""),
                        "categories": list(bundle_data.get("categories", {}).keys())
                    })
            except Exception as e:
                logger.error(f"Error loading bundle {bundle_file}: {e}")
    
    if request.method == 'POST':
        # Handle form submission
        repo_path = request.form.get('repo_path')
        
        if not repo_path:
            flash('Repository path or GitHub URL is required', 'error')
            return redirect(url_for('audit'))
        
        # Check if the input is a GitHub URL
        if is_github_url(repo_path):
            try:
                # Get branch name from form
                branch = request.form.get('branch', 'main')
                
                # Extract repo name for display purposes before downloading
                repo_name = extract_repo_name_from_url(repo_path)
                
                # Download the repository
                logger.info(f"Downloading GitHub repository: {repo_path}, branch: {branch}")
                # For actual auditing, we only need the specified branch
                temp_repo_path = download_github_repo(repo_path, branch, fetch_all_branches=False)
                
                # Set session variables
                session['is_github_repo'] = True
                session['github_url'] = repo_path
                session['repo_name'] = repo_name  # Important: store the actual repo name
                session['original_repo_name'] = repo_name  # Keep the original name
                repo_path = temp_repo_path
                
                logger.info(f"GitHub repository '{repo_name}' downloaded to: {repo_path}")
                flash(f"GitHub repository '{repo_name}' downloaded successfully.", 'success')
                
            except Exception as e:
                logger.error(f"Error downloading GitHub repository: {e}")
                flash(f"Error downloading GitHub repository: {str(e)}", 'error')
                return redirect(url_for('audit'))
        else:
            # Handle local repository path
            session['is_github_repo'] = False
            
            # Expand path if it contains a tilde
            if '~' in repo_path:
                repo_path = os.path.expanduser(repo_path)
            
            # Convert to absolute path if it's relative
            if not os.path.isabs(repo_path):
                repo_path = os.path.abspath(repo_path)
            
            # Use the repository name as the repo_name 
            session['repo_name'] = os.path.basename(repo_path)
        
        # Enhanced validation of repository path
        validation_result, validation_message = validate_repository_path(repo_path)
        if not validation_result:
            flash(validation_message, 'error')
            return redirect(url_for('audit'))
        
        # Store form data in session
        session['repo_path'] = repo_path
        session['branch'] = request.form.get('branch', 'main')
        
        # Process category selection
        selected_bundle = request.form.get('bundle')
        selected_categories = request.form.getlist('categories')
        
        # Store audit configuration in session
        session['audit_config'] = {
            'categories': {},
            'bundle': selected_bundle
        }
        
        # If a bundle was selected, use its categories
        if selected_bundle:
            bundle_path = bundles_dir / f"{selected_bundle}.toml"
            if bundle_path.exists():
                try:
                    with open(bundle_path, "rb") as f:
                        bundle_data = tomllib.load(f)
                    
                    # Add all enabled categories from the bundle
                    if "categories" in bundle_data:
                        for category_id, enabled in bundle_data["categories"].items():
                            if enabled:
                                metadata = registry.get_metadata(category_id)
                                max_points = 10
                                if metadata:
                                    max_points = metadata.get("max_points", 10)
                                else:
                                    # Default points for standard categories
                                    if category_id == "code_quality":
                                        max_points = 20
                                    elif category_id in ["functionality", "security", "documentation"]:
                                        max_points = 15
                                    else:
                                        max_points = 10
                                        
                                session['audit_config']['categories'][category_id] = {
                                    'max_points': max_points
                                }
                except Exception as e:
                    logger.error(f"Error loading bundle {bundle_path}: {e}")
        else:
            # Use individually selected categories
            for category_id in selected_categories:
                metadata = registry.get_metadata(category_id)
                max_points = 10
                if metadata:
                    max_points = metadata.get("max_points", 10)
                else:
                    # Default points for standard categories
                    if category_id == "code_quality":
                        max_points = 20
                    elif category_id in ["functionality", "security", "documentation"]:
                        max_points = 15
                    else:
                        max_points = 10
                        
                session['audit_config']['categories'][category_id] = {
                    'max_points': max_points
                }
        
        # If no categories were selected or found in bundle, use defaults
        if not session['audit_config']['categories']:
            session['audit_config']['categories'] = {
                "code_quality": {"max_points": 20},
                "functionality": {"max_points": 15},
                "security": {"max_points": 20},
                "documentation": {"max_points": 15},
                "innovation": {"max_points": 10},
                "ux_design": {"max_points": 10},
                "blockchain_integration": {"max_points": 10}
            }
            
        # Add debug info to session
        repo_stats = get_repository_stats(repo_path)
        session['repo_stats'] = repo_stats
        logger.info(f"Repository validated: {repo_path} with {repo_stats['total_files']} files")
        logger.info(f"Selected categories: {list(session['audit_config']['categories'].keys())}")
        
        return redirect(url_for('run_audit'))
    
    # Get list of sample test repositories for the dropdown
    test_repos_dir = os.path.join(os.path.dirname(__file__), 'test_repos')
    sample_repos = []
    if os.path.isdir(test_repos_dir):
        sample_repos = [os.path.join(test_repos_dir, d) for d in os.listdir(test_repos_dir) 
                      if os.path.isdir(os.path.join(test_repos_dir, d))]
    
    return render_template('audit_form.html', 
                          sample_repos=sample_repos,
                          available_categories=available_categories,
                          available_bundles=available_bundles,
                          plugin_count=len(available_plugins))


def validate_repository_path(repo_path):
    """
    Validate that the given path is a valid git repository with source code files.
    
    Args:
        repo_path: Path to the repository
        
    Returns:
        Tuple of (is_valid, message)
    """
    # Check if directory exists
    if not os.path.isdir(repo_path):
        return False, f"Directory does not exist: {repo_path}"
    
    # Check if it has any files
    files = []
    for root, _, filenames in os.walk(repo_path):
        for filename in filenames:
            # Skip hidden files and directories
            if filename.startswith('.') or '/.git/' in root:
                continue
            file_path = os.path.join(root, filename)
            files.append(file_path)
    
    if not files:
        return False, f"No files found in repository: {repo_path}"
    
    # Check for source code files
    code_extensions = ['.js', '.ts', '.py', '.rs', '.go', '.java', '.c', '.cpp', '.h', '.jsx', '.tsx', '.html', '.css']
    code_files = [f for f in files if os.path.splitext(f)[1].lower() in code_extensions]
    
    if not code_files:
        return False, f"No source code files found in repository: {repo_path}"
    
    return True, "Repository is valid"


def get_repository_stats(repo_path):
    """
    Get statistics about the repository.
    
    Args:
        repo_path: Path to the repository
        
    Returns:
        Dictionary with repository statistics
    """
    stats = {
        'total_files': 0,
        'code_files': 0,
        'doc_files': 0,
        'other_files': 0,
        'file_types': {},
        'largest_files': [],
        'directories': []
    }
    
    code_extensions = ['.js', '.ts', '.py', '.rs', '.go', '.java', '.c', '.cpp', '.h', '.jsx', '.tsx', '.php', '.rb']
    doc_extensions = ['.md', '.txt', '.rst', '.pdf', '.doc', '.docx']
    
    all_files = []
    for root, dirs, files in os.walk(repo_path):
        # Skip hidden directories and .git
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != '.git']
        
        # Add to directory list
        rel_dir = os.path.relpath(root, repo_path)
        if rel_dir != '.' and not rel_dir.startswith('.'):
            stats['directories'].append(rel_dir)
        
        for filename in files:
            # Skip hidden files
            if filename.startswith('.'):
                continue
                
            file_path = os.path.join(root, filename)
            rel_path = os.path.relpath(file_path, repo_path)
            ext = os.path.splitext(filename)[1].lower()
            
            # Skip very large files
            try:
                size = os.path.getsize(file_path)
                if size > 1000000:  # 1MB
                    continue
                
                # Aggregate statistics
                stats['total_files'] += 1
                
                # Categorize file types
                if ext in code_extensions:
                    stats['code_files'] += 1
                elif ext in doc_extensions:
                    stats['doc_files'] += 1
                else:
                    stats['other_files'] += 1
                
                # Count file types
                if ext not in stats['file_types']:
                    stats['file_types'][ext] = 0
                stats['file_types'][ext] += 1
                
                # Track file info for largest files
                all_files.append((rel_path, size, ext))
            except (IOError, OSError):
                # Skip files that can't be accessed
                continue
    
    # Get top 10 largest files
    all_files.sort(key=lambda x: x[1], reverse=True)
    stats['largest_files'] = [(path, size) for path, size, _ in all_files[:10]]
    
    # Limit the number of directories shown
    stats['directories'] = stats['directories'][:20]
    
    return stats

@app.route('/validate-repository')
def validate_repository_endpoint():
    """API endpoint to validate a repository path."""
    repo_path = request.args.get('path')
    is_github_param = request.args.get('is_github', 'false').lower() == 'true'
    
    if not repo_path:
        return jsonify({
            'valid': False,
            'message': 'Repository path or GitHub URL is required'
        })
    
    # Check if it's a GitHub URL (either from parameter or by detecting URL)
    if is_github_param or is_github_url(repo_path):
        try:
            # Extract repository name first (for display)
            repo_name = extract_repo_name_from_url(repo_path)
            
            # Actually download the repository to get stats
            logger.info(f"Downloading GitHub repository for validation: {repo_path}")
            branch = request.args.get('branch', 'main')
            # For validation, we want to fetch all branches to show them in the dropdown
            temp_repo_path = download_github_repo(repo_path, branch, fetch_all_branches=True)
            
            # Get repository statistics from the downloaded repo
            repo_stats = get_repository_stats(temp_repo_path)
            
            # Get branch information from the repository
            branches = get_repository_branches(temp_repo_path)
            
            # Clean up the temporary repository - we'll download it again during the actual audit
            try:
                import shutil
                shutil.rmtree(temp_repo_path)
                logger.info(f"Cleaned up temporary repository: {temp_repo_path}")
            except Exception as cleanup_error:
                logger.error(f"Error cleaning up temp directory: {cleanup_error}")
            
            response_data = {
                'valid': True,
                'is_github_url': True,
                'message': f"Valid GitHub repository URL: {repo_path}",
                'github_url': repo_path,
                'repo_name': repo_name,
                'stats': repo_stats,
                'branches': branches
            }
            
            return jsonify(response_data)
        except Exception as e:
            logger.error(f"Error validating GitHub repository: {e}", exc_info=True)
            return jsonify({
                'valid': False,
                'is_github_url': True,
                'message': f"Error validating GitHub repository: {str(e)}"
            })
            
    
    # Local repository path validation
    
    # Expand path if it contains a tilde
    if '~' in repo_path:
        repo_path = os.path.expanduser(repo_path)
    
    # Convert to absolute path if it's relative
    if not os.path.isabs(repo_path):
        repo_path = os.path.abspath(repo_path)
    
    # Validate repository
    is_valid, message = validate_repository_path(repo_path)
    
    if is_valid:
        # Get repository stats
        stats = get_repository_stats(repo_path)
        # Get branch information for local repositories
        branches = get_repository_branches(repo_path)
        return jsonify({
            'valid': True,
            'is_github_url': False,
            'message': message,
            'stats': stats,
            'branches': branches
        })
    else:
        return jsonify({
            'valid': False,
            'is_github_url': False,
            'message': message
        })

@app.route('/repository-structure')
def repository_structure_endpoint():
    """API endpoint to get the directory structure of a repository."""
    repo_path = request.args.get('path')
    
    if not repo_path:
        return jsonify({
            'error': 'Repository path is required'
        })
    
    # Expand and convert path
    if '~' in repo_path:
        repo_path = os.path.expanduser(repo_path)
    if not os.path.isabs(repo_path):
        repo_path = os.path.abspath(repo_path)
    
    # Check if path exists
    if not os.path.isdir(repo_path):
        return jsonify({
            'error': f'Directory does not exist: {repo_path}'
        })
    
    # Get directories
    try:
        directories = []
        for item in os.listdir(repo_path):
            if os.path.isdir(os.path.join(repo_path, item)) and not item.startswith('.'):
                directories.append(item)
        
        return jsonify({
            'directories': sorted(directories)
        })
    except Exception as e:
        return jsonify({
            'error': f'Error getting directory structure: {str(e)}'
        })

@app.route('/directory-contents')
def directory_contents_endpoint():
    """API endpoint to get the contents of a directory."""
    path = request.args.get('path', '/')
    
    # For security, we'll limit this to just returning directories, not files
    try:
        if path == '/':
            # For root, just return some common top-level directories
            directories = ['home', 'var', 'opt', 'usr', 'tmp', 'mnt', 'etc']
        else:
            # For any other path, check if it exists first
            if not os.path.isdir(path):
                return jsonify({
                    'error': f'Directory does not exist: {path}'
                })
            
            # List directories only (not files)
            directories = []
            for item in os.listdir(path):
                item_path = os.path.join(path, item)
                if os.path.isdir(item_path) and not item.startswith('.'):
                    directories.append(item)
        
        return jsonify({
            'directories': sorted(directories)
        })
    except Exception as e:
        return jsonify({
            'error': f'Error getting directory contents: {str(e)}'
        })

# Progress tracking infrastructure
class AuditStep(Enum):
    REPO_VALIDATION = auto()
    FILE_GATHERING = auto()
    CODE_ANALYSIS = auto()
    REPORT_GENERATION = auto()
    
@dataclass
class CategoryProgress:
    name: str
    max_points: int
    score: Optional[int] = None
    completed: bool = False

@dataclass
class AuditProgress:
    id: str
    repo_path: str
    branch: str
    repo_name: Optional[str] = None  # Store original repo name for GitHub repositories
    steps: Dict[str, int] = field(default_factory=lambda: {
        "repo_validation": 0,
        "file_gathering": 0,
        "code_analysis": 0,
        "report_generation": 0
    })
    current_task: str = "Initializing..."
    overall_percentage: int = 0
    categories_pending: List[Dict] = field(default_factory=list)
    categories_completed: List[Dict] = field(default_factory=list)
    report_id: Optional[int] = None
    error: Optional[str] = None
    
    def update_step_progress(self, step: AuditStep, percentage: int, task_description: str = None):
        """Update progress for a specific step"""
        step_name = step.name.lower()
        step_key = {
            "repo_validation": "repo_validation",
            "file_gathering": "file_gathering",
            "code_analysis": "code_analysis", 
            "report_generation": "report_generation"
        }.get(step_name, step_name)
        
        self.steps[step_key] = percentage
        
        if task_description:
            self.current_task = task_description
            
        # Calculate overall percentage
        total = sum(self.steps.values())
        self.overall_percentage = min(100, total // len(self.steps))
    
    def add_pending_category(self, name: str, max_points: int):
        """Add a category to the pending list"""
        self.categories_pending.append({
            "name": name,
            "max_points": max_points,
            "score": None
        })
    
    def complete_category(self, name: str, score: int):
        """Mark a category as completed"""
        # Remove from pending
        pending = [c for c in self.categories_pending if c["name"] != name]
        
        # Find the max points
        max_points = next((c["max_points"] for c in self.categories_pending if c["name"] == name), 10)
        
        # Add to completed
        self.categories_completed.append({
            "name": name,
            "max_points": max_points,
            "score": score
        })
        
        # Update pending list
        self.categories_pending = pending
    
    def set_report_id(self, report_id: int):
        """Set the final report ID"""
        self.report_id = report_id
        self.overall_percentage = 100
        self.current_task = "Audit complete! Generating final report..."
    
    def set_error(self, error_message: str):
        """Set an error message"""
        self.error = error_message
        self.current_task = "Error encountered"

# Dictionary to store audit progress by ID
audit_progress_store = {}

@app.route('/debug-repository')
def debug_repository():
    """Debug repository files and structure."""
    repo_path = session.get('repo_path')
    
    if not repo_path:
        flash('Repository information not found', 'error')
        return redirect(url_for('audit'))
    
    # Get repository statistics
    repo_stats = get_repository_stats(repo_path)
    
    # Get sample file contents
    code_samples = []
    extensions = ['.js', '.ts', '.py', '.rs', '.go', '.java', '.jsx', '.tsx']
    count = 0
    
    for root, _, files in os.walk(repo_path):
        if count >= 5:  # Limit to 5 code samples
            break
            
        for file in files:
            if count >= 5:
                break
                
            ext = os.path.splitext(file)[1].lower()
            if ext in extensions:
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, repo_path)
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read(1000)  # First 1000 chars
                    
                    code_samples.append({
                        'path': rel_path,
                        'content': content[:1000] + ('...' if len(content) > 1000 else '')
                    })
                    count += 1
                except:
                    pass
    
    return render_template(
        'debug_repository.html',
        repo_path=repo_path,
        repo_stats=repo_stats,
        code_samples=code_samples
    )

@app.route('/audit-progress')
def audit_progress():
    """Show the audit progress page."""
    # Get progress ID from session
    progress_id = session.get('audit_progress_id')
    
    if not progress_id or progress_id not in audit_progress_store:
        flash('No audit in progress', 'error')
        return redirect(url_for('audit'))
    
    # Get progress data
    progress = audit_progress_store[progress_id]
    
    # If complete, redirect to report
    if progress.report_id and progress.overall_percentage >= 100:
        return redirect(url_for('view_report', report_id=progress.report_id))
    
    return render_template('audit_progress.html', progress=progress)

@app.route('/check-audit-progress')
def check_audit_progress():
    """Check the current audit progress."""
    # Get progress ID from session
    progress_id = session.get('audit_progress_id')
    
    if not progress_id or progress_id not in audit_progress_store:
        # Instead of error redirection, show a progress page with initialization state
        # This is for cases where JS might make API calls before the audit is fully registered
        progress = AuditProgress(
            id="initializing",
            repo_path="",
            branch="",
            current_task="Initializing audit, please wait...",
            overall_percentage=0
        )
        return render_template('audit_progress.html', progress=progress, initializing=True)
    
    # Get progress data
    progress = audit_progress_store[progress_id]
    
    # If complete with a report ID, redirect to report
    if progress.report_id and progress.overall_percentage >= 100:
        return redirect(url_for('view_report', report_id=progress.report_id))
    
    # Otherwise, return to progress page
    return render_template('audit_progress.html', progress=progress)

@app.route('/api/audit-progress')
def api_audit_progress():
    """
    API endpoint to check the current audit progress.
    
    ### IMPORTANT WARNING - RACE CONDITION HANDLING ###
    This endpoint is designed to handle a critical race condition between
    the initialization of an audit and the first AJAX call from the frontend.
    
    DO NOT modify the behavior where this returns a 200 status with initialization data
    instead of an error when the audit progress isn't found. This approach prevents
    the "No audit in progress" error that occurs when the frontend JS makes its first
    AJAX call before the audit job is fully registered in the server's memory.
    
    Any changes to this endpoint should be thoroughly tested with new audits
    to ensure the race condition isn't reintroduced.
    """
    # Get progress ID from session
    progress_id = session.get('audit_progress_id')
    
    if not progress_id or progress_id not in audit_progress_store:
        # Instead of returning an error, return a status indicating initialization
        # This is critical for handling the race condition with the frontend
        return jsonify({
            "status": "initializing",
            "message": "Audit is initializing, please wait...",
            "overall_percentage": 0,
            "current_task": "Initializing audit...",
            "steps": {
                "repo_validation": 0,
                "file_gathering": 0,
                "code_analysis": 0,
                "report_generation": 0
            },
            "categories_completed": [],
            "categories_pending": [],
            "report_id": None,
            "error": None
        }), 200  # Return 200 OK, not 404 - this is intentional
    
    # Get progress data
    progress = audit_progress_store[progress_id]
    
    # Convert progress data to JSON-serializable dict
    progress_data = {
        "status": "in_progress",
        "overall_percentage": progress.overall_percentage,
        "current_task": progress.current_task,
        "steps": progress.steps,
        "categories_completed": progress.categories_completed,
        "categories_pending": progress.categories_pending,
        "report_id": progress.report_id,
        "error": progress.error
    }
    
    return jsonify(progress_data)

def run_audit_in_background(progress_id, repo_path, branch, config):
    """
    Run the audit process in a background thread with progress updates.
    
    Args:
        progress_id: ID of the audit progress
        repo_path: Path to the repository
        branch: Branch name
        config: Configuration dictionary
    """
    progress = audit_progress_store[progress_id]
    
    try:
        # Initialize AI client
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            progress.set_error('OpenAI API key not found. Please set the OPENAI_API_KEY environment variable.')
            return
        
        # Import required modules for plugin loading
        try:
            import tomllib  # Python 3.11+
        except ImportError:
            import tomli as tomllib  # Before Python 3.11
            
        from audit_near.plugins.loader import loader
        from audit_near.plugins.management import init_plugins_directory
        from audit_near.plugins.registry import registry
        
        # Initialize the plugins directory and load all plugins
        plugins_dir = init_plugins_directory()
        loaded_plugins = loader.load_plugins()
        logger.info(f"Loaded {len(loaded_plugins)} plugins before audit: {', '.join(loaded_plugins)}")
        
        # Log registry state
        all_categories = registry.get_all_category_ids()
        logger.info(f"Available categories in registry: {', '.join(all_categories)}")
        
        # Check if UX Design and Blockchain Integration are in the configuration
        logger.info(f"Selected categories for audit: {', '.join(config['categories'].keys())}")
        
        # Update progress - Repo validation (10%)
        progress.update_step_progress(
            AuditStep.REPO_VALIDATION, 25, 
            "Validating repository and initializing systems..."
        )
        
        ai_client = AiClient(api_key=api_key, config=config)
        
        # Initialize repo provider with branch
        progress.update_step_progress(
            AuditStep.REPO_VALIDATION, 50, 
            "Initializing repository provider..."
        )
        
        repo_provider = RepoProvider(repo_path=repo_path, branch=branch)
        
        # Update progress - Repo validation complete
        progress.update_step_progress(
            AuditStep.REPO_VALIDATION, 100, 
            "Repository validated successfully!"
        )
        
        # Update progress - File gathering (start)
        progress.update_step_progress(
            AuditStep.FILE_GATHERING, 10, 
            "Collecting files from repository..."
        )
        
        # Get files from repo
        files = list(repo_provider.get_files())
        
        # Log detailed information about the files being processed
        logger.info(f"Repository: {repo_path}, Branch: {branch}")
        logger.info(f"Number of files retrieved: {len(files)}")
        
        # Check if we have enough code files for analysis
        code_extensions = ['.js', '.ts', '.py', '.rs', '.go', '.java', '.c', '.cpp', '.jsx', '.tsx']
        code_files = [f for f in files if os.path.splitext(f[0])[1].lower() in code_extensions]
        
        logger.info(f"Number of code files: {len(code_files)}")
        
        # Update progress - File gathering (50%)
        progress.update_step_progress(
            AuditStep.FILE_GATHERING, 50, 
            f"Found {len(files)} files, including {len(code_files)} code files."
        )
        
        # Initialize repository analyzer to provide enhanced analysis
        repo_analyzer = RepoAnalyzer(repo_path=repo_path, branch=branch)
        
        # Update progress - File gathering (70%)
        progress.update_step_progress(
            AuditStep.FILE_GATHERING, 70, 
            "Analyzing repository structure and language usage..."
        )
        
        # Log analyzer info
        repo_analysis = repo_analyzer.analyze()
        
        # Update progress - File gathering complete
        progress.update_step_progress(
            AuditStep.FILE_GATHERING, 100, 
            "File gathering and analysis complete!"
        )
        
        # Get category handlers, passing branch parameter
        category_handlers = get_category_handlers(config, ai_client, repo_path, branch)
        
        # Update category list in progress
        for category_name, handler in category_handlers.items():
            max_points = config['categories'][category_name]['max_points']
            progress.add_pending_category(category_name, max_points)
        
        # Update progress - AI Analysis (start)
        progress.update_step_progress(
            AuditStep.CODE_ANALYSIS, 5, 
            "Starting AI code analysis..."
        )
        
        # Process each category
        results = {}
        total_score = 0
        total_possible = 0
        
        # Calculate progress increment per category
        analysis_increment = 90 // len(category_handlers) if category_handlers else 90
        analysis_progress = 5  # Start at 5%
        
        for category_name, handler in category_handlers.items():
            # Update progress for this category
            progress.update_step_progress(
                AuditStep.CODE_ANALYSIS, 
                analysis_progress + analysis_increment // 2,
                f"Analyzing {category_name}..."
            )
            
            # Process the category
            logger.info(f"Processing category: {category_name}")
            score, feedback = handler.process(files)
            
            # Update progress
            max_points = config['categories'][category_name]['max_points']
            total_possible += max_points
            total_score += score
            
            # Store results
            results[category_name] = {
                'score': score,
                'max_points': max_points,
                'feedback': feedback
            }
            
            # Mark category as complete
            progress.complete_category(category_name, score)
            
            # Increment progress
            analysis_progress += analysis_increment
            progress.update_step_progress(
                AuditStep.CODE_ANALYSIS, 
                analysis_progress,
                f"Completed analysis of {category_name}."
            )
        
        # Don't mark AI code analysis as 100% complete here; we'll set it to 95% instead
        # The final 5% will be set after all report generation is complete
        progress.update_step_progress(
            AuditStep.CODE_ANALYSIS, 95, 
            "AI code analysis in final stage..."
        )
        
        # Update progress - Report generation (start)
        progress.update_step_progress(
            AuditStep.REPORT_GENERATION, 20, 
            "Collecting repository metadata..."
        )
        
        # Get repository metadata
        original_url = None
        if hasattr(progress, 'github_url'):
            original_url = progress.github_url
        else:
            # Try to get GitHub URL from session
            try:
                with app.app_context():
                    original_url = session.get('github_url')
            except:
                pass
        
        # Collect repository metadata
        repo_metadata = get_repo_metadata(repo_path, original_url)
        logger.info(f"Collected repository metadata: {json.dumps(repo_metadata)}")
        
        # Update progress
        progress.update_step_progress(
            AuditStep.REPORT_GENERATION, 40, 
            "Generating audit report..."
        )
        
        # Generate markdown report file
        with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.md') as f:
            temp_report_path = f.name
        
        reporter = MarkdownReporter()
        reporter.generate_report(
            repo_path=repo_path,
            branch=branch,
            results=results,
            total_score=total_score,
            total_possible=total_possible,
            output_path=temp_report_path,
            metadata=repo_metadata
        )
        
        # Update progress - Report generation (50%)
        progress.update_step_progress(
            AuditStep.REPORT_GENERATION, 60, 
            "Saving report to database..."
        )
        
        # Read the report content
        with open(temp_report_path, 'r') as f:
            report_content = f.read()
        
        # Save to database with the correct repository name
        # For GitHub repositories, we want to use the original repo name, not the temp folder name
        repo_name = progress.repo_name if hasattr(progress, 'repo_name') else None
        
        if not repo_name:
            # If it wasn't set in the progress, try getting it from session
            try:
                with app.app_context():
                    repo_name = session.get('original_repo_name') or session.get('repo_name')
            except:
                # Fall back to basename if session access fails
                pass
        
        # Use repository metadata if available
        if not repo_name and repo_metadata.get('repo_name'):
            repo_name = repo_metadata['repo_name']
                
        if not repo_name:
            # Last resort fallback
            repo_name = os.path.basename(repo_path)
            
        new_report = AuditReport(
            repo_name=repo_name,
            repo_path=repo_path,
            branch=branch,
            total_score=total_score,
            total_possible=total_possible,
            report_data=json.dumps(results),
            repo_metadata=json.dumps(repo_metadata)
        )
        
        # Update progress - Report generation (75%)
        progress.update_step_progress(
            AuditStep.REPORT_GENERATION, 75, 
            "Finalizing report..."
        )
        
        with app.app_context():
            db.session.add(new_report)
            db.session.commit()
            report_id = new_report.id
        
        # Clean up
        os.unlink(temp_report_path)
        
        # Update progress - Report generation complete
        progress.update_step_progress(
            AuditStep.REPORT_GENERATION, 100, 
            "Audit completed successfully!"
        )
        
        # Now mark the AI code analysis as 100% complete
        progress.update_step_progress(
            AuditStep.CODE_ANALYSIS, 100, 
            "AI code analysis complete!"
        )
        
        # Set final report ID
        progress.set_report_id(report_id)
        
    except Exception as e:
        logger.exception("Error running audit")
        progress.set_error(f"Error running audit: {str(e)}")

@app.route('/run-audit')
def run_audit():
    """Run the audit process."""
    # Get data from session
    repo_path = session.get('repo_path')
    branch = session.get('branch', 'main')
    
    if not repo_path:
        flash('Repository information not found', 'error')
        return redirect(url_for('audit'))
    
    # Double-check validation just to be safe
    validation_result, validation_message = validate_repository_path(repo_path)
    if not validation_result:
        flash(validation_message, 'error')
        flash('Please select a valid repository with source code files.', 'error')
        return redirect(url_for('audit'))
    
    try:
        # Use the configuration from the audit form (if available)
        if 'audit_config' in session and session['audit_config'].get('categories'):
            config = {
                "categories": session['audit_config']['categories']
            }
            logger.info(f"Using custom configuration with categories: {list(config['categories'].keys())}")
        else:
            # Fall back to default config file if no custom config is available
            config_path = os.path.join(os.path.dirname(__file__), 'configs', 'near_hackathon.toml')
            config = load_config(config_path)
            logger.info("Using default configuration from near_hackathon.toml")
        
        # Create a progress tracker
        progress_id = str(uuid.uuid4())
        
        # Get the repository name - prefer original_repo_name for GitHub repositories
        repo_name = session.get('original_repo_name') or session.get('repo_name') or os.path.basename(repo_path)
        
        progress = AuditProgress(
            id=progress_id,
            repo_path=repo_path,
            branch=branch,
            repo_name=repo_name  # Set the repository name for reports
        )
        
        # Store in global store and session
        audit_progress_store[progress_id] = progress
        session['audit_progress_id'] = progress_id
        
        # Initialize progress - starting repo validation
        progress.update_step_progress(
            AuditStep.REPO_VALIDATION, 10, 
            "Starting repository validation..."
        )
        
        # Start the audit in a background thread
        background_thread = threading.Thread(
            target=run_audit_in_background,
            args=(progress_id, repo_path, branch, config)
        )
        background_thread.daemon = True
        background_thread.start()
        
        # Redirect to progress page
        return redirect(url_for('audit_progress'))
        
    except Exception as e:
        logger.exception("Error starting audit")
        flash(f'Error starting audit: {str(e)}', 'error')
        return redirect(url_for('audit'))

@app.route('/reports/<int:report_id>')
def view_report(report_id):
    """View a specific audit report."""
    with app.app_context():
        report = AuditReport.query.get_or_404(report_id)
        results = json.loads(report.report_data)
    
    return render_template(
        'report.html',
        report=report,
        results=results,
        percentage=(report.total_score / report.total_possible) * 100 if report.total_possible > 0 else 0
    )

@app.route('/api/reports/<int:report_id>')
def api_report(report_id):
    """API endpoint for retrieving report data."""
    with app.app_context():
        report = AuditReport.query.get_or_404(report_id)
        results = json.loads(report.report_data)
    
    return jsonify({
        'id': report.id,
        'repo_name': report.repo_name,
        'repo_path': report.repo_path,
        'branch': report.branch,
        'total_score': report.total_score,
        'total_possible': report.total_possible,
        'percentage': (report.total_score / report.total_possible) * 100 if report.total_possible > 0 else 0,
        'created_at': report.created_at.isoformat(),
        'results': results
    })

@app.route('/reports')
def list_reports():
    """List all audit reports."""
    with app.app_context():
        reports = AuditReport.query.order_by(AuditReport.created_at.desc()).all()
    
    return render_template('reports.html', reports=reports)

@app.route('/download-report/<int:report_id>')
def download_report(report_id):
    """Download a report as markdown."""
    with app.app_context():
        report = AuditReport.query.get_or_404(report_id)
        results = json.loads(report.report_data)
        
        # Parse repo metadata if available
        repo_metadata = None
        if report.repo_metadata:
            try:
                repo_metadata = json.loads(report.repo_metadata)
                logger.info(f"Loaded repository metadata for report {report_id}")
            except Exception as e:
                logger.error(f"Error parsing repository metadata: {e}")
    
    # Generate markdown report file
    with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.md') as f:
        temp_report_path = f.name
    
    reporter = MarkdownReporter()
    reporter.generate_report(
        repo_path=report.repo_path,
        branch=report.branch,
        results=results,
        total_score=report.total_score,
        total_possible=report.total_possible,
        output_path=temp_report_path,
        metadata=repo_metadata
    )
    
    # Schedule a background task to clean up the temporary file after a delay
    # This is a better approach than using @app.after_request inside a route
    def delayed_cleanup():
        time.sleep(60)  # Give plenty of time for the download to complete
        try:
            if os.path.exists(temp_report_path):
                os.unlink(temp_report_path)
                logger.debug(f"Cleaned up temporary report file: {temp_report_path}")
        except Exception as e:
            logger.error(f"Error cleaning up temp file: {e}")
    
    # Start cleanup in a background thread
    cleanup_thread = threading.Thread(target=delayed_cleanup)
    cleanup_thread.daemon = True
    cleanup_thread.start()
    
    return send_file(
        temp_report_path,
        as_attachment=True,
        download_name=f"{report.repo_name}_audit_report.md"
    )

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)