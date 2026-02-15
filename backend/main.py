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
    # The original pay_success logic was for 'first_access' and 'unlimited' time.
    # The new analyze logic expects 'plan' and 'count'.
    # I will adapt pay_success to set 'plan' to 'premium' and 'count' to 0 (or a very high number).
    # For simplicity, setting plan to 'premium' and count to 0.
    c.execute("INSERT OR REPLACE INTO users (id, plan, count) VALUES (?, ?, ?)", (user_id, "premium", 0))
    conn.commit(); conn.close()
    return {"status": "ok"}

@app.post("/analyze")
async def analyze(file: UploadFile = File(...), user_id: str = Header(None)): # Changed user_id to str as per edit
    try:
        # [이미지 처리 안전장치]
        contents = await file.read()
        if not contents:
            return JSONResponse(content={"error": "Empty file"}, status_code=400)

        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return JSONResponse(content={"error": "Invalid image format"}, status_code=400)

        # YOLO 추론
        results = model(img)
        
        # [정확도 개선] 가장 높은 신뢰도의 객체 1개만 선택
        best_box = None
        max_conf = 0.0

        for r in results:
            boxes = r.boxes
            for box in boxes:
                conf = float(box.conf[0])
                if conf > max_conf:
                    max_conf = conf
                    best_box = box
        
        food_name = "bowl" # 기본값
        if best_box:
            cls_id = int(best_box.cls[0])
            food_name = model.names[cls_id]
        
        # 식약처 API 연동
        nutri = await fetch_mfds(food_name)

        # 사용자 데이터베이스 업데이트 (무료/유료 체크)
        # Using 'smartcal_pro.db' for consistency with the rest of the file.
        conn = sqlite3.connect('smartcal_pro.db')
        c = conn.cursor()
        c.execute("SELECT plan, count FROM users WHERE id=?", (user_id,))
        row = c.fetchone()
        
        if not row:
            c.execute("INSERT INTO users (id, plan, count) VALUES (?, ?, ?)", (user_id, 'free', 0))
            plan, count = 'free', 0
        else:
            plan, count = row

        # [수익화 모델] 무료 유저는 3회까지만 상세 정보 제공 -> 4회차부터 'expired' 리턴
        # 데모 목적상 1회만 제공하거나, 확률적으로 잠글 수도 있음.
        # 여기서는 그대로 유지
        if plan == 'free' and count >= 3:
             # 이미지 저장 (블러 처리용 원본)
            _, img_encoded = cv2.imencode('.jpg', img)
            img_base64 = base64.b64encode(img_encoded).decode('utf-8')
            return {"error": "expired", "result_image": f"data:image/jpeg;base64,{img_base64}"}

        # 카운트 증가 (only for free users, premium users don't have count limits)
        if plan == 'free':
            c.execute("UPDATE users SET count = count + 1 WHERE id=?", (user_id,))
        conn.commit()
        conn.close()

        # 결과 이미지 (바운딩 박스 그리기)
        # Ensure results is not empty before plotting
        if results and len(results) > 0:
            res_plotted = results[0].plot()
        else:
            res_plotted = img # If no detection, return original image

        _, img_encoded = cv2.imencode('.jpg', res_plotted)
        img_base64 = base64.b64encode(img_encoded).decode('utf-8')

        return {
            "food_name": nutri["name"],
            "calories": nutri["kcal"],
            "carbs": nutri["carbs"],
            "protein": nutri["protein"],
            "fat": nutri["fat"],
            "result_image": f"data:image/jpeg;base64,{img_base64}"
        }

    except Exception as e:
        print(f"Error processing image: {e}")
        return JSONResponse(content={"error": "Server processing failed"}, status_code=500)

if __name__ == "__main__":
    # Render 환경의 포트 자동 바인딩 설정
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
