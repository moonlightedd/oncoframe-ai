import type { ModelResult } from './types';

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportMetricsJson(results: ModelResult[]): void {
  const exportData = results.map((r) => ({
    model: r.modelName,
    metrics: {
      accuracy: r.metrics.accuracy,
      precision: r.metrics.precision,
      recall: r.metrics.recall,
      specificity: r.metrics.specificity,
      f1: r.metrics.f1,
      rocAuc: r.metrics.rocAuc,
      prAuc: r.metrics.prAuc,
      brierScore: r.metrics.brierScore,
      confusionMatrix: r.metrics.confusionMatrix,
    },
    featureImportances: r.featureImportances,
    coefficients: r.coefficients,
  }));
  downloadJson(exportData, 'metrics.json');
}

export function downloadPng(svg: SVGSVGElement, filename: string) {
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const img = new Image();
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  img.onload = () => {
    canvas.width = img.width * 2;
    canvas.height = img.height * 2;
    ctx.scale(2, 2);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const pngUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(pngUrl);
    });
  };
  img.src = url;
}

export function exportChartPng(container: HTMLElement | null, filename: string) {
  if (!container) return;
  const svg = container.querySelector('svg');
  if (!svg) return;
  downloadPng(svg as SVGSVGElement, filename);
}
