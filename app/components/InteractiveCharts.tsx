import React, { useState, useMemo } from 'react';
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
export const CombinedBarLineChart: React.FC<{
  data: any;
  barDataKey: any;
  lineDataKey?: any;
  xAxisKey?: string;
  barName: any;
  lineName: any;
  height?: number;
  valuePrefix?: string;
  valueSuffix?: string;
  xAxisFormatter?: (value: any) => string;
  yAxisFormatter?: (value: any) => string;
  colorByValue?: boolean;
  positiveColor?: string;
  negativeColor?: string;
  barColors?: string[];
  lineColor?: string;
}> = ({
  data,
  barDataKey,
  lineDataKey,
  xAxisKey = "date",
  barName,
  lineName,
  height = 300,
  valuePrefix = "",
  valueSuffix = "",
  xAxisFormatter,
  yAxisFormatter,
  colorByValue = false,
  positiveColor = "#4ade80",
  negativeColor = "#f87171",
  barColors,
  lineColor = "#60a5fa"
}) => {
  const [brushActive, setBrushActive] = useState(false);
  const [activeDot, setActiveDot] = useState<number | null>(null);
  
  // Define the custom bar color function
  const getBarColor = (entry: any) => {
    if (barColors && Array.isArray(barColors) && barColors.length > 0) {
      // If we have an array of colors, use them based on value
      if (colorByValue) {
        const value = entry[barDataKey];
        return value >= 0 ? barColors[0] : barColors.length > 1 ? barColors[1] : barColors[0];
      } else {
        // Use first color if not by value
        return barColors[0];
      }
    } else if (colorByValue) {
      // Default color by value behavior
      const value = entry[barDataKey];
      return value >= 0 ? positiveColor : negativeColor;
    } else {
      // Default color
      return positiveColor;
    }
  };
  
  // Generate moving average for line if lineDataKey not specified
  const chartData = useMemo(() => {
    if (lineDataKey || !data || data.length === 0) return data;
    
    const windowSize = Math.max(5, Math.floor(data.length / 20));
    let sum = 0;
    const result = [...data].map((item, index, array) => {
      if (index < windowSize) {
        // For the first windowSize items, use cumulative average
        sum += item[barDataKey] || 0;
        return {
          ...item,
          trend: sum / (index + 1)
        };
      } else {
        // For the rest, use moving average
        let windowSum = 0;
        for (let i = 0; i < windowSize; i++) {
          windowSum += array[index - i][barDataKey] || 0;
        }
        return {
          ...item,
          trend: windowSum / windowSize
        };
      }
    });
    
    return result;
  }, [data, barDataKey, lineDataKey]);
  
  if (!chartData || chartData.length === 0) {
    return <div className="flex items-center justify-center h-64 bg-gray-800 rounded-lg">
      <p className="text-gray-400">No data available</p>
    </div>;
  }
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={chartData}
        margin={{ top: 5, right: 20, bottom: 20, left: 20 }}
        onMouseMove={(e) => {
          if (e.activeTooltipIndex !== undefined) {
            setActiveDot(e.activeTooltipIndex);
          }
        }}
        onMouseLeave={() => setActiveDot(null)}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis 
          dataKey={xAxisKey} 
          tick={{ fill: '#9CA3AF' }}
          tickFormatter={xAxisFormatter}
        />
        <YAxis 
          tick={{ fill: '#9CA3AF' }} 
          tickFormatter={yAxisFormatter}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-3">
                  <p className="text-gray-300 mb-1">
                    {payload[0].payload[xAxisKey] && (xAxisFormatter 
                      ? xAxisFormatter(payload[0].payload[xAxisKey]) 
                      : payload[0].payload[xAxisKey])}
                  </p>
                  <p className="font-semibold text-sm">
                    <span className="text-green-400">{barName}: </span>
                    <span className="text-white">
                      {valuePrefix}{yAxisFormatter 
                        ? yAxisFormatter(payload[0].value) 
                        : payload[0].value
                      }{valueSuffix}
                    </span>
                  </p>
                  {payload.length > 1 && (
                    <p className="font-semibold text-sm">
                      <span className="text-blue-400">{lineName}: </span>
                      <span className="text-white">
                        {valuePrefix}{yAxisFormatter 
                          ? yAxisFormatter(payload[1].value) 
                          : payload[1].value
                        }{valueSuffix}
                      </span>
                    </p>
                  )}
                </div>
              );
            }
            return null;
          }}
        />
        <Legend 
          verticalAlign="top" 
          height={36} 
          payload={[
            { value: barName, type: 'rect', color: colorByValue ? (barColors ? barColors[0] : positiveColor) : (barColors ? barColors[0] : positiveColor) },
            { value: lineName, type: 'line', color: lineColor }
          ]}
        />
        <Bar 
          dataKey={barDataKey} 
          name={barName}
          fill={positiveColor}
          radius={[2, 2, 0, 0]}
          // Replace static fill with dynamic color function
          fill={(entry) => getBarColor(entry)}
        />
        <Line 
          type="monotone" 
          dataKey={lineDataKey || "trend"} 
          name={lineName}
          stroke={lineColor} 
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6, fill: lineColor, stroke: "#111827", strokeWidth: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
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