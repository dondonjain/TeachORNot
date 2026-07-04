document.addEventListener('DOMContentLoaded', () => {
    // 1. Inject CSS
    const style = document.createElement('style');
    style.innerHTML = `
        /* Footer & Subscribe Modal Styles */
        .minimal-footer {
            text-align: center;
            padding: 30px 20px 40px;
            margin-top: 40px;
            border-top: 1px solid rgba(0, 0, 0, 0.1);
            color: #475569;
            font-size: 14px;
            font-weight: 500;
            font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .minimal-footer .footer-content {
            display: flex;
            justify-content: center;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
        }
        .minimal-footer .divider {
            color: rgba(0, 0, 0, 0.1);
            margin: 0 4px;
        }
        .subscribe-link {
            color: #0ea5e9;
            text-decoration: none;
            font-weight: 600;
            position: relative;
            transition: color 0.3s;
        }
        .subscribe-link:hover {
            color: #06b6d4;
        }
        .subscribe-link::after {
            content: '';
            position: absolute;
            width: 100%;
            transform: scaleX(0);
            height: 1px;
            bottom: -2px;
            left: 0;
            background-color: #06b6d4;
            transform-origin: bottom right;
            transition: transform 0.3s ease-out;
        }
        .subscribe-link:hover::after {
            transform: scaleX(1);
            transform-origin: bottom left;
        }
        .subscribe-modal-overlay {
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(15, 23, 42, 0.4);
            backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 100000;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
            font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .subscribe-modal-overlay.active {
            opacity: 1;
            pointer-events: auto;
        }
        .subscribe-modal {
            width: 90%;
            max-width: 420px;
            position: relative;
            transform: translateY(20px) scale(0.95);
            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            text-align: center;
            padding: 32px 28px;
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid rgba(14, 165, 233, 0.3); 
            border-radius: 12px; 
            box-shadow: 0 10px 40px rgba(14, 165, 233, 0.1);
        }
        .subscribe-modal-overlay.active .subscribe-modal {
            transform: translateY(0) scale(1);
        }
        .subscribe-modal .close-btn {
            position: absolute;
            top: 12px;
            right: 16px;
            background: none;
            border: none;
            font-size: 24px;
            color: #475569;
            cursor: pointer;
            transition: color 0.2s;
            line-height: 1;
        }
        .subscribe-modal .close-btn:hover {
            color: #ef4444;
        }
        .subscribe-modal .modal-header h3 {
            margin: 0 0 10px 0;
            color: #0ea5e9;
            font-size: 20px;
            font-weight: 700;
        }
        .subscribe-modal .modal-header p {
            font-size: 14px;
            color: #475569;
            margin-bottom: 24px;
            line-height: 1.6;
        }
        .subscribe-form {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .subscribe-form input[type="email"], .subscribe-form textarea {
            padding: 12px 16px;
            font-size: 14px;
            border-radius: 8px;
            border: 1px solid rgba(14, 165, 233, 0.3);
            background: rgba(255, 255, 255, 0.9);
            color: #0f172a;
            font-family: inherit;
        }
        .subscribe-form input[type="email"] {
            text-align: center;
        }
        .subscribe-form textarea {
            resize: vertical;
            min-height: 80px;
        }
        .subscribe-form input[type="email"]:focus, .subscribe-form textarea:focus {
            border-color: #06b6d4;
            box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
            outline: none;
        }
        .subscribe-form button {
            padding: 12px;
            border: none;
            border-radius: 8px;
            background: linear-gradient(135deg, #0ea5e9, #06b6d4);
            color: white;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
            box-shadow: 0 4px 15px rgba(14, 165, 233, 0.3);
            font-family: inherit;
        }
        .subscribe-form button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(14, 165, 233, 0.4);
        }
        .subscribe-form button:active {
            transform: translateY(0);
        }
        .subscribe-form button:disabled {
            background: #475569;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
            opacity: 0.7;
        }
        .subscribe-status {
            margin-top: 12px;
            font-size: 13.5px;
            font-weight: 600;
            min-height: 20px;
        }
        .subscribe-status.success { color: #10b981; }
        .subscribe-status.error { color: #ef4444; }
    `;
    document.head.appendChild(style);

    // 2. Inject HTML
    const container = document.createElement('div');
    container.innerHTML = `
        <!-- Footer Section -->
        <footer class="minimal-footer">
            <div class="footer-content">
                <span>Crafted by 零乘零</span>
                <span class="divider">|</span>
                <span>喜歡這個工具嗎？👉 <a href="#" id="openSubscribeModal" class="subscribe-link">訂閱更新 / 意見回饋</a></span>
            </div>
        </footer>

        <!-- Subscribe Modal -->
        <div id="subscribeModal" class="subscribe-modal-overlay">
            <div class="subscribe-modal">
                <button id="closeSubscribeModal" class="close-btn">×</button>
                <div class="modal-header">
                    <h3>獲取未來更新通知</h3>
                    <p>留下 Email 接收未來更新，也歡迎在這裡留下您對平台的建議或回饋！</p>
                </div>
                <form id="subscribeForm" class="subscribe-form">
                    <input type="email" id="subscriberEmail" placeholder="您的 Email 信箱" required>
                    <textarea id="subscriberFeedback" placeholder="任何想對我說的話或建議... (選填)"></textarea>
                    <button type="submit" id="subscribeSubmitBtn">立即送出 🚀</button>
                </form>
                <div id="subscribeStatus" class="subscribe-status"></div>
            </div>
        </div>
    `;
    document.body.appendChild(container);

    // 3. Bind Events
    const modal = document.getElementById('subscribeModal');
    const openBtn = document.getElementById('openSubscribeModal');
    const closeBtn = document.getElementById('closeSubscribeModal');
    const form = document.getElementById('subscribeForm');
    const statusDiv = document.getElementById('subscribeStatus');
    const submitBtn = document.getElementById('subscribeSubmitBtn');

    // ★★★ 請將下方的 URL 換成您自己部署的 Google Apps Script 網址 ★★★
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx5rjaVT24lpf8fmhBHygum-S8bZtNvwIPDZ-_P4TT1Ryb3xWWo9GevnJjUm4Dk9CyP/exec';

    openBtn.addEventListener('click', (e) => {
        e.preventDefault();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => { statusDiv.innerText = ''; statusDiv.className = 'subscribe-status'; form.reset(); }, 300);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeBtn.click();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('subscriberEmail').value.trim();
        const feedback = document.getElementById('subscriberFeedback').value.trim();
        if (!email) return;

        // Email 格式驗證
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            statusDiv.innerText = '⚠️ 請輸入有效的 Email 格式 (例如: your.name@example.com)';
            statusDiv.className = 'subscribe-status error';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerText = '處理中...';
        statusDiv.innerText = '';
        statusDiv.className = 'subscribe-status';

        try {
            // 使用 no-cors 模式發送 POST，因為 GAS 預設會有 CORS 問題
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ 
                    email: email, 
                    feedback: feedback,
                    source: window.location.pathname.split('/').pop() || 'index', 
                    date: new Date().toISOString() 
                })
            });

            statusDiv.innerText = '🎉 感謝您的訂閱與回饋！';
            statusDiv.className = 'subscribe-status success';
            form.reset();
            setTimeout(() => closeBtn.click(), 2500);
        } catch (error) {
            statusDiv.innerText = '⚠️ 送出發生錯誤，請稍後再試或檢查您的網路設定。';
            statusDiv.className = 'subscribe-status error';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = '立即送出 🚀';
        }
    });

    // 4. Handle index.html hero section email capture
    const heroEmailInput = document.getElementById('email-input');
    const heroSubmitBtn = document.getElementById('heroSubscribeBtn');
    
    if (heroEmailInput && heroSubmitBtn) {
        heroSubmitBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = heroEmailInput.value.trim();
            if (!email) return;

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert('⚠️ 請輸入有效的 Email 格式 (例如: your.name@example.com)');
                return;
            }

            heroSubmitBtn.disabled = true;
            const originalText = heroSubmitBtn.innerText;
            heroSubmitBtn.innerText = '處理中...';

            try {
                await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ 
                        email: email, 
                        feedback: '',
                        source: 'index_hero', 
                        date: new Date().toISOString() 
                    })
                });

                heroEmailInput.value = '';
                heroSubmitBtn.innerText = '🎉 訂閱成功！';
                heroSubmitBtn.style.background = '#10b981';
                setTimeout(() => {
                    heroSubmitBtn.innerText = originalText;
                    heroSubmitBtn.disabled = false;
                    heroSubmitBtn.style.background = '';
                }, 3000);
            } catch (error) {
                alert('⚠️ 送出發生錯誤，請稍後再試或檢查網路設定。');
                heroSubmitBtn.innerText = originalText;
                heroSubmitBtn.disabled = false;
            }
        });
    }
});
