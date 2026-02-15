const userId = localStorage.getItem('sc_id') || 'user_' + Math.random().toString(36).substr(2, 9);
localStorage.setItem('sc_id', userId);

const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:8000'
    : 'https://smartcal-ai-1.onrender.com'; // [Global Upgrade] Updated Production URL

// [Global Upgrade] Internationalization (i18n)
const lang = navigator.language.startsWith('ko') ? 'ko' : 'en';
const t = {
    ko: {
        analyzing: "🔍 분석 중...",
        retry: "🔄 다시 촬영",
        camera_error: "📷 카메라 권한이 필요합니다. 브라우저 설정에서 허용해주세요.",
        server_error: "⚠️ 서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.",
        teaser_title: "분석 완료!",
        teaser_desc: "상세 영양 성분을 확인하려면<br>프리미엄 구독이 필요합니다.",
        teaser_sub: "단 한 번 결제로 평생 무제한 이용",
        premium_locked: "🔒 프리미엄 전용",
        cta: [
            "☕ 하루 130원으로 식단 고민 끝! 평생 식단 관리 시작해요.",
            "🔥 월 3,900원으로 무제한 AI 칼로리 분석!",
            "📊 한 끼 잘못 먹으면 +800kcal, SmartCal AI로 예방하세요.",
            "🧠 1초 스캔으로 음식 인식, 당신만의 식단 비서.",
            "💰 하루 130원 투자로 1년 뒤 -5kg 목표 달성!",
            "🌍 전세계 음식 데이터 자동 업데이트!",
            "🤖 YOLO 기반 음식 인식 엔진 탑재."
        ]
    },
    en: {
        analyzing: "🔍 Analyzing...",
        retry: "🔄 Retake",
        camera_error: "📷 Camera permission required.",
        server_error: "⚠️ Connection failed. Please try again.",
        teaser_title: "Analysis Complete!",
        teaser_desc: "Unlock full nutrition details<br>with Premium.",
        teaser_sub: "One-time payment for lifetime access",
        premium_locked: "🔒 Premium Only",
        cta: [
            "☕Track calories for less than a coffee!",
            "🔥 Unlimited AI analysis for a lifetime.",
            "📊 Prevent overeating with instant analysis.",
            "🧠 Your personal nutrition assistant in 1 sec.",
            "💰 Invest in your health today.",
            "🌍 Global food database updated daily!",
            "🤖 Powered by advanced YOLO AI."
        ]
    }
};

const ctaMessages = t[lang].cta;


// 카메라 켜기
navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(s => v.srcObject = s)
    .catch(err => {
        alert(t[lang].camera_error);
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
    btn.innerText = t[lang].analyzing;
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
            // [수익화 전략] '티저(Teaser)' + PayPal 결제
            document.getElementById('name').innerText = t[lang].premium_locked;
            document.getElementById('kcal').innerText = "??? kcal";
            document.getElementById('carb').innerText = "?g";
            document.getElementById('prot').innerText = "?g";
            document.getElementById('fat').innerText = "?g";

            const resultBox = document.getElementById('resultBox');
            resultBox.innerHTML = `
                <div class="absolute inset-0 bg-black/80 z-10 flex flex-col items-center justify-center text-center p-6 backdrop-blur-md">
                    <p class="text-3xl mb-2">🔒</p>
                    <h3 class="text-xl font-bold text-white mb-2">${t[lang].teaser_title}</h3>
                    <p class="text-gray-300 text-sm mb-6">${t[lang].teaser_desc}</p>
                    
                    <div id="paypal-button-container" class="w-full max-w-xs"></div>

                    <p class="text-xs text-gray-500 mt-4">${t[lang].teaser_sub}</p>
                </div>
                <img src="${d.result_image || ''}" class="w-full h-full object-cover opacity-30 blur-sm">
            `;

            document.getElementById('info').classList.remove('hidden');
            resultBox.classList.remove('hidden');
            v.classList.add('hidden');

            // [Global Upgrade] PayPal 버튼 렌더링
            setTimeout(() => {
                paypal.Buttons({
                    createOrder: function (data, actions) {
                        return actions.order.create({
                            purchase_units: [{ amount: { value: '9.90' } }] // $9.90 USD
                        });
                    },
                    onApprove: function (data, actions) {
                        return actions.order.capture().then(function (details) {
                            alert('Transaction completed by ' + details.payer.name.given_name + '!');
                            // 결제 성공 시 서버에 알림 (backend/main.py의 /pay-success 호출)
                            fetch(`${API_URL}/pay-success?user_id=${userId}`, { method: 'POST' })
                                .then(() => {
                                    alert(lang === 'ko' ? "🎉 프리미엄이 활성화되었습니다!" : "🎉 Premium Activated!");
                                    location.reload();
                                });
                        });
                    }
                }).render('#paypal-button-container');
            }, 100);

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
        btn.innerText = t[lang].retry;
        btn.disabled = false;
        btn.onclick = () => location.reload();
    } catch (e) {
        alert(t[lang].server_error);
        console.error("Upload Error:", e);
        btn_reset();
    }
}

function btn_reset() {
    const btn = document.querySelector('button');
    btn.innerText = "📸"; // 아이콘만으로 표시하여 언어 중립성 유지
    btn.disabled = false;
}
