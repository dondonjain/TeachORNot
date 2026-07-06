/**
 * 軍公教調薪試算系統 - 核心邏輯
 */

function formatMoney(num) { 
    return Math.round(num).toLocaleString('en-US'); 
}

function getHealthIns(gross) { 
    let bracket = AppData.healthBrackets.find(b => b >= gross) || gross; 
    return Math.round(bracket * 0.0517 * 0.3); 
}

function getTaxData(grossAnnual, extraDeduction = 0) {
    let totalDeduction = 446000 + extraDeduction;
    let taxable = Math.max(0, grossAnnual - totalDeduction);
    let tax = 0, rate = '0%';
    if(taxable <= 0) { tax = 0; rate = '0%'; }
    else if (taxable <= 590000) { tax = taxable * 0.05; rate = '5%'; }
    else if (taxable <= 1280000) { tax = taxable * 0.12 - 41300; rate = '12%'; }
    else if (taxable <= 2530000) { tax = taxable * 0.20 - 143700; rate = '20%'; }
    else if (taxable <= 4980000) { tax = taxable * 0.30 - 396700; rate = '30%'; }
    else { tax = taxable * 0.40 - 894700; rate = '40%'; }
    return { tax: Math.max(0, tax), rate: rate };
}

function togglePensionUI() {
    let val = document.getElementById('teacherType').value;
    document.getElementById('laborPensionGroup').style.display = (val === 'substitute' || val === 'substitute_no_cert') ? 'flex' : 'none';
    let volGroup = document.getElementById('voluntaryPensionGroup');
    if (volGroup) volGroup.style.display = (val === 'official_new') ? 'flex' : 'none';
}

function calculateStage(stageIdx, point, teacherType, optInPensionRate, supervisorRole, classCount, isHomeroom = false) {
    let isOldSys = teacherType === 'official_old';
    let isNewSys = teacherType === 'official_new';
    
    // 取得原本俸與學術加給
    let b = AppData.basePayMap[point] || 0;
    let a = (point >= 475) ? 35780 : ((point >= 350) ? 30140 : ((point >= 245) ? 26560 : 23080));
    if (teacherType === 'substitute_no_cert') {
        a = Math.round(a * 0.8);
    }
    
    // 取得主管加給(s)
    let s = 0;
    if (supervisorRole === '校長(高中職)') s = 13510;
    else if (supervisorRole === '校長(一般中小學)') s = 10010;
    else if (supervisorRole === '主任' && classCount === '70班以上') s = 7750;
    else if (supervisorRole === '主任' || supervisorRole === '組長') {
        if (point >= 290) s = 5930;
        else if (point >= 245) s = 4870;
        else s = 4320;
    }
    
    let h = isHomeroom ? 4000 : 0;
    
    // 依據調薪階段調整
    if (stageIdx === 1) {
        a += 2000;
        if (s > 0) s += 2000;
    } else if (stageIdx === 2) {
        a += 2000;
        if (s > 0) s += 2000;
        
        b = Math.round(b * 1.04);
        a = Math.round(a * 1.04);
        if (s > 0) s = Math.round(s * 1.04);
    }
    
    let gM = b + a + s + h;
    let mH = getHealthIns(b + a + s + h);
    
    let mPubSelf = 0, mPubGov = 0;
    if (isOldSys) {
        mPubSelf = Math.round(b * 0.0722 * 0.35);
        mPubGov  = Math.round(b * 0.0722 * 0.65);
    } else if (isNewSys) {
        mPubSelf = Math.round(b * 0.1633 * 0.35);
        mPubGov  = Math.round(b * 0.1633 * 0.65);
    }
    
    let volPenElement = document.getElementById('voluntaryPensionRate');
    let volPenRate = (isNewSys && volPenElement) ? parseFloat(volPenElement.value) / 100 : 0;
    let mVolPen = (isOldSys || isNewSys) ? Math.round(b * 2 * volPenRate) : 0;

    let mPenSelf = (isOldSys || isNewSys) ? Math.round(b * 2 * 0.15 * 0.35 + mVolPen) : Math.round(Math.min(gM, 150000) * optInPensionRate);
    let mPenGov  = (isOldSys || isNewSys) ? Math.round(b * 2 * 0.15 * 0.65) : Math.round(Math.min(gM, 150000)*0.06);
    
    let mLaborSelf = (isOldSys || isNewSys) ? 0 : 1145;
    let mLaborGov  = (isOldSys || isNewSys) ? 0 : 4580;
    
    let netM = gM - mH - mPubSelf - mPenSelf - mLaborSelf;
    let poolGov = mPubGov + mPenGov + mLaborGov;
    
    // 單年總收入預估
    // 正式教師：單月薪資 × 13.5個月(含年終獎金) + 1個月考績獎金 = 14.5
    // 代理教師：單月薪資 × 13.5個月(含年終獎金)
    let gA = (isOldSys || isNewSys) ? gM * 14.5 : gM * 13.5;
    let taxObj = getTaxData(gA, mPenSelf * 12 + (h + s) * ((isOldSys || isNewSys) ? 14.5 : 13.5));
    let tax = taxObj.tax;
    let taxRate = taxObj.rate;
    let aNetActual = gA - tax - mH*12 - mLaborSelf*12 - mPubSelf*12 - mPenSelf*12;
    let poolGovAnnual = poolGov * 12;
    
    return {
        stageIdx, b, a, s, h, gM, mH, mPubSelf, mPenSelf, mLaborSelf, netM, poolGov,
        gA, tax, taxRate, aNetActual, poolGovAnnual,
        isOldSys, isNewSys
    };
}

function renderCard(data, title, subtitle, color, diffFrom) {
    let pubDeductionHTML = '';
    if (data.isOldSys || data.isNewSys) {
        let pubRateLabel = data.isOldSys ? '7.22%' : '16.33%';
        pubDeductionHTML = `
            <div style="display:flex; justify-content:space-between; font-size:14px; margin-bottom:5px;">
                <a href="#explanation-section" style="color:var(--text-secondary); text-decoration:none; border-bottom:1px dotted var(--text-secondary);">公保費 (費率 ${pubRateLabel})</a><span>-$${formatMoney(data.mPubSelf)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:14px; margin-bottom:5px;">
                <a href="#explanation-section" style="color:var(--text-secondary); text-decoration:none; border-bottom:1px dotted var(--text-secondary);">退撫基金</a><span>-$${formatMoney(data.mPenSelf)}</span>
            </div>
        `;
    } else {
        pubDeductionHTML = `
            <div style="display:flex; justify-content:space-between; font-size:14px; margin-bottom:5px;">
                <span style="color:var(--text-secondary)">勞保費 (自付)</span><span>-$${formatMoney(data.mLaborSelf)}</span>
            </div>
            ${data.mPenSelf > 0 ? `
            <div style="display:flex; justify-content:space-between; font-size:14px; margin-bottom:5px;">
                <span style="color:var(--text-secondary)">勞退自提 (自付)</span><span>-$${formatMoney(data.mPenSelf)}</span>
            </div>` : ''}
        `;
    }
    
    let poolLabel = (data.isOldSys || data.isNewSys) ? '政府負擔 (公保+退撫)' : '雇主負擔 (勞保+勞退)';

    let netDiffHtml = '<div class="diff-badge" style="visibility:hidden; margin-bottom:10px;">-</div>';
    let annualDiffHtml = '<div class="diff-badge" style="visibility:hidden; margin-bottom:10px;">-</div>';
    let grossDiffHtml = '<div style="font-size:12px; visibility:hidden; margin-top:2px;">(+0.0%)</div>';
    
    if (diffFrom) {
        let diffNet = data.netM - diffFrom.netM;
        let diffAnnual = data.aNetActual - diffFrom.aNetActual;
        let diffGross = data.gM - diffFrom.gM;
        
        if (diffGross > 0) {
            let percent = (diffGross / diffFrom.gM) * 100;
            grossDiffHtml = `<div style="font-size:13px; font-weight:600; color:var(--sys-green); margin-top:4px;">(+${percent.toFixed(1)}%)</div>`;
        }
        if (diffNet > 0) netDiffHtml = `<div class="diff-badge" style="margin-bottom:10px;">每月實多 +$${formatMoney(diffNet)}</div>`;
        if (diffAnnual > 0) annualDiffHtml = `<div class="diff-badge" style="margin-bottom:10px;">整年實多 +$${formatMoney(diffAnnual)}</div>`;
    }

    return `
    <div class="stage-card">
        <div class="stage-title" style="color: ${color}">${title}</div>
        <div class="stage-subtitle">${subtitle}</div>
        
        <div style="background:rgba(0,0,0,0.03); padding:10px; border-radius:8px; margin-bottom:15px;">
            <div style="display:flex; justify-content:space-between; font-size:14px; margin-bottom:5px;">
                <span style="color:var(--text-secondary)">本俸</span><span>$${formatMoney(data.b)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:14px; margin-bottom:5px;">
                <span style="color:var(--text-secondary)">學術研究加給</span><span>$${formatMoney(data.a)}</span>
            </div>
            ${data.s > 0 ? `
            <div style="display:flex; justify-content:space-between; font-size:14px; margin-bottom:5px;">
                <span style="color:var(--text-secondary)">主管職務加給</span><span>$${formatMoney(data.s)}</span>
            </div>` : ''}
            ${data.h > 0 ? `
            <div style="display:flex; justify-content:space-between; font-size:14px; margin-bottom:5px;">
                <span style="color:var(--text-secondary)">導師加給</span><span>$${formatMoney(data.h)}</span>
            </div>` : ''}
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; padding-top:8px; border-top:1px dashed var(--divider);">
                <span style="font-weight:700; line-height: 1.2;">應發月薪<br><span style="font-size:0.85em; font-weight:normal;">(Gross)</span></span>
                <div style="text-align: right;">
                    <div class="val-gross">$${formatMoney(data.gM)}</div>
                    ${grossDiffHtml}
                </div>
            </div>
        </div>
        
        <div style="padding:0 10px; margin-bottom:15px;">
            <div style="display:flex; justify-content:space-between; font-size:14px; margin-bottom:5px;">
                <span style="color:var(--text-secondary)">健保費</span><span>-$${formatMoney(data.mH)}</span>
            </div>
            ${pubDeductionHTML}
        </div>
        
        <div style="background:rgba(40,167,69,0.05); border:1px solid rgba(40,167,69,0.2); padding:15px 10px; border-radius:8px;">
            <div style="text-align:center; font-size:14px; font-weight:700; color:var(--text-primary);">實領月薪 (Net)</div>
            <div class="val-net" style="margin: 10px 0;">$${formatMoney(data.netM)}</div>
            <div style="text-align:center;">${netDiffHtml}</div>
            
            <div style="display:flex; justify-content:space-between; font-size:13px; margin-top:10px; padding-top:10px; border-top:1px dashed rgba(40,167,69,0.3);">
                <span style="color:var(--text-secondary)">${poolLabel}</span><span class="val-pool">+$${formatMoney(data.poolGov)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:14px; font-weight:700; color:var(--sys-purple); margin-top:8px; padding-top:8px; border-top:1px dashed rgba(40,167,69,0.3);">
                <span>實質總月薪 <a href="#explanation-section" style="font-size:12px; font-weight:normal; color:var(--text-secondary); text-decoration:none; border-bottom:1px dotted var(--text-secondary);">(含隱形薪酬)</a></span><span>$${formatMoney(data.netM + data.poolGov)}</span>
            </div>
        </div>
        
        <div style="margin-top:20px; text-align:center;">
            <div style="font-size:14px; color:var(--text-secondary); font-weight:700;">單年總收入預估 (已扣所得稅)</div>
            <div class="val-annual" style="margin: 10px 0;">$${formatMoney(data.aNetActual)}</div>
            <div style="text-align:center;">${annualDiffHtml}</div>
            
            <div style="font-size:12px; color:var(--text-secondary); margin-top:10px;">
                全年${poolLabel}總計: <span style="color:var(--sys-cyan); font-weight:600;">+$${formatMoney(data.poolGovAnnual)}</span>
            </div>
            <div style="font-size:12px; color:var(--sys-red); margin-top:5px; opacity:0.8;">
                全年預估所得稅: -$${formatMoney(data.tax)} (適用級距 ${data.taxRate})
            </div>
        </div>
    </div>
    `;
}

function runRaiseSimulation() {
    let point = parseInt(document.getElementById('startPoint').value) || 245;
    let teacherType = document.getElementById('teacherType').value;
    let optInPensionRate = parseFloat(document.getElementById('optInPension').value) / 100;
    let supervisorRole = document.getElementById('supervisorRole') ? document.getElementById('supervisorRole').value : '無';
    let isHomeroom = document.getElementById('isHomeroom') ? document.getElementById('isHomeroom').value === '是' : false;
    let classCount = document.getElementById('classCount') ? document.getElementById('classCount').value : '49班以下';
    
    // 若超過最大值，限制在合法範圍
    if (point > 680) { point = 680; document.getElementById('startPoint').value = 680; }
    
    let stage0 = calculateStage(0, point, teacherType, optInPensionRate, supervisorRole, classCount, isHomeroom);
    let stage1 = calculateStage(1, point, teacherType, optInPensionRate, supervisorRole, classCount, isHomeroom);
    let stage2 = calculateStage(2, point, teacherType, optInPensionRate, supervisorRole, classCount, isHomeroom);
    
    let container = document.getElementById('results-container');
    container.innerHTML = 
        renderCard(stage0, '目前薪資 (調薪前)', '現行標準', 'var(--text-primary)', null) +
        renderCard(stage1, '第一階段 (定額加給)', '115年7月起：加給 +2,000', 'var(--sys-blue)', stage0) +
        renderCard(stage2, '第二階段 (通案調薪)', '116年預計：全面 +4%', 'var(--sys-purple)', stage0);
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    let pointSelect = document.getElementById('startPoint');
    if (pointSelect && typeof AppData !== 'undefined' && AppData.allPoints) {
        AppData.allPoints.forEach(pt => {
            let option = document.createElement('option');
            option.value = pt;
            option.text = pt;
            if (pt === 245) option.selected = true;
            pointSelect.appendChild(option);
        });
    }

    togglePensionUI();
    runRaiseSimulation();
});
