#!/usr/bin/env python3
"""
Простой скрипт для локального запуска веб-сайта.
Запускает HTTP-сервер на порту 8000 и автоматически открывает браузер.
Совместим с Python 3.
"""

import http.server
import socketserver
import webbrowser
import threading
import time
import sys

PORT = 8000

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        # Выводим логи запросов в аккуратном формате
        sys.stdout.write("[API LOG] %s\n" % (format % args))

def open_browser():
    # Небольшая пауза, чтобы сервер успел запуститься
    time.sleep(0.8)
    url = f"http://localhost:{PORT}"
    print(f"\n🚀 Открываю браузер: {url}")
    webbrowser.open(url)

def main():
    # Запуск браузера в фоновом потоке
    threading.Thread(target=open_browser, daemon=True).start()
    
    # Запуск сервера
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("", PORT), MyHandler) as httpd:
            print("=" * 60)
            print(f" 🌐 Локальный сервер SEPA Generator запущен.")
            print(f" 👉 Адрес: http://localhost:{PORT}")
            print(f" 🛑 Для остановки нажмите Ctrl+C")
            print("=" * 60)
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Сервер успешно остановлен.")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Ошибка запуска сервера: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
