from fastapi import FastAPI, File, UploadFile, Header
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import cv2
import numpy as np
import base64
import uvicorn
import sqlite3
import httpx
import os
from datetime import datetime, timedelta
from typing import Optional
from dotenv import load_dotenv

load_dotenv() # .env 파일 로드


app = FastAPI()

# [보안 설정] 모든 접속을 허용하여 CORS 에러를 방지합니다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# [DB 설정] 사용자 정보를 저장합니다.
def init_db():
    conn = sqlite3.connect("smartcal_pro.db")
    c = conn.cursor()
    c.execute("CREATE TABLE IF NOT EXISTS users (user_id TEXT PRIMARY KEY, first_access TEXT)")
    conn.commit()
    conn.close()

init_db()
model = YOLO('yolov8n.pt') # 인공지능 모델 로드

# [식약처 API]
async def fetch_mfds(food_en: str):
    # [보안 개선] API 키를 환경변수에서 로드합니다.
    API_KEY = os.getenv("FOOD_SAFETY_KEY")
    if not API_KEY:
        print("⚠️ 경고: FOOD_SAFETY_KEY 환경변수가 설정되지 않았습니다. API 호출이 제한됩니다.")
        return {"name": food_en, "kcal": 0, "carbs": 0, "protein": 0, "fat": 0}

    # [정확도 개선] COCO 데이터셋의 모든 음식 클래스 매핑 및 한국어 최적화
    trans = {
        "banana": "바나나", "apple": "사과", "sandwich": "샌드위치", "orange": "오렌지",
        "broccoli": "브로콜리", "carrot": "당근", "hot dog": "핫도그", "pizza": "피자",
        "donut": "도넛", "cake": "케이크", "bowl": "비빔밥", "cup": "커피", # 일부 식기류를 음식으로 추정 (보정)
        "bottle": "음료수", "fork": "음식", "knife": "스테이크", "spoon": "국",
    }
    ko_name = trans.get(food_en, "음식") # 기본값 '음식'으로 변경하여 검색 적중률 높임
    url = f"http://openapi.foodsafetykorea.go.kr/api/{API_KEY}/I2790/json/1/1/DESC_KOR={ko_name}"
    
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(url, timeout=5.0)
            data = res.json()
            if "I2790" in data and int(data["I2790"]["total_count"]) > 0:
                row = data["I2790"]["row"][0]
                return {
                    "name": row["DESC_KOR"], 
                    "kcal": float(row["NUTR_CONT1"] or 0), 
                    "carbs": float(row["NUTR_CONT2"] or 0), 
                    "protein": float(row["NUTR_CONT3"] or 0), 
                    "fat": float(row["NUTR_CONT4"] or 0)
                }
        except Exception as e:
            print(f"❌ API 호출 오류: {e}")
            pass
    # [Fallback] API 실패 시 기본값 반환을 유지하되, 로그를 남김
    return {"name": ko_name, "kcal": 150, "carbs": 20, "protein": 5, "fat": 2}

@app.post("/pay-success")
async def pay_success(user_id: str):
    conn = sqlite3.connect("smartcal_pro.db")
    c = conn.cursor()
    unlimited = (datetime.now() + timedelta(days=36500)).isoformat()
    c.execute("INSERT OR REPLACE INTO users VALUES (?, ?)", (user_id, unlimited))
    conn.commit(); conn.close()
    return {"status": "ok"}

@app.post("/analyze")
async def analyze(file: UploadFile = File(...), user_id: Optional[str] = Header(None)):
    conn = sqlite3.connect("smartcal_pro.db")
    c = conn.cursor()
    c.execute("SELECT first_access FROM users WHERE user_id=?", (user_id,))
    row = c.fetchone()
    now = datetime.now()
    if not row:
        c.execute("INSERT INTO users VALUES (?, ?)", (user_id, now.isoformat())); conn.commit()
    elif now > datetime.fromisoformat(row[0]) + timedelta(hours=24):
        conn.close(); return {"error": "expired"}

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    results = model(img)
    
    res_data = {"food_name": "분석중", "calories": 0, "carbs": 0, "protein": 0, "fat": 0}
    for r in results:
        for box in r.boxes:
            label = model.names[int(box.cls[0])]
            data = await fetch_mfds(label)
            res_data.update({"food_name": data["name"], "calories": data["kcal"], "carbs": data["carbs"], "protein": data["protein"], "fat": data["fat"]})
            b = box.xyxy[0].cpu().numpy().astype(int)
            cv2.rectangle(img, (b[0], b[1]), (b[2], b[3]), (0, 255, 0), 4)
            break
    
    conn.close()
    _, enc = cv2.imencode('.jpg', img)
    res_data["result_image"] = f"data:image/jpeg;base64,{base64.b64encode(enc).decode('utf-8')}"
    return res_data

if __name__ == "__main__":
    # Render 환경의 포트 자동 바인딩 설정
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
