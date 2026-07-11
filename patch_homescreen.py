# patch_homescreen.py — adds the "Talk to your Coach" button + version stamp to HomeScreen.js
# SURGICAL: verifies anchors exist exactly once; aborts without touching the file otherwise.
# IDEMPOTENT: safe to run twice — detects if already patched.
# Run from the life-compass project ROOT:  python3 patch_homescreen.py

import sys

PATH = 'src/screens/HomeScreen.js'
VERSION = 'v2026:07:11-09:42'

try:
    with open(PATH, 'r', encoding='utf-8') as f:
        src = f.read()
except FileNotFoundError:
    print('ERROR: ' + PATH + ' not found. Run this from the project root folder.')
    sys.exit(1)

if 'coachBtn' in src:
    print('Already patched — file NOT modified.')
    sys.exit(0)

ANCHOR_JSX = 'auto-saved after every section</Text>'
ANCHOR_STYLE = 'newBtnHint: {'

for a in (ANCHOR_JSX, ANCHOR_STYLE):
    n = src.count(a)
    if n != 1:
        print('ERROR: anchor found ' + str(n) + ' times (expected 1): ' + repr(a))
        print('Aborting — file NOT modified. Paste HomeScreen.js to Claude for a manual patch.')
        sys.exit(1)

jsx_block = (
    "\n        <TouchableOpacity style={styles.coachBtn} "
    "onPress={() => navigation.navigate('Coach', { userId })}>\n"
    "          <Text style={styles.coachBtnText}>\u25c6  TALK TO YOUR COACH</Text>\n"
    "        </TouchableOpacity>\n"
    "        <Text style={styles.versionText}>" + VERSION + "</Text>"
)

style_block = (
    "\n  coachBtn: { marginTop: 12, borderWidth: 1, borderColor: 'rgba(124,185,232,0.4)', "
    "borderRadius: 4, padding: 16, alignItems: 'center' },\n"
    "  coachBtnText: { color: '#7CB9E8', fontSize: 13, letterSpacing: 2, fontWeight: '600' },\n"
    "  versionText: { fontSize: 9, color: 'rgba(232,228,220,0.18)', textAlign: 'center', "
    "marginTop: 10, letterSpacing: 1 },"
)

# 1. Insert Coach button right after the "auto-saved" hint line
i = src.index(ANCHOR_JSX) + len(ANCHOR_JSX)
src = src[:i] + jsx_block + src[i:]

# 2. Insert new style entries right after the full newBtnHint line
line_start = src.index(ANCHOR_STYLE)
line_end = src.index('\n', line_start)
src = src[:line_end] + style_block + src[line_end:]

with open(PATH, 'w', encoding='utf-8') as f:
    f.write(src)

print('HomeScreen.js patched successfully (' + VERSION + ').')
print('Verify: open the app — Coach button appears under "Begin New Session", version stamp beneath it.')
