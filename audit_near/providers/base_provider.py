"""
Base provider interface for repository data.

This module defines the interface that all providers must implement.
"""

from abc import ABC, abstractmethod
from typing import Dict, Generator, Tuple


class BaseProvider(ABC):
    """
    Base class for repository providers.
    
    Repository providers are responsible for traversing repositories
    and yielding file paths and contents.
    """
    
    @abstractmethod
    def get_files(self) -> Generator[Tuple[str, str], None, None]:
        """
        Get files from the repository.
        
        Yields:
            Tuples of (file_path, file_content)
        """
        pass
