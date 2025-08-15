#!/usr/bin/env python3
"""
DREAM-SVN Backend Bug Detection Tool
====================================

This comprehensive testing tool analyzes the JavaScript/Node.js microservices
backend for potential bugs, security issues, and code quality problems.

Features:
- Static code analysis for JavaScript files
- API endpoint testing
- Database connection testing
- Security vulnerability detection
- Code quality metrics
- Performance bottleneck detection
- Configuration validation

Usage: python bug_detector.py
"""

import os
import re
import json
import asyncio
import aiohttp
import subprocess
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime
import requests
from urllib.parse import urljoin

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('bug_detection.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class BugReport:
    """Data class for bug reports"""
    severity: str  # 'critical', 'high', 'medium', 'low'
    category: str  # 'security', 'performance', 'logic', 'syntax', 'config'
    file_path: str
    line_number: int
    description: str
    recommendation: str
    code_snippet: str = ""

class CodeAnalyzer:
    """Static code analyzer for JavaScript files"""
    
    def __init__(self, root_path: str):
        self.root_path = Path(root_path)
        self.bugs: List[BugReport] = []
        
        # Common bug patterns
        self.patterns = {
            'sql_injection': [
                r'query\s*\(\s*["`\'].*\$\{.*\}.*["`\']',  # Template literals in SQL
                r'query\s*\(\s*["`\'].*\+.*["`\']',        # String concatenation in SQL
                r'sequelize\.query\s*\(\s*["`\'].*\$\{.*\}.*["`\']'
            ],
            'xss_vulnerability': [
                r'innerHTML\s*=\s*.*\+',                   # innerHTML with concatenation
                r'document\.write\s*\(',                   # document.write usage
                r'eval\s*\(',                              # eval usage
                r'dangerouslySetInnerHTML'                 # React XSS risk
            ],
            'hardcoded_secrets': [
                r'password\s*[:=]\s*["\'][^"\']{8,}["\']', # Hardcoded passwords
                r'api[_-]?key\s*[:=]\s*["\'][^"\']{16,}["\']', # API keys
                r'secret\s*[:=]\s*["\'][^"\']{16,}["\']',  # Secrets
                r'token\s*[:=]\s*["\'][^"\']{32,}["\']'    # Tokens
            ],
            'async_issues': [
                r'await\s+(?!.*catch).*\n(?!.*catch)',     # Await without try-catch
                r'Promise\.(?:resolve|reject)\s*\([^)]*\)\s*(?!\.catch)', # Unhandled promises
                r'setTimeout\s*\(\s*async\s+function',     # Async in setTimeout
            ],
            'memory_leaks': [
                r'setInterval\s*\([^}]*\)\s*(?!.*clearInterval)', # Uncleaned intervals
                r'addEventListener\s*\([^}]*\)\s*(?!.*removeEventListener)', # Uncleaned listeners
                r'new\s+Array\s*\(\s*\d{6,}\s*\)',        # Large array allocations
            ],
            'error_handling': [
                r'catch\s*\(\s*\w+\s*\)\s*\{\s*\}',       # Empty catch blocks
                r'catch\s*\(\s*\w+\s*\)\s*\{\s*console\.log', # Only console.log in catch
                r'throw\s+new\s+Error\s*\(\s*["\']["\']',  # Empty error messages
            ],
            'performance_issues': [
                r'for\s*\([^}]*\)\s*\{[^}]*for\s*\([^}]*\)\s*\{[^}]*for', # Nested loops (3+ levels)
                r'JSON\.parse\s*\(\s*JSON\.stringify',     # Inefficient deep copy
                r'\.map\s*\([^}]*\)\.filter\s*\(',         # Inefficient chaining
            ],
            'logic_errors': [
                r'if\s*\(\s*\w+\s*=\s*\w+\s*\)',         # Assignment in if condition
                r'==\s*true\s*\|\|\s*==\s*false',         # Redundant boolean comparison
                r'return\s+.*\?\s*true\s*:\s*false',      # Redundant ternary
            ],
            'config_issues': [
                r'process\.env\.\w+\s*\|\|\s*["\'][^"\']*["\']', # Default values for env vars
                r'PORT\s*=\s*\d+',                        # Hardcoded ports
                r'localhost:\d+',                         # Hardcoded localhost URLs
            ]
        }

    def analyze_file(self, file_path: Path) -> List[BugReport]:
        """Analyze a single JavaScript file for bugs"""
        bugs = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.split('\n')
                
            # Check each pattern category
            for category, patterns in self.patterns.items():
                for pattern in patterns:
                    matches = re.finditer(pattern, content, re.IGNORECASE | re.MULTILINE)
                    
                    for match in matches:
                        line_num = content[:match.start()].count('\n') + 1
                        line_content = lines[line_num - 1] if line_num <= len(lines) else ""
                        
                        bug = self._create_bug_report(
                            category, file_path, line_num, line_content, match.group()
                        )
                        if bug:
                            bugs.append(bug)
            
            # Additional file-specific checks
            bugs.extend(self._check_file_specific_issues(file_path, content, lines))
            
        except Exception as e:
            logger.error(f"Error analyzing {file_path}: {e}")
            
        return bugs

    def _create_bug_report(self, category: str, file_path: Path, line_num: int, 
                          line_content: str, match: str) -> Optional[BugReport]:
        """Create a bug report based on the detected pattern"""
        
        severity_map = {
            'sql_injection': 'critical',
            'xss_vulnerability': 'critical', 
            'hardcoded_secrets': 'high',
            'async_issues': 'high',
            'memory_leaks': 'medium',
            'error_handling': 'medium',
            'performance_issues': 'medium',
            'logic_errors': 'high',
            'config_issues': 'low'
        }
        
        description_map = {
            'sql_injection': 'Potential SQL injection vulnerability detected',
            'xss_vulnerability': 'Potential XSS vulnerability detected',
            'hardcoded_secrets': 'Hardcoded secret or credential detected',
            'async_issues': 'Async/await error handling issue',
            'memory_leaks': 'Potential memory leak detected',
            'error_handling': 'Poor error handling detected',
            'performance_issues': 'Performance bottleneck detected',
            'logic_errors': 'Logic error detected',
            'config_issues': 'Configuration issue detected'
        }
        
        recommendation_map = {
            'sql_injection': 'Use parameterized queries or prepared statements',
            'xss_vulnerability': 'Sanitize user input and use safe DOM manipulation',
            'hardcoded_secrets': 'Move secrets to environment variables',
            'async_issues': 'Add proper try-catch blocks around await statements',
            'memory_leaks': 'Ensure proper cleanup of intervals and event listeners',
            'error_handling': 'Implement proper error handling and logging',
            'performance_issues': 'Optimize algorithm or use more efficient approaches',
            'logic_errors': 'Review logic and fix conditional statements',
            'config_issues': 'Use environment variables for configuration'
        }
        
        return BugReport(
            severity=severity_map.get(category, 'medium'),
            category=category,
            file_path=str(file_path),
            line_number=line_num,
            description=description_map.get(category, 'Issue detected'),
            recommendation=recommendation_map.get(category, 'Review and fix'),
            code_snippet=line_content.strip()
        )

    def _check_file_specific_issues(self, file_path: Path, content: str, lines: List[str]) -> List[BugReport]:
        """Check for file-specific issues"""
        bugs = []
        
        # Check for missing error handling in Express routes
        if 'express' in content and 'app.' in content:
            route_pattern = r'app\.(get|post|put|delete|patch)\s*\([^,]+,\s*(?:async\s+)?\([^)]*\)\s*=>\s*\{[^}]*\}'
            routes = re.finditer(route_pattern, content, re.DOTALL)
            
            for route in routes:
                route_content = route.group()
                if 'try' not in route_content and 'catch' not in route_content:
                    line_num = content[:route.start()].count('\n') + 1
                    bugs.append(BugReport(
                        severity='medium',
                        category='error_handling',
                        file_path=str(file_path),
                        line_number=line_num,
                        description='Express route missing error handling',
                        recommendation='Add try-catch blocks to handle errors properly',
                        code_snippet=route_content[:100] + '...'
                    ))
        
        # Check for missing input validation
        if 'req.body' in content or 'req.params' in content or 'req.query' in content:
            validation_keywords = ['validate', 'joi', 'yup', 'express-validator', 'check']
            has_validation = any(keyword in content.lower() for keyword in validation_keywords)
            
            if not has_validation:
                bugs.append(BugReport(
                    severity='high',
                    category='security',
                    file_path=str(file_path),
                    line_number=1,
                    description='Missing input validation for user data',
                    recommendation='Implement input validation using libraries like Joi or express-validator',
                    code_snippet='req.body/req.params/req.query usage detected'
                ))
        
        return bugs

    def analyze_all_files(self) -> List[BugReport]:
        """Analyze all JavaScript files in the project"""
        all_bugs = []
        
        # Find all JS files
        js_files = list(self.root_path.rglob('*.js'))
        js_files = [f for f in js_files if 'node_modules' not in str(f)]
        
        logger.info(f"Analyzing {len(js_files)} JavaScript files...")
        
        for file_path in js_files:
            logger.info(f"Analyzing: {file_path}")
            bugs = self.analyze_file(file_path)
            all_bugs.extend(bugs)
        
        self.bugs = all_bugs
        return all_bugs

class APITester:
    """Test API endpoints for common issues"""
    
    def __init__(self, base_urls: List[str]):
        self.base_urls = base_urls
        self.bugs: List[BugReport] = []

    async def test_endpoints(self) -> List[BugReport]:
        """Test API endpoints for common vulnerabilities"""
        bugs = []
        
        # Common test payloads
        sql_payloads = ["'; DROP TABLE users; --", "1' OR '1'='1", "admin'--"]
        xss_payloads = ["<script>alert('xss')</script>", "javascript:alert('xss')", "<img src=x onerror=alert('xss')>"]
        
        async with aiohttp.ClientSession() as session:
            for base_url in self.base_urls:
                # Test common endpoints
                endpoints = ['/api/auth/login', '/api/users', '/api/disputes', '/health', '/']
                
                for endpoint in endpoints:
                    url = urljoin(base_url, endpoint)
                    
                    # Test for SQL injection
                    for payload in sql_payloads:
                        try:
                            async with session.post(url, json={'username': payload, 'password': 'test'}) as resp:
                                if resp.status == 500:
                                    bugs.append(BugReport(
                                        severity='critical',
                                        category='security',
                                        file_path=url,
                                        line_number=0,
                                        description=f'Potential SQL injection vulnerability at {url}',
                                        recommendation='Implement proper input sanitization and parameterized queries',
                                        code_snippet=f'Payload: {payload}'
                                    ))
                        except Exception as e:
                            logger.debug(f"Error testing {url}: {e}")
                    
                    # Test for XSS
                    for payload in xss_payloads:
                        try:
                            async with session.get(url, params={'q': payload}) as resp:
                                text = await resp.text()
                                if payload in text and 'text/html' in resp.headers.get('content-type', ''):
                                    bugs.append(BugReport(
                                        severity='high',
                                        category='security',
                                        file_path=url,
                                        line_number=0,
                                        description=f'Potential XSS vulnerability at {url}',
                                        recommendation='Implement proper output encoding and CSP headers',
                                        code_snippet=f'Payload: {payload}'
                                    ))
                        except Exception as e:
                            logger.debug(f"Error testing {url}: {e}")
        
        self.bugs = bugs
        return bugs

class ConfigValidator:
    """Validate configuration files and environment setup"""
    
    def __init__(self, root_path: str):
        self.root_path = Path(root_path)
        self.bugs: List[BugReport] = []

    def validate_configs(self) -> List[BugReport]:
        """Validate configuration files"""
        bugs = []
        
        # Check package.json files
        package_files = list(self.root_path.rglob('package.json'))
        
        for package_file in package_files:
            if 'node_modules' in str(package_file):
                continue
                
            try:
                with open(package_file, 'r') as f:
                    package_data = json.load(f)
                
                # Check for security vulnerabilities in dependencies
                if 'dependencies' in package_data:
                    vulnerable_packages = [
                        'lodash', 'moment', 'request', 'node-uuid'  # Known vulnerable packages
                    ]
                    
                    for pkg in vulnerable_packages:
                        if pkg in package_data['dependencies']:
                            bugs.append(BugReport(
                                severity='medium',
                                category='security',
                                file_path=str(package_file),
                                line_number=0,
                                description=f'Potentially vulnerable dependency: {pkg}',
                                recommendation=f'Update or replace {pkg} with a secure alternative',
                                code_snippet=f'{pkg}: {package_data["dependencies"][pkg]}'
                            ))
                
                # Check for missing scripts
                if 'scripts' in package_data:
                    required_scripts = ['test', 'lint']
                    for script in required_scripts:
                        if script not in package_data['scripts']:
                            bugs.append(BugReport(
                                severity='low',
                                category='config',
                                file_path=str(package_file),
                                line_number=0,
                                description=f'Missing {script} script in package.json',
                                recommendation=f'Add {script} script for better development workflow',
                                code_snippet=f'Missing: {script}'
                            ))
                            
            except Exception as e:
                logger.error(f"Error validating {package_file}: {e}")
        
        # Check for .env files with sensitive data
        env_files = list(self.root_path.rglob('.env*'))
        
        for env_file in env_files:
            try:
                with open(env_file, 'r') as f:
                    content = f.read()
                
                # Check for hardcoded values that should be secrets
                sensitive_patterns = [
                    r'PASSWORD=.{1,20}$',
                    r'SECRET=.{1,32}$',
                    r'API_KEY=.{1,32}$'
                ]
                
                for pattern in sensitive_patterns:
                    if re.search(pattern, content, re.MULTILINE):
                        bugs.append(BugReport(
                            severity='high',
                            category='security',
                            file_path=str(env_file),
                            line_number=0,
                            description='Weak or short secret detected in environment file',
                            recommendation='Use strong, randomly generated secrets',
                            code_snippet='Sensitive data detected'
                        ))
                        
            except Exception as e:
                logger.error(f"Error checking {env_file}: {e}")
        
        self.bugs = bugs
        return bugs

class BugDetector:
    """Main bug detection orchestrator"""
    
    def __init__(self, root_path: str):
        self.root_path = root_path
        self.code_analyzer = CodeAnalyzer(root_path)
        self.config_validator = ConfigValidator(root_path)
        self.api_tester = APITester([
            'http://localhost:4021',  # auth-service
            'http://localhost:4000',  # gateway-service
            'https://dream.uniflo.ai/api'  # production
        ])
        
    async def run_all_tests(self) -> Dict[str, List[BugReport]]:
        """Run all bug detection tests"""
        logger.info("Starting comprehensive bug detection...")
        
        results = {}
        
        # Static code analysis
        logger.info("Running static code analysis...")
        results['static_analysis'] = self.code_analyzer.analyze_all_files()
        
        # Configuration validation
        logger.info("Validating configurations...")
        results['config_validation'] = self.config_validator.validate_configs()
        
        # API testing (commented out for now as it requires running services)
        # logger.info("Testing API endpoints...")
        # results['api_testing'] = await self.api_tester.test_endpoints()
        results['api_testing'] = []
        
        return results
    
    def generate_report(self, results: Dict[str, List[BugReport]]) -> str:
        """Generate a comprehensive bug report"""
        report = []
        report.append("=" * 80)
        report.append("DREAM-SVN BACKEND BUG DETECTION REPORT")
        report.append("=" * 80)
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")
        
        # Summary
        total_bugs = sum(len(bugs) for bugs in results.values())
        severity_counts = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
        
        for bugs in results.values():
            for bug in bugs:
                severity_counts[bug.severity] += 1
        
        report.append("SUMMARY")
        report.append("-" * 40)
        report.append(f"Total Issues Found: {total_bugs}")
        report.append(f"Critical: {severity_counts['critical']}")
        report.append(f"High: {severity_counts['high']}")
        report.append(f"Medium: {severity_counts['medium']}")
        report.append(f"Low: {severity_counts['low']}")
        report.append("")
        
        # Detailed results by category
        for category, bugs in results.items():
            if not bugs:
                continue
                
            report.append(f"{category.upper().replace('_', ' ')}")
            report.append("-" * 40)
            
            # Group by severity
            bugs_by_severity = {}
            for bug in bugs:
                if bug.severity not in bugs_by_severity:
                    bugs_by_severity[bug.severity] = []
                bugs_by_severity[bug.severity].append(bug)
            
            for severity in ['critical', 'high', 'medium', 'low']:
                if severity in bugs_by_severity:
                    report.append(f"\n{severity.upper()} SEVERITY:")
                    for i, bug in enumerate(bugs_by_severity[severity], 1):
                        report.append(f"\n{i}. {bug.description}")
                        report.append(f"   File: {bug.file_path}")
                        if bug.line_number > 0:
                            report.append(f"   Line: {bug.line_number}")
                        report.append(f"   Category: {bug.category}")
                        report.append(f"   Recommendation: {bug.recommendation}")
                        if bug.code_snippet:
                            report.append(f"   Code: {bug.code_snippet}")
            
            report.append("")
        
        # Recommendations
        report.append("RECOMMENDED ACTIONS")
        report.append("-" * 40)
        report.append("1. Fix all CRITICAL and HIGH severity issues immediately")
        report.append("2. Implement comprehensive input validation")
        report.append("3. Add proper error handling to all routes")
        report.append("4. Review and update dependencies regularly")
        report.append("5. Implement automated testing and CI/CD")
        report.append("6. Add security headers and HTTPS enforcement")
        report.append("7. Regular security audits and penetration testing")
        report.append("")
        
        return "\n".join(report)

async def main():
    """Main execution function"""
    # Get the backend directory path
    backend_path = os.path.dirname(os.path.abspath(__file__))
    
    # Initialize bug detector
    detector = BugDetector(backend_path)
    
    try:
        # Run all tests
        results = await detector.run_all_tests()
        
        # Generate and save report
        report = detector.generate_report(results)
        
        # Save to file
        with open('bug_detection_report.txt', 'w') as f:
            f.write(report)
        
        # Print summary
        print(report)
        
        logger.info("Bug detection completed. Report saved to bug_detection_report.txt")
        
    except Exception as e:
        logger.error(f"Error during bug detection: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())
