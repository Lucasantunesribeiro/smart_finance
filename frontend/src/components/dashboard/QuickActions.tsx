'use client';

import { Plus, ArrowUpDown, Target, FileText, TrendingUp, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const QuickActions = () => {
  const actions = [
    {
      icon: Plus,
      title: 'Add Transaction',
      description: 'Record a new income or expense',
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600'
    },
    {
      icon: ArrowUpDown,
      title: 'Transfer Money',
      description: 'Move funds between accounts',
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600'
    },
    {
      icon: Target,
      title: 'Set Budget',
      description: 'Create a new budget goal',
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600'
    },
    {
      icon: FileText,
      title: 'Generate Report',
      description: 'Create financial reports',
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600'
    },
    {
      icon: TrendingUp,
      title: 'Investment',
      description: 'Track your investments',
      color: 'bg-indigo-500',
      hoverColor: 'hover:bg-indigo-600'
    },
    {
      icon: Calculator,
      title: 'Calculator',
      description: 'Financial calculations',
      color: 'bg-gray-500',
      hoverColor: 'hover:bg-gray-600'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                variant="default"
                className={`p-4 h-auto text-white transition-all duration-200 ${action.color} ${action.hoverColor} hover:scale-105 hover:shadow-md`}
              >
                <div className="flex flex-col items-center">
                  <Icon className="w-6 h-6 mb-2" />
                  <div className="text-center">
                    <p className="font-medium text-sm">{action.title}</p>
                    <p className="text-xs opacity-90">{action.description}</p>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;