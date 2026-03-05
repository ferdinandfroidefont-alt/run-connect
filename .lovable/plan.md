

## Diagnostic

In a YAML `|` block scalar, **all content lines must be indented at least as much as the first content line** (10 spaces in this case). The Python triple-quoted string on lines 102-110 starts at 4 spaces of indentation, which YAML interprets as exiting the `run` block -- causing a syntax error.

The same issue exists in the second `python3` heredoc block (lines 136-146).

## Fix

**File: `.github/workflows/ios-appstore.yml`**

Re-indent the Python `"""` string contents so all lines have at least 10 spaces of indentation. The Swift code inside the string will have extra leading whitespace, but that's fine for source code injection -- or better yet, use Python's `textwrap.dedent` to strip it.

The simplest approach: indent the triple-quoted string content to 10+ spaces and use `.strip()` or `textwrap.dedent()` on the string to remove the extra indentation before injecting it into Swift.

### Changes (lines 101-111 and 136-146):

Replace the `"""` blocks from:
```python
          apns_methods = """
    // MARK: - APNs ...
    func application(...) {
        ...
    }
"""
```

To:
```python
          apns_methods = "\n".join([
              "    // MARK: - APNs Token Registration (required for Capacitor Push Notifications on iOS)",
              "    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {",
              "        Messaging.messaging().apnsToken = deviceToken",
              "        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)",
              "    }",
              "",
              "    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {",
              "        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)",
              "    }",
          ])
```

This avoids any indentation issues with YAML since every line stays at 10+ spaces. Apply the same fix to both Python blocks (first at line 101, second at line 136).

