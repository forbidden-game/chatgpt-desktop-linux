#!/usr/bin/env python3
import argparse
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit


class WebviewHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, health_token, **kwargs):
        self.health_token = health_token
        super().__init__(*args, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_GET(self):
        if urlsplit(self.path).path == "/__chatgpt_linux_health__":
            body = self.health_token.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--bind", default="127.0.0.1")
    parser.add_argument("--port", required=True, type=int)
    parser.add_argument("--directory", required=True)
    parser.add_argument("--health-token", required=True)
    args = parser.parse_args()

    handler = functools.partial(
        WebviewHandler,
        directory=args.directory,
        health_token=args.health_token,
    )
    server = ThreadingHTTPServer((args.bind, args.port), handler)
    server.daemon_threads = True
    server.serve_forever()


if __name__ == "__main__":
    main()
