import os
import re
import requests
import feedparser
from flask import Flask, jsonify, render_template

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def split_entry_content(content_html, date_str, base_link):
    """
    Splits a daily GCP feed entry by <h3> tags so each feature/issue/announcement
    becomes a separate card.
    """
    # Find all h3 headings and the content between them
    matches = list(re.finditer(r'<h3>(.*?)</h3>(.*?)(?=<h3>|$)', content_html, re.DOTALL | re.IGNORECASE))
    
    updates = []
    for idx, match in enumerate(matches):
        category = match.group(1).strip()
        body = match.group(2).strip()
        
        # Clean text to extract a title
        # Find the first paragraph
        text_match = re.search(r'<p>(.*?)</p>', body, re.DOTALL)
        if text_match:
            first_p_html = text_match.group(1)
            # Remove html tags
            first_p_text = re.sub(r'<[^>]+>', '', first_p_html).strip()
            # Replace multiple whitespaces/newlines with a single space
            first_p_text = re.sub(r'\s+', ' ', first_p_text)
            
            # Simple sentence splitting: split by period followed by whitespace
            sentences = re.split(r'\.\s+', first_p_text)
            if sentences and len(sentences[0]) > 10:
                title = sentences[0]
                if not title.endswith('.'):
                    title += '.'
            else:
                title = first_p_text
        else:
            # Fallback if no paragraph found
            title = re.sub(r'<[^>]+>', '', body).strip()
            title = re.sub(r'\s+', ' ', title)
            if len(title) > 80:
                title = title[:80] + '...'
                
        # Trim title if it's too long
        if len(title) > 120:
            title = title[:120].strip() + '...'
            
        # Standardize category name
        category_lower = category.lower()
        if 'feature' in category_lower:
            cat_tag = 'feature'
        elif 'issue' in category_lower or 'fix' in category_lower:
            cat_tag = 'fix'
        elif 'deprecation' in category_lower:
            cat_tag = 'deprecation'
        elif 'change' in category_lower or 'update' in category_lower:
            cat_tag = 'change'
        else:
            cat_tag = 'general'
            
        updates.append({
            "id": f"{date_str.replace(' ', '_').replace(',', '')}_{idx}",
            "title": title,
            "published": date_str,
            "link": base_link,
            "content": f"<h3>{category}</h3>\n{body}",
            "categories": [cat_tag]
        })
        
    if not updates:
        # If no <h3> tags were found, treat the entry as a single general update
        clean_text = re.sub(r'<[^>]+>', '', content_html).strip()
        clean_text = re.sub(r'\s+', ' ', clean_text)
        sentences = re.split(r'\.\s+', clean_text)
        title = sentences[0] if sentences else "BigQuery Update"
        if len(title) > 120:
            title = title[:120].strip() + '...'
            
        updates.append({
            "id": f"{date_str.replace(' ', '_').replace(',', '')}_0",
            "title": title,
            "published": date_str,
            "link": base_link,
            "content": content_html,
            "categories": ["general"]
        })
        
    return updates

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/releases")
def get_releases():
    try:
        # Fetch the feed
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
        
        # Parse the feed
        feed = feedparser.parse(response.content)
        
        all_updates = []
        for entry in feed.entries:
            # Extract content html
            content = ""
            if "content" in entry and len(entry.content) > 0:
                content = entry.content[0].value
            elif "summary" in entry:
                content = entry.summary
                
            # Date string is typically the entry title (e.g. "June 15, 2026")
            date_str = entry.get("title", "Unknown Date")
            base_link = entry.get("link", "https://cloud.google.com/bigquery/docs/release-notes")
            
            # Split the daily digest entry into individual updates
            updates = split_entry_content(content, date_str, base_link)
            all_updates.extend(updates)
            
        return jsonify({
            "success": True,
            "feed_title": feed.feed.get("title", "BigQuery Release Notes"),
            "feed_link": feed.feed.get("link", ""),
            "releases": all_updates
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
