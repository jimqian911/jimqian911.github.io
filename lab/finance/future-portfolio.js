(function (lab) {
  'use strict';

  const id = 'future-portfolio';
  const budget = 100;
  const example = [50, 20, 20, 10];
  const [direct, mdb, grants, guarantee, pool] = [0, 1, 2, 3, 4];
  const capitalGoal = 40;
  const directNeed = 40;
  const studyCost = 10;
  const reserveNeed = 10;
  const categories = [
    { label: '双边贷款', detail: `跨境输电贷款需留 ${directNeed} 个单位。`, color: 'var(--c0)' },
    { label: '多边银行出资' },
    { label: '赠款与技术合作', detail: `供水和防洪各有一项可研，每项需 ${studyCost} 个单位。`, color: 'var(--c2)' },
    { label: '担保准备金', detail: `本轮电站担保需留 ${reserveNeed} 个单位供政府按约代偿。`, color: 'var(--c3)' },
    { label: '待分配预算', detail: '可直接用于本轮增资。', color: '#646479' },
  ];
  const fundingIndices = [direct, grants, guarantee, pool];
  const financeAnswers = {
    loan: '再看钱付给了谁。财政部把钱缴给多边银行，借款国这时还没有收到贷款。',
    capital: '对。此时财政部向多边银行缴资本。借款国以后若从这家银行提款，那笔贷款资金才从多边银行流向借款国。',
  };
  const total = values => values.reduce((sum, value) => sum + value, 0);
  const balance = (amounts, index) => index === pool ? budget - total(amounts) : amounts[index];
  const goalGap = amounts => Math.max(0, capitalGoal - amounts[mdb]);

  function normalize(record) {
    const saved = record && Array.isArray(record.amounts) && record.amounts.length === example.length
      && record.amounts.every(amount => Number.isInteger(amount) && amount >= 0) && total(record.amounts) <= budget;
    const amounts = saved ? record.amounts.slice() : example.slice();
    const finished = Boolean(saved && record.finished === true && !goalGap(amounts));
    const draft = saved && !finished && record.draft;
    const validDraft = Array.isArray(draft) && draft.length === categories.length && draft[mdb] === 0
      && draft.every((amount, index) => Number.isInteger(amount) && amount >= 0 && amount <= balance(amounts, index))
      && total(draft) <= goalGap(amounts);
    return {
      amounts,
      draft: validDraft ? draft.slice() : categories.map(() => 0),
      finished,
      starter: !saved || record.starter === true,
      financeAnswer: finished && ['loan', 'capital'].indexOf(record.financeAnswer) !== -1 ? record.financeAnswer : null,
    };
  }

  function forecast(amounts, draft) {
    const next = amounts.map((amount, index) => amount - draft[index]);
    next[mdb] += total(draft);
    return next;
  }

  function sourceCap(amounts, draft, index) {
    return Math.min(balance(amounts, index), draft[index] + goalGap(amounts) - total(draft));
  }

  const fundedStudies = amount => Math.min(2, Math.floor(amount / studyCost));

  function consequence(index, amount) {
    if (index === direct) return amount >= directNeed ? '输电贷款可保留' : `输电贷款还缺 ${directNeed - amount} 个单位`;
    if (index === grants) return ['两项可研都顺延', '一项可研可做，另一项顺延', '两项可研都有经费'][fundedStudies(amount)];
    if (index === guarantee) return amount >= reserveNeed ? '本轮担保拨备已备足' : `担保拨备还缺 ${reserveNeed - amount} 个单位`;
    return `剩下 ${amount} 个单位待分配`;
  }

  function fundingSource(index) {
    const { label, detail, color } = categories[index];
    return `<div class="portfolio-source" data-source="${index}" style="--channel:${color}">
      <label for="source-${index}">${label}</label>
      <div class="portfolio-source-controls">
        <button class="step" type="button" data-less aria-label="减少从${label}调出的金额">−</button>
        <input id="source-${index}" type="number" min="0" step="1" inputmode="numeric" aria-describedby="source-limit-${index}">
        <button class="step" type="button" data-more aria-label="增加从${label}调出的金额">+</button>
      </div>
      <p id="source-limit-${index}" class="muted portfolio-source-detail">${detail}</p>
      <p class="portfolio-source-outcome" data-source-outcome></p>
    </div>`;
  }

  function describeTradeoff(amounts) {
    const studies = fundedStudies(amounts[grants]);
    const kept = [
      amounts[direct] >= directNeed && '跨境输电贷款',
      ['', '一项可研', '供水和防洪两项可研'][studies],
      amounts[guarantee] >= reserveNeed && '电站担保拨备',
    ].filter(Boolean);
    const costs = [
      amounts[direct] < directNeed && `输电贷款仍缺 ${directNeed - amounts[direct]} 个单位`,
      ['两项可研要顺延', '另一项可研要顺延', ''][studies],
      amounts[guarantee] < reserveNeed && `电站担保拨备仍缺 ${reserveNeed - amounts[guarantee]} 个单位`,
    ].filter(Boolean);
    const decision = kept.length ? `你为${kept.join('、')}留足了预算。` : '这份方案优先筹足了多边出资。';
    return costs.length ? `${decision}${costs.join('，')}。` : decision;
  }

  function learningReview() {
    return `<section class="portfolio-learning" aria-labelledby="portfolio-learning-title">
      <h3 id="portfolio-learning-title">换一个融资工具，改变了什么？</h3>
      <dl class="portfolio-learnings">
        <div><dt>谁审批项目</dt><dd>双边贷款由本国机构决定贷给哪个项目、采用什么条款。实缴资本进入多边银行，出资国以股东身份参与治理，具体贷款由银行按共同规则审批。</dd></div>
        <div><dt>谁承担风险</dt><dd>双边放贷机构面对借款人的还款风险。多边银行管理其项目贷款风险，出资国承担股东投入的风险。政府担保按合同约定代偿，准备金是为此预留的预算，担保面值另计。</dd></div>
      </dl>
      <p class="portfolio-class-link">谈判室里，你是借款国，多一家银行就多了一个融资选项。这里你是出资国，要决定用哪种渠道提供资金，以及给哪些承诺留足预算。</p>
      <details class="debt-extra"><summary>试一题 · 这笔钱记在哪里？</summary>
        <p>假如中国已向多边银行缴付 20 个单位的资本，这一年借款国尚未收到相关贷款。回到「数据预测」的图，这 20 个单位应怎么记？</p>
        <div class="portfolio-answers" role="group" aria-label="判断资金流向">
          <button type="button" class="button button-outline" data-finance-answer="loan" aria-pressed="false">计入借款国从中国新增提款</button>
          <button type="button" class="button button-outline" data-finance-answer="capital" aria-pressed="false">列为中国对多边银行出资</button>
        </div>
        <div class="notice portfolio-finance-feedback" data-finance-feedback hidden><p role="status"></p><p class="portfolio-flowline">中国财政 → 多边银行 · 实缴资本</p></div>
      </details>
    </section>`;
  }

  function cabinetMemo(amounts) {
    const keepsLoan = amounts[direct] >= directNeed;
    const alternative = keepsLoan ? [30, 40, 20, 10] : [40, 40, 10, 10];
    const alternateSources = keepsLoan ? '从双边贷款调出 20' : '从双边贷款和赠款各调出 10';
    const free = balance(amounts, pool);
    return `<p><strong>多边银行出资已安排 ${amounts[mdb]} 个单位。</strong></p>
      <div class="portfolio-takeaway notice"><h3>这份方案的取舍</h3><p>${describeTradeoff(amounts)}</p></div>
      <details class="debt-extra" open><summary>对照另一份达标的方案</summary>
        <p>从课堂起始预算出发，另一份方案${alternateSources}，多边银行出资达到 40。</p>
        <table class="portfolio-compare"><thead><tr><th scope="col">承诺</th><th scope="col">你的方案</th><th scope="col">对照方案</th></tr></thead><tbody>
          ${[[direct, '输电'], [grants, '可研'], [guarantee, '担保']].map(([index, label]) => {
            const outcome = consequence(index, amounts[index]);
            const comparison = consequence(index, alternative[index]);
            return `<tr data-different="${outcome !== comparison}"><th scope="row">${label}</th><td>${outcome}</td><td>${comparison}</td></tr>`;
          }).join('')}
        </tbody></table>
        <p>两份方案都达到增资目标。你愿意为保住哪项承诺而推迟另一项？</p>
      </details>
      ${learningReview()}
      <details class="debt-extra"><summary>查看四项预算余额</summary>
        <dl class="portfolio-receipt">${[direct, mdb, grants, guarantee].map(index => `<div class="portfolio-change"><dt>${categories[index].label}</dt><dd><strong>${amounts[index]} 个单位</strong></dd></div>`).join('')}</dl>
        ${free ? `<p class="muted">待分配预算还有 ${free} 个单位。</p>` : ''}
      </details>`;
  }

  function mount(root) {
    let state = lab.progress(id, normalize);
    let resetSnapshot = null;
    root.innerHTML = `<div class="portfolio-board">
      <section class="panel portfolio-case" aria-labelledby="portfolio-case-title">
        <h2 id="portfolio-case-title" tabindex="-1">给多边开发银行筹足 ${capitalGoal} 个单位</h2>
        <p>你负责出资国的公共预算。总额 ${budget} 固定，内阁希望增加实缴资本支持区域基础设施。</p>
        <div class="portfolio-goal"><p data-goal-status aria-live="polite"></p><progress aria-label="多边增资进度" max="${capitalGoal}" value="0"></progress></div>
        <div class="portfolio-case-footer"><p class="muted">项目和金额为课堂设定。</p><button type="button" class="button button-outline" data-reset-portfolio>重新开始</button></div>
      </section>

      <div class="portfolio-reset-notice" data-reset-notice hidden><p>已恢复课堂起始方案。</p><button class="button button-outline" type="button" data-undo-reset>撤销重置</button></div>

      <section class="panel portfolio-allocation" data-planner aria-labelledby="portfolio-allocation-title">
        <h2 id="portfolio-allocation-title" tabindex="-1">你愿意从哪几项调出预算？</h2>
        <p class="portfolio-step-hint">点 ＋ 或 − 按 5 个单位增减，也可以直接填金额。每项下方会显示项目还能否继续。</p>
        <div class="portfolio-sources" role="group" aria-label="为多边银行出资选择资金来源">${fundingIndices.map(fundingSource).join('')}</div>
        <p class="muted portfolio-shift-hint" data-shift-hint hidden>已筹足。想换个来源，可以先减一项，再补另一项。</p>
        <div class="action-row"><button type="button" class="button button-primary" data-confirm>确认方案并查看简报</button><button type="button" class="button button-outline" data-clear hidden>清除试算</button></div>
      </section>

      <section class="summary portfolio-result" data-result hidden aria-labelledby="portfolio-result-title">
        <h2 id="portfolio-result-title" tabindex="-1">内阁简报</h2>
        <div class="portfolio-memo" data-memo></div>
        <div class="action-row"><a class="button button-primary" href="#activities">返回活动总览</a><button type="button" class="button button-outline" data-retry>换一种筹法</button></div>
      </section>
    </div><p class="sr-only" data-transfer-status role="status"></p>`;

    const find = selector => root.querySelector(selector);
    const sources = Array.from(root.querySelectorAll('[data-source]'), node => ({
      index: Number(node.dataset.source), node, input: node.querySelector('input'),
      less: node.querySelector('[data-less]'), more: node.querySelector('[data-more]'), outcome: node.querySelector('[data-source-outcome]'),
    }));
    const confirm = find('[data-confirm]');
    const memo = find('[data-memo]');
    const heading = find('#portfolio-allocation-title');
    const resultTitle = find('#portfolio-result-title');

    function render(activeInput) {
      const { draft } = state;
      const proposed = forecast(state.amounts, draft);
      const gap = goalGap(proposed);
      const moved = total(draft);
      const prefix = moved ? '试算出资' : '已安排';
      find('[data-reset-notice]').hidden = resetSnapshot === null;
      find('[data-goal-status]').textContent = `${prefix} ${proposed[mdb]} / ${capitalGoal} 个单位 · ${gap ? `还差 ${gap}` : '已筹足'}`;
      find('progress').value = Math.min(proposed[mdb], capitalGoal);
      find('[data-planner]').hidden = state.finished;
      find('[data-result]').hidden = !state.finished;
      if (state.finished) {
        memo.innerHTML = cabinetMemo(state.amounts);
        if (state.financeAnswer) {
          updateFinanceCheck();
          memo.querySelector('[data-finance-feedback]').closest('details').open = true;
        }
        return;
      }
      sources.forEach(({ index, node, input, less, more, outcome }) => {
        const before = balance(state.amounts, index);
        const left = balance(proposed, index);
        const cap = sourceCap(state.amounts, draft, index);
        const current = consequence(index, left);
        node.hidden = index === pool && before === 0;
        input.max = cap;
        if (input !== activeInput) input.value = draft[index];
        input.disabled = cap === 0;
        less.disabled = draft[index] === 0;
        more.disabled = draft[index] === cap;
        outcome.textContent = `${before === left ? `余额 ${left}` : `余额 ${before} → ${left}`} · ${current}`;
        outcome.dataset.changed = String(consequence(index, before) !== current);
      });
      confirm.disabled = gap !== 0;
      confirm.textContent = gap ? `还差 ${gap} 个单位` : '确认方案并查看简报';
      find('[data-shift-hint]').hidden = gap !== 0 || moved === 0;
      find('[data-clear]').hidden = moved === 0;
    }

    function save(activeInput) {
      lab.save(id, state);
      render(activeInput);
    }

    function updateFinanceCheck() {
      memo.querySelectorAll('[data-finance-answer]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.financeAnswer === state.financeAnswer));
      });
      const feedback = memo.querySelector('[data-finance-feedback]');
      feedback.hidden = false;
      feedback.querySelector('[role="status"]').textContent = financeAnswers[state.financeAnswer];
    }

    function setSource(index, requested, activeInput) {
      const { draft } = state;
      const value = Number.isFinite(requested) ? Math.trunc(requested) : 0;
      draft[index] = Math.max(0, Math.min(value, sourceCap(state.amounts, draft, index)));
      if (activeInput && Number.isFinite(requested) && requested !== draft[index]) activeInput.value = draft[index];
      save(activeInput);
    }

    function reset() {
      if (!state.starter || state.finished || (total(state.draft) && !resetSnapshot)) resetSnapshot = state;
      state = normalize(null);
      save();
      find('[data-transfer-status]').textContent = '已恢复课堂起始方案。';
      const taskTitle = find('#portfolio-case-title');
      taskTitle.scrollIntoView({ block: 'start' });
      lab.focus(taskTitle);
    }

    find('[data-reset-portfolio]').addEventListener('click', reset);
    find('[data-retry]').addEventListener('click', reset);
    memo.addEventListener('click', event => {
      const answer = event.target.closest('[data-finance-answer]');
      if (!answer) return;
      state.financeAnswer = answer.dataset.financeAnswer;
      lab.save(id, state);
      updateFinanceCheck();
    });
    find('[data-undo-reset]').addEventListener('click', () => {
      if (!resetSnapshot) return;
      state = resetSnapshot;
      resetSnapshot = null;
      save();
      find('[data-transfer-status]').textContent = '已恢复重置前的方案。';
      lab.focus(find('[data-reset-portfolio]'));
    });
    sources.forEach(({ index, input, less, more }) => {
      less.addEventListener('click', () => setSource(index, state.draft[index] - 5));
      more.addEventListener('click', () => setSource(index, state.draft[index] + 5));
      input.addEventListener('input', () => setSource(index, input.valueAsNumber, input));
      input.addEventListener('blur', () => { input.value = state.draft[index]; });
    });
    find('[data-clear]').addEventListener('click', () => {
      state.draft = categories.map(() => 0);
      save();
      lab.focus(heading);
    });
    confirm.addEventListener('click', () => {
      const proposed = forecast(state.amounts, state.draft);
      if (goalGap(proposed)) return;
      state = normalize({ amounts: proposed, finished: true });
      resetSnapshot = null;
      save();
      resultTitle.scrollIntoView({ block: 'start' });
      lab.focus(resultTitle);
    });
    render();
  }

  lab.register(id, mount);
}(window.JQFinance));
