# Code Sorcerer

[![Python 3.7+](https://img.shields.io/badge/python-3.7+-blue.svg)](https://www.python.org/downloads/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![AI Powered](https://img.shields.io/badge/AI-GPT--4.1-green.svg)](https://openai.com/)
[![NEAR Protocol](https://img.shields.io/badge/NEAR-Protocol-00D4FF.svg)](https://near.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A robust code auditing and analysis tool that leverages AI to evaluate software projects across multiple dimensions.

## 🎯 Features

- **Repository Analysis**: Analyze local repositories or GitHub projects
- **AI-Powered Evaluation**: Integrates with OpenAI GPT-4.1 for intelligent code analysis
- **Web Interface**: Intuitive browser-based interface for managing audits
- **Real-time Progress Tracking**: Monitor audit progress with live updates
- **Multi-category Evaluation**:
  - Code Quality
  - Functionality
  - Security
  - Innovation
  - Documentation
  - UX Design
  - Blockchain Integration
- **Detailed Reports**: Comprehensive Markdown reports with scoring and feedback
- **Customizable Configuration**: Configure categories and scoring criteria

## 📋 Prerequisites

- Python 3.7+
- OpenAI API key (environment variable: `OPENAI_API_KEY`)
- Git (for repository operations)

## 🚀 Getting Started

### Web Interface

1. Clone this repository:
   ```bash
   git clone https://github.com/username/code-sorcerer.git
   cd code-sorcerer
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up your OpenAI API key:
   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   ```

4. Start the web server:
   ```bash
   python main.py
   # Or use Gunicorn:
   gunicorn --bind 0.0.0.0:5000 main:app
   ```

5. Open your browser and navigate to http://localhost:5000

### Command Line Usage

```bash
# Run an audit on a local repository
python -m audit_near /path/to/repository

# Run an audit on a GitHub repository
python -m audit_near https://github.com/username/repository

# Run with a custom configuration file
python -m audit_near /path/to/repository --config /path/to/config.toml

# Output to a specific file
python -m audit_near /path/to/repository --output /path/to/output.md
```

## 🧩 Architecture

Code Sorcerer consists of the following key components:

- **Web Interface** - Flask-based web application for user interaction
- **Audit Engine** - Core audit processing and orchestration
- **Repository Providers** - Handling different repository sources (local, GitHub)
- **AI Client** - Integration with OpenAI for code analysis
- **Category Processors** - Analysis of specific project aspects
- **Report Generator** - Creation of detailed markdown reports

## 📊 Evaluation Categories

### Code Quality
Evaluates code structure, readability, maintainability, and adherence to best practices.

### Functionality
Assesses feature completeness, correctness, and robustness.

### Security
Evaluates security practices, vulnerability prevention, and data protection.

### Innovation
Measures originality, creativity, and novel approaches to problem-solving.

### Documentation
Assesses comprehensiveness, clarity, and helpfulness of documentation.

### UX Design
Evaluates usability, accessibility, and overall user experience.

### Blockchain Integration
Assesses proper integration with blockchain technologies and smart contracts.

## 📋 Sample Reports

The repository includes several sample audit reports for reference:

- [Smart Contract Project Audit](docs/report-samples/smart_contract_audit.md)
- [Web Application Audit](docs/report-samples/web_app_audit.md)
- [Frontend Application Audit](docs/report-samples/frontend_app_audit.md)
- [Blockchain Integration Audit](docs/report-samples/blockchain_integration_audit.md)

## ⚙️ Configuration

Code Sorcerer is highly configurable through TOML configuration files. The default configuration is located in `configs/near_hackathon.toml`.

Example configuration:

```toml
[general]
name = "Code Sorcerer"
version = "0.1.0"
description = "Comprehensive code audit and analysis tool"

[categories.code_quality]
name = "Code Quality"
max_points = 10
description = "Evaluates code structure, readability, maintainability, and adherence to best practices"

# Additional category configurations...

[ai]
primary_model = "gpt-4.1-2025-04-14"
nano_model = "gpt-4.1-nano-2025-04-14"
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.