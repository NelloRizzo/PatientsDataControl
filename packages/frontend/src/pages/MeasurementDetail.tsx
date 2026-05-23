import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMeasurement, updateMeasurement } from '../api/measurements';

export function MeasurementDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getMeasurement(id).then(setData).catch(() => setError('Measurement not found'));
  }, [id]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <p>Loading...</p>;

  const handleSave = async () => {
    try {
      await updateMeasurement(id!, { notes: data.notes });
      navigate('/measurements');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Update failed');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Measurement Detail</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <div>
          <span className="text-sm font-medium text-gray-600">Type:</span>{' '}
          {data.type}
        </div>
        <div>
          <span className="text-sm font-medium text-gray-600">Values:</span>{' '}
          {JSON.stringify(data.values)}
        </div>
        <div>
          <span className="text-sm font-medium text-gray-600">Units:</span>{' '}
          {JSON.stringify(data.units)}
        </div>
        <div>
          <span className="text-sm font-medium text-gray-600">Date:</span>{' '}
          {new Date(data.timestamp).toLocaleString()}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={data.notes || ''}
            onChange={(e) => setData({ ...data, notes: e.target.value })}
            className="w-full border rounded px-3 py-2"
            rows={3}
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Save
        </button>
      </div>
    </div>
  );
}
