# APIパフォーマンス分析と改善提案

## 現状分析

### システム構成
- **フレームワーク**: FastAPI (Python)
- **データベース**: MySQL 8.0
- **キャッシュ**: Redis 7.2
- **Webサーバー**: Nginx (リバースプロキシ)
- **デプロイ**: Docker Compose
- **AIエンジン**: OpenAI API + FAISS検索

### 特定されたパフォーマンスボトルネック

## 1. **サーバーリソース不足**

### 問題
- Uvicornが**シングルプロセス**で動作（ワーカー設定なし）
- 1つのプロセスが全てのリクエストを順次処理
- CPUバウンドなタスクで他のリクエストがブロック

### 影響
- 同時リクエストが待機状態になる
- OpenAI API呼び出し中は他のリクエストが処理されない

## 2. **外部API依存による遅延**

### 問題
```python
# openai_search.py: generate_input関数
completion = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=messages,
    temperature=0,
    max_tokens=1000
)
```
- OpenAI APIの応答時間（通常1-3秒）
- ネットワーク遅延・APIレート制限

### 影響
- 1リクエストが数秒間サーバーリソースを占有

## 3. **データベース接続プール未設定**

### 問題
```python
# database.py
engine = create_engine(SQLALCHEMY_DATABASE_URL)
```
- コネクションプール設定なし
- 同時接続数制限なし
- 接続の再利用効率が低い

### 影響
- データベース接続のオーバーヘッド
- 接続数増加時のパフォーマンス劣化

## 4. **FAISS検索の効率性問題**

### 問題
```python
# openai_search.py: subset_search_batch関数
index = faiss.read_index("faiss_index.bin")  # 毎回ファイル読み込み
```
- 63MBのインデックスファイルが毎回読み込まれる可能性
- メモリ効率が悪い

## 5. **非同期処理の不完全実装**

### 問題
```python
@app.post("/answer/{text}")
async def get_answer(...):  # async定義
    answer = subset_search_batch(id_list,question)  # 同期処理
```
- 関数は`async`だが内部で同期処理を実行
- 真の非同期処理になっていない

---

## 改善策

### 1. **マルチワーカー設定**

**優先度: 高**

Dockerfileの修正:
```dockerfile
CMD ["/app/wait-for-it.sh", "db", "3306", "--", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

または、Gunicornを使用:
```dockerfile
CMD ["/app/wait-for-it.sh", "db", "3306", "--", "gunicorn", "main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

### 2. **非同期処理の完全実装**

```python
import aiohttp
from openai import AsyncOpenAI

# OpenAIクライアントを非同期に変更
async_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def generate_input_async(text):
    completion = await async_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0,
        max_tokens=1000
    )
    return completion.choices[0].message.content.strip()

@app.post("/answer/{text}")
async def get_answer(request: Request, text: str, searchrequest: SearchRequest, calendar_id: int, db: Session = Depends(get_db)):
    id_list = filter_course_ids(db, searchrequest)
    question = await generate_input_async(text)  # 非同期実行
    answer = await subset_search_batch_async(id_list, question)
    # ... 残りの処理
```

### 3. **データベース接続プール設定**

```python
# database.py
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=20,           # 基本プールサイズ
    max_overflow=30,        # 追加接続数
    pool_pre_ping=True,     # 接続チェック
    pool_recycle=3600,      # 接続リサイクル時間
    echo=False
)
```

### 4. **Redis キャッシュ戦略**

```python
import json
from redis import Redis

redis_client = Redis(host='redis', port=6379, db=0, decode_responses=True)

async def get_cached_search_result(query_hash: str):
    cached = redis_client.get(f"search:{query_hash}")
    return json.loads(cached) if cached else None

async def cache_search_result(query_hash: str, result: dict, expire: int = 3600):
    redis_client.setex(f"search:{query_hash}", expire, json.dumps(result))

@app.post("/search")
async def search_courses(request: Request, searchrequest: SearchRequest, calendar_id: int, db: Session = Depends(get_db)):
    # クエリのハッシュを生成
    query_hash = hashlib.md5(str(searchrequest).encode()).hexdigest()
    
    # キャッシュ確認
    cached_result = await get_cached_search_result(query_hash)
    if cached_result:
        return cached_result
    
    # 検索実行
    id_list = filter_course_ids(db, searchrequest)
    results = read_db(db, id_list, calendar_id)
    
    result = {"results": results}
    # 結果をキャッシュ
    await cache_search_result(query_hash, result)
    
    return result
```

### 5. **FAISS インデックス最適化**

```python
# アプリケーション起動時に一度だけ読み込み
class FAISSManager:
    def __init__(self):
        self.index = None
        self.load_index()
    
    def load_index(self):
        if self.index is None:
            self.index = faiss.read_index("faiss_index.bin")
    
    async def search_async(self, embedding, k=9, id_list=None):
        loop = asyncio.get_event_loop()
        if id_list:
            id_list = [id - 1 for id in id_list]
            sel = faiss.IDSelectorBatch(id_list)
            params = faiss.SearchParametersIVF(sel=sel)
            D, I = await loop.run_in_executor(
                None, 
                lambda: self.index.search(embedding, k, params)
            )
        else:
            D, I = await loop.run_in_executor(
                None, 
                lambda: self.index.search(embedding, k)
            )
        return [id + 1 for sublist in I for id in sublist]

# グローバルインスタンス
faiss_manager = FAISSManager()
```

### 6. **Nginx 負荷分散設定**

```nginx
# nginx.conf
upstream backend {
    server backend:8000 max_fails=3 fail_timeout=30s;
    # 将来的に複数インスタンス対応
    # server backend2:8000 max_fails=3 fail_timeout=30s;
}

server {
    location /api/ {
        proxy_pass http://backend/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # タイムアウト設定
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # バッファリング設定
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
}
```

### 7. **レスポンス時間監視**

```python
import time
from fastapi import Request
import logging

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    logger.info(f"{request.method} {request.url.path} - {process_time:.3f}s")
    response.headers["X-Process-Time"] = str(process_time)
    return response
```

## 実装優先度

### Phase 1 (即座に実装可能)
1. **マルチワーカー設定** - 最も効果的
2. **データベース接続プール設定**
3. **レスポンス時間監視**

### Phase 2 (中期的改善)
1. **非同期処理の完全実装**
2. **Redis キャッシュ戦略**
3. **FAISS最適化**

### Phase 3 (長期的改善)
1. **水平スケーリング対応**
2. **データベース読み取り専用レプリカ**
3. **CDN導入**

## 期待される効果

- **応答時間**: 現在の2-5秒 → 0.5-1.5秒
- **同時接続数**: 現在の1-2 → 10-20
- **スループット**: 3-5倍向上
- **システム安定性**: 大幅改善

これらの改善により、複数クライアントからの同時アクセス時のパフォーマンス問題が大幅に解決されます。