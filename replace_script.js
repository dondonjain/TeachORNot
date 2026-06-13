const fs = require('fs');
let content = fs.readFileSync('c:/Users/z5716/OneDrive/Documents/06.wealth_crystal_ball/index.html', 'utf8');

content = content.replace(
`<div class="input-group inline"><label>目前年齡</label><input type="number" id="currentAge" value="26"></div>
            <div class="input-group inline"><label>預計退休年齡</label><input type="number" id="retireAge" value="65"></div>
            <div class="input-group inline"><label>已有投資 (元)</label><input type="number" id="initInvest" value="0"></div>
            <div class="input-group inline"><label>已有存款 (元)</label><input type="number" id="initCash" value="0"></div>
            <div class="input-group inline">
                <label style="color:var(--sys-blue);" class="tooltip-trigger">平均年化報酬率 (%)
                    <div class="tooltip">平均年化報酬率以大盤的期望值做設定，可按照個人情形修改。</div>
                </label>
                <input type="number" id="roi" value="7.0" step="0.1">
            </div>
            <div class="input-group inline">
                <label style="color:var(--sys-green);" class="tooltip-trigger">退休金投報率 (%)
                    <div class="tooltip">此金額從政府資料中取得，採取保守的估計方式。<br><br><a href="https://www.pension.org.tw/index.php/pensinkb/data?id=310" target="_blank">查看政府資料來源 ↗</a></div>
                </label>
                <input type="number" id="pensionRoi" value="4.5" step="0.1">
            </div>
            <div class="input-group inline"><label>活存利率 (%)</label><input type="number" id="savingRate" value="1.0" step="0.1"></div>`,
`<div class="grid-2-col">
                <div class="input-group inline"><label>目前年齡</label><input type="number" id="currentAge" value="26"></div>
                <div class="input-group inline"><label>預計退休年齡</label><input type="number" id="retireAge" value="65"></div>
                <div class="input-group inline"><label>已有投資 (元)</label><input type="number" id="initInvest" value="0"></div>
                <div class="input-group inline"><label>已有存款 (元)</label><input type="number" id="initCash" value="0"></div>
            </div>
            <div class="grid-2-col">
                <div class="input-group inline">
                    <label style="color:var(--sys-blue);" class="tooltip-trigger">年化報酬 (%)
                        <div class="tooltip">平均年化報酬率以大盤的期望值做設定，可按照個人情形修改。</div>
                    </label>
                    <input type="number" id="roi" value="7.0" step="0.1">
                </div>
                <div class="input-group inline">
                    <label style="color:var(--sys-green);" class="tooltip-trigger">退休投報 (%)
                        <div class="tooltip">此金額從政府資料中取得，採取保守的估計方式。<br><br><a href="https://www.pension.org.tw/index.php/pensinkb/data?id=310" target="_blank">查看政府資料來源 ↗</a></div>
                    </label>
                    <input type="number" id="pensionRoi" value="4.5" step="0.1">
                </div>
                <div class="input-group inline"><label>活存利率 (%)</label><input type="number" id="savingRate" value="1.0" step="0.1"></div>
            </div>`);

content = content.replace(
`<div class="input-group inline"><label>起始月薪</label><input type="number" id="sysBase" value="60000"></div>
            <div class="input-group inline"><label>保底年終(月)</label><input type="number" id="sysBonus" value="2"></div>
            <div class="input-group inline"><label>預估分紅(月)</label><input type="number" id="sysProfit" value="2"></div>
            <div class="input-group inline"><label>調薪率(%)</label><input type="number" id="sysGrowth" value="3.0" step="0.5"></div>
            <div class="input-group inline"><label>年薪天花板</label><input type="number" id="sysCap" value="1800000"></div>`,
`<div class="grid-2-col">
                <div class="input-group inline"><label>起始月薪</label><input type="number" id="sysBase" value="60000"></div>
                <div class="input-group inline"><label>保底年終(月)</label><input type="number" id="sysBonus" value="2"></div>
                <div class="input-group inline"><label>預估分紅(月)</label><input type="number" id="sysProfit" value="2"></div>
                <div class="input-group inline"><label>調薪率(%)</label><input type="number" id="sysGrowth" value="3.0" step="0.5"></div>
            </div>
            <div class="input-group inline"><label>年薪天花板</label><input type="number" id="sysCap" value="1800000" style="width: 100%; box-sizing: border-box;"></div>`);

content = content.replace(
`<div class="input-group inline"><label>起始月薪</label><input type="number" id="semiBase" value="80000"></div>
            <div class="input-group inline"><label>保底年終(月)</label><input type="number" id="semiBonus" value="2"></div>
            <div class="input-group inline"><label>預估分紅(月)</label><input type="number" id="semiProfit" value="16"></div>
            <div class="input-group inline"><label>調薪率(%)</label><input type="number" id="semiGrowth" value="5.0" step="0.5"></div>
            <div class="input-group inline"><label>年薪天花板</label><input type="number" id="semiCap" value="3500000"></div>`,
`<div class="grid-2-col">
                <div class="input-group inline"><label>起始月薪</label><input type="number" id="semiBase" value="80000"></div>
                <div class="input-group inline"><label>保底年終(月)</label><input type="number" id="semiBonus" value="2"></div>
                <div class="input-group inline"><label>預估分紅(月)</label><input type="number" id="semiProfit" value="16"></div>
                <div class="input-group inline"><label>調薪率(%)</label><input type="number" id="semiGrowth" value="5.0" step="0.5"></div>
            </div>
            <div class="input-group inline"><label>年薪天花板</label><input type="number" id="semiCap" value="3500000" style="width: 100%; box-sizing: border-box;"></div>`);

content = content.replace(
`<div class="input-group inline"><label>起始月薪</label><input type="number" id="asmlBase" value="80000"></div>
            <div class="input-group inline"><label>保底年終(月)</label><input type="number" id="asmlBonus" value="2"></div>
            <div class="input-group inline"><label>保障分紅(月)</label><input type="number" id="asmlProfit" value="5"></div>
            <div class="input-group inline"><label>常態調薪(%)</label><input type="number" id="asmlGrowth" value="3.0" step="0.5"></div>
            <div class="input-group inline"><label style="color:var(--sys-orange)">跳槽頻率(年)</label><input type="number" id="hopYears" value="3"></div>
            <div class="input-group inline"><label style="color:var(--sys-orange)">跳槽加薪(%)</label><input type="number" id="hopBump" value="10.0" step="1"></div>
            <div class="input-group inline"><label>年薪天花板</label><input type="number" id="asmlCap" value="3000000"></div>`,
`<div class="grid-2-col">
                <div class="input-group inline"><label>起始月薪</label><input type="number" id="asmlBase" value="80000"></div>
                <div class="input-group inline"><label>保底年終(月)</label><input type="number" id="asmlBonus" value="2"></div>
                <div class="input-group inline"><label>保障分紅(月)</label><input type="number" id="asmlProfit" value="5"></div>
                <div class="input-group inline"><label>常態調薪(%)</label><input type="number" id="asmlGrowth" value="3.0" step="0.5"></div>
                <div class="input-group inline"><label style="color:var(--sys-orange)">跳槽頻率(年)</label><input type="number" id="hopYears" value="3"></div>
                <div class="input-group inline"><label style="color:var(--sys-orange)">跳槽加薪(%)</label><input type="number" id="hopBump" value="10.0" step="1"></div>
            </div>
            <div class="input-group inline"><label>年薪天花板</label><input type="number" id="asmlCap" value="3000000" style="width: 100%; box-sizing: border-box;"></div>`);

content = content.replace(
`<button class="btn-primary" onclick="runSimulation()">執行精算更新</button>`,
`<button class="btn-primary" onclick="runSimulation()">執行精算更新</button>
        <div id="export-actions" style="display: none; gap: 10px; margin-top: 15px;">
            <button class="btn-outline" onclick="exportReport('png')" style="flex:1; border: 1px solid var(--sys-blue); color: var(--sys-blue); font-weight: 600; border-radius: 8px; cursor: pointer; transition: 0.2s; padding: 10px; background: transparent;">匯出圖片</button>
            <button class="btn-outline" onclick="exportReport('pdf')" style="flex:1; border: 1px solid var(--sys-purple); color: var(--sys-purple); font-weight: 600; border-radius: 8px; cursor: pointer; transition: 0.2s; padding: 10px; background: transparent;">匯出 PDF</button>
        </div>`);

fs.writeFileSync('c:/Users/z5716/OneDrive/Documents/06.wealth_crystal_ball/index.html', content);
