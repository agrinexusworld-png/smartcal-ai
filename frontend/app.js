const userId = localStorage.getItem('sc_id') || 'user_' + Math.random().toString(36).substr(2, 9);
localStorage.setItem('sc_id', userId);

const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:8000'
    : 'https://smartcal-ai.onrender.com';
const v = document.getElementById('v');
const ctaText = document.getElementById('cta-text');
const shutter = document.getElementById('shutter');

// 사용자님이 주신 마케팅 메시지 리스트
const ctaMessages = [
    "☕ 하루 130원으로 식단 고민 끝! 커피 1잔보다 싸게 평생 식단 관리 시작해요.",
    "🔥 월 3,900원으로 무제한 AI 칼로리 분석! 한 번 외식값보다도 저렴해요.",
    "📊 한 끼 잘못 먹으면 +800kcal, SmartCal AI로 사전에 막을 수 있어요.",
    "🧠 1초 스캔으로 음식 인식, 24시간 365일 쉬지 않는 당신만의 식단 비서.",
    "💰 하루 130원 투자로 1년 뒤 몸무게–5kg를 목표로 관리해 보세요.",
    "⚠️ 무료 체험이 끝나면, 다시는 ‘무제한 분석’ 기회를 못 볼 수도 있어요.",
    "🚨 지금 구독하지 않으면, 다음 식사도 ‘대충 계산’으로 넘어가게 됩니다.",
    "🌍 매일 0시, 전세계 음식 데이터 자동 업데이트!",
    "🤖 YOLO 기반 음식 인식 엔진, 매일 조금씩 더 똑똑해지고 있어요.",
    "💚 내 몸에 들어가는 숫자를 아는 순간, 진짜 관리가 시작됩니다.",
    "⚡ Unlock unlimited SmartCal AI. 1 tap = full nutrition insight."
    // (지면상 줄임, 실제 파일에는 주신 모든 문구를 넣으시면 됩니다)
];

// 카메라 켜기
navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(s => v.srcObject = s)
    .catch(err => {
        alert("📷 카메라 권한이 필요합니다. 브라우저 설정에서 허용해주세요.");
        console.error("Camera Error:", err);
    });

// 5초마다 마케팅 문구 변경
setInterval(() => {
    ctaText.style.opacity = "0";
    setTimeout(() => {
        ctaText.innerText = ctaMessages[Math.floor(Math.random() * ctaMessages.length)];
        ctaText.style.opacity = "1";
    }, 500);
}, 5000);

async function capture() {
    // 진동 및 셔터 효과
    if (navigator.vibrate) navigator.vibrate(50);
    shutter.classList.add('animate-shutter');
    setTimeout(() => shutter.classList.remove('animate-shutter'), 200);

    const btn = document.querySelector('button');
    btn.innerText = "🔍 분석 중...";
    btn.disabled = true;

    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    c.toBlob(upload, 'image/jpeg', 0.8);
}

async function upload(blob) {
    const fd = new FormData(); fd.append('file', blob);
    try {
        const res = await fetch(`${API_URL}/analyze`, {
            method: 'POST', body: fd, headers: { 'user-id': userId }
        });
        const d = await res.json();

        if (d.error === "expired") {
            // [수익화 전략] '티저(Teaser)' 효과: 결과는 왔지만 흐리게 보여주어 결제 유도
            // 가짜 데이터 생성 (사용자가 분석이 되었다고 믿게 함)
            document.getElementById('name').innerText = "🔒 프리미엄 전용";
            document.getElementById('kcal').innerText = "??? kcal";
            document.getElementById('carb').innerText = "?g";
            document.getElementById('prot').innerText = "?g";
            document.getElementById('fat').innerText = "?g";

            const resultBox = document.getElementById('resultBox');
            resultBox.innerHTML = `
                <div class="absolute inset-0 bg-black/80 z-10 flex flex-col items-center justify-center text-center p-6 backdrop-blur-md">
                    <p class="text-3xl mb-2">🔒</p>
                    <h3 class="text-xl font-bold text-white mb-2">분석 완료!</h3>
                    <p class="text-gray-300 text-sm mb-6">상세 영양 성분을 확인하려면<br>프리미엄구독이 필요합니다.</p>
                    <button onclick="requestPayment()" class="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 px-8 rounded-full shadow-lg animate-pulse hover:scale-105 transition-transform">
                        결제하고 결과 보기 (9,900원)
                    </button>
                    <p class="text-xs text-gray-500 mt-4">단 한 번 결제로 평생 무제한 이용</p>
                </div>
                <img src="${d.result_image || ''}" class="w-full h-full object-cover opacity-30 blur-sm">
            `;

            document.getElementById('info').classList.remove('hidden');
            resultBox.classList.remove('hidden');
            v.classList.add('hidden');

            return;
        }

        document.getElementById('name').innerText = d.food_name;
        document.getElementById('kcal').innerText = d.calories + " kcal";
        document.getElementById('carb').innerText = d.carbs + "g";
        document.getElementById('prot').innerText = d.protein + "g";
        document.getElementById('fat').innerText = d.fat + "g";
        document.getElementById('info').classList.remove('hidden');
        document.getElementById('resultBox').innerHTML = `<img src="${d.result_image}" class="w-full h-full object-cover">`;
        document.getElementById('resultBox').classList.remove('hidden');
        v.classList.add('hidden');
        const btn = document.querySelector('button');
        btn.innerText = "🔄 다시 촬영";
        btn.disabled = false;
        btn.onclick = () => location.reload();
    } catch (e) {
        alert("⚠️ 서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.");
        console.error("Upload Error:", e);
        btn_reset();
    }
}

function requestPayment() {
    const toss = TossPayments('test_ck_D53Q9DRW8vn6ed7pxz38jAYErxRG');
    toss.requestPayment('카드', {
        amount: 9900,
        orderId: 'order_' + new Date().getTime(),
        orderName: 'SmartCal AI Pro 평생권',
        successUrl: window.location.origin + '/success.html',
        failUrl: window.location.origin + '/fail.html',
    });
}
