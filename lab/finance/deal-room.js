(function (lab) {
  'use strict';

  const id = 'deal-room';
  const progressId = `${id}:v2`;
  const deadline = 12;
  const horizon = 18;
  const rounds = ['调配团队', '向 A 出价', '回应银行', '选融资方', '内阁复盘'];
  const teams = [
    { key: 'roads', name: '省道修复项目', staff: '2 名采购专员', deliverable: '电网采购文件', standard: 8, early: 5, impact: '省道招标推迟 1 个月' },
    { key: 'clinics', name: '乡镇诊所扩建项目', staff: '2 名环境与社会评估专员', deliverable: '电网环境与社会评估', standard: 9, early: 6, impact: '诊所扩建的用地审批推迟 2 个月' },
  ];
  const standardA = { start: 12, end: 18, fee: 500 };
  const goals = { fast: '争取提前审议', fee: '争取降低手续费' };
  const priorities = { timing: '赶上本轮采购窗口', money: '控制融资手续费', capacity: '避免承担更多协调工作' };
  const routes = { A: '优先推进银行 A', B: '优先推进银行 B', hold: '暂缓融资决定' };

  function normalize(record) {
    const empty = { staffing: null, proposals: [], revising: false, accepted: null, selected: null, priority: null, lag: 1 };
    if (!record || !Array.isArray(record.staffing)) return empty;
    const staffing = teams.map(team => team.key).filter(key => record.staffing.indexOf(key) !== -1);
    const proposals = Array.isArray(record.proposals) ? record.proposals.filter(isProposal).slice(0, 2) : [];
    const revising = proposals.length === 1 && record.revising === true;
    const accepted = proposals.length && !revising && typeof record.accepted === 'boolean' ? record.accepted : null;
    const selected = accepted !== null && ['A', 'B', 'hold'].indexOf(record.selected) !== -1 ? record.selected : null;
    const priority = selected && ['timing', 'money', 'capacity'].indexOf(record.priority) !== -1 ? record.priority : null;
    const lag = Number.isInteger(record.lag) && record.lag >= 0 && record.lag <= 3 ? record.lag : 1;
    return { staffing, proposals, revising, accepted, selected: priority ? selected : null, priority, lag };
  }

  function isProposal(proposal) {
    return proposal && ['fast', 'fee'].indexOf(proposal.goal) !== -1
      && typeof proposal.show === 'boolean' && typeof proposal.pledge === 'boolean';
  }

  function readyMonth(staffing) {
    return Math.max(...teams.map(team => staffing.indexOf(team.key) !== -1 ? team.early : team.standard));
  }

  function bankResponse(staffing, proposal, alternativeExists) {
    const ready = readyMonth(staffing);
    const hasLeverage = alternativeExists && proposal.show;
    if (!hasLeverage) {
      return { terms: standardA, conditional: false, reply: '目前我们按常规排期和手续费推进。有可核实的书面备选方案，我们才会重新考虑优先级或费用。' };
    }
    if (proposal.goal === 'fee') {
      return { terms: { ...standardA, fee: 350 }, conditional: false, reply: '我们看到了 B 的书面方案。为保留这笔业务，我们可以把一次性手续费降到 350 万美元，董事会审议时间维持原计划。' };
    }
    if (!proposal.pledge || ready > 8) {
      return { terms: standardA, conditional: false, reply: 'B 的书面方案足以让我们重审排期。要安排并行审查，请承诺最迟在第 8 个月底交齐两套文件。目前我们维持原方案。' };
    }
    const start = ready <= 6 ? 9 : 10;
    const end = start + 3;
    return { terms: { ...standardA, start, end }, conditional: true, reply: `根据 B 的书面方案和你承诺的交件时间，我们可安排第 ${start}–${end} 个月审议。条件是按承诺交件，并在接下来的 3 个月每月为联合审查投入 2 个工作人日。采购和环境社会审查照常进行。` };
  }

  function currentResponse(state) {
    return bankResponse(state.staffing, state.proposals[state.proposals.length - 1], true);
  }

  function bankB(staffing) {
    const start = Math.max(7, readyMonth(staffing) + 1);
    return { start, end: start + 2, fee: 750 };
  }

  function offerA(state, response) {
    return response.conditional && !state.accepted ? standardA : response.terms;
  }

  function approvalWindow(terms, lag) {
    const first = terms.start + lag;
    const last = terms.end + lag;
    const assessment = last <= deadline ? '估算区间均赶得上' : first > deadline ? '估算区间均赶不上' : '估算区间跨过截止月';
    return `第 ${first}–${last} 个月 · ${assessment}`;
  }

  function timeline(label, terms, note) {
    const { start, end } = terms;
    return `<div class="timeline-row"><div class="timeline-label"><strong>${label}</strong><span>第 ${start}–${end} 个月</span></div>
      <div class="timeline-track" aria-hidden="true"><i class="timeline-window" style="left:${start / horizon * 100}%;width:${(end - start) / horizon * 100}%"></i><i class="timeline-deadline"></i></div>
      ${note ? `<p class="muted">${note}</p>` : ''}</div>`;
  }

  function axis() {
    return `<p class="timeline-axis"><span>现在</span><span>第 ${deadline} 月截止</span><span>${horizon} 个月</span></p>`;
  }

  function checkbox(name, label, detail, checked, disabled) {
    return `<label class="deal-option"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span><strong>${label}</strong><small>${detail}</small></span></label>`;
  }

  function radioGroup(name, labels, selected) {
    return `<div class="deal-options">${Object.keys(labels).map(key => `<label class="deal-option"><input type="radio" name="${name}" value="${key}" ${selected === key ? 'checked' : ''} required><span>${labels[key]}</span></label>`).join('')}</div>`;
  }

  function button(label, action, primary) {
    const attr = action ? `type="button" data-action="${action}"` : 'type="submit"';
    return `<button class="button button-${primary ? 'primary' : 'outline'}" ${attr}>${label}</button>`;
  }

  function staffingPlan(staffing) {
    const diverted = teams.filter(team => staffing.indexOf(team.key) !== -1);
    const files = teams.map(team => {
      const month = staffing.indexOf(team.key) !== -1 ? team.early : team.standard;
      return `<span class="deal-file"><span>${team.deliverable} · 第 ${month} 月</span><i aria-hidden="true" style="--ready:${month / deadline * 100}%"></i></span>`;
    });
    return `<dl class="deal-facts"><div><dt>两套文件齐备</dt><dd><strong>第 ${readyMonth(staffing)} 个月</strong>${files.join('')}</dd></div>
      <div><dt>其他项目</dt><dd><strong>${diverted.length ? `调走 ${diverted.length * 2} 人` : '保留现有人手'}</strong><span>${diverted.length ? `${diverted.map(team => team.impact).join('，')}。` : '省道和诊所项目按原计划推进。'}</span></dd></div></dl>`;
  }

  function opening() {
    return `<h2 tabindex="-1">从哪里调人，谁要等？</h2>
      <p>你负责一个 10 亿美元的输电与电网升级项目。本轮采购要求第 ${deadline} 个月底前拿到融资批准。错过就得等第 ${horizon} 个月的下一轮采购。</p>
      <p class="muted">长期合作的开发银行 A 预计第 ${standardA.start}–${standardA.end} 个月审议，一次性手续费 ${standardA.fee} 万美元。</p>
      <form data-form="staffing" class="deal-form">
        <fieldset><legend>选择借调的团队</legend><p class="muted">两支队伍各有专长，可以借调一支、两支，或都保留在原项目。</p>
          <div class="deal-options">${teams.map(team => checkbox(team.key, `从${team.name}借调 ${team.staff}`, `${team.deliverable}从第 ${team.standard} 月提前到第 ${team.early} 月。${team.impact}。`)).join('')}</div>
        </fieldset>
        <div data-deal-staffing aria-live="polite">${staffingPlan([])}</div>
        <div class="action-row">${button('确认人手安排', null, true)}</div>
      </form>`;
  }

  function proposalSummary(proposal, staffing) {
    return `${goals[proposal.goal]}。${proposal.show ? '附上 B 的书面方案' : '保留 B 的书面方案'}。${proposal.pledge ? `承诺在第 ${readyMonth(staffing)} 个月底前交齐文件` : '按现有安排交件，未承诺提前提交'}。`;
  }

  function readProposal(form) {
    const { goal, show, pledge } = form.elements;
    return { goal: goal.value, show: show.checked, pledge: !pledge.disabled && pledge.checked };
  }

  function draftMessage(proposal, staffing) {
    const request = { fast: '请为电网项目安排更早的董事会审议。', fee: '请降低电网贷款的一次性融资手续费。' }[proposal.goal];
    const delivery = proposal.pledge ? `我方将在第 ${readyMonth(staffing)} 个月底前提交两套文件。` : '';
    return `<p>${request || '选定你要争取的条件，提案会写在这里。'}${delivery}</p>${proposal.show ? '<span class="deal-attachment">附件 · 银行 B 的书面意向</span>' : ''}`;
  }

  function negotiation(state) {
    const prior = state.proposals[0];
    const editing = state.revising;
    const ready = readyMonth(state.staffing);
    const b = bankB(state.staffing);
    return `<h2 tabindex="-1">${editing ? '修改你给 A 的提案' : '组一份提案发给银行 A'}</h2>
      <div class="notice deal-message"><strong>银行 B 的书面意向</strong><p>新进入 A 国的开发银行 B 已完成初筛，预计第 ${b.start}–${b.end} 个月审议，手续费 ${b.fee} 万美元。A 原先的手续费为 ${standardA.fee} 万美元。两家的贷款利息、币种与期限相同，均须经过批准。</p></div>
      ${editing ? `<div class="deal-message"><strong>银行 A 对首轮提案的答复</strong><p>${bankResponse(state.staffing, prior, true).reply}</p><p class="muted">本轮回复将替代上一轮，修订机会只有一次。</p></div>` : ''}
      <form data-form="proposal" class="deal-form">
        <fieldset><legend>这次向 A 争取什么？</legend>${radioGroup('goal', goals, editing ? prior.goal : null)}</fieldset>
        <fieldset><legend>你愿意拿什么来谈？</legend>
          <div class="deal-options">
            ${checkbox('show', '附上 B 的书面意向', '让 A 核实你有另一条融资路径。', editing && prior.show)}
            ${checkbox('pledge', ready <= 8 ? `承诺在第 ${ready} 个月底前交齐两套文件` : '承诺在第 8 个月底前交齐两套文件', ready <= 8 ? '你的人员安排支持这一承诺。A 仍须完成两项审查。' : `现有人手要到第 ${ready} 个月才交齐文件。A 需要最迟第 8 个月收到文件才能考虑并行审查。`, editing && prior.pledge, ready > 8)}
          </div>
        </fieldset>
        <div class="deal-draft"><h3>寄给银行 A 的提案</h3><div data-deal-draft aria-live="polite">${draftMessage(editing ? prior : {}, state.staffing)}</div></div>
        <div class="action-row">${button(editing ? '发出最后一轮提案' : '发出提案', null, true)}</div>
      </form>`;
  }

  function responseScreen(state) {
    const response = currentResponse(state);
    return `<h2 tabindex="-1">银行 A 回了什么？</h2>
      <p>${proposalSummary(state.proposals[state.proposals.length - 1], state.staffing)}</p>
      <div class="notice deal-message"><strong>银行 A 的答复</strong><p>${response.reply}</p></div>
      <p class="muted">${response.conditional ? '接受只把这项有条件的方案保留在桌上。如果最终选 A，才会投入额外协调人手。' : '你仍可以在最终决定时比较 A 和 B。'}</p>
      <div class="action-row">
        ${response.conditional ? button('接受条件，保留 A 的新方案', 'accept', true) : button('带着这份答复比较两家银行', 'proceed', true)}
        ${state.proposals.length === 1 ? button('修改提案，再谈一次', 'revise', false) : ''}
        ${response.conditional ? button('保留 A 的原方案', 'proceed', false) : ''}
      </div>`;
  }

  function offerNumbers(a, b) {
    return `<div class="timeline" aria-label="预计董事会审议区间">${timeline('A · 预计审议', a, `手续费 ${a.fee} 万美元`)}${timeline('B · 预计审议', b, `手续费 ${b.fee} 万美元`)}${axis()}</div>`;
  }

  function riskReadout(a, b, lag) {
    return `<p><strong>银行 A</strong> ${approvalWindow(a, lag)}</p><p><strong>银行 B</strong> ${approvalWindow(b, lag)}</p>`;
  }

  function decision(state) {
    const response = currentResponse(state);
    const a = offerA(state, response);
    const b = bankB(state.staffing);
    return `<h2 tabindex="-1">两份方案摆到内阁桌上</h2>
      <p>第 ${deadline} 个月底前需要拿到融资批准。下图显示的是审议时间。</p>
      ${offerNumbers(a, b)}
      ${state.accepted && response.conditional ? '<p class="muted">选 A 须按承诺交件，再为联合审查投入 6 个工作人日。</p>' : ''}
      <div class="deal-risk"><label for="deal-lag">试算审议之后还要等几个月获批</label>
        <div><input id="deal-lag" data-deal-lag type="range" min="0" max="3" value="${state.lag}" aria-describedby="deal-lag-help"><output for="deal-lag">${state.lag} 个月</output></div>
        <p class="muted" id="deal-lag-help">0 个月表示审议当月获批。两家使用同一等待时间，试一试哪家还赶得上采购。</p>
        <div data-deal-risk aria-live="polite">${riskReadout(a, b, state.lag)}</div>
      </div>
      <form data-form="decision" class="deal-form">
        <fieldset><legend>你向内阁推荐哪条路径？</legend>${radioGroup('route', routes)}</fieldset>
        <fieldset><legend>你最看重什么？</legend>${radioGroup('priority', priorities)}</fieldset>
        <div class="action-row">${button('提交给内阁', null, true)}</div>
      </form>`;
  }

  function comparison(state) {
    const proposal = state.proposals[state.proposals.length - 1];
    const offered = currentResponse(state).terms;
    const withoutB = bankResponse(state.staffing, proposal, false).terms;
    const startLoss = withoutB.start - offered.start;
    const feeLoss = withoutB.fee - offered.fee;
    if (startLoss) return {
      headline: `最早审议晚 ${startLoss} 个月`,
      detail: 'A 原本愿意加快审议，因为它既看到了 B 的书面意向，也拿到了你提前交件的承诺。',
      change: `审议区间 · 第 ${offered.start}–${offered.end} 月 → 第 ${withoutB.start}–${withoutB.end} 月`,
    };
    if (feeLoss) return {
      headline: `手续费多 ${feeLoss} 万美元`,
      detail: 'A 原本愿意用更低的手续费挽留这笔业务，因为你让它看到了 B 的书面意向。',
      change: `手续费 · ${offered.fee} 万美元 → ${withoutB.fee} 万美元`,
    };
    const ready = readyMonth(state.staffing);
    const detail = !proposal.show
      ? 'B 给了你另一条融资路径。你把书面意向留在手里，A 仍按原条件报价。'
      : ready > 8
        ? `A 看到了 B 的方案，但两套文件到第 ${ready} 月才齐，赶不上 A 并行审查的交件期限。`
        : 'A 看到了 B 的方案，但还需要你承诺提前交齐两套文件，才愿意并行审查。';
    return { headline: 'A 的报价照旧', detail };
  }

  function replayQuote(state, withoutB) {
    const proposal = state.proposals[state.proposals.length - 1];
    const terms = bankResponse(state.staffing, proposal, !withoutB).terms;
    return `<p class="deal-scene" ${withoutB ? 'data-empty-desk' : ''}><span aria-hidden="true"></span>${withoutB ? '假设 · B 从未递交方案' : '本轮 · B 提供书面方案'}</p>
      <dl class="deal-quote"><div><dt>A 的预计审议</dt><dd>第 ${terms.start}–${terms.end} 月</dd></div><div><dt>A 的一次性手续费</dt><dd>${terms.fee} 万美元</dd></div></dl>`;
  }

  function alternateMove(state) {
    const original = state.proposals[state.proposals.length - 1];
    const goal = original.goal === 'fee' ? 'fast' : 'fee';
    const ready = readyMonth(state.staffing);
    const proposal = { goal, show: true, pledge: goal === 'fast' && ready <= 8 };
    const response = bankResponse(state.staffing, proposal, true);
    return `<button type="button" class="button button-outline" data-action="try-different" aria-expanded="false" aria-controls="deal-alternate">${goal === 'fast' ? '试试用 B 的方案争取提前审议' : '试试用 B 的方案谈降费'}</button>
      <div class="deal-alternate" id="deal-alternate" hidden><p><strong>${proposalSummary(proposal, state.staffing)}</strong></p><p>${response.reply}</p></div>`;
  }

  function replay(state) {
    const result = comparison(state);
    return `<section class="deal-replay" aria-labelledby="deal-replay-title">
      <h3 id="deal-replay-title">如果 B 没来，A 还会怎么报价？</h3>
      <p>假设 B 从一开始就没送来方案。沿用你的人手安排和最后一次提案的目标，再看 A 会给什么条件。</p>
      <div class="deal-replay-quote" id="deal-quote" aria-live="polite">${replayQuote(state, false)}</div>
      <button type="button" class="button button-primary" data-action="toggle-b" aria-controls="deal-quote">拿走 B 的方案</button>
      <div class="deal-replay-result" data-deal-comparison hidden aria-live="polite">
        <p class="deal-result-kicker">拿走 B 的方案后</p>
        <p class="deal-delta"><strong>${result.headline}</strong></p>
        ${result.change ? `<p class="deal-change">${result.change}</p>` : ''}
        <p>${result.detail}</p>
        ${alternateMove(state)}
      </div>
    </section>`;
  }

  function debrief(state) {
    const response = currentResponse(state);
    const actual = offerA(state, response);
    const b = bankB(state.staffing);
    const selected = state.selected === 'A' ? actual : b;
    const borrowed = teams.filter(team => state.staffing.indexOf(team.key) !== -1);
    return `<h2 tabindex="-1">你的内阁简报</h2>
      <div class="deal-verdict"><p class="deal-result-kicker">你的本轮建议</p><strong>${routes[state.selected]}</strong><p>首要考虑 · ${priorities[state.priority]}</p>
        <p>${state.selected === 'hold' ? '继续比较融资路径，可能错过本轮采购。' : `手续费 ${selected.fee} 万美元。按你设的审批等待，预计${approvalWindow(selected, state.lag)}。`}</p></div>
      ${replay(state)}
      <details class="debt-extra"><summary>回看本轮提案与代价</summary>
        <p>${borrowed.length ? `${borrowed.map(team => team.impact).join('，')}。` : '省道与诊所保留了原有人手。'}${response.conditional && !state.accepted ? 'A 曾提议有条件加快审议，你最终把 A 的原方案留在桌上。' : ''}${state.selected === 'A' && state.accepted && response.conditional ? '与 A 走加速路线另需投入 6 个工作人日。' : ''}</p>
        <ol class="deal-history">${state.proposals.map(proposal => `<li>${proposalSummary(proposal, state.staffing)}</li>`).join('')}</ol>
      </details>
      <div class="deal-message notice"><strong>带着报价回到课堂</strong><p>对照讲师演示，看看出示书面意向、提前交件或改谈手续费，分别在哪一步改变了 A 的报价。</p></div>
      <p class="source-note">研究连接 · Qian、Vreeland 和 Zhao（2023）考察亚投行成立后，发展中创始成员国新增世界银行基础设施项目的变化。手机演示的是议价机制，研究衡量的是新增项目数量。</p>
      <div class="action-row">${button('重开一轮', 'restart', true)}<a class="button button-outline" href="#activities">返回活动总览</a></div>`;
  }

  function step(state) {
    if (!state.staffing) return 0;
    if (!state.proposals.length || state.revising) return 1;
    if (state.accepted === null) return 2;
    return state.selected === null ? 3 : 4;
  }

  function mount(root) {
    let state = lab.progress(progressId, normalize);
    let withoutB = false;

    function render(moveFocus) {
      const current = step(state);
      const labels = rounds.map((name, index) => `<li class="${index < current ? 'done' : ''}" ${index === current ? 'aria-current="step"' : ''}>${name}</li>`);
      const screen = [opening, negotiation, responseScreen, decision, debrief][current];
      root.innerHTML = `<ol class="rounds" aria-label="谈判进度">${labels.join('')}</ol><section class="panel featured-panel deal-screen">${screen(state)}</section>`;
      if (moveFocus) lab.focus(root.querySelector('h2'));
    }

    function saveAndRender() {
      lab.save(progressId, state);
      render(true);
    }

    root.addEventListener('input', event => {
      const form = event.target.form;
      if (form && form.dataset.form === 'staffing') {
        const staffing = teams.filter(team => form.elements[team.key].checked).map(team => team.key);
        root.querySelector('[data-deal-staffing]').innerHTML = staffingPlan(staffing);
      }
      if (form && form.dataset.form === 'proposal') {
        root.querySelector('[data-deal-draft]').innerHTML = draftMessage(readProposal(form), state.staffing);
      }
      if (event.target.hasAttribute('data-deal-lag')) {
        state.lag = Number(event.target.value);
        root.querySelector('output').textContent = `${state.lag} 个月`;
        root.querySelector('[data-deal-risk]').innerHTML = riskReadout(offerA(state, currentResponse(state)), bankB(state.staffing), state.lag);
        lab.save(progressId, state);
      }
    });

    root.addEventListener('submit', event => {
      event.preventDefault();
      const form = event.target;
      if (form.dataset.form === 'staffing') {
        state.staffing = teams.filter(team => form.elements[team.key].checked).map(team => team.key);
      } else if (form.dataset.form === 'proposal') {
        state.proposals.push(readProposal(form));
        state.revising = false;
      } else if (form.dataset.form === 'decision') {
        state.selected = form.elements.route.value;
        state.priority = form.elements.priority.value;
      } else return;
      saveAndRender();
    });

    root.addEventListener('click', event => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      if (action === 'toggle-b') {
        withoutB = !withoutB;
        root.querySelector('#deal-quote').innerHTML = replayQuote(state, withoutB);
        root.querySelector('[data-deal-comparison]').hidden = false;
        button.textContent = withoutB ? '把 B 的方案放回来' : '拿走 B 的方案';
        return;
      }
      if (action === 'try-different') {
        const result = root.querySelector('#deal-alternate');
        result.hidden = !result.hidden;
        button.setAttribute('aria-expanded', String(!result.hidden));
        return;
      }
      if (action === 'restart') {
        state = normalize(null);
        withoutB = false;
      } else if (action === 'revise') state.revising = true;
      else if (action === 'accept' || action === 'proceed') state.accepted = action === 'accept';
      else return;
      saveAndRender();
    });

    render(false);
  }

  lab.register(id, mount);
}(window.JQFinance));
