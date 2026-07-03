/**
 * Teach or Not 職涯財富精算系統 - 核心引擎
 */

// 從 data.js 載入靜態資料
const allPoints = AppData.allPoints;
const basePayMap = AppData.basePayMap;
const healthBrackets = AppData.healthBrackets;

function updateDynamicTitles() {
    let tSys = document.getElementById('title-sys').value || '職業A';
    let tStart = document.getElementById('title-start').value || '職業B';
    document.querySelectorAll('.dyn-sys').forEach(el => el.innerText = tSys);
    document.querySelectorAll('.dyn-start').forEach(el => el.innerText = tStart);
}

function updateStartPoint() {
    let deg = document.getElementById('teacherDegree').value;
    let spInput = document.getElementById('startPoint');
    if(deg === 'bachelor') spInput.value = 190;
    else if(deg === 'master') spInput.value = 245;
    else if(deg === 'phd') spInput.value = 330;
    
    buildReferenceTable();
    runSimulation();
}

function switchMainTab(index) {
    document.querySelectorAll('.nav-tab').forEach((el, i) => el.classList.toggle('active', i === index));
    document.querySelectorAll('.tab-content').forEach((el, i) => el.classList.toggle('active', i === index));
}

function toggleTeacherOptions() {
    togglePensionClaimUI();
}

function togglePensionClaimUI() {
    let val = document.getElementById('teacherType').value;
    let claimMode = document.getElementById('pensionClaimMode').value;
    
    document.getElementById('laborPensionGroup').style.display = (val === 'substitute') ? 'flex' : 'none';
    let volGroup = document.getElementById('voluntaryPensionGroup');
    if (volGroup) volGroup.style.display = (val === 'official_new') ? 'flex' : 'none';
    
    if (claimMode === 'lumpSum') {
        document.getElementById('newSysWithdrawalGroup').style.display = 'none';
    } else {
        document.getElementById('newSysWithdrawalGroup').style.display = (val === 'official_new') ? 'flex' : 'none';
    }
}

function toggleWithdrawalMode() {
    let mode = document.getElementById('pensionWithdrawalMode').value;
    document.getElementById('modeA_panel').style.display = mode === 'A' ? 'flex' : 'none';
    document.getElementById('modeB_panel').style.display = mode === 'B' ? 'flex' : 'none';
}

function toggleAllocMode() {
    let isPct = document.getElementById('allocMode').value === 'percent';
    document.getElementById('fixedPanel').style.display = isPct ? 'none' : 'block';
    document.getElementById('percentPanel').style.display = isPct ? 'block' : 'none';
}

let isPureModeActive = false;
function setChartMode(mode) {
    isPureModeActive = (mode === 'pure');
    document.getElementById('btn-mode-invest').classList.toggle('active', !isPureModeActive);
    document.getElementById('btn-mode-pure').classList.toggle('active', isPureModeActive);
    runSimulation();
}

let activeAnnualRole = 0;
let activeMonthlyRole = 0;

function switchRoleTab(roleIndex, type) {
    if(type === 'annual') {
        activeAnnualRole = roleIndex;
        document.querySelectorAll('#annual-role-tabs .role-btn').forEach((btn, i) => {
            if(btn.style.display !== 'none') btn.classList.toggle('active', i === roleIndex);
        });
        document.getElementById('annual-panel').innerHTML = '<div class="hover-placeholder"><br>請將滑鼠移至左側長條圖<br>檢視該年度的稅金與收支明細</div>';
        renderAnnualChart();
    } else {
        activeMonthlyRole = roleIndex;
        document.querySelectorAll('#monthly-role-tabs .role-btn').forEach((btn, i) => {
            if(btn.style.display !== 'none') btn.classList.toggle('active', i === roleIndex);
        });
        document.getElementById('monthly-panel').innerHTML = '<div class="hover-placeholder"><br>請將滑鼠移至左側長條圖<br>檢視該月份各項保險與分配明細</div>';
        renderMonthlyChart();
    }
}

let chartWealth, chartAnnual, chartMonthly;
let simDataInv = []; let simDataPure = [];

Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif';

function formatMoney(num) { return Math.round(num).toLocaleString('en-US'); }
function getHealthIns(gross) { let bracket = healthBrackets.find(b => b >= gross) || gross; return Math.round(bracket * 0.0517 * 0.3); }

function getTaxData(grossAnnual, extraDeduction = 0) {
    let totalDeduction = 446000 + extraDeduction;
    let taxable = Math.max(0, grossAnnual - totalDeduction);
    let tax = 0, rate = '0%', formula = '';

    if(taxable <= 0) {
        tax = 0; rate = '0%';
        formula = `無須繳稅<br><br>總收入 $${formatMoney(grossAnnual)} 未達免稅與扣除額門檻 ($446,000)`;
    } else if (taxable <= 590000) {
        tax = taxable * 0.05; rate = '5%';
        formula = `(所得淨額 $${formatMoney(taxable)} × 5%) - 累進差額 $0`;
    } else if (taxable <= 1280000) {
        tax = taxable * 0.12 - 41300; rate = '12%';
        formula = `(所得淨額 $${formatMoney(taxable)} × 12%) - 累進差額 $41,300`;
    } else if (taxable <= 2530000) {
        tax = taxable * 0.20 - 143700; rate = '20%';
        formula = `(所得淨額 $${formatMoney(taxable)} × 20%) - 累進差額 $143,700`;
    } else if (taxable <= 4980000) {
        tax = taxable * 0.30 - 396700; rate = '30%';
        formula = `(所得淨額 $${formatMoney(taxable)} × 30%) - 累進差額 $396,700`;
    } else {
        tax = taxable * 0.40 - 894700; rate = '40%';
        formula = `(所得淨額 $${formatMoney(taxable)} × 40%) - 累進差額 $894,700`;
    }
    return { tax: Math.max(0, tax), rate, formula };
}

const retirementShadingPlugin = {
    id: 'retirementShading',
    beforeDatasetsDraw: (chart) => {
        const ctx = chart.ctx; const xAxis = chart.scales.x; const yAxis = chart.scales.y;
        const retAge = parseInt(document.getElementById('retireAge').value) || 65;
        let startIndex = chart.data.labels.findIndex(l => parseInt(l.replace('歲','')) === retAge);
        
        if (startIndex !== -1) {
            let meta = chart.getDatasetMeta(0);
            if (!meta.data[startIndex]) meta = chart.getDatasetMeta(1);
            
            if (meta && meta.data[startIndex]) {
                const left = meta.data[startIndex].x; 
                const right = chart.chartArea.right;
                const top = chart.chartArea.top;
                const bottom = chart.chartArea.bottom;

                ctx.save();
                ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
                ctx.fillRect(left, top, right - left, bottom - top);
                
                ctx.beginPath(); ctx.setLineDash([5, 5]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.moveTo(left, top); ctx.lineTo(left, bottom); ctx.stroke();
                
                ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'left';
                ctx.fillText(' 退休期', left + 8, top + 20);
                ctx.restore();
            }
        }
    }
};

function buildReferenceTable() {
    const tbody = document.querySelector('#referenceTable tbody');
    tbody.innerHTML = '';
    let deg = document.getElementById('teacherDegree').value;
    let maxPoint = (deg === 'bachelor') ? 450 : ((deg === 'phd') ? 680 : 650);

    allPoints.forEach(point => {
        if(point > maxPoint) return;
        let base = basePayMap[point]; let allow = (point >= 475) ? 35780 : ((point >= 350) ? 30140 : ((point >= 245) ? 26560 : 23160));
        let gross = base + allow; let health = getHealthIns(gross);
        let offNet = gross - health - (base * 0.0828 * 0.35) - (base * 2 * 0.15 * 0.35);
        let subNet = gross - health - 1145;
        let tr = document.createElement('tr');
        tr.innerHTML = `<td>${point}</td><td>${formatMoney(base)}</td><td>${formatMoney(allow)}</td><td>${formatMoney(gross)}</td><td>${formatMoney(health)}</td><td style="color:var(--sys-blue); font-weight:bold;">${formatMoney(offNet)}</td><td style="font-weight:bold;">${formatMoney(subNet)}</td>`;
        tbody.appendChild(tr);
    });
}

function allocateFunds(netM, mode, pctE, pctI, pctS, expCap, fixE, fixI, fixS) {
    let mE=0, mI=0, mS=0;
    if(mode === 'fixed') { mE = fixE; mI = fixI; mS = fixS; } 
    else {
        let targetE = netM * pctE; mE = Math.min(targetE, expCap);
        mI = (netM * pctI) + Math.max(0, targetE - expCap); mS = netM * pctS;
    }
    return { mE, mI, mS };
}

function simulateEngine(isPure) {
    const teachType = document.getElementById('teacherType').value;
    const isOldSys = teachType === 'official_old';
    const isNewSys = teachType === 'official_new';

    const optInPension = document.getElementById('optInPension').checked;
    const startAge = parseInt(document.getElementById('currentAge').value);
    const retAge = parseInt(document.getElementById('retireAge').value) || 65;
    const engLife = parseInt(document.getElementById('engLifespan').value);
    const secSal = parseInt(document.getElementById('secondSalary').value);
    const endAge = 90;

    const mode = document.getElementById('allocMode').value;
    const pctE = parseFloat(document.getElementById('pctExp').value)/100;
    const pctI = parseFloat(document.getElementById('pctInv').value)/100;
    const pctS = parseFloat(document.getElementById('pctSav').value)/100;
    const expCap = parseFloat(document.getElementById('expCap').value);
    const fixE = parseFloat(document.getElementById('fixExp').value);
    const fixI = parseFloat(document.getElementById('fixInv').value);
    const fixS = parseFloat(document.getElementById('fixSav').value);

    const rRate = isPure ? 0 : parseFloat(document.getElementById('roi').value)/100;
    const sRate = isPure ? 0 : parseFloat(document.getElementById('savingRate').value)/100;
    const pRate = isPure ? 0 : parseFloat(document.getElementById('pensionRoi').value)/100;
    const wRate = 0.04;

    const pensionClaimMode = document.getElementById('pensionClaimMode').value;

    let sp = parseInt(document.getElementById('startPoint').value) || 245;
    let deg = document.getElementById('teacherDegree').value;
    let maxPoint = (deg === 'bachelor') ? 450 : ((deg === 'phd') ? 680 : 650);

    let mode_newSys = document.getElementById('pensionWithdrawalMode') ? document.getElementById('pensionWithdrawalMode').value : 'A';
    let rate_newSys = parseFloat(document.getElementById('modeA_rate') ? document.getElementById('modeA_rate').value : 4) / 100;
    let years_newSys = parseInt(document.getElementById('modeB_years') ? document.getElementById('modeB_years').value : 20);

    let baseData = { 
        inv: isPure ? 0 : parseFloat(document.getElementById('initInvest').value), 
        cash: isPure ? 0 : parseFloat(document.getElementById('initCash').value), 
        pFund: 0, yrs: 0, lastBase: 0, pFund_balance: 0, pFund_PMT: 0,
        virtualPool: 0, 
        labels: [], workLabels: [], wT: [], wT_pool: [],
        
        aExpWork:[], aSavWork:[], aInvWork:[],
        aPoolSelfWork:[], aPoolGovWork:[], 
        aWithRet:[], aPubAnnRet:[], aPrivAnnRet:[],
        
        mExpWork:[], mSavWork:[], mInvWork:[],
        mPoolSelfWork:[], mPoolGovWork:[], 
        mWithRet:[], mPubAnnRet:[], mPrivAnnRet:[],

        mGross:[], mNet:[], mHealth:[], mLabor:[], mPublic:[], mPensionDed:[], mExp:[], mInv:[], mSav:[], mWith:[], mAnn:[],
        aGross:[], aNet:[], aTax:[], aHealth:[], aLabor:[], aPublic:[], aPensionDed:[], aExp:[], aInv:[], aSav:[], aWith:[], aAnn:[],
        aLifetimeAnn: 0, aPubAnn: 0
    };

    let p = [JSON.parse(JSON.stringify(baseData)), JSON.parse(JSON.stringify(baseData)), JSON.parse(JSON.stringify(baseData)), JSON.parse(JSON.stringify(baseData))];
    
    let tSys = document.getElementById('title-sys').value || '職業A';
    let tStart = document.getElementById('title-start').value || '職業B';
    
    p[0].title = isOldSys ? '教師(舊制)' : (isNewSys ? '教師(新制)' : '教師(代理)'); 
    p[1].title = tSys; p[2].title = '半導體'; p[3].title = tStart;
    p[0].color = '#FF3B30'; p[1].color = '#007AFF'; p[2].color = '#1C1C1E'; p[3].color = '#FF9500';

    let engParam = [ null,
        { base: parseFloat(document.getElementById('sysBase').value), bonus: parseFloat(document.getElementById('sysBonus').value), profit: parseFloat(document.getElementById('sysProfit').value), growth: parseFloat(document.getElementById('sysGrowth').value)/100, cap: parseFloat(document.getElementById('sysCap').value) },
        { base: parseFloat(document.getElementById('semiBase').value), bonus: parseFloat(document.getElementById('semiBonus').value), profit: parseFloat(document.getElementById('semiProfit').value), growth: parseFloat(document.getElementById('semiGrowth').value)/100, cap: parseFloat(document.getElementById('semiCap').value) },
        { base: parseFloat(document.getElementById('asmlBase').value), bonus: parseFloat(document.getElementById('asmlBonus').value), profit: parseFloat(document.getElementById('asmlProfit').value), growth: parseFloat(document.getElementById('asmlGrowth').value)/100, hopYrs: parseInt(document.getElementById('hopYears').value), hopBump: parseFloat(document.getElementById('hopBump').value)/100, cap: parseFloat(document.getElementById('asmlCap').value) }
    ];

    for(let age = startAge; age <= endAge; age++) {
        let isRet = age >= retAge; let wYrs = age - startAge; let lbl = age + '歲';
        for(let i=0; i<4; i++) { p[i].labels.push(lbl); p[i].workLabels.push(lbl); }

        if(age === retAge) {
            let y = p[0].yrs; let b = p[0].lastBase;
            if(isOldSys) {
                if (pensionClaimMode === 'lumpSum' || y < 15) {
                    let lump = (b * 1.2 * y) + (b * 2 * 1.5 * y);
                    if(isPure) p[0].cash += lump; else p[0].inv += lump;
                    p[0].aLifetimeAnn = 0; p[0].aPubAnn = 0;
                } else {
                    let pubLump = b * 1.2 * Math.min(y, 36);
                    if(isPure) p[0].cash += pubLump; else p[0].inv += pubLump;
                    let maxMonthly = b * 2 * 0.02 * y; if(maxMonthly > b * 2 * 0.60) maxMonthly = b * 2 * 0.60;
                    p[0].aLifetimeAnn = maxMonthly * 12; p[0].aPubAnn = 0;
                }
                p[0].pFund_balance = 0; p[0].virtualPool = 0;
            } else if(isNewSys) {
                if (pensionClaimMode === 'lumpSum' || y < 15) {
                    let lump = b * 1.2 * y;
                    if(isPure) p[0].cash += (lump + p[0].pFund); else p[0].inv += (lump + p[0].pFund);
                    p[0].aPubAnn = 0; p[0].pFund_balance = 0; p[0].aLifetimeAnn = 0;
                    p[0].virtualPool = 0;
                } else {
                    p[0].aPubAnn = (b * Math.min(y, 35) * 0.013) * 12;
                    p[0].pFund_balance = p[0].pFund; 
                    let r = pRate; let N = years_newSys;
                    if(r > 0) p[0].pFund_PMT = p[0].pFund_balance * (r * Math.pow(1+r, N)) / (Math.pow(1+r, N) - 1);
                    else p[0].pFund_PMT = p[0].pFund_balance / N;
                    p[0].aLifetimeAnn = 0;
                    p[0].virtualPool = p[0].pFund_balance; 
                }
            } else { 
                if (pensionClaimMode === 'lumpSum' || y < 15) {
                    let lump = (45800 * 1.2 * y) + p[0].pFund;
                    if(isPure) p[0].cash += lump; else p[0].inv += lump;
                    p[0].aLifetimeAnn = 0; p[0].pFund_balance = 0; p[0].virtualPool = 0;
                } else {
                    p[0].aLifetimeAnn = (45800 * Math.min(y, 35) * 0.0155) * 12;
                    p[0].pFund_balance = p[0].pFund; 
                    let r = pRate; let N = years_newSys;
                    if(r > 0) p[0].pFund_PMT = p[0].pFund_balance * (r * Math.pow(1+r, N)) / (Math.pow(1+r, N) - 1);
                    else p[0].pFund_PMT = p[0].pFund_balance / N;
                    p[0].virtualPool = p[0].pFund_balance;
                }
            }

            for(let i=1; i<=3; i++) {
                let ey = p[i].yrs;
                if (pensionClaimMode === 'lumpSum' || ey < 15) {
                    let lump = (45800 * 1.2 * ey) + p[i].pFund;
                    if(isPure) p[i].cash += lump; else p[i].inv += lump;
                    p[i].aLifetimeAnn = 0; p[i].pFund_balance = 0; p[i].virtualPool = 0;
                } else {
                    p[i].aLifetimeAnn = (45800 * Math.min(ey, 35) * 0.0155) * 12;
                    p[i].pFund_balance = p[i].pFund; 
                    let r = pRate; let N = years_newSys;
                    if(r > 0) p[i].pFund_PMT = p[i].pFund_balance * (r * Math.pow(1+r, N)) / (Math.pow(1+r, N) - 1);
                    else p[i].pFund_PMT = p[i].pFund_balance / N;
                    p[i].virtualPool = p[i].pFund_balance;
                }
            }
        }

        if(!isRet) {
            let validPoints = allPoints.filter(pt => pt >= sp && pt <= maxPoint);
            let pointIndex = Math.min(wYrs, validPoints.length - 1);
            let currentPt = validPoints.length > 0 ? validPoints[pointIndex] : sp;

            let b = basePayMap[currentPt]; let a = (currentPt >= 475) ? 35780 : ((currentPt >= 350) ? 30140 : ((currentPt >= 245) ? 26560 : 23160));
            let gM = b + a; let mH = getHealthIns(gM); let mL=0, mPub=0, mPen=0;

            let mPubSelf = 0, mPubGov = 0;
            if (isOldSys) {
                mPubSelf = Math.round(b * 0.0783 * 0.35);
                mPubGov  = Math.round(b * 0.0783 * 0.65);
            } else if (isNewSys) {
                mPubSelf = Math.round(b * 0.1633 * 0.35);
                mPubGov  = Math.round(b * 0.1633 * 0.65);
            }
            
            let volPenElement = document.getElementById('voluntaryPensionRate');
            let volPenRate = (isNewSys && volPenElement) ? parseFloat(volPenElement.value) / 100 : 0;
            let mVolPen = (isOldSys || isNewSys) ? Math.round(b * 2 * volPenRate) : 0;

            let mPenSelf = (isOldSys || isNewSys) ? Math.round(b * 2 * 0.15 * 0.35 + mVolPen) : (optInPension ? Math.round(Math.min(gM, 150000)*0.06) : 0);
            let mPenGov  = (isOldSys || isNewSys) ? Math.round(b * 2 * 0.15 * 0.65) : Math.round(Math.min(gM, 150000)*0.06);
            let mLaborSelf = (isOldSys || isNewSys) ? 0 : 1145;
            let mLaborGov  = (isOldSys || isNewSys) ? 0 : 4580;

            let totalSelfM = mPubSelf + mPenSelf + mLaborSelf;
            let totalGovM  = mPubGov + mPenGov + mLaborGov;

            if(isOldSys || isNewSys) { 
                mPub = mPubSelf; mPen = mPenSelf; 
                p[0].pFund = p[0].pFund * (1+pRate) + (mPenSelf*12) + (mPenGov*12); 
                p[0].lastBase = b; 
            } else { 
                mL = mLaborSelf; mPen = mPenSelf; 
                p[0].pFund = p[0].pFund * (1+pRate) + (mPenSelf*12) + (mPenGov*12); 
            }
            
            let netM = gM - mH - mL - mPub - mPen; p[0].yrs++;
            let alloc = allocateFunds(netM, mode, pctE, pctI, pctS, expCap, fixE, fixI, fixS);
            let gA = gM * 13.5; 
            let taxObj = getTaxData(gA, (mPubSelf + mPenSelf) * 12); let bNet = (gM * 1.5) - taxObj.tax;
            let totP = pctI + pctS;
            
            let aIAdd = 0, aSAdd = bNet;
            if(mode !== 'fixed' && totP > 0 && bNet > 0) { aIAdd = bNet * (pctI / totP); aSAdd = bNet * (pctS / totP); }

            let aNetActual = gA - taxObj.tax - mH*12 - mL*12 - mPub*12 - mPen*12;
            let extraExpA = alloc.mE * 0.5;

            if(isPure) { 
                p[0].cash += aNetActual; 
            } else { 
                p[0].cash = p[0].cash*(1+sRate) + (alloc.mS*12) + aSAdd - extraExpA; p[0].inv = p[0].inv*(1+rRate) + (alloc.mI*12) + aIAdd; 
            }
            
            p[0].virtualPool = p[0].virtualPool * (1+pRate) + (totalSelfM + totalGovM) * 12;

            p[0].mGross.push(gM); p[0].mNet.push(netM); p[0].mHealth.push(mH); p[0].mLabor.push(mL); p[0].mPublic.push(mPub); p[0].mPensionDed.push(mPen);
            p[0].mExp.push(isPure ? 0 : alloc.mE); p[0].mInv.push(isPure ? 0 : alloc.mI); p[0].mSav.push(isPure ? 0 : alloc.mS); p[0].mWith.push(0); p[0].mAnn.push(0);
            p[0].mPoolSelfWork.push(totalSelfM); p[0].mPoolGovWork.push(totalGovM);

            p[0].aGross.push(gA); p[0].aNet.push(aNetActual); p[0].aTax.push(taxObj); 
            p[0].aHealth.push(mH*12); p[0].aLabor.push(mL*12); p[0].aPublic.push(mPub*12); p[0].aPensionDed.push(mPen*12);
            p[0].aExp.push(isPure ? 0 : alloc.mE*12.5); p[0].aInv.push(isPure ? 0 : alloc.mI*12 + aIAdd); p[0].aSav.push(isPure ? aNetActual : (alloc.mS*12 + aSAdd - extraExpA)); p[0].aWith.push(0); p[0].aAnn.push(0);
            p[0].aPoolSelfWork.push(totalSelfM*12); p[0].aPoolGovWork.push(totalGovM*12);

            p[0].aExpWork.push(isPure ? 0 : alloc.mE*12.5); p[0].aSavWork.push(isPure ? aNetActual : (alloc.mS*12 + aSAdd - extraExpA)); p[0].aInvWork.push(isPure ? 0 : alloc.mI*12 + aIAdd);
            p[0].aWithRet.push(0); p[0].aPubAnnRet.push(0); p[0].aPrivAnnRet.push(0);
            
            p[0].mExpWork.push(isPure ? 0 : alloc.mE); p[0].mSavWork.push(isPure ? netM : alloc.mS); p[0].mInvWork.push(isPure ? 0 : alloc.mI);
            p[0].mWithRet.push(0); p[0].mPubAnnRet.push(0); p[0].mPrivAnnRet.push(0);

            for(let i=1; i<=3; i++) {
                let e = engParam[i]; let tgM=0, bTot=0, tgA=0;
                if(wYrs < engLife) {
                    if(i===3 && wYrs>0) { if(wYrs%e.hopYrs===0) e.base*=(1+e.hopBump); else e.base*=(1+e.growth); } 
                    else if(wYrs>0) e.base*=(1+e.growth);
                    tgA = e.base * (12 + e.bonus + e.profit);
                    if(tgA > e.cap) { e.base = e.cap / (12 + e.bonus + e.profit); tgA = e.cap; }
                    tgM = e.base; bTot = e.base * (e.bonus + e.profit);
                } else { tgM = secSal; tgA = secSal * 12; bTot = 0; }

                let tmH = getHealthIns(tgM); let tmL = 1145; 
                let tmPenSelf = optInPension ? Math.round(Math.min(tgM, 150000)*0.06) : 0;
                let tmPenGov = Math.round(Math.min(tgM, 150000)*0.06);
                let tTotalSelfM = tmL + tmPenSelf; let tTotalGovM = 4580 + tmPenGov;
                
                let tnetM = tgM - tmH - tmL - tmPenSelf;
                p[i].pFund = p[i].pFund*(1+pRate) + (tmPenSelf*12) + (tmPenGov*12); p[i].yrs++;

                let talloc = allocateFunds(tnetM, mode, pctE, pctI, pctS, expCap, fixE, fixI, fixS);
                let ttaxObj = getTaxData(tgA, tmPenSelf * 12); let tbNet = bTot - ttaxObj.tax;
                let taIAdd = 0, taSAdd = tbNet;
                if(mode !== 'fixed' && totP > 0 && tbNet > 0) { taIAdd = tbNet * (pctI / totP); taSAdd = tbNet * (pctS / totP); }

                let taNetActual = tgA - ttaxObj.tax - tmH*12 - tmL*12 - tmPenSelf*12;
                let textraExpA = talloc.mE * 0.5;

                if(isPure) { 
                    p[i].cash += taNetActual; 
                } else { 
                    p[i].cash = p[i].cash*(1+sRate) + (talloc.mS*12) + taSAdd - textraExpA; p[i].inv = p[i].inv*(1+rRate) + (talloc.mI*12) + taIAdd; 
                }
                
                p[i].virtualPool = p[i].virtualPool * (1+pRate) + (tTotalSelfM + tTotalGovM) * 12;

                p[i].mGross.push(tgM); p[i].mNet.push(tnetM); p[i].mHealth.push(tmH); p[i].mLabor.push(tmL); p[i].mPublic.push(0); p[i].mPensionDed.push(tmPenSelf);
                p[i].mExp.push(isPure ? 0 : talloc.mE); p[i].mInv.push(isPure ? 0 : talloc.mI); p[i].mSav.push(isPure ? 0 : talloc.mS); p[i].mWith.push(0); p[i].mAnn.push(0);
                p[i].mPoolSelfWork.push(tTotalSelfM); p[i].mPoolGovWork.push(tTotalGovM);

                p[i].aGross.push(tgA); p[i].aNet.push(taNetActual); p[i].aTax.push(ttaxObj); 
                p[i].aHealth.push(tmH*12); p[i].aLabor.push(tmL*12); p[i].aPublic.push(0); p[i].aPensionDed.push(tmPenSelf*12);
                p[i].aExp.push(isPure ? 0 : talloc.mE*12.5); p[i].aInv.push(isPure ? 0 : talloc.mI*12 + taIAdd); p[i].aSav.push(isPure ? taNetActual : (talloc.mS*12 + taSAdd - textraExpA)); p[i].aWith.push(0); p[i].aAnn.push(0);
                p[i].aPoolSelfWork.push(tTotalSelfM*12); p[i].aPoolGovWork.push(tTotalGovM*12);

                p[i].aExpWork.push(isPure ? 0 : talloc.mE*12.5); p[i].aSavWork.push(isPure ? taNetActual : (talloc.mS*12 + taSAdd - textraExpA)); p[i].aInvWork.push(isPure ? 0 : talloc.mI*12 + taIAdd);
                p[i].aWithRet.push(0); p[i].aPubAnnRet.push(0); p[i].aPrivAnnRet.push(0);

                p[i].mExpWork.push(isPure ? 0 : talloc.mE); p[i].mSavWork.push(isPure ? tnetM : talloc.mS); p[i].mInvWork.push(isPure ? 0 : talloc.mI);
                p[i].mWithRet.push(0); p[i].mPubAnnRet.push(0); p[i].mPrivAnnRet.push(0);
            }

        } else {
            let lvA = mode === 'fixed' ? fixE*12.5 : expCap*12.5; 
            let lvM = mode === 'fixed' ? fixE : expCap;

            for(let i=0; i<4; i++) {
                let aWith = isPure ? 0 : (p[i].inv * wRate); 
                let aAccountAnn = 0;

                if (p[i].pFund_balance > 0 && pensionClaimMode === 'annuity') {
                    if (i === 0 && isNewSys) {
                        if (mode_newSys === 'A') {
                            aAccountAnn = p[0].pFund_balance * rate_newSys;
                            if(!isPure) p[0].pFund_balance = (p[0].pFund_balance - aAccountAnn) * (1 + pRate);
                        } else {
                            let yrsInRet = age - retAge;
                            if (yrsInRet < years_newSys) {
                                aAccountAnn = p[0].pFund_PMT;
                                if(!isPure) p[0].pFund_balance = (p[0].pFund_balance - aAccountAnn) * (1 + pRate);
                            } else { p[0].pFund_balance = 0; }
                        }
                    } else {
                        let yrsInRet = age - retAge;
                        if (yrsInRet < years_newSys) {
                            aAccountAnn = p[i].pFund_PMT;
                            if(!isPure) p[i].pFund_balance = (p[i].pFund_balance - aAccountAnn) * (1 + pRate);
                        } else { p[i].pFund_balance = 0; }
                    }
                }

                p[i].virtualPool = p[i].pFund_balance || 0;

                let mWith = aWith / 12;
                let currentPubAnn = p[i].aPubAnn || 0; 
                let currentPrivAnn = (p[i].aLifetimeAnn || 0) + aAccountAnn; 

                let aAnn = currentPubAnn + currentPrivAnn;
                let mAnn = aAnn / 12;
                
                let totIncA = aWith + aAnn; let totIncM = mWith + mAnn;
                let surplusA = totIncA - lvA; let surplusM = totIncM - lvM;

                if(isPure) {
                    p[i].cash += aAnn;
                } else {
                    p[i].inv = (p[i].inv - aWith) * (1+rRate); 
                    p[i].cash = p[i].cash * (1+sRate) + surplusA;
                }

                let tObj = {tax:0, rate:'0%', formula:'退休免稅'};
                p[i].aTax.push(tObj); p[i].aHealth.push(0); p[i].aLabor.push(0); p[i].aPublic.push(0); p[i].aPensionDed.push(0); p[i].aGross.push(totIncA); p[i].aNet.push(totIncA);
                p[i].mGross.push(totIncM); p[i].mNet.push(totIncM); p[i].mHealth.push(0); p[i].mLabor.push(0); p[i].mPublic.push(0); p[i].mPensionDed.push(0);
                p[i].aPoolSelfWork.push(0); p[i].aPoolGovWork.push(0); p[i].mPoolSelfWork.push(0); p[i].mPoolGovWork.push(0);

                p[i].aExp.push(isPure ? 0 : lvA); p[i].aSav.push(isPure ? aAnn : Math.max(0, surplusA)); p[i].aInv.push(0);
                p[i].mExp.push(isPure ? 0 : lvM); p[i].mSav.push(isPure ? mAnn : Math.max(0, surplusM)); p[i].mInv.push(0);

                p[i].aWith.push(aWith); p[i].aAnn.push(aAnn); p[i].mWith.push(mWith); p[i].mAnn.push(mAnn);

                p[i].aExpWork.push(0); p[i].aSavWork.push(0); p[i].aInvWork.push(0);
                p[i].aWithRet.push(aWith); p[i].aPubAnnRet.push(currentPubAnn); p[i].aPrivAnnRet.push(currentPrivAnn);

                p[i].mExpWork.push(0); p[i].mSavWork.push(0); p[i].mInvWork.push(0);
                p[i].mWithRet.push(mWith); p[i].mPubAnnRet.push(currentPubAnn/12); p[i].mPrivAnnRet.push(currentPrivAnn/12);
            }
        }
        for(let i=0; i<4; i++) {
            p[i].wT.push(Math.max(p[i].inv + p[i].cash, 0)); 
            p[i].wT_pool.push(Math.max(p[i].inv + p[i].cash + (p[i].virtualPool || 0), 0)); 
        }
    }
    return p;
}

function updateWealthPanel(idx) {
    if(!simDataInv || simDataInv.length===0) return;
    let showSys = document.getElementById('showSys').checked;
    let showSemi = document.getElementById('showSemi').checked;
    let showStart = document.getElementById('showStart').checked;
    
    let p = isPureModeActive ? simDataPure : simDataInv;
    let html = `<div class="data-title">${p[0].labels[idx]} 雙軌財富結構</div>`;
    
    function getRoleChunk(roleObj) {
        let liquid = roleObj.wT[idx];
        let total = roleObj.wT_pool[idx];
        let poolAmount = total - liquid;
        return `
            <div style="margin-bottom:12px; padding-bottom:4px; border-bottom:1px dashed var(--divider);">
                <div style="font-weight:700; color:${roleObj.color}; font-size:15px;">${roleObj.title}</div>
                <div class="data-row"><span class="data-label">└ 個人可動用資產</span><span class="data-value">$${formatMoney(liquid)}</span></div>
                <div class="data-row"><span class="data-label">└ 退休資金池金額</span><span class="data-value" style="color:var(--text-secondary);">$${formatMoney(poolAmount)}</span></div>
                <div class="data-row"><span class="data-label">└ 終極身價加總</span><span class="data-value" style="font-weight:700;">$${formatMoney(total)}</span></div>
            </div>
        `;
    }

    html += getRoleChunk(p[0]);
    if(showSys) html += getRoleChunk(p[1]);
    if(showSemi) html += getRoleChunk(p[2]);
    if(showStart) html += getRoleChunk(p[3]);
    
    document.getElementById('wealth-panel').innerHTML = html;
}

function updateAnnualPanel(idx) {
    if(!simDataInv || simDataInv.length===0) return;
    let d = isPureModeActive ? simDataPure[activeAnnualRole] : simDataInv[activeAnnualRole];
    let poolSelf = d.aPoolSelfWork && d.aPoolSelfWork[idx] ? d.aPoolSelfWork[idx] : 0;
    let poolGov = d.aPoolGovWork && d.aPoolGovWork[idx] ? d.aPoolGovWork[idx] : 0;

    let retAge = parseInt(document.getElementById('retireAge').value) || 65;
    let startAge = parseInt(document.getElementById('currentAge').value);
    let currentAge = startAge + idx;

    // 判斷是否為公立教師，藉此替換身分專屬名詞
    let isTeacher = (activeAnnualRole === 0);
    let teachType = document.getElementById('teacherType').value;
    let isPublic = isTeacher && (teachType === 'official_new' || teachType === 'official_old');
    
    let poolTitle = isPublic ? '🔒 退休資金池 (公保+退撫)' : '🔒 退休資金池 (勞保+勞退)';
    let selfLabel = '自己存入';
    let govLabel  = isPublic ? '政府負擔' : '雇主負擔'; // 修正：統一變數名稱為 govLabel
    let pensionDedLabel = isPublic ? '退撫基金 (自付)' : '勞退自提';

    let html = `<div class="data-title">${currentAge}歲 ${d.title} 年度結構</div>`;

    if (currentAge < retAge) {
        let taxObj = d.aTax[idx];
        html += `
            <div class="data-row"><span class="data-label">表定總薪資 (含分紅)</span><span class="data-value">$${formatMoney(d.aGross[idx])}</span></div>
            <div class="data-row"><span class="data-label">${govLabel}退休金</span><span class="data-value" style="color:var(--sys-cyan);">+$${formatMoney(poolGov)}</span></div>
            <div class="data-row total" style="margin-bottom:8px; padding-bottom:8px; border-bottom:2px solid var(--divider);"><span class="data-label">實質總薪酬</span><span class="data-value">$${formatMoney(d.aGross[idx] + poolGov)}</span></div>
            
            <div class="data-row">
                <span class="data-label tooltip-trigger">應繳所得稅 (級距 ${taxObj.rate})<div class="tooltip">${taxObj.formula}</div></span>
                <span class="data-value" style="color:var(--sys-red);">-$${formatMoney(taxObj.tax)}</span>
            </div>
            <div class="data-row"><span class="data-label">健保費總計</span><span class="data-value">-$${formatMoney(d.aHealth[idx])}</span></div>`;
        
        if(d.aLabor[idx] > 0) html += `<div class="data-row"><span class="data-label">勞保費總計</span><span class="data-value">-$${formatMoney(d.aLabor[idx])}</span></div>`;
        if(d.aPublic[idx] > 0) html += `<div class="data-row"><span class="data-label">公保費總計</span><span class="data-value">-$${formatMoney(d.aPublic[idx])}</span></div>`;
        if(d.aPensionDed[idx] > 0) html += `<div class="data-row"><span class="data-label">${pensionDedLabel}</span><span class="data-value">-$${formatMoney(d.aPensionDed[idx])}</span></div>`;
        
        html += `<div class="data-row total" style="margin-top:8px; padding-top:8px; border-top:2px solid var(--divider);"><span class="data-label">稅後實領淨額 (可動用)</span><span class="data-value">$${formatMoney(d.aNet[idx])}</span></div>`;
        
        if(!isPureModeActive) {
            html += `
                <div class="data-row"><span class="data-label">年度生活費</span><span class="data-value" style="color:var(--sys-red);">-$${formatMoney(d.aExp[idx])}</span></div>
                <div class="data-row"><span class="data-label">年度現金儲蓄</span><span class="data-value" style="color:var(--sys-green);">+$${formatMoney(d.aSav[idx])}</span></div>
                <div class="data-row"><span class="data-label">年度投入投資</span><span class="data-value" style="color:var(--sys-blue);">+$${formatMoney(d.aInv[idx])}</span></div>
            `;
        }
        html += `
            <div class="data-row total" style="margin-top:8px; padding-top:8px; border-top:2px solid var(--divider);">
                <span class="data-label tooltip-trigger" style="color:var(--sys-cyan); border-bottom:1px dashed var(--sys-cyan);">${poolTitle} ⓘ
                    <div class="tooltip" style="text-align:left;">
                        <strong>資金池組成說明：</strong><br>
                        1. <strong>${selfLabel}：</strong> 為您每月由薪資中扣除的強制性提撥。<br>
                        2. <strong>${govLabel}：</strong> 為雇主或政府依法應負擔的相對提撥金額。
                    </div>
                </span>
            </div>
            <div class="data-row"><span class="data-label">└ ${selfLabel}</span><span class="data-value" style="color:var(--sys-cyan);">+$${formatMoney(poolSelf)}</span></div>
            <div class="data-row"><span class="data-label">└ ${govLabel}</span><span class="data-value" style="color:var(--sys-cyan);">+$${formatMoney(poolGov)}</span></div>
        `;
    } else {
        let p1Text = "社會保險年金 (公/勞保)"; let p2Text = "職業退休金 (退撫/勞退)";
        if(!isPureModeActive) html += `
            <div class="data-row">
                <span class="data-label tooltip-trigger" style="color:var(--sys-orange); border-bottom:1px dashed var(--sys-orange);">自建退休金 ⓘ
                    <div class="tooltip">這是從總資產每年提領4%，平均每個月可支配的個人生活費。</div>
                </span>
                <span class="data-value" style="color:var(--sys-orange);">+$${formatMoney(d.aWithRet[idx])}</span>
            </div>`;
        if(d.aPubAnnRet !== undefined && d.aPubAnnRet[idx] > 0) html += `<div class="data-row"><span class="data-label">${p1Text}</span><span class="data-value" style="color:var(--sys-purple);">+$${formatMoney(d.aPubAnnRet[idx])}</span></div>`;
        if(d.aPrivAnnRet !== undefined && d.aPrivAnnRet[idx] > 0) html += `<div class="data-row"><span class="data-label">${p2Text}</span><span class="data-value" style="color:var(--sys-cyan);">+$${formatMoney(d.aPrivAnnRet[idx])}</span></div>`;

        html += `<div class="data-row total" style="margin-top:8px; padding-top:8px; border-top:2px solid var(--divider);"><span class="data-label">總退休年度現金流入</span><span class="data-value">$${formatMoney(d.aGross[idx])}</span></div>`;
        if(!isPureModeActive) {
            html += `
                <div class="data-row"><span class="data-label">年度生活費</span><span class="data-value" style="color:var(--sys-red);">-$${formatMoney(d.aExp[idx])}</span></div>
                <div class="data-row"><span class="data-label">閒錢結餘 (存入現金池)</span><span class="data-value" style="color:var(--text-primary);">+$${formatMoney(d.aSav[idx])}</span></div>
            `;
        }
    }
    document.getElementById('annual-panel').innerHTML = html;
}

function updateMonthlyPanel(idx) {
    if(!simDataInv || simDataInv.length===0) return;
    let d = isPureModeActive ? simDataPure[activeMonthlyRole] : simDataInv[activeMonthlyRole];
    let poolSelf = d.mPoolSelfWork && d.mPoolSelfWork[idx] ? d.mPoolSelfWork[idx] : 0;
    let poolGov = d.mPoolGovWork && d.mPoolGovWork[idx] ? d.mPoolGovWork[idx] : 0;

    let retAge = parseInt(document.getElementById('retireAge').value) || 65;
    let startAge = parseInt(document.getElementById('currentAge').value);
    let currentAge = startAge + idx;

    let isTeacher = (activeMonthlyRole === 0);
    let teachType = document.getElementById('teacherType').value;
    let isPublic = isTeacher && (teachType === 'official_new' || teachType === 'official_old');
    
    let poolTitle = isPublic ? '🔒 退休資金池 (公保+退撫)' : '🔒 退休資金池 (勞保+勞退)';
    let selfLabel = '自己存入';
    let govLabel  = isPublic ? '政府負擔' : '雇主負擔'; // 修正：統一變數名稱為 govLabel
    let pensionDedLabel = isPublic ? '退撫基金 (自付)' : '勞退自提';

    let html = `<div class="data-title">${currentAge}歲 ${d.title} 每月結構</div>`;

    if (currentAge < retAge) {
        html += `
            <div class="data-row"><span class="data-label">表定月薪</span><span class="data-value">$${formatMoney(d.mGross[idx])}</span></div>
            <div class="data-row"><span class="data-label">${govLabel}退休金</span><span class="data-value" style="color:var(--sys-cyan);">+$${formatMoney(poolGov)}</span></div>
            <div class="data-row total" style="margin-bottom:8px; padding-bottom:8px; border-bottom:2px solid var(--divider);"><span class="data-label">實質總月薪</span><span class="data-value">$${formatMoney(d.mGross[idx] + poolGov)}</span></div>
            
            <div class="data-row"><span class="data-label">健保費</span><span class="data-value">-$${formatMoney(d.mHealth[idx])}</span></div>`;
        if(d.mLabor[idx] > 0) html += `<div class="data-row"><span class="data-label">勞保費</span><span class="data-value">-$${formatMoney(d.mLabor[idx])}</span></div>`;
        if(d.mPublic[idx] > 0) html += `<div class="data-row"><span class="data-label">公保費</span><span class="data-value">-$${formatMoney(d.mPublic[idx])}</span></div>`;
        if(d.mPensionDed[idx] > 0) html += `<div class="data-row"><span class="data-label">${pensionDedLabel}</span><span class="data-value">-$${formatMoney(d.mPensionDed[idx])}</span></div>`;
        
        html += `<div class="data-row total" style="margin-top:8px; padding-top:8px; border-top:2px solid var(--divider);"><span class="data-label">實領月薪 (可動用)</span><span class="data-value">$${formatMoney(d.mNet[idx])}</span></div>`;
        
        if(!isPureModeActive) {
            html += `
                <div class="data-row"><span class="data-label">每月生活費</span><span class="data-value" style="color:var(--sys-red);">-$${formatMoney(d.mExp[idx])}</span></div>
                <div class="data-row"><span class="data-label">每月現金儲蓄</span><span class="data-value" style="color:var(--sys-green);">+$${formatMoney(d.mSav[idx])}</span></div>
                <div class="data-row"><span class="data-label">每月投入投資</span><span class="data-value" style="color:var(--sys-blue);">+$${formatMoney(d.mInv[idx])}</span></div>
            `;
        }
        html += `
            <div class="data-row total" style="margin-top:8px; padding-top:8px; border-top:2px solid var(--divider);">
                <span class="data-label tooltip-trigger" style="color:var(--sys-cyan); border-bottom:1px dashed var(--sys-cyan);">${poolTitle} ⓘ
                    <div class="tooltip" style="text-align:left;">
                        <strong>資金池組成說明：</strong><br>
                        1. <strong>${selfLabel}：</strong> 為您每月由薪資中扣除的強制性提撥。<br>
                        2. <strong>${govLabel}：</strong> 為雇主或政府依法應負擔的相對提撥金額。
                    </div>
                </span>
            </div>
            <div class="data-row"><span class="data-label">└ ${selfLabel}</span><span class="data-value" style="color:var(--sys-cyan);">+$${formatMoney(poolSelf)}</span></div>
            <div class="data-row"><span class="data-label">└ ${govLabel}</span><span class="data-value" style="color:var(--sys-cyan);">+$${formatMoney(poolGov)}</span></div>
        `;
    } else {
        let p1Text = "社會保險年金 (月折算)"; let p2Text = "職業退休金 (月折算)";
        if(!isPureModeActive) html += `
            <div class="data-row">
                <span class="data-label tooltip-trigger" style="color:var(--sys-orange); border-bottom:1px dashed var(--sys-orange);">自建退休金 ⓘ
                    <div class="tooltip">這是從總資產每年提領4%，平均每個月可支配的個人生活費。</div>
                </span>
                <span class="data-value" style="color:var(--sys-orange);">+$${formatMoney(d.mWithRet[idx])}</span>
            </div>`;
        if(d.mPubAnnRet !== undefined && d.mPubAnnRet[idx] > 0) html += `<div class="data-row"><span class="data-label">${p1Text}</span><span class="data-value" style="color:var(--sys-purple);">+$${formatMoney(d.mPubAnnRet[idx]*12/12)}</span></div>`;
        if(d.mPrivAnnRet !== undefined && d.mPrivAnnRet[idx] > 0) html += `<div class="data-row"><span class="data-label">${p2Text}</span><span class="data-value" style="color:var(--sys-cyan);">+$${formatMoney(d.mPrivAnnRet[idx]*12/12)}</span></div>`;

        html += `<div class="data-row total" style="margin-top:8px; padding-top:8px; border-top:2px solid var(--divider);"><span class="data-label">總退休常態月支配額</span><span class="data-value">$${formatMoney(d.mGross[idx])}</span></div>`;
        if(!isPureModeActive) {
            html += `
                <div class="data-row"><span class="data-label">每月生活費</span><span class="data-value" style="color:var(--sys-red);">-$${formatMoney(d.mExp[idx])}</span></div>
                <div class="data-row"><span class="data-label">常態剩餘現金</span><span class="data-value" style="color:var(--text-primary);">+$${formatMoney(d.mSav[idx])}</span></div>
            `;
        }
    }
    document.getElementById('monthly-panel').innerHTML = html;
}

function renderAnnualChart() {
    let d = isPureModeActive ? simDataPure[activeAnnualRole] : simDataInv[activeAnnualRole];
    
    let isTeacher = (activeAnnualRole === 0);
    let teachType = document.getElementById('teacherType').value;
    let isPublic = isTeacher && (teachType === 'official_new' || teachType === 'official_old');
    let poolGovChartLabel = isPublic ? '退休金政府負擔' : '退休金雇主負擔';

    let ds = isPureModeActive ? [
        { label: '工作期純收入', data: d.aSavWork, backgroundColor: '#34C759', stack: 'stack1', borderRadius: 4 },
        { label: '退休金自己存入', data: d.aPoolSelfWork, backgroundColor: 'rgba(90, 200, 250, 0.2)', borderColor: '#5AC8FA', borderWidth: 1.5, borderDash: [5, 5], stack: 'stack1', borderRadius: 4 },
        { label: poolGovChartLabel, data: d.aPoolGovWork, backgroundColor: 'rgba(175, 82, 222, 0.2)', borderColor: '#AF52DE', borderWidth: 1.5, borderDash: [5, 5], stack: 'stack1', borderRadius: 4 },
        { label: '社會保險年金', data: d.aPubAnnRet, backgroundColor: '#AF52DE', stack: 'stack1', borderRadius: 4 },
        { label: '職業退休金', data: d.aPrivAnnRet, backgroundColor: '#5AC8FA', stack: 'stack1', borderRadius: 4 }
    ] : [
        { label: '生活費', data: d.aExpWork, backgroundColor: '#FF3B30', stack: 'stack1', borderRadius: 4 },
        { label: '儲蓄', data: d.aSavWork, backgroundColor: '#34C759', stack: 'stack1', borderRadius: 4 },
        { label: '投資', data: d.aInvWork, backgroundColor: '#007AFF', stack: 'stack1', borderRadius: 4 },
        { label: '退休金自己存入', data: d.aPoolSelfWork, backgroundColor: 'rgba(90, 200, 250, 0.2)', borderColor: '#5AC8FA', borderWidth: 1.5, borderDash: [5, 5], stack: 'stack1', borderRadius: 4 },
        { label: poolGovChartLabel, data: d.aPoolGovWork, backgroundColor: 'rgba(175, 82, 222, 0.2)', borderColor: '#AF52DE', borderWidth: 1.5, borderDash: [5, 5], stack: 'stack1', borderRadius: 4 },
        { label: '自建退休金 (提領)', data: d.aWithRet, backgroundColor: '#FF9500', stack: 'stack1', borderRadius: 4 },
        { label: '社會保險年金', data: d.aPubAnnRet, backgroundColor: '#AF52DE', stack: 'stack1', borderRadius: 4 },
        { label: '職業退休金', data: d.aPrivAnnRet, backgroundColor: '#5AC8FA', stack: 'stack1', borderRadius: 4 }
    ];
    
    if(chartAnnual) chartAnnual.destroy();
    chartAnnual = new Chart(document.getElementById('annualChart'), {
        type: 'bar', data: { labels: d.workLabels, datasets: ds },
        options: {
            responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
            onHover: (e, els) => { if(els.length > 0) updateAnnualPanel(els[0].index); },
            plugins: { tooltip: { enabled: false }, legend: { display: false }, zoom: createZoomPluginConfig('annual') },
            scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, border: { display: false } } }
        },
        plugins: [retirementShadingPlugin]
    });
    initTimelineSlider('annual', chartAnnual);
    generateCustomLegend(chartAnnual, 'legend-annual');
}

function renderMonthlyChart() {
    let d = isPureModeActive ? simDataPure[activeMonthlyRole] : simDataInv[activeMonthlyRole];

    let isTeacher = (activeMonthlyRole === 0);
    let teachType = document.getElementById('teacherType').value;
    let isPublic = isTeacher && (teachType === 'official_new' || teachType === 'official_old');
    let poolGovChartLabel = isPublic ? '退休金政府負擔' : '退休金雇主負擔';

    let ds = isPureModeActive ? [
        { label: '工作期純收入', data: d.mSavWork, backgroundColor: '#34C759', stack: 'stack1', borderRadius: 4 },
        { label: '退休金自己存入', data: d.mPoolSelfWork, backgroundColor: 'rgba(90, 200, 250, 0.2)', borderColor: '#5AC8FA', borderWidth: 1.5, borderDash: [5, 5], stack: 'stack1', borderRadius: 4 },
        { label: poolGovChartLabel, data: d.mPoolGovWork, backgroundColor: 'rgba(175, 82, 222, 0.2)', borderColor: '#AF52DE', borderWidth: 1.5, borderDash: [5, 5], stack: 'stack1', borderRadius: 4 },
        { label: '社會保險年金', data: d.mPubAnnRet, backgroundColor: '#AF52DE', stack: 'stack1', borderRadius: 4 },
        { label: '職業退休金', data: d.mPrivAnnRet, backgroundColor: '#5AC8FA', stack: 'stack1', borderRadius: 4 }
    ] : [
        { label: '生活費', data: d.mExpWork, backgroundColor: '#FF3B30', stack: 'stack1', borderRadius: 4 },
        { label: '儲蓄', data: d.mSavWork, backgroundColor: '#34C759', stack: 'stack1', borderRadius: 4 },
        { label: '投資', data: d.mInvWork, backgroundColor: '#007AFF', stack: 'stack1', borderRadius: 4 },
        { label: '退休金自己存入', data: d.mPoolSelfWork, backgroundColor: 'rgba(90, 200, 250, 0.2)', borderColor: '#5AC8FA', borderWidth: 1.5, borderDash: [5, 5], stack: 'stack1', borderRadius: 4 },
        { label: poolGovChartLabel, data: d.mPoolGovWork, backgroundColor: 'rgba(175, 82, 222, 0.2)', borderColor: '#AF52DE', borderWidth: 1.5, borderDash: [5, 5], stack: 'stack1', borderRadius: 4 },
        { label: '自建退休金 (提領)', data: d.mWithRet, backgroundColor: '#FF9500', stack: 'stack1', borderRadius: 4 },
        { label: '社會保險年金', data: d.mPubAnnRet, backgroundColor: '#AF52DE', stack: 'stack1', borderRadius: 4 },
        { label: '職業退休金', data: d.mPrivAnnRet, backgroundColor: '#5AC8FA', stack: 'stack1', borderRadius: 4 }
    ];

    if(chartMonthly) chartMonthly.destroy();
    chartMonthly = new Chart(document.getElementById('monthlyChart'), {
        type: 'bar', data: { labels: d.workLabels, datasets: ds },
        options: {
            responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
            onHover: (e, els) => { if(els.length > 0) updateMonthlyPanel(els[0].index); },
            plugins: { tooltip: { enabled: false }, legend: { display: false }, zoom: createZoomPluginConfig('monthly') },
            scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, border: { display: false } } }
        },
        plugins: [retirementShadingPlugin]
    });
    initTimelineSlider('monthly', chartMonthly);
    generateCustomLegend(chartMonthly, 'legend-monthly');
}

function renderWealthChart() {
    let showSys = document.getElementById('showSys').checked;
    let showSemi = document.getElementById('showSemi').checked;
    let showStart = document.getElementById('showStart').checked;
    
    let ds = [];
    let p = isPureModeActive ? simDataPure : simDataInv;

    ds.push({ label: p[0].title + ' (個人可動用資產)', data: p[0].wT, borderColor: p[0].color, borderWidth: 3, pointRadius: 0, tension: 0.4 });
    ds.push({ label: p[0].title + ' (加總退休資金池)', data: p[0].wT_pool, borderColor: p[0].color, borderWidth: 2, borderDash: [4, 4], pointRadius: 0, tension: 0.4 });

    if(showSys) {
        ds.push({ label: p[1].title + ' (個人可動用資產)', data: p[1].wT, borderColor: p[1].color, borderWidth: 3, pointRadius: 0, tension: 0.4 });
        ds.push({ label: p[1].title + ' (加總退休資金池)', data: p[1].wT_pool, borderColor: p[1].color, borderWidth: 2, borderDash: [4, 4], pointRadius: 0, tension: 0.4 });
    }
    if(showSemi) {
        ds.push({ label: p[2].title + ' (個人可動用資產)', data: p[2].wT, borderColor: p[2].color, borderWidth: 3, pointRadius: 0, tension: 0.4 });
        ds.push({ label: p[2].title + ' (加總退休資金池)', data: p[2].wT_pool, borderColor: p[2].color, borderWidth: 2, borderDash: [4, 4], pointRadius: 0, tension: 0.4 });
    }
    if(showStart) {
        ds.push({ label: p[3].title + ' (個人可動用資產)', data: p[3].wT, borderColor: p[3].color, borderWidth: 3, pointRadius: 0, tension: 0.4 });
        ds.push({ label: p[3].title + ' (加總退休資金池)', data: p[3].wT_pool, borderColor: p[3].color, borderWidth: 2, borderDash: [4, 4], pointRadius: 0, tension: 0.4 });
    }

    if(chartWealth) chartWealth.destroy();
    chartWealth = new Chart(document.getElementById('cumulativeChart'), {
        type: 'line', data: { labels: p[0].labels, datasets: ds },
        options: {
            responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
            onHover: (e, els) => { if(els.length > 0) updateWealthPanel(els[0].index); },
            plugins: { tooltip: { enabled: false }, legend: { display: false }, zoom: createZoomPluginConfig('cumulative') },
            scales: { x: { grid: { display: false } }, y: { border: { display: false } } }
        },
        plugins: [retirementShadingPlugin]
    });
    initTimelineSlider('cumulative', chartWealth);
    generateCustomLegend(chartWealth, 'legend-cumulative');
}

function runSimulation() {
    window.isSimulationRun = true;
    const btnPng = document.getElementById('btn-export-png');
    if (btnPng) { btnPng.disabled = false; btnPng.style.borderColor = 'var(--sys-blue)'; btnPng.style.color = 'var(--sys-blue)'; btnPng.style.cursor = 'pointer'; btnPng.style.background = 'transparent'; }
    const btnPdf = document.getElementById('btn-export-pdf');
    if (btnPdf) { btnPdf.disabled = false; btnPdf.style.borderColor = 'var(--sys-purple)'; btnPdf.style.color = 'var(--sys-purple)'; btnPdf.style.cursor = 'pointer'; btnPdf.style.background = 'transparent'; }
    let showSys = document.getElementById('showSys').checked;
    let showSemi = document.getElementById('showSemi').checked;
    let showStart = document.getElementById('showStart').checked;

    document.getElementById('btn-annual-sys').style.display = showSys ? 'inline-block' : 'none';
    document.getElementById('btn-annual-semi').style.display = showSemi ? 'inline-block' : 'none';
    document.getElementById('btn-annual-start').style.display = showStart ? 'inline-block' : 'none';
    
    document.getElementById('btn-monthly-sys').style.display = showSys ? 'inline-block' : 'none';
    document.getElementById('btn-monthly-semi').style.display = showSemi ? 'inline-block' : 'none';
    document.getElementById('btn-monthly-start').style.display = showStart ? 'inline-block' : 'none';

    if(activeAnnualRole === 1 && !showSys) switchRoleTab(0, 'annual');
    else if(activeAnnualRole === 2 && !showSemi) switchRoleTab(0, 'annual');
    else if(activeAnnualRole === 3 && !showStart) switchRoleTab(0, 'annual');

    if(activeMonthlyRole === 1 && !showSys) switchRoleTab(0, 'monthly');
    else if(activeMonthlyRole === 2 && !showSemi) switchRoleTab(0, 'monthly');
    else if(activeMonthlyRole === 3 && !showStart) switchRoleTab(0, 'monthly');

    updateDynamicTitles();
    
    simDataInv = simulateEngine(false);
    simDataPure = simulateEngine(true);

    let primaryData = isPureModeActive ? simDataPure : simDataInv;
    let retAge = parseInt(document.getElementById('retireAge').value) || 65;
    let startAge = parseInt(document.getElementById('currentAge').value) || 26;
    let retIdx = Math.max(0, retAge - startAge);

    ['teacher','sys','semi','start'].forEach((prefix, i) => {
        let card = document.getElementById(`card-${prefix}`);
        if(card) {
            if(i===1) card.style.display = showSys ? 'block' : 'none';
            if(i===2) card.style.display = showSemi ? 'block' : 'none';
            if(i===3) card.style.display = showStart ? 'block' : 'none';
        }
        document.getElementById(`kpi-${prefix}-inv`).innerText = '$' + formatMoney(primaryData[i].wT_pool[primaryData[i].wT_pool.length-1]);
        document.getElementById(`kpi-${prefix}-pure`).innerText = isPureModeActive ? '純收入模式' : '純收入: $' + formatMoney(simDataPure[i].wT_pool[simDataPure[i].wT_pool.length-1]);
        document.getElementById(`kpi-${prefix}-ret`).innerText = '退休時總資產池: $' + formatMoney(primaryData[i].wT_pool[retIdx]);
    });

    renderWealthChart();
    renderAnnualChart();
    renderMonthlyChart();
}

// 註冊啟動事件
window.addEventListener('DOMContentLoaded', () => {
    let pointSelect = document.getElementById('startPoint');
    if (pointSelect && pointSelect.tagName.toLowerCase() === 'select' && typeof AppData !== 'undefined' && AppData.allPoints) {
        AppData.allPoints.forEach(pt => {
            let option = document.createElement('option');
            option.value = pt;
            option.text = pt;
            if (pt === 245) option.selected = true;
            pointSelect.appendChild(option);
        });
    }

    updateDynamicTitles();
    buildReferenceTable();
    toggleAllocMode();
    toggleTeacherOptions();
    runSimulation();
});

// --- Custom Legend Logic ---
function generateCustomLegend(chart, legendId) {
    let container = document.getElementById(legendId);
    if (!container || !chart) return;
    
    container.innerHTML = '';
    
    chart.data.datasets.forEach((dataset, index) => {
        let item = document.createElement('div');
        item.className = 'legend-item';
        
        let meta = chart.getDatasetMeta(index);
        if (meta.hidden) {
            item.classList.add('hidden');
        }
        
        let colorBox = document.createElement('div');
        colorBox.className = 'legend-box';
        // Handle background color for bars vs borders for lines
        let bgColor = dataset.backgroundColor || dataset.borderColor;
        if (Array.isArray(bgColor)) bgColor = bgColor[0];
        
        // Match line styles if necessary
        if (dataset.borderDash && dataset.borderDash.length > 0) {
            colorBox.style.border = `2px dashed ${dataset.borderColor}`;
            colorBox.style.backgroundColor = 'transparent';
        } else {
            colorBox.style.backgroundColor = bgColor;
        }
        
        let text = document.createElement('span');
        text.innerText = dataset.label;
        
        item.appendChild(colorBox);
        item.appendChild(text);
        
        item.onclick = () => {
            let m = chart.getDatasetMeta(index);
            m.hidden = m.hidden === null ? !chart.data.datasets[index].hidden : null;
            chart.update('none');
            generateCustomLegend(chart, legendId); // Refresh legend state
        };
        
        container.appendChild(item);
    });
}

// --- Timeline Slider Logic ---
let isSyncingTimeline = { 'cumulative': false, 'annual': false, 'monthly': false };
let chartWindowPos = { 'cumulative': 0, 'annual': 0, 'monthly': 0 };
let chartWindows = {
    'annual': 10,
    'monthly': 10,
    'cumulative': 10
};

function renderTimelineTicks(chart, sliderId) {
    let track = document.getElementById('track-' + sliderId);
    let ticksContainer = document.getElementById('ticks-' + sliderId);
    if (!track || !ticksContainer || !chart) return;
    
    let labels = chart.data.labels;
    let totalPoints = labels.length;
    if (totalPoints === 0) return;

    let startAge = parseInt(labels[0]);
    if (isNaN(startAge)) return;
    
    ticksContainer.innerHTML = '';
    
    for (let i = 0; i < totalPoints; i++) {
        let age = startAge + i;
        if (age % 5 === 0) {
            let leftPercent = (i / (totalPoints - 1)) * 100;
            let tick = document.createElement('div');
            tick.className = 'timeline-tick';
            tick.style.left = leftPercent + '%';
            tick.innerHTML = `<span>${age}</span>`;
            ticksContainer.appendChild(tick);
        }
    }
}

function syncWindowFromChart(chart, sliderId) {
    if (isSyncingTimeline[sliderId]) return;
    let windowEl = document.getElementById('window-' + sliderId);
    let labelEl = document.getElementById('label-' + sliderId);
    if (!windowEl || !chart) return;

    let xScale = chart.scales.x;
    if (!xScale) return;
    
    let totalPoints = chart.data.labels.length;
    let minIdx = xScale.min;
    let winSize = chartWindows[sliderId];
    
    if (minIdx === undefined || minIdx < 0) minIdx = 0;
    let maxIdx = minIdx + winSize - 1;
    if (maxIdx > totalPoints - 1) {
        maxIdx = totalPoints - 1;
        minIdx = maxIdx - winSize + 1;
        if (minIdx < 0) minIdx = 0;
    }

    let leftPercent = (minIdx / totalPoints) * 100;
    let widthPercent = (winSize / totalPoints) * 100;

    isSyncingTimeline = true;
    requestAnimationFrame(() => {
        windowEl.style.left = leftPercent + '%';
        windowEl.style.width = widthPercent + '%';
        if (labelEl) labelEl.innerText = winSize + '年';
        setTimeout(() => isSyncingTimeline = false, 50);
    });
}

function updateChartWindow(chart, newMinIdx, sliderId) {
    let totalPoints = chart.data.labels.length;
    let winSize = chartWindows[sliderId];
    let minIdx = Math.max(0, Math.min(newMinIdx, totalPoints - winSize));
    let maxIdx = minIdx + winSize - 1;

    chart.options.scales.x.min = minIdx;
    chart.options.scales.x.max = maxIdx;
    chartWindowPos[sliderId] = minIdx;
    chart.update('none');
    
    syncWindowFromChart(chart, sliderId);
}

function initTimelineSlider(sliderId, chart) {
    renderTimelineTicks(chart, sliderId);
    
    // Preserve previous position if any
    let pos = chartWindowPos[sliderId] || 0;
    updateChartWindow(chart, pos, sliderId);

    let track = document.getElementById('track-' + sliderId);
    let windowEl = document.getElementById('window-' + sliderId);
    
    if (!track || !windowEl) return;

    // Click on track
    track.onmousedown = function(e) {
        if (e.target === windowEl || e.target.classList.contains('timeline-handle')) return; // handled by window drag
        let rect = track.getBoundingClientRect();
        let clickX = e.clientX - rect.left;
        let percent = clickX / rect.width;
        let totalPoints = chart.data.labels.length;
        let winSize = chartWindows[sliderId];
        let targetIdx = Math.round(percent * totalPoints) - Math.floor(winSize / 2);
        updateChartWindow(chart, targetIdx, sliderId);
    };

    // Drag window or resize handles
    windowEl.onmousedown = null;
    let isDragging = false;
    let isResizing = false;
    let resizeDir = null;
    let startX = 0;
    let startMinIdx = 0;
    let startWinSize = 0;
    
    windowEl.onmousedown = function(e) {
        startX = e.clientX;
        startMinIdx = chart.scales.x.min || 0;
        startWinSize = chartWindows[sliderId];
        
        if (e.target.classList.contains('timeline-handle')) {
            isResizing = true;
            resizeDir = e.target.getAttribute('data-dir');
            document.body.style.cursor = 'ew-resize';
        } else {
            isDragging = true;
            document.body.style.cursor = 'grabbing';
        }
        
        e.stopPropagation();
        
        let onMouseMove = function(evt) {
            let rect = track.getBoundingClientRect();
            let dx = evt.clientX - startX;
            let dPercent = dx / rect.width;
            let totalPoints = chart.data.labels.length;
            let dIdx = Math.round(dPercent * totalPoints);
            
            if (isDragging) {
                updateChartWindow(chart, startMinIdx + dIdx, sliderId);
            } else if (isResizing) {
                let newMin = startMinIdx;
                let newWinSize = startWinSize;
                
                if (resizeDir === 'left') {
                    newMin = Math.max(0, startMinIdx + dIdx);
                    newWinSize = startWinSize - (newMin - startMinIdx);
                } else {
                    newWinSize = startWinSize + dIdx;
                }
                
                // Limit min/max window size (e.g., 5 to 50 years)
                if (newWinSize < 5) {
                    newWinSize = 5;
                    if (resizeDir === 'left') newMin = startMinIdx + startWinSize - 5;
                }
                if (newWinSize > totalPoints) {
                    newWinSize = totalPoints;
                }
                if (newMin + newWinSize > totalPoints) {
                    newWinSize = totalPoints - newMin;
                }
                
                chartWindows[sliderId] = newWinSize;
                updateChartWindow(chart, newMin, sliderId);
            }
        };
        
        let onMouseUp = function() {
            isDragging = false;
            isResizing = false;
            document.body.style.cursor = '';
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };
}

function createZoomPluginConfig(id) {
    return {
        pan: {
            enabled: true,
            mode: 'x',
            onPan: function({chart}) { syncWindowFromChart(chart, id); }
        },
        zoom: {
            wheel: { enabled: false }, // 關閉滾輪縮放
            pinch: { enabled: false }, // 關閉雙指縮放
            mode: 'x'
        }
    };
}
