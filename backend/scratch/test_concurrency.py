import asyncio
import httpx
import time

urls = [
    "http://127.0.0.1:8000/admin/stats",
    "http://127.0.0.1:8000/admin/telecaller-performance",
    "http://127.0.0.1:8000/admin/prospect-pipeline",
    "http://127.0.0.1:8000/users",
    "http://127.0.0.1:8000/spoc-reports"
]

async def fetch(client, url):
    start = time.time()
    try:
        resp = await client.get(url, timeout=10.0)
        print(f"URL: {url} | Status: {resp.status_code} | Time: {time.time() - start:.3f}s")
        return resp.status_code
    except Exception as e:
        print(f"URL: {url} | Error: {e} | Time: {time.time() - start:.3f}s")
        return 500

async def main():
    async with httpx.AsyncClient() as client:
        # Fire them concurrently
        tasks = [fetch(client, url) for url in urls]
        results = await asyncio.gather(*tasks)
        print(f"All done. Results: {results}")

if __name__ == "__main__":
    asyncio.run(main())
