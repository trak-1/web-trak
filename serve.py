#!/usr/bin/env python3
"""Threaded, dual-stack, no-cache static server for the Track site.

- Dual-stack (IPv6 '::' with IPV6_V6ONLY=0) so BOTH http://localhost (which on
  Windows often resolves to ::1) AND http://127.0.0.1 work. Binding IPv4-only
  made localhost fail in the browser.
- ThreadingHTTPServer so the hero video streams while the studio frame sequence
  loads concurrently (single-threaded http.server stalls the video).
- No-store headers so a normal browser refresh always gets the latest files.
"""
import socket
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


class DualStackServer(ThreadingHTTPServer):
    address_family = socket.AF_INET6

    def server_bind(self):
        # accept both IPv6 (::1) and IPv4 (127.0.0.1) connections
        try:
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        except (AttributeError, OSError):
            pass
        super().server_bind()


PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5178
DIRECTORY = sys.argv[2] if len(sys.argv) > 2 else "."

httpd = DualStackServer(("::", PORT), partial(Handler, directory=DIRECTORY))
print(f"Dual-stack no-cache server on http://localhost:{PORT} serving {DIRECTORY}")
httpd.serve_forever()
