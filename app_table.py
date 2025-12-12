from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import pandas as pd
import numpy as np
from math import ceil

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# Load CSV data
csv_file = 'FinExport_11-12-2025.csv'
df = None

try:
    df = pd.read_csv(csv_file)
    print(f"✅ Loaded {len(df)} funds from {csv_file}")
    print(f"📊 Columns: {len(df.columns)} total")
except Exception as e:
    print(f"❌ Error loading CSV: {e}")

@app.route('/')
def index():
    return send_file('table.html')

@app.route('/api/health')
def health():
    return jsonify({
        'status': 'ok',
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
    print("🚀 Starting Fund Dashboard Server...")
    print("📍 Open http://localhost:5000 in your browser")
    app.run(debug=True, host='0.0.0.0', port=5000)
