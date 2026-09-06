import React, { useState } from 'react';
import { HealthReading, VitalParameterType, SupportedCondition } from '../../types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingUp, AlertCircle, Calendar } from 'lucide-react';

interface HealthTrendsViewProps {
  readings: HealthReading[];
  conditions?: SupportedCondition[];
  onNavigateToConditions?: () => void;
}

export const HealthTrendsView: React.FC<HealthTrendsViewProps> = ({
  readings,
  conditions = [],
  onNavigateToConditions,
}) => {
  // Determine available tabs based on conditions
  const allParamOptions: { id: VitalParameterType; label: string; unit: string }[] = [
    { id: 'blood_pressure', label: 'Blood Pressure', unit: 'mmHg' },
    { id: 'blood_glucose', label: 'Blood Glucose', unit: 'mg/dL' },
    { id: 'spo2', label: 'Oxygen Saturation (SpO2)', unit: '%' },
    { id: 'heart_rate', label: 'Heart Rate', unit: 'bpm' },
    { id: 'respiratory_rate', label: 'Respiratory Rate', unit: 'breaths/min' },
    { id: 'weight', label: 'Weight', unit: 'kg' },
    { id: 'hba1c', label: 'HbA1c', unit: '%' },
  ];

  const relevantTypes = new Set<VitalParameterType>();
  if (conditions.includes('Diabetes')) {
    relevantTypes.add('blood_glucose');
    relevantTypes.add('hba1c');
    relevantTypes.add('weight');
  }
  if (conditions.includes('Hypertension')) {
    relevantTypes.add('blood_pressure');
    relevantTypes.add('heart_rate');
  }
  if (conditions.includes('COPD')) {
    relevantTypes.add('spo2');
    relevantTypes.add('respiratory_rate');
    relevantTypes.add('heart_rate');
  }

  const paramOptions =
    relevantTypes.size > 0
      ? allParamOptions.filter((p) => relevantTypes.has(p.id))
      : allParamOptions;

  const defaultType = paramOptions[0]?.id || 'blood_pressure';
  const [selectedType, setSelectedType] = useState<VitalParameterType>(defaultType);

  // If readings is empty
  if (readings.length === 0) {
    const noConditions = conditions.length === 0;
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <TrendingUp className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-900">
          {noConditions
            ? 'Please select your medical condition(s) before entering health readings.'
            : 'No readings recorded yet.'}
        </h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          {noConditions
            ? 'The system requires your diagnosed condition to configure clinical parameters.'
            : 'Enter your actual measurements in Health Monitoring to generate longitudinal trend charts.'}
        </p>
        {noConditions && onNavigateToConditions && (
          <button
            onClick={onNavigateToConditions}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
          >
            Select Medical Condition(s)
          </button>
        )}
      </div>
    );
  }

  // Filter and sort chronologically for trend lines
  const sortedReadings = [...readings].sort(
    (a, b) => new Date(`${a.date}T${a.time || '00:00'}`).getTime() - new Date(`${b.date}T${b.time || '00:00'}`).getTime()
  );

  const parameterReadings = sortedReadings.filter((r) => r.parameterType === selectedType);

  // Format data for Recharts
  const chartData = parameterReadings.map((r) => ({
    timestamp: `${r.date.slice(5)} ${r.time || ''}`,
    fullDateTime: `${r.date} ${r.time || ''}`,
    value: r.value,
    systolic: r.systolic,
    diastolic: r.diastolic,
    unit: r.unit,
    context: r.measurementContext,
    notes: r.notes,
  }));

  const currentOption = paramOptions.find((p) => p.id === selectedType) || paramOptions[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Longitudinal Vital Signs Trends</h3>
            <p className="text-xs text-slate-500">Real-time visualization derived from recorded observations</p>
          </div>
        </div>

        {/* Parameter filter buttons */}
        <div className="flex flex-wrap gap-1.5">
          {paramOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedType(opt.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedType === opt.id
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-5">
        {parameterReadings.length < 2 ? (
          <div className="py-16 text-center bg-slate-50 rounded-xl border border-slate-200">
            <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-800">
              Not enough readings to display a trend.
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              At least two chronological {currentOption.label} readings are required to plot a trend line. Currently recorded:{' '}
              <strong>{parameterReadings.length} reading{parameterReadings.length === 1 ? '' : 's'}</strong>.
            </p>
          </div>
        ) : (
          <div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {selectedType === 'blood_pressure' ? (
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="timestamp" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} domain={['dataMin - 10', 'dataMax + 10']} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-lg">
                              <p className="font-semibold text-teal-300">{d.fullDateTime}</p>
                              <p className="mt-1">Systolic: <span className="font-bold text-rose-300">{d.systolic}</span> mmHg</p>
                              <p>Diastolic: <span className="font-bold text-sky-300">{d.diastolic}</span> mmHg</p>
                              {d.notes && <p className="text-slate-400 mt-1 italic">"{d.notes}"</p>}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="systolic"
                      name="Systolic BP (mmHg)"
                      stroke="#e11d48"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#e11d48' }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="diastolic"
                      name="Diastolic BP (mmHg)"
                      stroke="#0284c7"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#0284c7' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="timestamp" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} domain={['dataMin - 5', 'dataMax + 5']} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-lg">
                              <p className="font-semibold text-teal-300">{d.fullDateTime}</p>
                              <p className="mt-1">
                                {currentOption.label}: <span className="font-bold text-white">{d.value}</span> {d.unit}
                              </p>
                              {d.context && <p className="text-slate-300">Context: {d.context}</p>}
                              {d.notes && <p className="text-slate-400 mt-1 italic">"{d.notes}"</p>}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name={`${currentOption.label} (${currentOption.unit})`}
                      stroke="#0d9488"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#0d9488' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Reading details table preview */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>{parameterReadings.length} recorded data points plotted</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Chronological Observation Sequence
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
