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
import { TrendingUp, AlertCircle } from 'lucide-react';

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
  const safeConditions = conditions || [];

  // Available parameters to view
  const allParamOptions: { id: VitalParameterType; label: string; unit: string }[] = [
    { id: 'blood_pressure', label: 'Blood Pressure', unit: 'mmHg' },
    { id: 'heart_rate', label: 'Heart Rate', unit: 'bpm' },
    { id: 'blood_glucose', label: 'Blood Glucose', unit: 'mg/dL' },
    { id: 'hba1c', label: 'HbA1c', unit: '%' },
    { id: 'weight', label: 'Weight', unit: 'kg' },
    { id: 'spo2', label: 'Oxygen Saturation (SpO2)', unit: '%' },
    { id: 'respiratory_rate', label: 'Respiratory Rate', unit: 'breaths/min' },
  ];

  // Prioritize tabs based on patient's condition
  const relevantTypes = new Set<VitalParameterType>();
  if (safeConditions.some((c) => ['Hypertension', 'Chronic Kidney Disease', 'Heart Disease'].includes(c))) {
    relevantTypes.add('blood_pressure');
  }
  if (safeConditions.some((c) => ['Hypertension', 'COPD', 'Asthma', 'Heart Disease'].includes(c))) {
    relevantTypes.add('heart_rate');
  }
  if (safeConditions.includes('Diabetes')) {
    relevantTypes.add('blood_glucose');
    relevantTypes.add('hba1c');
    relevantTypes.add('weight');
  }
  if (safeConditions.some((c) => ['COPD', 'Asthma'].includes(c))) {
    relevantTypes.add('spo2');
    relevantTypes.add('respiratory_rate');
  }
  if (safeConditions.some((c) => ['Obesity', 'Chronic Kidney Disease', 'Heart Disease'].includes(c))) {
    relevantTypes.add('weight');
  }

  const paramOptions =
    relevantTypes.size > 0
      ? allParamOptions.filter((p) => relevantTypes.has(p.id))
      : allParamOptions;

  const defaultType = paramOptions[0]?.id || 'blood_pressure';
  const [selectedType, setSelectedType] = useState<VitalParameterType>(defaultType);

  const currentOption = paramOptions.find((p) => p.id === selectedType) || paramOptions[0];

  // Filter readings for selected parameter and sort chronologically
  const parameterReadings = readings
    .filter((r) => r.parameterType === selectedType)
    .sort(
      (a, b) =>
        new Date(`${a.date}T${a.time || '00:00'}`).getTime() -
        new Date(`${b.date}T${b.time || '00:00'}`).getTime()
    );

  const chartData = parameterReadings.map((r) => {
    // Format date for chart display: e.g. "18 Sep"
    let shortDate = r.date;
    try {
      const d = new Date(`${r.date}T00:00:00`);
      shortDate = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    } catch {}

    return {
      date: shortDate,
      fullDate: r.date,
      value: r.value,
      systolic: r.systolic,
      diastolic: r.diastolic,
    };
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        {/* Heading & Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Health Trends</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              See how your health readings change over time.
            </p>
          </div>

          {/* Metric Selector */}
          <div className="flex flex-wrap gap-1.5">
            {paramOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSelectedType(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
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

        {/* Content / Graph */}
        <div className="pt-6">
          {parameterReadings.length < 2 ? (
            <div className="py-14 text-center bg-slate-50 rounded-xl border border-slate-100">
              <TrendingUp className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">Not enough readings yet.</h3>
              <p className="text-xs text-slate-500 mt-1">
                Add more health readings to see your health trends.
              </p>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-900">
                  {currentOption.label} Trend
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Date &rarr; {currentOption.label} ({currentOption.unit})
                </p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {selectedType === 'blood_pressure' ? (
                    <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} stroke="#CBD5E1" />
                      <YAxis
                        domain={['dataMin - 10', 'dataMax + 10']}
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        stroke="#CBD5E1"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Line
                        type="monotone"
                        dataKey="systolic"
                        name="Systolic (mmHg)"
                        stroke="#0F766E"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#0F766E' }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="diastolic"
                        name="Diastolic (mmHg)"
                        stroke="#0284C7"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#0284C7' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  ) : (
                    <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} stroke="#CBD5E1" />
                      <YAxis
                        domain={['dataMin - 5', 'dataMax + 5']}
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        stroke="#CBD5E1"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        name={`${currentOption.label} (${currentOption.unit})`}
                        stroke="#0F766E"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#0F766E' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
