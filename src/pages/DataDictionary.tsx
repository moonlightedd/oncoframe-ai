import { useApp } from '@/context/AppContext';
import PageWrapper from '@/components/PageWrapper';
import EmptyState from '@/components/EmptyState';

export default function DataDictionary() {
  const { data } = useApp();
  const hasData = data.candidates.length > 0;

  if (!hasData) {
    return (
      <PageWrapper title="Data Dictionary">
        <EmptyState
          title="No dataset loaded"
          message="Upload a features.csv on the Dataset Audit page first. If a data_dictionary.csv was uploaded, its contents will appear here."
        />
      </PageWrapper>
    );
  }

  const hasProvidedDictionary = data.dataDictionary && data.dataDictionary.length > 0;

  const autoDict = data.columns.map((col) => {
    const isNumeric = data.numericColumns.includes(col);
    const missingCount = data.rawRows.filter((r) => r[col] === undefined || r[col] === '').length;
    return {
      column: col,
      type: isNumeric ? 'numeric' : 'string',
      description: isNumeric ? 'Numeric feature' : 'Identifier or categorical',
      source: 'Auto-generated',
      missing: missingCount,
    };
  });

  return (
    <PageWrapper title="Data Dictionary" subtitle={hasProvidedDictionary ? 'From uploaded data_dictionary.csv' : 'Auto-generated from uploaded CSV'}>
      <div className="card">
        {hasProvidedDictionary ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 px-3">Column</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">Description</th>
                <th className="py-2 px-3">Source</th>
              </tr>
            </thead>
            <tbody>
              {data.dataDictionary!.map((row, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2 px-3 font-mono text-xs">{row.column}</td>
                  <td className="py-2 px-3">{row.type}</td>
                  <td className="py-2 px-3 text-gray-600">{row.description}</td>
                  <td className="py-2 px-3 text-gray-600">{row.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 px-3">Column</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">Description</th>
                <th className="py-2 px-3">Missing</th>
              </tr>
            </thead>
            <tbody>
              {autoDict.map((row) => (
                <tr key={row.column} className="border-b border-gray-100">
                  <td className="py-2 px-3 font-mono text-xs">{row.column}</td>
                  <td className="py-2 px-3">
                    <span className={row.type === 'numeric' ? 'badge-implemented' : 'badge-proposed'}>
                      {row.type}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-gray-600">{row.description}</td>
                  <td className="py-2 px-3 text-right">{row.missing}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="card mt-4 bg-navy-50 border-navy-100">
        <p className="text-sm text-navy-600">
          <strong>Note:</strong> Rows represent nodule candidates (not independent patients). Multiple candidates can share the same <code className="font-mono text-xs">group_id</code> (scan/series). The <code className="font-mono text-xs">label</code> column indicates 1 = annotated nodule candidate, 0 = non-nodule candidate.
        </p>
      </div>
    </PageWrapper>
  );
}
