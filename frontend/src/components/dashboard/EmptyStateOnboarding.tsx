'use client';

import { useState } from 'react';
import { Target, Tag, Receipt, BarChart3, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateOnboardingProps {
  onCreateCategory: () => void;
  onCreateTransaction: () => void;
  onCreateBudget: () => void;
}

export const EmptyStateOnboarding = ({
  onCreateCategory,
  onCreateTransaction, 
  onCreateBudget
}: EmptyStateOnboardingProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: <Tag className="h-12 w-12 text-blue-600" />,
      title: "1. Criar Categorias",
      description: "Organize suas transações criando categorias como Alimentação, Transporte, etc.",
      action: "Criar Primeira Categoria",
      onAction: onCreateCategory
    },
    {
      icon: <Receipt className="h-12 w-12 text-green-600" />,
      title: "2. Adicionar Transações",
      description: "Registre suas receitas e despesas para começar a acompanhar suas finanças",
      action: "Adicionar Transação",
      onAction: onCreateTransaction
    },
    {
      icon: <Target className="h-12 w-12 text-purple-600" />,
      title: "3. Definir Orçamentos",
      description: "Crie orçamentos para cada categoria e controle seus gastos mensais",
      action: "Criar Orçamento", 
      onAction: onCreateBudget
    },
    {
      icon: <BarChart3 className="h-12 w-12 text-orange-600" />,
      title: "4. Visualizar Análises",
      description: "Acompanhe gráficos e relatórios detalhados das suas finanças",
      action: null,
      onAction: null
    }
  ];

  return (
    <div className="min-h-[600px] flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        {/* Welcome Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Bem-vindo ao SmartFinance! 🎉
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Sua jornada para uma vida financeira organizada começa aqui. Vamos configurar sua conta em alguns passos simples.
          </p>
          
          {/* Progress Bar */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-4">
              {steps.map((_, index) => (
                <div key={index} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowRight className={`w-4 h-4 mx-2 ${
                      index < currentStep ? 'text-blue-600' : 'text-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <div key={index} className={`bg-white rounded-lg border-2 p-6 text-center transition-all ${
              index === currentStep ? 'border-blue-500 shadow-lg' : 'border-gray-200'
            } ${index < currentStep ? 'bg-green-50 border-green-200' : ''}`}>
              
              {/* Step Icon */}
              <div className="flex justify-center mb-4">
                {step.icon}
              </div>
              
              {/* Step Content */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {step.description}
              </p>
              
              {/* Step Action */}
              {step.action && step.onAction && (
                <Button 
                  onClick={() => {
                    step.onAction?.();
                    if (index === currentStep && currentStep < steps.length - 1) {
                      setCurrentStep(currentStep + 1);
                    }
                  }}
                  className={`w-full ${
                    index === currentStep ? 'bg-blue-600 hover:bg-blue-700' : 
                    index < currentStep ? 'bg-green-600 hover:bg-green-700' : 
                    'bg-gray-400 hover:bg-gray-500'
                  }`}
                  disabled={index > currentStep}
                >
                  {index < currentStep ? '✓ Concluído' : step.action}
                </Button>
              )}
              
              {index === steps.length - 1 && (
                <div className="text-sm text-gray-500">
                  Disponível após adicionar dados
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick Stats Preview */}
        <div className="mt-12 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            Preview do seu Dashboard
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">R$ 0,00</p>
              <p className="text-sm text-gray-600">Total de Receitas</p>
            </div>
            <div className="bg-white p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-600">R$ 0,00</p>
              <p className="text-sm text-gray-600">Total de Despesas</p>
            </div>
            <div className="bg-white p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">R$ 0,00</p>
              <p className="text-sm text-gray-600">Saldo Líquido</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};