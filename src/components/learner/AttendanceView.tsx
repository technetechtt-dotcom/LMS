import React from 'react';
import { Check, Download, MapPin } from 'lucide-react';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { Badge } from '../ui/Badge';
import { DataTable } from '../ui/DataTable';
import { Button } from '../ui/Button';
import { toast } from 'sonner';
const sessions = [
{
  id: 1,
  date: '2023-05-15',
  title: 'Module 3: Advanced CSS',
  time: '09:00 - 12:00',
  status: 'Present',
  facilitator: 'Sarah Khumalo',
  signed: true,
  location: 'Johannesburg CBD'
},
{
  id: 2,
  date: '2023-05-12',
  title: 'Module 3: Flexbox & Grid',
  time: '09:00 - 12:00',
  status: 'Present',
  facilitator: 'Sarah Khumalo',
  signed: true,
  location: 'Johannesburg CBD'
},
{
  id: 3,
  date: '2023-05-10',
  title: 'Module 3: Responsive Design',
  time: '09:00 - 12:00',
  status: 'Late',
  facilitator: 'Sarah Khumalo',
  signed: false,
  location: 'Johannesburg CBD'
},
{
  id: 4,
  date: '2023-05-08',
  title: 'Module 2: SQL Basics',
  time: '09:00 - 12:00',
  status: 'Absent',
  facilitator: 'John Doe',
  signed: true,
  location: 'Johannesburg CBD'
},
{
  id: 5,
  date: '2023-05-05',
  title: 'Module 2: Database Normalization',
  time: '09:00 - 12:00',
  status: 'Present',
  facilitator: 'John Doe',
  signed: true,
  location: 'Johannesburg CBD'
}];

type AttendanceSessionRow = (typeof sessions)[number];

export function AttendanceView() {
  const stats = {
    present: 12,
    absent: 1,
    late: 2,
    total: 15,
    percentage: 80
  };
  const handleSignOff = (sessionId: number) => {
    void sessionId;
    toast.success('Session signed off successfully');
  };
  const columns = [
  {
    header: 'Date',
    accessorKey: 'date' as const
  },
  {
    header: 'Session',
    accessorKey: 'title' as const,
    cell: (row: AttendanceSessionRow) =>
    <div>
          <div className="font-medium text-gray-900">{row.title}</div>
          <div className="flex items-center text-xs text-gray-500 mt-0.5">
            <MapPin className="h-3 w-3 mr-1" /> {row.location}
          </div>
        </div>

  },
  {
    header: 'Time',
    accessorKey: 'time' as const
  },
  {
    header: 'Status',
    accessorKey: 'status' as const,
    cell: (row: AttendanceSessionRow) =>
    <Badge
      variant={
      row.status === 'Present' ?
      'success' :
      row.status === 'Late' ?
      'warning' :
      'danger'
      }>
      
          {row.status}
        </Badge>

  },
  {
    header: 'Facilitator Sign-off',
    accessorKey: 'facilitator' as const,
    cell: (row: AttendanceSessionRow) =>
    <div className="flex items-center text-sm text-gray-600">
          <Check className="h-4 w-4 text-green-500 mr-2" />
          {row.facilitator}
        </div>

  },
  {
    header: 'Learner Sign-off',
    accessorKey: 'id' as const,
    cell: (row: AttendanceSessionRow) =>
    row.signed ?
    <Badge variant="success">Signed</Badge> :

    <Button
      size="sm"
      variant="outline"
      onClick={() => handleSignOff(row.id)}>
      
            Sign Off
          </Button>

  }];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-500">Overall Attendance</p>
            <div className="mt-2 flex justify-center">
              <div className="relative h-24 w-24 flex items-center justify-center">
                <svg
                  className="h-full w-full transform -rotate-90"
                  viewBox="0 0 36 36">
                  
                  <path
                    className="text-gray-200"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3" />
                  
                  <path
                    className={`${stats.percentage >= 80 ? 'text-green-500' : 'text-amber-500'}`}
                    strokeDasharray={`${stats.percentage}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3" />
                  
                </svg>
                <span className="absolute text-xl font-bold text-gray-900">
                  {stats.percentage}%
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="md:col-span-2">
          <h3 className="text-sm font-medium text-gray-500 mb-4">
            Attendance Breakdown
          </h3>
          <div className="space-y-4">
            <ProgressBar
              value={stats.present}
              max={stats.total}
              label="Present"
              variant="success" />
            
            <ProgressBar
              value={stats.late}
              max={stats.total}
              label="Late"
              variant="warning" />
            
            <ProgressBar
              value={stats.absent}
              max={stats.total}
              label="Absent"
              variant="danger" />
            
          </div>
        </Card>
      </div>

      <Card
        title="Session History"
        action={
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Download className="h-4 w-4" />}>
          
            Export Register
          </Button>
        }
        noPadding>
        
        <DataTable data={sessions} columns={columns} keyField="id" />
      </Card>
    </div>);

}