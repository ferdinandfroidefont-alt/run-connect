

## Diagnostic

The YAML `|` block and bash heredoc (`<< 'PYTHON_SCRIPT'`) interaction is causing parsing issues. The heredoc content at lines 96-121 has inconsistent indentation relative to the surrounding shell code (14 spaces for shell vs 10 spaces for Python), which confuses GitHub's YAML validator.

## Fix

**File: `.github/workflows/ios-appstore.yml`**

Replace the two `python3 << 'PYTHON_SCRIPT'` heredoc blocks with `python3 -c '...'` inline commands. This eliminates the heredoc indentation ambiguity entirely.

### Changes:

**Block 1 (lines 95-122)**: Replace heredoc with:
```yaml
              python3 -c '
          import re
          with open("ios/App/App/AppDelegate.swift", "r") as f:
              content = f.read()
          apns_methods = "\n".join([...])
          last_brace = content.rfind("}")
          if last_brace != -1:
              content = content[:last_brace] + apns_methods + "\n" + content[last_brace:]
          with open("ios/App/App/AppDelegate.swift", "w") as f:
              f.write(content)
          print("Done")
          '
```

**Block 2 (lines 129-156)**: Same transformation for the second Python block.

Key difference: `python3 -c '...'` keeps everything as a shell argument within the YAML block, avoiding the heredoc delimiter matching problem. Single quotes in the Python code (there are none) would need escaping, but this code only uses double quotes.

