import os, re

def replace_in_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    orig = content
    # Replace background: '#fff' with background: HP_TOKENS.card
    content = re.sub(r"background:\s*'#fff'", "background: HP_TOKENS.card", content)
    content = re.sub(r'background:\s*"#fff"', "background: HP_TOKENS.card", content)
    
    # Replace color: '#fff' with color: '#F4F7F9' (off-white for buttons)
    content = re.sub(r"color:\s*'#fff'", "color: '#F4F7F9'", content)
    content = re.sub(r'color:\s*"#fff"', "color: '#F4F7F9'", content)
    
    # Replace <HPGlyph ... color="#fff" with color="#F4F7F9"
    content = re.sub(r'color="#fff"', 'color="#F4F7F9"', content)
    content = re.sub(r"color='#fff'", "color='#F4F7F9'", content)
    
    # Replace #000, #000000 with HP_TOKENS.ink or #1A1D23
    content = re.sub(r'#000000', '#1A1D23', content)
    content = re.sub(r'rgba\(0,0,0,', 'rgba(26,29,35,', content)
    content = re.sub(r'rgba\(0, 0, 0,', 'rgba(26, 29, 35,', content)
    
    # Also fix linear gradients with #fff
    content = re.sub(r', #fff\)', ', ${HP_TOKENS.card})', content)
    content = re.sub(r'#fff 100%', '${HP_TOKENS.card} 100%', content)
    
    if content != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('Updated', path)

for root, _, files in os.walk('components'):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts'):
            replace_in_file(os.path.join(root, f))
for root, _, files in os.walk('app'):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts'):
            replace_in_file(os.path.join(root, f))
