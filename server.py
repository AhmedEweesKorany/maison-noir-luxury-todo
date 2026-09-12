#!/usr/bin/env python3
"""MAISON NOIR — luxury static server on a deliberately strange port.

Why :47329?  To dodge the usual dev crowds:
  3000 (react), 3001, 4000, 5000 (flask), 5173 (vite),
  8000 (django), 8080 (generic), 4200 (angular), 8888, 9000.
47329 lives high in the ephemeral range, is easy to remember
(47-329), and almost never collides.
"""
import argparse, functools, http.server, os, socket, webbrowser, sys

STRANGE_PORT = 47329

BANNER = r"""
  ◆━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━◆
   MAISON NOIR · Todo Atelier · Édition Luxe
   Serving on a strange port to avoid dev crowds
  ◆━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━◆
"""

def main():
    ap = argparse.ArgumentParser(description="Serve the luxury todo atelier.")
    ap.add_argument("-p", "--port", type=int, default=STRANGE_PORT, help=f"port (default strange {STRANGE_PORT})")
    ap.add_argument("--no-browser", action="store_true", help="do not auto-open browser")
    ap.add_argument("--bind", default="127.0.0.1")
    args = ap.parse_args()

    root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(root)

    handler = functools.partial(http.server.SimpleHTTPRequestHandler)
    # allow quick restarts
    socket.socket(http.server.HTTPServer.allow_reuse_address if hasattr(http.server.HTTPServer, 'allow_reuse_address') else True)
    http.server.HTTPServer.allow_reuse_address = True

    try:
        with http.server.HTTPServer((args.bind, args.port), handler) as httpd:
            url = f"http://{args.bind}:{args.port}/"
            print(BANNER)
            print(f"  Root : {root}")
            print(f"  URL  : {url}")
            print(f"  Vault: browser localStorage › luxury_maisontodo_v1")
            print("  Press Ctrl+C to close the maison.\n")
            if not args.no_browser:
                try: webbrowser.open(url)
                except Exception as e: print(f"  (could not auto-open browser: {e})", file=sys.stderr)
            httpd.serve_forever()
    except OSError as e:
        print(f"✕ Port {args.port} is occupied: {e}\n  Try: python3 server.py -p 47913  (any other strange 47xxx port)", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
