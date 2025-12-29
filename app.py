"""
Fund Screener - Main Application
Production-ready Flask application for mutual fund screening
"""
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import pandas as pd
import numpy as np
from math import ceil
import os
from config import config

# Get configuration from environment
config_name = os.environ.get('FLASK_CONFIG', 'production')
app_config = config[config_name]

app = Flask(__name__, static_folder='.', static_url_path='')
app.config.from_object(app_config)
CORS(app)

# Load CSV data
csv_file = app_config.CSV_FILE
df = None

try:
    if os.path.exists(csv_file):
        df = pd.read_csv(csv_file)
        print(f"✅ Loaded {len(df)} funds from {csv_file}")
        print(f"📊 Columns: {len(df.columns)} total")
    else:
        print(f"⚠️  CSV file not found: {csv_file}")
except Exception as e:
    print(f"❌ Error loading CSV: {e}")

@app.route('/')
def index():
    """Serve the main application page"""
    return send_file('table.html')

@app.route('/table-styles.css')
def serve_css():
    """Serve CSS file"""
    return send_file('table-styles.css', mimetype='text/css')

@app.route('/table-script.js')
def serve_js():
    """Serve JavaScript file"""
    return send_file('table-script.js', mimetype='application/javascript')

@app.route('/health')
@app.route('/api/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'app': app_config.APP_NAME,
        'port': app_config.PORT,
        'records': len(df) if df is not None else 0,
        'columns': len(df.columns) if df is not None else 0
    })

@app.route('/api/funds')
def get_funds():
    """Get paginated fund data with all columns"""
    if df is None:
        return jsonify({'error': 'Data not loaded'}), 500
    
    try:
        # Get pagination parameters
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        search = request.args.get('search', '').strip().lower()
        
        # Filter data if search query provided
        filtered_df = df
        if search:
            filtered_df = df[df['Fund'].str.lower().str.contains(search, na=False)]
        
        # Calculate pagination
        total_records = len(filtered_df)
        total_pages = ceil(total_records / per_page) if total_records > 0 else 1
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        
        # Get page data
        page_data = filtered_df.iloc[start_idx:end_idx]
        
        # Convert to records and handle NaN values
        records = page_data.replace({np.nan: None}).to_dict('records')
        
        return jsonify({
            'success': True,
            'data': records,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total_records': total_records,
                'total_pages': total_pages
            },
            'columns': df.columns.tolist()
        })
    except Exception as e:
        print(f"Error in get_funds: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/export')
def export_data():
    """Export filtered data as CSV"""
    if df is None:
        return jsonify({'error': 'Data not loaded'}), 500
    
    try:
        search = request.args.get('search', '').strip().lower()
        
        # Filter data if search query provided
        filtered_df = df
        if search:
            filtered_df = df[df['Fund'].str.lower().str.contains(search, na=False)]
        
        # Save to temporary file
        filename = f'funds_export_{pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")}.csv'
        filtered_df.to_csv(filename, index=False)
        
        return send_file(filename, as_attachment=True, download_name=filename)
    except Exception as e:
        print(f"Error in export: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("🚀 Starting Fund Screener Server...")
    print(f"📍 Server will run on http://localhost:{app_config.PORT}")
    print(f"🌍 Environment: {config_name}")
    print(f"🔧 Debug mode: {app_config.DEBUG}")
    
    app.run(
        debug=app_config.DEBUG,
        host=app_config.HOST,
        port=app_config.PORT
    )
