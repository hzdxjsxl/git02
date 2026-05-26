from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import random
from datetime import datetime, timedelta

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

def generate_price_data():
    start_date = datetime(2015, 1, 1)
    end_date = datetime(2025, 12, 31)
    
    soybean_base = 3500
    corn_base = 2000
    
    soybean_prices = []
    corn_prices = []
    dates = []
    
    current = start_date
    soybean_price = soybean_base
    corn_price = corn_base
    
    while current <= end_date:
        date_str = current.strftime('%Y-%m-%d')
        dates.append(date_str)
        
        soybean_change = random.uniform(-30, 30)
        soybean_price = max(2800, min(4800, soybean_price + soybean_change))
        soybean_prices.append(round(soybean_price, 2))
        
        corn_change = random.uniform(-15, 15)
        corn_price = max(1600, min(2800, corn_price + corn_change))
        corn_prices.append(round(corn_price, 2))
        
        current += timedelta(days=1)
    
    return {
        'dates': dates,
        'soybean': soybean_prices,
        'corn': corn_prices
    }

PRICE_DATA = generate_price_data()

@app.route('/api/prices')
def get_prices():
    return jsonify(PRICE_DATA)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

if __name__ == '__main__':
    print(f"Generated {len(PRICE_DATA['dates'])} days of price data")
    print(f"Date range: {PRICE_DATA['dates'][0]} to {PRICE_DATA['dates'][-1]}")
    app.run(host='0.0.0.0', port=5000, debug=True)
