"""
Web interface for the NEAR Hackathon Auditor tool.
"""

import os
import logging
from pathlib import Path
import tempfile
import json

from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.utils import secure_filename

# Set up logging
logging.basicConfig(level=logging.DEBUG)
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
    created_at = db.Column(db.DateTime, server_default=db.func.now())

# Create tables
with app.app_context():
    db.create_all()

# Import audit functionality
from audit_near.cli import load_config, get_category_handlers
from audit_near.ai_client import AiClient
from audit_near.providers.repo_provider import RepoProvider
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
    if request.method == 'POST':
        # Handle form submission
        repo_path = request.form.get('repo_path')
        
        if not repo_path:
            flash('Repository path is required', 'error')
            return redirect(url_for('audit'))
        
        # Validate repo path
        if not os.path.isdir(repo_path):
            flash(f'Invalid repository path: {repo_path}', 'error')
            return redirect(url_for('audit'))
        
        # Store form data in session
        session['repo_path'] = repo_path
        session['branch'] = request.form.get('branch', 'main')
        
        return redirect(url_for('run_audit'))
    
    return render_template('audit_form.html')

@app.route('/run-audit')
def run_audit():
    """Run the audit process."""
    # Get data from session
    repo_path = session.get('repo_path')
    branch = session.get('branch', 'main')
    
    if not repo_path:
        flash('Repository information not found', 'error')
        return redirect(url_for('audit'))
    
    try:
        # Load default config
        config_path = os.path.join(os.path.dirname(__file__), 'configs', 'near_hackathon.toml')
        config = load_config(config_path)
        
        # Initialize AI client
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            flash('OpenAI API key not found. Please set the OPENAI_API_KEY environment variable.', 'error')
            return redirect(url_for('audit'))
        
        ai_client = AiClient(api_key=api_key)
        
        # Initialize repo provider
        repo_provider = RepoProvider(repo_path=repo_path)
        
        # Get files from repo
        files = list(repo_provider.get_files())
        
        # Get category handlers
        category_handlers = get_category_handlers(config, ai_client, repo_path)
        
        # Process each category
        results = {}
        total_score = 0
        total_possible = 0
        
        for category_name, handler in category_handlers.items():
            logger.info(f"Processing category: {category_name}")
            score, feedback = handler.process(files)
            
            max_points = config['categories'][category_name]['max_points']
            total_possible += max_points
            total_score += score
            
            results[category_name] = {
                'score': score,
                'max_points': max_points,
                'feedback': feedback
            }
        
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
            output_path=temp_report_path
        )
        
        # Read the report content
        with open(temp_report_path, 'r') as f:
            report_content = f.read()
        
        # Save to database
        repo_name = os.path.basename(repo_path)
        new_report = AuditReport(
            repo_name=repo_name,
            repo_path=repo_path,
            branch=branch,
            total_score=total_score,
            total_possible=total_possible,
            report_data=json.dumps(results)
        )
        
        with app.app_context():
            db.session.add(new_report)
            db.session.commit()
            report_id = new_report.id
        
        # Store report ID in session for redirect
        session['report_id'] = report_id
        
        # Clean up
        os.unlink(temp_report_path)
        
        return redirect(url_for('view_report', report_id=report_id))
        
    except Exception as e:
        logger.exception("Error running audit")
        flash(f'Error running audit: {str(e)}', 'error')
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
        output_path=temp_report_path
    )
    
    return_value = send_file(
        temp_report_path,
        as_attachment=True,
        download_name=f"{report.repo_name}_audit_report.md"
    )
    
    # Schedule cleanup after response is sent
    @app.after_request
    def cleanup(response):
        try:
            os.unlink(temp_report_path)
        except:
            pass
        return response
    
    return return_value

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)