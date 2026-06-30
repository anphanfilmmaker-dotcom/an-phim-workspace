import sys
import codecs
import re

sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

with open('e:/agent/dashboard/server.cjs', 'r', encoding='utf-8') as f:
    content = f.read()

with open('e:/agent/dashboard/agent_scripts/chat_endpoint_replacement.js', 'r', encoding='utf-8') as f:
    replacement = f.read()

# Use regex to find the AI Chat Endpoint block.
# It starts with '// AI Chat Endpoint' and ends right before '// Serve static assets in production'
pattern = re.compile(r'// AI Chat Endpoint.*?// Serve static assets in production', re.DOTALL)

# Let's verify it matches
if pattern.search(content):
    new_content = pattern.sub(replacement + '\n// Serve static assets in production', content)
    with open('e:/agent/dashboard/server.cjs', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Replaced successfully!")
else:
    print("Pattern not found! Check regex.")
