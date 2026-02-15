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

// [Global Upgrade] Pro Plan 결제 유도
function showTeaser() {
    // 이미 결과 화면에 티저가 떠 있다면 중복 실행 방지
    if (document.getElementById('paypal-button-container')) {
        alert(lang === 'ko' ? "👇 아래의 PayPal 버튼을 눌러 결제를 진행해주세요." : "👇 Please click the PayPal button below.");
        return;
    }

    // 강제로 티저 UI를 활성화하여 결제를 유도 (upload 함수 내 로직 재사용을 위해 별도 함수 분리 권장되지만, 여기선 간편하게 UI 조작)
    const resultBox = document.getElementById('resultBox');
    const v = document.getElementById('v');

    // 비디오 숨기고 결과 박스 보이기
    v.classList.add('hidden');
    resultBox.classList.remove('hidden');

    // 티저 내용 주입
    resultBox.innerHTML = `
        <div class="absolute inset-0 bg-black/90 z-10 flex flex-col items-center justify-center text-center p-6 backdrop-blur-md">
            <p class="text-3xl mb-2">💎</p>
            <h3 class="text-xl font-bold text-white mb-2">SmartCal AI Pro</h3>
            <p class="text-gray-300 text-sm mb-6">${t[lang].teaser_desc}</p>
            
            <div id="paypal-button-container" class="w-full max-w-xs"></div>

            <p class="text-xs text-gray-500 mt-4">${t[lang].teaser_sub}</p>
            <button onclick="location.reload()" class="mt-4 text-gray-500 underline text-xs">Cancel</button>
        </div>
    `;

    // PayPal 버튼 렌더링
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
                    fetch(`${API_URL}/pay-success?user_id=${userId || 'guest'}`, { method: 'POST' })
                        .then(() => {
                            alert(lang === 'ko' ? "🎉 프리미엄이 활성화되었습니다!" : "🎉 Premium Activated!");
                            location.reload();
                        });
                });
            }
        }).render('#paypal-button-container');
    }, 100);
}



// [Global Upgrade] Camera Toggle Logic
// [Global Upgrade] Camera Toggle Logic
let currentFacingMode = 'environment';
let stream = null;

async function startCamera() {
    const v = document.getElementById('v');
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: currentFacingMode }
        });
        v.srcObject = stream;
    } catch (err) {
        alert(t[lang].camera_error);
        console.error("Camera Error:", err);
    }
}

function toggleCamera() {
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    startCamera();
}

// 초기 카메라 실행
startCamera();

// 5초마다 마케팅 문구 변경
setInterval(() => {
    const ctaText = document.getElementById('ctaText');
    if (!ctaText) return;
    ctaText.style.opacity = "0";
    setTimeout(() => {
        ctaText.innerText = ctaMessages[Math.floor(Math.random() * ctaMessages.length)];
        ctaText.style.opacity = "1";
    }, 500);
}, 5000);

// [Global Upgrade] TTS (Text-to-Speech)
function speak(text) {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'ko' ? 'ko-KR' : 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
}

async function capture() {
    const v = document.getElementById('v');
    const shutter = document.getElementById('shutter');
    const scanLine = document.getElementById('scan-line');
    const btn = document.querySelector('button');

    // 카메라 준비 상태 확인
    if (!v || !v.videoWidth) {
        alert(t[lang].camera_error);
        return;
    }

    // 진동 및 셔터 효과
    if (navigator.vibrate) navigator.vibrate(50);
    if (shutter) {
        shutter.classList.add('animate-shutter');
        setTimeout(() => shutter.classList.remove('animate-shutter'), 200);
    }

    // [Global Upgrade] AI Scanning Visual Effect
    if (scanLine) {
        scanLine.classList.remove('hidden');
        scanLine.classList.add('animate-scan');
    }

    if (btn) {
        btn.innerText = t[lang].analyzing;
        btn.disabled = true;
    }

    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    c.toBlob((blob) => {
        // 스캔 효과가 보이도록 1.5초 지연 후 업로드
        setTimeout(() => {
            if (scanLine) {
                scanLine.classList.add('hidden');
                scanLine.classList.remove('animate-scan');
            }
            upload(blob);
        }, 1500);
    }, 'image/jpeg', 0.8);
}

async function upload(blob) {
    const fd = new FormData(); fd.append('file', blob);
    try {
        // [UX] 서버가 깨어나는데 시간이 걸릴 수 있음을 안내
        const timeoutId = setTimeout(() => {
            const btn = document.querySelector('button');
            if (btn && btn.disabled) {
                btn.innerText = lang === 'ko' ? "서버 깨우는 중..." : "Waking up server...";
            }
        }, 3000);

        const res = await fetch(`${API_URL}/analyze`, {
            method: 'POST', body: fd, headers: { 'user-id': userId }
        });

        clearTimeout(timeoutId);

        if (!res.ok) throw new Error("Server Responded with Error");

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

        // [Global Upgrade] Voice Feedback
        const spokenText = lang === 'ko'
            ? `${d.food_name}입니다. ${d.calories}칼로리네요.`
            : `${d.food_name}, ${d.calories} calories.`;
        speak(spokenText);

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
