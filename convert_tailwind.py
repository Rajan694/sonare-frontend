import os
import re

class_map = {
    'row': 'flex flex-row items-center',
    'rowt': 'flex flex-row items-start',
    'col': 'flex flex-col',
    'between': 'justify-between',
    'center': 'justify-center items-center',
    'wrap': 'flex-wrap',
    'grow': 'flex-grow min-w-0',
    'none': 'flex-none',
    'hr': 'h-[1px] bg-ln border-0 m-0 block',
    'vr': 'w-[1px] self-stretch bg-ln block',
    
    'c1': 'text-t1',
    'c2': 'text-t2',
    'c3': 'text-t3',
    'c4': 'text-t4',
    'cacc': 'text-acc',
    'cgold': 'text-gold',
    'cred': 'text-red',
    'cblue': 'text-blue',

    'surf': 'bg-s1 border border-ln rounded-lg',
    'surf2': 'bg-s2 border border-ln2 rounded-lg',
    'inset': 'bg-s0 border border-ln rounded-md',

    't-dis2': 'text-[32px] leading-[36px] font-bold tracking-[-0.4px]',
    't-h1': 'text-[24px] leading-[30px] font-semibold tracking-[-0.2px]',
    't-h2': 'text-[20px] leading-[26px] font-semibold tracking-[-0.1px]',
    't-tl': 'text-[17px] leading-[24px] font-semibold tracking-[-0.1px]',
    't-tm': 'text-[15px] leading-[22px] font-medium',
    't-bl': 'text-[15px] leading-[22px] font-normal',
    't-bm': 'text-[14px] leading-[20px] font-normal',
    't-bs': 'text-[13px] leading-[18px] font-normal',
    't-ll': 'text-[13px] leading-[16px] font-medium',
    't-lm': 'text-[12px] leading-[16px] font-medium tracking-[0.2px]',
    't-ls': 'text-[11px] leading-[14px] font-medium tracking-[0.4px]',
    't-ov': 'text-[11px] leading-[14px] font-semibold tracking-[0.9px] uppercase',
    
    'trunc': 'truncate',
    'w400': 'font-normal',
    'w500': 'font-medium',
    'w600': 'font-semibold',
    'w700': 'font-bold'
}

# Regex to match gap utilities like g2, g10
def transform_dynamic(classes):
    parts = classes.split()
    new_parts = []
    
    for p in parts:
        if p in class_map:
            new_parts.append(class_map[p])
        elif re.match(r'^g(\d+)$', p):
            val = re.match(r'^g(\d+)$', p).group(1)
            # gap spacing in px
            new_parts.append(f"gap-[{val}px]")
        else:
            new_parts.append(p)
            
    # Remove duplicates but keeping order roughly (not strictly needed for tailwind but clean)
    seen = set()
    final = []
    for t in " ".join(new_parts).split():
        if t not in seen:
            seen.add(t)
            final.append(t)
            
    return " ".join(final)

# Also convert style={{'padding': '12px', 'height': '40px'}} to utility classes where possible
def transform_styles(content):
    # This is complex to do accurately with regex, but we can do a naive conversion of padding, margin, width, height for exact px values
    def style_repl(match):
        style_content = match.group(1)
        # Parse it safely
        props = []
        tailwind_classes = []
        for prop in style_content.split(','):
            if not prop.strip(): continue
            try:
                k, v = prop.split(':', 1)
                k = k.strip().strip("'").strip('"')
                v = v.strip().strip("'").strip('"')
                
                # Check if it's px value
                if re.match(r'^-?\d+px$', v) or re.match(r'^\d+(\.\d+)?%$', v):
                    if k == 'width': tailwind_classes.append(f"w-[{v}]")
                    elif k == 'height': tailwind_classes.append(f"h-[{v}]")
                    elif k == 'padding': tailwind_classes.append(f"p-[{v}]")
                    elif k == 'margin': tailwind_classes.append(f"m-[{v}]")
                    elif k == 'paddingTop': tailwind_classes.append(f"pt-[{v}]")
                    elif k == 'paddingBottom': tailwind_classes.append(f"pb-[{v}]")
                    elif k == 'paddingLeft': tailwind_classes.append(f"pl-[{v}]")
                    elif k == 'paddingRight': tailwind_classes.append(f"pr-[{v}]")
                    elif k == 'marginTop': tailwind_classes.append(f"mt-[{v}]")
                    elif k == 'marginBottom': tailwind_classes.append(f"mb-[{v}]")
                    elif k == 'marginLeft': tailwind_classes.append(f"ml-[{v}]")
                    elif k == 'marginRight': tailwind_classes.append(f"mr-[{v}]")
                    elif k == 'gap': tailwind_classes.append(f"gap-[{v}]")
                    elif k == 'minWidth': tailwind_classes.append(f"min-w-[{v}]")
                    else:
                        props.append(f"'{k}': '{v}'")
                elif k == 'padding' and len(v.split()) > 1:
                    # e.g. "0 18px"
                    vals = v.split()
                    if all(re.match(r'^-?\d+(px)?|0$', x) for x in vals):
                        if len(vals) == 2:
                            v1 = vals[0] if 'px' in vals[0] or vals[0]=='0' else vals[0]+'px'
                            v2 = vals[1] if 'px' in vals[1] or vals[1]=='0' else vals[1]+'px'
                            tailwind_classes.append(f"py-[{v1}] px-[{v2}]")
                        elif len(vals) == 3:
                            v1, v2, v3 = [x if 'px' in x or x=='0' else x+'px' for x in vals]
                            tailwind_classes.append(f"pt-[{v1}] px-[{v2}] pb-[{v3}]")
                        elif len(vals) == 4:
                            v1, v2, v3, v4 = [x if 'px' in x or x=='0' else x+'px' for x in vals]
                            tailwind_classes.append(f"pt-[{v1}] pr-[{v2}] pb-[{v3}] pl-[{v4}]")
                        else:
                            props.append(f"'{k}': '{v}'")
                    else:
                        props.append(f"'{k}': '{v}'")
                else:
                    props.append(f"'{k}': '{v}'")
            except:
                props.append(f"'{k}': '{v}'")
        
        style_str = "style={{" + ", ".join(props) + "}}" if props else ""
        tw_str = " ".join(tailwind_classes)
        return tw_str, style_str

    
    # Needs a 2-pass approach:
    # We find tags with both className and style, or just one of them.
    # We replace them.
    def tag_repl(match):
        pre = match.group(1)
        attrs = match.group(2)
        
        cl_match = re.search(r'className="([^"]*)"', attrs)
        st_match = re.search(r'style={{([^}]*)}}', attrs)
        
        orig_cl = cl_match.group(1) if cl_match else ""
        st_tw = ""
        st_rem = ""
        
        if st_match:
            st_tw, st_rem = style_repl(st_match)
            
        new_cl = orig_cl
        if st_tw:
            new_cl = f"{orig_cl} {st_tw}".strip()
            
        new_cl = transform_dynamic(new_cl)
        
        # reconstruct attrs
        new_attrs = attrs
        if cl_match:
            new_attrs = new_attrs.replace(cl_match.group(0), f'className="{new_cl}"')
        elif new_cl:
            new_attrs = f'className="{new_cl}" ' + new_attrs
            
        if st_match:
            if st_rem:
                new_attrs = new_attrs.replace(st_match.group(0), st_rem)
            else:
                new_attrs = new_attrs.replace(st_match.group(0), "").replace('  ', ' ')
        
        # Clean up empty styles or classnames
        new_attrs = new_attrs.replace(' style={{}}', '').replace(' className=""', '')
        
        return f"<{pre}{new_attrs}>"
        
    return re.sub(r'<([a-zA-Z0-9]+)((?:\s+[a-zA-Z0-9\-]+(?:=(?:"[^"]*"|\{[^\}]*\}))?)*)\s*>', tag_repl, content)

for root, dirs, files in os.walk('/home/rajan/My Learnings/sonare/sonare-frontend/other-screens/src'):
    for file in files:
        if file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()
                
            new_content = transform_styles(content)
            if new_content != content:
                with open(filepath, 'w') as f:
                    f.write(new_content)

print("Tailwind classes updated successfully.")
