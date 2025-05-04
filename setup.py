"""
Setup script for the audit-near package.
"""

from setuptools import find_packages, setup

with open("README.md", "r", encoding="utf-8") as f:
    long_description = f.read()

setup(
    name="audit-near",
    version="0.1.0",
    description="Command-line tool for auditing NEAR-based hackathon projects",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="NEAR Hackathon Auditor Team",
    author_email="example@example.com",
    url="https://github.com/example/audit-near",
    packages=find_packages(),
    include_package_data=True,
    python_requires=">=3.7",
    install_requires=[
        "openai>=1.1.0",
        "tomli>=2.0.0;python_version<'3.11'",
    ],
    entry_points={
        "console_scripts": [
            "audit-near=audit_near.cli:main",
        ],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: Apache Software License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
    ],
)
