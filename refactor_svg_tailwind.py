import os
import re
import hashlib

def get_svg_hash(svg_content):
    return hashlib.md5(svg_content.encode('utf-8')).hexdigest()[:8]

def extract_svgs(source_dir, public_assets_dir, asset_prefix=""):
    os.makedirs(public_assets_dir, exist_ok=True)
    svg_map = {} # full_svg_string -> filename

    for root, dirs, files in os.walk(source_dir):
        for file in files:
            if not file.endswith('.tsx'): continue
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()

            # Find all <svg>...</svg>
            svg_matches = re.finditer(r'<svg[^>]*>.*?</svg>', content, re.DOTALL)
            new_content = content
            for match in svg_matches:
                svg_str = match.group(0)
                
                # Check if we already have this exact SVG (ignoring className changes)
                # Let's normalize it slightly
                norm_svg = re.sub(r'className="[^"]*"', '', svg_str)
                if norm_svg not in svg_map:
                    h = get_svg_hash(norm_svg)
                    filename = f"icon_{h}.svg"
                    svg_map[norm_svg] = filename
                    
                    # Fix SVG for raw file (remove React camelCase, convert to valid XML)
                    raw_svg = svg_str
                    raw_svg = re.sub(r'className="[^"]*"', '', raw_svg)
                    raw_svg = raw_svg.replace('fillRule', 'fill-rule')
                    raw_svg = raw_svg.replace('clipRule', 'clip-rule')
                    raw_svg = raw_svg.replace('strokeWidth', 'stroke-width')
                    raw_svg = raw_svg.replace('strokeLinecap', 'stroke-linecap')
                    raw_svg = raw_svg.replace('strokeLinejoin', 'stroke-linejoin')
                    
                    # Ensure xmlns is present
                    if 'xmlns=' not in raw_svg:
                        raw_svg = raw_svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')

                    with open(os.path.join(public_assets_dir, filename), 'w') as out_f:
                        out_f.write(raw_svg)
                
                filename = svg_map[norm_svg]
                
                # Replace in TSX
                # For React Web, we can use <img src="/assets/icon.svg" className="..." />
                # For React Native, Image source={require('./assets/icon.svg')} but since they are shared, we'll need different replacement logic.
                
                # Try to extract original className
                cl_match = re.search(r'className="([^"]*)"', svg_str)
                cl = cl_match.group(1) if cl_match else ""
                
                if "mobile" in source_dir:
                    # React Native: requires Image component, assuming it handles SVGs or just use Image
                    replacement = f"<Image source={{require('../../assets/{filename}')}} className=\"{cl}\" />"
                    # Add Image import if needed later
                else:
                    # React Web
                    replacement = f'<img src="{asset_prefix}/assets/{filename}" className="{cl}" alt="icon" />'
                
                new_content = new_content.replace(svg_str, replacement)

            if new_content != content:
                # auto-add Image import for mobile
                if "mobile" in source_dir and "<Image " in new_content and "import { Image" not in new_content and "Image } from" not in new_content:
                    new_content = new_content.replace("import React", "import React\nimport { Image } from 'react-native';")
                with open(filepath, 'w') as f:
                    f.write(new_content)

extract_svgs('/home/rajan/My Learnings/sonare/sonare-frontend/other-screens/src', '/home/rajan/My Learnings/sonare/sonare-frontend/other-screens/public/assets', '')

# Mobile assets dir
# Let's put mobile assets in mobile/assets
extract_svgs('/home/rajan/My Learnings/sonare/sonare-frontend/mobile/src', '/home/rajan/My Learnings/sonare/sonare-frontend/mobile/assets', '')

print("SVGs extracted and replaced.")
