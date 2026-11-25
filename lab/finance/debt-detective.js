(function (lab) {
  'use strict';

  const id = 'debt-detective';
  const documents = [
    {
      label: '已欠多少',
      title: '这笔公共贷款还欠多少？',
      file: '财政部贷款台账 · 截至 2025 年末',
      body: `<p>2019 年，A 国公共部门的国有电力公司向一家位于境外的中国银行借入长期贷款，由 A 国财政部担保。2025 年末没有拖欠利息。</p>
        <dl class="document-numbers">
          <div><dt>签约承诺</dt><dd>10 亿美元</dd></div><div><dt>已经提款</dt><dd>6 亿美元</dd></div>
          <div><dt>已经还本</dt><dd>1 亿美元</dd></div><div><dt>尚未提款</dt><dd>4 亿美元</dd></div>
        </dl>`,
      prompt: '在债务台账里填入年末未偿本金。',
      correct: 5,
      feedback: '已提款 6 亿 − 已还本金 1 亿 = <strong>未偿本金 5 亿美元</strong>。尚未提款的 4 亿美元另记为贷款承诺。',
      next: '下一份 · 看合资公司贷款',
    },
    {
      label: '谁来偿还',
      title: '合资公司的贷款由谁偿还？',
      file: '合资公司贷款摘要',
      body: `<p>负责建设和运营电站的私营合资公司另向境外商业银行借了 <strong>3 亿美元</strong>。政府未为这笔贷款提供担保。</p>`,
      prompt: '把这 3 亿美元放进哪一栏？',
      choices: {
        public: ['公共及公共担保外债', '把这笔贷款加进 A 国的公共外债台账。'],
        private: ['合资公司的债务', '在审阅记录中单列为合资公司的债务。'],
      },
      correct: 'private',
      feedback: '借款人是私营合资公司，政府也没有担保。因此这 3 亿美元由<strong>合资公司</strong>偿还。本项目的公共及公共担保外债仍为 <strong>5 亿美元</strong>。',
      next: '下一份 · 看政府购电协议',
    },
    {
      label: '政府还会付什么',
      title: '政府还承担什么付款义务？',
      file: '购电协议摘要',
      body: `<p>政府和电站签有「照付不议」（<span lang="en">take-or-pay</span>）条款。用电低于约定水平时，政府仍可能要按合同支付最低金额。摘要未列明付款金额和期限。</p>`,
      prompt: '在给部长的财政风险清单上，你会怎么填？',
      choices: {
        zero: ['填 0', '政府没有为合资公司的贷款担保。'],
        pending: ['金额待核', '记下这项付款义务，等完整条款到手再估算。'],
        loan: ['填 3 亿美元', '沿用合资公司的贷款金额。'],
      },
      correct: 'pending',
      feedback: '政府的付款义务来自<strong>购电协议</strong>。要估算金额，需先查最低付款额、计算方式和期限。',
      corrections: {
        zero: '即使政府没有担保贷款，购电协议仍可能要求政府付款。先在风险清单上记为<strong>金额待核</strong>。',
        loan: '3 亿美元是合资公司的借款额。政府付款要按购电条款另算，先记为<strong>金额待核</strong>。',
      },
      extras: `<details class="debt-extra"><summary>看一个简化例子</summary>
          <p>假设政府一年须付 100 个单位，也能收回一部分电费。收回 70 时，财政净负担是 30。用电减少、只收回 40 时，净负担就成了 60。这些数字只用于说明机制。</p>
        </details>
        <details class="debt-extra"><summary>补查线索 · 电费专用账户</summary>
          <p>电费进入贷款银行控制的专用账户。尽调时可查银行是否优先受偿，以及谁有权动用余额。</p>
        </details>`,
      next: '查看两条结论',
    },
  ];
  const requests = {
    tariff: ['付款条款和期限', '先查政府必须付什么、按什么公式算、需要付多少年。用这些条款建立基准估计，再做压力测试。'],
    demand: ['需求与财政情景', '用电需求和电费回收情景可以估算财政缺口如何变化。先拿到付款条款，才能确定政府承担缺口的范围。'],
    termination: ['违约与终止条款', '终止条款帮助估算项目失败或提前终止时的一次性付款。它与正常运营期间的购电支出应分别评估。'],
  };

  function normalize(record) {
    record = record || {};
    const requested = Object.prototype.hasOwnProperty.call(requests, record.requested) ? record.requested : null;
    // Retain the place reached by readers of the earlier, variable-order version.
    const legacyStage = record.complete ? (requested ? 3 : 2) : (record.priority ? 1 : 0);
    const stage = Number.isInteger(record.stage) && record.stage >= 0 && record.stage <= documents.length
      ? record.stage : legacyStage;
    const answers = documents.map((file, index) => {
      const answer = Array.isArray(record.answers) ? record.answers[index] : null;
      if (file.choices) return Object.prototype.hasOwnProperty.call(file.choices, answer) ? answer : null;
      return Number.isInteger(answer) && answer >= 0 && answer <= 999 ? answer : null;
    });
    return { stage, requested, answers };
  }

  function answerLabel(file, answer) {
    return file.choices ? file.choices[answer][0] : `${answer} 亿美元`;
  }

  function answerPrompt(file) {
    if (file.choices) {
      return `<h3 id="debt-prompt">${file.prompt}</h3>
        <div class="decision-list" role="group" aria-labelledby="debt-prompt">
          ${Object.keys(file.choices).map(key => `<button class="decision" type="button" data-answer="${key}"><strong>${file.choices[key][0]}</strong><span>${file.choices[key][1]}</span></button>`).join('')}
        </div>`;
    }
    return `<form class="debt-entry" data-principal>
      <label for="debt-principal">${file.prompt}</label>
      <div><input id="debt-principal" name="principal" type="text" inputmode="numeric" pattern="[0-9０-９]{1,3}" maxlength="3" required aria-describedby="debt-units"><span id="debt-units">亿美元</span></div>
      <button class="button button-primary" type="submit">录入台账</button>
    </form>`;
  }

  function documentCard(file, index, answer) {
    const answered = answer !== null;
    const feedback = (file.corrections && file.corrections[answer]) || file.feedback;
    return `<section class="panel debt-screen">
      <p class="context-tag">文件 ${index + 1} / ${documents.length} · ${file.file}</p>
      <h2 id="debt-step-title" tabindex="-1">${file.title}</h2>
      <div class="file-body">${file.body}</div>
      ${answered ? `<div id="debt-judgment" class="notice debt-judgment" tabindex="-1"><p><strong>你的记录</strong> · ${answerLabel(file, answer)}</p><p>${feedback}</p></div>${file.extras || ''}` : answerPrompt(file)}
      ${answered || index ? `<div class="action-row">
        ${answered ? `<button class="button button-primary" type="button" data-next>${file.next}</button>` : ''}
        ${index ? '<button class="button button-outline" type="button" data-back>回看上一份</button>' : ''}
      </div>` : ''}
    </section>`;
  }

  function conclusion(state, expanded) {
    const selected = requests[state.requested];
    const review = documents.map((file, index) => {
      const answer = state.answers[index];
      if (answer === null) return '';
      const expected = file.correct;
      const outcome = answer === expected ? '与复核一致' : `复核为 ${answerLabel(file, expected)}`;
      return `<div><dt>${file.label}</dt><dd>${answerLabel(file, answer)}<span>${outcome}</span></dd></div>`;
    }).join('');
    return `<section class="panel debt-screen" id="investigation">
      <h2 id="debt-step-title" tabindex="-1">给财政部长的两条结论</h2>
      <div class="debt-findings">
        <div><h3>对华公共及公共担保外债</h3><strong>5 亿美元</strong><p>来自公共部门的电力公司欠境外银行的未偿本金。另有 4 亿美元尚未提款，单列为贷款承诺。</p></div>
        <div><h3>政府的购电付款义务</h3><strong>金额待核</strong><p>单列在财政风险清单。合资公司的 3 亿美元贷款由公司偿还，政府的付款义务按购电协议另算。</p></div>
      </div>
      ${review ? `<h3>你的审阅记录</h3><dl class="debt-review">${review}</dl>` : ''}
      <p class="debt-next-evidence"><strong>要估算政府可能付多少，先索取完整的付款条款和期限。</strong> 查清付款公式与年限后，再用需求预测做压力测试。</p>
      <details class="debt-extra" ${expanded ? 'open' : ''}>
        <summary>比较三种尽调材料</summary>
        <div class="decision-list" aria-label="选择尽调材料">
          ${Object.keys(requests).map(key => `<button type="button" class="decision" data-request="${key}" aria-pressed="${state.requested === key}"><strong>${requests[key][0]}</strong></button>`).join('')}
        </div>
        <p id="debt-feedback" class="notice" role="status" tabindex="-1" ${selected ? '' : 'hidden'}>${selected ? selected[1] : ''}</p>
      </details>
      <p class="source-note">研究连接：Horn、Reinhart 和 Trebesch（2021）将重建的中国官方贷款余额与债务国申报数据对照。比较数字时，先核对借款人、担保、余额和统计期间，再判断是否有债务漏报。</p>
      <div class="action-row"><a class="button button-primary" href="#activities">返回活动总览</a><button class="button button-outline" type="button" data-back>回看购电协议</button><button class="button button-outline" type="button" data-restart>重新审阅</button></div>
    </section>`;
  }

  function mount(root) {
    let state = lab.progress(id, normalize);
    function render(target) {
      const steps = documents.map((file, index) => `<li class="${index < state.stage ? 'done' : ''}" ${index === state.stage ? 'aria-current="step"' : ''}>${file.label}</li>`);
      const file = documents[state.stage];
      root.innerHTML = `<div class="document-stack"><ol class="rounds" aria-label="查阅进度">${steps.join('')}</ol>
        ${file ? documentCard(file, state.stage, state.answers[state.stage]) : conclusion(state, target === '#debt-feedback')}</div>`;
      if (target) lab.focus(root.querySelector(target));
    }

    function recordAnswer(answer) {
      state.answers[state.stage] = answer;
      lab.save(id, state);
      render('#debt-judgment');
    }

    root.addEventListener('submit', event => {
      if (!event.target.matches('[data-principal]')) return;
      event.preventDefault();
      const value = event.target.elements.principal.value.normalize('NFKC');
      if (/^[0-9]{1,3}$/.test(value)) recordAnswer(Number(value));
    });

    root.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      let target = '#debt-step-title';
      const answer = button.dataset.answer;
      if (answer) {
        recordAnswer(answer);
        return;
      }
      if (button.hasAttribute('data-next') && state.stage < documents.length && state.answers[state.stage] !== null) state.stage++;
      else if (button.hasAttribute('data-back') && state.stage > 0) state.stage--;
      else if (button.hasAttribute('data-restart')) state = normalize(null);
      else if (state.stage === documents.length && Object.prototype.hasOwnProperty.call(requests, button.dataset.request)) {
        state.requested = button.dataset.request;
        target = '#debt-feedback';
      } else return;
      lab.save(id, state);
      render(target);
    });

    render();
  }

  lab.register(id, mount);
}(window.JQFinance));
