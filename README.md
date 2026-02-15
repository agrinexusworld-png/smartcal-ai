# SmartCal AI 🍎

YOLOv8과 식품안전나라 API를 활용한 AI 기반 칼로리 트래커입니다.

## 주요 기능
- 📸 실시간 음식 감지 (Object Detection)
- 📊 자동 칼로리 및 영양 성분 분석
- ☁️ 클라우드 배포 준비 완료 (FastAPI + SQLite)
- 📱 모바일 최적화 PWA 디자인

## 설치 및 실행 방법

### 백엔드 (Backend)
1. `cd backend`
2. `pip install -r requirements.txt`
3. `.env` 파일을 생성하고 `FOOD_SAFETY_KEY`를 입력하세요.
4. `python main.py` 실행

### 프론트엔드 (Frontend)
1. `frontend/index.html` 파일을 브라우저에서 열거나 Vercel을 통해 배포하여 접속하세요.
