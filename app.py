import os
import re
import xml.etree.ElementTree as ET
import requests
from flask import Flask, jsonify, render_template, request

app = Flask(__name__, template_folder='templates', static_folder='static')

def parse_entry_content(content_html):
    if not content_html:
        return []
    
    items = []
    # Match <h3>Type</h3> followed by all content until the next <h3> or end of string
    matches = re.findall(r'<h3>(.*?)</h3>\s*(.*?)(?=\s*<h3>|$)', content_html, re.DOTALL)
    for tag, body in matches:
        items.append({
            'type': tag.strip(),
            'description': body.strip()
        })
        
    if not items:
        # Fallback if no <h3> tag is found
        items.append({
            'type': 'Update',
            'description': content_html.strip()
        })
    return items

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    try:
        url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        
        # Parse Atom XML
        root = ET.fromstring(response.content)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        for entry in root.findall('atom:entry', ns):
            title_el = entry.find('atom:title', ns)
            id_el = entry.find('atom:id', ns)
            updated_el = entry.find('atom:updated', ns)
            content_el = entry.find('atom:content', ns)
            
            link_el = None
            for link in entry.findall('atom:link', ns):
                if link.attrib.get('rel') == 'alternate' or not link.attrib.get('rel'):
                    link_el = link
                    break
            
            title = title_el.text if title_el is not None else ""
            entry_id = id_el.text if id_el is not None else ""
            updated = updated_el.text if updated_el is not None else ""
            content_html = content_el.text if content_el is not None else ""
            link_href = link_el.attrib.get('href') if link_el is not None else "https://cloud.google.com/bigquery/docs/release-notes"
            
            updates = parse_entry_content(content_html)
            
            entries.append({
                'date': title,
                'id': entry_id,
                'updated': updated,
                'link': link_href,
                'updates': updates
            })
            
        return jsonify({
            'status': 'success',
            'data': entries
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    # Use port 5001 on mac to avoid macOS Control Center / Airplay conflict on port 5000
    app.run(host='0.0.0.0', port=5001, debug=True)
