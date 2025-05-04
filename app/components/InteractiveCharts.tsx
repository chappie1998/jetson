import React, { useState } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Brush, ReferenceLine, ComposedChart
} from 'recharts';

// Custom tooltip component
export const CustomTooltip = ({ active, payload, label, valuePrefix = '', valueSuffix = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 p-3 rounded shadow-lg">
        <p className="text-gray-300 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} style={{ color: entry.color || '#fff' }}>
            {entry.name}: {valuePrefix}{typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}{valueSuffix}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Chart time range selector component
export const TimeRangeSelector = ({ timeframe, onChange }) => {
  return (
    <div className="flex space-x-2">
      {(['all', 'ytd', '6m', '3m', '1m']).map((period) => (
        <button
          key={period}
          className={`px-2 py-1 text-xs font-medium rounded ${
            timeframe === period
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          onClick={() => onChange(period)}
        >
          {period.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

// Interactive area chart component
export const InteractiveAreaChart = ({ 
  data, 
  dataKey, 
  xAxisKey = 'date',
  name,
  color = '#3b82f6',
  height = 300,
  valuePrefix = '',
  valueSuffix = '',
  yAxisFormatter = value => value.toLocaleString(),
  xAxisFormatter = value => {
    if (typeof value === 'string' && value.includes('-')) {
      const date = new Date(value);
      return `${date.getMonth()+1}/${date.getDate()}`;
    }
    return value;
  },
  showBrush = true
}) => {
  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          <defs>
            <linearGradient id={`color${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={color} stopOpacity={0.2}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis 
            dataKey={xAxisKey} 
            tick={{ fill: '#9ca3af' }}
            tickFormatter={xAxisFormatter}
          />
          <YAxis 
            tick={{ fill: '#9ca3af' }}
            tickFormatter={yAxisFormatter}
          />
          <Tooltip 
            content={<CustomTooltip valuePrefix={valuePrefix} valueSuffix={valueSuffix} />}
          />
          <Area 
            type="monotone" 
            dataKey={dataKey} 
            name={name || dataKey}
            stroke={color} 
            fill={`url(#color${dataKey})`} 
            activeDot={{ r: 8 }}
          />
          {showBrush && (
            <Brush 
              dataKey={xAxisKey} 
              height={20} 
              stroke="#666"
              tickFormatter={xAxisFormatter}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Interactive bar chart component
export const InteractiveBarChart = ({
  data,
  dataKey,
  xAxisKey = 'date',
  name,
  height = 300,
  valuePrefix = '',
  valueSuffix = '',
  yAxisFormatter = value => value.toLocaleString(),
  xAxisFormatter = value => value,
  colorByValue = true,
  positiveColor = "#4ade80",
  negativeColor = "#f87171",
  staticColor = "#3b82f6",
  showReferenceLine = true
}) => {
  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis 
            dataKey={xAxisKey} 
            tick={{ fill: '#9ca3af' }}
            tickFormatter={xAxisFormatter}
          />
          <YAxis 
            tick={{ fill: '#9ca3af' }}
            tickFormatter={yAxisFormatter}
          />
          <Tooltip 
            content={<CustomTooltip valuePrefix={valuePrefix} valueSuffix={valueSuffix} />}
          />
          {showReferenceLine && <ReferenceLine y={0} stroke="#666" />}
          <Bar
            dataKey={dataKey}
            name={name || dataKey}
            fill={colorByValue ? ((data) => data[dataKey] >= 0 ? positiveColor : negativeColor) : staticColor}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Combined chart component with bars and line
export const CombinedBarLineChart = ({
  data,
  barDataKey,
  lineDataKey = barDataKey,
  xAxisKey = 'date',
  barName,
  lineName,
  height = 300,
  valuePrefix = '',
  valueSuffix = '',
  yAxisFormatter = value => value.toLocaleString(),
  xAxisFormatter = value => {
    if (typeof value === 'string' && value.includes('-')) {
      const date = new Date(value);
      return `${date.getMonth()+1}/${date.getDate()}`;
    }
    return value;
  },
  barColorByValue = true,
  positiveColor = "#4ade80",
  negativeColor = "#f87171",
  lineColor = "#38bdf8"
}) => {
  // Custom dot renderer to only show significant values
  const renderDot = (props) => {
    const { cx, cy, value } = props;
    // Only render dots for significant values (e.g., big gains or losses)
    if (Math.abs(value) > 5) {
      return (
        <circle 
          cx={cx} 
          cy={cy} 
          r={4} 
          fill={value >= 0 ? positiveColor : negativeColor} 
          stroke="none" 
        />
      );
    }
    return null;
  };

  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis 
            dataKey={xAxisKey} 
            tick={{ fill: '#9ca3af' }}
            tickFormatter={xAxisFormatter}
          />
          <YAxis 
            tick={{ fill: '#9ca3af' }}
            tickFormatter={yAxisFormatter}
          />
          <Tooltip 
            content={<CustomTooltip valuePrefix={valuePrefix} valueSuffix={valueSuffix} />}
          />
          <ReferenceLine y={0} stroke="#666" />
          <Bar
            dataKey={barDataKey}
            name={barName || barDataKey}
            fill={barColorByValue ? 
              ((data) => data[barDataKey] >= 0 ? positiveColor : negativeColor) : 
              positiveColor}
          />
          <Line
            type="monotone"
            dataKey={lineDataKey}
            name={lineName || lineDataKey}
            stroke={lineColor}
            dot={renderDot}
            strokeWidth={1}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// Distribution chart component
export const DistributionChart = ({
  data,
  categoryKey = 'range',
  countKey = 'count',
  frequencyKey = 'frequency',
  height = 300
}) => {
  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis 
            dataKey={categoryKey} 
            tick={{ fill: '#9ca3af' }}
          />
          <YAxis 
            yAxisId="left"
            orientation="left"
            tick={{ fill: '#9ca3af' }}
            label={{ value: 'Count', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tick={{ fill: '#9ca3af' }}
            tickFormatter={(value) => `${value.toFixed(1)}%`}
            label={{ value: 'Frequency', angle: 90, position: 'insideRight', fill: '#9ca3af' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey={countKey}
            name="Count"
            fill="#3b82f6"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey={frequencyKey}
            name="Frequency (%)"
            stroke="#f59e0b"
            strokeWidth={2}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}; 