// На узком экране Mermaid сжимает широкую схему под ширину колонки, и подписи становятся
// мельче 4 пикселей. Здесь схеме задаётся минимальная ширина — не больше её собственной,
// — а контейнер прокручивается по горизонтали (src/css/custom.css).
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

const NARROW = '(max-width: 996px)';
const MIN_WIDTH = 560;

function fit(svg) {
  const natural = parseFloat(svg.style.maxWidth);
  if (!natural) return;
  svg.style.minWidth = window.matchMedia(NARROW).matches ? `${Math.min(natural, MIN_WIDTH)}px` : '';
}

function fitAll() {
  document.querySelectorAll('.docusaurus-mermaid-container svg').forEach(fit);
}

// Схемы рисуются после загрузки страницы: ждём их появления, не чаще раза за кадр.
let scheduled = false;
function scheduleFit() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    fitAll();
  });
}

if (ExecutionEnvironment.canUseDOM) {
  new MutationObserver(scheduleFit).observe(document.documentElement, {childList: true, subtree: true});
  window.matchMedia(NARROW).addEventListener('change', fitAll);
}

export function onRouteDidUpdate() {
  fitAll();
}
