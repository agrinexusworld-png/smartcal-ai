const userId = localStorage.getItem('sc_id') || 'user_' + Math.random().toString(36).substr(2, 9);
localStorage.setItem('sc_id', userId);

const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:8000'
    : 'https://smartcal-ai-1.onrender.com'; // [Global Upgrade] Updated Production URL

// [Global Upgrade] Internationalization (i18n)
// 저장된 언어 설정이 있으면 사용, 없으면 브라우저 설정 사용
const savedLang = localStorage.getItem('smartcal_lang');
const lang = savedLang ? savedLang : (navigator.language.startsWith('ko') ? 'ko' : 'en');
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
        navbar_app: "앱 설치",
        navbar_pro: "Pro Plan",
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
        navbar_app: "App",
        navbar_pro: "Pro Plan",
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

let ctaMessages = t[lang].cta;

// [UI] 언어 변경 및 네비게이션 로직
document.getElementById('lang-btn').onclick = () => {
    const newLang = lang === 'ko' ? 'en' : 'ko';
    localStorage.setItem('smartcal_lang', newLang);
    location.reload();
    // 다국어 즉시 적용을 위해 리로드가 가장 확실함 (간단한 구현)
    // 실제로는 텍스트만 교체하는 것이 UX에 좋지만, 현재 구조상 리로드가 빠름
};

// 언어 초기화 (저장된 값 우선)
if (localStorage.getItem('smartcal_lang')) {
    if (localStorage.getItem('smartcal_lang') !== lang) {
        // navigator.language와 저장된 값이 다르면, 저장된 값으로 강제 리로드 필요할 수 있음
        // 하지만 여기선 const lang 초기화 시점에 처리하는게 좋음. 
        // 이미 const lang 선언이 위에서 되었으므로, 복잡도를 낮추기 위해 UI 텍스트 업데이트만 수행
    }
}

// UI 텍스트 업데이트 함수
function updateUIText() {
    document.getElementById('lang-text').innerText = lang.toUpperCase();
    document.getElementById('nav-app').innerText = t[lang].navbar_app;
    // 버튼 등 다른 요소들도 업데이트 필요하면 추가
}
updateUIText();

function showTeaser() {
    // Pro Plan 버튼 클릭 시: 강제로 티저 UI 보여주기 (구매 유도)
    // 이미 프리미엄이면 "이미 활성화됨" 알림
    alert(lang === 'ko' ? "✨ 프리미엄 멤버십 페이지로 이동합니다." : "✨ Redirecting to Premium Membership.");
    // 실제로는 티저 모달을 띄우거나 결제 로직 호출
    // 여기서는 requestPayment()와 유사한 효과를 내거나, 티저 함수 재사용
    // 편의상 티저 처럼 동작하는 업로드 실패(expired) 상황을 시뮬레이션 할 수도 있음.

    // 단순 안내
    const resultBox = document.getElementById('resultBox');
    if (resultBox.classList.contains('hidden')) {
        // 결과 화면이 없을 때는 그냥 알림만
    } else {
        // 결과 화면이 있을 때는 티저 UI 덮어씌우기 (데모용)
    }
}



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
