// export.js

// 1. 動態 Header 縮放邏輯
window.addEventListener('scroll', () => {
    const header = document.getElementById('main-header');
    if (!header) return;
    if (window.scrollY > 120) {
        header.classList.add('scrolled');
    } else if (window.scrollY < 20) {
        header.classList.remove('scrolled');
    }
});

// 2. 匯出報告功能
async function exportReport(type) {
    // 檢查依賴
    if (typeof html2canvas === 'undefined') {
        alert('正在載入繪圖套件，請稍後再試。');
        return;
    }
    if (type === 'pdf' && (!window.jspdf || !window.jspdf.jsPDF)) {
        alert('正在載入 PDF 套件，請稍後再試。');
        return;
    }

    const container = document.getElementById('export-report-container');
    container.innerHTML = ''; // 清空先前內容
    container.style.display = 'block'; // 短暫顯示以供 html2canvas 擷取

    // 擷取目前的狀態
    const currentAge = parseInt(document.getElementById('currentAge').value);
    
    // 生成 A4 排版內容
    container.innerHTML = `
        <div style="font-family: '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', sans-serif; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #007AFF; margin: 0; font-size: 28px;">Teach or Not 職涯財富精算報告</h1>
                <p style="color: #666; margin-top: 8px; font-size: 14px;">目前年齡: ${currentAge} 歲 | 報告產出時間: ${new Date().toLocaleDateString()}</p>
            </div>
            
            <h2 style="color: #333; border-bottom: 2px solid #007AFF; padding-bottom: 8px; font-size: 18px;">目前狀態與參數</h2>
            <div style="display: flex; gap: 20px; margin-bottom: 30px; font-size: 13px;">
                <div style="flex: 1; background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #eee;">
                    <h3 style="margin-top: 0; color: #555; font-size: 15px;">環境與分配</h3>
                    <p style="margin: 5px 0;"><strong>投資報酬率:</strong> ${document.getElementById('roi').value}%</p>
                    <p style="margin: 5px 0;"><strong>退休金投報率:</strong> ${document.getElementById('pensionRoi').value}%</p>
                    <p style="margin: 5px 0;"><strong>已有投資:</strong> ${parseInt(document.getElementById('initInvest').value).toLocaleString()} 元</p>
                    <p style="margin: 5px 0;"><strong>已有存款:</strong> ${parseInt(document.getElementById('initCash').value).toLocaleString()} 元</p>
                </div>
                <div style="flex: 1; background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #eee;">
                    <h3 style="margin-top: 0; color: #555; font-size: 15px;">公教設定</h3>
                    <p style="margin: 5px 0;"><strong>最高學歷:</strong> ${document.getElementById('teacherDegree').options[document.getElementById('teacherDegree').selectedIndex].text}</p>
                    <p style="margin: 5px 0;"><strong>起敘薪點:</strong> ${document.getElementById('startPoint').value}</p>
                    <p style="margin: 5px 0;"><strong>教師身份:</strong> ${document.getElementById('teacherType').options[document.getElementById('teacherType').selectedIndex].text}</p>
                </div>
            </div>

            <h2 style="color: #333; border-bottom: 2px solid #FF9500; padding-bottom: 8px; font-size: 18px;">${currentAge} 歲 - 財務結構明細表 (教師)</h2>
            <div id="report-tables" style="margin-bottom: 30px; font-size: 13px;">
                <!-- Tables will be injected here -->
            </div>

            <h2 style="color: #333; border-bottom: 2px solid #AF52DE; padding-bottom: 8px; font-size: 18px;">生命週期曲線圖</h2>
            <div id="report-chart-cumulative" style="width: 100%; height: auto; text-align: center;"></div>
        </div>
    `;

    let teacherData = null;
    if (typeof simDataInv !== 'undefined' && simDataInv[0]) {
        let p = simDataInv[0];
        let startAge = parseInt(document.getElementById('currentAge').value) || 26;
        let idx = currentAge - startAge;
        if (idx >= 0 && idx < p.aGross.length) {
            teacherData = {
                monthlyGross: p.mGross[idx],
                annualGross: p.aGross[idx],
                tax: p.aTax[idx].tax,
                laborInsY: p.aLabor[idx],
                healthInsY: p.aHealth[idx],
                expenseM: p.mExp[idx],
                expenseY: p.aExp[idx],
                investM: p.mInv[idx],
                investY: p.aInv[idx],
                saveM: p.mSav[idx],
                saveY: p.aSav[idx],
                cumNetAssets: p.wT[idx],
                pensionPool: p.wT_pool[idx]
            };
        }
    }
    
    if (teacherData) {
        const tableHtml = `
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr style="background: #f1f1f1; color: #333;">
                        <th style="padding: 10px; border: 1px solid #ddd;">項目</th>
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">每月金額</th>
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">年度總額</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">應發薪資 (本俸+加給)</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${Math.round(teacherData.monthlyGross).toLocaleString()}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${Math.round(teacherData.annualGross).toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; color: #FF3B30;">稅金與保費支出</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #FF3B30;">-${Math.round((teacherData.tax + teacherData.laborInsY + teacherData.healthInsY)/12).toLocaleString()}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #FF3B30;">-${Math.round(teacherData.tax + teacherData.laborInsY + teacherData.healthInsY).toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; color: #FF9500;">生活費支出</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #FF9500;">-${Math.round(teacherData.expenseM).toLocaleString()}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #FF9500;">-${Math.round(teacherData.expenseY).toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; color: #34C759;">投資分配</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #34C759;">${Math.round(teacherData.investM).toLocaleString()}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #34C759;">${Math.round(teacherData.investY).toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; color: #5AC8FA;">儲蓄分配</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #5AC8FA;">${Math.round(teacherData.saveM).toLocaleString()}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #5AC8FA;">${Math.round(teacherData.saveY).toLocaleString()}</td>
                    </tr>
                    <tr style="background: rgba(0, 122, 255, 0.05); font-weight: bold; font-size: 14px;">
                        <td style="padding: 10px; border: 1px solid #ddd;">累積可動用總資產</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #007AFF;" colspan="2">${Math.round(teacherData.cumNetAssets).toLocaleString()} 元</td>
                    </tr>
                    <tr style="background: rgba(175, 82, 222, 0.05); font-weight: bold; font-size: 14px;">
                        <td style="padding: 10px; border: 1px solid #ddd;">退休資金池 (含雇主與政府提撥)</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #AF52DE;" colspan="2">${Math.round(teacherData.pensionPool).toLocaleString()} 元</td>
                    </tr>
                </tbody>
            </table>
        `;
        document.getElementById('report-tables').innerHTML = tableHtml;
    } else {
        document.getElementById('report-tables').innerHTML = '<p style="color:red; text-align:center; padding: 20px;">資料生成失敗。請先點擊「執行精算更新」後，再嘗試匯出。</p>';
    }

    // 複製圖表 Canvas
    const sourceCanvas = document.getElementById('cumulativeChart');
    if (sourceCanvas) {
        const targetContainer = document.getElementById('report-chart-cumulative');
        const imgUrl = sourceCanvas.toDataURL('image/png');
        const img = document.createElement('img');
        img.src = imgUrl;
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.borderRadius = '8px';
        img.style.border = '1px solid #eee';
        img.style.boxShadow = '0 4px 10px rgba(0,0,0,0.05)';
        targetContainer.appendChild(img);
    }

    // 顯示載入中提示
    const btnText = type === 'png' ? '圖片生成中...' : 'PDF 生成中...';
    const originalBtn = document.activeElement;
    if (originalBtn && originalBtn.tagName === 'BUTTON') {
        originalBtn.dataset.originalText = originalBtn.innerText;
        originalBtn.innerText = btnText;
        originalBtn.disabled = true;
    }

    // 等待渲染完成
    await new Promise(r => setTimeout(r, 800));

    try {
        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
        });

        if (type === 'png') {
            const link = document.createElement('a');
            link.download = `TeachOrNot_Report_${currentAge}歲.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } else if (type === 'pdf') {
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const { jsPDF } = window.jspdf;
            
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`TeachOrNot_Report_${currentAge}歲.pdf`);
        }
    } catch (err) {
        console.error('Export failed:', err);
        alert('匯出時發生錯誤，請稍後再試。');
    } finally {
        container.style.display = 'none';
        if (originalBtn && originalBtn.tagName === 'BUTTON') {
            originalBtn.innerText = originalBtn.dataset.originalText;
            originalBtn.disabled = false;
        }
    }
}

window.isSimulationRun = false;
function exportReportSafe(type) {
    if (!window.isSimulationRun) {
        alert('請先點擊「執行精算更新」產生資料後再匯出！');
        return;
    }
    exportReport(type);
}
