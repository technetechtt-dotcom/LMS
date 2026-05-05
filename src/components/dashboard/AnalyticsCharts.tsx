import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line } from
'recharts';
import { Card } from '../ui/Card';
const enrolmentData = [
{
  name: 'Systems Dev',
  learners: 45
},
{
  name: 'Project Mgmt',
  learners: 32
},
{
  name: 'Business Analysis',
  learners: 24
},
{
  name: 'Cyber Security',
  learners: 18
},
{
  name: 'Python Prog',
  learners: 12
}];

const completionData = [
{
  month: 'Jan',
  completions: 12
},
{
  month: 'Feb',
  completions: 19
},
{
  month: 'Mar',
  completions: 15
},
{
  month: 'Apr',
  completions: 25
},
{
  month: 'May',
  completions: 32
},
{
  month: 'Jun',
  completions: 28
}];

export function AnalyticsCharts() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title="Learner Enrolments by Programme">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={enrolmentData}
              layout="vertical"
              margin={{
                top: 5,
                right: 30,
                left: 40,
                bottom: 5
              }}>
              
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={true}
                vertical={false} />
              
              <XAxis type="number" />
              <YAxis
                dataKey="name"
                type="category"
                width={100}
                tick={{
                  fontSize: 12
                }} />
              
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
                cursor={{
                  fill: '#F1F5F9'
                }} />
              
              <Bar
                dataKey="learners"
                fill="#1B3A5C"
                radius={[0, 4, 4, 0]}
                barSize={20} />
              
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Monthly Completion Trend">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={completionData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5
              }}>
              
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{
                  fontSize: 12
                }} />
              
              <YAxis
                tick={{
                  fontSize: 12
                }} />
              
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }} />
              
              <Line
                type="monotone"
                dataKey="completions"
                stroke="#0D9488"
                strokeWidth={3}
                dot={{
                  fill: '#0D9488',
                  strokeWidth: 2,
                  r: 4
                }}
                activeDot={{
                  r: 6
                }} />
              
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>);

}