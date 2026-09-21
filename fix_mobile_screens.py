import os
import re

def convert_html_to_jsx(html_content):
    jsx = html_content.replace('class="', 'className="')
    jsx = re.sub(r'<(img|input|hr|br|source)([^>]*)(?<!/)>', r'<\1\2 />', jsx)
    
    # SVG attributes to camelCase
    jsx = jsx.replace('viewbox="', 'viewBox="')
    jsx = jsx.replace('fill-rule=', 'fillRule=').replace('clip-rule=', 'clipRule=')
    jsx = jsx.replace('stroke-width=', 'strokeWidth=').replace('stroke-linecap=', 'strokeLinecap=').replace('stroke-linejoin=', 'strokeLinejoin=')
    jsx = jsx.replace('tabindex=', 'tabIndex=')
    
    body_match = re.search(r'<body[^>]*>(.*?)</body>', jsx, re.DOTALL)
    if body_match:
        jsx = body_match.group(1)
        
    return jsx

screens_dir = "/home/rajan/Downloads/sonare-design-system/screens"
out_dir = "/home/rajan/My Learnings/sonare/sonare-frontend/mobile/src/screens"
os.makedirs(out_dir, exist_ok=True)

files = [f for f in os.listdir(screens_dir) if f.startswith('M') and f.endswith('.html')]

for f in files:
    name = f.replace('.html', '')
    parts = name.split('-')
    component_name = "Mobile" + "".join(p for p in parts[1:])
    
    with open(os.path.join(screens_dir, f), 'r') as file:
        content = file.read()
        
    jsx_content = convert_html_to_jsx(content)
    
    # Very basic naive replacement of html tags to RN tags
    jsx_content = jsx_content.replace('<div', '<View').replace('</div', '</View')
    jsx_content = jsx_content.replace('<span', '<Text').replace('</span', '</Text')
    jsx_content = jsx_content.replace('<p', '<Text').replace('</p', '</Text')
    jsx_content = jsx_content.replace('<button', '<Pressable').replace('</button', '</Pressable')
    jsx_content = jsx_content.replace('<a ', '<Pressable ').replace('</a>', '</Pressable>')
    jsx_content = jsx_content.replace('<img', '<Image')
    
    react_code = f"""import React from 'react';
import {{ View, ScrollView, Text, Pressable, Image }} from 'react-native';

export default function {component_name}() {{
  return (
    <>
{jsx_content}
    </>
  );
}}
"""
    with open(os.path.join(out_dir, f"{component_name}.tsx"), 'w') as out_file:
        out_file.write(react_code)

print("Mobile screens fixed!")
