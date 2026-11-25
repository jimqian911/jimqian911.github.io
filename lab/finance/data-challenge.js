(function (lab) {
  'use strict';

  const id = 'data-challenge';
  const lastShown = 2018;
  const target = 2024;
  const limit = 220;
  const labels = [2005, 2010, 2015, 2018, 2024];
  const series = lab.netTransfers;
  const row2018 = series.find(row => row[0] === lastShown);
  const row2024 = series.find(row => row[0] === target);
  const inHundredMillions = value => Math.round(value * 10);

  function signed(value) {
    return value === 0 ? '0' : `${value < 0 ? '−' : '+'}${Math.abs(value)}`;
  }

  function flowDirection(value) {
    if (value > 0) return '中国债权人 → 借款国';
    if (value < 0) return '借款国 → 中国债权人';
    return '双方资金收支相抵';
  }

  function describeFlow(value) {
    if (value === 0) return '借款国的新增提款与还本付息相等';
    return `${Math.abs(value)} 亿美元${value > 0 ? '从中国债权人净流向借款国' : '从借款国净流向中国债权人'}`;
  }

  function normalize(record) {
    const value = record && Number.isInteger(record.value) && record.value >= -limit && record.value <= limit
      ? record.value : 0;
    return { value, revealed: Boolean(record && record.revealed === true) };
  }

  function point(value) {
    return `${50 - value / limit * 50}%`;
  }

  function mount(root) {
    let state = lab.progress(id, normalize);
    root.innerHTML = `<section class="panel chart-panel" aria-labelledby="chart-title">
      <div class="panel-heading"><div><h2 id="chart-title">中国债权人与借款国之间的净资金转移</h2><p class="muted">低收入和中等收入国家公共及公共担保长期外债 · 亿美元，当年价</p></div></div>
      <p class="formula">净转移 = 借款国从中国新增提款 − 向中国偿还的本金和利息</p>
      <div class="flow-key" id="flow-key">
        <div class="flow-out"><strong>正值 + · 净流出中国</strong><span>中国债权人 → 借款国</span></div>
        <div class="flow-in"><strong>负值 − · 净流入中国</strong><span>借款国 → 中国债权人</span></div>
      </div>
      <figure class="chart-figure">
        <div class="chart" aria-hidden="true">
          <div class="chart-axis"><span>+200</span><span>0</span><span>−200</span></div>
          <div class="chart-field">
            <div class="chart-gridline grid-top"></div><div class="chart-gridline grid-zero"></div><div class="chart-gridline grid-bottom"></div>
            <div class="chart-hidden"></div>
            <div class="chart-columns">${series.map(([year, , , , net]) => {
              const value = net * 10;
              const height = Math.abs(value) / limit * 50;
              const bottom = value >= 0 ? 50 : 50 - height;
              return `<div class="chart-column">
                <i class="chart-bar ${value < 0 ? 'negative' : ''} ${year > lastShown ? 'historical-reveal' : ''}" style="height:${height}%;bottom:${bottom}%"></i>
                ${year === target ? '<div class="prediction-hit"></div><i class="prediction-marker"></i>' : ''}
                ${labels.indexOf(year) >= 0 ? `<span class="chart-year">${year}</span>` : ''}
              </div>`;
            }).join('')}</div>
          </div>
        </div>
        <figcaption id="chart-caption">2016–2018 年，每年约有 170 亿美元从中国债权人净流向借款国。</figcaption>
      </figure>
      <div class="prediction-controls">
        <div class="option-head"><label for="prediction">你的 2024 年预测</label><output class="prediction-readout" for="prediction"><strong id="prediction-value"></strong><span id="prediction-direction"></span></output></div>
        <p class="muted">拖动图上的预测点，或使用下方滑块。</p>
        <div class="option-controls">
          <button type="button" class="step" data-delta="-10" aria-label="预测值降低 10 亿美元">−</button>
          <input id="prediction" type="range" min="-220" max="220" step="10" aria-describedby="flow-key chart-caption">
          <button type="button" class="step" data-delta="10" aria-label="预测值提高 10 亿美元">+</button>
        </div>
        <div class="range-labels" aria-hidden="true"><span>− 流入中国</span><span>+ 流出中国</span></div>
      </div>
      <div class="action-row"><button class="button button-primary" type="button" data-reveal aria-controls="data-reveal">揭晓实际走势</button></div>
    </section>
    <section class="summary data-summary" id="data-reveal" aria-labelledby="data-result-title" hidden>
      <h2 id="data-result-title" tabindex="-1">2019–2025 年，资金每年净流向中国债权人</h2>
      <p id="prediction-comparison"></p>
      <div class="facts two-up">
        <div><span>2018 年</span><strong>${signed(inHundredMillions(row2018[4]))} 亿美元</strong><span>中国债权人 → 借款国</span><p>提款约 355 亿，还本付息约 191 亿。</p></div>
        <div><span>2024 年</span><strong>${signed(inHundredMillions(row2024[4]))} 亿美元</strong><span>借款国 → 中国债权人</span><p>提款约 79 亿，还本付息约 266 亿。</p></div>
      </div>
      <p>随着新增提款减少、已有贷款继续偿付，借款国付出的本金和利息超过了新收到的资金。</p>
      <p class="source-note">来源：世界银行 International Debt Statistics（2026 年 11 月 5 日版），按债务国申报数据计算。2025 年约为 −140 亿美元。</p>
      <div class="action-row"><button class="button button-outline" type="button" data-reset>重新预测</button><a class="button button-primary" href="#activities">返回活动总览</a></div>
    </section>`;

    const input = root.querySelector('#prediction');
    const reveal = root.querySelector('[data-reveal]');
    const hit = root.querySelector('.prediction-hit');
    const field = root.querySelector('.chart-field');
    let activePointer;

    function render() {
      root.classList.toggle('show-history', state.revealed);
      input.value = state.value;
      input.disabled = state.revealed;
      input.setAttribute('aria-valuetext', `${signed(state.value)} 亿美元，${flowDirection(state.value)}`);
      input.style.setProperty('--filled', `${(state.value + limit) / (2 * limit) * 100}%`);
      root.querySelector('.prediction-marker').style.top = point(state.value);
      hit.hidden = state.revealed;
      root.querySelector('#prediction-value').textContent = `${signed(state.value)} 亿美元`;
      root.querySelector('#prediction-direction').textContent = flowDirection(state.value);
      root.querySelector('[data-delta="-10"]').disabled = state.revealed || state.value === -limit;
      root.querySelector('[data-delta="10"]').disabled = state.revealed || state.value === limit;
      root.querySelector('#data-reveal').hidden = !state.revealed;
      root.querySelector('#prediction-comparison').textContent = `你预测${describeFlow(state.value)}。2024 年实际约有 ${describeFlow(inHundredMillions(row2024[4]))}。`;
      reveal.hidden = state.revealed;
      reveal.parentElement.hidden = state.revealed;
    }

    function update(value) {
      if (state.revealed) return;
      state.value = Math.max(-limit, Math.min(limit, value));
      lab.save(id, state);
      render();
    }

    input.addEventListener('input', () => update(Number(input.value)));
    function updateFromChart(event) {
      const bounds = field.getBoundingClientRect();
      const value = limit * (1 - 2 * (event.clientY - bounds.top) / bounds.height);
      update(Math.round(value / 10) * 10);
    }

    hit.addEventListener('pointerdown', event => {
      if (activePointer !== undefined || event.button !== 0) return;
      activePointer = event.pointerId;
      hit.setPointerCapture(event.pointerId);
      updateFromChart(event);
    });
    hit.addEventListener('pointermove', event => {
      if (activePointer === event.pointerId) updateFromChart(event);
    });
    hit.addEventListener('lostpointercapture', () => { activePointer = undefined; });
    root.querySelectorAll('[data-delta]').forEach(button => {
      button.addEventListener('click', () => update(state.value + Number(button.dataset.delta)));
    });
    reveal.addEventListener('click', () => {
      state.revealed = true;
      lab.save(id, state);
      render();
      lab.focus(root.querySelector('#data-result-title'));
    });
    root.querySelector('[data-reset]').addEventListener('click', () => {
      state = normalize(null);
      lab.save(id, state);
      render();
      lab.focus(input);
    });
    render();
  }

  lab.register(id, mount);
}(window.JQFinance));
