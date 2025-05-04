"""
AI client for interacting with OpenAI models.

This module provides a client for interacting with OpenAI models,
specifically for analyzing various aspects of a codebase.
"""

import json
import logging
import os
from typing import Dict, Optional

from openai import OpenAI


class AiClient:
    """
    Client for interacting with OpenAI models.
    """
    
    def __init__(self, api_key: Optional[str] = None, config: Optional[Dict] = None):
        """
        Initialize the AI client.
        
        Args:
            api_key: OpenAI API key (default: None, falls back to environment variable)
            config: Configuration dictionary (default: None, will load default config)
        """
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key is required")
        
        self.client = OpenAI(api_key=self.api_key)
        self.logger = logging.getLogger(__name__)
        
        # Load config if not provided
        if config is None:
            import tomli
            config_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "configs",
                "near_hackathon.toml"
            )
            try:
                with open(config_path, "rb") as f:
                    config = tomli.load(f)
            except Exception as e:
                self.logger.warning(f"Could not load config file: {e}. Using default model names.")
                config = {"ai": {"primary_model": "gpt-4.1-2025-04-14", "nano_model": "gpt-4.1-nano-2025-04-14"}}
        
        # Define model names from config
        self.primary_model = config.get("ai", {}).get("primary_model", "gpt-4.1-2025-04-14")
        self.nano_model = config.get("ai", {}).get("nano_model", "gpt-4.1-nano-2025-04-14")
        
        self.logger.info(f"Using models: primary={self.primary_model}, nano={self.nano_model}")
    
    def _call_openai(
        self, 
        prompt: str, 
        system_prompt: str = None, 
        use_nano: bool = False,
        response_format: Dict = None
    ) -> Dict:
        """
        Call OpenAI API with the given prompt.
        
        Args:
            prompt: User prompt
            system_prompt: System prompt (default: None)
            use_nano: Whether to use the nano model (default: False)
            response_format: Response format specification (default: None)
            
        Returns:
            Dictionary with the parsed response
            
        Raises:
            Exception: If the API call fails
        """
        try:
            model = self.nano_model if use_nano else self.primary_model
            
            messages = []
            
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
                
            messages.append({"role": "user", "content": prompt})
            
            kwargs = {
                "model": model,
                "messages": messages,
                "max_tokens": 2000,
            }
            
            if response_format:
                kwargs["response_format"] = response_format
            
            # Debug logging for prompt size and content
            prompt_size = len(prompt)
            preview_length = min(100, len(prompt))
            prompt_preview = prompt[:preview_length] + ("..." if len(prompt) > preview_length else "")
            
            self.logger.info(f"Calling OpenAI API with model {model}")
            self.logger.info(f"Prompt size: {prompt_size} characters")
            self.logger.info(f"Prompt preview: {prompt_preview}")
            
            # Check if we have code in the prompt
            code_indicators = ["```", "def ", "class ", "function", "import ", "from ", "<script", "<template", "contract ", "fn "]
            has_code = any(indicator in prompt for indicator in code_indicators)
            if has_code:
                self.logger.info("Prompt contains code snippets")
            else:
                self.logger.warning("WARNING: Prompt does not appear to contain code snippets!")
                self.logger.warning("This may lead to 'no code provided' responses from OpenAI")
            
            # Log if prompt is very short
            if prompt_size < 1000:
                self.logger.warning(f"WARNING: Prompt is very short ({prompt_size} chars), may not contain enough context")
            
            # Save the full prompt to a file for debugging if it's unusually problematic
            if not has_code or prompt_size < 500:
                debug_file = f"debug_prompt_{model.replace('.', '_').replace('-', '_')}.txt"
                try:
                    with open(debug_file, "w") as f:
                        f.write("SYSTEM PROMPT:\n")
                        f.write(system_prompt or "None")
                        f.write("\n\nUSER PROMPT:\n")
                        f.write(prompt)
                    self.logger.info(f"Saved problematic prompt to {debug_file} for debugging")
                except Exception as e:
                    self.logger.warning(f"Could not save debug prompt: {e}")
            
            response = self.client.chat.completions.create(**kwargs)
            
            content = response.choices[0].message.content
            
            # Log response info
            response_size = len(content)
            response_preview = content[:100] + ("..." if len(content) > 100 else "")
            self.logger.info(f"Received response: {response_size} characters")
            self.logger.info(f"Response preview: {response_preview}")
            
            try:
                # Try to parse as JSON
                result = json.loads(content)
                self.logger.info("Response parsed as valid JSON")
                return result
            except json.JSONDecodeError:
                self.logger.warning("Response is not valid JSON, trying alternative parsing methods")
                # If not valid JSON, look for JSON object in the response
                try:
                    import re
                    json_match = re.search(r'```json\n(.*?)```', content, re.DOTALL)
                    if json_match:
                        result = json.loads(json_match.group(1))
                        self.logger.info("Extracted and parsed JSON from markdown code block")
                        return result
                    
                    # Try finding JSON without markdown code blocks
                    json_match = re.search(r'({[\s\S]*})', content)
                    if json_match:
                        result = json.loads(json_match.group(1))
                        self.logger.info("Extracted and parsed JSON from content")
                        return result
                        
                    # If we still can't parse it, return as text
                    self.logger.warning("Could not parse response as JSON, returning as text")
                    return {"feedback": content, "score": 0}
                except Exception as e:
                    # If all parsing attempts fail, just return the raw text
                    self.logger.warning(f"Error during alternate JSON parsing: {e}")
                    return {"feedback": content, "score": 0}
                
        except Exception as e:
            self.logger.error(f"Error calling OpenAI API: {e}")
            
            # More detailed error reporting
            if "maximum context length" in str(e).lower():
                self.logger.error("ERROR: Exceeded maximum context length!")
                self.logger.error(f"Prompt size: {len(prompt)} characters")
                self.logger.error(f"This error occurs when the prompt is too large for the model's context window.")
                self.logger.error(f"Try reducing the number of files or using a smaller subset of the code.")
            elif "rate limit" in str(e).lower():
                self.logger.error("ERROR: Hit OpenAI rate limits!")
                self.logger.error("Consider using a higher-tier API key or adding delays between requests.")
            
            raise
    
    def analyze_code_quality(self, prompt: str) -> Dict:
        """
        Analyze code quality using AI.
        
        Args:
            prompt: Prompt string
            
        Returns:
            Dictionary with analysis results
        """
        system_prompt = (
            "You are a code quality analysis expert. "
            "Analyze the provided code samples and rate them on a scale from 0 to 10. "
            "Consider factors like readability, maintainability, modularity, adherence to best practices, "
            "error handling, and code organization. "
            "Provide detailed feedback with specific examples and suggestions for improvement. "
            "Format your response as a JSON object with 'score' (integer) and 'feedback' (string) fields."
        )
        
        return self._call_openai(
            prompt=prompt,
            system_prompt=system_prompt,
            response_format={"type": "json_object"}
        )
    
    def analyze_functionality(self, prompt: str) -> Dict:
        """
        Analyze application functionality using AI.
        
        Args:
            prompt: Prompt string
            
        Returns:
            Dictionary with analysis results
        """
        system_prompt = (
            "You are an application functionality expert specializing in blockchain applications. "
            "Analyze the provided code files to evaluate functionality and completeness of the application. "
            "Consider factors like feature completeness, proper implementation of core features, "
            "error handling, edge cases, and overall robustness. "
            "Rate the functionality on a scale from 0 to 10. "
            "Format your response as a JSON object with 'score' (integer) and 'feedback' (string) fields."
        )
        
        return self._call_openai(
            prompt=prompt,
            system_prompt=system_prompt,
            response_format={"type": "json_object"}
        )
    
    def analyze_security(self, prompt: str) -> Dict:
        """
        Analyze security aspects using AI.
        
        Args:
            prompt: Prompt string
            
        Returns:
            Dictionary with analysis results
        """
        system_prompt = (
            "You are a security auditor specializing in blockchain applications. "
            "Analyze the provided code files to evaluate security practices and identify potential vulnerabilities. "
            "Consider factors like input validation, authentication, authorization, data sanitization, "
            "contract security, economic attack vectors, and adherence to security best practices. "
            "Rate the security on a scale from 0 to 10. "
            "Format your response as a JSON object with 'score' (integer) and 'feedback' (string) fields."
        )
        
        return self._call_openai(
            prompt=prompt,
            system_prompt=system_prompt,
            response_format={"type": "json_object"}
        )
    
    def analyze_innovation(self, prompt: str) -> Dict:
        """
        Analyze innovation aspects using AI.
        
        Args:
            prompt: Prompt string
            
        Returns:
            Dictionary with analysis results
        """
        system_prompt = (
            "You are an innovation expert specializing in blockchain applications. "
            "Analyze the provided code and project summary to evaluate innovation and creativity. "
            "Consider factors like novel use cases, creative solutions, technical innovation, "
            "market potential, and uniqueness compared to existing solutions. "
            "Rate the innovation on a scale from 0 to 10. "
            "Format your response as a JSON object with 'score' (integer) and 'feedback' (string) fields."
        )
        
        return self._call_openai(
            prompt=prompt,
            system_prompt=system_prompt,
            response_format={"type": "json_object"}
        )
    
    def analyze_documentation(self, prompt: str) -> Dict:
        """
        Analyze documentation quality using AI.
        
        Args:
            prompt: Prompt string
            
        Returns:
            Dictionary with analysis results
        """
        system_prompt = (
            "You are a documentation expert specializing in software projects. "
            "Analyze the provided documentation files and inline documentation statistics to evaluate quality. "
            "Consider factors like comprehensiveness, clarity, structure, examples, "
            "installation instructions, API documentation, and overall usability. "
            "Rate the documentation on a scale from 0 to 10. "
            "Format your response as a JSON object with 'score' (integer) and 'feedback' (string) fields."
        )
        
        return self._call_openai(
            prompt=prompt,
            system_prompt=system_prompt,
            response_format={"type": "json_object"}
        )
    
    def analyze_ux_design(self, prompt: str) -> Dict:
        """
        Analyze UX design quality using AI.
        
        Args:
            prompt: Prompt string
            
        Returns:
            Dictionary with analysis results
        """
        system_prompt = (
            "You are a UX design expert specializing in blockchain applications. "
            "Analyze the provided frontend files and UI descriptions to evaluate user experience quality. "
            "Consider factors like usability, accessibility, intuitive design, visual appeal, "
            "responsiveness, error handling, and user guidance. "
            "Rate the UX design on a scale from 0 to 10. "
            "Format your response as a JSON object with 'score' (integer) and 'feedback' (string) fields."
        )
        
        return self._call_openai(
            prompt=prompt,
            system_prompt=system_prompt,
            response_format={"type": "json_object"}
        )
    
    def analyze_blockchain_integration(self, prompt: str) -> Dict:
        """
        Analyze blockchain integration quality using AI.
        
        Args:
            prompt: Prompt string
            
        Returns:
            Dictionary with analysis results
        """
        system_prompt = (
            "You are a blockchain integration expert specializing in NEAR Protocol. "
            "Analyze the provided files and blockchain patterns to evaluate integration quality. "
            "Consider factors like proper use of NEAR APIs, contract interactions, wallet integration, "
            "error handling, gas efficiency, and adherence to NEAR best practices. "
            "Rate the blockchain integration on a scale from 0 to 10. "
            "Format your response as a JSON object with 'score' (integer) and 'feedback' (string) fields."
        )
        
        return self._call_openai(
            prompt=prompt,
            system_prompt=system_prompt,
            response_format={"type": "json_object"}
        )
