document.addEventListener('DOMContentLoaded', () => {
  const selectorEl = document.getElementById('lottery-selector');
  const titleEl = document.getElementById('active-lottery-title');
  const metaEl = document.getElementById('active-lottery-meta');
  const predictedBallsEl = document.getElementById('predicted-balls');
  const heatmapGridEl = document.getElementById('heatmap-grid');
  const hotNumbersEl = document.getElementById('hot-numbers');
  const coldNumbersEl = document.getElementById('cold-numbers');
  const evenOddEl = document.getElementById('even-odd');
  const avgSumEl = document.getElementById('avg-sum');
  const accuracyEl = document.getElementById('model-accuracy');

  let lotteries = [];

  fetch('/api/lotteries')
    .then(res => res.json())
    .then(data => {
      lotteries = data;
      renderLotterySelector();
      if (lotteries.length > 0) loadLotteryAnalytics(lotteries[0].id);
    });

  function renderLotterySelector() {
    selectorEl.innerHTML = lotteries.map((lot, idx) => `
      <button class="selector-btn ${idx === 0 ? 'active' : ''}" onclick="selectLottery(${lot.id}, this)">
        <strong>${lot.name}</strong> (${lot.country})
      </button>
    `).join('');
  }

  window.selectLottery = (id, btn) => {
    document.querySelectorAll('.selector-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadLotteryAnalytics(id);
  };

  function loadLotteryAnalytics(id) {
    fetch(`/api/lottery/${id}/analytics`)
      .then(res => res.json())
      .then(data => {
        titleEl.textContent = data.lottery.name;
        metaEl.textContent = `${data.lottery.country} | Matrix: ${data.lottery.pick_count}/${data.lottery.main_numbers_count}`;

        predictedBallsEl.innerHTML = data.predictions.mostLikely.map(num => `
          <div class="ball">${num}</div>
        `).join('');

        heatmapGridEl.innerHTML = data.heatmap.matrix.map(cell => `
          <div class="heatmap-cell ${cell.intensityPercent > 70 ? 'hot' : ''}" style="opacity: ${Math.max(0.3, cell.intensityPercent / 100)}">
            ${cell.number}
          </div>
        `).join('');

        hotNumbersEl.innerHTML = data.trends.hotNumbers.map(n => `<span class="badge">${n.number}</span>`).join('');
        coldNumbersEl.innerHTML = data.trends.coldNumbers.map(n => `<span class="badge">${n.number}</span>`).join('');
        evenOddEl.textContent = `Even/Odd: ${data.trends.evenOddRatio}`;
        avgSumEl.textContent = `Average Sum: ${data.trends.averageSum}`;
      });

    fetch(`/api/lottery/${id}/memory`)
      .then(res => res.json())
      .then(data => {
        accuracyEl.textContent = `${data.overallAccuracyPercent}%`;
      });
  }
});
