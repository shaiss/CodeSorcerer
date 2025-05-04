"""
Git metadata analyzer for repository assessment.

This module provides functionality to analyze Git metadata
for evaluating project maturity and team activity.
"""

import logging
import os
import re
import subprocess
from datetime import datetime
from typing import Dict, List, Set, Tuple, Any, Optional


class GitAnalyzer:
    """
    Analyzer for Git repository metadata.
    
    This class provides methods to analyze Git metadata
    for evaluating project maturity and team activity.
    """
    
    def __init__(self, repo_path: str):
        """
        Initialize the Git analyzer.
        
        Args:
            repo_path: Path to the repository
        """
        self.repo_path = os.path.abspath(repo_path)
        self.logger = logging.getLogger(__name__)
        
        # Check if the repository has a .git directory
        self.is_git_repo = os.path.isdir(os.path.join(self.repo_path, '.git'))
        
        if not self.is_git_repo:
            self.logger.warning(f"Repository at {self.repo_path} is not a Git repository")
    
    def analyze(self) -> Dict[str, Any]:
        """
        Analyze Git metadata.
        
        Returns:
            Dictionary with Git analysis results
        """
        if not self.is_git_repo:
            return {
                'is_git_repo': False,
                'error': 'Not a Git repository',
            }
        
        try:
            results = {
                'is_git_repo': True,
                'commit_history': self._get_commit_history(),
                'branches': self._get_branches(),
                'tags': self._get_tags(),
                'contributors': self._get_contributors(),
                'file_history': self._get_file_history(),
                'activity_timeline': self._get_activity_timeline(),
            }
            
            # Add summary metrics
            results.update(self._calculate_summary_metrics(results))
            
            return results
        except Exception as e:
            self.logger.error(f"Error analyzing Git repository: {e}")
            return {
                'is_git_repo': True,
                'error': str(e),
            }
    
    def _run_git_command(self, command: List[str]) -> str:
        """
        Run a Git command and return the output.
        
        Args:
            command: Git command as a list of arguments
            
        Returns:
            Command output as a string
            
        Raises:
            subprocess.SubprocessError: If the command fails
        """
        try:
            # Add Git executable and repository path
            full_command = ['git', '-C', self.repo_path] + command
            
            # Run the command
            return subprocess.check_output(
                full_command,
                encoding='utf-8',
                errors='replace',
                stderr=subprocess.PIPE
            )
        except subprocess.SubprocessError as e:
            self.logger.error(f"Git command failed: {e}")
            raise
    
    def _get_commit_history(self) -> List[Dict[str, Any]]:
        """
        Get the commit history.
        
        Returns:
            List of commit dictionaries
        """
        # Get commit log with author, date, and subject
        output = self._run_git_command([
            'log',
            '--pretty=format:%H|%an|%ae|%at|%s',
            '--max-count=500',  # Limit to 500 commits for performance
        ])
        
        commits = []
        for line in output.splitlines():
            parts = line.split('|')
            if len(parts) >= 5:
                commit_hash, author_name, author_email, timestamp, subject = parts
                
                commits.append({
                    'hash': commit_hash,
                    'author_name': author_name,
                    'author_email': author_email,
                    'timestamp': int(timestamp),
                    'date': datetime.fromtimestamp(int(timestamp)).strftime('%Y-%m-%d %H:%M:%S'),
                    'subject': subject,
                })
        
        return commits
    
    def _get_branches(self) -> List[str]:
        """
        Get the branches in the repository.
        
        Returns:
            List of branch names
        """
        output = self._run_git_command(['branch', '-a', '--format=%(refname:short)'])
        return [branch.strip() for branch in output.splitlines() if branch.strip()]
    
    def _get_tags(self) -> List[Dict[str, Any]]:
        """
        Get the tags in the repository.
        
        Returns:
            List of tag dictionaries
        """
        output = self._run_git_command(['tag', '-l', '--format=%(refname:short)|%(creatordate:unix)'])
        
        tags = []
        for line in output.splitlines():
            parts = line.split('|')
            if len(parts) == 2:
                tag_name, timestamp = parts
                
                tags.append({
                    'name': tag_name,
                    'timestamp': int(timestamp) if timestamp else 0,
                    'date': datetime.fromtimestamp(int(timestamp)).strftime('%Y-%m-%d %H:%M:%S') if timestamp else '',
                })
        
        return tags
    
    def _get_contributors(self) -> List[Dict[str, Any]]:
        """
        Get the contributors to the repository.
        
        Returns:
            List of contributor dictionaries
        """
        output = self._run_git_command([
            'shortlog',
            '-sne',
            'HEAD',
        ])
        
        contributors = []
        for line in output.splitlines():
            parts = line.strip().split('\t')
            if len(parts) == 2:
                count = int(parts[0].strip())
                author_info = parts[1].strip()
                
                # Extract name and email
                name_email_match = re.search(r'(.*)\s+<(.*)>', author_info)
                if name_email_match:
                    name, email = name_email_match.groups()
                else:
                    name, email = author_info, ''
                
                contributors.append({
                    'name': name,
                    'email': email,
                    'commit_count': count,
                })
        
        return contributors
    
    def _get_file_history(self) -> Dict[str, Dict[str, Any]]:
        """
        Get the history of files in the repository.
        
        Returns:
            Dictionary mapping file paths to history dictionaries
        """
        # Get a list of all files
        output = self._run_git_command(['ls-files'])
        all_files = [file.strip() for file in output.splitlines() if file.strip()]
        
        file_history = {}
        for file_path in all_files:
            try:
                # Get the creation date (first commit)
                first_commit = self._run_git_command([
                    'log',
                    '--follow',
                    '--format=%at',
                    '--reverse',
                    '--max-count=1',
                    '--',
                    file_path,
                ])
                
                # Get the last modification date
                last_commit = self._run_git_command([
                    'log',
                    '--format=%at',
                    '--max-count=1',
                    '--',
                    file_path,
                ])
                
                # Get the number of changes
                changes = self._run_git_command([
                    'log',
                    '--follow',
                    '--oneline',
                    '--',
                    file_path,
                ])
                
                # Convert dates to timestamps
                first_timestamp = int(first_commit.strip()) if first_commit.strip() else 0
                last_timestamp = int(last_commit.strip()) if last_commit.strip() else 0
                
                # Count changes
                change_count = len(changes.splitlines())
                
                file_history[file_path] = {
                    'created_at': first_timestamp,
                    'created_date': datetime.fromtimestamp(first_timestamp).strftime('%Y-%m-%d %H:%M:%S') if first_timestamp else '',
                    'last_modified_at': last_timestamp,
                    'last_modified_date': datetime.fromtimestamp(last_timestamp).strftime('%Y-%m-%d %H:%M:%S') if last_timestamp else '',
                    'change_count': change_count,
                }
            except Exception as e:
                self.logger.warning(f"Error getting history for file {file_path}: {e}")
        
        return file_history
    
    def _get_activity_timeline(self) -> Dict[str, int]:
        """
        Get the activity timeline (commits per day).
        
        Returns:
            Dictionary mapping dates to commit counts
        """
        output = self._run_git_command([
            'log',
            '--format=%at',
            '--max-count=1000',  # Limit to 1000 commits for performance
        ])
        
        timeline = {}
        for line in output.splitlines():
            if not line.strip():
                continue
                
            timestamp = int(line.strip())
            date = datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d')
            
            if date not in timeline:
                timeline[date] = 0
            
            timeline[date] += 1
        
        return timeline
    
    def _calculate_summary_metrics(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate summary metrics from collected data.
        
        Args:
            data: Dictionary with collected Git data
            
        Returns:
            Dictionary with summary metrics
        """
        summary = {}
        
        # Commit count and timespan
        commits = data.get('commit_history', [])
        summary['commit_count'] = len(commits)
        
        if commits:
            first_commit = commits[-1]['timestamp']
            last_commit = commits[0]['timestamp']
            
            summary['first_commit_timestamp'] = first_commit
            summary['first_commit_date'] = datetime.fromtimestamp(first_commit).strftime('%Y-%m-%d %H:%M:%S')
            summary['last_commit_timestamp'] = last_commit
            summary['last_commit_date'] = datetime.fromtimestamp(last_commit).strftime('%Y-%m-%d %H:%M:%S')
            
            # Project age in days
            summary['project_age_days'] = (last_commit - first_commit) // (24 * 3600)
            
            # Recent activity (commits in last 30 days)
            thirty_days_ago = int(datetime.now().timestamp()) - (30 * 24 * 3600)
            recent_commits = [c for c in commits if c['timestamp'] >= thirty_days_ago]
            summary['recent_commit_count'] = len(recent_commits)
        
        # Contributor count
        summary['contributor_count'] = len(data.get('contributors', []))
        
        # Branch and tag count
        summary['branch_count'] = len(data.get('branches', []))
        summary['tag_count'] = len(data.get('tags', []))
        
        # Activity metrics
        timeline = data.get('activity_timeline', {})
        if timeline:
            # Number of active days
            summary['active_days_count'] = len(timeline)
            
            # Most active day
            most_active_day = max(timeline.items(), key=lambda x: x[1])
            summary['most_active_day'] = most_active_day[0]
            summary['most_active_day_commits'] = most_active_day[1]
        
        return summary
    
    def check_for_release_tags(self) -> bool:
        """
        Check if the repository has release tags.
        
        Returns:
            True if release tags are found, False otherwise
        """
        if not self.is_git_repo:
            return False
            
        try:
            tags = self._get_tags()
            
            # Check for tags that look like versions
            version_pattern = r'v?\d+(\.\d+)+'
            version_tags = [tag for tag in tags if re.match(version_pattern, tag['name'])]
            
            return len(version_tags) > 0
        except Exception:
            return False
    
    def check_for_active_development(self, days: int = 30) -> bool:
        """
        Check if the repository has recent commits.
        
        Args:
            days: Number of days to consider recent
            
        Returns:
            True if recent commits are found, False otherwise
        """
        if not self.is_git_repo:
            return False
            
        try:
            # Get timestamp for the given number of days ago
            days_ago = int(datetime.now().timestamp()) - (days * 24 * 3600)
            
            # Get commits since then
            output = self._run_git_command([
                'log',
                f'--since={days_ago}',
                '--oneline',
            ])
            
            return bool(output.strip())
        except Exception:
            return False