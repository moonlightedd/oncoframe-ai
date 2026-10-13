export default function Disclaimer() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.93 19h12.14a2 2 0 001.74-3L13.74 4a2 2 0 00-3.48 0L4.19 16a2 2 0 001.74 3z" />
          </svg>
        </div>
        <p className="text-sm text-amber-800 leading-relaxed">
          <strong>Research and education prototype. Not clinically validated. Not for diagnosis.</strong>{' '}
          A nodule candidate is not a cancer diagnosis. All data is processed locally in your browser and never uploaded.
        </p>
      </div>
    </div>
  );
}
