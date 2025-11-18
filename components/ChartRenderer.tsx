
import React from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { ChartConfig, RowData } from '../types';

interface ChartRendererProps {
  config: ChartConfig;
  data: RowData[];
  className?: string;
  id?: string;
}

const COLORS = ['#8ab4f8', '#81c995', '#fdd663', '#f28b82', '#c58af9', '#202124'];

const ChartRenderer: React.FC<ChartRendererProps> = ({ config, data, className = "w-full h-64", id }) => {
  if (!data || data.length === 0) return <div className="text-gray-500 text-sm italic p-4">No data available for chart</div>;

  const renderChart = () => {
    switch (config.type) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey={config.dataKeyX} stroke="#9ca3af" tick={{fontSize: 12}} />
            <YAxis stroke="#9ca3af" tick={{fontSize: 12}} />
            <Tooltip contentStyle={{ backgroundColor: '#303134', border: 'none', borderRadius: '8px' }} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            {Array.isArray(config.dataKeyY) ? (
              config.dataKeyY.map((key, index) => (
                <Line key={key} type="monotone" dataKey={key} stroke={COLORS[index % COLORS.length]} dot={false} />
              ))
            ) : (
              <Line type="monotone" dataKey={config.dataKeyY as string} stroke={COLORS[0]} strokeWidth={2} dot={false} />
            )}
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey={config.dataKeyX} stroke="#9ca3af" tick={{fontSize: 12}} />
            <YAxis stroke="#9ca3af" tick={{fontSize: 12}} />
            <Tooltip contentStyle={{ backgroundColor: '#303134', border: 'none', borderRadius: '8px' }} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            {Array.isArray(config.dataKeyY) ? (
              config.dataKeyY.map((key, index) => (
                <Area key={key} type="monotone" dataKey={key} stackId="1" stroke={COLORS[index % COLORS.length]} fill={COLORS[index % COLORS.length]} fillOpacity={0.6} />
              ))
            ) : (
              <Area type="monotone" dataKey={config.dataKeyY as string} stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.3} />
            )}
          </AreaChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey={Array.isArray(config.dataKeyY) ? config.dataKeyY[0] : config.dataKeyY}
              nameKey={config.dataKeyX}
              cx="50%"
              cy="50%"
              outerRadius="80%"
              fill="#8ab4f8"
              label={({cx, cy, midAngle, innerRadius, outerRadius, percent, index}) => {
                const RADIAN = Math.PI / 180;
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                return percent > 0.05 ? (
                  <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10}>
                    {`${(percent * 100).toFixed(0)}%`}
                  </text>
                ) : null;
              }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: '#303134', border: 'none', borderRadius: '8px' }} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
          </PieChart>
        );
      case 'bar':
      default:
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey={config.dataKeyX} stroke="#9ca3af" tick={{fontSize: 12}} />
            <YAxis stroke="#9ca3af" tick={{fontSize: 12}} />
            <Tooltip cursor={{fill: '#3c4043'}} contentStyle={{ backgroundColor: '#303134', border: 'none', borderRadius: '8px' }} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            {Array.isArray(config.dataKeyY) ? (
              config.dataKeyY.map((key, index) => (
                <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} />
              ))
            ) : (
              <Bar dataKey={config.dataKeyY as string} fill={COLORS[0]} radius={[4, 4, 0, 0]} />
            )}
          </BarChart>
        );
    }
  };

  return (
    <div id={id} className={`${className} bg-[#252629] rounded-lg p-3 border border-gray-700 flex flex-col`}>
       {config.title && <h4 className="text-xs font-medium text-gray-300 mb-2 truncate">{config.title}</h4>}
       <div className="flex-1 min-h-0">
         <ResponsiveContainer width="100%" height="100%">
           {renderChart()}
         </ResponsiveContainer>
       </div>
    </div>
  );
};

export default ChartRenderer;
